import { useEffect, useRef, useState } from "react";
import { T, quipText } from "../i18n.js";
import { sfx, unlockAudio } from "../sfx.js";
import Character, { seatColor } from "./Character.jsx";
import { Starburst, Timer } from "./parts.jsx";

const HOLD_MS = 1300;

/** Press and hold to squeeze the trigger; letting go early backs out. */
function HoldToPull({ onPull }) {
  const [p, setP] = useState(0);
  const [hint, setHint] = useState(false);
  const run = useRef(null);

  const stop = (done) => {
    if (!run.current) return;
    cancelAnimationFrame(run.current.raf);
    clearTimeout(run.current.beat);
    const early = !done && Date.now() - run.current.t0 < 250;
    run.current = null;
    if (!done) { setP(0); if (early) setHint(true); }
  };
  const start = (e) => {
    e.preventDefault();
    if (run.current) return;
    unlockAudio();
    setHint(false);
    const t0 = Date.now();
    run.current = { t0 };
    const beat = () => {
      if (!run.current) return;
      sfx("heart");
      const k = Math.min(1, (Date.now() - t0) / HOLD_MS);
      run.current.beat = setTimeout(beat, 520 - 300 * k);
    };
    beat();
    const step = () => {
      if (!run.current) return;
      const k = Math.min(1, (Date.now() - t0) / HOLD_MS);
      setP(k);
      if (k >= 1) { stop(true); onPull(); return; }
      run.current.raf = requestAnimationFrame(step);
    };
    run.current.raf = requestAnimationFrame(step);
  };
  useEffect(() => () => stop(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="vignette fixed inset-0 z-[61]" style={{ opacity: p * 0.75 }} />
      <button
        onPointerDown={start}
        onPointerUp={() => stop(false)}
        onPointerLeave={() => stop(false)}
        onPointerCancel={() => stop(false)}
        onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) start(e); }}
        onKeyUp={() => stop(false)}
        onContextMenu={(e) => e.preventDefault()}
        className={`btn relative z-[62] w-full select-none overflow-hidden rounded-2xl bg-coral py-4 text-lg text-white ${p ? "a-heartbeat" : "a-hop"}`}
        style={{ WebkitTouchCallout: "none" }}>
        <span className="absolute inset-y-0 left-0 bg-[#b3202a]" style={{ width: `${p * 100}%` }} />
        <span className="relative">{p ? `${T.pull} ${Math.round(p * 100)}%` : T.pull}</span>
      </button>
      <div className={`relative z-[62] text-xs font-extrabold ${hint ? "a-wiggle text-coral" : "text-ink-soft"}`}>{T.holdToPull}</div>
    </>
  );
}

function Cylinder({ spinning, result, pulls, chamber }) {
  // Accumulate rotation so each spin keeps turning the same way; land the
  // chamber that was just tried under the hammer (top).
  const [deg, setDeg] = useState(0);
  const base = useRef(0);
  useEffect(() => {
    if (spinning) {
      base.current += 1440;
      setDeg(base.current);
    }
  }, [spinning]);
  const land = result ? -(chamber ?? 0) * 60 : -pulls * 60;
  const to = deg + land;
  const cx = 100, cy = 100;
  return (
    <div className="relative mx-auto h-44 w-44" style={{ perspective: 500 }}>
      <div className="absolute inset-x-4 -bottom-3 h-6 rounded-[50%] bg-ink/25 blur-md" />
      <div className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2" style={{ borderLeft: "11px solid transparent", borderRight: "11px solid transparent", borderTop: `16px solid ${result === "dead" ? "#ff5a5f" : "#2b1d14"}` }} />
      <div className="h-full w-full" style={{ transform: "rotateX(38deg)", transformStyle: "preserve-3d" }}>
      <div
        key={deg}
        className={spinning ? "a-cylinder h-full w-full" : "h-full w-full"}
        style={{ "--to": `${to}deg`, transform: spinning ? undefined : `rotate(${to}deg)`, filter: "drop-shadow(0 6px 0 #6b5646)" }}>
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <circle cx={cx} cy={cy} r="94" fill="#c9c3bb" stroke="#2b1d14" strokeWidth="5" />
          <circle cx={cx} cy={cy} r="80" fill="#dcd6ce" stroke="#2b1d14" strokeWidth="2" strokeDasharray="6 7" />
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(a) * 56, y = cy + Math.sin(a) * 56;
            const tried = i < pulls || (result && i === chamber);
            const fired = result === "dead" && i === chamber;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="21" fill={fired ? "#ff5a5f" : tried ? "#2b1d14" : "#fffdf8"} stroke="#2b1d14" strokeWidth="4" />
                {fired && <text x={x} y={y + 8} textAnchor="middle" fontSize="22">💥</text>}
                {!fired && !tried && <text x={x} y={y + 7} textAnchor="middle" fontSize="18" fill="#2b1d1433" fontWeight="900">?</text>}
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r="20" fill="#ffc83d" stroke="#2b1d14" strokeWidth="4" />
          <circle cx={cx} cy={cy} r="6" fill="#2b1d14" />
        </svg>
      </div>
      </div>
    </div>
  );
}

export default function Roulette({ view, nm, onPull }) {
  const r = view.roulette;
  const v = view.seats[r.victim];
  const mine = r.victim === view.me;
  const dead = r.result === "dead";
  const safe = r.result === "safe";
  const devil = r.reason === "devil";
  const pullsBefore = r.result ? r.chamber : v.pulls;
  const odds = 6 - pullsBefore;
  const ev = r.result && view.log.find((e) => (e.type === "dead" || e.type === "safe") && e.seat === r.victim);
  const quip = ev && quipText(ev);

  return (
    <div className="a-fade-up fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 px-4 backdrop-blur-[3px]">
      <div key={r.victim} className={`a-pop comic relative w-full max-w-sm rounded-[2rem] px-6 pb-6 pt-5 text-center ${dead ? "a-shake" : ""} ${devil ? "bg-[#fff0ee]" : "bg-paper"}`}>
        <div className={`font-display text-sm tracking-widest ${devil ? "text-[#b3202a]" : "text-coral"}`}>{devil ? `😈 ${T.devilRoulette}` : `🔫 ${T.roulette}`}</div>

        <div className="relative mx-auto mt-3 flex w-fit justify-center">
          <Character avatar={v.avatar} looks={v.looks} color={seatColor(r.victim)} size={86} state={dead ? "dead" : safe ? "happy" : "nervous"} />
        </div>
        <h2 className="mt-1 text-xl font-black">{mine ? T.you : v.name} · {T.facesGun}</h2>
        <p className="text-xs font-bold text-ink-soft">{T[r.reason]}</p>
        {r.queue?.length > 0 && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 text-xs font-extrabold">
            {T.queue}: {r.queue.map((i) => <span key={i} className="text-base" title={view.seats[i].name}>{view.seats[i].avatar}</span>)}
          </div>
        )}

        <div className="relative mt-4">
          <Cylinder spinning={r.spinning} result={r.result} pulls={v.pulls} chamber={r.chamber} />
          {r.result && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="a-pop relative flex items-center justify-center" style={{ width: dead ? 250 : 170, height: dead ? 250 : 170 }}>
                <Starburst fill={dead ? "#ff5a5f" : "#ffc83d"} points={dead ? 16 : 11} className={`absolute inset-0 h-full w-full ${dead ? "a-spin-slow" : ""}`} />
                <span className={`relative font-display ${dead ? "text-5xl text-white" : "text-3xl text-ink"}`} style={{ textShadow: dead ? "3px 3px 0 #2b1d14" : "none" }}>
                  {dead ? T.bang : T.click}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 text-sm font-extrabold text-ink-soft">
          {T.chance}: <span className="text-coral">1 / {odds}</span> {odds <= 2 && !r.result ? "😱" : ""}
        </div>

        <div className="mt-4 min-h-[56px]">
          {r.result ? (
            <div className={`a-pop rounded-2xl border-[3px] border-ink px-4 py-3 font-black ${dead ? "bg-coral text-white" : "bg-sun"}`}>
              {nm(r.victim)} {dead ? T.eliminated : T.survived}
              {quip && <div className="mt-1 text-sm font-bold opacity-90">„{quip}“</div>}
            </div>
          ) : mine && !r.spinning ? (
            <div className="flex flex-col items-center gap-2">
              <HoldToPull onPull={onPull} />
              <Timer deadline={view.deadline} offset={view.clockOffset} className="relative z-[62]" />
            </div>
          ) : (
            <div className="rounded-2xl border-[3px] border-dashed border-ink/40 px-4 py-3 font-extrabold">
              {r.spinning ? <span className="a-wiggle inline-block">{T.pulling}</span> : <>🤞 {v.name}…</>}
              {!r.spinning && <Timer deadline={view.deadline} offset={view.clockOffset} className="ml-2" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
