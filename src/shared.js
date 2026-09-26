// Used by both the browser and the Cloudflare room server.
import { MAX_SEATS, MODES, PERSONAS } from "./engine.js";
import { EMOTES, END_EMOTES, PHRASES } from "./i18n.js";
import { FREE_THROWS, headOf } from "./shop.js";

export { MAX_SEATS, MODES, EMOTES, END_EMOTES, PHRASES };

export const ONLINE_OPTS = { turnMs: 30000, pullMs: 15000 };
export const GUEST_ACTIONS = new Set(["play", "bid", "call", "pull"]);
export const CODE_RE = /^[a-z0-9]{4,12}$/;
/** Account keys: 20 chars of an unambiguous alphabet (~100 bits), shown as XXXX-XXXX-…. */
export const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const KEY_RE = /^[A-HJ-NP-Z2-9]{20}$/;
export const normKey = (k) => String(k || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
export const fmtKey = (k) => normKey(k).match(/.{1,4}/g)?.join("-") || "";
export const BOT_ORDER = ["pig", "fox", "bull", "cat", "bear"];
export const THROWABLES = FREE_THROWS; // everyone has these; more in the shop
export const FX_GAP = 1200; // ms between throws / chat lines per player

export const cleanName = (n, fallback = "სტუმარი") => String(n || "").replace(/\s+/g, " ").trim().slice(0, 16) || fallback;
/** A head we can draw (ownership of premium heads is checked by the ledger / room). */
export const cleanAvatar = headOf;
export const cleanCode = (c) => (c || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);

/** Each bot's signature accessories. */
export const BOT_LOOKS = {
  pig: { hat: "hat_duck", neck: "n_redbow", hand: "h_drumstick" },
  fox: { eyes: "eye_sun", outfit: "o_hawaii", hand: "h_wine" },
  bull: { hat: "hat_top", mouth: "m_curly", outfit: "o_tux" },
  cat: { hat: "hat_bow", pet: "p_mouse", aura: "a_hearts" },
  bear: { hat: "hat_grad", eyes: "eye_glasses", hand: "h_beer", outfit: "o_pajama" },
};

/** Each bot's title (an achievement id, like a player's). */
export const BOT_TITLES = { pig: "hunter", fox: "poker", bull: "bulletproof", cat: "sommelier", bear: "king" };

export const bots = (n) =>
  BOT_ORDER.slice(0, Math.max(0, n)).map((k) => ({ name: PERSONAS[k].name, avatar: PERSONAS[k].avatar, kind: "bot", persona: k, looks: BOT_LOOKS[k], title: BOT_TITLES[k] }));

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
  if (ev.type === "win") {
    // Game over: every bot, out or not, shares how it went.
    for (const x of game.seats.filter((p) => p.kind === "bot")) {
      const e = x.idx === ev.seat ? pick(["😎", "🥳", "🔥"]) : pick(["😭", "🤬", "🤯", "👏", "💀", "🤝"]);
      out.push({ delay: 900 + Math.random() * 1600, fx: { kind: "emote", seat: x.idx, e } });
    }
  }
  return out;
}

/** After the game a player's reaction often gets one back from a bot. */
export function botEmoteBack(game, fx) {
  const b = game.seats.filter((p) => p.kind === "bot" && p.idx !== fx.seat);
  if (game.phase !== "gameover" || !b.length || Math.random() > 0.6) return [];
  const answer = { "😂": ["😂", "🤬"], "😭": ["😂", "🤝"], "🤬": ["😂", "😎"], "😎": ["🤬", "👏"], "🥳": ["👏", "😭"], "👏": ["🤝", "😎"], "💀": ["😂", "💀"] };
  return [{ delay: 700 + Math.random() * 700, fx: { kind: "emote", seat: pick(b).idx, e: pick(answer[fx.e] || END_EMOTES) } }];
}

/** A bot that gets hit usually answers in kind. */
export function botThrowBack(game, fx) {
  const t = game.seats[fx.to];
  if (!t || t.kind !== "bot" || !t.alive || Math.random() > 0.55) return [];
  return [{ delay: 900 + Math.random() * 600, fx: { kind: "throw", from: fx.to, to: fx.from, item: fx.item === "💐" ? "💐" : pick(["🍅", "🥚"]) } }];
}
