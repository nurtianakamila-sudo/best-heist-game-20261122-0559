// world.js — builds one heist level's room from config.js.
// The room is a single 1280 x 720 space: border walls, glass display cases
// (they block movement and sight), loot resting on the cases, the exit door
// on the right wall, and the thief's starting spot at the bottom.

import { ROOM, LOOT_KINDS, TUNING } from './config.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';

// The four border walls, with a gap at the bottom for the thief's entrance
// and a gap on the right where the exit door sits.
export function borderWalls(exit) {
  const t = ROOM.wall;
  const walls = [
    { x: 0, y: 0, w: ROOM.w, h: t }, // top
    { x: 0, y: 0, w: t, h: ROOM.h }, // left
    { x: ROOM.w - t, y: 0, w: t, h: exit.y - 8 }, // right, above exit
    { x: ROOM.w - t, y: exit.y + exit.h + 8, w: t, h: ROOM.h - (exit.y + exit.h + 8) }, // right, below exit
    { x: 0, y: ROOM.h - t, w: 560, h: t }, // bottom, left of entrance
    { x: 720, y: ROOM.h - t, w: ROOM.w - 720, h: t }, // bottom, right of entrance
  ];
  return walls;
}

export function buildLevel(levelIndex, levelDef, rng) {
  const walls = borderWalls(levelDef.exit);
  const cases = levelDef.cases.map((c) => ({ ...c }));
  const blockers = walls.concat(cases);

  const loot = levelDef.loot.map((l, i) => {
    const kind = LOOT_KINDS[l.kind];
    return {
      id: i,
      kind: l.kind,
      label: kind.label,
      value: kind.value,
      color: kind.color,
      size: kind.size,
      x: l.x,
      y: l.y,
      taken: false,
      // A slow sparkle phase so each piece of loot glints at its own pace.
      phase: rng() * Math.PI * 2,
    };
  });

  const guards = levelDef.guards.map(
    (g) => new Guard(g.waypoints, g.pause, levelDef.guardSpeed),
  );
  const cameras = levelDef.cameras.map(
    (c) => new Camera(c.x, c.y, c.baseAngle, c.sweep, c.speed),
  );
  const lasers = levelDef.lasers.map((l) => ({
    x1: l.x1,
    y1: l.y1,
    x2: l.x2,
    y2: l.y2,
    period: l.period,
    onTime: l.onTime,
    tripped: false,
    cooldown: 0,
  }));

  return {
    index: levelIndex,
    name: levelDef.name,
    target: levelDef.target,
    walls,
    cases,
    blockers,
    loot,
    guards,
    cameras,
    lasers,
    exit: { ...levelDef.exit },
    start: { ...levelDef.start },
    coins: TUNING.coinsPerLevel,
    totalLoot: loot.reduce((sum, item) => sum + item.value, 0),
  };
}

// Loot still on the floor, for the HUD and the win check.
export function lootRemaining(world) {
  return world.loot.filter((item) => !item.taken);
}

export function lootCollectedValue(world) {
  return world.loot.reduce((sum, item) => sum + (item.taken ? item.value : 0), 0);
}
