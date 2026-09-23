// Pure game engine. Only the host (or the solo player's own browser) runs it;
// guests receive a filtered view from `viewFor` and send actions back.
//
// Rules: 24 cards (8× K/Q/A), 5 per living player. Each round has a table
// card. On your turn play 1–3 cards face down claiming they are all the table
// card, or call "Liar!" on the previous play. The loser of a call faces the
// revolver (1 bullet in 6 chambers, chamber advances every pull). When nobody
// after you has cards left, the next living player is forced to call.

export const RKEYS = ["K", "Q", "A"];
export const HAND = 5;
export const MAX_SEATS = 4;
export const MAX_PLAY = 3;

export const PERSONAS = {
  pig: { name: "სკაბი", avatar: "🐷", bluff: 0.5, call: 0.34, desc: "აგრესიული" },
  fox: { name: "ფოქსი", avatar: "🦊", bluff: 0.3, call: 0.55, desc: "ეშმაკი" },
  bull: { name: "ტოარი", avatar: "🐂", bluff: 0.12, call: 0.24, desc: "ფრთხილი" },
  cat: { name: "მურკა", avatar: "🐱", bluff: 0.38, call: 0.42, desc: "ცბიერი" },
};
// Stand-in brain for a human who dropped offline mid-game.
const AUTOPILOT = { bluff: 0.25, call: 0.3 };

// Quip counts per event type; the UI owns the actual text (src/i18n.js).
export const QUIP_COUNTS = { play: 10, call: 8, truth: 6, bluff: 6, safe: 8, dead: 8, win: 5 };

const TIMING = {
  deal: 1300,
  reveal: 3600,
  spin: 1400,
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

function nextWhere(s, from, pred) {
  const n = s.seats.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (pred(i)) return i;
  }
  return -1;
}
const nextAlive = (s, from) => nextWhere(s, from, (i) => s.seats[i].alive);

/** Seat whose "brain" is the engine: bots, and humans who went offline. */
export const isAuto = (seat) => seat.kind === "bot" || !seat.connected;

/** The player to act has no cards left but a pile to answer, so calling is their only move. */
export function mustCall(s) {
  if (s.phase !== "playing" || !s.pile || s.pile.by === s.turn) return false;
  return s.seats[s.turn].hand.length === 0;
}

function pushLog(s, ev, quipType) {
  const e = { id: s.uid++, ...ev };
  if (quipType && QUIP_COUNTS[quipType]) e.quip = rnd(QUIP_COUNTS[quipType]);
  s.log = [e, ...s.log].slice(0, 60);
}

function setTurn(s, i, now) {
  s.turn = i;
  const seat = s.seats[i];
  s.deadline = s.opts.turnMs && seat && !isAuto(seat) ? now + s.opts.turnMs : null;
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
      clientId: p.clientId || null,
      connected: true,
      alive: true,
      hand: [],
      bullet: rnd(6),
      pulls: 0,
    })),
    opts: { turnMs: 0, pullMs: 0, ...opts },
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
  deal(s, rnd(s.seats.length), now);
  return s;
}

function deal(s, starter, now) {
  const deck = [];
  let id = s.uid * 100; // unique across rounds
  for (const r of RKEYS) for (let k = 0; k < 8; k++) deck.push({ id: id++, rank: r });
  shuffle(deck);
  for (const seat of s.seats) seat.hand = seat.alive ? deck.splice(0, HAND) : [];
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
}

// ---------------------------------------------------------------- reducer ---

const clone = (s) => ({
  ...s,
  seats: s.seats.map((p) => ({ ...p, hand: [...p.hand] })),
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
      if (state.phase !== "playing" || a.seat !== state.turn || mustCall(state)) return state;
      const ids = Array.isArray(a.ids) ? [...new Set(a.ids)] : [];
      const hand = state.seats[a.seat].hand;
      if (ids.length < 1 || ids.length > MAX_PLAY || !ids.every((id) => hand.some((c) => c.id === id))) return state;
      const s = clone(state);
      const me = s.seats[a.seat];
      const played = me.hand.filter((c) => ids.includes(c.id));
      me.hand = me.hand.filter((c) => !ids.includes(c.id));
      s.pile = { by: a.seat, cards: played.map((c) => ({ rank: c.rank })), count: played.length };
      pushLog(s, { type: "play", seat: a.seat, n: played.length, rank: s.tableCard, auto: !!a.auto }, me.kind === "bot" && Math.random() < 0.4 ? "play" : null);
      let nxt = nextWhere(s, a.seat, (i) => i !== a.seat && withCards(s, i));
      if (nxt === -1) nxt = nextAlive(s, a.seat); // nobody can answer with cards → forced call
      setTurn(s, nxt, now);
      return s;
    }

    case "call": {
      if (state.phase !== "playing" || a.seat !== state.turn) return state;
      const pile = state.pile;
      if (!pile || pile.by === a.seat) return state;
      const s = clone(state);
      const truthful = pile.cards.every((c) => c.rank === s.tableCard);
      s.reveal = { cards: pile.cards, truthful, accuser: a.seat, by: pile.by };
      s.pile = null;
      s.phase = "reveal";
      s.deadline = null;
      pushLog(s, { type: "call", seat: a.seat, other: pile.by, auto: !!a.auto }, "call");
      return s;
    }

    case "toRoulette": {
      if (state.phase !== "reveal" || !state.reveal) return state;
      const s = clone(state);
      const { truthful, accuser, by } = s.reveal;
      const victim = truthful ? accuser : by;
      pushLog(s, { type: truthful ? "truth" : "bluff", seat: by, other: accuser }, truthful ? "truth" : "bluff");
      s.roulette = { victim, reason: truthful ? "wrongCall" : "caught", spinning: false, result: null };
      s.phase = "roulette";
      s.deadline = s.opts.pullMs && !isAuto(s.seats[victim]) ? now + s.opts.pullMs : null;
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
      const fired = v.pulls === v.bullet;
      v.pulls += 1;
      if (fired) {
        v.alive = false;
        v.hand = [];
      }
      s.roulette = { ...r, spinning: false, result: fired ? "dead" : "safe", chamber: v.pulls - 1 };
      pushLog(s, { type: fired ? "dead" : "safe", seat: r.victim }, fired ? "dead" : "safe");
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
      deal(s, r.result === "dead" ? nextAlive(s, r.victim) : r.victim, now);
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

export function botDecide(s, i) {
  const me = s.seats[i];
  const pa = me.kind === "bot" ? PERSONAS[me.persona] || AUTOPILOT : AUTOPILOT;
  const pile = s.pile;
  if (mustCall(s)) return { type: "call", seat: i, auto: me.kind !== "bot" };
  if (pile && pile.by !== i) {
    const mine = me.hand.filter((c) => c.rank === s.tableCard).length;
    const byLeft = s.seats[pile.by].hand.length;
    let p = pa.call + (pile.count - 1) * 0.16 + mine * 0.11 + (me.hand.length <= 2 ? 0.12 : 0) + (byLeft === 0 ? 0.1 : 0) + (Math.random() - 0.5) * 0.18;
    if (Math.random() < p) return { type: "call", seat: i, auto: me.kind !== "bot" };
  }
  const match = me.hand.filter((c) => c.rank === s.tableCard);
  const other = me.hand.filter((c) => c.rank !== s.tableCard);
  const bluff = !match.length || Math.random() < pa.bluff;
  let pool = !bluff ? match : other.length ? other : me.hand;
  const n = Math.min(pool.length, 1 + rnd(bluff ? 2 : 3));
  let toPlay = shuffle([...pool]).slice(0, n);
  if (!toPlay.length) toPlay = me.hand.slice(0, 1);
  return { type: "play", seat: i, ids: toPlay.map((c) => c.id), auto: me.kind !== "bot" };
}

/** Timeout fallback for a human who is connected but idle. */
function afkAction(s) {
  const me = s.seats[s.turn];
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
      if (r.spinning) return { delay: TIMING.spin, make: () => ({ type: "resolvePull" }) };
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
  return {
    me,
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
    log: s.log,
    seats: s.seats.map((p) => ({
      idx: p.idx,
      name: p.name,
      avatar: p.avatar,
      kind: p.kind,
      connected: p.connected,
      alive: p.alive,
      pulls: p.pulls,
      handCount: p.hand.length,
      hand: p.idx === me ? p.hand : null,
    })),
  };
}
