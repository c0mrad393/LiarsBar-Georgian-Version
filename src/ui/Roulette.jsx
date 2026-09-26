import { useEffect, useRef, useState } from "react";
import { T, quipText } from "../i18n.js";
import { sfx, unlockAudio } from "../sfx.js";
import Character, { seatColor } from "./Character.jsx";
import { Face } from "./heads.jsx";
import { Starburst, Timer } from "./parts.jsx";

const HOLD_MS = 1300;

/** Press and hold to squeeze the trigger; letting go early backs out. */
function HoldToPull({ onPull, wine }) {
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
        <span className="relative">{p ? `${wine ? T.drink : T.pull} ${Math.round(p * 100)}%` : wine ? T.drink : T.pull}</span>
      </button>
      <div className={`relative z-[62] text-xs font-extrabold ${hint ? "a-wiggle text-coral" : "text-ink-soft"}`}>{wine ? T.holdToDrink : T.holdToPull}</div>
    </>
  );
}

function Cylinder({ spinning, result, pulls, chamber, slow }) {
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
    <div className="relative mx-auto h-32 w-32" style={{ perspective: 500 }}>
      <div className="absolute inset-x-4 -bottom-3 h-6 rounded-[50%] bg-ink/25 blur-md" />
      <div className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2" style={{ borderLeft: "11px solid transparent", borderRight: "11px solid transparent", borderTop: `16px solid ${result === "dead" ? "#ff5a5f" : "#2b1d14"}` }} />
      <div className="h-full w-full" style={{ transform: "rotateX(38deg)", transformStyle: "preserve-3d" }}>
      <div
        key={deg}
        className={spinning ? "a-cylinder h-full w-full" : "h-full w-full"}
        style={{ "--to": `${to}deg`, transform: spinning ? undefined : `rotate(${to}deg)`, filter: "drop-shadow(0 6px 0 #6b5646)", animationDuration: slow ? "2.7s" : undefined }}>
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

/** Dice mode: six glasses of wine, one of them poisoned. Tried glasses stand empty. */
function Glasses({ spinning, result, pulls, chamber, slow }) {
  const tried = (i) => i < pulls || (result && i === chamber);
  return (
    <div className="relative mx-auto flex h-28 w-64 items-end justify-center">
      <div className="absolute inset-x-2 bottom-1 h-8 rounded-[50%] bg-[#7a4a2c]" style={{ boxShadow: "0 5px 0 #2b1d14" }} />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = ((i - 2.5) / 2.5) * 0.9;
        const now = !result && i === pulls;
        const drinking = spinning && i === pulls;
        const poison = result === "dead" && i === chamber;
        const empty = tried(i) && !poison;
        return (
          <div key={i} className={`relative mx-0.5 ${now && !spinning ? "a-hop" : ""}`} style={{ transform: `translateY(${-Math.cos(a) * 26}px)` }}>
            <svg viewBox="0 0 40 70" width="36" height="63" className={drinking ? "a-sip" : now ? "a-slosh" : ""} style={drinking && slow ? { animationDuration: "2.7s" } : undefined}>
              <path d="M6 4 H34 Q35 26 20 34 Q5 26 6 4 Z" fill="#fffdf8" fillOpacity="0.8" stroke="#2b1d14" strokeWidth="3" strokeLinejoin="round" />
              {!empty && <path d="M8 12 H32 Q31 27 20 31 Q9 27 8 12 Z" fill={poison ? "#57cc3b" : "#b3202a"} />}
              <path d="M20 34 V60" stroke="#2b1d14" strokeWidth="3" />
              <path d="M9 64 H31" stroke="#2b1d14" strokeWidth="4" strokeLinecap="round" />
              <path d="M11 8 Q10 16 13 22" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.8" strokeLinecap="round" />
            </svg>
            {poison && <span className="a-pop absolute -top-5 left-1/2 -translate-x-1/2 text-2xl">☠️</span>}
          </div>
        );
      })}
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
  const wine = view.kind === "dice";
  const slow = view.dramatic; // 1-in-2 odds or the final two: slow motion
  // The heart pounds through a slow-motion pull.
  useEffect(() => {
    if (!slow || !r.spinning) return;
    sfx("heart");
    const t = setInterval(() => sfx("heart"), 430);
    return () => clearInterval(t);
  }, [slow, r.spinning]);
  const event = view.event; // chaos: "double" = two bullets, "safe" = jammed gun
  const pullsBefore = r.result ? r.chamber : v.pulls;
  const odds = 6 - pullsBefore;
  const ev = r.result && view.log.find((e) => (e.type === "dead" || e.type === "safe") && e.seat === r.victim);
  const quip = ev && quipText(ev);

  return (
    <div className={`a-fade-up fixed inset-0 z-[60] flex items-center justify-center px-4 backdrop-blur-[3px] ${slow ? "bg-ink/70" : "bg-ink/45"}`}>
      {slow && (
        <>
          <div className="slowmo-bar pointer-events-none fixed inset-x-0 top-0 z-[63] h-[9vh] bg-black" />
          <div className="slowmo-bar slowmo-bar-b pointer-events-none fixed inset-x-0 bottom-0 z-[63] h-[9vh] bg-black" />
          <div className="vignette pointer-events-none fixed inset-0 z-[61]" style={{ opacity: 0.8 }} />
        </>
      )}
      <div key={r.victim} className={`a-pop comic relative w-full max-w-sm rounded-[2rem] px-6 pb-6 pt-5 text-center ${dead ? "a-shake" : ""} ${devil ? "bg-[#fff0ee]" : "bg-paper"}`}>
        <div className={slow && r.spinning ? "slowmo-zoom" : ""}>
        <div className={`font-display text-sm tracking-widest ${devil ? "text-[#b3202a]" : wine ? "text-grape" : "text-coral"}`}>{devil ? `😈 ${T.devilRoulette}` : wine ? `🍷 ${T.wineRoulette}` : `🔫 ${T.roulette}`}</div>
        {slow && !r.result && <div className="a-pop mx-auto mt-1 w-fit rounded-full border-2 border-ink bg-ink px-2.5 text-[11px] font-black tracking-wide text-sun">🎬 {T.clutch}</div>}

        <div className="relative mx-auto mt-3 flex w-fit justify-center">
          <Character avatar={v.avatar} looks={v.looks} color={seatColor(r.victim)} size={100}
            state={dead ? "dead" : safe ? (wine ? "tipsy" : "happy") : r.spinning ? "brace" : "nervous"}
            blush={wine ? (r.result ? r.chamber + 1 : v.pulls) / 5 : 0}
            hold={wine ? "glass" : "gun"} firing={r.spinning} result={r.result} />
        </div>
        <h2 className="mt-1 text-xl font-black">{mine ? T.you : v.name} · {wine ? T.faceGlass : T.facesGun}</h2>
        <p className="text-xs font-bold text-ink-soft">{T[r.reason]}</p>
        {r.queue?.length > 0 && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 text-xs font-extrabold">
            {T.queue}: {r.queue.map((i) => <span key={i} title={view.seats[i].name}><Face id={view.seats[i].avatar} size={20} /></span>)}
          </div>
        )}

        <div className="relative mt-4">
          {wine ? (
            <Glasses spinning={r.spinning} result={r.result} pulls={v.pulls} chamber={r.chamber} slow={slow} />
          ) : (
            <Cylinder spinning={r.spinning} result={r.result} pulls={v.pulls} chamber={r.chamber} slow={slow} />
          )}
          {r.result && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="a-pop relative flex items-center justify-center" style={{ width: dead ? 250 : 170, height: dead ? 250 : 170 }}>
                <Starburst fill={dead ? "#ff5a5f" : "#ffc83d"} points={dead ? 16 : 11} className={`absolute inset-0 h-full w-full ${dead ? "a-spin-slow" : ""}`} />
                <span className={`relative font-display ${dead ? "text-5xl text-white" : "text-3xl text-ink"}`} style={{ textShadow: dead ? "3px 3px 0 #2b1d14" : "none" }}>
                  {dead ? (wine ? `☠️ ${T.poisoned}` : T.bang) : r.jam ? `🛟 ${T.jammed}` : wine ? `🍷 ${T.tasty}` : T.click}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 text-sm font-extrabold text-ink-soft">
          {event === "safe" ? (
            <>🛟 {T.chance}: <span className="text-[#0f8277]">0</span></>
          ) : (
            <>{T.chance}: <span className="text-coral">{event === "double" && odds > 1 ? `2 / ${odds}` : `1 / ${odds}`}</span> {(odds <= 2 || event === "double") && !r.result ? "😱" : ""}</>
          )}
        </div>

        <div className="mt-4 min-h-[56px]">
          {r.result ? (
            <div className={`a-pop rounded-2xl border-[3px] border-ink px-4 py-3 font-black ${dead ? "bg-coral text-white" : "bg-sun"}`}>
              {nm(r.victim)} {dead ? T.eliminated : T.survived}
              {quip && <div className="mt-1 text-sm font-bold opacity-90">„{quip}“</div>}
            </div>
          ) : mine && !r.spinning ? (
            <div className="flex flex-col items-center gap-2">
              <HoldToPull onPull={onPull} wine={wine} />
              <Timer deadline={view.deadline} offset={view.clockOffset} className="relative z-[62]" />
            </div>
          ) : (
            <div className="rounded-2xl border-[3px] border-dashed border-ink/40 px-4 py-3 font-extrabold">
              {r.spinning ? <span className="a-wiggle inline-block">{wine ? T.sipping : T.pulling}</span> : <>🤞 {v.name}…</>}
              {!r.spinning && <Timer deadline={view.deadline} offset={view.clockOffset} className="ml-2" />}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
