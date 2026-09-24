// Pure game engine. Only the host (or the solo player's own browser) runs it;
// guests receive a filtered view from `viewFor` and send actions back.
//
// Rules: 20 cards (6× K/Q/A + 2 specials), 5 per living player. Each round
// has a table card. On your turn play 1–3 cards face down claiming they are
// all the table card, or call "Liar!" on the previous play. Jokers count as
// any card. The loser of a call faces the revolver (1 bullet in 6 chambers,
// chamber advances every pull). When nobody after you has cards left, the
// next living player is forced to call.
//
// Devil mode swaps one joker for the devil card: it also counts as any card,
// and when a call reveals it, everyone except the player who played it faces
// the revolver, one after another.

export const RKEYS = ["K", "Q", "A"];
export const JOKER = "J";
export const DEVIL = "D";
export const WILD = new Set([JOKER, DEVIL]);
export const MODES = ["classic", "devil"];
export const HAND = 5;
const PER_RANK = 6;
const SUITS = ["S", "H", "D", "C", "H", "S"]; // cosmetic only
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
export const QUIP_COUNTS = { play: 10, call: 8, truth: 6, bluff: 6, safe: 8, dead: 8, win: 5, devil: 6 };

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
export const counts = (card, tableCard) => card.rank === tableCard || WILD.has(card.rank);

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

function armPull(s, now) {
  const v = s.seats[s.roulette.victim];
  s.deadline = s.opts.pullMs && !isAuto(v) ? now + s.opts.pullMs : null;
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
    opts: { turnMs: 0, pullMs: 0, mode: "classic", ...opts },
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
  for (const r of RKEYS) for (let k = 0; k < PER_RANK; k++) deck.push({ id: id++, rank: r, suit: SUITS[k] });
  deck.push({ id: id++, rank: JOKER }, { id: id++, rank: s.opts.mode === "devil" ? DEVIL : JOKER });
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
        victims = [truthful ? accuser : by];
        reason = truthful ? "wrongCall" : "caught";
        pushLog(s, { type: truthful ? "truth" : "bluff", seat: by, other: accuser }, truthful ? "truth" : "bluff");
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
      if (r.queue?.length) {
        const [victim, ...queue] = r.queue;
        s.roulette = { ...r, victim, queue, spinning: false, result: null, chamber: undefined };
        armPull(s, now);
        return s;
      }
      const starter = r.starter ?? (r.result === "dead" ? nextAlive(s, r.victim) : r.victim);
      deal(s, s.seats[starter].alive ? starter : nextAlive(s, starter), now);
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
  const n = Math.min(pool.length, 1 + rnd(bluff ? 2 : 3));
  let toPlay = shuffle([...pool]).slice(0, n);
  // Bait: a bot holding the devil loves to slip it into an honest play.
  const devil = me.hand.find((c) => c.rank === DEVIL);
  if (devil && !bluff && !toPlay.includes(devil) && Math.random() < 0.6) toPlay = [devil, ...toPlay].slice(0, MAX_PLAY);
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
