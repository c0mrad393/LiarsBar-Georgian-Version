// End-to-end test of the room server with two scripted players.
//   npx wrangler dev --config server/wrangler.jsonc   (in another terminal)
//   node scripts/online-test.mjs [ws://127.0.0.1:8787]
const SERVER = (process.argv[2] || "ws://127.0.0.1:8787").replace(/\/$/, "");
const code = "t" + Math.random().toString(36).slice(2, 8);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const fail = (msg) => { console.error("FAIL:", msg); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client(name, cid, { create = false, room = code } = {}) {
  const c = { name, cid, msgs: [], lobby: null, view: null, host: false, reject: null, closed: false };
  c.ws = new WebSocket(`${SERVER}/room/${room}${create ? "?create=1&mode=devil" : ""}`);
  c.ws.onopen = () => c.ws.send(JSON.stringify({ t: "hello", clientId: cid, name, avatar: "🐸" }));
  c.ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    c.msgs.push(m);
    if (m.t === "lobby") { c.lobby = m; c.view = null; c.host = m.youHost; }
    if (m.t === "state") { c.view = m.view; c.host = m.host; }
    if (m.t === "reject") c.reject = m.reason;
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
  for (const s of v.seats) if (s.idx !== v.me && s.hand) fail(`${c.name} can see ${s.name}'s hand`);
  if (v.pile && v.pile.cards) fail("pile cards leaked");
  if (v.phase === "roulette" && v.roulette?.victim === v.me && !v.roulette.spinning && !v.roulette.result) return c.send({ t: "act", a: { type: "pull" } });
  if (v.phase !== "playing" || v.turn !== v.me || !me.alive) return;
  if (v.mustCall || (v.pile && v.pile.by !== v.me && Math.random() < 0.35)) return c.send({ t: "act", a: { type: "call" } });
  if (me.hand?.length) c.send({ t: "act", a: { type: "play", ids: [me.hand[0].id] } });
}

log("room", code, "on", SERVER);

// 1. missing room is refused
const ghost = client("ghost", "ghost-1", { room: "zzzz" + Math.random().toString(36).slice(2, 6) });
await until(() => ghost.reject === "roomMissing", "roomMissing rejection");
log("ok  unknown room → roomMissing");

// 2. host creates, guest joins
const host = client("Host", "host-1", { create: true });
await until(() => host.lobby, "host lobby");
if (!host.host) fail("creator is not host");
if (host.lobby.mode !== "devil") fail("mode from create param not applied");
let guest = client("Guest", "guest-1");
await until(() => guest.lobby && host.lobby.seats.length === 2, "guest in lobby");
if (guest.host) fail("guest became host");
log("ok  create + join, host flag, devil mode");

// 3. only the host may change settings
guest.send({ t: "mode", v: "classic" });
await sleep(300);
if (host.lobby.mode !== "devil") fail("guest changed the mode");
host.send({ t: "botFill", v: true });
host.send({ t: "start" });
await until(() => host.view && guest.view, "game start");
if (host.view.seats.length !== 4) fail("bots did not fill seats");
if (host.view.opts.mode !== "devil") fail("game not in devil mode");
log("ok  host-only settings, start with bots");

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
const types = new Set(host.view.log.map((e) => e.type));
log(`ok  game finished in ${Math.round((Date.now() - t0) / 1000)}s, round ${host.view.round}, winner seat ${host.view.winner}, events: ${[...types].join(",")}`);

// 7. rematch, back to lobby, host hand-off
host.send({ t: "again" });
await until(() => host.view && host.view.phase !== "gameover", "rematch");
log("ok  rematch");
while (host.view.phase !== "gameover") { autoplay(host); autoplay(guest); await sleep(250); }
host.send({ t: "toLobby" });
await until(() => host.lobby && guest.lobby && !guest.view, "back to lobby");
host.ws.close();
await until(() => guest.host && guest.lobby.seats.length === 1, "host hand-off");
log("ok  back to lobby, host left → guest is host now");

guest.ws.close();
ghost.ws.close();
late.ws.close();
log("ALL PASSED");
process.exit(0);
