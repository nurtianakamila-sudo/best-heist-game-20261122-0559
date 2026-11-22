// geom.js — small geometry helpers for The Gilded Vault.
// Everything here works in room coordinates (1280 x 720) and treats walls and
// display cases as axis-aligned rectangles. Vision and movement both use it.

export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Smallest signed difference between two angles, in (-PI, PI].
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

// Ease an angle toward a target by at most `step` radians.
export function turnToward(angle, target, step) {
  const d = angleDiff(angle, target);
  if (Math.abs(d) <= step) return target;
  return angle + Math.sign(d) * step;
}

// Is (px, py) inside the vision cone of an observer at (ox, oy)?
export function pointInCone(px, py, ox, oy, dir, range, halfAngle) {
  const d = dist(px, py, ox, oy);
  if (d > range) return false;
  if (d < 1) return true;
  const want = Math.atan2(py - oy, px - ox);
  return Math.abs(angleDiff(dir, want)) <= halfAngle;
}

// Do two segments (p1,p2) and (p3,p4) cross? (Touching counts.)
export function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const d2 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  const d3 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d4 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);
  const s1 = Math.sign(d1);
  const s2 = Math.sign(d2);
  const s3 = Math.sign(d3);
  const s4 = Math.sign(d4);
  if (s1 === 0 || s2 === 0 || s3 === 0 || s4 === 0) return true;
  return s1 !== s2 && s3 !== s4;
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Does the segment (x1,y1)-(x2,y2) touch rectangle r?
export function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const { x, y, w, h } = r;
  return (
    segmentsCross(x1, y1, x2, y2, x, y, x + w, y) ||
    segmentsCross(x1, y1, x2, y2, x + w, y, x + w, y + h) ||
    segmentsCross(x1, y1, x2, y2, x + w, y + h, x, y + h) ||
    segmentsCross(x1, y1, x2, y2, x, y + h, x, y)
  );
}

// True when nothing blocks the straight line from (x1,y1) to (x2,y2).
export function lineOfSightClear(x1, y1, x2, y2, blockers) {
  for (const r of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

// Distance from a point to a segment, for the laser tripwires.
export function pointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Push a circle of radius r out of rectangle rect. Returns true if it overlapped.
export function pushCircleOutOfRect(circle, rect) {
  const nx = clamp(circle.x, rect.x, rect.x + rect.w);
  const ny = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - nx;
  const dy = circle.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= circle.r * circle.r) return false;
  if (d2 === 0) {
    // Centre inside the rectangle: shove it out along the shortest side.
    const left = circle.x - rect.x;
    const right = rect.x + rect.w - circle.x;
    const top = circle.y - rect.y;
    const bottom = rect.y + rect.h - circle.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) circle.x = rect.x - circle.r;
    else if (m === right) circle.x = rect.x + rect.w + circle.r;
    else if (m === top) circle.y = rect.y - circle.r;
    else circle.y = rect.y + rect.h + circle.r;
    return true;
  }
  const d = Math.sqrt(d2);
  circle.x = nx + (dx / d) * circle.r;
  circle.y = ny + (dy / d) * circle.r;
  return true;
}
