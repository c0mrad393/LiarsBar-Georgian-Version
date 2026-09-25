// Playing cards drawn in SVG: real-deck look (card stock, corner indices,
// double-headed court figures), no image files. Card viewBox is 100×140.
import { useId } from "react";

const INK = "#231a14";
const RED = "#c8102e";
const BLUE = "#1f4e9c";
const GOLD = "#e3a82b";
const SKIN = "#f6d3ae";
const STOCK = "#fdfaf2";

const SIZES = {
  xs: "h-[34px] w-[24px] rounded-[3px]",
  sm: "h-[62px] w-[44px] rounded-[5px]",
  md: "h-[88px] w-[63px] rounded-[7px]",
  lg: "h-[106px] w-[76px] rounded-[8px] sm:h-[120px] sm:w-[86px]",
};

// ------------------------------------------------------------------ suits ---

/** Suit glyph in a 100×100 box, placed at (x, y) with size s. */
export function Suit({ suit, x = 0, y = 0, s = 100, color }) {
  const fill = color || (suit === "H" || suit === "D" ? RED : INK);
  const t = `translate(${x} ${y}) scale(${s / 100})`;
  if (suit === "H")
    return <path transform={t} fill={fill} d="M50 92C22 68 4 50 4 30 4 14 16 4 30 4c10 0 17 6 20 14 3-8 10-14 20-14 14 0 26 10 26 26 0 20-18 38-46 62Z" />;
  if (suit === "D") return <path transform={t} fill={fill} d="M50 2 86 50 50 98 14 50Z" />;
  if (suit === "C")
    return (
      <g transform={t} fill={fill}>
        <circle cx="50" cy="27" r="21" />
        <circle cx="26" cy="58" r="21" />
        <circle cx="74" cy="58" r="21" />
        <circle cx="50" cy="52" r="12" />
        <path d="M45 58c0 18-5 30-14 40h38c-9-10-14-22-14-40Z" />
      </g>
    );
  return (
    <path transform={t} fill={fill} d="M50 2C38 24 6 40 6 62c0 14 11 24 24 24 8 0 14-4 17-10-1 10-5 17-13 22h32c-8-5-12-12-13-22 3 6 9 10 17 10 13 0 24-10 24-24C94 40 62 24 50 2Z" />
  );
}

// ---------------------------------------------------------- court figures ---
// Each figure is drawn as its upper half (y 20…70) and repeated rotated 180°
// about the card centre, like a real double-headed court card.

function KingHalf({ main, trim }) {
  return (
    <g stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
      <line x1="71" y1="27" x2="64" y2="70" stroke={GOLD} strokeWidth="2.6" />
      <circle cx="71.5" cy="25.5" r="3.2" fill={GOLD} />
      <path d="M71.5 21.2v8.6M67.2 25.5h8.6" stroke={INK} strokeWidth="0.7" />
      <path d="M19 70 23 55Q34 46.5 50 46.5T77 55l4 15Z" fill={main} />
      <path d="M36 58 34 70M64 58l2 12" stroke={GOLD} strokeWidth="2.4" />
      <path d="M44 55h12v15H44Z" fill={trim} />
      <path d="M46 58h8M46 62h8M46 66h8" stroke={GOLD} strokeWidth="1.2" />
      <path d="M29 51.5Q50 60.5 71 51.5l-1.6 5.5Q50 65 30.6 57Z" fill={STOCK} />
      {[34, 40, 46, 52, 58, 64].map((x) => <circle key={x} cx={x} cy={55 + Math.abs(x - 49) * -0.05} r="0.9" fill={INK} stroke="none" />)}
      <path d="M40.8 35q-2 9 2.2 13l2-9Zm18.4 0q2 9-2.2 13l-2-9Z" fill={GOLD} />
      <ellipse cx="50" cy="38" rx="8.2" ry="9.6" fill={SKIN} />
      <path d="M42 41.5Q50 58 58 41.5 54.5 46.5 50 46.5T42 41.5Z" fill={GOLD} />
      <path d="M44.8 43.4q5.2-3 10.4 0" fill="none" strokeWidth="1.1" />
      <path d="M44.7 34.6h3.4M51.9 34.6h3.4" strokeWidth="0.8" />
      <circle cx="46.6" cy="37" r="0.95" fill={INK} stroke="none" />
      <circle cx="53.4" cy="37" r="0.95" fill={INK} stroke="none" />
      <path d="M40.6 30.4 41.4 20l4.3 5.8L50 17.6l4.3 8.2 4.3-5.8.8 10.4Z" fill={GOLD} />
      <rect x="40.4" y="28.2" width="19.2" height="3.4" fill={trim} />
      <circle cx="50" cy="17.6" r="1.4" fill={RED} />
      <circle cx="41.4" cy="20" r="1.1" fill={RED} />
      <circle cx="58.6" cy="20" r="1.1" fill={RED} />
    </g>
  );
}

function QueenHalf({ main, trim }) {
  return (
    <g stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
      <path d="M28 70 30 50" stroke="#3d7a3a" strokeWidth="1.3" />
      <path d="M26 49a4 4 0 1 1 8 0 4 4 0 1 1-8 0Z" fill={RED} />
      <circle cx="30" cy="49" r="1.4" fill={GOLD} />
      <path d="M19 70 23 56Q34 47.5 50 47.5T77 56l4 14Z" fill={main} />
      <path d="M38 53.5Q50 66 62 53.5L60 70H40Z" fill={trim} />
      <path d="M40.5 59.5h19M41.5 64.5h17" stroke={GOLD} strokeWidth="1.4" />
      <path d="M40 34q-4.5 15 1.5 22l4-13Zm20 0q4.5 15-1.5 22l-4-13Z" fill={GOLD} />
      <ellipse cx="50" cy="38.5" rx="7.8" ry="9.4" fill={SKIN} />
      <path d="M42.3 36q2.5-9 7.7-9t7.7 9q-4-5-7.7-5t-7.7 5Z" fill={GOLD} />
      <circle cx="46.8" cy="38" r="0.95" fill={INK} stroke="none" />
      <circle cx="53.2" cy="38" r="0.95" fill={INK} stroke="none" />
      <path d="M45.5 35.6q1.3-.9 2.6 0M51.9 35.6q1.3-.9 2.6 0" fill="none" strokeWidth="0.6" />
      <path d="M48 43.6q2 1.4 4 0" fill="none" stroke={RED} strokeWidth="1.1" />
      <circle cx="45.6" cy="41.3" r="1.2" fill="#f2a5a0" stroke="none" />
      <circle cx="54.4" cy="41.3" r="1.2" fill="#f2a5a0" stroke="none" />
      <path d="M42.4 29.6q2-7.6 4-3.2 1.8-7.4 3.6-7.4t3.6 7.4q2-4.4 4 3.2Z" fill={GOLD} />
      {[42.4, 46.4, 50, 53.6, 57.6].map((x, i) => <circle key={x} cx={x} cy={[29.6, 26.4, 18.6, 26.4, 29.6][i] - 1.2} r="1.15" fill={STOCK} />)}
      <path d="M43 52.5q7 4 14 0" fill="none" stroke={STOCK} strokeWidth="1.6" strokeDasharray="0.1 2.3" strokeLinecap="round" />
    </g>
  );
}

function Court({ rank, suit }) {
  const red = suit === "H" || suit === "D";
  const main = red ? RED : BLUE;
  const trim = red ? BLUE : RED;
  const Half = rank === "K" ? KingHalf : QueenHalf;
  return (
    <g>
      <rect x="17" y="20" width="66" height="100" rx="2" fill="#fffdf6" stroke={red ? RED : INK} strokeWidth="1" />
      <svg x="17" y="20" width="66" height="100" viewBox="17 20 66 100" overflow="hidden">
        <g transform="translate(0 2.6)"><Half main={main} trim={trim} /></g>
        <g transform="rotate(180 50 70) translate(0 2.6)"><Half main={main} trim={trim} /></g>
      </svg>
      <line x1="17" y1="70" x2="83" y2="70" stroke={red ? RED : INK} strokeWidth="0.6" />
      <Suit suit={suit} x={20} y={23} s={9} />
      <g transform="rotate(180 50 70)"><Suit suit={suit} x={20} y={23} s={9} /></g>
    </g>
  );
}

function Ace({ suit }) {
  const big = suit === "S";
  return (
    <g>
      {big && <circle cx="50" cy="70" r="30" fill="none" stroke={INK} strokeWidth="0.8" strokeDasharray="1.5 2.5" />}
      <Suit suit={suit} x={big ? 27 : 32} y={big ? 47 : 52} s={big ? 46 : 36} />
    </g>
  );
}

function JokerArt({ gid }) {
  return (
    <g stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
      <defs>
        <linearGradient id={gid} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffe8a3" />
          <stop offset="0.5" stopColor="#ffd1f1" />
          <stop offset="1" stopColor="#c9e7ff" />
        </linearGradient>
      </defs>
      <rect x="17" y="20" width="66" height="100" rx="3" fill={`url(#${gid})`} strokeWidth="0.8" />
      {/* hat: three floppy points with bells */}
      <path d="M50 52Q38 32 22 34q10 6 14 20Z" fill="#8e44ad" />
      <path d="M50 52Q62 32 78 34q-10 6-14 20Z" fill="#27ae60" />
      <path d="M50 52Q44 30 50 20q6 10 0 32Z" fill={RED} />
      <circle cx="22" cy="34" r="3.2" fill={GOLD} />
      <circle cx="78" cy="34" r="3.2" fill={GOLD} />
      <circle cx="50" cy="20" r="3.2" fill={GOLD} />
      <path d="M35 52h30v5H35Z" fill={GOLD} />
      {/* face */}
      <ellipse cx="50" cy="68" rx="13" ry="14" fill={SKIN} />
      <circle cx="44.5" cy="64" r="1.6" fill={INK} stroke="none" />
      <circle cx="55.5" cy="64" r="1.6" fill={INK} stroke="none" />
      <path d="M42 61q2.5-2 5 0M53 61q2.5-2 5 0" fill="none" strokeWidth="0.8" />
      <circle cx="50" cy="68.5" r="2.4" fill={RED} />
      <path d="M41.5 72.5Q50 83 58.5 72.5Q50 77 41.5 72.5Z" fill="#fff" />
      <circle cx="41" cy="71" r="2" fill="#f2a5a0" stroke="none" />
      <circle cx="59" cy="71" r="2" fill="#f2a5a0" stroke="none" />
      {/* ruff collar */}
      <path d="M30 88l5-6 5 6 5-6 5 6 5-6 5 6 5-6 5 6-5 8H35Z" fill={STOCK} />
      <path d="M26 120q2-18 24-24 22 6 24 24Z" fill="#8e44ad" />
      <path d="M50 96v24" stroke={GOLD} strokeWidth="2" />
      <path d="M26 120q2-18 24-24v24Z" fill="#27ae60" />
    </g>
  );
}

function DevilArt({ gid }) {
  return (
    <g stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
      <defs>
        <radialGradient id={gid} cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#ff6b3d" />
          <stop offset="0.55" stopColor="#8e0f1f" />
          <stop offset="1" stopColor="#2a0508" />
        </radialGradient>
      </defs>
      <rect x="17" y="20" width="66" height="100" rx="3" fill={`url(#${gid})`} strokeWidth="0.8" />
      {/* flames */}
      <path d="M17 120q3-14 9-8 0-16 9-6 2-14 10-4 4-14 10 0 6-12 10 3 7-10 9 7 5-8 9 8Z" fill="#ffb02e" stroke="none" opacity="0.9" />
      <path d="M17 120q5-8 10-3 2-10 8-2 4-10 9 0 5-9 9 2 6-8 9 3 5-6 11 0Z" fill="#ffe066" stroke="none" />
      {/* horns */}
      <path d="M33 50Q24 34 31 24q2 12 12 20Z" fill="#fff4e0" />
      <path d="M67 50Q76 34 69 24q-2 12-12 20Z" fill="#fff4e0" />
      {/* head */}
      <path d="M31 58q0-18 19-18t19 18q0 16-8 24l-11 8-11-8q-8-8-8-24Z" fill={RED} />
      <path d="M38 55l9 3M62 55l-9 3" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="43" cy="61" rx="3" ry="2.2" fill="#ffe066" />
      <ellipse cx="57" cy="61" rx="3" ry="2.2" fill="#ffe066" />
      <circle cx="43" cy="61" r="1" fill={INK} stroke="none" />
      <circle cx="57" cy="61" r="1" fill={INK} stroke="none" />
      <path d="M39 70q11 10 22 0q-11 5-22 0Z" fill="#fff" />
      <path d="M42 71.4l2 4 2-3.6M54 72l2 3.6 2-4" fill="#fff" strokeWidth="0.7" />
      <path d="M46 84l4 7 4-7" fill={INK} />
      {/* trident */}
      <path d="M76 30v44" stroke={GOLD} strokeWidth="2" />
      <path d="M71 34q0-6 5-8 5 2 5 8M76 26v-4" fill="none" stroke={GOLD} strokeWidth="1.8" />
    </g>
  );
}

// ----------------------------------------------------------------- corners ---

function Corner({ rank, suit, special }) {
  const red = suit === "H" || suit === "D";
  if (special) {
    const color = special === "D" ? "#ffd166" : "#8e44ad";
    const word = special === "D" ? "DEVIL" : "JOKER";
    return (
      <g>
        {word.split("").map((ch, i) => (
          <text key={i} x="9" y={16 + i * 9} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="9" fill={color} stroke={special === "D" ? INK : "none"} strokeWidth="0.4">{ch}</text>
        ))}
      </g>
    );
  }
  return (
    <g>
      <text x="9.5" y="17" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="15" fill={red ? RED : INK}>{rank}</text>
      <Suit suit={suit} x={4.5} y={20} s={10} />
    </g>
  );
}

// --------------------------------------------------------------------- API ---

/**
 * A face-up playing card.
 * rank: K | Q | A | J (joker) | D (devil); suit: S | H | D | C (cosmetic).
 */
export function Card({ rank, suit = "S", size = "md", selected, glow, className = "", style }) {
  const gid = useId().replace(/:/g, "");
  const special = rank === "J" || rank === "D" ? rank : null;
  const devil = rank === "D";
  return (
    <div
      className={`card-real relative select-none overflow-hidden ${SIZES[size]} ${className}`}
      style={{
        background: devil ? "#3a0a10" : STOCK,
        boxShadow: selected
          ? "0 0 0 3px #ffc83d, 0 14px 22px -6px rgba(35,26,20,.55)"
          : glow
            ? `0 0 0 3px ${glow}, 0 0 22px ${glow}, 0 6px 14px -4px rgba(35,26,20,.5)`
            : "0 1px 0 rgba(35,26,20,.25), 0 6px 14px -5px rgba(35,26,20,.45)",
        ...style,
      }}>
      <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full" aria-label={rank}>
        <rect x="1" y="1" width="98" height="138" rx="7" fill="none" stroke={devil ? "#6b1420" : "#e3dccb"} strokeWidth="1.4" />
        {rank === "K" || rank === "Q" ? <Court rank={rank} suit={suit} /> : null}
        {rank === "A" ? <Ace suit={suit} /> : null}
        {rank === "J" ? <JokerArt gid={gid} /> : null}
        {rank === "D" ? <DevilArt gid={gid} /> : null}
        {size !== "xs" && (
          <>
            <Corner rank={rank} suit={suit} special={special} />
            <g transform="rotate(180 50 70)"><Corner rank={rank} suit={suit} special={special} /></g>
          </>
        )}
      </svg>
      <div className="card-sheen pointer-events-none absolute inset-0" />
    </div>
  );
}

const BACK_BADGE = { red: "🍺", blue: "🍺", money: "💲", rainbow: "🌈", leopard: "🐆", georgia: "✚", gold: "👑", galaxy: "🪐" };

/** The back of a card. `back` is a style from the shop (c_* items); default the classic red lattice. */
export function CardBack({ size = "sm", back = "red", className = "", style }) {
  const b = BACK_BADGE[back] ? back : "red";
  return (
    <div className={`card-real card-back-real relative overflow-hidden ${SIZES[size]} ${className}`} style={style}>
      <div className={`absolute inset-[7%] rounded-[3px] card-lattice back-${b}`}>
        {size !== "xs" && (
          <div className="back-medal absolute left-1/2 top-1/2 flex h-[38%] w-[62%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[50%] border border-[#f7e7c4]">
            <span className={size === "sm" ? "text-[11px]" : "text-[17px]"} style={b === "georgia" ? { color: "#d81e28", fontWeight: 900 } : undefined}>{BACK_BADGE[b]}</span>
          </div>
        )}
      </div>
      <div className="card-sheen pointer-events-none absolute inset-0" />
    </div>
  );
}
