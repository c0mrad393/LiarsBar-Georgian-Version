import { useEffect, useState } from "react";
import { RANKS, T } from "../i18n.js";
import { isMuted, setMuted, sfx, unlockAudio } from "../sfx.js";

const BTN = {
  sun: "bg-sun text-ink",
  coral: "bg-coral text-white",
  mint: "bg-mint text-white",
  grape: "bg-grape text-white",
  sky: "bg-sky text-white",
  paper: "bg-paper text-ink",
};

export function Btn({ color = "sun", className = "", children, onClick, ...rest }) {
  return (
    <button
      {...rest}
      onClick={(e) => { unlockAudio(); onClick?.(e); }}
      className={`btn rounded-2xl px-5 py-3 ${BTN[color]} ${className}`}>
      {children}
    </button>
  );
}

const SIZES = {
  sm: { box: "h-[62px] w-[44px] rounded-lg", letter: "text-xs", emoji: "text-xl", name: "hidden" },
  md: { box: "h-[88px] w-[62px] rounded-xl", letter: "text-sm", emoji: "text-3xl", name: "text-[8px]" },
  lg: { box: "h-[104px] w-[72px] rounded-xl sm:h-[118px] sm:w-[82px]", letter: "text-base", emoji: "text-4xl sm:text-[42px]", name: "text-[9px]" },
};

export function Card({ rank, size = "md", selected, className = "", style }) {
  const r = RANKS[rank] || RANKS.K;
  const s = SIZES[size];
  return (
    <div
      className={`relative flex select-none flex-col items-center justify-between overflow-hidden border-[2.5px] border-ink bg-paper p-1 ${s.box} ${className}`}
      style={{ boxShadow: selected ? `0 0 0 4px ${r.color}, 0 8px 0 #2b1d14` : "0 3px 0 #2b1d14", ...style }}>
      <div className="absolute inset-x-0 top-0 h-1/3" style={{ background: r.soft }} />
      <span className={`relative self-start pl-0.5 font-display leading-none ${s.letter}`} style={{ color: r.color }}>{rank}</span>
      <span className={`relative leading-none ${s.emoji}`}>{r.emoji}</span>
      <span className={`relative font-bold leading-none ${s.name}`} style={{ color: r.color }}>{r.geo}</span>
    </div>
  );
}

export function CardBack({ size = "sm", className = "", style }) {
  return <div className={`card-back border-[2.5px] border-ink ${SIZES[size].box} ${className}`} style={{ boxShadow: "0 3px 0 #2b1d14", ...style }} />;
}

export function Avatar({ emoji, size = 56, active, dead, className = "" }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full border-[3px] border-ink ${active ? "a-ring" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.56,
        background: dead ? "#e7e1d8" : active ? "#fff1c7" : "#fffdf8",
        boxShadow: active ? undefined : "0 3px 0 #2b1d14",
      }}>
      <span className={dead ? "a-ghost" : "a-bob"} style={{ display: "inline-block", filter: dead ? "grayscale(1)" : "none" }}>
        {dead ? "👻" : emoji}
      </span>
    </div>
  );
}

/** Six revolver chambers: pulled so far, and the one that is next. */
export function Chambers({ pulls, dead, small }) {
  const d = small ? 7 : 9;
  return (
    <div className="flex items-center gap-[3px]" title={`${pulls}/6`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="rounded-full border-2 border-ink"
          style={{
            width: d,
            height: d,
            background: dead && i === pulls - 1 ? "#ff5a5f" : i < pulls ? "#2b1d14" : i === pulls && !dead ? "#ffc83d" : "#fffdf8",
          }}
        />
      ))}
    </div>
  );
}

/** Seconds left until a host-clock deadline (offset converts it to this clock). */
function useCountdown(deadline, offset = 0) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!deadline) { setLeft(null); return; }
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline + offset - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [deadline, offset]);
  return left;
}

export function Timer({ deadline, offset, className = "" }) {
  const left = useCountdown(deadline, offset);
  if (left == null) return null;
  const hot = left <= 5;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-xs font-extrabold ${hot ? "a-wiggle bg-coral text-white" : "bg-paper"} ${className}`}>
      ⏱ {left}{T.secs}
    </span>
  );
}

export function SoundToggle({ className = "" }) {
  const [m, setM] = useState(isMuted());
  return (
    <button
      onClick={() => { setMuted(!m); setM(!m); if (m) { unlockAudio(); sfx("pop"); } }}
      className={`comic-sm flex h-10 w-10 items-center justify-center rounded-full bg-paper text-lg transition-transform active:scale-90 ${className}`}
      aria-label={T.sound}
      title={T.sound}>
      {m ? "🔇" : "🔊"}
    </button>
  );
}

/** Comic-book explosion shape. */
export function Starburst({ fill = "#ffc83d", stroke = "#2b1d14", points = 14, className = "", style }) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 36 + ((i * 7) % 5) : 49;
    pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`);
  }
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
      <polygon points={pts.join(" ")} fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function Confetti({ count = 90 }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      dx: `${(Math.random() - 0.5) * 40}vw`,
      rot: `${(Math.random() - 0.5) * 1800}deg`,
      dur: `${2.4 + Math.random() * 2}s`,
      delay: `${Math.random() * 0.8}s`,
      color: ["#ffc83d", "#ff5a5f", "#2ec4b6", "#9b5de5", "#3a86ff", "#7ed957"][i % 6],
      w: 7 + Math.random() * 7,
      round: Math.random() < 0.3,
    })));
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="a-confetti absolute top-0 border border-ink/40"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.round ? p.w : p.w * 1.6,
            borderRadius: p.round ? "50%" : 2,
            background: p.color,
            "--dx": p.dx,
            "--rot": p.rot,
            "--dur": p.dur,
            "--delay": p.delay,
          }}
        />
      ))}
    </div>
  );
}
