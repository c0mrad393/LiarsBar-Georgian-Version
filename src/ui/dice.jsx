// Liar's Dice pieces: a die, your rolled dice, the bid picker and the reveal.
import { useEffect, useState } from "react";
import { FACE_NAMES, T } from "../i18n.js";
import { sfx } from "../sfx.js";
import { seatColor } from "./Character.jsx";
import { Face } from "./heads.jsx";

const PIPS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

/** One die. Ones are wild, so they get a golden star instead of a pip. */
export function Die({ face, size = 40, hit, dim, hidden, className = "", style }) {
  const wild = face === 1;
  const bg = hidden ? "#7a4a2c" : hit ? "#ffc83d" : wild ? "#f1e3fa" : "#fffdf8";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ filter: "drop-shadow(0 3px 0 #2b1d14)", opacity: dim ? 0.45 : 1, ...style }} aria-label={hidden ? "?" : `${face}`}>
      <rect x="5" y="5" width="90" height="90" rx="20" fill={bg} stroke="#2b1d14" strokeWidth="6" />
      <rect x="14" y="12" width="60" height="14" rx="7" fill="#fff" opacity={hidden ? 0.12 : 0.55} />
      {hidden ? (
        <text x="50" y="68" textAnchor="middle" fontSize="50" fontWeight="900" fill="#ffc83d">?</text>
      ) : wild ? (
        <path d="M50 18 L59 40 L83 41 L64 56 L71 80 L50 66 L29 80 L36 56 L17 41 L41 40 Z" fill="#9b5de5" stroke="#2b1d14" strokeWidth="4" strokeLinejoin="round" />
      ) : (
        PIPS[face]?.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" fill="#2b1d14" />)
      )}
    </svg>
  );
}

/** Your five dice, rolled in with a clatter at the start of each round. Matches for the live bid glow. */
export function MyDice({ dice, round, bidFace }) {
  useEffect(() => { sfx("deal"); }, [round]);
  return (
    <div className="flex min-h-[92px] flex-col items-center justify-center gap-1 short:min-h-[74px]">
      <div className="flex items-end gap-2 sm:gap-3">
        {dice.map((d, i) => (
          <div key={`${round}-${i}`} className="a-roll" style={{ animationDelay: `${i * 90}ms`, "--rx": `${(i - 2) * -30}px` }}>
            <Die face={d} size={50} hit={bidFace && (d === bidFace || d === 1)} className="short:!h-[42px] short:!w-[42px]" />
          </div>
        ))}
      </div>
      <div className="text-[11px] font-extrabold text-ink-soft">{T.onesWild}</div>
    </div>
  );
}

/** The live bid in the middle of the felt. */
export function BidBadge({ bid, seat, total }) {
  if (!bid) return null;
  return (
    <div key={`${bid.by}-${bid.q}-${bid.f}`} className="a-pop flex flex-col items-center">
      <div className="flex items-center gap-1.5 rounded-2xl border-[3px] border-ink bg-paper px-3 py-1.5" style={{ boxShadow: "0 4px 0 #2b1d14" }}>
        <span className="font-display text-3xl leading-none text-ink">{bid.q}×</span>
        <Die face={bid.f} size={38} />
      </div>
      <div className="mt-1.5 whitespace-nowrap rounded-full border-2 border-ink bg-sun px-2.5 text-[11px] font-black">
        <Face id={seat?.avatar} size={16} /> {seat?.name} · {T.atLeast} {bid.q}/{total}
      </div>
    </div>
  );
}

/** The smallest bid that beats `bid` on `face`. */
const minQ = (bid, f) => (!bid ? 1 : f > bid.f ? bid.q : bid.q + 1);
const legal = (bid, q, f) => !bid || q > bid.q || (q === bid.q && f > bid.f);

/** Face buttons + quantity, with LIAR and BID. */
export function BidPicker({ bid, total, dice = [], canCall, mustCall, onBid, onCall }) {
  // Opening bid: your strongest face (ones count too). Raising: the next face up.
  const start = () => {
    if (!bid) {
      const have = (f) => dice.filter((d) => d === f || d === 1).length;
      const f = [6, 5, 4, 3, 2].reduce((best, x) => (have(x) > have(best) ? x : best), 6);
      return { f, q: Math.max(1, Math.min(total, have(f))) };
    }
    const f = bid.f < 6 ? bid.f + 1 : bid.f;
    return { f, q: Math.min(total, minQ(bid, f)) };
  };
  const [pick, setPick] = useState(start);
  const key = bid ? `${bid.by}-${bid.q}-${bid.f}` : "none";
  useEffect(() => setPick(start()), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const setFace = (f) => { sfx("select"); setPick((p) => ({ f, q: Math.min(total, Math.max(p.q, minQ(bid, f))) })); };
  const setQ = (q) => { sfx("select"); setPick((p) => ({ ...p, q })); };
  const ok = !mustCall && legal(bid, pick.q, pick.f) && pick.q <= total;
  const lo = minQ(bid, pick.f);
  const btn = "flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-ink bg-paper text-lg font-black transition-transform active:scale-90 disabled:opacity-30";

  return (
    <div className="flex w-full flex-col gap-2">
      {mustCall ? (
        <div className="a-pop rounded-2xl border-[2.5px] border-dashed border-coral px-3 py-2 text-center text-xs font-black text-coral">{T.maxBid}</div>
      ) : (
        <div className="a-pop flex items-center justify-between gap-2 rounded-2xl border-[2.5px] border-ink bg-paper px-2 py-1.5" style={{ boxShadow: "0 3px 0 #2b1d14" }}>
          <div className="flex items-center gap-1" role="radiogroup" aria-label={T.bid}>
            {[2, 3, 4, 5, 6].map((f) => {
              const on = pick.f === f;
              const can = minQ(bid, f) <= total;
              return (
                <button key={f} disabled={!can} onClick={() => setFace(f)} role="radio" aria-checked={on} aria-label={FACE_NAMES[f]}
                  className={`rounded-xl p-0.5 transition-transform disabled:opacity-25 ${on ? "-translate-y-1 bg-sun" : "active:scale-90"}`}>
                  <Die face={f} size={30} />
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1" role="group" aria-label={T.howMany}>
            <button className={btn} disabled={pick.q <= lo} onClick={() => setQ(pick.q - 1)} aria-label="−">−</button>
            <span className="min-w-[2ch] text-center text-xl font-black tabular-nums">{pick.q}</span>
            <button className={btn} disabled={pick.q >= total} onClick={() => setQ(pick.q + 1)} aria-label="+">+</button>
          </div>
        </div>
      )}
      <div className="flex items-stretch justify-center gap-3">
        <button onClick={onCall} disabled={!canCall}
          className={`btn a-pop flex-1 rounded-2xl bg-coral px-5 py-2.5 text-white sm:flex-none sm:px-8 ${canCall && mustCall ? "a-hop" : ""}`}>
          <span className="block whitespace-nowrap text-base leading-none min-[380px]:text-lg">🤥 {T.liar}</span>
          <span className="block font-display text-xs tracking-wider opacity-80">{T.liarEn}</span>
        </button>
        {!mustCall && (
          <button onClick={() => ok && onBid(pick.q, pick.f)} disabled={!ok}
            className="btn a-pop flex-1 rounded-2xl bg-sun px-5 py-2.5 text-ink sm:flex-none sm:px-8" style={{ animationDelay: "60ms" }}>
            <span className="block whitespace-nowrap text-base leading-none min-[380px]:text-lg">📢 {T.bid}</span>
            <span className="block text-[11px] font-bold opacity-70">{pick.q} × {FACE_NAMES[pick.f]}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Everyone lifts their cup: matching dice glow, then the count and the verdict. */
export function RevealDice({ reveal, seats }) {
  const { bid, count, truthful } = reveal;
  const rows = seats.map((s, i) => ({ s, dice: reveal.dice[i] || [] })).filter((r) => r.dice.length);
  let n = 0;
  // Everything has to land well inside the engine's reveal pause.
  const step = Math.min(140, 1800 / Math.max(1, rows.reduce((k, r) => k + r.dice.length, 0)));
  const stamp = truthful ? { text: `✅ ${T.truth}`, bg: "#2ec4b6", sound: "truth" } : { text: `❌ ${T.bluff}`, bg: "#ff5a5f", sound: "bluff" };
  return (
    <div className="flex flex-col items-center">
      <div className="a-pop mb-1.5 flex items-center gap-1 rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 text-xs font-black">
        {bid.q}× <Die face={bid.f} size={18} /> ?
      </div>
      <div className="flex max-w-[92vw] flex-col gap-1 rounded-2xl border-[2.5px] border-ink bg-paper/95 p-2" style={{ boxShadow: "0 4px 0 #2b1d14" }}>
        {rows.map(({ s, dice }) => (
          <div key={s.idx} className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink" style={{ background: seatColor(s.idx) }}><Face id={s.avatar} size={20} /></span>
            {dice.map((d, j) => {
              const hit = d === bid.f || d === 1;
              const delay = 500 + n++ * step;
              return (
                <span key={j} className="a-pop" style={{ animationDelay: `${delay}ms` }}>
                  <Die face={d} size={24} hit={hit} dim={!hit} />
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="a-pop mt-2 rounded-full border-2 border-ink bg-sun px-3 font-display text-lg" style={{ animationDelay: `${600 + n * step}ms` }}>
        {count} / {bid.q}
      </div>
      <div onAnimationStart={() => sfx(stamp.sound)} className="a-stamp mt-2 rounded-xl border-[3px] border-ink px-4 py-1 font-display text-2xl tracking-wide"
        style={{ animationDelay: `${900 + n * step}ms`, background: stamp.bg, color: "white", textShadow: "2px 2px 0 #2b1d14" }}>
        {stamp.text}
      </div>
    </div>
  );
}
