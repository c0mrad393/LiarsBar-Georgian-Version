// Playing cards drawn in SVG, no image files; card viewBox is 100×140.
// The court cards are Pirosmani-style Georgian figures, double-headed like a
// real deck: the king is a tamada with a drinking horn, the queen the actress
// Margarita with her bouquet, the ace a horn, the joker a Tbilisi kinto.
// Corner indices are Georgian: მ (მეფე), დ (დედოფალი), ტ (ტუზი).
import { useId } from "react";

const INK = "#1f1711";
const RED = "#b3302a";
const BLUE = "#24435e";
const GOLD = "#d9a032";
const SKIN = "#f2cfa6";
const STOCK = "#f8f0dc";
const HAIR = "#2a1a10";
const SIGN_FONT = "'Noto Serif Georgian', Georgia, serif";
const INDEX = { K: "მ", Q: "დ", A: "ტ" };

const SIZES = {
  xs: "h-[34px] w-[24px] rounded-[3px]",
  sm: "h-[62px] w-[44px] rounded-[5px]",
  md: "h-[88px] w-[63px] rounded-[7px]",
  lg: "h-[106px] w-[76px] rounded-[8px] sm:h-[120px] sm:w-[86px] short:h-[90px] short:w-[65px]",
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

/** The tamada: papakha with a little crown, big moustache, chokha with gazyri, horn raised. */
function KingHalf({ main, trim }) {
  return (
    <g stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
      {/* drinking horn raised in a toast */}
      <path d="M62 60Q70 50 74 30l6 1Q78 52 66 63Z" fill={GOLD} />
      <path d="M74 30l6 1" stroke="#f3ead2" strokeWidth="1.8" />
      <path d="M67 52l7 2M70 44l7 1.5" stroke="#8a5a14" strokeWidth="0.8" />
      {/* chokha with gazyri rows */}
      <path d="M19 70 23 55Q34 46.5 50 46.5T77 55l4 15Z" fill={main} />
      <path d="M44 48 50 62 56 48" fill={trim} />
      {[0, 1, 2, 3].map((k) => (
        <g key={k}>
          <rect x={30 + k * 3} y="55" width="2" height="8" rx="0.6" fill="#e9e2cf" strokeWidth="0.5" />
          <rect x={68 - k * 3} y="55" width="2" height="8" rx="0.6" fill="#e9e2cf" strokeWidth="0.5" />
        </g>
      ))}
      <path d="M38 67h24" stroke={GOLD} strokeWidth="2" />
      {/* face */}
      <ellipse cx="50" cy="38.5" rx="8.2" ry="9.4" fill={SKIN} />
      <path d="M44.2 34.6q2-1.6 4 0M51.8 34.6q2-1.6 4 0" fill="none" stroke={HAIR} strokeWidth="1.4" />
      <circle cx="46.4" cy="37" r="0.95" fill={INK} stroke="none" />
      <circle cx="53.6" cy="37" r="0.95" fill={INK} stroke="none" />
      <circle cx="44.8" cy="40.5" r="1.4" fill="#e39a8a" stroke="none" />
      <circle cx="55.2" cy="40.5" r="1.4" fill="#e39a8a" stroke="none" />
      <path d="M50 41.5q-5.5-1.5-8.5 2.5 3.5-.8 5.5.6Q49 43 50 43t2.5 1.6q2-1.4 5.5-.6-3-4-8-2.5Z" fill={HAIR} />
      <path d="M47.5 46q2.5 1.2 5 0" fill="none" strokeWidth="0.8" />
      {/* papakha and its little crown */}
      <path d="M40.5 32q0-9 9.5-9t9.5 9Z" fill="#3b2a1d" />
      <path d="M42 29q2-2 4 0t4 0 4 0 4 0" fill="none" stroke="#6b4b31" strokeWidth="0.8" />
      <path d="M44.5 23.5 45 18l2.6 2.6L50 16.2l2.4 4.4L55 18l.5 5.5Z" fill={GOLD} />
      <circle cx="50" cy="16.2" r="1.1" fill={RED} />
    </g>
  );
}

/** Margarita, the actress Pirosmani loved: white dress, dark hair, a bouquet. */
function QueenHalf({ main, trim }) {
  return (
    <g stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
      {/* bouquet */}
      <path d="M30 70 31 52M28 70l5-16M33 70l-1-16" stroke="#3d6b3a" strokeWidth="1.1" />
      {[[27, 50, RED], [32, 47, "#f3ead2"], [35.5, 51, RED], [30.5, 53.5, "#e7b24a"]].map(([x, y, c], k) => (
        <g key={k}><circle cx={x} cy={y} r="3" fill={c} /><circle cx={x} cy={y} r="0.9" fill={GOLD} stroke="none" /></g>
      ))}
      {/* white dress with a coloured sash */}
      <path d="M19 70 23 56Q34 47.5 50 47.5T77 56l4 14Z" fill="#fbf4e6" />
      <path d="M36 57q14 6 28 0l1 5q-15 6-30 0Z" fill={main} />
      <path d="M44 49q6 5 12 0" fill="none" stroke={trim} strokeWidth="1.4" />
      {/* hair */}
      <path d="M40.5 40q-2-14 9.5-14t9.5 14q-1-6-9.5-7-8.5 1-9.5 7Z" fill={HAIR} />
      <path d="M41 40q-2 8 1 12M59 40q2 8-1 12" fill="none" stroke={HAIR} strokeWidth="2.2" />
      <ellipse cx="50" cy="39" rx="7.6" ry="9.2" fill={SKIN} />
      <path d="M43 33q7-5 14 0-3-3.6-7-3.6T43 33Z" fill={HAIR} />
      <circle cx="46.8" cy="38.6" r="0.95" fill={INK} stroke="none" />
      <circle cx="53.2" cy="38.6" r="0.95" fill={INK} stroke="none" />
      <path d="M45.4 36.2q1.4-1 2.8 0M51.8 36.2q1.4-1 2.8 0" fill="none" strokeWidth="0.6" />
      <path d="M48 44q2 1.3 4 0" fill="none" stroke={RED} strokeWidth="1.2" />
      <circle cx="45.4" cy="41.6" r="1.4" fill="#eda199" stroke="none" />
      <circle cx="54.6" cy="41.6" r="1.4" fill="#eda199" stroke="none" />
      {/* a hair-bun rose and a thin tiara */}
      <circle cx="50" cy="24.5" r="4" fill={HAIR} />
      <circle cx="54.5" cy="25" r="2.2" fill={RED} />
      <path d="M44 29.5q6-3 12 0" fill="none" stroke={GOLD} strokeWidth="1.6" />
      <circle cx="50" cy="28" r="1" fill="#f3ead2" />
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
      <rect x="17" y="20" width="66" height="100" rx="2" fill="#efe2c2" stroke={red ? RED : INK} strokeWidth="1" />
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

/** The ace: a big curved drinking horn (ყანწი), silver-banded, with the suit on its medallion. */
function Ace({ suit }) {
  return (
    <g stroke={INK} strokeWidth="1.1" strokeLinejoin="round">
      <path d="M30 104C14 80 30 50 70 36L78 48C48 58 36 80 36 104Z" fill={GOLD} />
      <path d="M33 102C26 82 38 60 66 46" fill="none" stroke="#f6d88a" strokeWidth="2.2" opacity="0.7" />
      <path d="M70 36l8 12" stroke="#e9e2cf" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 104l6 0" stroke="#e9e2cf" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M26 80l9 3M44 58l7 7" stroke="#e9e2cf" strokeWidth="2.4" />
      <path d="M33 104Q20 90 30 76T56 50" fill="none" stroke="#9aa3b2" strokeWidth="1" strokeDasharray="1.6 1.4" />
      <circle cx="47" cy="74" r="9.5" fill="#f8f0dc" />
      <Suit suit={suit} x={41.5} y={68.5} s={11} />
    </g>
  );
}

/** The joker: a kinto, the cheeky Tbilisi street trader: cap, moustache, sash, handkerchief. */
function JokerArt({ gid }) {
  return (
    <g stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
      <defs>
        <linearGradient id={gid} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f6dfa0" />
          <stop offset="0.55" stopColor="#efc4a8" />
          <stop offset="1" stopColor="#c9d9b0" />
        </linearGradient>
      </defs>
      <rect x="17" y="20" width="66" height="100" rx="3" fill={`url(#${gid})`} strokeWidth="0.8" />
      {/* handkerchief waved high */}
      <path d="M72 30l10-6 2 12-8 4Z" fill="#fbf4e6" />
      <circle cx="77" cy="30" r="1" fill={RED} stroke="none" />
      <circle cx="80" cy="34" r="1" fill={RED} stroke="none" />
      <path d="M71 34q-4 12-9 20" fill="none" stroke="#2a1d14" strokeWidth="4" strokeLinecap="round" />
      {/* black arkhaluk with a red sash */}
      <path d="M24 120q2-26 26-30 24 4 26 30Z" fill="#2a1d14" />
      <path d="M31 106q19 6 38 0l1 6q-20 6-40 0Z" fill={RED} />
      <path d="M50 90v16" stroke="#e9e2cf" strokeWidth="1" strokeDasharray="1.5 2" />
      {/* face */}
      <ellipse cx="50" cy="72" rx="12.5" ry="13.5" fill={SKIN} />
      <path d="M43 68.5q2.5-1.8 5 0M52 68.5q2.5-1.8 5 0" fill="none" strokeWidth="0.9" />
      <path d="M44 71q1.5-1.2 3 0M53 71q1.5-1.2 3 0" fill="none" strokeWidth="1.3" />
      <circle cx="41.5" cy="76" r="2" fill="#e39a8a" stroke="none" />
      <circle cx="58.5" cy="76" r="2" fill="#e39a8a" stroke="none" />
      <path d="M50 76q-7-2-11 3 4-1 6 .8Q48 78 50 78t5 1.8q2-1.8 6-.8-4-5-11-3Z" fill={HAIR} />
      <path d="M45 81q5 4 10 0" fill="none" strokeWidth="1" />
      {/* kinto cap */}
      <path d="M36 62q1-12 14-12t14 12Z" fill="#2a1d14" />
      <path d="M34 62h32l-3 3H37Z" fill="#3b2a1d" />
      <path d="M40 57q10-3 20 0" fill="none" stroke="#6b4b31" strokeWidth="0.8" />
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
    const color = special === "D" ? "#ffd166" : RED;
    const word = special === "D" ? "ეშმაკი" : "ჯოკერი";
    return (
      <g>
        {[...word].map((ch, i) => (
          <text key={i} x="9" y={15 + i * 9} textAnchor="middle" fontFamily={SIGN_FONT} fontWeight="900" fontSize="8.5" fill={color} stroke={special === "D" ? INK : "none"} strokeWidth="0.4">{ch}</text>
        ))}
      </g>
    );
  }
  return (
    <g>
      <text x="9.5" y="17" textAnchor="middle" fontFamily={SIGN_FONT} fontWeight="900" fontSize="14" fill={red ? RED : INK}>{INDEX[rank] || rank}</text>
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

const BACK_BADGE = { red: "🍷", blue: "🍷", money: "💲", rainbow: "🌈", leopard: "🐆", georgia: "✚", gold: "👑", galaxy: "🪐" };

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
