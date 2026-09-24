// Used by both the browser and the Cloudflare room server.
import { MAX_SEATS, MODES, PERSONAS } from "./engine.js";
import { AVATARS, EMOTES, PHRASES } from "./i18n.js";

export { MAX_SEATS, MODES, EMOTES, PHRASES };

export const ONLINE_OPTS = { turnMs: 30000, pullMs: 15000 };
export const GUEST_ACTIONS = new Set(["play", "call", "pull"]);
export const CODE_RE = /^[a-z0-9]{4,12}$/;
export const BOT_ORDER = ["pig", "fox", "bull", "cat", "bear"];
export const THROWABLES = ["🍅", "🥚", "💐"];
export const FX_GAP = 1200; // ms between throws / chat lines per player

export const cleanName = (n, fallback = "სტუმარი") => String(n || "").replace(/\s+/g, " ").trim().slice(0, 16) || fallback;
export const cleanAvatar = (a) => (AVATARS.includes(a) ? a : AVATARS[0]);
export const cleanCode = (c) => (c || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);

/** Each bot's signature accessories. */
export const BOT_LOOKS = {
  pig: { hat: "🧢" },
  fox: { eyes: "🕶️" },
  bull: { hat: "🎩" },
  cat: { hat: "🎀" },
  bear: { hat: "🎓", eyes: "👓" },
};

export const bots = (n) =>
  BOT_ORDER.slice(0, Math.max(0, n)).map((k) => ({ name: PERSONAS[k].name, avatar: PERSONAS[k].avatar, kind: "bot", persona: k, looks: BOT_LOOKS[k] }));

// ---------------------------------------------------------------- bot fun ---
// Bots throw tomatoes and react too. Runs wherever the engine runs (solo:
// browser, online: room server). Returns [{ delay, fx }] to emit later.

const pick = (a) => a[(Math.random() * a.length) | 0];
const liveBots = (game, not) => game.seats.filter((p) => p.kind === "bot" && p.alive && p.idx !== not);

export function botFx(game, ev) {
  const out = [];
  const b = liveBots(game, ev.seat);
  if (!b.length) return out;
  if (ev.type === "bluff" && Math.random() < 0.45) out.push({ delay: 1400, fx: { kind: "throw", from: pick(b).idx, to: ev.seat, item: "🍅" } });
  if (ev.type === "truth" && Math.random() < 0.3) out.push({ delay: 1200, fx: { kind: "emote", seat: pick(b).idx, e: "😱" } });
  if (ev.type === "safe" && Math.random() < 0.35) out.push({ delay: 900, fx: { kind: "emote", seat: pick(b).idx, e: pick(["😏", "👏", "🍺"]) } });
  if (ev.type === "dead" && Math.random() < 0.5) out.push({ delay: 1500, fx: { kind: "emote", seat: pick(b).idx, e: pick(["💀", "😂", "😱"]) } });
  if (ev.type === "win") for (const x of b) out.push({ delay: 600 + Math.random() * 900, fx: { kind: "emote", seat: x.idx, e: "👏" } });
  return out;
}

/** A bot that gets hit usually answers in kind. */
export function botThrowBack(game, fx) {
  const t = game.seats[fx.to];
  if (!t || t.kind !== "bot" || !t.alive || Math.random() > 0.55) return [];
  return [{ delay: 900 + Math.random() * 600, fx: { kind: "throw", from: fx.to, to: fx.from, item: fx.item === "💐" ? "💐" : pick(["🍅", "🥚"]) } }];
}
