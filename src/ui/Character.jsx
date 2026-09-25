// An animated bar patron: the player's emoji as the head on a little body
// with gloved hands, reacting to the game (thinking, trembling, jumping,
// sulking, dancing, getting hit) and wearing shop gear (`looks`).
import { FACE_FIT, ITEMS } from "../shop.js";
import { AURAS, Body, FACE, HATS, HAT_BOX, NECK, WINGS, WINGS_BOX } from "./gear.jsx";

export const SEAT_COLORS = ["#ff5a5f", "#3a86ff", "#2ec4b6", "#9b5de5", "#ffb020", "#ff7b39"];
export const seatColor = (i) => SEAT_COLORS[i % SEAT_COLORS.length];

/** Where face gear sits on the head (fractions of the head size). */
const FACE_SLOT = {
  hat: { top: -0.46, size: 0.62, rot: -10 },
  eyes: { top: 0.14, size: 0.5, rot: 0 },
  mouth: { top: 0.5, size: 0.36, rot: 0 },
};

/** Look up an equipped id; plain emoji (older saves) still work. */
const gear = (v) => (v ? ITEMS[v] || { e: v } : null);

/** An emoji item: outer span places it, inner span animates it. */
function EmojiGear({ item, top, size, rot, dx = 0 }) {
  if (item.anim === "bobble" && dx) {
    return (
      <span className="chr-acc" style={{ top, fontSize: size, transform: `translateX(calc(-50% + ${dx}px))` }}>
        <span className="anim-bobble inline-block" style={{ transformOrigin: "50% 100%" }}>{item.e}</span>
      </span>
    );
  }
  const bobble = item.anim === "bobble";
  return (
    <span className={`chr-acc ${bobble ? "anim-bobble" : ""}`} style={{ top, fontSize: size, transform: bobble ? undefined : `translateX(calc(-50% + ${dx}px)) rotate(${rot}deg)` }}>
      <span className={`inline-block ${item.anim && !bobble ? `anim-${item.anim}` : ""}`}>{item.e}</span>
    </span>
  );
}

/**
 * Face gear, fitted to where this head's face actually is (FACE_FIT).
 * Hats scale with the face and sit on top of it; eyes and mouth move and shrink with it.
 */
function FaceGear({ slot, item, head, fit }) {
  const p = FACE_SLOT[slot];
  const fx = fit.x || 0, fy = fit.y || 0, fs = fit.s || 1;
  // The top of the face moves by the centre shift plus what the smaller face frees up.
  const hs = Math.max(fs, 0.55);
  const lift = fy + 0.36 * (1 - fs);
  if (slot === "hat") {
    if (item.svg && HATS[item.svg]) {
      const [top, w] = HAT_BOX[item.svg] || [-0.6, 0.9];
      const Draw = HATS[item.svg];
      const hgt = head * w * hs * 0.72;
      return (
        <svg viewBox="0 0 100 72" className="pointer-events-none absolute left-1/2 overflow-visible" aria-hidden="true"
          style={{ top: head * (top + lift) + (head * w * 0.72 - hgt) * 0.8, width: head * w * hs, transform: `translateX(calc(-50% + ${fx * head}px))` }}>
          <Draw />
        </svg>
      );
    }
    const size = head * (item.s ?? p.size);
    return <EmojiGear item={item} top={head * ((item.dy ?? p.top) + lift) + size * (1 - hs) * 0.9} size={size * hs} rot={item.rot ?? p.rot} dx={((item.dx || 0) + fx) * head} />;
  }
  if (item.svg && FACE[item.svg]) {
    const Draw = FACE[item.svg];
    const cy = slot === "eyes" ? 40 : 62;
    return (
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <g transform={`translate(${50 + fx * 100} ${cy + fy * 100}) scale(${fs}) translate(-50 ${-cy})`}><Draw /></g>
      </svg>
    );
  }
  const size = head * (item.s ?? p.size) * fs;
  const cy = (item.dy ?? p.top) * head + (head * (item.s ?? p.size)) / 2; // centre of the item on a plain face
  const top = 0.4 * head + (cy - 0.4 * head) * fs + fy * head - size / 2;
  return <EmojiGear item={item} top={top} size={size} rot={item.rot ?? p.rot} dx={((item.dx || 0) * fs + fx) * head} />;
}

const SPLAT = {
  "🍅": { c: "#e8352e", seeds: true },
  "🥚": { c: "#fffdf2", yolk: true },
  "🥧": { c: "#fff3d6", rim: "#c98a3c" },
  "💩": { c: "#7a4a1e", extra: "🪰" },
  "💦": { c: "#6ec6ff" },
  "🐟": { c: "#6ec6ff", extra: "🐟" },
  "🧦": { c: "#b6e36b", extra: "💨" },
  "🌶️": { c: "#ff4d2e", extra: "🔥" },
  "🧻": { c: "#ffffff", tp: true },
};

function Splat({ item, size, delay }) {
  if (item === "💐") {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className="a-heart absolute left-1/2 top-1/3" style={{ fontSize: size * 0.28, "--hx": `${(i - 2) * 14}px`, animationDelay: `${delay + i * 90}ms` }}>❤️</span>
    ));
  }
  const k = SPLAT[item] || SPLAT["🍅"];
  return (
    <>
      <svg viewBox="0 0 100 100" className="a-splat absolute left-1/2 top-1/2" style={{ width: size * 1.05, animationDelay: `${delay}ms` }} aria-hidden="true">
        {k.tp ? (
          <g fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round">
            <path d="M10 30q40-20 80 10M6 58q44 16 88-8M20 84q30-14 64 6" stroke="#2b1d14" strokeWidth="12" />
            <path d="M10 30q40-20 80 10M6 58q44 16 88-8M20 84q30-14 64 6" />
          </g>
        ) : (
          <>
            <path fill={k.c} stroke={k.rim || "#2b1d14"} strokeWidth={k.rim ? 6 : 2.5} strokeLinejoin="round"
              d="M50 14c8 0 9 12 16 12s14-9 19-2-6 13-2 19 16 5 15 13-14 5-17 11 4 16-3 20-12-6-18-4-9 15-17 13-4-13-10-16-17 3-19-5 11-11 9-17-13-10-9-17 13-2 17-8S42 14 50 14Z" />
            {k.yolk && <circle cx="52" cy="52" r="15" fill="#ffc83d" stroke="#2b1d14" strokeWidth="2" />}
            {k.seeds && (
              <g fill="#fff3c4">
                <ellipse cx="40" cy="45" rx="3" ry="4.5" /><ellipse cx="58" cy="40" rx="3" ry="4.5" />
                <ellipse cx="55" cy="60" rx="3" ry="4.5" /><ellipse cx="38" cy="62" rx="3" ry="4.5" />
              </g>
            )}
            <path fill={k.c} stroke="#2b1d14" strokeWidth="2" d="M30 80q2 14 4 0M62 84q2 12 4 0" />
          </>
        )}
      </svg>
      {k.extra && [0, 1, 2].map((i) => (
        <span key={i} className="gear-orbit absolute left-1/2 top-[40%] pointer-events-none" style={{ "--r": `${size * 0.45}px`, animationDuration: `${1.2 + i * 0.3}s`, animationDelay: `${delay + i * 150}ms`, fontSize: size * 0.24 }}>{k.extra}</span>
      ))}
    </>
  );
}

/**
 * @param state idle | turn | nervous | happy | sad | win | talk | dead
 * @param looks { hat, eyes, mouth, neck, hand, pet, aura, outfit, wings } item ids
 * @param hit   item that just hit this player (🍅 🥚 💐 …), with `hitKey` to replay
 * @param point angle in degrees towards a player being accused, or null
 */
export default function Character({ avatar, color = SEAT_COLORS[0], size = 56, state = "idle", looks, hit, hitKey, hitDelay = 0, point = null }) {
  const S = size;
  const head = S * 0.8;
  const dead = state === "dead";
  const left = point != null && Math.cos((point * Math.PI) / 180) < 0;
  const L = looks || {};
  const fit = FACE_FIT[avatar] || {};
  const hat = gear(L.hat), eyes = gear(L.eyes), mouth = gear(L.mouth), neck = gear(L.neck);
  const hand = gear(L.hand), pet = gear(L.pet), aura = gear(L.aura), outfit = gear(L.outfit), wings = gear(L.wings);
  const Wings = wings?.svg && WINGS[wings.svg];
  const Neck = neck?.svg && NECK[neck.svg];
  // Blink at a different moment for each character.
  const blinkDelay = `${((avatar?.codePointAt(0) || 0) % 40) / 10}s`;

  return (
    <div className={`chr chr-${state} ${hit ? "chr-hit" : ""} ${point != null ? "chr-point" : ""} ${L.wings === "w_jet" && !dead ? "gear-bob" : ""}`} style={{ width: S, height: S * 1.22 }}>
      <span className="absolute bottom-[-4%] left-1/2 h-[10%] w-[80%] -translate-x-1/2 rounded-[50%] bg-ink/20 blur-[2px]" aria-hidden="true" />
      {Wings && !dead && (
        <svg viewBox="0 0 100 70" className="pointer-events-none absolute overflow-visible" style={{ left: S * (WINGS_BOX[wings.svg]?.[0] ?? -0.3), top: S * (WINGS_BOX[wings.svg]?.[1] ?? 0.4), width: S * (WINGS_BOX[wings.svg]?.[2] ?? 1.6) }} aria-hidden="true">
          <Wings />
        </svg>
      )}
      <svg className="chr-body" viewBox="0 0 100 62" style={{ width: S, height: S * 0.62 }} aria-hidden="true">
        <Body outfit={dead ? null : outfit?.svg ? L.outfit : null} color={color} noTie={!!Neck && !dead} />
      </svg>
      {Neck && !dead && (
        <svg viewBox="0 0 100 40" className="pointer-events-none absolute left-0" style={{ top: S * 0.6, width: S, height: S * 0.4 }} aria-hidden="true">
          <Neck color={neck.color} />
        </svg>
      )}
      {!dead && (
        <>
          <span className="chr-hand chr-hand-l" style={{ width: S * 0.2, height: S * 0.2 }} />
          <span className="chr-hand chr-hand-r" style={{ width: S * 0.2, height: S * 0.2 }}>
            {hand && (
              <span className={`absolute ${hand.anim === "float" ? "" : ""}`} style={{ left: "10%", bottom: hand.dy ? `${-hand.dy * 100}%` : "30%", fontSize: S * (hand.s ?? 0.34), lineHeight: 1 }}>
                <span className={`inline-block ${hand.anim ? `anim-${hand.anim}` : ""}`}>{hand.e}</span>
              </span>
            )}
          </span>
        </>
      )}
      {pet && !dead && (
        <span className={`pointer-events-none absolute ${pet.anim === "orbit" ? "" : "gear-bob"}`} style={{ left: pet.anim === "orbit" ? "50%" : -S * 0.08, top: pet.anim === "orbit" ? S * 0.3 : S * 0.44, fontSize: S * 0.3, lineHeight: 1 }}>
          <span className={`inline-block ${pet.anim === "orbit" ? "anim-orbit" : ""}`} style={pet.anim === "orbit" ? { "--r": `${S * 0.55}px` } : { transform: "scaleX(-1)" }}>{pet.e}</span>
        </span>
      )}
      <div className="chr-head" style={{ width: head, height: head }}>
        <div key={hitKey} className="chr-head-in h-full w-full">
          <span className="chr-face" style={{ fontSize: head * 0.82 }}>
            <span className="chr-face-in" style={{ animationDelay: blinkDelay }}>{dead ? "👻" : avatar}</span>
          </span>
          {!dead && mouth && <FaceGear slot="mouth" item={mouth} head={head} fit={fit} />}
          {!dead && eyes && <FaceGear slot="eyes" item={eyes} head={head} fit={fit} />}
          {!dead && hat && <FaceGear slot="hat" item={hat} head={head} fit={fit} />}
          {state === "nervous" && (
            <>
              <span className="a-sweat absolute -right-1 top-0" style={{ fontSize: head * 0.3, "--dx": "8px" }}>💦</span>
              <span className="a-sweat absolute -left-1 top-1" style={{ fontSize: head * 0.24, "--dx": "-8px", animationDelay: "0.45s" }}>💧</span>
            </>
          )}
          {state === "sad" && <span className="absolute -right-1 top-1/3 animate-bounce" style={{ fontSize: head * 0.26 }}>💧</span>}
          {hit && <Splat item={hit} size={head} delay={hitDelay} />}
        </div>
      </div>
      {aura?.svg && AURAS[aura.svg] && !dead && (
        <div className="pointer-events-none absolute -inset-[18%]" aria-hidden="true">{AURAS[aura.svg](S)}</div>
      )}
      {point != null && !dead && (
        <span className="chr-pointer" style={{ "--a": `${left ? point - 180 : point}deg`, "--d": `${left ? -S * 0.55 : S * 0.55}px`, fontSize: S * 0.42 }}>{left ? "👈" : "👉"}</span>
      )}
    </div>
  );
}
