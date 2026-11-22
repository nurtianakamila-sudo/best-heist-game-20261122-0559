// random.js — a tiny seeded random-number generator for The Gilded Vault.
// Deterministic per seed so a staged screenshot replays the same room every time.
// Mulberry32: small, fast, good enough for sparkle and patrol jitter.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an element of an array with the seeded rng.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// A number in [min, max) from the seeded rng.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Shuffle a copy of an array with the seeded rng.
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
