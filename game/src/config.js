// config.js — tuning and the three heist levels of The Gilded Vault.
// One room per level, drawn whole on a 1280 x 720 canvas so the thief, the
// guards, the cameras, the loot and the alarm meter are all in one frame.

export const ROOM = { w: 1280, h: 720, wall: 26 };

export const TUNING = {
  playerRadius: 15,
  walkSpeed: 195, // pixels per second
  sneakSpeed: 92,
  chaseSpeedBonus: 1.45, // guards run this much faster while chasing
  guardSightRange: 235,
  guardHalfAngle: 0.61, // ~35 degrees each side
  cameraSightRange: 260,
  cameraHalfAngle: 0.52,
  // Suspicion fills 0..1 while the thief is seen; sneak and distance slow it.
  suspicionBaseRate: 0.85,
  suspicionSneakFactor: 0.42,
  suspicionDecayRate: 0.5,
  alarmRisePerSecond: 26, // while any observer is fully suspicious
  alarmDecayPerSecond: 5, // while nobody sees the thief
  alarmLaserHit: 34, // crossing a live laser beam
  lockdownSeconds: 8, // countdown once the alarm hits 100
  lockdownResetAlarm: 55, // alarm falls back here when a lockdown is survived
  investigateRadius: 270, // a thrown coin lures guards this far
  coinsPerLevel: 3,
  ghostBonus: 500, // finishing a level never fully spotted
  timeParSeconds: [150, 180, 210], // beating par earns a time bonus
  timeBonusPerSecond: 10,
};

export const LOOT_KINDS = {
  ruby: { label: 'Ruby', value: 800, color: '#ff4d6d', size: 13 },
  gold: { label: 'Gold bars', value: 600, color: '#ffd166', size: 13 },
  painting: { label: 'Painting', value: 1200, color: '#c77dff', size: 14 },
  diamond: { label: 'Diamond', value: 1500, color: '#7ef0ff', size: 12 },
  crown: { label: 'Crown', value: 2000, color: '#ffe066', size: 14 },
  artifact: { label: 'Artifact', value: 900, color: '#90f090', size: 13 },
  vase: { label: 'Vase', value: 700, color: '#ffb703', size: 12 },
  watch: { label: 'Watch', value: 1100, color: '#f8f9fa', size: 11 },
};

// A wall is {x, y, w, h}. The room border is built from four of these in world.js.
// Each level: name, target loot to open the exit, guards, cameras, lasers, loot.
// Guard waypoints are room coordinates; cameras sit on a wall and sweep.
// Lasers are a beam between two points that blinks on a timer.
export const LEVELS = [
  {
    name: 'Heist 1 — The Gallery',
    target: 2600,
    guardSpeed: 72,
    guards: [
      { waypoints: [[330, 200], [640, 200], [640, 470], [330, 470]], pause: 0.9 },
      { waypoints: [[950, 170], [950, 500], [700, 500]], pause: 1.2 },
    ],
    cameras: [{ x: 640, y: 52, baseAngle: Math.PI / 2, sweep: 0.85, speed: 0.55 }],
    lasers: [{ x1: 1060, y1: 150, x2: 1060, y2: 330, period: 3.2, onTime: 1.9 }],
    cases: [
      { x: 300, y: 170, w: 120, h: 74 },
      { x: 560, y: 170, w: 120, h: 74 },
      { x: 300, y: 470, w: 120, h: 74 },
      { x: 560, y: 470, w: 120, h: 74 },
      { x: 880, y: 300, w: 120, h: 74 },
    ],
    loot: [
      { kind: 'ruby', x: 360, y: 207 },
      { kind: 'painting', x: 620, y: 207 },
      { kind: 'gold', x: 360, y: 507 },
      { kind: 'diamond', x: 620, y: 507 },
      { kind: 'crown', x: 940, y: 337 },
      { kind: 'artifact', x: 1150, y: 620 },
    ],
    exit: { x: 1218, y: 560, w: 36, h: 110 },
    start: { x: 640, y: 660 },
  },
  {
    name: 'Heist 2 — The Vault',
    target: 4200,
    guardSpeed: 88,
    guards: [
      { waypoints: [[280, 180], [620, 180], [620, 520], [280, 520]], pause: 0.7 },
      { waypoints: [[980, 150], [980, 540], [760, 540], [760, 150]], pause: 0.8 },
      { waypoints: [[640, 320], [900, 320], [900, 430], [640, 430]], pause: 1.0 },
    ],
    cameras: [
      { x: 420, y: 52, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.7 },
      { x: 880, y: 52, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.6 },
    ],
    lasers: [
      { x1: 1040, y1: 130, x2: 1040, y2: 300, period: 2.8, onTime: 1.6 },
      { x1: 200, y1: 420, x2: 380, y2: 420, period: 3.4, onTime: 2.0 },
    ],
    cases: [
      { x: 260, y: 150, w: 120, h: 74 },
      { x: 520, y: 150, w: 120, h: 74 },
      { x: 260, y: 500, w: 120, h: 74 },
      { x: 520, y: 500, w: 120, h: 74 },
      { x: 780, y: 300, w: 120, h: 74 },
      { x: 980, y: 470, w: 120, h: 74 },
    ],
    loot: [
      { kind: 'ruby', x: 320, y: 187 },
      { kind: 'gold', x: 580, y: 187 },
      { kind: 'painting', x: 320, y: 537 },
      { kind: 'diamond', x: 580, y: 537 },
      { kind: 'crown', x: 840, y: 337 },
      { kind: 'artifact', x: 1040, y: 507 },
      { kind: 'watch', x: 1150, y: 620 },
    ],
    exit: { x: 1218, y: 560, w: 36, h: 110 },
    start: { x: 640, y: 660 },
  },
  {
    name: 'Heist 3 — The Penthouse',
    target: 5800,
    guardSpeed: 104,
    guards: [
      { waypoints: [[250, 170], [600, 170], [600, 540], [250, 540]], pause: 0.5 },
      { waypoints: [[1030, 140], [1030, 540], [780, 540], [780, 140]], pause: 0.6 },
      { waypoints: [[640, 250], [900, 250], [900, 480], [640, 480]], pause: 0.7 },
      { waypoints: [[420, 330], [420, 560], [760, 560], [760, 330]], pause: 0.9 },
    ],
    cameras: [
      { x: 330, y: 52, baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.85 },
      { x: 640, y: 52, baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.75 },
      { x: 950, y: 52, baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.9 },
    ],
    lasers: [
      { x1: 1060, y1: 120, x2: 1060, y2: 290, period: 2.4, onTime: 1.4 },
      { x1: 180, y1: 400, x2: 360, y2: 400, period: 3.0, onTime: 1.8 },
      { x1: 640, y1: 120, x2: 820, y2: 120, period: 2.8, onTime: 1.5 },
    ],
    cases: [
      { x: 230, y: 140, w: 120, h: 74 },
      { x: 500, y: 140, w: 120, h: 74 },
      { x: 230, y: 510, w: 120, h: 74 },
      { x: 500, y: 510, w: 120, h: 74 },
      { x: 780, y: 230, w: 120, h: 74 },
      { x: 980, y: 440, w: 120, h: 74 },
      { x: 640, y: 330, w: 120, h: 74 },
    ],
    loot: [
      { kind: 'ruby', x: 290, y: 177 },
      { kind: 'gold', x: 560, y: 177 },
      { kind: 'painting', x: 290, y: 547 },
      { kind: 'diamond', x: 560, y: 547 },
      { kind: 'crown', x: 840, y: 267 },
      { kind: 'artifact', x: 1040, y: 477 },
      { kind: 'vase', x: 700, y: 367 },
      { kind: 'watch', x: 1150, y: 620 },
    ],
    exit: { x: 1218, y: 560, w: 36, h: 110 },
    start: { x: 640, y: 660 },
  },
];
