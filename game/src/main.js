// main.js — the game loop and state machine of The Gilded Vault.
// States: title → playing → levelDone → playing … → win | caught.
// The alarm meter is the heart of the game: it climbs while anyone watches
// the thief and falls while hidden; at 100% the room locks down.

import { LEVELS, ROOM, TUNING } from './config.js';
import { buildLevel } from './world.js';
import { Player } from './player.js';
import { makeRng } from './random.js';
import { clamp, dist, pointToSegment } from './geom.js';
import { render } from './render.js';
import * as sfx from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const SEED = Number(params.get('seed') || '1') || 1;
const SHOT = params.get('shot') || '';

const game = {
  state: 'title', // title | playing | levelDone | win | caught
  levelIndex: 0,
  world: null,
  player: new Player(ROOM.w / 2, ROOM.h - 70),
  alarm: 0,
  time: 0,
  levelTime: 0,
  score: 0,
  coins: [],
  particles: [],
  lockdown: 0,
  spotted: false, // the thief was fully seen at least once this level
  ghostLevels: 0,
  caughtReason: '',
  levelStats: '',
  ghostNote: '',
  muted: false,
};

// Exposed for play-testing: window.__game lets a script read the live state.
window.__game = game;

const input = { left: false, right: false, up: false, down: false, sneak: false };

function resetLevel(index) {
  const rng = makeRng(SEED * 1000 + index * 77 + 13);
  game.world = buildLevel(index, LEVELS[index], rng);
  game.levelIndex = index;
  game.player.reset(game.world.start.x, game.world.start.y, TUNING.coinsPerLevel);
  game.alarm = 0;
  game.levelTime = 0;
  game.coins = [];
  game.particles = [];
  game.lockdown = 0;
  game.spotted = false;
}

function startGame() {
  game.score = 0;
  game.ghostLevels = 0;
  resetLevel(0);
  game.state = 'playing';
}

function addScore(n) {
  game.score += n;
}

function burst(x, y, color, n = 14) {
  const rng = makeRng((Math.random() * 1e9) | 0);
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const sp = 40 + rng() * 120;
    game.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.6 + rng() * 0.4,
      maxLife: 1,
      size: 2 + rng() * 3,
      color,
    });
  }
}

function onGuardSpotted(guard) {
  game.spotted = true;
  sfx.sfxAlarm();
  burst(guard.x, guard.y, '#ff3b30', 8);
}

function onCameraAlert() {
  // A camera that has the thief dead to rights calls the nearest guard over.
  let best = null;
  let bestD = Infinity;
  for (const guard of game.world.guards) {
    const d = dist(guard.x, guard.y, game.player.x, game.player.y);
    if (d < bestD) {
      bestD = d;
      best = guard;
    }
  }
  if (best) {
    best.alertTo(game.player.x, game.player.y);
    game.spotted = true;
  }
}

function levelComplete() {
  const par = TUNING.timeParSeconds[game.levelIndex];
  const timeBonus = Math.max(0, Math.round((par - game.levelTime) * TUNING.timeBonusPerSecond));
  const ghostBonus = game.spotted ? 0 : TUNING.ghostBonus;
  if (ghostBonus > 0) game.ghostLevels += 1;
  addScore(timeBonus + ghostBonus);
  game.levelStats = `Time bonus $${timeBonus.toLocaleString('en-US')}` +
    (ghostBonus ? `  ·  Ghost bonus $${ghostBonus.toLocaleString('en-US')} (never spotted!)` : '  ·  Spotted — no ghost bonus');
  sfx.sfxExit();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.ghostNote = game.ghostLevels === LEVELS.length
      ? 'A perfect ghost run — never spotted in any room.'
      : `${game.ghostLevels} of ${LEVELS.length} rooms cleared unseen.`;
    game.state = 'win';
    sfx.sfxWin();
  } else {
    game.state = 'levelDone';
  }
}

function caught(reason) {
  game.caughtReason = reason;
  game.state = 'caught';
  sfx.sfxCaught();
  burst(game.player.x, game.player.y, '#ff3b30', 22);
}

function updatePlaying(dt) {
  const { world, player } = game;
  game.levelTime += dt;
  game.time += dt;

  player.update(dt, input, world.blockers);

  // Pick up loot.
  const grabbed = player.collectLoot(world);
  for (const item of grabbed) {
    addScore(item.value);
    burst(item.x, item.y, item.color, 16);
    sfx.sfxPickup();
  }

  // Lasers: crossing a live beam trips the alarm and alerts the room.
  for (const laser of world.lasers) {
    laser.cooldown = Math.max(0, laser.cooldown - dt);
    const on = (game.time % laser.period) < laser.onTime;
    if (on && laser.cooldown <= 0 && pointToSegment(player.x, player.y, laser.x1, laser.y1, laser.x2, laser.y2) < player.r + 4) {
      laser.cooldown = 1.2;
      laser.tripped = true;
      game.alarm = clamp(game.alarm + TUNING.alarmLaserHit, 0, 100);
      game.spotted = true;
      sfx.sfxAlarm();
      burst(player.x, player.y, '#ff2d55', 18);
      for (const guard of world.guards) guard.alertTo(player.x, player.y);
    }
  }

  // Guards and cameras watch, chase, and call the alarm.
  let anyWatching = false;
  for (const guard of world.guards) {
    guard.update(dt, player, world.blockers, onGuardSpotted);
    if (guard.suspicion >= 1) anyWatching = true;
    if (guard.state === 'chase' && dist(guard.x, guard.y, player.x, player.y) < guard.r + player.r + 2) {
      caught('A guard grabbed you in the gallery.');
      return;
    }
  }
  for (const cam of world.cameras) {
    const was = cam.suspicion;
    cam.update(dt, game.time, player, world.blockers);
    if (cam.suspicion >= 1) {
      anyWatching = true;
      if (was < 1) onCameraAlert();
    }
  }

  // The alarm meter: climbs while watched, falls while hidden.
  if (anyWatching) {
    game.alarm = clamp(game.alarm + TUNING.alarmRisePerSecond * dt, 0, 100);
  } else {
    game.alarm = clamp(game.alarm - TUNING.alarmDecayPerSecond * dt, 0, 100);
  }

  // Lockdown: the alarm hit 100%. Survive the countdown or get caught.
  if (game.alarm >= 100 && game.lockdown <= 0) {
    game.lockdown = TUNING.lockdownSeconds;
    sfx.sfxAlarm();
    for (const guard of world.guards) guard.alertTo(player.x, player.y);
  }
  if (game.lockdown > 0) {
    game.lockdown -= dt;
    if (game.lockdown <= 0) {
      game.lockdown = 0;
      game.alarm = TUNING.lockdownResetAlarm;
      for (const guard of world.guards) {
        guard.state = 'return';
        guard.chasing = false;
        guard.suspicion = 0.4;
      }
    }
  }

  // Thrown coins: they land, glint, and lure nearby guards.
  for (const coin of game.coins) {
    coin.life -= dt;
  }
  game.coins = game.coins.filter((c) => c.life > 0);

  // Particles drift and fade.
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);

  // Win the level: target loot in hand and standing in the exit.
  if (player.lootValue >= world.target && player.atExit(world.exit)) {
    levelComplete();
  }
}

function throwCoinAt(clientX, clientY) {
  if (game.state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * ROOM.w;
  const y = ((clientY - rect.top) / rect.height) * ROOM.h;
  const landing = game.player.throwCoin(x, y);
  if (!landing) return;
  game.coins.push({ ...landing, life: 6 });
  sfx.sfxCoin();
  for (const guard of game.world.guards) {
    if (dist(guard.x, guard.y, landing.x, landing.y) < TUNING.investigateRadius) {
      guard.investigate(landing.x, landing.y);
    }
  }
}

function advance() {
  if (game.state === 'title') startGame();
  else if (game.state === 'levelDone') {
    resetLevel(game.levelIndex + 1);
    game.state = 'playing';
  } else if (game.state === 'win' || game.state === 'caught') startGame();
}

// --- Input ---------------------------------------------------------------
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.code] !== undefined) {
    input[KEYMAP[e.code]] = true;
    e.preventDefault();
  }
  if (e.code === 'Enter' || e.code === 'Space') {
    sfx.ensureAudio();
    advance();
    e.preventDefault();
  }
  if (e.code === 'KeyM') {
    game.muted = sfx.toggleMute();
  }
  if (e.code === 'KeyR' && (game.state === 'caught' || game.state === 'win')) startGame();
});

window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code] !== undefined) input[KEYMAP[e.code]] = false;
});

canvas.addEventListener('pointerdown', (e) => {
  sfx.ensureAudio();
  if (game.state === 'playing') throwCoinAt(e.clientX, e.clientY);
  else advance();
});

// --- Screenshot staging --------------------------------------------------
// ?shot=title | play | alarm | win stages a live frame of the real game so
// the screenshots show the room, the cones, the cameras, the loot and the
// alarm meter exactly as a player would see them.
function stageShot(name) {
  if (name === 'title') {
    resetLevel(0);
    game.state = 'title';
    return;
  }
  startGame();
  if (name === 'play') {
    game.player.x = 700;
    game.player.y = 380;
    game.player.dir = -Math.PI / 2;
    game.player.sneaking = true;
    game.world.loot[0].taken = true;
    game.world.loot[3].taken = true;
    game.player.lootValue = 2300;
    game.player.lootCount = 2;
    game.score = 2300;
    game.alarm = 30;
    game.world.guards[0].x = 640;
    game.world.guards[0].y = 300;
    game.world.guards[0].dir = Math.PI * 0.75;
    game.world.guards[0].suspicion = 0.45;
    game.world.guards[1].x = 900;
    game.world.guards[1].y = 430;
    game.world.guards[1].dir = -Math.PI * 0.6;
    game.world.cameras[0].dir = Math.PI / 2 + 0.4;
  } else if (name === 'alarm') {
    game.player.x = 1120;
    game.player.y = 600;
    game.player.dir = Math.PI;
    game.world.loot.forEach((item) => {
      item.taken = true;
    });
    game.player.lootValue = 6200;
    game.player.lootCount = 6;
    game.score = 6200;
    game.alarm = 82;
    // The chasing guard starts far across the room so the screenshot catches
    // the chase in progress instead of the game-over screen.
    game.world.guards[0].alertTo(game.player.x, game.player.y);
    game.world.guards[0].x = 700;
    game.world.guards[0].y = 260;
    game.world.guards[1].x = 900;
    game.world.guards[1].y = 300;
    game.world.guards[1].dir = Math.PI * 0.85;
    game.world.guards[1].suspicion = 0.8;
    game.spotted = true;
  } else if (name === 'win') {
    game.player.lootValue = 6200;
    game.player.lootCount = 6;
    game.score = 7450;
    game.levelStats = 'Time bonus $750  ·  Ghost bonus $500 (never spotted!)';
    game.ghostNote = 'A perfect ghost run — never spotted in any room.';
    game.state = 'win';
  }
}

// --- Loop ------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  if (game.state === 'playing') updatePlaying(dt);
  else game.time += dt; // the title and end screens keep their lights twinkling
  render(ctx, game);
  requestAnimationFrame(frame);
}

resetLevel(0);
if (SHOT) stageShot(SHOT);
requestAnimationFrame(frame);
