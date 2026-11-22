// cameras.js — the wall-mounted security cameras of The Gilded Vault.
// A camera sweeps its cone back and forth across the room. It cannot chase,
// but while it watches the thief it drives the alarm meter up fast and calls
// the nearest guard over to investigate.

import { TUNING } from './config.js';
import { clamp, lineOfSightClear, pointInCone } from './geom.js';

export class Camera {
  constructor(x, y, baseAngle, sweep, speed) {
    this.x = x;
    this.y = y;
    this.baseAngle = baseAngle;
    this.sweep = sweep; // radians each side of the base angle
    this.speed = speed; // sweep cycles per second, roughly
    this.phase = Math.random() * Math.PI * 2;
    this.dir = baseAngle;
    this.suspicion = 0; // 0..1 while the thief is in frame
    this.r = 10;
  }

  update(dt, time, player, blockers) {
    // Sweep: a smooth sine swing around the base angle.
    this.dir = this.baseAngle + Math.sin(time * this.speed * 2 + this.phase) * this.sweep;
    const seen =
      !player.hidden &&
      pointInCone(player.x, player.y, this.x, this.y, this.dir, TUNING.cameraSightRange, TUNING.cameraHalfAngle) &&
      lineOfSightClear(this.x, this.y, player.x, player.y, blockers);
    if (seen) {
      let rate = TUNING.suspicionBaseRate * 1.15;
      if (player.sneaking) rate *= TUNING.suspicionSneakFactor;
      this.suspicion = clamp(this.suspicion + rate * dt, 0, 1);
    } else {
      this.suspicion = clamp(this.suspicion - TUNING.suspicionDecayRate * dt, 0, 1);
    }
  }

  coneColor() {
    if (this.suspicion > 0.55) return 'rgba(255, 45, 85, 0.30)';
    if (this.suspicion > 0.15) return 'rgba(255, 120, 120, 0.24)';
    return 'rgba(255, 90, 110, 0.16)';
  }

  coneEdgeColor() {
    if (this.suspicion > 0.15) return 'rgba(255, 45, 85, 0.55)';
    return 'rgba(255, 90, 110, 0.4)';
  }
}
