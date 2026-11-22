// render.js — all canvas drawing for The Gilded Vault.
// One 1280 x 720 room, drawn whole so the thief, guards, cameras, loot and
// alarm meter are visible in a single frame, exactly as the screenshots show.

import { ROOM, TUNING } from './config.js';
import { TAU, clamp } from './geom.js';
import { GUARD_STATES } from './guards.js';

const W = ROOM.w;
const H = ROOM.h;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, dir, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, time) {
  // Deep navy marble tiles with a faint gold grid.
  ctx.fillStyle = '#141a2e';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 26; x < W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 26);
    ctx.lineTo(x, H - 26);
    ctx.stroke();
  }
  for (let y = 26; y < H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(26, y);
    ctx.lineTo(W - 26, y);
    ctx.stroke();
  }
  // A crimson carpet runner down the middle of the room.
  ctx.fillStyle = 'rgba(128, 20, 40, 0.35)';
  ctx.fillRect(596, 26, 88, H - 52);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.strokeRect(596, 26, 88, H - 52);
  // Soft pools of warm light from the ceiling spots.
  const spots = [
    [360, 240], [920, 240], [360, 540], [920, 540], [640, 380],
  ];
  for (const [sx, sy] of spots) {
    const g = ctx.createRadialGradient(sx, sy, 10, sx, sy, 190);
    g.addColorStop(0, 'rgba(255, 214, 130, 0.10)');
    g.addColorStop(1, 'rgba(255, 214, 130, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 190, sy - 190, 380, 380);
  }
  void time;
}

function drawWalls(ctx, world) {
  ctx.fillStyle = '#2a3352';
  for (const wall of world.walls) ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  // Gold trim along the inner edge of the border.
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, W - 52, H - 52);
  // Framed paintings on the top wall.
  const paintings = [180, 420, 760, 1060];
  for (const px of paintings) {
    ctx.fillStyle = '#3d2b1f';
    ctx.fillRect(px - 42, 34, 84, 46);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 42, 34, 84, 46);
    ctx.fillStyle = '#7a5c3e';
    ctx.beginPath();
    ctx.arc(px, 57, 12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#a8c686';
    ctx.fillRect(px - 24, 66, 48, 6);
  }
}

function drawCases(ctx, world) {
  for (const c of world.cases) {
    ctx.fillStyle = '#1d2440';
    roundRect(ctx, c.x, c.y, c.w, c.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#8b93b8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Glass shine.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.x + 14, c.y + c.h - 10);
    ctx.lineTo(c.x + 46, c.y + 12);
    ctx.stroke();
  }
}

function drawLoot(ctx, world, time) {
  for (const item of world.loot) {
    if (item.taken) continue;
    const twinkle = 0.6 + 0.4 * Math.sin(time * 3 + item.phase);
    const glow = ctx.createRadialGradient(item.x, item.y, 2, item.x, item.y, item.size + 14);
    glow.addColorStop(0, item.color + 'cc');
    glow.addColorStop(1, item.color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.size + 14, 0, TAU);
    ctx.fill();
    // A faceted gem: a rotated square with a bright core.
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(Math.PI / 4 + Math.sin(time * 1.5 + item.phase) * 0.15);
    ctx.fillStyle = item.color;
    ctx.globalAlpha = twinkle;
    ctx.fillRect(-item.size / 2, -item.size / 2, item.size, item.size);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-item.size / 5, -item.size / 5, item.size / 2.5, item.size / 2.5);
    ctx.restore();
    ctx.globalAlpha = 1;
    // Value tag under the loot.
    ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$' + item.value.toLocaleString('en-US'), item.x, item.y + item.size + 16);
  }
}

function drawLasers(ctx, world, time) {
  for (const laser of world.lasers) {
    const on = (time % laser.period) < laser.onTime;
    const blink = on ? 0.85 : 0.12;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.strokeStyle = '#ff2d55';
    ctx.lineWidth = on ? 4 : 2;
    ctx.setLineDash(on ? [] : [6, 8]);
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();
    ctx.restore();
    // Emitter boxes at both ends.
    for (const [ex, ey] of [[laser.x1, laser.y1], [laser.x2, laser.y2]]) {
      ctx.fillStyle = on ? '#ff2d55' : '#5c1f2b';
      ctx.beginPath();
      ctx.arc(ex, ey, 7, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#c8cede';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (!on) {
      ctx.fillStyle = 'rgba(255, 240, 200, 0.75)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LASER OFF — GO!', (laser.x1 + laser.x2) / 2, (laser.y1 + laser.y2) / 2 - 10);
    }
  }
}

function drawCameras(ctx, world) {
  for (const cam of world.cameras) {
    drawCone(ctx, cam.x, cam.y, cam.dir, TUNING.cameraSightRange, TUNING.cameraHalfAngle, cam.coneColor(), cam.coneEdgeColor());
    // Wall mount + lens.
    ctx.fillStyle = '#3a415c';
    roundRect(ctx, cam.x - 13, cam.y - 8, 26, 16, 4);
    ctx.fill();
    ctx.fillStyle = cam.suspicion > 0.15 ? '#ff2d55' : '#ff8fa3';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.dir) * 12, cam.y + Math.sin(cam.dir) * 12, 5, 0, TAU);
    ctx.fill();
    if (cam.suspicion > 0.15) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', cam.x, cam.y - 16);
    }
  }
}

function drawGuards(ctx, world) {
  for (const guard of world.guards) {
    // Faint dotted patrol route, so the player can read the guard's beat.
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 175, 220, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    guard.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w.x, w.y);
      else ctx.lineTo(w.x, w.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    drawCone(ctx, guard.x, guard.y, guard.dir, TUNING.guardSightRange, TUNING.guardHalfAngle, guard.coneColor(), guard.coneEdgeColor());
    // Shadow, body, cap, facing tick.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 12, 15, 6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = guard.state === GUARD_STATES.CHASE ? '#7a1f2b' : '#2b3a67';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1d2440';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 4, 8, 0, TAU);
    ctx.fill();
    const fx = guard.x + Math.cos(guard.dir) * (guard.r + 5);
    const fy = guard.y + Math.sin(guard.dir) * (guard.r + 5);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x + Math.cos(guard.dir) * guard.r, guard.y + Math.sin(guard.dir) * guard.r);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    // Suspicion meter above the guard's head.
    if (guard.suspicion > 0.08) {
      const bw = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(guard.x - bw / 2, guard.y - guard.r - 16, bw, 6);
      ctx.fillStyle = guard.suspicion > 0.55 ? '#ff3b30' : '#ff9500';
      ctx.fillRect(guard.x - bw / 2, guard.y - guard.r - 16, bw * guard.suspicion, 6);
    }
    if (guard.state === GUARD_STATES.CHASE) {
      ctx.fillStyle = '#ff3b30';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - guard.r - 22);
    }
  }
}

function drawCoins(ctx, coins) {
  for (const coin of coins) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.4)';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 12, 0, TAU);
    ctx.stroke();
  }
}

function drawPlayer(ctx, player, time) {
  // A soft gold glow under the thief so the eye finds the hero at a glance.
  const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 34);
  glow.addColorStop(0, 'rgba(255, 209, 102, 0.28)');
  glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 34, 0, TAU);
  ctx.fill();
  // Shadow and a soft "sneak" ring while crouched low.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 12, 14, 5, 0, 0, TAU);
  ctx.fill();
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(126, 240, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 7, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Hooded thief: dark cloak, pale mask, gold trim.
  const bob = Math.sin(player.stepPhase) * (player.running ? 1.5 : 0);
  ctx.fillStyle = '#2a1f33';
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob * 0.3, player.r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f5e6c8';
  ctx.beginPath();
  ctx.arc(
    player.x + Math.cos(player.dir) * 5,
    player.y + Math.sin(player.dir) * 5 + bob * 0.3,
    6.5, 0, TAU,
  );
  ctx.fill();
  ctx.fillStyle = '#151019';
  ctx.fillRect(player.x + Math.cos(player.dir) * 5 - 4, player.y + Math.sin(player.dir) * 5 - 1.5 + bob * 0.3, 8, 3);
  // Loot sack grows with the haul.
  if (player.lootCount > 0) {
    ctx.fillStyle = '#8a6d3b';
    ctx.beginPath();
    ctx.arc(player.x - Math.cos(player.dir) * 14, player.y - Math.sin(player.dir) * 14, 5 + Math.min(5, player.lootCount), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', player.x - Math.cos(player.dir) * 14, player.y - Math.sin(player.dir) * 14 + 3);
  }
}

function drawExit(ctx, world, unlocked) {
  const e = world.exit;
  const pulse = unlocked ? 0.55 + 0.35 * Math.sin(performance.now() / 280) : 0.25;
  ctx.fillStyle = unlocked ? `rgba(80, 220, 120, ${pulse})` : 'rgba(120, 130, 160, 0.25)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = unlocked ? '#50dc78' : '#8b93b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = unlocked ? '#eafff0' : '#c8cede';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(unlocked ? 'EXIT — GO!' : 'EXIT', 0, 5);
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, game) {
  const { world, player, alarm } = game;
  const timeLeft = game.levelTime; // elapsed time in this room
  // Top bar.
  ctx.fillStyle = 'rgba(10, 13, 26, 0.92)';
  ctx.fillRect(0, 0, W, 52);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 52);
  ctx.lineTo(W, 52);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // Level name + loot.
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(world.name, 16, 18);
  const lootValue = player.lootValue;
  const lootDone = lootValue >= world.target;
  ctx.fillStyle = lootDone ? '#50dc78' : '#ffd166';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`LOOT $${lootValue.toLocaleString('en-US')} / $${world.target.toLocaleString('en-US')}`, 16, 40);
  // Alarm meter, centre.
  const ax = 470;
  const aw = 340;
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ALARM', ax + aw / 2, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, ax, 26, aw, 16, 8);
  ctx.fill();
  const alarmFrac = clamp(alarm / 100, 0, 1);
  const alarmColor = alarm < 40 ? '#50dc78' : alarm < 75 ? '#ff9500' : '#ff3b30';
  ctx.fillStyle = alarmColor;
  if (alarmFrac > 0) {
    roundRect(ctx, ax, 26, Math.max(16, aw * alarmFrac), 16, 8);
    ctx.fill();
  }
  ctx.strokeStyle = '#c8cede';
  ctx.lineWidth = 1.5;
  roundRect(ctx, ax, 26, aw, 16, 8);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(Math.round(alarm) + '%', ax + aw / 2, 34);
  // Right side: timer, coins, score.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 15px system-ui, sans-serif';
  const mm = Math.floor(timeLeft / 60);
  const ss = Math.floor(timeLeft % 60).toString().padStart(2, '0');
  ctx.fillText(`⏱ ${mm}:${ss}`, W - 16, 18);
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`🪙 ${player.coins} coins   ★ ${game.score.toLocaleString('en-US')}`, W - 16, 40);
  // Objective line under the bar.
  ctx.textAlign = 'center';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = lootDone ? '#50dc78' : 'rgba(245, 230, 200, 0.85)';
  ctx.fillText(
    lootDone ? 'Target reached — slip out through the EXIT on the right wall!' : 'Grab the loot, dodge the cones and cameras, then reach the EXIT.',
    W / 2, 66,
  );
}

function overlay(ctx, title, lines, accent, footer) {
  ctx.fillStyle = 'rgba(8, 10, 22, 0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText(title, W / 2, 210);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = '19px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 290 + i * 32));
  if (footer) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(footer, W / 2, 290 + lines.length * 32 + 30);
  }
}

// The one public entry point: draw the whole frame for the current game state.
export function render(ctx, game) {
  const { world, player, time } = game;
  ctx.clearRect(0, 0, W, H);
  drawFloor(ctx, time);
  drawCases(ctx, world);
  drawLoot(ctx, world, time);
  drawLasers(ctx, world, time);
  drawCameras(ctx, world);
  drawGuards(ctx, world);
  drawCoins(ctx, game.coins);
  drawExit(ctx, world, player.lootValue >= world.target);
  drawPlayer(ctx, player, time);
  drawParticles(ctx, game.particles);
  drawHud(ctx, game);

  if (game.state === 'title') {
    overlay(
      ctx,
      'THE GILDED VAULT',
      [
        'A midnight heist in three rooms. Slip past the guards,',
        'dodge the cameras and the lasers, pocket the loot,',
        'and vanish through the EXIT before the alarm hits 100%.',
        '',
        'WASD / arrows — move      SHIFT — sneak (slow, hard to spot)',
        'CLICK — toss a coin to lure a guard      M — mute',
      ],
      '#ffd166',
      'Press ENTER or click to begin the heist',
    );
  } else if (game.state === 'levelDone') {
    overlay(
      ctx,
      'ROOM CLEARED!',
      [
        `${world.name} — loot $${player.lootValue.toLocaleString('en-US')} pocketed.`,
        game.levelStats,
      ],
      '#50dc78',
      'Press ENTER for the next room',
    );
  } else if (game.state === 'win') {
    overlay(
      ctx,
      'CLEAN GETAWAY!',
      [
        `All three rooms emptied — total score ${game.score.toLocaleString('en-US')}.`,
        game.levelStats,
        game.ghostNote,
      ],
      '#ffd166',
      'Press ENTER to run it again',
    );
  } else if (game.state === 'caught') {
    overlay(
      ctx,
      'CAUGHT!',
      [
        game.caughtReason,
        `Score ${game.score.toLocaleString('en-US')} — the vault keeps its gold tonight.`,
      ],
      '#ff3b30',
      'Press ENTER to try again',
    );
  } else if (game.lockdown > 0) {
    // Flashing lockdown banner across the top of the room.
    const flash = Math.sin(time * 10) > 0;
    ctx.fillStyle = flash ? 'rgba(255, 59, 48, 0.9)' : 'rgba(120, 10, 10, 0.9)';
    ctx.fillRect(W / 2 - 230, 84, 460, 44);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`LOCKDOWN — ${Math.ceil(game.lockdown)}s TO ESCAPE!`, W / 2, 107);
  }
}
