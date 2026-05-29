import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * მატყუარას ბარი — Liar's Deck · "Noir Bar" edition
 * Cinematic dark-minimalist single-file React game.
 *
 * Design language:
 *   - Matte black (#09090b) / charcoal (#16161a) canvas, generous negative space.
 *   - One refined accent: muted amber (#c2a15a) for focus/active turn.
 *   - Crimson (#991b1b) reserved strictly for high tension (accuse / revolver / death).
 *   - No poker table. A floating composition: inactive players are gracefully
 *     dimmed so attention falls on whoever is acting.
 *   - Cinematic Russian-roulette modal: SVG cylinder, smooth spin, CLICK vibrate
 *     or BANG (crimson flash + screen shake + avatar dissolve + ELIMINATED stamp).
 *
 * Fully localized in Georgian.
 */

/* ------------------------------- i18n / data ------------------------------ */

const T = {
  title: "მატყუარას ბარი",
  subtitle: "ბლეფი · ბრალდება · გადარჩენა",
  start: "თამაშის დაწყება",
  liar: "მატყუარა!",
  play: "კარტის დადება",
  tableCard: "მაგიდის კარტი",
  yourTurn: "შენი სვლაა",
  survives: "გადარჩა",
  eliminated: "გავარდა",
  winner: "გამარჯვებული!",
  youWin: "შენ გაიმარჯვე",
  log: "ჟურნალი",
  round: "რაუნდი",
  yourHand: "შენი ხელი",
  selectHint: "აირჩიე 1–3",
  cards: "კარტი",
  outOfCards: "კარტები აღარ გაქვს",
  youEliminated: "თამაშის გარეთ ხარ",
  waiting: "ელოდები",
  pull: "ჩახმახის გამოკვრა",
  roulette: "რუსული რულეტი",
  facesRevolver: "რევოლვერთან",
  odds: "შანსი",
  bang: "ბაბახ",
  click: "ჩახ",
  truth: "სიმართლე",
  bluff: "ბლეფი",
  replay: "თავიდან",
  silence: "ბარში სიჩუმეა",
  outbluffed: "ყველა გადააჯობე და გადარჩი.",
  better: "მეტი იღბალი შემდეგ ჯერზე.",
  tableClear: "მაგიდა ცარიელია",
  claims: "აცხადებს",
};

// Only Kings, Queens, Aces. Muted, sophisticated tints.
const RANKS = {
  K: { geo: "მეფე", glyph: "♚", tint: "#b06a72" },
  Q: { geo: "დედოფალი", glyph: "♛", tint: "#8a9bb0" },
  A: { geo: "ტუზი", glyph: "♠", tint: "#c2a15a" },
};
const RANK_KEYS = ["K", "Q", "A"];

const AMBER = "#c2a15a";
const CRIMSON = "#991b1b";

let UID = 0;
function buildDeck() {
  const deck = [];
  for (const r of RANK_KEYS) for (let i = 0; i < 8; i++) deck.push({ id: UID++, rank: r });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
const randRank = () => RANK_KEYS[Math.floor(Math.random() * 3)];

// Bot personalities — distinct, intelligent logic.
const PERSONAS = {
  1: { name: "Scabby", geo: "სკაბი", bluff: 0.5, call: 0.34, desc: "აგრესიული" },
  2: { name: "Foxy", geo: "ფოქსი", bluff: 0.3, call: 0.55, desc: "სტრატეგი" },
  3: { name: "Toar", geo: "ტოარი", bluff: 0.12, call: 0.24, desc: "ფრთხილი" },
};

const cardMatches = (c, claim) => c.rank === claim;

/* --------------------------------- styles --------------------------------- */

const CSS = `
@keyframes lbShake{
  10%,90%{transform:translate3d(-2px,0,0)} 20%,80%{transform:translate3d(4px,0,0)}
  30%,50%,70%{transform:translate3d(-8px,1px,0)} 40%,60%{transform:translate3d(8px,-1px,0)}
}
.lb-shake{animation:lbShake .5s cubic-bezier(.36,.07,.19,.97) both}
@keyframes lbVibe{0%,100%{transform:translate3d(0,0,0)}25%{transform:translate3d(-1.5px,0,0)}75%{transform:translate3d(1.5px,0,0)}}
.lb-vibe{animation:lbVibe .12s linear 3}
@keyframes lbGlow{0%,100%{box-shadow:0 0 0 1px rgba(194,161,90,.35),0 0 22px rgba(194,161,90,.10)}50%{box-shadow:0 0 0 1px rgba(194,161,90,.6),0 0 34px rgba(194,161,90,.20)}}
.lb-glow{animation:lbGlow 2.4s ease-in-out infinite}
@keyframes lbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.lb-float{animation:lbFloat 4s ease-in-out infinite}
.lb-scroll::-webkit-scrollbar{width:5px}
.lb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:8px}
.lb-grain:before{content:'';position:fixed;inset:0;pointer-events:none;opacity:.025;z-index:1;
  background-image:radial-gradient(rgba(255,255,255,.6) .5px,transparent .5px);background-size:3px 3px}
`;

/* ------------------------------- component -------------------------------- */

export default function LiarsDeckPro() {
  const [phase, setPhase] = useState("menu"); // menu|dealing|playing|reveal|roulette|gameover
  const [players, setPlayers] = useState([]);
  const [tableCard, setTableCard] = useState("K");
  const [turn, setTurn] = useState(0);
  const [pile, setPile] = useState(null);
  const [selected, setSelected] = useState([]);
  const [log, setLog] = useState([]);
  const [reveal, setReveal] = useState(null);
  const [roulette, setRoulette] = useState(null);
  const [winner, setWinner] = useState(null);
  const [round, setRound] = useState(0);
  const [shake, setShake] = useState(false); // false | "hard" | "soft"
  const [flash, setFlash] = useState(null); // null | "bang" | "click"

  const timers = useRef([]);
  const after = useCallback((ms, fn) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pushLog = useCallback((text, kind = "info") => {
    setLog((l) => [{ id: UID++ + Math.random(), text, kind }, ...l].slice(0, 50));
  }, []);

  const nameOf = useCallback((i) => (i === 0 ? "შენ" : PERSONAS[i]?.geo || `Bot ${i}`), []);

  /* ----------------------------- setup / rounds ---------------------------- */
  const startGame = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const base = [0, 1, 2, 3].map((id) => ({
      id,
      isHuman: id === 0,
      persona: PERSONAS[id] || null,
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
    pushLog("ახალი თამაში. ოთხი მოთამაშე მაგიდასთან.", "system");
    dealRound(base, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushLog]);

  const dealRound = useCallback(
    (list, starter) => {
      const deck = buildDeck();
      const dealt = list.map((p) =>
        p.alive ? { ...p, hand: deck.splice(0, 5).map((c) => ({ ...c })) } : { ...p, hand: [] }
      );
      const tc = randRank();
      setTableCard(tc);
      setPile(null);
      setSelected([]);
      setReveal(null);
      setPlayers(dealt);
      setRound((r) => r + 1);
      setPhase("dealing");

      let s = starter;
      for (let i = 0; i < dealt.length; i++) {
        const idx = (starter + i) % dealt.length;
        if (dealt[idx].alive && dealt[idx].hand.length) {
          s = idx;
          break;
        }
      }
      setTurn(s);
      pushLog(`ახალი რაუნდი — მაგიდაზე „${RANKS[tc].geo}“. იწყებს ${nameOf(s)}.`, "system");
      after(1050, () => setPhase("playing"));
    },
    [after, nameOf, pushLog]
  );

  const nextActive = useCallback((list, from) => {
    for (let i = 1; i <= list.length; i++) {
      const idx = (from + i) % list.length;
      if (list[idx].alive && list[idx].hand.length > 0) return idx;
    }
    return -1;
  }, []);

  /* ------------------------------- playing -------------------------------- */
  const commitPlay = useCallback(
    (playerIdx, cardIds) => {
      setPlayers((prev) => {
        const list = prev.map((p) => ({ ...p, hand: [...p.hand] }));
        const me = list[playerIdx];
        const played = me.hand.filter((c) => cardIds.includes(c.id));
        me.hand = me.hand.filter((c) => !cardIds.includes(c.id));
        setPile({ by: playerIdx, cards: played.map((c) => ({ id: c.id, rank: c.rank })), count: played.length });
        pushLog(`${nameOf(playerIdx)} — ${played.length}× „${RANKS[tableCard].geo}“.`, playerIdx === 0 ? "player" : "bot");

        const nxt = nextActive(list, playerIdx);
        const stillHave = list.filter((p) => p.alive && p.hand.length > 0);
        if (nxt === -1 || (stillHave.length === 1 && stillHave[0].id === me.id)) {
          after(1150, () => {
            pushLog("დანარჩენებს კარტები აღარ აქვთ — ახალი რაუნდი.", "system");
            dealRound(list, playerIdx);
          });
        } else {
          setTurn(nxt);
        }
        return list;
      });
      setSelected([]);
    },
    [after, dealRound, nextActive, pushLog, tableCard, nameOf]
  );

  const resolveChallenge = useCallback(
    (accuserIdx) => {
      setPile((curPile) => {
        if (!curPile) return curPile;
        const truthful = curPile.cards.every((c) => cardMatches(c, tableCard));
        const loserIdx = truthful ? accuserIdx : curPile.by;
        pushLog(`${nameOf(accuserIdx)} → „${T.liar}“ → ${nameOf(curPile.by)}.`, "alert");
        setReveal({ cards: curPile.cards, claim: tableCard, truthful, by: curPile.by, accuser: accuserIdx });
        setPhase("reveal");
        after(2300, () => {
          pushLog(
            truthful
              ? `სიმართლე იყო — ${nameOf(accuserIdx)} ცდება.`
              : `ბლეფი იყო — ${nameOf(curPile.by)} გამოიჭირა.`,
            "alert"
          );
          setReveal(null);
          openRoulette(loserIdx, truthful ? "მცდარი ბრალდება" : "ბლეფზე დაჭერა");
        });
        return null;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [after, pushLog, tableCard, nameOf]
  );

  /* ------------------------------ roulette -------------------------------- */
  const openRoulette = useCallback((victimIdx, reason) => {
    setPhase("roulette");
    setRoulette({ victim: victimIdx, reason, spinning: false, result: null });
  }, []);

  const pullTrigger = useCallback(() => {
    setRoulette((r) => (!r || r.spinning || r.result ? r : { ...r, spinning: true }));
  }, []);

  useEffect(() => {
    if (!roulette || !roulette.spinning || roulette.result) return;
    const t = after(1050, () => {
      setPlayers((prev) => {
        const list = prev.map((p) => ({ ...p }));
        const v = list[roulette.victim];
        const fired = v.pulls === v.bullet;
        v.pulls += 1;
        if (fired) {
          v.alive = false;
          setShake("hard");
          setFlash("bang");
          after(520, () => setShake(false));
          after(950, () => setFlash(null));
          pushLog(`${T.bang}. ${nameOf(roulette.victim)} ${T.eliminated}.`, "alert");
        } else {
          setShake("soft");
          setFlash("click");
          after(360, () => setShake(false));
          after(650, () => setFlash(null));
          pushLog(`${T.click}. ${nameOf(roulette.victim)} ${T.survives}.`, "system");
        }
        setRoulette((r) => ({ ...r, spinning: false, result: fired ? "dead" : "safe" }));

        after(fired ? 2100 : 1500, () => {
          const survivors = list.filter((p) => p.alive);
          if (survivors.length <= 1) {
            setWinner(survivors[0] || null);
            setRoulette(null);
            setPhase("gameover");
            if (survivors[0]) pushLog(`${nameOf(survivors[0].id)} — ${T.winner}`, "system");
          } else {
            setRoulette(null);
            const starter = fired ? nextActive(list, roulette.victim) : roulette.victim;
            dealRound(list, starter === -1 ? 0 : starter);
          }
        });
        return list;
      });
    });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roulette]);

  /* --------------------------------- AI ----------------------------------- */
  useEffect(() => {
    if (phase !== "playing") return;
    const me = players[turn];
    if (!me || me.isHuman || !me.alive || me.hand.length === 0) return;
    const pa = me.persona;

    const t = after(1000 + Math.random() * 900, () => {
      if (pile && pile.by !== turn) {
        const myMatches = me.hand.filter((c) => cardMatches(c, tableCard)).length;
        let suspicion = pa.call;
        suspicion += (pile.count - 1) * 0.16;
        suspicion += myMatches * 0.11;
        if (me.hand.length <= 2) suspicion += 0.12;
        suspicion += (Math.random() - 0.5) * 0.18;
        if (Math.random() < suspicion) {
          resolveChallenge(turn);
          return;
        }
      }
      const matches = me.hand.filter((c) => cardMatches(c, tableCard));
      const others = me.hand.filter((c) => !cardMatches(c, tableCard));
      let toPlay;
      const bluff = matches.length === 0 || Math.random() < pa.bluff;
      if (!bluff && matches.length) {
        toPlay = matches.slice(0, Math.min(matches.length, 1 + Math.floor(Math.random() * 3)));
      } else {
        const pool = others.length ? others : me.hand;
        toPlay = pool.slice(0, Math.min(pool.length, 1 + Math.floor(Math.random() * 2)));
      }
      if (!toPlay.length) toPlay = me.hand.slice(0, 1);
      commitPlay(turn, toPlay.map((c) => c.id));
    });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase, players]);

  /* ------------------------------- handlers ------------------------------- */
  const human = players[0];
  const canAct = phase === "playing" && turn === 0;
  const canCall = canAct && pile && pile.by !== 0;

  const toggle = (id) => {
    if (!canAct) return;
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));
  };
  const doPlay = () => {
    if (!canAct || selected.length < 1 || selected.length > 3) return;
    commitPlay(0, selected);
  };
  const doCall = () => {
    if (!canCall) return;
    resolveChallenge(0);
  };

  const shakeCls = shake === "hard" ? "lb-shake" : shake === "soft" ? "lb-vibe" : "";

  /* --------------------------------- view --------------------------------- */
  return (
    <div className="lb-grain relative min-h-screen w-full overflow-hidden bg-[#09090b] text-zinc-200"
      style={{ fontFamily: "'Noto Sans Georgian', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* ambient depth */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(194,161,90,.05), transparent 55%), radial-gradient(100% 60% at 50% 120%, rgba(153,27,27,.05), transparent 50%)" }} />

      {/* screen flash */}
      <AnimatePresence>
        {flash && (
          <motion.div key={flash} className="pointer-events-none fixed inset-0 z-[70]"
            initial={{ opacity: flash === "bang" ? 0.92 : 0.32 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: flash === "bang" ? 0.9 : 0.5 }}
            style={{ background: flash === "bang"
              ? "radial-gradient(circle at 50% 45%, rgba(153,27,27,.95), rgba(0,0,0,.98))"
              : "rgba(194,161,90,.18)" }} />
        )}
      </AnimatePresence>

      {phase === "menu" ? (
        <Menu onStart={startGame} />
      ) : (
        <div className={`relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6 ${shakeCls}`}>
          {/* header */}
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-[0.18em] text-zinc-100">{T.title}</h1>
              <p className="mt-0.5 text-[10px] tracking-[0.32em] text-zinc-600">{T.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">{T.tableCard}</div>
                <div className="text-base font-semibold tracking-wide" style={{ color: RANKS[tableCard].tint }}>
                  {RANKS[tableCard].glyph}&nbsp;{RANKS[tableCard].geo}
                </div>
              </div>
              <button onClick={startGame}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200">
                {T.replay}
              </button>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[1fr_270px]">
            {/* play area */}
            <div className="flex flex-col">
              {/* opponents — floating, dimmed unless active */}
              <div className="flex items-start justify-center gap-5 sm:gap-12">
                {players.slice(1).map((p) => (
                  <Opponent key={p.id} player={p} active={turn === p.id && phase === "playing"}
                    accuser={reveal && reveal.accuser === p.id} loser={reveal && !reveal.truthful && reveal.by === p.id}
                    nameOf={nameOf} />
                ))}
              </div>

              {/* center stage */}
              <div className="flex flex-1 items-center justify-center py-6">
                <CenterStage phase={phase} reveal={reveal} pile={pile} tableCard={tableCard} nameOf={nameOf} />
              </div>

              {/* player zone */}
              <div className="mt-2">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full transition ${canAct ? "lb-glow" : ""}`}
                      style={{ background: canAct ? AMBER : "#3f3f46" }} />
                    <span className="font-medium tracking-wide" style={{ color: canAct ? AMBER : "#71717a" }}>
                      {canAct ? T.yourTurn : human?.alive ? `${T.waiting}: ${nameOf(turn)}` : T.youEliminated}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-500">{human?.hand.length || 0} {T.cards}</span>
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={doCall} disabled={!canCall}
                      className="rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-25"
                      style={{ borderColor: canCall ? CRIMSON : "rgba(255,255,255,.12)", color: canCall ? "#e7a3a3" : "#52525b", background: canCall ? "rgba(153,27,27,.12)" : "transparent" }}>
                      {T.liar}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={doPlay}
                      disabled={!canAct || selected.length < 1 || selected.length > 3}
                      className="rounded-full px-5 py-2 text-xs font-semibold tracking-wide text-[#09090b] transition disabled:cursor-not-allowed disabled:opacity-25"
                      style={{ background: (!canAct || !selected.length) ? "#3f3f46" : AMBER }}>
                      {T.play}{selected.length ? ` · ${selected.length}` : ""}
                    </motion.button>
                  </div>
                </div>

                <div className="flex min-h-[128px] flex-wrap items-end justify-center gap-2.5">
                  {human?.alive ? (
                    human.hand.length ? (
                      human.hand.map((c, i) => (
                        <motion.button key={c.id} onClick={() => toggle(c.id)} disabled={!canAct}
                          initial={{ opacity: 0, y: 70 }}
                          animate={{ opacity: 1, y: selected.includes(c.id) ? -16 : 0 }}
                          whileHover={canAct ? { y: selected.includes(c.id) ? -16 : -9 } : {}}
                          transition={{ duration: 0.28, delay: phase === "dealing" ? i * 0.06 : 0 }}
                          className={!canAct ? "cursor-default opacity-70" : "cursor-pointer"}>
                          <PlayingCard rank={c.rank} selected={selected.includes(c.id)} big />
                        </motion.button>
                      ))
                    ) : (
                      <div className="py-8 text-sm tracking-wide text-zinc-600">{T.outOfCards}</div>
                    )
                  ) : (
                    <div className="py-8 text-sm tracking-wide" style={{ color: "#b06a72" }}>{T.youEliminated}</div>
                  )}
                </div>
              </div>
            </div>

            {/* log */}
            <aside className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#0d0d10]/70 p-3 lg:max-h-none max-h-44">
              <div className="mb-2 flex justify-between text-[9px] uppercase tracking-[0.28em] text-zinc-600">
                <span>{T.log}</span>
                <span>{T.round} {round}</span>
              </div>
              <div className="lb-scroll flex-1 space-y-1.5 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {log.map((l) => (
                    <motion.div key={l.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.24 }}
                      className="border-l-2 pl-2 text-[11px] leading-relaxed"
                      style={{
                        borderColor: l.kind === "alert" ? CRIMSON : l.kind === "system" ? AMBER : l.kind === "player" ? "#3f6f8f" : "#27272a",
                        color: l.kind === "alert" ? "#e7a3a3" : l.kind === "system" ? "#cbb079" : l.kind === "player" ? "#9fc3dd" : "#a1a1aa",
                      }}>
                      {l.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Roulette modal */}
      <AnimatePresence>
        {phase === "roulette" && roulette && (
          <RouletteModal player={players[roulette.victim]} victimName={nameOf(roulette.victim)}
            reason={roulette.reason} spinning={roulette.spinning} result={roulette.result} onPull={pullTrigger} />
        )}
      </AnimatePresence>

      {/* Game over */}
      <AnimatePresence>
        {phase === "gameover" && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.92, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              className="w-full max-w-xs rounded-3xl border border-white/10 bg-[#0d0d10] p-9 text-center">
              <div className="mb-4 text-5xl">{winner?.isHuman ? "♚" : "✦"}</div>
              <h2 className="mb-1 text-xl font-bold tracking-wide"
                style={{ color: winner?.isHuman ? AMBER : "#e4e4e7" }}>
                {winner ? (winner.isHuman ? T.youWin : `${nameOf(winner.id)}`) : T.silence}
              </h2>
              {winner && !winner.isHuman && (
                <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-zinc-600">{T.winner}</div>
              )}
              <p className="mb-6 mt-2 text-xs leading-relaxed text-zinc-500">{winner?.isHuman ? T.outbluffed : T.better}</p>
              <button onClick={startGame}
                className="w-full rounded-full py-3 text-sm font-semibold text-[#09090b] transition active:scale-95"
                style={{ background: AMBER }}>
                {T.replay}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ subcomponents ----------------------------- */

function Menu({ onStart }) {
  const bots = [PERSONAS[1], PERSONAS[2], PERSONAS[3]];
  return (
    <motion.div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
      <motion.div className="lb-float mb-3 text-4xl" style={{ color: AMBER }}
        initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>♠</motion.div>
      <motion.h1 className="text-center text-4xl font-bold tracking-[0.2em] text-zinc-100 sm:text-5xl"
        initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        {T.title}
      </motion.h1>
      <motion.p className="mt-3 text-[11px] tracking-[0.42em] text-zinc-600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
        {T.subtitle}
      </motion.p>

      <div className="mt-12 grid w-full max-w-lg grid-cols-3 gap-3">
        {bots.map((b, i) => (
          <motion.div key={b.name} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 + i * 0.1 }}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-sm font-semibold text-zinc-300">
              {b.geo[0]}
            </div>
            <div className="text-sm font-medium text-zinc-200">{b.geo}</div>
            <div className="mt-0.5 text-[10px] tracking-wide text-zinc-600">{b.desc}</div>
          </motion.div>
        ))}
      </div>

      <motion.button onClick={onStart} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="mt-12 rounded-full px-12 py-4 text-sm font-semibold tracking-[0.15em] text-[#09090b]"
        style={{ background: AMBER }}>
        {T.start}
      </motion.button>
    </motion.div>
  );
}

function CenterStage({ phase, reveal, pile, tableCard, nameOf }) {
  if (reveal) {
    return (
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {reveal.cards.map((c, i) => (
            <motion.div key={i} initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: i * 0.12 }}>
              <PlayingCard rank={c.rank} highlight />
            </motion.div>
          ))}
        </div>
        <div className="rounded-full border px-4 py-1 text-[11px] font-semibold tracking-[0.2em]"
          style={{ borderColor: reveal.truthful ? AMBER : CRIMSON, color: reveal.truthful ? AMBER : "#e7a3a3", background: reveal.truthful ? "rgba(194,161,90,.08)" : "rgba(153,27,27,.12)" }}>
          {reveal.truthful ? T.truth : T.bluff}
        </div>
      </motion.div>
    );
  }
  if (pile) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
        <div className="flex -space-x-7">
          {Array.from({ length: pile.count }).map((_, i) => <CardBack key={i} />)}
        </div>
        <div className="text-center">
          <span className="text-[11px] tracking-wide text-zinc-500">{nameOf(pile.by)} {T.claims} </span>
          <span className="text-[11px] font-semibold tracking-wide text-zinc-300">{pile.count}× „{RANKS[tableCard].geo}“</span>
        </div>
      </motion.div>
    );
  }
  if (phase === "dealing")
    return <div className="lb-float text-xs tracking-[0.3em]" style={{ color: AMBER }}>· {RANKS[tableCard].geo} ·</div>;
  return <div className="text-[11px] tracking-[0.3em] text-zinc-700">{T.tableClear}</div>;
}

function PlayingCard({ rank, selected, highlight, big }) {
  const r = RANKS[rank] || RANKS.K;
  return (
    <div className={`relative flex flex-col justify-between rounded-xl border p-2 ${big ? "h-[100px] w-[68px]" : "h-[76px] w-[52px]"}`}
      style={{
        background: "linear-gradient(160deg,#1b1b1f,#121215)",
        borderColor: selected ? AMBER : highlight ? AMBER : "rgba(255,255,255,.10)",
        boxShadow: selected ? "0 10px 24px rgba(0,0,0,.6), 0 0 0 1px " + AMBER : highlight ? "0 8px 20px rgba(0,0,0,.6)" : "0 4px 12px rgba(0,0,0,.45)",
      }}>
      <span className={`font-semibold leading-none ${big ? "text-sm" : "text-xs"}`} style={{ color: r.tint }}>{rank}</span>
      <span className={`self-center ${big ? "text-2xl" : "text-lg"}`} style={{ color: r.tint, opacity: 0.9 }}>{r.glyph}</span>
      <span className={`rotate-180 self-end font-semibold leading-none ${big ? "text-sm" : "text-xs"}`} style={{ color: r.tint }}>{rank}</span>
    </div>
  );
}

function CardBack() {
  return (
    <div className="h-[64px] w-[44px] rounded-lg border border-white/10"
      style={{ background: "repeating-linear-gradient(135deg,#141417 0 5px,#0f0f12 5px 10px)" }} />
  );
}

function Opponent({ player, active, accuser, loser, nameOf }) {
  const dead = !player.alive;
  const ring = dead ? "rgba(153,27,27,.5)" : active ? AMBER : accuser ? "#e7a3a3" : "rgba(255,255,255,.12)";
  return (
    <motion.div className="flex flex-col items-center gap-2"
      animate={{ opacity: dead ? 0.32 : active ? 1 : 0.42, scale: active ? 1.05 : 1, filter: active || dead ? "grayscale(0)" : "grayscale(0.5)" }}
      transition={{ duration: 0.45 }}>
      <div className="relative">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-base font-semibold transition-colors ${active ? "lb-glow" : ""}`}
          style={{ borderColor: ring, color: dead ? "#b06a72" : active ? AMBER : "#a1a1aa", background: "#121215" }}>
          {dead ? "✕" : player.persona.geo[0]}
        </div>
        {loser && (
          <motion.div initial={{ scale: 0, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: -12, opacity: 1 }}
            className="absolute -bottom-1 -right-2 rounded border px-1 text-[8px] font-bold tracking-wider"
            style={{ borderColor: CRIMSON, color: "#e7a3a3", background: "rgba(153,27,27,.2)" }}>
            {T.liar}
          </motion.div>
        )}
      </div>
      <div className="text-center">
        <div className="text-xs font-medium tracking-wide" style={{ color: dead ? "#71717a" : active ? AMBER : "#d4d4d8" }}>
          {player.persona.geo}
        </div>
        <div className="text-[9px] tracking-wide text-zinc-600">
          {dead ? T.eliminated : `${player.hand.length} ${T.cards}`}
        </div>
      </div>
      {/* chamber risk — 6 minimal dots */}
      {!dead && (
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-1 w-1 rounded-full"
              style={{ background: i < player.pulls ? CRIMSON : i === player.pulls ? "rgba(231,163,163,.5)" : "rgba(255,255,255,.12)" }} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function RouletteModal({ player, victimName, reason, spinning, result, onPull }) {
  const pulls = player?.pulls || 0;
  const odds = 6 - pulls;
  const isHuman = player?.isHuman;
  const [rot, setRot] = useState(0);

  // spin the cylinder when triggered
  useEffect(() => {
    if (spinning) setRot((r) => r + 1440 + Math.floor(Math.random() * 6) * 60);
  }, [spinning]);

  // bots pull automatically
  useEffect(() => {
    if (isHuman || spinning || result) return;
    const t = setTimeout(onPull, 1250);
    return () => clearTimeout(t);
  }, [isHuman, spinning, result, onPull]);

  const dead = result === "dead";
  const cx = 100, cy = 100, R = 60, hole = 15;

  return (
    <motion.div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/92 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ scale: 0.88, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-sm rounded-3xl border p-8 text-center"
        style={{ borderColor: "rgba(153,27,27,.3)", background: "linear-gradient(180deg,#121012,#0a0809)" }}>
        <div className="mb-1 text-[9px] uppercase tracking-[0.4em]" style={{ color: "#9a6a6a" }}>{T.roulette}</div>

        {/* victim avatar — dissolves on death */}
        <div className="mb-1 flex items-center justify-center gap-2">
          <motion.div animate={dead ? { opacity: 0, scale: 1.25, filter: "blur(6px)" } : { opacity: 1 }} transition={{ duration: 0.7 }}
            className="flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold"
            style={{ borderColor: "rgba(255,255,255,.15)", color: "#d4d4d8", background: "#1b1b1f" }}>
            {victimName[0]}
          </motion.div>
          <h2 className="text-lg font-semibold tracking-wide text-zinc-200">{victimName} · {T.facesRevolver}</h2>
        </div>
        <p className="mb-5 text-[11px] tracking-wide text-zinc-600">{reason}</p>

        {/* cinematic cylinder */}
        <div className="relative mx-auto mb-5 h-44 w-44">
          {/* fixed firing-position marker */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
            style={{ width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `11px solid ${dead ? CRIMSON : "#71717a"}` }} />
          <motion.div animate={{ rotate: rot }} transition={{ duration: 1.0, ease: [0.33, 0, 0.2, 1] }} className="h-full w-full">
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <defs>
                <radialGradient id="lbsteel" cx="38%" cy="32%" r="75%">
                  <stop offset="0%" stopColor="#3a3a40" />
                  <stop offset="60%" stopColor="#202024" />
                  <stop offset="100%" stopColor="#101013" />
                </radialGradient>
              </defs>
              <circle cx={cx} cy={cy} r="92" fill="url(#lbsteel)" stroke="#2c2c31" strokeWidth="2" />
              <circle cx={cx} cy={cy} r="78" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
              {Array.from({ length: 6 }).map((_, i) => {
                const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
                const used = i < pulls;
                const fired = dead && i === pulls; // the chamber that just fired sits at the marker
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r={hole} fill={fired ? "rgba(153,27,27,.55)" : used ? "#0c0c0e" : "#161619"}
                      stroke={fired ? CRIMSON : used ? "#3f3f46" : "#52525b"} strokeWidth="2" />
                    {fired && <circle cx={x} cy={y} r="5" fill={CRIMSON} />}
                  </g>
                );
              })}
              <circle cx={cx} cy={cy} r="16" fill="#161619" stroke="#52525b" strokeWidth="2" />
              <circle cx={cx} cy={cy} r="4" fill="#3f3f46" />
            </svg>
          </motion.div>
          {/* result glyph */}
          <AnimatePresence>
            {result && (
              <motion.div key="rg" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black tracking-[0.2em]"
                  style={{ color: dead ? "#ef6a6a" : AMBER, textShadow: dead ? "0 0 20px rgba(153,27,27,.8)" : "none" }}>
                  {dead ? T.bang : T.click}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* ELIMINATED stamp */}
          <AnimatePresence>
            {dead && (
              <motion.div initial={{ scale: 1.6, opacity: 0, rotate: -18 }} animate={{ scale: 1, opacity: 1, rotate: -12 }}
                transition={{ delay: 0.35 }} className="absolute inset-0 flex items-center justify-center">
                <span className="rounded border-2 px-3 py-1 text-sm font-black tracking-[0.25em]"
                  style={{ borderColor: CRIMSON, color: "#ef6a6a" }}>{T.eliminated}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mb-5 text-xs tracking-[0.2em] text-zinc-500">{T.odds} · 1 / {odds}</div>

        {result ? (
          <div className="rounded-full py-3 text-sm font-semibold tracking-wide"
            style={dead ? { background: "rgba(153,27,27,.18)", color: "#ef6a6a" } : { background: "rgba(194,161,90,.12)", color: AMBER }}>
            {dead ? `${T.bang} — ${T.eliminated}` : `${T.click} — ${T.survives}`}
          </div>
        ) : isHuman ? (
          <motion.button whileTap={{ scale: 0.96 }} onClick={onPull} disabled={spinning}
            className="w-full rounded-full py-3 text-sm font-semibold tracking-wide text-zinc-100 transition disabled:opacity-50"
            style={{ background: "rgba(153,27,27,.85)" }}>
            {spinning ? "…" : T.pull}
          </motion.button>
        ) : (
          <div className="rounded-full border border-white/10 py-3 text-sm tracking-wide text-zinc-500">
            {spinning ? `${victimName} · ${T.pull}…` : `${victimName}…`}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
