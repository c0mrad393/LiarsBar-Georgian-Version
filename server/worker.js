// Cloudflare Worker + Durable Object: one `Room` object per table.
//
// The room runs the same pure engine as solo play (src/engine.js) and sends
// every player only their own view. Game state lives in memory while a game
// runs (pending engine timers keep the object awake); storage holds the lobby
// and a snapshot at the start of each round, so a restart loses at most the
// current round. Idle rooms hibernate (not billed) and are wiped after
// ROOM_TTL with nobody connected.
import { DurableObject } from "cloudflare:workers";
import { createGame, reduce, schedule, viewFor } from "../src/engine.js";
import { REWARD } from "./ledger.js";
import { ALL_THROWS, FREE_AVATARS, FREE_THROWS, ITEMS, owns } from "../src/shop.js";
import { CODE_RE, EMOTES, FX_GAP, KEY_RE, normKey, GUEST_ACTIONS, MAX_SEATS, MODES, ONLINE_OPTS, PHRASES, botFx, botThrowBack, bots, cleanAvatar, cleanName } from "../src/shared.js";

export { Ledger } from "./ledger.js";

const ROOM_TTL = 60 * 60 * 1000;
const EMOTE_GAP = 500;
const DEFAULT_BOTS = 3;
const OPEN = 1;

/** Account id: the secret key's SHA-256 (hex, truncated). */
async function acctId(key) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`liarsbar:${key}`));
  return [...new Uint8Array(d)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string compare (both sides hashed so lengths don't leak). */
async function sameSecret(a, b) {
  const h = async (x) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

/** Profiles, daily bonus and leaderboards. Every call is a POST with a JSON body. */
async function api(req, env, path) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body;
  try { body = JSON.parse((await req.text()).slice(0, 2048)); } catch { return json({ error: "json" }, 400); }
  const ledger = env.LEDGER.get(env.LEDGER.idFromName("global"));
  const key = normKey(body.key);
  const id = KEY_RE.test(key) ? await acctId(key) : null;

  if (path === "leaderboard") return json(await ledger.board(body.period === "all" ? "all" : "week", id));
  if (!id) return json({ error: "key" }, 400);
  if (path === "profile") return json({ profile: await ledger.upsert(id, cleanName(body.name), cleanAvatar(body.avatar)) });
  if (path === "restore") {
    const profile = await ledger.profile(id);
    return profile ? json({ profile }) : json({ error: "unknown" }, 404);
  }
  if (path === "buy") {
    const r = await ledger.buy(id, String(body.item || ""));
    return json(r, r.error === "unknown" ? 404 : 200);
  }
  if (path === "equip") {
    const profile = await ledger.equip(id, body.looks, typeof body.avatar === "string" ? body.avatar : null);
    return profile ? json({ profile }) : json({ error: "unknown" }, 404);
  }
  if (path === "admin") {
    // The owner's coin tap: needs the ADMIN_TOKEN secret (set in GitHub Actions secrets).
    const secret = env.ADMIN_TOKEN || "";
    if (secret.length < 8) return json({ error: "disabled" }, 404);
    if (await ledger.adminLocked()) return json({ error: "locked" }, 429);
    if (!(await sameSecret(String(body.token || ""), secret))) {
      await ledger.adminFail();
      return json({ error: "denied" }, 403);
    }
    const amount = Math.floor(Number(body.amount));
    if (!(amount > 0 && amount <= 1_000_000)) return json({ error: "amount" }, 400);
    const profile = await ledger.grant(id, amount);
    return profile ? json({ profile, got: amount }) : json({ error: "unknown" }, 404);
  }
  if (path === "daily") {
    const r = await ledger.daily(id);
    return r ? json(r) : json({ error: "unknown" }, 404);
  }
  return json({ error: "path" }, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/health") return new Response("liarsbar ok\n");
    const a = url.pathname.match(/^\/api\/([a-z]+)$/);
    if (a) return api(req, env, a[1]);
    const m = url.pathname.match(/^\/room\/([^/]+)$/);
    if (!m || !CODE_RE.test(m[1])) return new Response("not found\n", { status: 404 });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected a websocket\n", { status: 426 });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.meta = null; // { code, hostCid, bots, mode, lobby: [{ cid, name, avatar }] }
    this.game = null;
    this.timer = null;
    this.lastEmote = new Map();
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    ctx.blockConcurrencyWhile(async () => {
      this.meta = (await ctx.storage.get("meta")) || null;
      this.game = (await ctx.storage.get("game")) || null;
      this.tally = (await ctx.storage.get("tally")) || {};
    });
  }

  // ------------------------------------------------------------ plumbing ---

  sockets(except) {
    return this.ctx.getWebSockets().filter((ws) => ws !== except && ws.readyState === OPEN);
  }
  cidOf(ws) {
    return ws.deserializeAttachment()?.cid || null;
  }
  connected(cid, except) {
    return this.sockets(except).some((ws) => this.cidOf(ws) === cid);
  }
  send(ws, msg) {
    try { ws.send(JSON.stringify(msg)); } catch { /* socket went away */ }
  }
  seatOf(cid) {
    return this.game ? this.game.seats.findIndex((s) => s.clientId === cid) : -1;
  }
  saveMeta() {
    return this.ctx.storage.put("meta", this.meta);
  }
  saveGame() {
    return this.game ? this.ctx.storage.put({ game: this.game, tally: this.tally || {} }) : this.ctx.storage.delete(["game", "tally"]);
  }

  lobbyMsg(cid) {
    const m = this.meta;
    return {
      t: "lobby",
      code: m.code,
      bots: m.bots ?? DEFAULT_BOTS,
      mode: m.mode,
      max: MAX_SEATS,
      youHost: m.hostCid === cid,
      seats: m.lobby
        .filter((p) => this.connected(p.cid))
        .map((p) => ({ name: p.name, avatar: p.avatar, looks: p.looks || {}, host: p.cid === m.hostCid, you: p.cid === cid })),
    };
  }
  broadcastLobby() {
    for (const ws of this.sockets()) {
      const cid = this.cidOf(ws);
      if (cid) this.send(ws, this.lobbyMsg(cid));
    }
  }
  sendState(ws, cid) {
    const seat = this.seatOf(cid);
    if (seat >= 0) this.send(ws, { t: "state", view: viewFor(this.game, seat), hostNow: Date.now(), host: this.meta.hostCid === cid });
  }
  broadcastState() {
    for (const ws of this.sockets()) {
      const cid = this.cidOf(ws);
      if (cid) this.sendState(ws, cid);
    }
  }
  sync() {
    if (this.game) this.broadcastState();
    else this.broadcastLobby();
  }

  // --------------------------------------------------------------- engine ---

  dispatch(a) {
    if (!this.game) return false;
    const prev = this.game;
    const next = reduce(prev, { ...a, now: Date.now() });
    if (next === prev) return false;
    this.game = next;
    const seen = prev.log[0]?.id ?? 0;
    for (const ev of next.log) {
      if (ev.id <= seen) break;
      this.later(botFx(next, ev));
      this.count(ev);
    }
    if (next.phase === "gameover" && prev.phase !== "gameover") this.finish(next).catch((err) => console.error("finish", err));
    // Snapshot at round starts and at the end; everything else stays in memory.
    const t = next.log[0]?.type;
    if (t === "deal" || t === "start" || next.phase === "gameover") this.saveGame();
    this.broadcastState();
    this.arm();
    return true;
  }

  /** Per-game stats the log can't hold (it keeps only the last 60 events). */
  count(ev) {
    const t = (this.tally ||= {});
    const bump = (seat, k) => { (t[seat] ||= { safe: 0, catches: 0, devil: 0 })[k]++; };
    if (ev.type === "safe") bump(ev.seat, "safe");
    if (ev.type === "bluff") bump(ev.other, "catches"); // the accuser caught a bluff
    if (ev.type === "devil") bump(ev.seat, "devil");
  }

  /** Pay out coins for a finished game (only with 2+ different real players). */
  async finish(game) {
    const acctOf = (cid) => this.meta.lobby.find((p) => p.cid === cid)?.acct || null;
    const seen = new Set();
    const results = [];
    const bySeat = {};
    for (const s of game.seats) {
      if (s.kind !== "human") continue;
      const id = acctOf(s.clientId);
      if (!id || seen.has(id)) continue; // same account in two seats counts once
      seen.add(id);
      const t = this.tally?.[s.idx] || { safe: 0, catches: 0, devil: 0 };
      const win = game.winner === s.idx;
      const parts = {
        seat: s.connected ? REWARD.seat : 0,
        win: win ? REWARD.win : 0,
        safe: t.safe * REWARD.safe,
        catch: t.catches * REWARD.catch,
        devil: t.devil * REWARD.devil,
      };
      const amount = Object.values(parts).reduce((a, b) => a + b, 0);
      results.push({ id, name: s.name, avatar: s.avatar, amount, win, safe: t.safe, catches: t.catches });
      bySeat[s.idx] = { id, parts, amount };
    }
    // Rooms whose code starts with "zz" are for automated tests: no coins, no leaderboard.
    const eligible = results.length >= 2 && !this.meta.code.startsWith("zz");
    let paid = null;
    if (eligible) {
      try {
        paid = await this.env.LEDGER.get(this.env.LEDGER.idFromName("global")).award(this.meta.gameId, results);
      } catch (err) {
        console.error("award failed", err);
      }
    }
    this.rewards = {
      eligible,
      list: Object.entries(bySeat).map(([seat, r]) => ({ seat: Number(seat), got: paid?.[r.id]?.got ?? 0, parts: r.parts })),
      paid: paid || {},
    };
    for (const ws of this.sockets()) this.sendRewards(ws, this.cidOf(ws));
  }

  sendRewards(ws, cid) {
    if (!cid || !this.rewards || this.game?.phase !== "gameover") return;
    const acct = this.meta.lobby.find((p) => p.cid === cid)?.acct;
    const { eligible, list, paid } = this.rewards;
    this.send(ws, { t: "rewards", eligible, list, you: (acct && paid[acct]) || null });
  }

  /** Throws, reactions and chat lines, sent to everyone at the table. */
  fx(fx) {
    for (const ws of this.sockets()) this.send(ws, { t: "fx", fx });
    if (fx.kind === "throw" && this.game) this.later(botThrowBack(this.game, fx));
  }
  later(list) {
    for (const { delay, fx } of list) setTimeout(() => this.game && this.fx(fx), delay);
  }

  /** Schedule the engine's next automatic step (bots, reveals, AFK timeouts). */
  arm() {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.game || !this.sockets().length) return; // nobody watching: pause
    const plan = schedule(this.game, Date.now());
    if (!plan) return;
    const at = this.game;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.game === at) this.dispatch(plan.make(at));
    }, plan.delay);
  }

  start() {
    if (this.game && this.game.phase !== "gameover") return;
    const roster = this.meta.lobby.filter((p) => this.connected(p.cid));
    this.meta.lobby = roster;
    const seats = roster.map((p) => ({ name: p.name, avatar: p.avatar, looks: p.looks || {}, kind: "human", clientId: p.cid }));
    seats.push(...bots(Math.min(this.meta.bots ?? DEFAULT_BOTS, MAX_SEATS - seats.length)));
    this.game = seats.length >= 2 ? createGame(seats, { ...ONLINE_OPTS, mode: this.meta.mode }) : null;
    this.meta.gameId = `${this.meta.code}-${Date.now()}`;
    this.tally = {};
    this.rewards = null;
    this.saveMeta();
    this.saveGame();
    this.sync();
    this.arm();
  }

  toLobby() {
    if (this.game && this.game.phase !== "gameover") return;
    this.game = null;
    this.arm();
    this.meta.lobby = this.meta.lobby.filter((p) => this.connected(p.cid));
    this.saveMeta();
    this.saveGame();
    this.broadcastLobby();
  }

  // ------------------------------------------------------------- sockets ---

  async fetch(req) {
    const url = new URL(req.url);
    const code = url.pathname.split("/").pop();
    const create = url.searchParams.get("create") === "1";
    let reject = null;

    if (create) {
      if (this.meta && this.sockets().length) reject = "codeTaken";
      else {
        this.meta = { code, hostCid: null, bots: DEFAULT_BOTS, mode: MODES.includes(url.searchParams.get("mode")) ? url.searchParams.get("mode") : "classic", lobby: [] };
        this.game = null;
        await this.ctx.storage.deleteAll();
        await this.saveMeta();
      }
    } else if (!this.meta) {
      reject = "roomMissing";
    }

    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ cid: null });
    if (reject) {
      this.send(server, { t: "reject", reason: reject });
      server.close(4000, reject);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    if (!this.meta || typeof raw !== "string" || raw.length > 4096) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== "object") return;

    if (m.t === "hello") {
      const key = normKey(m.key);
      const acct = KEY_RE.test(key) ? await acctId(key) : null;
      let gear = null;
      if (acct) {
        try { gear = await this.env.LEDGER.get(this.env.LEDGER.idFromName("global")).gear(acct); } catch { /* ledger down: play plain */ }
      }
      return this.hello(ws, m, acct, gear);
    }

    const cid = this.cidOf(ws);
    if (!cid) return;
    const isHost = this.meta.hostCid === cid;
    switch (m.t) {
      case "act":
        if (m.a && GUEST_ACTIONS.has(m.a.type)) {
          const seat = this.seatOf(cid);
          if (seat >= 0) this.dispatch({ type: m.a.type, ids: Array.isArray(m.a.ids) ? m.a.ids.slice(0, 3) : undefined, seat });
        }
        break;
      case "emote":
      case "throw":
      case "say": {
        const seat = this.seatOf(cid);
        const now = Date.now();
        const key = `${cid}:${m.t === "emote" ? "e" : "x"}`;
        if (seat < 0 || now - (this.lastEmote.get(key) || 0) < (m.t === "emote" ? EMOTE_GAP : FX_GAP)) break;
        let fx = null;
        if (m.t === "emote" && EMOTES.includes(m.e)) fx = { kind: "emote", seat, e: m.e };
        if (m.t === "say" && Number.isInteger(m.i) && m.i >= 0 && m.i < PHRASES.length) fx = { kind: "say", seat, i: m.i };
        const mayThrow = (this.meta.lobby.find((p) => p.cid === cid)?.throws || FREE_THROWS).includes(m.item);
        if (m.t === "throw" && ALL_THROWS.includes(m.item) && mayThrow && Number.isInteger(m.to) && m.to !== seat && this.game.seats[m.to]) fx = { kind: "throw", from: seat, to: m.to, item: m.item };
        if (!fx) break;
        this.lastEmote.set(key, now);
        this.fx(fx);
        break;
      }
      case "start":
      case "again":
        if (isHost) this.start();
        break;
      case "toLobby":
        if (isHost) this.toLobby();
        break;
      case "bots":
        if (isHost && !this.game && Number.isInteger(m.v) && m.v >= 0 && m.v < MAX_SEATS) { this.meta.bots = m.v; this.saveMeta(); this.broadcastLobby(); }
        break;
      case "mode":
        if (isHost && !this.game && MODES.includes(m.v)) { this.meta.mode = m.v; this.saveMeta(); this.broadcastLobby(); }
        break;
      default:
    }
  }

  hello(ws, m, acct, gear) {
    const cid = String(m.clientId || "").slice(0, 40);
    if (!cid || this.cidOf(ws)) return;
    const name = cleanName(m.name);
    // Heads and gear are what the ledger says this player owns, nothing else.
    const owned = gear?.owned || [];
    const avatar = owns(owned, cleanAvatar(m.avatar)) ? cleanAvatar(m.avatar) : gear?.avatar || FREE_AVATARS[0];
    const looks = gear?.looks || {};
    const throws = [...FREE_THROWS, ...owned.filter((id) => ITEMS[id]?.cat === "throw")];
    const meta = this.meta;
    const known = meta.lobby.find((p) => p.cid === cid);
    const refuse = (reason) => { this.send(ws, { t: "reject", reason }); ws.close(4000, reason); };

    if (!known) {
      if (this.game && this.game.phase !== "gameover") return refuse("alreadyStarted");
      if (meta.lobby.filter((p) => this.connected(p.cid)).length >= MAX_SEATS) return refuse("roomFull");
      meta.lobby.push({ cid, name, avatar, acct, looks, throws });
    } else {
      if (acct) known.acct = acct;
      known.throws = throws;
      if (!this.game) {
        known.name = name;
        known.avatar = avatar;
        known.looks = looks;
      }
    }

    ws.serializeAttachment({ cid });
    // Same player in a second tab: keep the newest connection.
    for (const other of this.sockets(ws)) if (this.cidOf(other) === cid) other.close(4001, "replaced");
    if (!meta.hostCid || !this.connected(meta.hostCid, ws)) meta.hostCid = cid; // no host online: you are it
    this.saveMeta();

    if (this.game) {
      const seat = this.seatOf(cid);
      if (seat < 0) this.send(ws, this.lobbyMsg(cid)); // joined after game over: waits for the rematch
      if (seat < 0 || !this.dispatch({ type: "presence", seat, connected: true })) this.broadcastState(); // host flag may have moved
      this.sendRewards(ws, cid);
      this.arm();
    } else {
      this.broadcastLobby();
    }
  }

  async webSocketClose(ws) {
    await this.left(ws);
    try { ws.close(1000, "bye"); } catch { /* already closed */ }
  }

  async webSocketError(ws) {
    await this.left(ws);
  }

  async left(ws) {
    const cid = this.cidOf(ws);
    if (!this.meta || !cid || this.connected(cid, ws)) return;
    try { ws.serializeAttachment({ cid: null }); } catch { /* closed */ } // close + error both land here once
    if (this.game) {
      const seat = this.seatOf(cid);
      if (seat >= 0) this.dispatch({ type: "presence", seat, connected: false });
    } else {
      this.meta.lobby = this.meta.lobby.filter((p) => p.cid !== cid);
    }
    if (this.meta.hostCid === cid) {
      const next = this.meta.lobby.find((p) => this.connected(p.cid));
      if (next) this.meta.hostCid = next.cid;
    }
    await this.saveMeta();
    this.sync();
    if (!this.sockets().length) {
      this.arm(); // stops the engine clock
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL);
    }
  }

  /** Nobody came back within ROOM_TTL: forget the room. */
  async alarm() {
    if (this.sockets().length) return;
    this.meta = null;
    this.game = null;
    await this.ctx.storage.deleteAll();
  }
}
