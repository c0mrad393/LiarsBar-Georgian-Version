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
import { CODE_RE, EMOTES, GUEST_ACTIONS, MAX_SEATS, MODES, ONLINE_OPTS, bots, cleanAvatar, cleanName } from "../src/shared.js";

const ROOM_TTL = 60 * 60 * 1000;
const EMOTE_GAP = 500;
const OPEN = 1;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/health") return new Response("liarsbar ok\n");
    const m = url.pathname.match(/^\/room\/([^/]+)$/);
    if (!m || !CODE_RE.test(m[1])) return new Response("not found\n", { status: 404 });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected a websocket\n", { status: 426 });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.meta = null; // { code, hostCid, botFill, mode, lobby: [{ cid, name, avatar }] }
    this.game = null;
    this.timer = null;
    this.lastEmote = new Map();
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    ctx.blockConcurrencyWhile(async () => {
      this.meta = (await ctx.storage.get("meta")) || null;
      this.game = (await ctx.storage.get("game")) || null;
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
    return this.game ? this.ctx.storage.put("game", this.game) : this.ctx.storage.delete("game");
  }

  lobbyMsg(cid) {
    const m = this.meta;
    return {
      t: "lobby",
      code: m.code,
      botFill: m.botFill,
      mode: m.mode,
      max: MAX_SEATS,
      youHost: m.hostCid === cid,
      seats: m.lobby
        .filter((p) => this.connected(p.cid))
        .map((p) => ({ name: p.name, avatar: p.avatar, host: p.cid === m.hostCid, you: p.cid === cid })),
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
    const next = reduce(this.game, { ...a, now: Date.now() });
    if (next === this.game) return false;
    this.game = next;
    // Snapshot at round starts and at the end; everything else stays in memory.
    const t = next.log[0]?.type;
    if (t === "deal" || t === "start" || next.phase === "gameover") this.saveGame();
    this.broadcastState();
    this.arm();
    return true;
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
    const seats = roster.map((p) => ({ name: p.name, avatar: p.avatar, kind: "human", clientId: p.cid }));
    if (this.meta.botFill) seats.push(...bots(MAX_SEATS - seats.length));
    this.game = seats.length >= 2 ? createGame(seats, { ...ONLINE_OPTS, mode: this.meta.mode }) : null;
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
        this.meta = { code, hostCid: null, botFill: true, mode: MODES.includes(url.searchParams.get("mode")) ? url.searchParams.get("mode") : "classic", lobby: [] };
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

    if (m.t === "hello") return this.hello(ws, m);

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
      case "emote": {
        const seat = this.seatOf(cid);
        const now = Date.now();
        if (seat < 0 || !EMOTES.includes(m.e) || now - (this.lastEmote.get(cid) || 0) < EMOTE_GAP) break;
        this.lastEmote.set(cid, now);
        for (const s of this.sockets()) this.send(s, { t: "emote", seat, e: m.e });
        break;
      }
      case "start":
      case "again":
        if (isHost) this.start();
        break;
      case "toLobby":
        if (isHost) this.toLobby();
        break;
      case "botFill":
        if (isHost && !this.game) { this.meta.botFill = !!m.v; this.saveMeta(); this.broadcastLobby(); }
        break;
      case "mode":
        if (isHost && !this.game && MODES.includes(m.v)) { this.meta.mode = m.v; this.saveMeta(); this.broadcastLobby(); }
        break;
      default:
    }
  }

  hello(ws, m) {
    const cid = String(m.clientId || "").slice(0, 40);
    if (!cid || this.cidOf(ws)) return;
    const name = cleanName(m.name);
    const avatar = cleanAvatar(m.avatar);
    const meta = this.meta;
    const known = meta.lobby.find((p) => p.cid === cid);
    const refuse = (reason) => { this.send(ws, { t: "reject", reason }); ws.close(4000, reason); };

    if (!known) {
      if (this.game && this.game.phase !== "gameover") return refuse("alreadyStarted");
      if (meta.lobby.filter((p) => this.connected(p.cid)).length >= MAX_SEATS) return refuse("roomFull");
      meta.lobby.push({ cid, name, avatar });
    } else if (!this.game) {
      known.name = name;
      known.avatar = avatar;
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
