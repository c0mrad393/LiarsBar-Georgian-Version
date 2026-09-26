// End-to-end test of the room server with two scripted players.
//   npx wrangler dev --config server/wrangler.jsonc   (in another terminal)
//   node scripts/online-test.mjs [ws://127.0.0.1:8787]
const SERVER = (process.argv[2] || "ws://127.0.0.1:8787").replace(/\/$/, "");
// Against a real server, use a "zz" test room: the game is identical but pays no
// coins, so test players never reach the public leaderboard.
const LOCAL = /\/\/(127\.0\.0\.1|localhost)[:/]/.test(SERVER);
const code = (LOCAL ? "t" : "zz") + Math.random().toString(36).slice(2, 8);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const fail = (msg) => { console.error("FAIL:", msg); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HTTP = SERVER.replace(/^ws/, "http");
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newKey = () => Array.from({ length: 20 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join("");
const KEYS = { "host-1": newKey(), "guest-1": newKey(), "q-1": newKey(), "q-2": newKey() };
async function api(path, body) {
  const r = await fetch(`${HTTP}/api/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}

function client(name, cid, { create = false, room = code, avatar = "🐸", query = "" } = {}) {
  const c = { name, cid, msgs: [], lobby: null, view: null, host: false, reject: null, closed: false };
  c.ws = new WebSocket(`${SERVER}/room/${room}${create ? "?create=1&mode=devil" : query}`);
  c.ws.onopen = () => c.ws.send(JSON.stringify({ t: "hello", clientId: cid, key: KEYS[cid], name, avatar }));
  c.ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    c.msgs.push(m);
    if (m.t === "lobby") { c.lobby = m; c.view = null; c.host = m.youHost; }
    if (m.t === "state") { c.view = m.view; c.host = m.host; }
    if (m.t === "reject") c.reject = m.reason;
    if (m.t === "rewards") c.rewards = m;
  };
  c.ws.onclose = () => { c.closed = true; };
  c.send = (m) => c.ws.readyState === 1 && c.ws.send(JSON.stringify(m));
  return c;
}

async function until(pred, what, ms = 8000) {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > ms) fail(`timeout waiting for ${what}`);
    await sleep(50);
  }
}

// Play whatever this client is allowed to do right now.
function autoplay(c) {
  const v = c.view;
  if (!v) return;
  const me = v.seats[v.me];
  for (const s of v.seats) if (s.idx !== v.me && (s.hand || s.dice)) fail(`${c.name} can see ${s.name}'s hand`);
  if (v.pile && v.pile.cards) fail("pile cards leaked");
  if (v.phase === "roulette" && v.roulette?.victim === v.me && !v.roulette.spinning && !v.roulette.result) return c.send({ t: "act", a: { type: "pull" } });
  if (v.phase !== "playing" || v.turn !== v.me || !me.alive) return;
  if (v.kind === "dice") {
    if (!me.dice || me.dice.length !== 5) fail(`${c.name} has no dice`);
    const b = v.bid;
    if (b && b.by !== v.me && (v.mustCall || b.q >= v.totalDice / 3 + 1 || Math.random() < 0.2)) return c.send({ t: "act", a: { type: "call" } });
    return c.send({ t: "act", a: b ? { type: "bid", q: b.f < 6 ? b.q : b.q + 1, f: b.f < 6 ? b.f + 1 : 2 } : { type: "bid", q: 1, f: me.dice.find((d) => d > 1) || 6 } });
  }
  if (v.mustCall || (v.pile && v.pile.by !== v.me && Math.random() < 0.35)) return c.send({ t: "act", a: { type: "call" } });
  if (me.hand?.length) c.send({ t: "act", a: { type: "play", ids: [me.hand[0].id] } });
}

log("room", code, "on", SERVER);

// 1. missing room is refused
const ghost = client("ghost", "ghost-1", { room: "zzzz" + Math.random().toString(36).slice(2, 6) });
await until(() => ghost.reject === "roomMissing", "roomMissing rejection");
log("ok  unknown room → roomMissing");

// 2. shop (local server only: needs the dev admin password in server/.dev.vars)
if (LOCAL) {
  const fs = await import("node:fs");
  const token = process.env.ADMIN_TOKEN || (fs.readFileSync(new URL("../server/.dev.vars", import.meta.url), "utf8").match(/ADMIN_TOKEN=(.*)/)?.[1] ?? "").trim();
  await api("profile", { key: KEYS["host-1"], name: "Host", avatar: "🐸" });
  await api("profile", { key: KEYS["guest-1"], name: "Guest", avatar: "🐸" });
  if ((await api("admin", { key: KEYS["host-1"], token: "wrong", amount: 5 })).status !== 403) fail("wrong admin password accepted");
  const g = await api("admin", { key: KEYS["host-1"], token, amount: 5000 });
  if (g.status !== 200 || g.body.profile.coins !== 5000 || g.body.profile.earned !== 0) fail(`admin grant: ${JSON.stringify(g)}`);
  const b1 = await api("buy", { key: KEYS["host-1"], item: "hat_crown" });
  if (!b1.body.ok || b1.body.profile.coins !== 4500 || !b1.body.profile.owned.includes("hat_crown")) fail(`buy crown: ${JSON.stringify(b1.body)}`);
  if ((await api("buy", { key: KEYS["host-1"], item: "hat_crown" })).body.error !== "owned") fail("double buy");
  if ((await api("buy", { key: KEYS["guest-1"], item: "hat_crown" })).body.error !== "poor") fail("buy without coins");
  if ((await api("buy", { key: KEYS["host-1"], item: "nope" })).status !== 404) fail("unknown item");
  for (const item of ["🥟", "💩", "o_chokha"]) if (!(await api("buy", { key: KEYS["host-1"], item })).body.ok) fail(`buy ${item}`);
  const eq = await api("equip", { key: KEYS["host-1"], looks: { hat: "hat_crown", eyes: "eye_laser", outfit: "o_chokha", neck: "hat_top", cards: "c_blue" }, avatar: "🥟" });
  const L = eq.body.profile.looks;
  if (L.hat !== "hat_crown" || L.outfit !== "o_chokha" || L.cards !== "c_blue" || L.eyes || L.neck || eq.body.profile.avatar !== "🥟") fail(`equip: ${JSON.stringify(eq.body.profile)}`);
  const cheat = await api("equip", { key: KEYS["guest-1"], looks: { hat: "hat_crown" }, avatar: "🥟" });
  if (cheat.body.profile.looks.hat || cheat.body.profile.avatar === "🥟") fail("guest wore gear they don't own");
  log("ok  shop: admin grant (not on board), buy, owned/poor/unknown, equip drops unowned/wrong-slot, premium head");
}

// 3. host creates, guest joins
const host = client("Host", "host-1", { create: true, avatar: LOCAL ? "🥟" : "🐸" });
await until(() => host.lobby, "host lobby");
if (!host.host) fail("creator is not host");
if (host.lobby.mode !== "devil") fail("mode from create param not applied");
let guest = client("Guest", "guest-1", { avatar: "🥟" });
await until(() => guest.lobby && host.lobby.seats.length === 2, "guest in lobby");
if (LOCAL) {
  const hs = guest.lobby.seats.find((p) => p.host);
  const gs = guest.lobby.seats.find((p) => p.you);
  if (hs.avatar !== "🥟" || hs.looks?.hat !== "hat_crown" || hs.looks?.outfit !== "o_chokha") fail(`host gear not visible: ${JSON.stringify(hs)}`);
  if (gs.avatar === "🥟") fail("guest got a premium head without owning it");
  log("ok  room shows owned gear and refuses unowned heads");
}
if (guest.host) fail("guest became host");
log("ok  create + join, host flag, devil mode");

// 3. only the host may change settings
guest.send({ t: "mode", v: "classic" });
await sleep(300);
if (host.lobby.mode !== "devil") fail("guest changed the mode");
host.send({ t: "bots", v: 4 });
host.send({ t: "start" });
await until(() => host.view && guest.view, "game start");
if (host.view.seats.length !== 6) fail(`expected 2 humans + 4 bots, got ${host.view.seats.length} seats`);
if (host.view.opts.mode !== "devil") fail("game not in devil mode");
log("ok  host-only settings, 6-seat table with 4 bots");

// throws and chat reach everyone; bad targets are ignored
guest.send({ t: "throw", to: 0, item: "🍅" });
await until(() => host.msgs.some((m) => m.t === "fx" && m.fx.kind === "throw" && m.fx.to === 0), "throw fx");
host.send({ t: "say", i: 2 });
await until(() => guest.msgs.some((m) => m.t === "fx" && m.fx.kind === "say" && m.fx.i === 2), "say fx");
await sleep(1300); // throws and chat share one rate limit
const before = host.msgs.length;
host.send({ t: "throw", to: 99, item: "🍅" });
host.send({ t: "throw", to: 1, item: "💣" });
guest.send({ t: "throw", to: 0, item: "💩" }); // guest doesn't own it
await sleep(400);
if (host.msgs.slice(before).some((m) => m.t === "fx" && m.fx.kind === "throw" && (m.fx.from === 0 || m.fx.item === "💩"))) fail("invalid throw accepted");
if (LOCAL) {
  const hostSeat = host.view.me;
  host.send({ t: "throw", to: guest.view.me, item: "💩" }); // host bought it
  await until(() => guest.msgs.some((m) => m.t === "fx" && m.fx.kind === "throw" && m.fx.item === "💩" && m.fx.from === hostSeat), "owned 💩 throw");
}
log("ok  throw + quick chat, invalid throws rejected");

// 4. latecomer is refused mid-game
const late = client("Late", "late-1");
await until(() => late.reject === "alreadyStarted", "alreadyStarted rejection");
log("ok  latecomer → alreadyStarted");

// 5. guest drops and comes back to the same seat
const seatBefore = guest.view.me;
guest.ws.close();
await until(() => host.view.seats[seatBefore].connected === false, "guest marked offline");
guest = client("Guest", "guest-1");
await until(() => guest.view && host.view.seats[seatBefore].connected === true, "guest reconnect");
if (guest.view.me !== seatBefore) fail("guest got a different seat");
if (!guest.view.seats[seatBefore].hand) fail("guest lost their hand");
log("ok  disconnect → offline autopilot → reconnect to same seat");

// 6. play to the end
const t0 = Date.now();
while (host.view.phase !== "gameover") {
  autoplay(host);
  autoplay(guest);
  await sleep(250);
  if (Date.now() - t0 > 10 * 60 * 1000) fail("game did not finish in 10 minutes");
}
await until(() => host.rewards && guest.rewards, "rewards after game over", 10000);
if (!LOCAL) {
  if (host.rewards.eligible || host.rewards.you) fail("test room paid coins");
  log("ok  test room: rewards computed, nothing paid");
} else {
if (!host.rewards.eligible) fail("2 humans but rewards not eligible");
for (const c of [host, guest]) {
  if (!c.rewards.you || c.rewards.you.got < 10) fail(`${c.name} got no coins: ${JSON.stringify(c.rewards)}`);
  const mine = c.rewards.list.find((r) => r.seat === c.view.me);
  const sum = Object.values(mine.parts).reduce((a, b) => a + b, 0);
  if (sum !== c.rewards.you.got) fail(`${c.name} breakdown ${sum} ≠ paid ${c.rewards.you.got}`);
}
log(`ok  coins paid: host +${host.rewards.you.got}, guest +${guest.rewards.you.got}`);

// ledger API
const prof = await api("restore", { key: KEYS["host-1"] });
if (prof.status !== 200 || prof.body.profile.coins !== host.rewards.you.coins || prof.body.profile.games !== 1) fail(`restore: ${JSON.stringify(prof)}`);
if ((await api("restore", { key: newKey() })).status !== 404) fail("unknown key should 404");
if ((await api("restore", { key: "bad" })).status !== 400) fail("malformed key should 400");
const d1 = await api("daily", { key: KEYS["guest-1"] });
const d2 = await api("daily", { key: KEYS["guest-1"] });
if (!d1.body.ok || d1.body.got !== 25 || d2.body.ok !== false) fail(`daily bonus: ${JSON.stringify([d1.body, d2.body])}`);
const board = await api("leaderboard", { key: KEYS["host-1"], period: "week" });
const all = await api("leaderboard", { period: "all" });
if (!board.body.me || !board.body.top.some((r) => r.me)) fail(`week board lacks host: ${JSON.stringify(board.body).slice(0, 300)}`);
if (!all.body.top.length || all.body.top.some((r) => "id" in r)) fail("all-time board empty or leaks ids");
if ((await api("profile", { key: KEYS["guest-1"], name: "Renamed", avatar: "🦄" })).body.profile?.name !== "Renamed") fail("rename");
log(`ok  ledger API: restore, 404/400, daily once, leaderboard (host #${board.body.me.rank} this week), rename`);
}
{
  // Safe on a real server too: fresh keys, nothing earned, so nothing on the boards.
  if ((await api("restore", { key: newKey() })).status !== 404) fail("unknown key should 404");
  if ((await api("restore", { key: "bad" })).status !== 400) fail("malformed key should 400");
  const b = await api("leaderboard", { period: "all" });
  if (b.status !== 200 || !Array.isArray(b.body.top) || b.body.top.some((r) => "id" in r)) fail("leaderboard shape");
  log("ok  ledger API reachable, errors and board shape");
}

const types = new Set(host.view.log.map((e) => e.type));
log(`ok  game finished in ${Math.round((Date.now() - t0) / 1000)}s, round ${host.view.round}, winner seat ${host.view.winner}, events: ${[...types].join(",")}`);

// 7. rematch, back to lobby, host hand-off
host.send({ t: "again" });
await until(() => host.view && host.view.phase !== "gameover", "rematch");
log("ok  rematch");
while (host.view.phase !== "gameover") { autoplay(host); autoplay(guest); await sleep(250); }
host.send({ t: "toLobby" });
await until(() => host.lobby && guest.lobby && !guest.view, "back to lobby");

// 8. Liar's Dice: a whole game, with the dice kept secret
host.send({ t: "mode", v: "dice" });
await until(() => guest.lobby.mode === "dice", "dice mode");
host.send({ t: "bots", v: 2 });
host.send({ t: "start" });
await until(() => host.view && guest.view && host.view.kind === "dice", "dice game");
const dt0 = Date.now();
let bids = 0;
while (host.view.phase !== "gameover") {
  if (host.view.bid) bids++;
  autoplay(host);
  autoplay(guest);
  await sleep(250);
  if (Date.now() - dt0 > 8 * 60 * 1000) fail("dice game did not finish");
}
const dtypes = new Set(host.view.log.map((e) => e.type));
if (!dtypes.has("bid") || !host.view.log.some((e) => e.type === "safe" || e.type === "dead")) fail(`dice game events: ${[...dtypes]}`);
if (!host.view.log.some((e) => (e.type === "safe" || e.type === "dead") && e.wine)) fail("dice roulette isn't wine");
log(`ok  dice game finished in ${Math.round((Date.now() - dt0) / 1000)}s, round ${host.view.round}, events: ${[...dtypes].join(",")}`);
host.send({ t: "toLobby" });
await until(() => host.lobby && guest.lobby && !guest.view, "back to lobby after dice");

host.ws.close();
await until(() => guest.host && guest.lobby.seats.length === 1, "host hand-off");
log("ok  back to lobby, host left → guest is host now");

// 9. quick play: two strangers land at the same public table, which starts by itself
const q1r = await api("quick", { mode: "chaos", test: !LOCAL });
if (q1r.status !== 200 || !q1r.body.code || q1r.body.mode !== "chaos") fail(`quick: ${JSON.stringify(q1r)}`);
const q1 = client("Quick1", "q-1", { room: q1r.body.code, query: "?quick=1&mode=chaos" });
await until(() => q1.lobby, "quick lobby");
if (!q1.lobby.public || q1.lobby.mode !== "chaos" || !q1.host) fail(`quick lobby: ${JSON.stringify(q1.lobby)}`);
if (LOCAL) {
  const listed = (await api("tables", {})).body.tables;
  if (!listed.some((t) => t.code === q1r.body.code && t.players === 1 && t.host === "Quick1")) fail(`table not listed: ${JSON.stringify(listed)}`);
}
const q2r = await api("quick", { mode: "chaos", test: !LOCAL });
if (q2r.body.code !== q1r.body.code) fail("second quick player sent to a different table");
const q2 = client("Quick2", "q-2", { room: q2r.body.code, query: "?quick=1&mode=chaos" });
await until(() => q2.lobby && q1.lobby.seats.length === 2 && q1.lobby.startsAt, "auto-start countdown");
log(`ok  quick play: same table ${q1r.body.code}, public lobby, countdown ${Math.round((q1.lobby.startsAt - q1.lobby.now) / 1000)}s`);
await until(() => q1.view && q2.view, "public table auto-starts", 30000);
if (q1.view.opts.mode !== "chaos" || !q1.view.event) fail("chaos game has no round event");
if (LOCAL && (await api("tables", {})).body.tables.some((t) => t.code === q1r.body.code)) fail("started table still listed");
const events = new Set();
const qt0 = Date.now();
while (q1.view.phase !== "gameover" && Date.now() - qt0 < 90 * 1000) {
  if (q1.view.event) events.add(q1.view.event);
  autoplay(q1);
  autoplay(q2);
  await sleep(250);
}
log(`ok  public table started by itself, chaos events seen: ${[...events].join(",")}`);
q1.ws.close();
q2.ws.close();
if (LOCAL) {
  await sleep(500);
  if ((await api("tables", {})).body.tables.some((t) => t.code === q1r.body.code)) fail("empty table still listed");
}

guest.ws.close();
ghost.ws.close();
late.ws.close();
log("ALL PASSED");
process.exit(0);
