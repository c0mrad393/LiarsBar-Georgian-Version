// The five bar patrons, drawn as SVG heads with soft 3D shading and real
// facial expressions. Every face shares one geometry (face centre 50,51,
// eyes on y≈42, mouth ≈64–72 in a 100×100 box), the same spots a plain smiley
// emoji has, so every hat, pair of glasses and moustache in the shop fits.
import { useId } from "react";
import { HEAD_INFO } from "../shop.js";

const INK = "#2b1d14";
const sw = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" };
const MOUTH_IN = "#7a2230";

/** Expression for each character mood. */
const FACE_OF = {
  idle: ["open", "smile"],
  turn: ["look", "hmm"],
  nervous: ["wide", "wavy", "worried"],
  happy: ["happy", "grin"],
  win: ["happy", "grin"],
  sad: ["sad", "frown", "worried"],
  talk: ["open", "talk"],
  dead: ["x", "tongue"],
  busted: ["wide", "o", "worried"],
  tipsy: ["dizzy", "grin"],
  brace: ["squeeze", "grit", "worried"], // trigger pulled: eyes shut tight
};

function Eyes({ kind, y, blink }) {
  const xs = [37, 63];
  if (kind === "happy")
    return <g fill="none" {...sw} strokeWidth="3.6">{xs.map((x) => <path key={x} d={`M${x - 7} ${y + 2}Q${x} ${y - 7} ${x + 7} ${y + 2}`} />)}</g>;
  if (kind === "squeeze")
    return <g fill="none" {...sw} strokeWidth="3.4">{xs.map((x, i) => <path key={x} d={i ? `M${x + 7} ${y - 5}L${x - 5} ${y}L${x + 7} ${y + 5}` : `M${x - 7} ${y - 5}L${x + 5} ${y}L${x - 7} ${y + 5}`} />)}</g>;
  if (kind === "x")
    return <g {...sw} strokeWidth="3.4">{xs.map((x) => <path key={x} d={`M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10`} />)}</g>;
  if (kind === "dizzy")
    return <g fill="none" {...sw} strokeWidth="2.4">{xs.map((x) => <path key={x} className="hd-spin" d={`M${x} ${y}m0-1.5a1.5 1.5 0 1 1-1.5 1.5a3.5 3.5 0 1 1 3.5 3.5a5.5 5.5 0 1 1-5.5-5.5`} />)}</g>;
  const wide = kind === "wide";
  const [px, py] = kind === "look" ? [2.4, -3] : kind === "sad" ? [0, 2.2] : [0, 0.8];
  const pr = wide ? 2.8 : 4.3;
  return (
    <g className={blink ? "hd-blink" : ""} style={blink ? { animationDelay: blink } : undefined}>
      {xs.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx={wide ? 9 : 7.6} ry={wide ? 10 : 8.6} fill="#fff" {...sw} strokeWidth="2.6" />
          <circle cx={x + px} cy={y + py} r={pr} fill={INK} />
          <circle cx={x + px - 1.4} cy={y + py - 1.6} r={wide ? 1 : 1.5} fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Brows({ kind, y }) {
  if (kind !== "worried") return null; // inner ends raised
  return <path d={`M29 ${y - 11}L44 ${y - 16}M56 ${y - 16}L71 ${y - 11}`} fill="none" {...sw} strokeWidth="3" />;
}

function Mouth({ kind, y }) {
  switch (kind) {
    case "grin":
    case "talk":
      return (
        <g className={kind === "talk" ? "hd-talk" : ""}>
          <path d={`M39 ${y}Q50 ${y + 17} 61 ${y}Z`} fill={MOUTH_IN} {...sw} strokeWidth="2.6" />
          <path d={`M44 ${y + 8}Q50 ${y + 4} 56 ${y + 8}Q50 ${y + 13} 44 ${y + 8}Z`} fill="#ff7a8a" />
          <path d={`M41 ${y + 1}H59`} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "grit":
      return (
        <g>
          <rect x="40" y={y - 1} width="20" height="9" rx="3" fill="#fff" {...sw} strokeWidth="2.4" />
          <path d={`M45 ${y - 1}v9M50 ${y - 1}v9M55 ${y - 1}v9M40 ${y + 3.5}h20`} stroke={INK} strokeWidth="1.4" />
        </g>
      );
    case "o":
      return <ellipse cx="50" cy={y + 3} rx="4.2" ry="5.4" fill={MOUTH_IN} {...sw} strokeWidth="2.4" />;
    case "frown":
      return <path d={`M42 ${y + 6}Q50 ${y - 1} 58 ${y + 6}`} fill="none" {...sw} />;
    case "wavy":
      return <path d={`M39 ${y + 3}q2.75-3.5 5.5 0t5.5 0t5.5 0t5.5 0`} fill="none" {...sw} strokeWidth="2.6" />;
    case "hmm":
      return <path d={`M44 ${y + 3}L57 ${y + 1}`} fill="none" {...sw} />;
    case "tongue":
      return (
        <g>
          <path d={`M42 ${y + 1}Q50 ${y + 6} 58 ${y + 1}`} fill="none" {...sw} />
          <path d={`M49 ${y + 3}v6a4 4 0 0 0 8 0v-7`} fill="#ff7a8a" {...sw} strokeWidth="2.2" />
        </g>
      );
    default:
      return <path d={`M42 ${y}Q50 ${y + 7} 58 ${y}`} fill="none" {...sw} />;
  }
}

/** Radial fill that makes a flat shape read as a ball lit from the top left. */
function Ball({ id, c }) {
  return (
    <radialGradient id={id} cx="0.36" cy="0.3" r="0.78">
      <stop offset="0" stopColor={c.light} />
      <stop offset="0.55" stopColor={c.fur} />
      <stop offset="1" stopColor={c.dark} />
    </radialGradient>
  );
}

const FACE_PATH = "M11 51a39 39 0 1 0 78 0a39 39 0 1 0-78 0Z";
const KHINKALI_PATH = "M11 58C11 34 30 20 44 11L50 4L56 11C70 20 89 34 89 58C89 81 72 92 50 92C28 92 11 81 11 58Z";

/** Everything behind the face: ears, horns, the dumpling's pleats. */
function Back({ kind, f, dark, uid }) {
  switch (kind) {
    case "pig":
      return (
        <g>
          <path d="M26 24 14 -2 44 14Z" fill={f} {...sw} />
          <path d="M74 24 86 -2 56 14Z" fill={f} {...sw} />
          <path d="M26 18 19 4 36 13Z M74 18 81 4 64 13Z" fill="#ff8fb0" />
        </g>
      );
    case "fox":
      return (
        <g>
          <path d="M20 32 14 -6 46 16Z" fill={f} {...sw} />
          <path d="M80 32 86 -6 54 16Z" fill={f} {...sw} />
          <path d="M22 22 18 2 38 16Z M78 22 82 2 62 16Z" fill="#fff1dc" />
          <path d="M14 -6 18 7 24 1Z M86 -6 82 7 76 1Z" fill={INK} />
        </g>
      );
    case "bear":
      return (
        <g>
          <circle cx="21" cy="20" r="13" fill={f} {...sw} />
          <circle cx="79" cy="20" r="13" fill={f} {...sw} />
          <circle cx="21" cy="21" r="6.5" fill="#e8b98a" />
          <circle cx="79" cy="21" r="6.5" fill="#e8b98a" />
        </g>
      );
    case "tur": {
      // Caucasian tur: heavy ridged horns sweeping back and out.
      const horn = (m) => (
        <g transform={m ? "translate(100 0) scale(-1 1)" : undefined}>
          <path d="M38 18C33 -2 18 -14 2 -6C12 -6 22 2 27 22Z" fill={`url(#h${uid})`} {...sw} />
          <path d="M31 8q-4 2-7 7M25 1q-5 1-8 6M18 -4q-5 0-8 4" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
        </g>
      );
      return (
        <g>
          <defs>
            <linearGradient id={`h${uid}`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#f3e3c3" /><stop offset="1" stopColor="#b69a6c" />
            </linearGradient>
          </defs>
          {horn(false)}{horn(true)}
          <ellipse cx="11" cy="44" rx="11" ry="5.5" transform="rotate(-18 11 44)" fill={f} {...sw} />
          <ellipse cx="89" cy="44" rx="11" ry="5.5" transform="rotate(18 89 44)" fill={f} {...sw} />
        </g>
      );
    }
    case "khinkali":
      // the twisted top knot (კუდი)
      return (
        <g>
          <path d="M42 10Q41 -1 50 -4Q59 -1 58 10Z" fill={f} {...sw} />
          <path d="M45 6Q49 1 55 2M44 2Q49 -3 54 -2" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

/** Markings and noses drawn on the face, under the eyes. Returns the mouth line for this face. */
function Front({ kind, nose }) {
  switch (kind) {
    case "pig":
      return (
        <g>
          <ellipse cx="50" cy="61" rx="13.5" ry="9.5" fill="#ff8fb0" {...sw} />
          <ellipse cx="45" cy="61" rx="2.4" ry="3.6" fill="#b3465f" />
          <ellipse cx="55" cy="61" rx="2.4" ry="3.6" fill="#b3465f" />
          <ellipse cx="46" cy="56" rx="5" ry="1.8" fill="#fff" opacity="0.5" />
          {nose}
        </g>
      );
    case "fox":
      return (
        <g>
          <path d="M13 56C24 54 36 60 50 70C64 60 76 54 87 56C84 76 68 89 50 89C32 89 16 76 13 56Z" fill="#fff1dc" />
          <ellipse cx="50" cy="61" rx="5.5" ry="4" fill={INK} />
          <ellipse cx="48.5" cy="59.8" rx="1.8" ry="1" fill="#fff" opacity="0.7" />
          {nose}
        </g>
      );
    case "bear":
      return (
        <g>
          <ellipse cx="50" cy="64" rx="16.5" ry="12.5" fill="#e8c49a" {...sw} strokeWidth="2.4" />
          <path d="M43 57Q50 53 57 57Q55 63 50 63Q45 63 43 57Z" fill={INK} />
          <ellipse cx="48" cy="57" rx="2.4" ry="1.1" fill="#fff" opacity="0.6" />
          {nose}
        </g>
      );
    case "tur":
      return (
        <g>
          <ellipse cx="50" cy="68" rx="17" ry="14" fill="#e5cda6" {...sw} strokeWidth="2.4" />
          <path d="M44 93Q50 106 56 93" fill="#7a5433" {...sw} strokeWidth="2.4" />
          <ellipse cx="45" cy="64" rx="2.2" ry="1.6" fill={INK} />
          <ellipse cx="55" cy="64" rx="2.2" ry="1.6" fill={INK} />
          {nose}
        </g>
      );
    case "khinkali":
      return (
        <g>
          <g fill="none" stroke="#a8844a" strokeWidth="2.6" strokeLinecap="round">
            <path d="M50 9Q28 18 14 48M50 9Q33 21 22 38M50 9Q40 22 33 32M50 9Q46 20 43 28M50 9Q54 20 57 28M50 9Q60 22 67 32M50 9Q67 21 78 38M50 9Q72 18 86 48" />
          </g>
          <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.55">
            <path d="M48 12Q34 21 25 36M48 12Q42 22 37 30M52 12Q58 22 63 30" />
          </g>
          {nose}
        </g>
      );
    default:
      return nose;
  }
}

const MOUTH_Y = { pig: 73, fox: 70, bear: 68, tur: 72, khinkali: 64 };

/**
 * One head. `state` picks the expression; `blush` (0–1) reddens the cheeks
 * (wine!); `busted` grows a Pinocchio nose; `still` turns off idle animation
 * for small copies in lists.
 */
export function Head({ id, state = "idle", blush = 0, still = false, blinkDelay }) {
  const uid = useId().replace(/:/g, "");
  const info = HEAD_INFO[id] || HEAD_INFO.av_khinkali;
  const c = info.colors;
  const kind = info.kind;
  const [eyes, mouth, brows] = FACE_OF[state] || FACE_OF.idle;
  const busted = state === "busted";
  const cheeks = Math.min(0.95, Math.max(state === "tipsy" ? 0.8 : 0, blush) + (kind === "pig" || kind === "khinkali" ? 0.3 : 0.18));
  const fill = `url(#f${uid})`;
  const eyeY = kind === "khinkali" ? 46 : 42;
  const nose = busted ? (
    <g className="hd-nose">
      <path d={`M52 ${MOUTH_Y[kind] - 12}L97 ${MOUTH_Y[kind] - 16}Q100 ${MOUTH_Y[kind] - 12} 97 ${MOUTH_Y[kind] - 8}Z`} fill={kind === "pig" ? "#ff8fb0" : c.fur} {...sw} strokeWidth="2.4" />
    </g>
  ) : null;
  return (
    <svg viewBox="0 0 100 100" className={`h-full w-full overflow-visible ${state === "dead" ? "hd-dead" : ""}`} aria-hidden="true">
      <defs><Ball id={`f${uid}`} c={c} /></defs>
      <Back kind={kind} f={fill} dark={c.dark} uid={uid} />
      <path d={kind === "khinkali" ? KHINKALI_PATH : FACE_PATH} fill={fill} {...sw} />
      <ellipse cx="34" cy={kind === "khinkali" ? 32 : 25} rx="11" ry="6" transform={`rotate(-24 34 ${kind === "khinkali" ? 32 : 25})`} fill="#fff" opacity="0.4" />
      <ellipse cx="25" cy={eyeY + 17} rx="7.5" ry="4.8" fill="#ff5a7a" opacity={cheeks} />
      <ellipse cx="75" cy={eyeY + 17} rx="7.5" ry="4.8" fill="#ff5a7a" opacity={cheeks} />
      <Front kind={kind} nose={nose} />
      <Eyes kind={eyes} y={eyeY} blink={still || eyes !== "open" ? null : blinkDelay || "0s"} />
      <Brows kind={brows} y={eyeY} />
      <Mouth kind={mouth} y={MOUTH_Y[kind]} />
      {kind === "khinkali" && !still && state !== "dead" && (
        <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85">
          <path className="hd-steam" d="M44 -4q-4-6 0-12t0-12" />
          <path className="hd-steam" style={{ animationDelay: "0.9s" }} d="M56 -4q4-6 0-12t0-12" />
        </g>
      )}
    </svg>
  );
}

/** A small head for lists, chips and banners. */
export function Face({ id, size = 24, state = "idle", className = "" }) {
  return (
    <span className={`inline-block shrink-0 align-middle ${className}`} style={{ width: size, height: size, padding: size * 0.08 }}>
      <Head id={id} state={state} still />
    </span>
  );
}
