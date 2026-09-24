// Used by both the browser and the Cloudflare room server.
import { MAX_SEATS, MODES, PERSONAS } from "./engine.js";
import { AVATARS, EMOTES } from "./i18n.js";

export { MAX_SEATS, MODES, EMOTES };

export const ONLINE_OPTS = { turnMs: 30000, pullMs: 15000 };
export const GUEST_ACTIONS = new Set(["play", "call", "pull"]);
export const CODE_RE = /^[a-z0-9]{4,12}$/;
const BOT_ORDER = ["pig", "fox", "bull", "cat"];

export const cleanName = (n, fallback = "სტუმარი") => String(n || "").replace(/\s+/g, " ").trim().slice(0, 16) || fallback;
export const cleanAvatar = (a) => (AVATARS.includes(a) ? a : AVATARS[0]);
export const cleanCode = (c) => (c || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);

export const bots = (n) =>
  BOT_ORDER.slice(0, Math.max(0, n)).map((k) => ({ name: PERSONAS[k].name, avatar: PERSONAS[k].avatar, kind: "bot", persona: k }));
