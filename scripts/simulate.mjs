// Plays many all-bot games through the engine (as the host would, but with the
// clock fast-forwarded) and checks invariants. `npm run sim`
import { createGame, reduce, schedule, viewFor, MAX_SEATS, MODES, CHAOS, DICE } from "../src/engine.js";

const GAMES = Number(process.argv[2] || 3000);
const personas = ["pig", "fox", "bull", "cat", "bear", "pig"];
let rounds = 0, steps = 0, calls = 0, maxRounds = 0, devils = 0, multiDeaths = 0, bids = 0;
const events = {};
const wins = [0, 0, 0, 0, 0, 0];

function check(s) {
  const alive = s.seats.filter((p) => p.alive);
  if (alive.length < 1) throw new Error("everyone dead");
  const cards = s.seats.reduce((n, p) => n + p.hand.length, 0) + (s.pile?.count || 0);
  if (cards > (s.seats.length > 4 ? 32 : 20)) throw new Error("card duplication");
  const ids = s.seats.flatMap((p) => p.hand.map((c) => c.id));
  if (new Set(ids).size !== ids.length) throw new Error("duplicate card id");
  if (s.seats.some((p) => p.hand.some((c) => c.rank === "D")) && s.opts.mode === "classic") throw new Error("devil card in classic mode");
  if (s.kind === "dice") {
    if (s.seats.some((p) => p.hand.length)) throw new Error("cards in dice mode");
    for (const p of s.seats) {
      if (p.alive && s.phase !== "gameover" && p.dice.length !== DICE) throw new Error("wrong dice count");
      if (!p.alive && p.dice.length) throw new Error("dead player holds dice");
      if (p.dice.some((d) => d < 1 || d > 6)) throw new Error("bad die");
    }
    if (s.bid && (s.bid.f < 2 || s.bid.f > 6 || s.bid.q < 1)) throw new Error("bad bid");
  } else if (s.seats.some((p) => p.dice.length)) throw new Error("dice in card mode");
  for (const p of s.seats) {
    if (!p.alive && p.hand.length) throw new Error("dead player holds cards");
    if (p.pulls > 6) throw new Error("more than 6 pulls");
  }
  if (s.phase === "playing") {
    const t = s.seats[s.turn];
    if (!t.alive) throw new Error("dead player's turn");
    if (s.kind === "cards" && !t.hand.length && !s.pile) throw new Error("turn with no cards and nothing to call");
  }
  const v = viewFor(s, 0);
  if (v.seats.some((p, i) => i !== 0 && (p.hand || p.dice))) throw new Error("view leaks hands");
  if (s.event === "blind" && v.seats[0].hand?.some((c) => c.rank !== "?")) throw new Error("blind round shows cards");
  if (v.pile && v.pile.cards) throw new Error("view leaks pile");
}

for (let g = 0; g < GAMES; g++) {
  const n = 2 + (g % (MAX_SEATS - 1));
  // Mix in "offline humans" to exercise the autopilot path.
  const seats = Array.from({ length: n }, (_, i) =>
    i === 1 && g % 5 === 0
      ? { name: "H", avatar: "x", kind: "human" }
      : { name: "B" + i, avatar: "x", kind: "bot", persona: personas[i] });
  let now = 0;
  const mode = MODES[g % MODES.length];
  let s = createGame(seats, { turnMs: 30000, pullMs: 15000, mode }, now);
  let deathsThisCall = 0;
  if (g % 5 === 0) s = reduce(s, { type: "presence", seat: 1, connected: false, now });
  let guard = 0;
  while (s.phase !== "gameover") {
    check(s);
    const plan = schedule(s, now);
    if (!plan) throw new Error("stalled in phase " + s.phase);
    now += plan.delay;
    const next = reduce(s, { ...plan.make(s), now });
    if (next === s) throw new Error("scheduled action rejected in " + s.phase + ": " + JSON.stringify(plan.make(s)));
    const t = next.log[0]?.type;
    if (next.log[0] !== s.log[0]) {
      if (t === "call") { calls++; deathsThisCall = 0; }
      if (t === "devil") devils++;
      if (t === "bid") bids++;
      if (t === "chaos") events[next.log[0].event] = (events[next.log[0].event] || 0) + 1;
      if (t === "dead" && ++deathsThisCall === 2) multiDeaths++;
    }
    s = next;
    steps++;
    if (++guard > 5000) throw new Error("game did not end");
  }
  check(s);
  rounds += s.round;
  maxRounds = Math.max(maxRounds, s.round);
  wins[s.winner]++;
}

if (GAMES >= 200 && (!devils || !multiDeaths)) throw new Error("devil path never exercised");
if (GAMES >= 200 && (!bids || CHAOS.some((e) => !events[e]))) throw new Error("dice or a chaos event never exercised");
console.log(`${GAMES} games OK · avg ${(rounds / GAMES).toFixed(1)} rounds (max ${maxRounds}) · ${steps} steps · ${calls} calls · ${devils} devil reveals (${multiDeaths} multi-kills) · ${bids} dice bids · chaos ${JSON.stringify(events)} · wins by seat ${wins.join("/")}`);
