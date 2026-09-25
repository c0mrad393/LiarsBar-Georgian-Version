// Drawings for shop items that aren't a single emoji: glasses, moustaches,
// hats, neckwear, outfits (the whole body), wings and animated auras.
// Face items draw in a 100×100 box laid over the head; neck items in 100×40
// over the collar; bodies in the 100×62 body box.
import { useId } from "react";

const INK = "#2b1d14";
const sw = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" };

// ------------------------------------------------------------------ face ---
export const FACE = {
  googly: () => (
    <g>
      {[34, 66].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="40" r="14" fill="#fff" {...sw} />
          <circle cx={x} cy="40" r="6.5" fill={INK} className="gear-googly" style={{ transformOrigin: `${x}px 40px`, animationDelay: `${i * -0.37}s` }} />
        </g>
      ))}
    </g>
  ),
  glasses3d: () => (
    <g>
      <rect x="14" y="30" width="72" height="22" rx="4" fill="#fff" {...sw} />
      <rect x="19" y="34" width="27" height="14" rx="2" fill="#ff3b3b" opacity="0.85" />
      <rect x="54" y="34" width="27" height="14" rx="2" fill="#2ba7ff" opacity="0.85" />
      <path d="M14 36 4 32M86 36l10-4" {...sw} fill="none" />
    </g>
  ),
  heartglasses: () => (
    <g>
      {[32, 68].map((x) => (
        <path key={x} transform={`translate(${x - 16} 26) scale(0.32)`} fill="#ff3b6b" {...sw} strokeWidth="9"
          d="M50 92C22 68 4 50 4 30 4 14 16 4 30 4c10 0 17 6 20 14 3-8 10-14 20-14 14 0 26 10 26 26 0 20-18 38-46 62Z" />
      ))}
      <path d="M44 40q6-4 12 0" {...sw} fill="none" />
    </g>
  ),
  sleepmask: () => (
    <g>
      <path d="M8 34q42-10 84 0l-2 18q-40 8-80 0Z" fill="#6c63ff" {...sw} />
      <path d="M22 44q8 7 16 0M62 44q8 7 16 0" {...sw} fill="none" stroke="#fff" />
      <text x="82" y="26" fontSize="16" fontWeight="900" fill={INK} className="gear-zzz">z</text>
    </g>
  ),
  eyepatch: () => (
    <g>
      <path d="M6 22 94 58" {...sw} fill="none" />
      <ellipse cx="66" cy="42" rx="15" ry="13" fill={INK} />
      <text x="58" y="47" fontSize="12" fill="#fff">☠</text>
    </g>
  ),
  monocle: () => (
    <g>
      <circle cx="66" cy="40" r="15" fill="#bfe4ff55" stroke="#d4a017" strokeWidth="4" />
      <path d="M79 48q8 20-2 40" stroke="#d4a017" strokeWidth="2" fill="none" strokeDasharray="3 2" />
    </g>
  ),
  stareyes: () => (
    <g>
      {[34, 66].map((x, i) => (
        <text key={x} x={x} y="50" fontSize="26" textAnchor="middle" className="gear-spin" style={{ transformOrigin: `${x}px 41px`, animationDelay: `${i * 0.3}s` }}>⭐</text>
      ))}
    </g>
  ),
  laser: () => (
    <g>
      <g className="gear-laser">
        <path d="M34 40 150 0M66 40 170 24" stroke="#ff2d2d" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
        <path d="M34 40 150 0M66 40 170 24" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      {[34, 66].map((x) => <circle key={x} cx={x} cy="40" r="8" fill="#ff2d2d" stroke="#fff" strokeWidth="2" />)}
    </g>
  ),
  stache: () => <path d="M26 64q12-12 24-2q12-10 24 2q-10 4-24 0q-14 4-24 0Z" fill="#5a3a22" {...sw} strokeWidth="2.5" />,
  curly: () => (
    <path d="M50 62q-10-8-22-2q-8 4-10-3q-2 6 4 9q10 4 20-2q4-1 8-2q4 1 8 2q10 6 20 2q6-3 4-9q-2 7-10 3q-12-6-22 2Z" fill={INK} stroke={INK} strokeWidth="1.5" />
  ),
  tongue: () => (
    <g>
      <path d="M44 64h16v14q0 10-8 10t-8-10Z" fill="#ff7aa8" {...sw} strokeWidth="2.5" />
      <path d="M52 68v10" stroke="#d94a7c" strokeWidth="2" />
    </g>
  ),
  clownnose: () => (
    <g>
      <circle cx="50" cy="54" r="11" fill="#ff2d2d" {...sw} strokeWidth="2.5" />
      <circle cx="46" cy="50" r="3" fill="#fff" opacity="0.8" />
    </g>
  ),
  fangs: () => (
    <g fill="#fff" {...sw} strokeWidth="2">
      <path d="M40 64l4 12 4-12Z" />
      <path d="M52 64l4 12 4-12Z" />
    </g>
  ),
  beard: () => (
    <path d="M14 50q2 38 36 46q34-8 36-46q-8 10-18 8q-6 10-18 10t-18-10q-10 2-18-8Z" fill="#6b4226" {...sw} strokeWidth="2.5" />
  ),
  gum: () => (
    <g>
      <circle cx="56" cy="70" r="14" fill="#ff8ccf" stroke="#d94a9c" strokeWidth="2" className="gear-gum" style={{ transformOrigin: "50px 66px" }} />
      <circle cx="51" cy="65" r="3" fill="#fff" opacity="0.7" className="gear-gum" style={{ transformOrigin: "50px 66px" }} />
    </g>
  ),
  goldgrin: () => (
    <g>
      <path d="M30 62q20 16 40 0q-20 6-40 0Z" fill="#ffd54a" {...sw} strokeWidth="2" />
      <path d="M38 64v5M46 66v5M54 66v5M62 64v5" stroke={INK} strokeWidth="1.5" />
      <text x="70" y="60" fontSize="12" className="gear-twinkle">✨</text>
    </g>
  ),
};

// ------------------------------------------------------------------ hats ---
export const HATS = {
  party: () => (
    <g transform="rotate(-12 50 50)">
      <path d="M50 2 30 58h40Z" fill="#9b5de5" {...sw} />
      <path d="M40 30h20M35 44h30" stroke="#ffc83d" strokeWidth="5" />
      <circle cx="50" cy="2" r="7" fill="#ff5a5f" {...sw} strokeWidth="2.5" />
    </g>
  ),
  chef: () => (
    <g>
      <path d="M26 58V40q-14-4-10-18 6-12 18-6 6-12 16-12t16 12q12-6 18 6 4 14-10 18v18Z" fill="#fff" {...sw} />
      <path d="M26 50h48" {...sw} />
    </g>
  ),
  propeller: () => (
    <g>
      <path d="M20 60q0-30 30-30t30 30Z" fill="#3a86ff" {...sw} />
      <path d="M20 60q0-30 30-30V60Z" fill="#ffc83d" />
      <path d="M20 60q0-30 30-30t30 30Z" fill="none" {...sw} />
      <path d="M50 30V16" {...sw} />
      <g className="gear-propeller" style={{ transformOrigin: "50px 14px" }}>
        <ellipse cx="34" cy="14" rx="16" ry="5" fill="#ff5a5f" {...sw} strokeWidth="2" />
        <ellipse cx="66" cy="14" rx="16" ry="5" fill="#2ec4b6" {...sw} strokeWidth="2" />
      </g>
      <circle cx="50" cy="14" r="4" fill={INK} />
    </g>
  ),
  raincloud: () => (
    <g className="gear-bob" style={{ transformOrigin: "50px 30px" }}>
      {[30, 46, 62].map((x, i) => (
        <path key={x} d={`M${x} 42l-3 10`} stroke="#3a86ff" strokeWidth="3" strokeLinecap="round" className="gear-rain" style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
      <path d="M22 36q-12 0-12-10t12-10q2-12 16-12 10 0 14 8 4-4 10-4 12 0 14 12 10 0 10 8t-10 8Z" fill="#aab4c8" {...sw} />
    </g>
  ),
  viking: () => (
    <g>
      <path d="M8 20q-4 20 14 30M92 20q4 20-14 30" fill="#fffdf8" {...sw} />
      <path d="M8 20q4 16 16 22M92 20q-4 16-16 22" fill="none" {...sw} />
      <path d="M20 60q0-34 30-34t30 34Z" fill="#9aa3ad" {...sw} />
      <path d="M20 58h60" stroke="#c07d3f" strokeWidth="7" />
      <path d="M50 26v32" stroke="#c07d3f" strokeWidth="5" />
    </g>
  ),
  halo: () => (
    <ellipse cx="50" cy="30" rx="30" ry="9" fill="none" stroke="#ffd54a" strokeWidth="7" className="gear-bob" style={{ filter: "drop-shadow(0 0 6px #ffd54a)", transformOrigin: "50px 30px" }} />
  ),
  ufo: () => (
    <g className="gear-bob" style={{ transformOrigin: "50px 20px" }}>
      <path d="M36 30 20 70h60L64 30Z" fill="#b8ff6a" opacity="0.35" className="gear-beam" />
      <ellipse cx="50" cy="28" rx="36" ry="10" fill="#9aa3ad" {...sw} />
      <path d="M34 24q0-16 16-16t16 16Z" fill="#8fe3ff" {...sw} strokeWidth="2.5" />
      {[26, 40, 60, 74].map((x, i) => <circle key={x} cx={x} cy="30" r="3" fill={["#ff5a5f", "#ffc83d", "#2ec4b6", "#9b5de5"][i]} className="gear-twinkle" style={{ animationDelay: `${i * 0.2}s` }} />)}
    </g>
  ),
};
// [top, width] as fractions of the head, so each drawing sits on (or floats above) the head.
export const HAT_BOX = { party: [-0.24, 0.62], chef: [-0.26, 0.7], propeller: [-0.34, 0.84], raincloud: [-0.62, 0.9], viking: [-0.42, 1.06], halo: [-0.38, 0.8], ufo: [-0.7, 1.1] };

// ------------------------------------------------------------------ neck ---
export const NECK = {
  bowtie: ({ color }) => <path d="M38 12 50 18 38 24ZM62 12 50 18 62 24Z" fill={color || "#e23d43"} {...sw} strokeWidth="2" />,
  tie: () => <path d="M46 12h8l-2 5 6 20-8 8-8-8 6-20Z" fill="#3a86ff" {...sw} strokeWidth="2" />,
  beads: () => (
    <g>{Array.from({ length: 9 }).map((_, i) => {
      const a = Math.PI * (0.15 + (i / 8) * 0.7);
      return <circle key={i} cx={50 - Math.cos(a) * 26} cy={10 + Math.sin(a) * 18} r="4" fill={["#ff5a5f", "#ffc83d", "#2ec4b6", "#9b5de5"][i % 4]} stroke={INK} strokeWidth="1.5" />;
    })}</g>
  ),
  bib: () => (
    <g>
      <path d="M34 10h32v18q0 12-16 12T34 28Z" fill="#fff" {...sw} strokeWidth="2" />
      <text x="50" y="30" fontSize="14" textAnchor="middle">🍝</text>
    </g>
  ),
  scarf: () => (
    <g>
      <path d="M26 10q24 10 48 0v8q-24 10-48 0Z" fill="#ff5a5f" {...sw} strokeWidth="2" />
      <path d="M60 16l4 22h8l-2-22Z" fill="#ff5a5f" {...sw} strokeWidth="2" />
      <path d="M34 13v8M44 15v8M54 15v8" stroke="#fff" strokeWidth="3" />
    </g>
  ),
  lei: () => (
    <g>{Array.from({ length: 7 }).map((_, i) => {
      const a = Math.PI * (0.12 + (i / 6) * 0.76);
      return <text key={i} x={50 - Math.cos(a) * 28} y={16 + Math.sin(a) * 16} fontSize="12" textAnchor="middle">🌺</text>;
    })}</g>
  ),
  medal: () => (
    <g>
      <path d="M40 8l10 20 10-20" fill="none" stroke="#3a86ff" strokeWidth="5" />
      <circle cx="50" cy="31" r="8" fill="#ffd54a" {...sw} strokeWidth="2" />
      <text x="50" y="35" fontSize="10" textAnchor="middle" fill={INK}>★</text>
    </g>
  ),
  chain: () => (
    <g>
      <path d="M28 10q22 26 44 0" fill="none" stroke="#ffd54a" strokeWidth="4" strokeDasharray="4 2" />
      <circle cx="50" cy="28" r="8" fill="#ffd54a" {...sw} strokeWidth="2" />
      <text x="50" y="32" fontSize="11" fontWeight="900" textAnchor="middle" fill={INK}>$</text>
      <text x="62" y="26" fontSize="8" className="gear-twinkle">✨</text>
    </g>
  ),
};

// ----------------------------------------------------------------- bodies ---
const TORSO = "M6 62Q8 16 50 12Q92 16 94 62Z";

/** The body in the 100×62 box: default suit in the seat colour, or an outfit. */
export function Body({ outfit, color, noTie }) {
  const id = useId().replace(/:/g, "");
  const clip = `url(#t${id})`;
  const base = (fill, extra = null, collar = true) => (
    <>
      <defs>
        <clipPath id={`t${id}`}><path d={TORSO} /></clipPath>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={TORSO} fill={fill} />
      <g clipPath={clip}>{extra}</g>
      <path d={TORSO} fill={`url(#g${id})`} />
      <path d={TORSO} fill="none" {...sw} strokeWidth="4" />
      {collar && <path d="M36 14 50 38 64 14Q50 10 36 14Z" fill="#fffdf8" {...sw} />}
    </>
  );
  switch (outfit) {
    case "o_hoodie":
      return base("#8a8f98", <><path d="M30 10q20 16 40 0v10q-20 14-40 0Z" fill="#6f747d" /><rect x="32" y="44" width="36" height="14" rx="5" fill="#6f747d" /><path d="M44 22v12M56 22v12" stroke="#fff" strokeWidth="2" /></>, false);
    case "o_pajama":
      return base("#9fd3ff", Array.from({ length: 14 }).map((_, i) => <circle key={i} cx={10 + (i % 7) * 14} cy={22 + Math.floor(i / 7) * 18 + (i % 2) * 6} r="3.5" fill="#fff" />));
    case "o_prison":
      return base("#fff", <>{[18, 30, 42, 54].map((y) => <rect key={y} x="0" y={y} width="100" height="6" fill={INK} />)}<rect x="60" y="24" width="18" height="10" fill="#ff9f1c" stroke={INK} strokeWidth="1.5" /><text x="69" y="32" fontSize="7" fontWeight="900" textAnchor="middle">13</text></>, false);
    case "o_chefcoat":
      return base("#fff", <>{[22, 32, 42, 52].map((y) => <g key={y}><circle cx="40" cy={y} r="2.5" fill={INK} /><circle cx="60" cy={y} r="2.5" fill={INK} /></g>)}</>);
    case "o_sailor":
      return base("#fff", <><path d="M20 14 50 40 80 14 90 30 50 50 10 30Z" fill="#1f4e9c" /><path d="M44 36l6 10 6-10Z" fill="#e23d43" stroke={INK} strokeWidth="1.5" /></>, false);
    case "o_hawaii":
      return base("#ff9f1c", ["🌺", "🍍", "🌴", "🌺", "🍍", "🌺"].map((f, i) => <text key={i} x={14 + (i % 3) * 30 + (i > 2 ? 14 : 0)} y={i > 2 ? 56 : 34} fontSize="11">{f}</text>));
    case "o_tux":
      return base("#1c1c24", <><path d="M36 14 50 58 64 14Z" fill="#fff" /><path d="M36 14 44 40 50 30Z M64 14 56 40 50 30Z" fill="#2c2c38" /><circle cx="50" cy="44" r="2" fill={INK} /><circle cx="50" cy="52" r="2" fill={INK} /></>, false);
    case "o_hero":
      return base("#3a86ff", <><path d="M50 24 64 34 50 50 36 34Z" fill="#ffc83d" stroke={INK} strokeWidth="2" /><text x="50" y="41" fontSize="11" fontWeight="900" textAnchor="middle" fill="#e23d43">მ</text><rect x="0" y="54" width="100" height="8" fill="#e23d43" /></>, false);
    case "o_chokha":
      // Georgian chokha: dark coat, rows of gazyri (cartridge holders) on the chest, silver belt.
      return base("#2a1e2e", <>
        <path d="M44 12 50 40 56 12Z" fill="#8f1f2b" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x={22 + i * 3.4} y="22" width="2.6" height="12" rx="1" fill="#d9d9e0" stroke={INK} strokeWidth="0.8" />
            <rect x={75.4 - i * 3.4} y="22" width="2.6" height="12" rx="1" fill="#d9d9e0" stroke={INK} strokeWidth="0.8" />
          </g>
        ))}
        <rect x="0" y="48" width="100" height="5" fill="#c9ccd6" />
        <path d="M48 50h4l-1 12h-2Z" fill="#c9ccd6" stroke={INK} strokeWidth="0.8" />
      </>, false);
    case "o_gold":
      return base("#ffd54a", <><path d="M36 14 50 58 64 14Z" fill="#fff4c2" /><text x="22" y="40" fontSize="9" className="gear-twinkle">✨</text><text x="70" y="50" fontSize="9" className="gear-twinkle" style={{ animationDelay: "0.5s" }}>✨</text></>, false);
    default:
      return (
        <>
          {base(color || "#ff5a5f")}
          {!noTie && <path d="M40 20 50 25 40 30ZM60 20 50 25 60 30Z" fill={INK} />}
          <circle cx="50" cy="47" r="3" fill={INK} />
          <circle cx="50" cy="56" r="3" fill={INK} />
        </>
      );
  }
}

// ------------------------------------------------------------------ wings ---
export const WINGS = {
  cape: () => <path d="M26 6q-12 26-16 62h80q-4-36-16-62Z" fill="#e23d43" {...sw} className="gear-cape" style={{ transformOrigin: "50px 6px" }} />,
  batwings: () => (
    <g fill="#2b1d2e" {...sw} strokeWidth="2.5">
      <path className="gear-flap-l" style={{ transformOrigin: "40px 28px" }} d="M40 28Q22 0 2 8q6 8 2 16 8-2 12 6 6-6 12 2 6-4 12-4Z" />
      <path className="gear-flap-r" style={{ transformOrigin: "60px 28px" }} d="M60 28Q78 0 98 8q-6 8-2 16-8-2-12 6-6-6-12 2-6-4-12-4Z" />
    </g>
  ),
  angelwings: () => (
    <g fill="#fffdf8" {...sw} strokeWidth="2.5">
      <path className="gear-flap-l" style={{ transformOrigin: "40px 28px" }} d="M40 28Q16 -6 2 12q10 2 6 10 10 0 8 8 10-2 10 6 8-4 14-8Z" />
      <path className="gear-flap-r" style={{ transformOrigin: "60px 28px" }} d="M60 28Q84 -6 98 12q-10 2-6 10-10 0-8 8-10-2-10 6-8-4-14-8Z" />
    </g>
  ),
  devilwings: () => (
    <g fill="#8f1f2b" {...sw} strokeWidth="2.5">
      <path className="gear-flap-l" style={{ transformOrigin: "40px 28px" }} d="M40 28 4 0l6 18-8 8 14 2-2 10 26-10Z" />
      <path className="gear-flap-r" style={{ transformOrigin: "60px 28px" }} d="M60 28 96 0l-6 18 8 8-14 2 2 10-26-10Z" />
    </g>
  ),
  jetpack: () => (
    <g>
      <rect x="18" y="14" width="18" height="36" rx="8" fill="#9aa3ad" {...sw} strokeWidth="2.5" />
      <rect x="64" y="14" width="18" height="36" rx="8" fill="#9aa3ad" {...sw} strokeWidth="2.5" />
      {[27, 73].map((x) => <text key={x} x={x} y="68" fontSize="16" textAnchor="middle" className="a-flicker" style={{ transformOrigin: `${x}px 56px` }}>🔥</text>)}
    </g>
  ),
};
/** Where the back piece sits: [left, top, width] as fractions of the character size. */
export const WINGS_BOX = { cape: [-0.05, 0.56, 1.1], jetpack: [-0.1, 0.5, 1.2] };

// ------------------------------------------------------------------ auras ---
const orbit = (glyphs, r, dur, size) =>
  glyphs.map((g, i) => (
    <span key={i} className="gear-orbit absolute left-1/2 top-[22%]" style={{ "--r": `${r}px`, animationDuration: `${dur + i * 0.4}s`, animationDelay: `${-i * 0.9}s`, fontSize: size }}>{g}</span>
  ));
const rise = (glyphs, size, dur = 2.4) =>
  glyphs.map((g, i) => (
    <span key={i} className="gear-rise absolute bottom-[30%]" style={{ left: `${15 + ((i * 29) % 70)}%`, animationDelay: `${i * (dur / glyphs.length)}s`, animationDuration: `${dur}s`, fontSize: size }}>{g}</span>
  ));
const fall = (glyphs, size) =>
  glyphs.map((g, i) => (
    <span key={i} className="gear-fall absolute top-[-10%]" style={{ left: `${5 + ((i * 37) % 90)}%`, animationDelay: `${i * 0.45}s`, fontSize: size }}>{g}</span>
  ));

export const AURAS = {
  flies: (s) => orbit(["🪰", "🪰", "🪰"], s * 0.55, 1.6, s * 0.2),
  dizzy: (s) => orbit(["💫", "⭐", "💫"], s * 0.35, 2.2, s * 0.2),
  stink: (s) => rise(["💨", "💨", "💨"], s * 0.22, 2.6),
  bubbles: (s) => rise(["🫧", "🫧", "🫧", "🫧"], s * 0.2),
  notes: (s) => rise(["🎵", "🎶", "🎵"], s * 0.22),
  hearts: (s) => rise(["❤️", "💖", "❤️"], s * 0.2),
  sparkles: (s) => [0, 1, 2, 3, 4].map((i) => (
    <span key={i} className="gear-twinkle absolute" style={{ left: `${[8, 80, 18, 70, 45][i]}%`, top: `${[10, 20, 60, 70, 0][i]}%`, animationDelay: `${i * 0.3}s`, fontSize: s * 0.2 }}>✨</span>
  )),
  flames: (s) => [15, 50, 85].map((x, i) => (
    <span key={x} className="a-flicker absolute bottom-[-4%]" style={{ left: `${x}%`, translate: "-50% 0", animationDelay: `${i * 0.1}s`, fontSize: s * 0.36 }}>🔥</span>
  )),
  moneyrain: (s) => fall(["💸", "💵", "💸", "💵"], s * 0.22),
};
