// audio.js — tiny synthesized sound effects for The Gilded Vault.
// No audio files: every sound is a few WebAudio oscillators. All calls are
// safe when the browser has no audio yet (the context is created lazily on
// the first user gesture and every call is guarded).

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  } catch {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // Audio is decoration; never let it break the game.
  }
}

// A bright two-note chime when loot is pocketed.
export function sfxPickup() {
  tone(880, 0.09, 'sine', 0.12);
  tone(1318, 0.14, 'sine', 0.1, 0.07);
}

// The clink of a thrown coin.
export function sfxCoin() {
  tone(2093, 0.06, 'triangle', 0.09);
  tone(1568, 0.1, 'triangle', 0.07, 0.05);
}

// The alarm: a rising two-tone siren.
export function sfxAlarm() {
  tone(620, 0.22, 'square', 0.06, 0, 880);
  tone(880, 0.22, 'square', 0.06, 0.24, 620);
}

// The low buzz of being caught.
export function sfxCaught() {
  tone(220, 0.5, 'sawtooth', 0.1, 0, 110);
}

// A little fanfare for a clean getaway.
export function sfxWin() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'sine', 0.11, i * 0.11));
}

// The soft click of the exit door opening.
export function sfxExit() {
  tone(392, 0.12, 'sine', 0.1);
  tone(523, 0.2, 'sine', 0.1, 0.1);
}
