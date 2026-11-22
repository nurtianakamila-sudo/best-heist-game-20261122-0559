// guards.js — the patrolling guards of The Gilded Vault.
// A guard walks its waypoints, pauses at each one, and watches a cone in
// front of it. Spotting the thief fills its suspicion; a full meter means
// the guard gives chase. A thrown coin lures a nearby guard to investigate.

import { TUNING } from './config.js';
import {
  clamp,
  dist,
  lineOfSightClear,
  pointInCone,
  pushCircleOutOfRect,
  turnToward,
} from './geom.js';

export const GUARD_STATES = {
  PATROL: 'patrol',
  PAUSE: 'pause',
  CHASE: 'chase',
  INVESTIGATE: 'investigate',
  LOOK: 'look',
  RETURN: 'return',
};

export class Guard {
  constructor(waypoints, pause, speed) {
    this.waypoints = waypoints.map(([x, y]) => ({ x, y }));
    this.pauseTime = pause;
    this.speed = speed;
    this.x = waypoints[0][0];
    this.y = waypoints[0][1];
    this.dir = -Math.PI / 2; // facing up the room at the start
    this.wpIndex = 1;
    this.state = GUARD_STATES.PATROL;
    this.pauseLeft = 0;
    this.suspicion = 0; // 0..1, full means the thief is spotted
    this.loseSightTimer = 0;
    this.lookTimer = 0;
    this.investigateX = 0;
    this.investigateY = 0;
    this.r = 16;
    this.chasing = false;
  }

  // Can this guard see the thief right now?
  canSee(player, blockers) {
    if (player.hidden) return false;
    if (!pointInCone(player.x, player.y, this.x, this.y, this.dir, TUNING.guardSightRange, TUNING.guardHalfAngle)) {
      return false;
    }
    return lineOfSightClear(this.x, this.y, player.x, player.y, blockers);
  }

  // How fast suspicion grows while the thief is in view: closer and running
  // is worse, sneaking and far away is slower.
  suspicionRate(player) {
    const d = dist(this.x, this.y, player.x, player.y);
    const closeness = 1 - clamp(d / TUNING.guardSightRange, 0, 0.8);
    let rate = TUNING.suspicionBaseRate * (0.55 + closeness);
    if (player.sneaking) rate *= TUNING.suspicionSneakFactor;
    if (player.running) rate *= 1.35;
    return rate;
  }

  // A coin landed nearby: walk over and have a look.
  investigate(x, y) {
    if (this.state === GUARD_STATES.CHASE) return;
    this.investigateX = x;
    this.investigateY = y;
    this.state = GUARD_STATES.INVESTIGATE;
    this.suspicion = Math.max(this.suspicion, 0.25);
  }

  // The alarm went off: run at the thief.
  alertTo(x, y) {
    this.state = GUARD_STATES.CHASE;
    this.chasing = true;
    this.suspicion = 1;
    this.loseSightTimer = 0;
  }

  update(dt, player, blockers, onSpotted) {
    const seen = this.canSee(player, blockers);

    if (seen) {
      this.suspicion = clamp(this.suspicion + this.suspicionRate(player) * dt, 0, 1);
      this.loseSightTimer = 0;
      if (this.suspicion >= 1 && this.state !== GUARD_STATES.CHASE) {
        this.state = GUARD_STATES.CHASE;
        this.chasing = true;
        onSpotted(this);
      }
    } else {
      this.loseSightTimer += dt;
      if (this.state !== GUARD_STATES.CHASE) {
        this.suspicion = clamp(this.suspicion - TUNING.suspicionDecayRate * dt, 0, 1);
      }
    }

    switch (this.state) {
      case GUARD_STATES.PATROL:
        this.walkToward(this.waypoints[this.wpIndex], dt, blockers, this.speed);
        if (dist(this.x, this.y, this.waypoints[this.wpIndex].x, this.waypoints[this.wpIndex].y) < 6) {
          this.state = GUARD_STATES.PAUSE;
          this.pauseLeft = this.pauseTime;
        }
        break;
      case GUARD_STATES.PAUSE:
        this.pauseLeft -= dt;
        // Scan the room while waiting: slow turn, first one way then back.
        this.dir += Math.sin(performance.now() / 1400 + this.x) * 0.25 * dt;
        if (this.pauseLeft <= 0) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.state = GUARD_STATES.PATROL;
        }
        break;
      case GUARD_STATES.CHASE: {
        const speed = this.speed * TUNING.chaseSpeedBonus;
        this.walkToward(player, dt, blockers, speed);
        if (!seen && this.loseSightTimer > 3) {
          this.state = GUARD_STATES.RETURN;
          this.chasing = false;
          this.suspicion = 0.4;
        }
        break;
      }
      case GUARD_STATES.INVESTIGATE:
        this.walkToward({ x: this.investigateX, y: this.investigateY }, dt, blockers, this.speed * 1.15);
        if (dist(this.x, this.y, this.investigateX, this.investigateY) < 10) {
          this.state = GUARD_STATES.LOOK;
          this.lookTimer = 2.2;
        }
        break;
      case GUARD_STATES.LOOK:
        this.lookTimer -= dt;
        this.dir += 1.6 * dt; // turn in a slow circle, checking the spot
        if (this.lookTimer <= 0) {
          this.state = GUARD_STATES.RETURN;
          this.suspicion = 0.1;
        }
        break;
      case GUARD_STATES.RETURN: {
        // Head back to the nearest waypoint, then resume the patrol.
        let best = 0;
        let bestD = Infinity;
        this.waypoints.forEach((w, i) => {
          const d = dist(this.x, this.y, w.x, w.y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        this.wpIndex = best;
        this.walkToward(this.waypoints[this.wpIndex], dt, blockers, this.speed);
        if (bestD < 8) this.state = GUARD_STATES.PATROL;
        break;
      }
      default:
        break;
    }
  }

  // Step toward a point, sliding along walls, facing the direction of travel.
  walkToward(target, dt, blockers, speed) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const want = Math.atan2(dy, dx);
    this.dir = turnToward(this.dir, want, 5.5 * dt);
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    // Move one axis at a time so the guard slides along walls instead of sticking.
    const probe = { x: nx, y: this.y, r: this.r };
    let blocked = false;
    for (const r of blockers) {
      if (pushCircleOutOfRect(probe, r)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) this.x = nx;
    const probeY = { x: this.x, y: ny, r: this.r };
    blocked = false;
    for (const r of blockers) {
      if (pushCircleOutOfRect(probeY, r)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) this.y = ny;
  }

  // Cone colour for the renderer: calm yellow, wary orange, alert red.
  coneColor() {
    if (this.state === GUARD_STATES.CHASE) return 'rgba(255, 59, 48, 0.30)';
    if (this.suspicion > 0.55) return 'rgba(255, 149, 0, 0.28)';
    return 'rgba(255, 214, 64, 0.20)';
  }

  coneEdgeColor() {
    if (this.state === GUARD_STATES.CHASE) return 'rgba(255, 59, 48, 0.55)';
    if (this.suspicion > 0.55) return 'rgba(255, 149, 0, 0.5)';
    return 'rgba(255, 214, 64, 0.38)';
  }
}
