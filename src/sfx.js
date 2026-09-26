// Tiny synthesized sound effects (Web Audio, no files). Created lazily on the
// first user gesture so browsers' autoplay policy is satisfied.
import { buzz } from "./device.js";
let ctx = null;
let muted = (() => {
  try { return localStorage.getItem("lb-muted") === "1"; } catch { return false; }
})();

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem("lb-muted", m ? "1" : "0"); } catch { /* private mode */ }
}

// Phones suspend audio when the browser goes to the background; iOS then
// leaves the context "interrupted" (or "running" but silent) until it's
// rebuilt inside a tap. So: mark it stale when the page hides, and on the
// next touch build a fresh one. Sounds are synthesized, nothing to reload.
let stale = false;

function fresh() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try { ctx?.close(); } catch { /* already closed */ }
  ctx = new C();
  stale = false;
  return ctx;
}

function ac() {
  if (!ctx) return fresh();
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  return ctx;
}
export const unlockAudio = () => { if (!muted || musicWanted()) ac(); };

/** The live context for the music player (created on the first tap, like sounds). */
export const audioContext = () => ctx;
let musicWanted = () => false;
/** music.js tells us whether it wants audio even while effects are muted. */
export const setMusicWanted = (fn) => { musicWanted = fn; };

if (typeof window !== "undefined") {
  const onGesture = () => {
    if (muted && !musicWanted()) return;
    if (!ctx) { ac(); return; }
    if (stale || ctx.state !== "running") fresh();
  };
  for (const ev of ["pointerdown", "touchend", "keydown"]) window.addEventListener(ev, onGesture, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.visibilityState === "hidden") {
      stale = true;
      ctx.suspend().catch(() => {});
    } else {
      ctx.resume().catch(() => {}); // works on desktop / Android; iOS waits for the next tap
    }
  });
  window.addEventListener("pageshow", (e) => { if (e.persisted && ctx) stale = true; });
}

function noise(c, dur) {
  const buf = c.createBuffer(1, Math.max(1, (c.sampleRate * dur) | 0), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function env(c, g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(c, { type = "sine", f0, f1 = f0, at = 0, dur = 0.15, vol = 0.2 }) {
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(c, g, t, vol, 0.005, dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hiss(c, { at = 0, dur = 0.1, vol = 0.2, type = "highpass", freq = 1500 }) {
  const t = c.currentTime + at;
  const n = noise(c, dur + 0.05);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  env(c, g, t, vol, 0.004, dur);
  n.connect(f).connect(g).connect(c.destination);
  n.start(t);
}

const SOUNDS = {
  card: (c) => hiss(c, { dur: 0.08, vol: 0.18, freq: 2500 }),
  deal: (c) => { for (let i = 0; i < 5; i++) hiss(c, { at: i * 0.07, dur: 0.05, vol: 0.12, freq: 3000 }); },
  select: (c) => tone(c, { type: "triangle", f0: 660, f1: 880, dur: 0.06, vol: 0.08 }),
  turn: (c) => { tone(c, { type: "triangle", f0: 523, dur: 0.1, vol: 0.12 }); tone(c, { type: "triangle", f0: 784, at: 0.1, dur: 0.14, vol: 0.12 }); },
  liar: (c) => {
    tone(c, { type: "sawtooth", f0: 220, f1: 440, dur: 0.18, vol: 0.12 });
    tone(c, { type: "square", f0: 440, f1: 330, at: 0.16, dur: 0.25, vol: 0.08 });
  },
  truth: (c) => [523, 659, 784].forEach((f, i) => tone(c, { type: "triangle", f0: f, at: i * 0.08, dur: 0.2, vol: 0.12 })),
  bluff: (c) => [392, 330, 262, 196].forEach((f, i) => tone(c, { type: "sawtooth", f0: f, f1: f * 0.97, at: i * 0.12, dur: 0.16, vol: 0.07 })),
  spin: (c) => { for (let i = 0; i < 14; i++) tone(c, { type: "square", f0: 1800, at: i * 0.075 + i * i * 0.002, dur: 0.012, vol: 0.05 }); },
  click: (c) => { tone(c, { type: "square", f0: 2400, f1: 1200, dur: 0.03, vol: 0.15 }); hiss(c, { dur: 0.03, vol: 0.12, freq: 4000 }); },
  bang: (c) => {
    hiss(c, { dur: 0.7, vol: 0.9, type: "lowpass", freq: 1200 });
    tone(c, { type: "sine", f0: 120, f1: 35, dur: 0.5, vol: 0.7 });
  },
  devil: (c) => {
    // low rumble + a descending "mwa-ha-ha"
    tone(c, { type: "sawtooth", f0: 70, f1: 45, dur: 1.4, vol: 0.18 });
    [0, 0.22, 0.44, 0.7].forEach((at, i) => tone(c, { type: "sawtooth", f0: 260 - i * 25, f1: 190 - i * 25, at: 0.25 + at, dur: 0.17, vol: 0.12 }));
  },
  joker: (c) => [1047, 1319, 1568, 2093, 1568, 2093].forEach((f, i) => tone(c, { type: "sine", f0: f, at: i * 0.06, dur: 0.14, vol: 0.08 })),
  heart: (c) => { tone(c, { type: "sine", f0: 70, f1: 45, dur: 0.12, vol: 0.5 }); tone(c, { type: "sine", f0: 65, f1: 40, at: 0.16, dur: 0.1, vol: 0.35 }); },
  whoosh: (c) => hiss(c, { dur: 0.35, vol: 0.12, type: "bandpass", freq: 900 }),
  splat: (c) => { hiss(c, { dur: 0.18, vol: 0.4, type: "lowpass", freq: 700 }); tone(c, { type: "sine", f0: 220, f1: 60, dur: 0.15, vol: 0.25 }); },
  pop: (c) => tone(c, { type: "sine", f0: 500, f1: 1100, dur: 0.08, vol: 0.12 }),
  win: (c) => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(c, { type: "triangle", f0: f, at: i * 0.11, dur: 0.22, vol: 0.13 })),
  join: (c) => { tone(c, { type: "sine", f0: 660, dur: 0.09, vol: 0.12 }); tone(c, { type: "sine", f0: 990, at: 0.09, dur: 0.12, vol: 0.12 }); },
};

export function sfx(name) {
  if (muted) return;
  buzz(name);
  const c = ac();
  if (!c || !SOUNDS[name]) return;
  try { SOUNDS[name](c); } catch { /* audio is best-effort */ }
}
