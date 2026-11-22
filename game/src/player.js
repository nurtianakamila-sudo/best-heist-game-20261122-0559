// player.js — the thief of The Gilded Vault.
// WASD or arrows to move, Shift to sneak (slow, hard to spot), click to toss
// a coin that lures a nearby guard away. Loot is grabbed by walking over it.

import { TUNING } from './config.js';
import { clamp, dist, pushCircleOutOfRect } from './geom.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = TUNING.playerRadius;
    this.dir = -Math.PI / 2; // facing up the room
    this.sneaking = false;
    this.running = false; // moving at full walk speed (never "running": the thief walks)
    this.hidden = false; // set while a level fades in/out
    this.coins = TUNING.coinsPerLevel;
    this.lootValue = 0;
    this.lootCount = 0;
    this.stepPhase = 0;
  }

  reset(x, y, coins) {
    this.x = x;
    this.y = y;
    this.dir = -Math.PI / 2;
    this.sneaking = false;
    this.coins = coins;
    this.lootValue = 0;
    this.lootCount = 0;
  }

  update(dt, input, blockers) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.sneaking = !!input.sneak;
    this.running = mx !== 0 || my !== 0;

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.dir = Math.atan2(my, mx);
      this.stepPhase += dt * (this.sneaking ? 5 : 10);
      const speed = this.sneaking ? TUNING.sneakSpeed : TUNING.walkSpeed;
      const nx = this.x + mx * speed * dt;
      const ny = this.y + my * speed * dt;
      // One axis at a time: the thief slides along walls instead of sticking.
      const probeX = { x: nx, y: this.y, r: this.r };
      let blocked = false;
      for (const rect of blockers) {
        if (pushCircleOutOfRect(probeX, rect)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) this.x = nx;
      const probeY = { x: this.x, y: ny, r: this.r };
      blocked = false;
      for (const rect of blockers) {
        if (pushCircleOutOfRect(probeY, rect)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) this.y = ny;
    } else {
      this.running = false;
    }

    // Stay inside the room.
    this.x = clamp(this.x, 26 + this.r, 1280 - 26 - this.r);
    this.y = clamp(this.y, 26 + this.r, 720 - 26 - this.r);
  }

  // Grab any loot within reach. Returns the items just picked up.
  collectLoot(world) {
    const grabbed = [];
    for (const item of world.loot) {
      if (item.taken) continue;
      if (dist(this.x, this.y, item.x, item.y) < this.r + item.size + 32) {
        item.taken = true;
        this.lootValue += item.value;
        this.lootCount += 1;
        grabbed.push(item);
      }
    }
    return grabbed;
  }

  // Is the thief standing in the exit doorway?
  atExit(exit) {
    return (
      this.x > exit.x - 6 &&
      this.x < exit.x + exit.w + 6 &&
      this.y > exit.y - 4 &&
      this.y < exit.y + exit.h + 4
    );
  }

  // Toss a coin toward (x, y). Returns the landing spot, or null with no coins left.
  throwCoin(x, y) {
    if (this.coins <= 0) return null;
    this.coins -= 1;
    const d = dist(this.x, this.y, x, y);
    const maxThrow = 320;
    const t = d === 0 ? 0 : Math.min(1, maxThrow / d);
    return { x: this.x + (x - this.x) * t, y: this.y + (y - this.y) * t };
  }
}
