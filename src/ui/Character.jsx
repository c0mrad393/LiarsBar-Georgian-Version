// An animated bar patron: the player's emoji as the head on a little body
// with gloved hands, reacting to the game (thinking, trembling, jumping,
// sulking, dancing, getting hit) and wearing accessories (`looks`).

export const SEAT_COLORS = ["#ff5a5f", "#3a86ff", "#2ec4b6", "#9b5de5", "#ffb020", "#ff7b39"];
export const seatColor = (i) => SEAT_COLORS[i % SEAT_COLORS.length];

/** Where each accessory sits on the head, as fractions of the head size. */
const SLOTS = {
  hat: { top: -0.46, size: 0.62, rot: -10 },
  eyes: { top: 0.14, size: 0.5, rot: 0 },
  mouth: { top: 0.5, size: 0.36, rot: 0 },
};

function Splat({ item, size, delay }) {
  if (item === "💐") {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className="a-heart absolute left-1/2 top-1/3" style={{ fontSize: size * 0.28, "--hx": `${(i - 2) * 14}px`, animationDelay: `${delay + i * 90}ms` }}>❤️</span>
    ));
  }
  const egg = item === "🥚";
  const main = egg ? "#fffdf2" : "#e8352e";
  return (
    <svg viewBox="0 0 100 100" className="a-splat absolute left-1/2 top-1/2" style={{ width: size * 1.05, animationDelay: `${delay}ms` }} aria-hidden="true">
      <path fill={main} stroke="#2b1d14" strokeWidth="2.5" strokeLinejoin="round"
        d="M50 14c8 0 9 12 16 12s14-9 19-2-6 13-2 19 16 5 15 13-14 5-17 11 4 16-3 20-12-6-18-4-9 15-17 13-4-13-10-16-17 3-19-5 11-11 9-17-13-10-9-17 13-2 17-8S42 14 50 14Z" />
      {egg ? (
        <circle cx="52" cy="52" r="15" fill="#ffc83d" stroke="#2b1d14" strokeWidth="2" />
      ) : (
        <g fill="#fff3c4">
          <ellipse cx="40" cy="45" rx="3" ry="4.5" />
          <ellipse cx="58" cy="40" rx="3" ry="4.5" />
          <ellipse cx="55" cy="60" rx="3" ry="4.5" />
          <ellipse cx="38" cy="62" rx="3" ry="4.5" />
        </g>
      )}
      <path fill={main} stroke="#2b1d14" strokeWidth="2" d="M30 80q2 14 4 0M62 84q2 12 4 0" />
    </svg>
  );
}

/**
 * @param state idle | turn | nervous | happy | sad | win | talk | dead
 * @param hit   item that just hit this player (🍅 🥚 💐), with `hitKey` to replay
 * @param point angle in degrees towards a player being accused, or null
 */
export default function Character({ avatar, color = SEAT_COLORS[0], size = 56, state = "idle", looks, hit, hitKey, hitDelay = 0, point = null }) {
  const head = size * 0.8;
  const dead = state === "dead";
  const left = point != null && Math.cos((point * Math.PI) / 180) < 0;
  return (
    <div className={`chr chr-${state} ${hit ? "chr-hit" : ""} ${point != null ? "chr-point" : ""}`} style={{ width: size, height: size * 1.22 }}>
      <svg className="chr-body" viewBox="0 0 100 62" style={{ width: size, height: size * 0.62 }} aria-hidden="true">
        <path d="M6 62Q8 16 50 12Q92 16 94 62Z" fill={color} stroke="#2b1d14" strokeWidth="4" strokeLinejoin="round" />
        <path d="M36 14 50 38 64 14Q50 10 36 14Z" fill="#fffdf8" stroke="#2b1d14" strokeWidth="3" strokeLinejoin="round" />
        <path d="M40 20 50 25 40 30ZM60 20 50 25 60 30Z" fill="#2b1d14" />
        <circle cx="50" cy="47" r="3" fill="#2b1d14" />
        <circle cx="50" cy="56" r="3" fill="#2b1d14" />
      </svg>
      {!dead && (
        <>
          <span className="chr-hand chr-hand-l" style={{ width: size * 0.2, height: size * 0.2 }} />
          <span className="chr-hand chr-hand-r" style={{ width: size * 0.2, height: size * 0.2 }} />
        </>
      )}
      <div className="chr-head" style={{ width: head, height: head }}>
        <div key={hitKey} className="chr-head-in h-full w-full">
          <span className="chr-face" style={{ fontSize: head * 0.82 }}>{dead ? "👻" : avatar}</span>
          {!dead && looks && Object.entries(SLOTS).map(([slot, p]) =>
            looks[slot] ? (
              <span key={slot} className="chr-acc" style={{ top: head * p.top, fontSize: head * p.size, transform: `translateX(-50%) rotate(${p.rot}deg)` }}>
                {looks[slot]}
              </span>
            ) : null,
          )}
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
      {point != null && !dead && (
        <span className="chr-pointer" style={{ "--a": `${left ? point - 180 : point}deg`, "--d": `${left ? -size * 0.55 : size * 0.55}px`, fontSize: size * 0.42 }}>{left ? "👈" : "👉"}</span>
      )}
    </div>
  );
}
