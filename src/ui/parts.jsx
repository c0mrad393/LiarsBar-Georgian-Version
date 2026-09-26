import { useEffect, useState } from "react";
import { T } from "../i18n.js";
import { ACH } from "../achievements.js";
import { isMuted, setMuted, sfx, unlockAudio } from "../sfx.js";
import { isMusicOn, setMusicOn } from "../music.js";

const BTN = {
  sun: "bg-sun text-ink",
  coral: "bg-coral text-white",
  mint: "bg-[#0f8277] text-white", // dark enough for white text
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

/** Sound button: opens two switches, effects and music. */
export function SoundToggle({ className = "" }) {
  const [m, setM] = useState(isMuted());
  const [music, setMusic] = useState(isMusicOn());
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const t = setTimeout(() => window.addEventListener("pointerdown", close), 0);
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", close); };
  }, [open]);
  const row = (icon, label, value, flip) => (
    <button onPointerDown={(e) => e.stopPropagation()} onClick={flip} aria-pressed={value}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm font-black hover:bg-cream">
      <span>{icon} {label}</span>
      <span className={`relative h-6 w-10 rounded-full border-2 border-ink transition-colors ${value ? "bg-[#0f8277]" : "bg-cream"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full border-2 border-ink bg-paper transition-all ${value ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => { unlockAudio(); setOpen(!open); }}
        className="comic-sm flex h-10 w-10 items-center justify-center rounded-full bg-paper text-lg transition-transform active:scale-90"
        aria-label={T.sound} aria-expanded={open} title={T.sound}>
        {m && !music ? "🔇" : music ? "🎵" : "🔊"}
      </button>
      {open && (
        <div className="a-pop comic absolute right-0 top-12 z-[70] w-48 rounded-2xl bg-paper p-1.5">
          {row("🎵", T.music, music, () => { setMusicOn(!music); setMusic(!music); unlockAudio(); })}
          {row("🔊", T.sounds, !m, () => { setMuted(!m); setM(!m); if (m) { unlockAudio(); sfx("pop"); } })}
        </div>
      )}
    </div>
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

/** − n + control. */
export function Stepper({ value, min, max, onChange, label }) {
  const btn = "flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-ink bg-paper text-lg font-black transition-transform active:scale-90 disabled:opacity-30";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button className={btn} disabled={value <= min} onClick={() => { onChange(value - 1); sfx("select"); }} aria-label="−">−</button>
      <span className="min-w-[1.5ch] text-center text-xl font-black tabular-nums">{value}</span>
      <button className={btn} disabled={value >= max} onClick={() => { onChange(value + 1); sfx("select"); }} aria-label="+">+</button>
    </div>
  );
}

export function CoinChip({ coins, onClick, className = "" }) {
  return (
    <button onClick={onClick} className={`comic-sm flex h-10 items-center gap-1.5 rounded-full bg-sun px-3 text-sm font-black transition-transform active:scale-95 ${className}`} aria-label={`${coins ?? 0} ${T.coins}`}>
      <span className="a-bob inline-block">🪙</span>
      <span className="tabular-nums">{coins ?? "…"}</span>
    </button>
  );
}

/** A player's title (an achievement they chose to wear). `short` = icon only. */
export function TitleTag({ id, short, className = "" }) {
  const a = ACH[id];
  if (!a) return null;
  if (short) return <span className={`inline-block ${className}`} title={a.title}>{a.icon}</span>;
  return (
    <span className={`inline-flex max-w-full items-center gap-1 truncate rounded-full border-2 border-ink bg-grape px-1.5 text-[10px] font-black leading-4 text-white ${className}`}>
      {a.icon} <span className="truncate">{a.title}</span>
    </span>
  );
}

/** A bottom sheet on phones (centred card on wider screens). */
export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="a-fade-up fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 sm:items-center sm:px-4" onClick={onClose}>
      <div className="a-sheet comic safe-b flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-[2rem] bg-paper px-5 pb-4 pt-3 sm:rounded-[2rem]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-ink/20 sm:hidden" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button onClick={onClose} className="comic-sm flex h-9 w-9 items-center justify-center rounded-full bg-cream font-black" aria-label={T.close}>✕</button>
        </div>
        <div className="no-scrollbar -mx-1 overflow-y-auto px-1 pb-1">{children}</div>
      </div>
    </div>
  );
}
