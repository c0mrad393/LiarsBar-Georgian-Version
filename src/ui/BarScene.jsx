// The room around the table: an old Tbilisi dukani at night, painted the way
// Pirosmani painted his tavern signs: black oilcloth, figures and objects lit
// warm against it. Stone arch, qvevri jars, churchkhela on a string, a vine,
// and lamps that sway and flicker when a shot goes off. Each mode tints it.
// Pieces are pinned to the screen edges at fixed pixel sizes, so the room
// looks the same on a phone and on a wide monitor (only more of it shows).
import { memo, useId } from "react";

const INK = "#1c1510";

/** Wall, arch, glow colours per game mode. */
const THEMES = {
  classic: { wall: ["#241910", "#110c08"], arch: "#6e4c2b", deep: ["#2c1e12", "#150f0a"], glow: "#ffcf6e", pool: "#8a5a26" },
  devil: { wall: ["#2c100c", "#130606"], arch: "#7d2c20", deep: ["#3a1510", "#1a0806"], glow: "#ff6a3d", pool: "#8f2a18" },
  chaos: { wall: ["#1f1430", "#0d0915"], arch: "#5c4088", deep: ["#2a1b3d", "#130d1d"], glow: "#c77dff", pool: "#5a2f8f" },
  dice: { wall: ["#29111c", "#11070c"], arch: "#6f2c46", deep: ["#361624", "#190a11"], glow: "#ffb86b", pool: "#7a2c40" },
};

const CHURCHKHELA = ["#8b2a3a", "#c47a2c", "#6d1a36", "#b5651d"];

function Lamp({ len, glow, delay }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width="120" height={len + 80} viewBox={`-60 0 120 ${len + 80}`} className="bar-lamp overflow-visible" style={{ animationDelay: delay }}>
      <defs>
        <radialGradient id={`lg${id}`}>
          <stop offset="0" stopColor={glow} stopOpacity="0.9" /><stop offset="0.45" stopColor={glow} stopOpacity="0.35" /><stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy={len + 14} r="62" fill={`url(#lg${id})`} className="bar-glow" />
      <line x1="0" y1="0" x2="0" y2={len} stroke={INK} strokeWidth="2" />
      <path d={`M-13 ${len + 6}Q0 ${len - 6} 13 ${len + 6}Z`} fill={INK} />
      <circle cx="0" cy={len + 14} r="8.5" fill={glow} stroke={INK} strokeWidth="2.5" className="bar-bulb" />
      <circle cx="-3" cy={len + 11} r="2.6" fill="#fff" opacity="0.85" />
    </svg>
  );
}

function Qvevri({ flip }) {
  return (
    <svg viewBox="-60 -80 120 170" className="h-[120px] w-[85px] sm:h-[170px] sm:w-[120px]" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <defs>
        <radialGradient id="qvevri" cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#e8935a" /><stop offset="0.6" stopColor="#c0622f" /><stop offset="1" stopColor="#8a3e1a" />
        </radialGradient>
      </defs>
      <path d="M-34 -70Q-60 -40 -52 10Q-40 70 0 84Q40 70 52 10Q60 -40 34 -70Z" fill="url(#qvevri)" stroke={INK} strokeWidth="3" />
      <ellipse cx="0" cy="-70" rx="36" ry="9" fill="#7a3b1e" stroke={INK} strokeWidth="3" />
      <ellipse cx="0" cy="-71" rx="26" ry="5" fill="#3a1a0c" />
      <path d="M-40 -30Q0 -18 40 -30" fill="none" stroke="#7a3b1e" strokeWidth="3" strokeDasharray="6 5" />
      <ellipse cx="-22" cy="-30" rx="8" ry="22" fill="#fff" opacity="0.2" transform="rotate(12 -22 -30)" />
    </svg>
  );
}

function Grapes() {
  const dots = [[0, 0], [10, 0], [-10, 0], [5, 9], [-5, 9], [0, 18], [15, -9], [-15, -9], [0, -9]];
  return (
    <svg width="46" height="62" viewBox="-23 -34 46 62" className="bar-sway">
      <path d="M0 -20Q4 -30 14 -30" fill="none" stroke="#5a3a1a" strokeWidth="3" />
      <path d="M2 -22Q18 -38 22 -22Q16 -16 2 -22Z" fill="#6aa84f" stroke={INK} strokeWidth="2" />
      {dots.map(([dx, dy], i) => <circle key={i} cx={dx} cy={dy} r="6.5" fill="#7b2d8e" stroke={INK} strokeWidth="1.6" />)}
      {dots.slice(0, 4).map(([dx, dy], i) => <circle key={i} cx={dx - 2} cy={dy - 2} r="1.8" fill="#fff" opacity="0.6" />)}
    </svg>
  );
}

/** A grapevine tile repeated along the top edge. */
function Vine() {
  return (
    <svg width="100%" height="46" className="block">
      <defs>
        <pattern id="vine" width="180" height="46" patternUnits="userSpaceOnUse">
          <path d="M0 16Q45 34 90 16T180 16" fill="none" stroke="#5a3a1a" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 22q10-17 24-8q-6 15-24 8Z" fill="#6fb24f" stroke={INK} strokeWidth="1.6" />
          <path d="M112 12q12-14 24-2q-9 13-24 2Z" fill="#5fa843" stroke={INK} strokeWidth="1.6" />
          <path d="M150 20q2 10 10 12" fill="none" stroke="#5a3a1a" strokeWidth="1.6" />
        </pattern>
      </defs>
      <rect width="100%" height="46" fill="url(#vine)" />
    </svg>
  );
}

function Churchkhela() {
  return (
    <svg width="96" height="110" viewBox="0 0 96 110">
      <path d="M4 8Q48 20 92 8" fill="none" stroke="#5a3a1a" strokeWidth="2" />
      {CHURCHKHELA.map((c, i) => {
        const x = 16 + i * 21;
        return (
          <g key={i} className="bar-sway" style={{ transformOrigin: `${x}px 12px`, animationDelay: `${i * 0.35}s` }}>
            {Array.from({ length: 6 + (i % 2) }).map((_, j) => (
              <ellipse key={j} cx={x} cy={20 + j * 12} rx="6" ry="7" fill={c} stroke={INK} strokeWidth="1.4" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * @param mode    classic | devil | chaos | dice
 * @param flicker changes whenever a shot goes off (lamps blink, the room dims)
 */
function BarScene({ mode = "classic", flicker = 0, className = "z-0" }) {
  const t = THEMES[mode] || THEMES.classic;
  return (
    <div className={`bar-scene pointer-events-none fixed inset-0 overflow-hidden bar-${mode} ${className}`} aria-hidden="true"
      style={{ background: `linear-gradient(${t.wall[0]}, ${t.wall[1]})` }}>
      {/* the oilcloth weave */}
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(0deg, #ffffff06 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, #00000026 0 1px, transparent 1px 5px)" }} />
      {/* the cellar arch, painted */}
      <div className="absolute inset-x-[4%] bottom-[-40px] top-[16%] rounded-t-[50%_180px] border-[14px] border-b-0"
        style={{ borderColor: t.arch, background: `linear-gradient(${t.deep[0]}, ${t.deep[1]})`, opacity: 0.75, boxShadow: `inset 0 0 0 3px #00000055, 0 0 0 3px #00000055` }} />
      {/* lamplight pooling on the table */}
      <div className="absolute left-1/2 top-[44%] h-[70vh] w-[120vw] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-45"
        style={{ background: `radial-gradient(closest-side, ${t.pool}, transparent)` }} />
      <div className="absolute inset-x-0 top-0"><Vine /></div>
      <div className="absolute left-[6%] top-[26px]"><Grapes /></div>
      <div className="absolute right-[6%] top-[22px]"><Grapes /></div>
      <div className="absolute left-[3%] top-[70px] hidden md:block"><Churchkhela /></div>
      <div className="absolute right-[3%] top-[70px] hidden md:block"><Churchkhela /></div>
      <div key={flicker} className={flicker ? "bar-flicker" : ""}>
        <div className="absolute left-[24%] top-0 -translate-x-1/2"><Lamp len={46} glow={t.glow} delay="0s" /></div>
        <div className="absolute left-[76%] top-0 -translate-x-1/2"><Lamp len={40} glow={t.glow} delay="-2.1s" /></div>
      </div>
      <div className="absolute bottom-[-34px] left-[-40px] opacity-90 sm:bottom-[-40px] sm:left-[-46px]"><Qvevri /></div>
      <div className="absolute bottom-[-42px] right-[-40px] opacity-90 sm:bottom-[-50px] sm:right-[-46px]"><Qvevri flip /></div>
      {flicker ? <div key={`d${flicker}`} className="bar-dim absolute inset-0" /> : null}
    </div>
  );
}

export default memo(BarScene);
