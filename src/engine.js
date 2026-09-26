// Pure game engine. Only the host (or the solo player's own browser) runs it;
// guests receive a filtered view from `viewFor` and send actions back.
//
// Rules: 20 cards (6× K/Q/A + 2 specials; 32 cards with 10 each for 5–6
// players), 5 per living player. Each round
// has a table card. On your turn play 1–3 cards face down claiming they are
// all the table card, or call "Liar!" on the previous play. Jokers count as
// any card. The loser of a call faces the revolver (1 bullet in 6 chambers,
// chamber advances every pull). When nobody after you has cards left, the
// next living player is forced to call.
//
// Devil mode swaps one joker for the devil card: it also counts as any card,
// and when a call reveals it, everyone except the player who played it faces
// the revolver, one after another.
//
// Chaos mode draws a random event for every round (see CHAOS).
//
// Dice mode (Liar's Dice) is a different game on the same table: everyone has
// 5 hidden dice; players take turns raising a bid "at least Q dice show F"
// (ones are wild) or call "Liar!" on the last bid. The loser drinks from the
// wine glasses: one of six is poisoned — the same odds as the revolver.

export const RKEYS = ["K", "Q", "A"];
export const JOKER = "J";
export const DEVIL = "D";
export const WILD = new Set([JOKER, DEVIL]);
export const MODES = ["classic", "devil", "chaos", "dice"];
/** Chaos-mode round events. */
export const CHAOS = ["double", "reverse", "blind", "speed", "jokers", "safe", "single", "duel", "devil"];
export const DICE = 5;
const SPEED_MS = 10000;
export const HAND = 5;
const SUITS = ["S", "H", "D", "C"]; // cosmetic only
/** Cards of each rank: enough for everyone to get a full hand. */
export const perRank = (players) => (players > 4 ? 10 : 6);
export const MAX_SEATS = 6;
export const MAX_PLAY = 3;

export const PERSONAS = {
  pig: { name: "სკაბი", avatar: "av_pig", bluff: 0.5, call: 0.34, desc: "აგრესიული" },
  fox: { name: "ფოქსი", avatar: "av_fox", bluff: 0.3, call: 0.55, desc: "ეშმაკი" },
  bull: { name: "ჯიქა", avatar: "av_tur", bluff: 0.12, call: 0.24, desc: "ფრთხილი" },
  cat: { name: "ხინკალა", avatar: "av_khinkali", bluff: 0.38, call: 0.42, desc: "ცბიერი" },
  bear: { name: "ბერა", avatar: "av_bear", bluff: 0.22, call: 0.46, desc: "მოუთმენელი" },
};
// Stand-in brain for a human who dropped offline mid-game.
const AUTOPILOT = { bluff: 0.25, call: 0.3 };

// Quip counts per event type; the UI owns the actual text (src/i18n.js).
export const QUIP_COUNTS = { play: 10, call: 8, truth: 6, bluff: 6, safe: 8, dead: 8, win: 5, devil: 6, bid: 8 };

const TIMING = {
  deal: 1300,
  reveal: 3600,
  spin: 1400,
  spinSlow: 2800, // dramatic pulls play in slow motion
  afterSafe: 1700,
  afterDead: 2600,
  botMin: 1100,
  botJitter: 1000,
  botPull: 1500,
  offline: 1600,
};

const rnd = (n) => (Math.random() * n) | 0;
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------------------------------------------------------------- helpers ---

const withCards = (s, i) => s.seats[i].alive && s.seats[i].hand.length > 0;
export const counts = (card, tableCard) => card.rank === tableCard || WILD.has(card.rank);

function nextWhere(s, from, pred, dir = 1) {
  const n = s.seats.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if (pred(i)) return i;
  }
  return -1;
}
const nextAlive = (s, from, dir = 1) => nextWhere(s, from, (i) => s.seats[i].alive, dir);
/** Turn order this round (chaos "reverse" flips it). */
const dirOf = (s) => (s.event === "reverse" ? -1 : 1);
/** Most cards you may put down at once this round. */
export const maxPlay = (s) => (s.event === "single" ? 1 : MAX_PLAY);
export const totalDice = (s) => s.seats.reduce((n, p) => n + (p.alive ? p.dice?.length || 0 : 0), 0);

/**
 * A pull worth slowing down for: the odds are 1 in 2 or worse, or only two
 * players are left. The engine waits longer so every client can play it slow.
 */
export function dramatic(s) {
  const r = s.roulette;
  if (!r || !s.seats[r.victim]) return false;
  return s.seats[r.victim].pulls >= 4 || s.seats.filter((p) => p.alive).length === 2;
}

/** Seat whose "brain" is the engine: bots, and humans who went offline. */
export const isAuto = (seat) => seat.kind === "bot" || !seat.connected;

/**
 * Calling is the only move: cards — no cards left but a pile to answer;
 * dice — the last bid is already the highest possible.
 */
export function mustCall(s) {
  if (s.phase !== "playing") return false;
  if (s.kind === "dice") return !!s.bid && s.bid.by !== s.turn && s.bid.q >= totalDice(s) && s.bid.f === 6;
  if (!s.pile || s.pile.by === s.turn) return false;
  return s.seats[s.turn].hand.length === 0;
}

function pushLog(s, ev, quipType) {
  const e = { id: s.uid++, ...ev };
  if (quipType && QUIP_COUNTS[quipType]) e.quip = rnd(QUIP_COUNTS[quipType]);
  s.log = [e, ...s.log].slice(0, 60);
}

function armPull(s, now) {
  const v = s.seats[s.roulette.victim];
  s.deadline = s.opts.pullMs && !isAuto(v) ? now + s.opts.pullMs : null;
}

function setTurn(s, i, now) {
  s.turn = i;
  const seat = s.seats[i];
  const ms = s.event === "speed" ? SPEED_MS : s.opts.turnMs;
  s.deadline = ms && seat && !isAuto(seat) ? now + ms : null;
}

// ------------------------------------------------------------------ setup ---

/**
 * @param seats [{ name, avatar, kind: "human"|"bot", persona?, clientId? }]
 * @param opts  { turnMs, pullMs } — 0 disables the AFK timers (solo play)
 */
export function createGame(seats, opts = {}, now = Date.now()) {
  const s = {
    seats: seats.map((p, i) => ({
      idx: i,
      name: p.name,
      avatar: p.avatar,
      kind: p.kind,
      persona: p.persona || null,
      looks: p.looks || null, // cosmetic accessories: { hat, eyes, ... }
      clientId: p.clientId || null,
      connected: true,
      alive: true,
      hand: [],
      dice: [],
      bullet: rnd(6),
      pulls: 0,
    })),
    opts: { turnMs: 0, pullMs: 0, mode: "classic", ...opts },
    kind: opts.mode === "dice" ? "dice" : "cards",
    event: null,
    bid: null,
    phase: "dealing",
    tableCard: "K",
    turn: 0,
    pile: null,
    reveal: null,
    roulette: null,
    winner: null,
    round: 0,
    deadline: null,
    uid: 1,
    log: [],
  };
  pushLog(s, { type: "start" });
  newRound(s, rnd(s.seats.length), now);
  return s;
}

const newRound = (s, starter, now) => (s.kind === "dice" ? roll(s, starter, now) : deal(s, starter, now));

/** Dice: everyone rolls five fresh dice. */
function roll(s, starter) {
  for (const seat of s.seats) seat.dice = seat.alive ? Array.from({ length: DICE }, () => 1 + rnd(6)) : [];
  s.bid = null;
  s.reveal = null;
  s.roulette = null;
  s.round += 1;
  s.phase = "dealing";
  const first = s.seats[starter]?.alive ? starter : nextAlive(s, starter);
  s.turn = first;
  s.deadline = null;
  pushLog(s, { type: "roll", seat: first, round: s.round });
}

function pickEvent(s) {
  const pool = CHAOS.filter((e) => e !== s.event);
  return pool[rnd(pool.length)];
}

function deal(s, starter, now) {
  const deck = [];
  let id = s.uid * 100; // unique across rounds
  const n = perRank(s.seats.length);
  for (const r of RKEYS) for (let k = 0; k < n; k++) deck.push({ id: id++, rank: r, suit: SUITS[k % SUITS.length] });
  deck.push({ id: id++, rank: JOKER }, { id: id++, rank: s.opts.mode === "devil" ? DEVIL : JOKER });
  shuffle(deck);
  for (const seat of s.seats) seat.hand = seat.alive ? deck.splice(0, HAND) : [];
  s.event = s.opts.mode === "chaos" ? pickEvent(s) : null;
  const holders = s.seats.filter((p) => p.alive && p.hand.length);
  if (s.event === "jokers") for (const p of holders) p.hand[rnd(p.hand.length)] = { id: id++, rank: JOKER };
  if (s.event === "devil" && holders.length) {
    const p = holders[rnd(holders.length)];
    p.hand[rnd(p.hand.length)] = { id: id++, rank: DEVIL };
  }
  s.tableCard = RKEYS[rnd(3)];
  s.pile = null;
  s.reveal = null;
  s.roulette = null;
  s.round += 1;
  s.phase = "dealing";
  const first = s.seats[starter]?.alive ? starter : nextAlive(s, starter);
  s.turn = first;
  s.deadline = null;
  pushLog(s, { type: "deal", seat: first, rank: s.tableCard, round: s.round });
  if (s.event) pushLog(s, { type: "chaos", event: s.event });
}

// ---------------------------------------------------------------- reducer ---

const clone = (s) => ({
  ...s,
  seats: s.seats.map((p) => ({ ...p, hand: [...p.hand], dice: [...(p.dice || [])] })), // snapshots from before dice mode have no dice
  log: s.log,
});

/**
 * Returns a new state, or the same object when the action is not allowed
 * (callers compare by identity to know whether anything happened).
 * Every action carries `now` (ms) from the host clock.
 */
export function reduce(state, a) {
  const now = a.now ?? Date.now();
  switch (a.type) {
    case "begin": {
      if (state.phase !== "dealing") return state;
      const s = clone(state);
      s.phase = "playing";
      setTurn(s, s.turn, now);
      return s;
    }

    case "play": {
      if (state.kind === "dice" || state.phase !== "playing" || a.seat !== state.turn || mustCall(state)) return state;
      const ids = Array.isArray(a.ids) ? [...new Set(a.ids)] : [];
      const hand = state.seats[a.seat].hand;
      if (ids.length < 1 || ids.length > maxPlay(state) || !ids.every((id) => hand.some((c) => c.id === id))) return state;
      const s = clone(state);
      const me = s.seats[a.seat];
      const played = me.hand.filter((c) => ids.includes(c.id));
      me.hand = me.hand.filter((c) => !ids.includes(c.id));
      s.pile = { by: a.seat, cards: played.map((c) => ({ rank: c.rank })), count: played.length };
      pushLog(s, { type: "play", seat: a.seat, n: played.length, rank: s.tableCard, auto: !!a.auto }, me.kind === "bot" && Math.random() < 0.4 ? "play" : null);
      const dir = dirOf(s);
      let nxt = nextWhere(s, a.seat, (i) => i !== a.seat && withCards(s, i), dir);
      if (nxt === -1) nxt = nextAlive(s, a.seat, dir); // nobody can answer with cards → forced call
      setTurn(s, nxt, now);
      return s;
    }

    case "bid": {
      if (state.kind !== "dice" || state.phase !== "playing" || a.seat !== state.turn) return state;
      const q = Math.floor(Number(a.q));
      const f = Math.floor(Number(a.f));
      const b = state.bid;
      if (!(f >= 2 && f <= 6 && q >= 1 && q <= totalDice(state))) return state;
      if (b && !(q > b.q || (q === b.q && f > b.f))) return state;
      const s = clone(state);
      s.bid = { by: a.seat, q, f };
      pushLog(s, { type: "bid", seat: a.seat, q, f, auto: !!a.auto }, s.seats[a.seat].kind === "bot" && Math.random() < 0.35 ? "bid" : null);
      setTurn(s, nextAlive(s, a.seat), now);
      return s;
    }

    case "call": {
      if (state.phase !== "playing" || a.seat !== state.turn) return state;
      if (state.kind === "dice") {
        const b = state.bid;
        if (!b || b.by === a.seat) return state;
        const s = clone(state);
        const count = s.seats.reduce((n, p) => n + (p.alive ? p.dice.filter((d) => d === b.f || d === 1).length : 0), 0);
        const truthful = count >= b.q;
        s.reveal = { dice: s.seats.map((p) => (p.alive ? [...p.dice] : [])), bid: b, count, truthful, accuser: a.seat, by: b.by };
        s.bid = null;
        s.phase = "reveal";
        s.deadline = null;
        pushLog(s, { type: "call", seat: a.seat, other: b.by, auto: !!a.auto }, "call");
        return s;
      }
      const pile = state.pile;
      if (!pile || pile.by === a.seat) return state;
      const s = clone(state);
      const truthful = pile.cards.every((c) => counts(c, s.tableCard));
      const devil = pile.cards.some((c) => c.rank === DEVIL);
      s.reveal = { cards: pile.cards, truthful, devil, accuser: a.seat, by: pile.by };
      s.pile = null;
      s.phase = "reveal";
      s.deadline = null;
      pushLog(s, { type: "call", seat: a.seat, other: pile.by, auto: !!a.auto }, "call");
      return s;
    }

    case "toRoulette": {
      if (state.phase !== "reveal" || !state.reveal) return state;
      const s = clone(state);
      const { truthful, devil, accuser, by } = s.reveal;
      let victims, reason, starter;
      if (devil) {
        // Everyone but the devil's owner, starting with the accuser.
        victims = [];
        for (let k = 0; k < s.seats.length; k++) {
          const i = (accuser + k) % s.seats.length;
          if (i !== by && s.seats[i].alive) victims.push(i);
        }
        reason = "devil";
        starter = by;
        pushLog(s, { type: "devil", seat: by, other: accuser }, "devil");
      } else {
        const loser = truthful ? accuser : by;
        // Chaos "duel": both sides of the call face the revolver, loser first.
        victims = s.event === "duel" ? [loser, loser === accuser ? by : accuser] : [loser];
        reason = s.event === "duel" ? "duel" : truthful ? "wrongCall" : "caught";
        pushLog(s, { type: truthful ? "truth" : "bluff", seat: by, other: accuser, count: s.reveal.count, q: s.reveal.bid?.q, f: s.reveal.bid?.f }, truthful ? "truth" : "bluff");
      }
      s.roulette = { victim: victims[0], queue: victims.slice(1), reason, starter, spinning: false, result: null };
      s.phase = "roulette";
      armPull(s, now);
      return s;
    }

    case "pull": {
      const r = state.roulette;
      if (state.phase !== "roulette" || !r || r.spinning || r.result || a.seat !== r.victim) return state;
      const s = clone(state);
      s.roulette = { ...r, spinning: true };
      s.deadline = null;
      return s;
    }

    case "resolvePull": {
      const r = state.roulette;
      if (state.phase !== "roulette" || !r?.spinning) return state;
      const s = clone(state);
      const v = s.seats[r.victim];
      // Chaos: "safe" jams the gun (the chamber doesn't even turn); "double" adds a second bullet.
      const jam = s.event === "safe";
      const fired = !jam && (v.pulls === v.bullet || (s.event === "double" && v.pulls < 5 && Math.random() < 1 / (6 - v.pulls)));
      if (!jam) v.pulls += 1;
      if (fired) {
        v.alive = false;
        v.hand = [];
        v.dice = [];
      }
      s.roulette = { ...r, spinning: false, result: fired ? "dead" : "safe", chamber: jam ? v.pulls : v.pulls - 1, jam };
      pushLog(s, { type: fired ? "dead" : "safe", seat: r.victim, wine: s.kind === "dice", jam }, fired ? "dead" : "safe");
      return s;
    }

    case "afterRoulette": {
      const r = state.roulette;
      if (state.phase !== "roulette" || !r?.result) return state;
      const s = clone(state);
      const alive = s.seats.filter((p) => p.alive);
      if (alive.length <= 1) {
        s.phase = "gameover";
        s.roulette = null;
        s.winner = alive[0] ? alive[0].idx : null;
        s.deadline = null;
        if (alive[0]) pushLog(s, { type: "win", seat: alive[0].idx }, "win");
        return s;
      }
      if (r.queue?.length) {
        const [victim, ...queue] = r.queue;
        s.roulette = { ...r, victim, queue, spinning: false, result: null, chamber: undefined };
        armPull(s, now);
        return s;
      }
      const starter = r.starter ?? (r.result === "dead" ? nextAlive(s, r.victim) : r.victim);
      newRound(s, s.seats[starter].alive ? starter : nextAlive(s, starter), now);
      return s;
    }

    case "presence": {
      const seat = state.seats[a.seat];
      if (!seat || seat.kind !== "human" || seat.connected === a.connected) return state;
      const s = clone(state);
      s.seats[a.seat].connected = a.connected;
      pushLog(s, { type: a.connected ? "back" : "left", seat: a.seat });
      // Re-arm or drop the AFK timer for whoever is on the clock.
      if (s.phase === "playing" && s.turn === a.seat) setTurn(s, a.seat, now);
      if (s.phase === "roulette" && s.roulette?.victim === a.seat && !s.roulette.spinning && !s.roulette.result)
        s.deadline = s.opts.pullMs && a.connected ? now + s.opts.pullMs : null;
      return s;
    }

    default:
      return state;
  }
}

// -------------------------------------------------------------------- bots ---

/** Dice bot: expects a third of unseen dice to match (a face or a wild one). */
function diceDecide(s, i, pa) {
  const me = s.seats[i];
  const auto = me.kind !== "bot";
  const total = totalDice(s);
  const others = total - me.dice.length;
  const mine = (f) => me.dice.filter((d) => d === f || d === 1).length;
  const expect = (f) => mine(f) + others / 3;
  const b = s.bid;
  if (b && b.by !== i) {
    if (mustCall(s)) return { type: "call", seat: i, auto };
    const margin = 1.6 - pa.call * 2 + (Math.random() - 0.5) * 0.8;
    if (b.q - expect(b.f) > margin) return { type: "call", seat: i, auto };
  }
  const faces = [2, 3, 4, 5, 6];
  let f = faces[rnd(5)];
  for (const x of faces) if (mine(x) > mine(f)) f = x;
  if (Math.random() < pa.bluff * 0.4) f = faces[rnd(5)];
  let q = !b ? Math.max(1, Math.round(expect(f) * 0.7)) : f > b.f ? b.q : b.q + 1;
  if (b && q < expect(f) - 1 && Math.random() < 0.3) q += 1;
  if (q > total) {
    if (b) return { type: "call", seat: i, auto };
    q = total;
  }
  return { type: "bid", seat: i, q, f, auto };
}

export function botDecide(s, i) {
  const me = s.seats[i];
  const pa = me.kind === "bot" ? PERSONAS[me.persona] || AUTOPILOT : AUTOPILOT;
  if (s.kind === "dice") return diceDecide(s, i, pa);
  const pile = s.pile;
  if (mustCall(s)) return { type: "call", seat: i, auto: me.kind !== "bot" };
  const holdsDevil = me.hand.some((c) => c.rank === DEVIL);
  if (pile && pile.by !== i) {
    // Table cards and wilds I hold are ones the pile can't contain.
    const mine = me.hand.filter((c) => counts(c, s.tableCard)).length;
    const byLeft = s.seats[pile.by].hand.length;
    const devilRisk = s.opts.mode === "devil" && !holdsDevil ? 0.07 : 0;
    let p = pa.call + (pile.count - 1) * 0.16 + mine * 0.1 + (me.hand.length <= 2 ? 0.12 : 0) + (byLeft === 0 ? 0.1 : 0) - devilRisk + (Math.random() - 0.5) * 0.18;
    if (Math.random() < p) return { type: "call", seat: i, auto: me.kind !== "bot" };
  }
  const match = me.hand.filter((c) => counts(c, s.tableCard));
  const other = me.hand.filter((c) => !counts(c, s.tableCard));
  const bluff = !match.length || Math.random() < pa.bluff;
  let pool = !bluff ? match : other.length ? other : me.hand;
  const n = Math.min(pool.length, 1 + rnd(bluff ? 2 : 3), maxPlay(s));
  let toPlay = shuffle([...pool]).slice(0, n);
  // Bait: a bot holding the devil loves to slip it into an honest play.
  const devil = me.hand.find((c) => c.rank === DEVIL);
  if (devil && !bluff && !toPlay.includes(devil) && Math.random() < 0.6) toPlay = [devil, ...toPlay].slice(0, maxPlay(s));
  if (!toPlay.length) toPlay = me.hand.slice(0, 1);
  return { type: "play", seat: i, ids: toPlay.map((c) => c.id), auto: me.kind !== "bot" };
}

/** Timeout fallback for a human who is connected but idle. */
function afkAction(s) {
  const me = s.seats[s.turn];
  if (s.kind === "dice") return diceDecide(s, s.turn, AUTOPILOT);
  if (mustCall(s)) return { type: "call", seat: s.turn, auto: true };
  const c = me.hand[rnd(me.hand.length)];
  return { type: "play", seat: s.turn, ids: [c.id], auto: true };
}

// ---------------------------------------------------------------- schedule ---

/**
 * What the host should do next on its own, and when.
 * Returns { delay, make(state) → action } or null. Rescheduled on every change.
 */
export function schedule(s, now = Date.now()) {
  const until = (t) => Math.max(0, t - now);
  switch (s.phase) {
    case "dealing":
      return { delay: TIMING.deal, make: () => ({ type: "begin" }) };
    case "playing": {
      const seat = s.seats[s.turn];
      if (!seat) return null;
      if (isAuto(seat)) {
        const delay = seat.kind === "bot" ? TIMING.botMin + Math.random() * TIMING.botJitter : TIMING.offline;
        return { delay, make: (st) => botDecide(st, st.turn) };
      }
      if (s.deadline) return { delay: until(s.deadline), make: afkAction };
      return null;
    }
    case "reveal":
      return { delay: TIMING.reveal, make: () => ({ type: "toRoulette" }) };
    case "roulette": {
      const r = s.roulette;
      if (!r) return null;
      if (r.spinning) return { delay: dramatic(s) ? TIMING.spinSlow : TIMING.spin, make: () => ({ type: "resolvePull" }) };
      if (r.result) return { delay: r.result === "dead" ? TIMING.afterDead : TIMING.afterSafe, make: () => ({ type: "afterRoulette" }) };
      const v = s.seats[r.victim];
      if (isAuto(v)) return { delay: TIMING.botPull, make: () => ({ type: "pull", seat: r.victim }) };
      if (s.deadline) return { delay: until(s.deadline), make: () => ({ type: "pull", seat: r.victim, auto: true }) };
      return null;
    }
    default:
      return null;
  }
}

// -------------------------------------------------------------------- view ---

/** What seat `me` is allowed to see. Hands of others, bullets and face-down cards stay on the host. */
export function viewFor(s, me) {
  const blind = s.event === "blind"; // chaos: your own cards stay face down
  return {
    me,
    kind: s.kind,
    event: s.event,
    bid: s.bid,
    maxPlay: maxPlay(s),
    totalDice: s.kind === "dice" ? totalDice(s) : 0,
    phase: s.phase,
    tableCard: s.tableCard,
    turn: s.turn,
    round: s.round,
    winner: s.winner,
    deadline: s.deadline,
    mustCall: mustCall(s),
    opts: s.opts,
    pile: s.pile && { by: s.pile.by, count: s.pile.count },
    reveal: s.reveal,
    roulette: s.roulette,
    dramatic: s.phase === "roulette" && dramatic(s),
    log: s.log,
    seats: s.seats.map((p) => ({
      idx: p.idx,
      name: p.name,
      avatar: p.avatar,
      looks: p.looks,
      kind: p.kind,
      connected: p.connected,
      alive: p.alive,
      pulls: p.pulls,
      handCount: s.kind === "dice" ? p.dice.length : p.hand.length,
      hand: p.idx === me ? (blind ? p.hand.map((c) => ({ id: c.id, rank: "?" })) : p.hand) : null,
      dice: p.idx === me ? p.dice : null,
    })),
  };
}
