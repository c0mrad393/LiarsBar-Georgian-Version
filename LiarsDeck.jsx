import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * Liar's Deck — a 2D web game inspired by Liar's Bar.
 * Single-file React component styled with Tailwind CSS.
 *
 * Rules implemented:
 *  - Deck: Kings, Queens, Aces (6 each) + 2 Jokers (wild).
 *  - Each round a random "Table Card" is chosen; everyone gets 5 cards.
 *  - On your turn you place 1–3 cards face-down and declare them the Table Card.
 *    Jokers are wild and always count as a match.
 *  - The next active player may either play their own cards OR call "Liar!".
 *  - If the revealed cards all match the claim -> the accuser loses.
 *    If it was a bluff -> the bluffer loses.
 *  - The loser faces Russian Roulette. Each player has their own 6-chamber
 *    revolver with a single bullet; the chamber does NOT spin between pulls,
 *    so the odds rise with every survived shot. Last survivor wins.
 */

const SUITS = {
  K: { label: "K", name: "King", glyph: "♚", color: "text-rose-400" },
  Q: { label: "Q", name: "Queen", glyph: "♛", color: "text-sky-400" },
  A: { label: "A", name: "Ace", glyph: "♠", color: "text-amber-300" },
  J: { label: "★", name: "Joker", glyph: "🃏", color: "text-fuchsia-400" },
};

const PLURAL = { K: "Kings", Q: "Queens", A: "Aces" };

let CARD_UID = 0;

function buildDeck() {
  const deck = [];
  for (const rank of ["K", "Q", "A"]) {
    for (let i = 0; i < 6; i++) deck.push({ id: CARD_UID++, rank });
  }
  for (let i = 0; i < 2; i++) deck.push({ id: CARD_UID++, rank: "J" });
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const randRank = () => ["K", "Q", "A"][Math.floor(Math.random() * 3)];

// A card "matches" the claim if it is that rank or a wild Joker.
const cardMatches = (card, claim) => card.rank === claim || card.rank === "J";

const SEAT_POS = [
  // index matches player index; 0 = human (bottom)
  { wrap: "bottom-2 left-1/2 -translate-x-1/2", chip: "bottom-[150px] left-1/2 -translate-x-1/2" },
  { wrap: "top-1/2 left-2 -translate-y-1/2", chip: "top-1/2 left-[150px] -translate-y-1/2" },
  { wrap: "top-2 left-1/2 -translate-x-1/2", chip: "top-[150px] left-1/2 -translate-x-1/2" },
  { wrap: "top-1/2 right-2 -translate-y-1/2", chip: "top-1/2 right-[150px] -translate-y-1/2" },
];

export default function LiarsDeck() {
  const [players, setPlayers] = useState([]); // {id,name,isHuman,hand,alive,bullet,pulls}
  const [tableCard, setTableCard] = useState("Q");
  const [turn, setTurn] = useState(0);
  const [pile, setPile] = useState(null); // {by, cards:[{id,rank}], count}
  const [selected, setSelected] = useState([]); // card ids
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle|playing|roulette|gameover
  const [roulette, setRoulette] = useState(null); // {victim, reason, resolving, result}
  const [reveal, setReveal] = useState(null); // {cards, claim, truthful}
  const [winner, setWinner] = useState(null);
  const [round, setRound] = useState(0);
  const [banner, setBanner] = useState("");

  const timers = useRef([]);
  const after = useCallback((ms, fn) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pushLog = useCallback((text, kind = "info") => {
    setLog((l) => [{ id: Date.now() + Math.random(), text, kind }, ...l].slice(0, 40));
  }, []);

  // ---- Game setup -------------------------------------------------------
  const newGame = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const base = [
      { id: 0, name: "You", isHuman: true },
      { id: 1, name: "Bot 1", isHuman: false },
      { id: 2, name: "Bot 2", isHuman: false },
      { id: 3, name: "Bot 3", isHuman: false },
    ].map((p) => ({
      ...p,
      hand: [],
      alive: true,
      bullet: Math.floor(Math.random() * 6),
      pulls: 0,
    }));
    setWinner(null);
    setLog([]);
    setReveal(null);
    setRoulette(null);
    setRound(0);
    setBanner("");
    pushLog("A new game begins. Four players sit at the table.", "system");
    startRound(base, 0);
  }, [pushLog]);

  // deal a fresh round
  const startRound = useCallback(
    (currentPlayers, starterIdx) => {
      const deck = buildDeck();
      const alive = currentPlayers.filter((p) => p.alive);
      const dealt = currentPlayers.map((p) => {
        if (!p.alive) return { ...p, hand: [] };
        return { ...p, hand: deck.splice(0, 5).map((c) => ({ ...c })) };
      });
      const tc = randRank();
      setTableCard(tc);
      setPile(null);
      setSelected([]);
      setReveal(null);
      setPlayers(dealt);
      setPhase("playing");
      setRound((r) => r + 1);

      // pick a valid starter (alive, has cards)
      let s = starterIdx;
      for (let i = 0; i < dealt.length; i++) {
        const idx = (starterIdx + i) % dealt.length;
        if (dealt[idx].alive && dealt[idx].hand.length) {
          s = idx;
          break;
        }
      }
      setTurn(s);
      setBanner(`Table Card: ${PLURAL[tc]}`);
      after(1600, () => setBanner(""));
      pushLog(
        `New round — the Table Card is ${PLURAL[tc]}. ${dealt[s].name} start${
          dealt[s].isHuman ? "" : "s"
        }.`,
        "system"
      );
    },
    [after, pushLog]
  );

  useEffect(() => {
    newGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Turn helpers -----------------------------------------------------
  const nextActive = useCallback((list, from) => {
    for (let i = 1; i <= list.length; i++) {
      const idx = (from + i) % list.length;
      if (list[idx].alive && list[idx].hand.length > 0) return idx;
    }
    return -1;
  }, []);

  const aliveCount = (list) => list.filter((p) => p.alive).length;

  // ---- Playing cards ----------------------------------------------------
  const commitPlay = useCallback(
    (playerIdx, cardIds) => {
      setPlayers((prev) => {
        const list = prev.map((p) => ({ ...p, hand: [...p.hand] }));
        const me = list[playerIdx];
        const played = me.hand.filter((c) => cardIds.includes(c.id));
        me.hand = me.hand.filter((c) => !cardIds.includes(c.id));

        const newPile = {
          by: playerIdx,
          cards: played.map((c) => ({ id: c.id, rank: c.rank })),
          count: played.length,
        };
        setPile(newPile);
        pushLog(
          `${me.name} placed ${played.length} ${PLURAL[tableCard]} face-down.`,
          me.isHuman ? "player" : "bot"
        );

        // who acts next?
        const nxt = nextActive(list, playerIdx);
        const stillHave = list.filter((p) => p.alive && p.hand.length > 0);
        if (nxt === -1 || (stillHave.length === 1 && stillHave[0].id === me.id)) {
          // everyone else is out of cards -> round resets, no challenge
          after(1200, () => {
            pushLog("Everyone else is out of cards — the round resets.", "system");
            startRound(list, playerIdx);
          });
        } else {
          setTurn(nxt);
        }
        return list;
      });
      setSelected([]);
    },
    [after, nextActive, pushLog, startRound, tableCard]
  );

  const humanPlay = () => {
    if (phase !== "playing" || turn !== 0 || selected.length < 1 || selected.length > 3) return;
    commitPlay(0, selected);
  };

  // ---- Challenge resolution --------------------------------------------
  const resolveChallenge = useCallback(
    (accuserIdx) => {
      if (!pile) return;
      setPlayers((prev) => {
        const list = prev.map((p) => ({ ...p }));
        const accuser = list[accuserIdx];
        const claimer = list[pile.by];
        const truthful = pile.cards.every((c) => cardMatches(c, tableCard));
        const loserIdx = truthful ? accuserIdx : pile.by;

        pushLog(
          `${accuser.name} call${accuser.isHuman ? "" : "s"} LIAR! on ${claimer.name}.`,
          "alert"
        );
        setReveal({ cards: pile.cards, claim: tableCard, truthful });

        after(2200, () => {
          pushLog(
            truthful
              ? `The cards were all ${PLURAL[tableCard]} (or wild). ${claimer.name} told the truth — ${accuser.name} loses!`
              : `It was a BLUFF! ${claimer.name} loses!`,
            "alert"
          );
          setReveal(null);
          openRoulette(loserIdx, truthful ? "wrongful accusation" : "caught bluffing");
        });
        return list;
      });
    },
    [after, pile, pushLog, tableCard]
  );

  const humanChallenge = () => {
    if (phase !== "playing" || turn !== 0 || !pile || pile.by === 0) return;
    resolveChallenge(0);
  };

  // ---- Russian Roulette -------------------------------------------------
  const openRoulette = useCallback(
    (victimIdx, reason) => {
      setPhase("roulette");
      setPile(null);
      setRoulette({ victim: victimIdx, reason, resolving: false, result: null });
    },
    []
  );

  const pullTrigger = useCallback(() => {
    setRoulette((r) => {
      if (!r || r.resolving || r.result) return r;
      return { ...r, resolving: true };
    });
  }, []);

  // animate + resolve the pull
  useEffect(() => {
    if (!roulette || !roulette.resolving || roulette.result) return;
    const t = after(900, () => {
      setPlayers((prev) => {
        const list = prev.map((p) => ({ ...p }));
        const v = list[roulette.victim];
        const fired = v.pulls === v.bullet;
        v.pulls += 1;
        let died = false;
        if (fired) {
          v.alive = false;
          died = true;
          pushLog(`💥 BANG! ${v.name} ${v.isHuman ? "are" : "is"} eliminated.`, "alert");
        } else {
          pushLog(`*click* — ${v.name} survive${v.isHuman ? "" : "s"} the trigger pull.`, "system");
        }

        setRoulette((r) => ({ ...r, resolving: false, result: died ? "dead" : "safe" }));

        // proceed after a beat
        after(1600, () => {
          const survivors = list.filter((p) => p.alive);
          if (survivors.length <= 1) {
            setWinner(survivors[0] || null);
            setPhase("gameover");
            setRoulette(null);
            if (survivors[0])
              pushLog(`🏆 ${survivors[0].name} ${survivors[0].isHuman ? "win" : "wins"} the game!`, "system");
          } else {
            setRoulette(null);
            const starter = died
              ? nextActive(list.map((p) => ({ ...p, hand: p.hand.length ? p.hand : [] })), roulette.victim)
              : roulette.victim;
            startRound(list, starter === -1 ? 0 : starter);
          }
        });
        return list;
      });
    });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roulette]);

  // ---- AI brain ---------------------------------------------------------
  useEffect(() => {
    if (phase !== "playing") return;
    const me = players[turn];
    if (!me || me.isHuman || !me.alive || me.hand.length === 0) return;

    const t = after(1100 + Math.random() * 800, () => {
      // 1) decide whether to challenge the previous pile
      if (pile && pile.by !== turn) {
        const myMatches = me.hand.filter((c) => cardMatches(c, tableCard)).length;
        // total of this rank in deck = 6 (+2 jokers). Estimate remaining plausibility.
        const claimed = pile.count;
        // suspicion grows with claimed count and with how many matches I'm holding
        let suspicion = 0.12;
        suspicion += (claimed - 1) * 0.18; // claiming 3 is bold
        suspicion += myMatches * 0.12; // if I hold many, fewer left for them
        if (me.hand.length <= 2) suspicion += 0.15; // desperate, may as well gamble
        suspicion += (Math.random() - 0.5) * 0.2;
        if (Math.random() < suspicion) {
          resolveChallenge(turn);
          return;
        }
      }

      // 2) otherwise, play cards (truth if possible, sometimes bluff)
      const matches = me.hand.filter((c) => cardMatches(c, tableCard));
      const nonMatches = me.hand.filter((c) => !cardMatches(c, tableCard));
      let toPlay = [];

      const wantBluff = matches.length === 0 || Math.random() < 0.28;
      if (!wantBluff && matches.length > 0) {
        const n = Math.min(matches.length, 1 + Math.floor(Math.random() * 3));
        toPlay = matches.slice(0, n);
      } else {
        // bluff: lead with non-matches, but keep it small to look believable
        const pool = nonMatches.length ? nonMatches : me.hand;
        const n = Math.min(pool.length, 1 + Math.floor(Math.random() * 2));
        toPlay = pool.slice(0, n);
      }
      if (toPlay.length === 0) toPlay = me.hand.slice(0, 1);
      commitPlay(turn, toPlay.map((c) => c.id));
    });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase, players]);

  // ---- UI helpers -------------------------------------------------------
  const toggleSelect = (id) => {
    if (phase !== "playing" || turn !== 0) return;
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 3) return s;
      return [...s, id];
    });
  };

  const human = players[0];
  const canHumanAct = phase === "playing" && turn === 0;
  const canChallenge = canHumanAct && pile && pile.by !== 0;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0b1410] via-[#0d1a14] to-[#070d0a] text-slate-100 font-sans select-none">
      <div className="mx-auto max-w-6xl px-3 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-emerald-300 drop-shadow">
              ♠ Liar&apos;s Deck
            </h1>
            <p className="text-xs text-slate-400 -mt-0.5">Bluff. Accuse. Survive the chamber.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-black/40 px-3 py-1.5 text-center ring-1 ring-emerald-500/30">
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Table Card</div>
              <div className="text-lg font-bold text-emerald-300">{PLURAL[tableCard]}</div>
            </div>
            <button
              onClick={newGame}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition px-3 py-2 text-sm font-semibold shadow-lg shadow-emerald-900/40"
            >
              New Game
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          {/* Table */}
          <div className="relative h-[560px] rounded-3xl bg-[#0a120e] ring-1 ring-black/50 overflow-hidden">
            {/* felt */}
            <div className="absolute inset-6 rounded-full bg-[radial-gradient(ellipse_at_center,_#15543b_0%,_#0e3a28_55%,_#0a2a1d_100%)] ring-8 ring-[#3a2415] shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]" />
            <div className="absolute inset-10 rounded-full border-2 border-emerald-300/10" />

            {/* center pile / reveal */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
              {banner && (
                <div className="animate-pulse rounded-full bg-black/60 px-4 py-1.5 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                  {banner}
                </div>
              )}
              {reveal ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-1.5">
                    {reveal.cards.map((c, i) => (
                      <FaceCard key={i} rank={c.rank} highlight />
                    ))}
                  </div>
                  <div
                    className={`rounded-full px-4 py-1 text-sm font-black ${
                      reveal.truthful ? "bg-emerald-600" : "bg-rose-600"
                    }`}
                  >
                    {reveal.truthful ? "TRUTH" : "BLUFF!"}
                  </div>
                </div>
              ) : pile ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex -space-x-6">
                    {Array.from({ length: pile.count }).map((_, i) => (
                      <CardBack key={i} />
                    ))}
                  </div>
                  <div className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-slate-200">
                    {players[pile.by]?.name}: “{pile.count} {PLURAL[tableCard]}”
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs italic">— table is clear —</div>
              )}
            </div>

            {/* seats */}
            {players.map((p, i) => (
              <Seat
                key={p.id}
                player={p}
                pos={SEAT_POS[i]}
                isTurn={turn === i && phase === "playing"}
              />
            ))}
          </div>

          {/* Log */}
          <div className="rounded-2xl bg-black/40 ring-1 ring-white/10 p-3 flex flex-col h-[560px]">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-2 flex justify-between">
              <span>Game Log</span>
              <span className="text-slate-500">Round {round}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {log.map((l) => (
                <div
                  key={l.id}
                  className={`text-xs leading-snug rounded-md px-2 py-1 ${
                    l.kind === "alert"
                      ? "bg-rose-950/60 text-rose-200"
                      : l.kind === "system"
                      ? "bg-emerald-950/50 text-emerald-200"
                      : l.kind === "player"
                      ? "bg-sky-950/50 text-sky-200"
                      : l.kind === "bot"
                      ? "bg-slate-800/60 text-slate-300"
                      : "text-slate-400"
                  }`}
                >
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Human hand + controls */}
        <div className="mt-4 rounded-2xl bg-black/30 ring-1 ring-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-slate-300">
              Your Hand{" "}
              <span className="text-slate-500">
                ({human?.hand.length || 0} cards · select 1–3)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={humanChallenge}
                disabled={!canChallenge}
                className="rounded-lg px-4 py-2 text-sm font-bold transition active:scale-95 bg-rose-600 enabled:hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-rose-900/40"
              >
                Call Liar!
              </button>
              <button
                onClick={humanPlay}
                disabled={!canHumanAct || selected.length < 1 || selected.length > 3}
                className="rounded-lg px-4 py-2 text-sm font-bold transition active:scale-95 bg-emerald-600 enabled:hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/40"
              >
                Place {selected.length || ""} as {PLURAL[tableCard]}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[112px] items-end">
            {human?.alive ? (
              human.hand.length ? (
                human.hand.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    disabled={!canHumanAct}
                    className={`transition-all duration-150 ${
                      selected.includes(c.id) ? "-translate-y-4" : "hover:-translate-y-1"
                    } ${!canHumanAct ? "opacity-60" : ""}`}
                  >
                    <FaceCard rank={c.rank} selected={selected.includes(c.id)} big />
                  </button>
                ))
              ) : (
                <div className="text-slate-500 text-sm italic py-6">
                  You&apos;re out of cards this round — waiting…
                </div>
              )
            ) : (
              <div className="text-rose-400/80 text-sm italic py-6">You have been eliminated.</div>
            )}
          </div>
          {!canHumanAct && phase === "playing" && human?.alive && human?.hand.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">Waiting for {players[turn]?.name}…</div>
          )}
        </div>
      </div>

      {/* Roulette modal */}
      {phase === "roulette" && roulette && (
        <RouletteModal
          player={players[roulette.victim]}
          reason={roulette.reason}
          resolving={roulette.resolving}
          result={roulette.result}
          onPull={pullTrigger}
        />
      )}

      {/* Game over */}
      {phase === "gameover" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
          <div className="rounded-3xl bg-gradient-to-b from-emerald-900 to-[#08130d] ring-1 ring-emerald-400/40 p-8 text-center max-w-sm w-full shadow-2xl">
            <div className="text-6xl mb-3">{winner?.isHuman ? "🏆" : "💀"}</div>
            <h2 className="text-2xl font-black text-emerald-300 mb-1">
              {winner ? `${winner.name} ${winner.isHuman ? "Win!" : "Wins"}` : "Everyone's gone"}
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              {winner?.isHuman
                ? "You out-bluffed them all and walked away alive."
                : "The bar falls silent. Better luck next time."}
            </p>
            <button
              onClick={newGame}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition px-6 py-3 font-bold w-full"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Sub-components ----------------------------- */

function FaceCard({ rank, selected, highlight, big }) {
  const s = SUITS[rank] || SUITS.K;
  return (
    <div
      className={`relative ${big ? "w-16 h-24" : "w-12 h-[72px]"} rounded-lg bg-gradient-to-b from-white to-slate-200 text-slate-900 shadow-lg flex flex-col justify-between p-1.5 ${
        selected ? "ring-4 ring-emerald-400" : highlight ? "ring-2 ring-amber-300" : "ring-1 ring-black/20"
      }`}
    >
      <span className={`text-left font-black leading-none ${big ? "text-base" : "text-xs"} ${s.color}`}>
        {s.label}
      </span>
      <span className={`text-center ${big ? "text-3xl" : "text-xl"} ${s.color}`}>{s.glyph}</span>
      <span
        className={`text-right font-black leading-none rotate-180 ${big ? "text-base" : "text-xs"} ${s.color}`}
      >
        {s.label}
      </span>
    </div>
  );
}

function CardBack() {
  return (
    <div className="w-10 h-[60px] rounded-md bg-gradient-to-br from-rose-900 to-rose-700 ring-1 ring-black/40 shadow-md flex items-center justify-center">
      <div className="w-6 h-10 rounded border border-rose-300/30 bg-[repeating-linear-gradient(45deg,_rgba(255,255,255,0.08)_0,_rgba(255,255,255,0.08)_3px,_transparent_3px,_transparent_6px)]" />
    </div>
  );
}

function Seat({ player, pos, isTurn }) {
  const dead = !player.alive;
  return (
    <div className={`absolute ${pos.wrap} flex flex-col items-center gap-1`}>
      <div
        className={`relative rounded-2xl px-4 py-2 min-w-[110px] text-center ring-1 transition ${
          isTurn
            ? "bg-emerald-600/90 ring-emerald-300 shadow-lg shadow-emerald-500/40 scale-105"
            : dead
            ? "bg-black/60 ring-rose-900/60 opacity-50"
            : "bg-black/55 ring-white/10"
        }`}
      >
        <div className="text-sm font-bold flex items-center justify-center gap-1">
          {dead && <span>💀</span>}
          {player.name}
        </div>
        <div className="text-[11px] text-slate-300">
          {dead ? "eliminated" : `${player.hand.length} cards`}
        </div>
        {!dead && (
          <div className="text-[10px] text-rose-300/80 mt-0.5">
            risk {player.pulls + 1}/6
          </div>
        )}
        {isTurn && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-emerald-300 text-emerald-950 font-black px-2 rounded-full">
            TURN
          </div>
        )}
      </div>
      {!player.isHuman && !dead && (
        <div className="flex -space-x-4">
          {Array.from({ length: Math.min(player.hand.length, 5) }).map((_, i) => (
            <div
              key={i}
              className="w-7 h-10 rounded bg-gradient-to-br from-rose-900 to-rose-700 ring-1 ring-black/40 shadow"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RouletteModal({ player, reason, resolving, result, onPull }) {
  const odds = 6 - player.pulls;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur">
      <div className="rounded-3xl bg-gradient-to-b from-[#1a1010] to-[#0a0606] ring-1 ring-rose-600/40 p-7 text-center max-w-sm w-full shadow-2xl">
        <div className="text-xs uppercase tracking-widest text-rose-400/80 mb-1">Russian Roulette</div>
        <h2 className="text-xl font-black text-rose-200 mb-1">
          {player.name} {player.isHuman ? "face" : "faces"} the revolver
        </h2>
        <p className="text-xs text-slate-400 mb-4">Lost the challenge — {reason}.</p>

        {/* cylinder */}
        <div className="relative mx-auto w-40 h-40 mb-4">
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 ring-4 ring-slate-600 ${
              resolving ? "animate-spin" : ""
            }`}
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
              const x = 50 + Math.cos(ang) * 32;
              const y = 50 + Math.sin(ang) * 32;
              const used = i < player.pulls;
              return (
                <div
                  key={i}
                  className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ${
                    used ? "bg-slate-800 ring-slate-700" : "bg-slate-950 ring-slate-500"
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                />
              );
            })}
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            {result === "dead" ? "💥" : result === "safe" ? "😮‍💨" : "🔫"}
          </div>
        </div>

        <div className="text-sm font-bold text-rose-300 mb-4">
          Odds this pull: 1 in {odds}
        </div>

        {result ? (
          <div
            className={`rounded-xl px-4 py-3 font-black ${
              result === "dead" ? "bg-rose-700 text-white" : "bg-emerald-700 text-white"
            }`}
          >
            {result === "dead"
              ? "BANG — eliminated!"
              : "*click* — survived!"}
          </div>
        ) : player.isHuman ? (
          <button
            onClick={onPull}
            disabled={resolving}
            className="rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 transition px-6 py-3 font-black w-full disabled:opacity-60"
          >
            {resolving ? "…" : "Pull the Trigger"}
          </button>
        ) : (
          <AutoPull resolving={resolving} onPull={onPull} name={player.name} />
        )}
      </div>
    </div>
  );
}

function AutoPull({ resolving, onPull, name }) {
  useEffect(() => {
    if (resolving) return;
    const t = setTimeout(onPull, 1200);
    return () => clearTimeout(t);
  }, [resolving, onPull]);
  return (
    <div className="rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
      {resolving ? `${name} pulls the trigger…` : `${name} reaches for the gun…`}
    </div>
  );
}
