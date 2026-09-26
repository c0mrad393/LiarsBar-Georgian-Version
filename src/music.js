// Background music, synthesized on the fly (no files to download): a little
// Georgian-flavoured bar tune. A panduri-like plucked arpeggio, a doli drum,
// a bass, and a salamuri-like flute melody over Dm – C – Dm – A.
// Moods: "bar" (calm), "tense" (the revolver: slow drone and heartbeat),
// "chaos" (fast, wobbly, a bit unhinged). Shares the effects' AudioContext.
import { useEffect } from "react";
import { audioContext, setMusicWanted } from "./sfx.js";

let on = (() => {
  try { return localStorage.getItem("lb-music") !== "0"; } catch { return true; }
})();
setMusicWanted(() => on);
export const isMusicOn = () => on;
export function setMusicOn(v) {
  on = v;
  try { localStorage.setItem("lb-music", v ? "1" : "0"); } catch { /* private mode */ }
  if (!v) fadeOut();
}

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// Dm, C, Dm, A (harmonic-minor dominant), twice; the melody spans the 8 bars.
const CHORDS = [[50, 53, 57], [48, 52, 55], [50, 53, 57], [45, 49, 52]];
const ARP = [0, 2, 1, 2, 3, 2, 1, 2]; // indexes into [root, third, fifth, octave]
const MELODY = [
  [69, null, 67, 65], [64, null, 67, null], [65, 67, 69, 72], [69, null, null, null],
  [74, 72, 69, null], [67, 69, 67, 64], [65, 64, 62, 64], [61, null, 64, null],
];
const MOODS = {
  bar: { bpm: 104, vol: 0.55 },
  tense: { bpm: 72, vol: 0.7 },
  chaos: { bpm: 138, vol: 0.5 },
};

let mood = null; // what the screen asks for
let playing = null; // what the sequencer is playing (switches on a bar line)
let c = null, master = null, noiseBuf = null;
let step = 0, nextAt = 0, loop = 0;

function voice(type, freq, t, dur, vol, { attack = 0.005, filter = null, detune = 0, vibrato = 0 } = {}) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (detune) o.detune.setValueAtTime(detune, t);
  let out = o;
  if (filter) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(filter[0], t);
    f.frequency.exponentialRampToValueAtTime(filter[1], t + dur);
    o.connect(f);
    out = f;
  }
  if (vibrato) {
    const lfo = c.createOscillator();
    const d = c.createGain();
    lfo.frequency.value = vibrato;
    d.gain.value = freq * 0.012;
    lfo.connect(d).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function drum(t, vol = 0.5) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.25);
}

function tick(t, vol = 0.04, freq = 7000) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const n = c.createBufferSource();
  n.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  n.connect(f).connect(g).connect(master);
  n.start(t);
}

/** One eighth note of the current mood at time t. */
function play(t, eighth) {
  const bar = Math.floor(step / 8) % 8;
  const pos = step % 8;
  const [r, third, fifth] = CHORDS[bar % 4];
  const tones = [r, third, fifth, r + 12];
  if (playing === "tense") {
    // A drone that swells each bar, a heartbeat, a clock; now and then a sour note.
    if (pos === 0) {
      voice("sawtooth", midi(38), t, eighth * 8, 0.12, { attack: eighth * 3, filter: [420, 260] });
      voice("sine", midi(50), t, eighth * 8, 0.06, { attack: eighth * 4 });
    }
    if (pos === 0 || pos === 1) drum(t, pos ? 0.28 : 0.45);
    tick(t, pos % 2 ? 0.02 : 0.035, 5200);
    if (pos === 6 && bar % 2) voice("triangle", midi(63), t, eighth * 2, 0.05, { filter: [1800, 600] });
    return;
  }
  const chaos = playing === "chaos";
  // panduri: plucked chord arpeggio
  voice(chaos ? "square" : "sawtooth", midi(tones[ARP[pos]] + 12), t, eighth * 1.6, chaos ? 0.035 : 0.05,
    { filter: [chaos ? 3200 : 2400, 500], detune: chaos ? (Math.random() - 0.5) * 60 : 0 });
  // bass and doli
  if (pos === 0 || pos === 4) voice("triangle", midi(r - 12), t, eighth * 3.5, 0.16);
  if (pos === 0 || pos === 3 || pos === 4 || (chaos && pos === 6)) drum(t, pos === 0 ? 0.42 : 0.26);
  if (pos % 2) tick(t, chaos ? 0.05 : 0.03);
  // salamuri melody: every other time round (always in chaos, an octave up and wobbling)
  const n = pos % 2 === 0 ? MELODY[bar][pos / 2] : null;
  if (n != null && (chaos || loop % 2 === 1)) {
    voice(chaos ? "square" : "sine", midi(n + (chaos ? 12 : 0)), t, eighth * 1.9, chaos ? 0.035 : 0.075,
      { attack: 0.03, vibrato: chaos ? 9 : 5.5, filter: chaos ? [2600, 900] : null });
  }
}

function fadeOut() {
  if (master && c) {
    const t = c.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(0.0001, t, 0.3);
  }
}

setInterval(() => {
  const ctx = audioContext();
  if (!on || !mood || !ctx || ctx.state !== "running" || document.visibilityState === "hidden") {
    if (playing && (!on || !mood)) { fadeOut(); playing = null; }
    return;
  }
  if (ctx !== c) {
    // First start, or the context was rebuilt after the phone woke up.
    c = ctx;
    noiseBuf = null;
    master = c.createGain();
    master.gain.value = 0.0001;
    master.connect(c.destination);
    nextAt = c.currentTime + 0.1;
    playing = null;
  }
  if (!playing) {
    playing = mood;
    step = 0;
    nextAt = Math.max(nextAt, c.currentTime + 0.05);
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setTargetAtTime(0.16 * MOODS[playing].vol, c.currentTime, 0.6);
  }
  if (nextAt < c.currentTime - 0.5) nextAt = c.currentTime + 0.05; // woke from a stall: don't burst
  while (nextAt < c.currentTime + 0.3) {
    // Mood changes land on a bar line so the music never stumbles mid-phrase.
    if (step % 8 === 0 && mood !== playing) {
      playing = mood;
      step = 0;
      master.gain.setTargetAtTime(0.16 * MOODS[playing].vol, nextAt, 0.4);
    }
    const eighth = 30 / MOODS[playing].bpm;
    play(nextAt, eighth);
    nextAt += eighth;
    step++;
    if (step % 64 === 0) loop++;
  }
}, 60);

/** Ask for a mood while this screen is showing ("bar" | "tense" | "chaos" | null for silence). */
export function useMusic(m) {
  useEffect(() => {
    mood = m;
  }, [m]);
}
