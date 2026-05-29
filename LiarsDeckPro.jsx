import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * მატყუარას ბარი — Liar's Deck · "Noir Bar" edition (lightweight build)
 * Single React component. NO external animation libs.
 * Animations: Tailwind transitions + CSS keyframes only. Icons: inline SVG.
 *
 * Palette: matte black #09090b / charcoal #16161a, muted amber #c2a15a accent,
 * crimson #991b1b reserved for tension. Fully localized in Georgian.
 */

const AMBER = "#c2a15a";
const CRIMSON = "#991b1b";

const T = {
  title: "მატყუარას ბარი", subtitle: "ბლეფი · ბრალდება · გადარჩენა",
  start: "თამაშის დაწყება", liar: "მატყუარა!", play: "კარტის დადება",
  tableCard: "მაგიდის კარტი", yourTurn: "შენი სვლაა", survives: "გადარჩა",
  eliminated: "გავარდა", winner: "გამარჯვებული!", youWin: "შენ გაიმარჯვე",
  log: "ჟურნალი", round: "რაუნდი", cards: "კარტი", outOfCards: "კარტები აღარ გაქვს",
  youEliminated: "თამაშის გარეთ ხარ", waiting: "ელოდები", pull: "ჩახმახის გამოკვრა",
  roulette: "რუსული რულეტი", facesRevolver: "რევოლვერთან", odds: "შანსი",
  bang: "ბაბახ", click: "ჩახ", truth: "სიმართლე", bluff: "ბლეფი", replay: "თავიდან",
  silence: "ბარში სიჩუმეა", outbluffed: "ყველა გადააჯობე და გადარჩი.",
  better: "მეტი იღბალი შემდეგ ჯერზე.", tableClear: "მაგიდა ცარიელია", claims: "აცხადებს",
};

const RANKS = {
  K: { geo: "მეფე", glyph: "♚", tint: "#b06a72" },
  Q: { geo: "დედოფალი", glyph: "♛", tint: "#8a9bb0" },
  A: { geo: "ტუზი", glyph: "♠", tint: "#c2a15a" },
};
const RKEYS = ["K", "Q", "A"];

const PERSONAS = {
  1: { geo: "სკაბი", bluff: 0.5, call: 0.34, desc: "აგრესიული" },
  2: { geo: "ფოქსი", bluff: 0.3, call: 0.55, desc: "სტრატეგი" },
  3: { geo: "ტოარი", bluff: 0.12, call: 0.24, desc: "ფრთხილი" },
};

let UID = 0;
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const buildDeck = () => {
  const d = [];
  for (const r of RKEYS) for (let i = 0; i < 8; i++) d.push({ id: UID++, rank: r });
  return shuffle(d);
};
const randRank = () => RKEYS[(Math.random() * 3) | 0];

const CSS = `
@keyframes lbShake{10%,90%{transform:translate3d(-2px,0,0)}20%,80%{transform:translate3d(4px,0,0)}30%,50%,70%{transform:translate3d(-8px,1px,0)}40%,60%{transform:translate3d(8px,-1px,0)}}
.lb-shake{animation:lbShake .5s cubic-bezier(.36,.07,.19,.97) both}
@keyframes lbVibe{0%,100%{transform:translate3d(0,0,0)}25%{transform:translate3d(-1.5px,0,0)}75%{transform:translate3d(1.5px,0,0)}}
.lb-vibe{animation:lbVibe .12s linear 3}
@keyframes lbGlow{0%,100%{box-shadow:0 0 0 1px rgba(194,161,90,.35),0 0 20px rgba(194,161,90,.10)}50%{box-shadow:0 0 0 1px rgba(194,161,90,.6),0 0 32px rgba(194,161,90,.20)}}
.lb-glow{animation:lbGlow 2.4s ease-in-out infinite}
@keyframes lbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.lb-float{animation:lbFloat 4s ease-in-out infinite}
@keyframes lbFade{from{opacity:0}to{opacity:1}}
.lb-fade{animation:lbFade .4s ease-out both}
@keyframes lbPop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
.lb-pop{animation:lbPop .35s cubic-bezier(.2,.8,.2,1) both}
@keyframes lbRise{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:translateY(0)}}
.lb-rise{animation:lbRise .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes lbStamp{from{opacity:0;transform:scale(1.7) rotate(-18deg)}to{opacity:1;transform:scale(1) rotate(-12deg)}}
.lb-stamp{animation:lbStamp .4s cubic-bezier(.2,.8,.2,1) .3s both}
@keyframes lbSpin{to{transform:rotate(var(--lb-rot,1440deg))}}
.lb-spin{animation:lbSpin 1.05s cubic-bezier(.33,0,.2,1) forwards}
@keyframes lbDissolve{to{opacity:0;transform:scale(1.25);filter:blur(6px)}}
.lb-dissolve{animation:lbDissolve .7s ease-out forwards}
@keyframes lbFlashBang{0%{opacity:.92}100%{opacity:0}}
.lb-flash-bang{animation:lbFlashBang .9s ease-out forwards}
@keyframes lbFlashClick{0%{opacity:.3}100%{opacity:0}}
.lb-flash-click{animation:lbFlashClick .5s ease-out forwards}
.lb-scroll::-webkit-scrollbar{width:5px}
.lb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:8px}
`;

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
  const [shake, setShake] = useState(null); // null|"hard"|"soft"
  const [flash, setFlash] = useState(null); // null|"bang"|"click"

  const timers = useRef([]);
  const after = useCallback((ms, fn) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Synchronous mirrors so action handlers read fresh values without nesting
  // side effects inside setState updaters. `lock` blocks overlapping
  // challenge→reveal→roulette→deal transitions (e.g. a timer burst).
  const pileRef = useRef(null);
  const playersRef = useRef([]);
  const tcRef = useRef("K");
  const lock = useRef(false);
  useEffect(() => { pileRef.current = pile; }, [pile]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { tcRef.current = tableCard; }, [tableCard]);

  const logIt = useCallback((text, kind = "info") => {
    setLog((l) => [{ id: UID++, text, kind }, ...l].slice(0, 50));
  }, []);
  const nameOf = useCallback((i) => (i === 0 ? "შენ" : PERSONAS[i]?.geo || `#${i}`), []);

  const nextActive = (list, from) => {
    for (let i = 1; i <= list.length; i++) {
      const idx = (from + i) % list.length;
      if (list[idx].alive && list[idx].hand.length) return idx;
    }
    return -1;
  };

  const dealRound = useCallback((list, starter) => {
    const deck = buildDeck();
    const dealt = list.map((p) => (p.alive ? { ...p, hand: deck.splice(0, 5) } : { ...p, hand: [] }));
    const tc = randRank();
    let s = starter;
    for (let i = 0; i < dealt.length; i++) {
      const idx = (starter + i) % dealt.length;
      if (dealt[idx].alive && dealt[idx].hand.length) { s = idx; break; }
    }
    pileRef.current = null; playersRef.current = dealt; tcRef.current = tc; lock.current = false;
    setTableCard(tc); setPile(null); setSelected([]); setReveal(null);
    setPlayers(dealt); setRound((r) => r + 1); setPhase("dealing"); setTurn(s);
    logIt(`ახალი რაუნდი — მაგიდაზე „${RANKS[tc].geo}“. იწყებს ${nameOf(s)}.`, "system");
    after(1000, () => setPhase("playing"));
  }, [after, logIt, nameOf]);

  const startGame = useCallback(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const base = [0, 1, 2, 3].map((id) => ({
      id, isHuman: id === 0, persona: PERSONAS[id] || null,
      hand: [], alive: true, bullet: (Math.random() * 6) | 0, pulls: 0,
    }));
    setWinner(null); setLog([]); setReveal(null); setRoulette(null); setRound(0);
    lock.current = false;
    logIt("ახალი თამაში. ოთხი მოთამაშე მაგიდასთან.", "system");
    dealRound(base, 0);
  }, [dealRound, logIt]);

  const commitPlay = useCallback((idx, ids) => {
    if (lock.current) return;
    const list = playersRef.current.map((p) => ({ ...p, hand: [...p.hand] }));
    const me = list[idx];
    if (!me) return;
    const played = me.hand.filter((c) => ids.includes(c.id));
    me.hand = me.hand.filter((c) => !ids.includes(c.id));
    const newPile = { by: idx, cards: played.map((c) => ({ rank: c.rank })), count: played.length };
    playersRef.current = list; pileRef.current = newPile;
    setPlayers(list); setPile(newPile); setSelected([]);
    logIt(`${nameOf(idx)} — ${played.length}× „${RANKS[tcRef.current].geo}“.`, idx === 0 ? "player" : "bot");
    const nxt = nextActive(list, idx);
    const still = list.filter((p) => p.alive && p.hand.length);
    if (nxt === -1 || (still.length === 1 && still[0].id === me.id)) {
      lock.current = true; // freeze input until the fresh round deals
      after(1150, () => { logIt("დანარჩენებს კარტები აღარ აქვთ — ახალი რაუნდი.", "system"); dealRound(list, idx); });
    } else setTurn(nxt);
  }, [after, dealRound, logIt, nameOf]);

  const openRoulette = useCallback((victim, reason) => {
    setPhase("roulette");
    setRoulette({ victim, reason, spinning: false, result: null });
  }, []);

  const resolveChallenge = useCallback((accuser) => {
    if (lock.current) return;
    const cur = pileRef.current;
    if (!cur) return;
    lock.current = true; // one challenge in flight; released when next round deals
    const truthful = cur.cards.every((c) => c.rank === tcRef.current);
    const loser = truthful ? accuser : cur.by;
    pileRef.current = null;
    setPile(null);
    logIt(`${nameOf(accuser)} → „${T.liar}“ → ${nameOf(cur.by)}.`, "alert");
    setReveal({ cards: cur.cards, truthful });
    setPhase("reveal");
    after(2200, () => {
      logIt(truthful ? `სიმართლე იყო — ${nameOf(accuser)} ცდება.` : `ბლეფი იყო — ${nameOf(cur.by)} გამოიჭირა.`, "alert");
      setReveal(null);
      openRoulette(loser, truthful ? "მცდარი ბრალდება" : "ბლეფზე დაჭერა");
    });
  }, [after, logIt, nameOf, openRoulette]);

  const pullTrigger = useCallback(() => {
    setRoulette((r) => (!r || r.spinning || r.result ? r : { ...r, spinning: true }));
  }, []);

  // resolve a trigger pull
  useEffect(() => {
    if (!roulette?.spinning || roulette.result) return;
    const t = after(1050, () => {
      setPlayers((prev) => {
        const list = prev.map((p) => ({ ...p }));
        const v = list[roulette.victim];
        const fired = v.pulls === v.bullet;
        v.pulls += 1;
        if (fired) {
          v.alive = false;
          setShake("hard"); setFlash("bang");
          after(520, () => setShake(null)); after(950, () => setFlash(null));
          logIt(`${T.bang}. ${nameOf(roulette.victim)} ${T.eliminated}.`, "alert");
        } else {
          setShake("soft"); setFlash("click");
          after(360, () => setShake(null)); after(620, () => setFlash(null));
          logIt(`${T.click}. ${nameOf(roulette.victim)} ${T.survives}.`, "system");
        }
        setRoulette((r) => ({ ...r, spinning: false, result: fired ? "dead" : "safe" }));
        after(fired ? 2100 : 1450, () => {
          const alive = list.filter((p) => p.alive);
          if (alive.length <= 1) {
            setWinner(alive[0] || null); setRoulette(null); setPhase("gameover");
            if (alive[0]) logIt(`${nameOf(alive[0].id)} — ${T.winner}`, "system");
          } else {
            setRoulette(null);
            const s = fired ? nextActive(list, roulette.victim) : roulette.victim;
            dealRound(list, s === -1 ? 0 : s);
          }
        });
        return list;
      });
    });
    return () => clearTimeout(t);
  }, [roulette, after, dealRound, logIt, nameOf]);

  // AI turn
  useEffect(() => {
    if (phase !== "playing") return;
    const me = players[turn];
    if (!me || me.isHuman || !me.alive || !me.hand.length) return;
    const pa = me.persona;
    const t = after(1000 + Math.random() * 800, () => {
      if (pile && pile.by !== turn) {
        const mine = me.hand.filter((c) => c.rank === tableCard).length;
        let s = pa.call + (pile.count - 1) * 0.16 + mine * 0.11 + (me.hand.length <= 2 ? 0.12 : 0) + (Math.random() - 0.5) * 0.18;
        if (Math.random() < s) return resolveChallenge(turn);
      }
      const match = me.hand.filter((c) => c.rank === tableCard);
      const other = me.hand.filter((c) => c.rank !== tableCard);
      const bluff = !match.length || Math.random() < pa.bluff;
      let toPlay = !bluff && match.length
        ? match.slice(0, Math.min(match.length, 1 + ((Math.random() * 3) | 0)))
        : (other.length ? other : me.hand).slice(0, Math.min((other.length ? other : me.hand).length, 1 + ((Math.random() * 2) | 0)));
      if (!toPlay.length) toPlay = me.hand.slice(0, 1);
      commitPlay(turn, toPlay.map((c) => c.id));
    });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase, players]);

  const human = players[0];
  const canAct = phase === "playing" && turn === 0;
  const canCall = canAct && pile && pile.by !== 0;
  const toggle = (id) => canAct && setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));
  const shakeCls = shake === "hard" ? "lb-shake" : shake === "soft" ? "lb-vibe" : "";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#09090b] text-zinc-200"
      style={{ fontFamily: "'Noto Sans Georgian', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(194,161,90,.05), transparent 55%), radial-gradient(100% 60% at 50% 120%, rgba(153,27,27,.05), transparent 50%)" }} />

      {flash && (
        <div className={`pointer-events-none fixed inset-0 z-[70] ${flash === "bang" ? "lb-flash-bang" : "lb-flash-click"}`}
          style={{ background: flash === "bang" ? "radial-gradient(circle at 50% 45%, rgba(153,27,27,.95), rgba(0,0,0,.98))" : "rgba(194,161,90,.18)" }} />
      )}

      {phase === "menu" ? (
        <Menu onStart={startGame} />
      ) : (
        <div className={`relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6 ${shakeCls}`}>
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
                className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-zinc-400 transition-all duration-200 hover:border-white/25 hover:text-zinc-200">
                {T.replay}
              </button>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[1fr_270px]">
            <div className="flex flex-col">
              <div className="flex items-start justify-center gap-5 sm:gap-12">
                {players.slice(1).map((p) => (
                  <Opponent key={p.id} player={p} active={turn === p.id && phase === "playing"}
                    loser={reveal && !reveal.truthful && pile === null && false} />
                ))}
              </div>

              <div className="flex flex-1 items-center justify-center py-6">
                <Center phase={phase} reveal={reveal} pile={pile} tableCard={tableCard} nameOf={nameOf} />
              </div>

              <div className="mt-2">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${canAct ? "lb-glow" : ""}`}
                      style={{ background: canAct ? AMBER : "#3f3f46" }} />
                    <span className="font-medium tracking-wide" style={{ color: canAct ? AMBER : "#71717a" }}>
                      {canAct ? T.yourTurn : human?.alive ? `${T.waiting}: ${nameOf(turn)}` : T.youEliminated}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-500">{human?.hand.length || 0} {T.cards}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => canCall && resolveChallenge(0)} disabled={!canCall}
                      className="rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25"
                      style={{ borderColor: canCall ? CRIMSON : "rgba(255,255,255,.12)", color: canCall ? "#e7a3a3" : "#52525b", background: canCall ? "rgba(153,27,27,.12)" : "transparent" }}>
                      {T.liar}
                    </button>
                    <button onClick={() => canAct && selected.length && commitPlay(0, selected)}
                      disabled={!canAct || !selected.length}
                      className="rounded-full px-5 py-2 text-xs font-semibold tracking-wide text-[#09090b] transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25"
                      style={{ background: !canAct || !selected.length ? "#3f3f46" : AMBER }}>
                      {T.play}{selected.length ? ` · ${selected.length}` : ""}
                    </button>
                  </div>
                </div>

                <div className="flex min-h-[128px] flex-wrap items-end justify-center gap-2.5">
                  {human?.alive ? (
                    human.hand.length ? (
                      human.hand.map((c, i) => (
                        <button key={c.id} onClick={() => toggle(c.id)} disabled={!canAct}
                          className={`lb-rise transition-transform duration-200 ${canAct ? "cursor-pointer hover:-translate-y-2" : "cursor-default opacity-70"} ${selected.includes(c.id) ? "-translate-y-4" : ""}`}
                          style={{ animationDelay: phase === "dealing" ? `${i * 60}ms` : "0ms" }}>
                          <Card rank={c.rank} selected={selected.includes(c.id)} big />
                        </button>
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

            <aside className="flex max-h-44 flex-col rounded-2xl border border-white/[0.06] bg-[#0d0d10]/70 p-3 lg:max-h-none">
              <div className="mb-2 flex justify-between text-[9px] uppercase tracking-[0.28em] text-zinc-600">
                <span>{T.log}</span><span>{T.round} {round}</span>
              </div>
              <div className="lb-scroll flex-1 space-y-1.5 overflow-y-auto pr-1">
                {log.map((l) => (
                  <div key={l.id} className="lb-fade border-l-2 pl-2 text-[11px] leading-relaxed"
                    style={{
                      borderColor: l.kind === "alert" ? CRIMSON : l.kind === "system" ? AMBER : l.kind === "player" ? "#3f6f8f" : "#27272a",
                      color: l.kind === "alert" ? "#e7a3a3" : l.kind === "system" ? "#cbb079" : l.kind === "player" ? "#9fc3dd" : "#a1a1aa",
                    }}>{l.text}</div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}

      {phase === "roulette" && roulette && (
        <Roulette player={players[roulette.victim]} name={nameOf(roulette.victim)}
          reason={roulette.reason} spinning={roulette.spinning} result={roulette.result} onPull={pullTrigger} after={after} />
      )}

      {phase === "gameover" && (
        <div className="lb-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/90 px-4 backdrop-blur-sm">
          <div className="lb-pop w-full max-w-xs rounded-3xl border border-white/10 bg-[#0d0d10] p-9 text-center">
            <div className="mb-4 text-5xl">{winner?.isHuman ? "♚" : "✦"}</div>
            <h2 className="mb-1 text-xl font-bold tracking-wide" style={{ color: winner?.isHuman ? AMBER : "#e4e4e7" }}>
              {winner ? (winner.isHuman ? T.youWin : nameOf(winner.id)) : T.silence}
            </h2>
            {winner && !winner.isHuman && <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-zinc-600">{T.winner}</div>}
            <p className="mb-6 mt-2 text-xs leading-relaxed text-zinc-500">{winner?.isHuman ? T.outbluffed : T.better}</p>
            <button onClick={startGame} className="w-full rounded-full py-3 text-sm font-semibold text-[#09090b] transition-transform duration-200 active:scale-95" style={{ background: AMBER }}>
              {T.replay}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ subcomponents ----------------------------- */

function Menu({ onStart }) {
  const bots = [PERSONAS[1], PERSONAS[2], PERSONAS[3]];
  return (
    <div className="lb-fade relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
      <div className="lb-float mb-3 text-4xl" style={{ color: AMBER }}>♠</div>
      <h1 className="text-center text-4xl font-bold tracking-[0.2em] text-zinc-100 sm:text-5xl">{T.title}</h1>
      <p className="mt-3 text-[11px] tracking-[0.42em] text-zinc-600">{T.subtitle}</p>
      <div className="mt-12 grid w-full max-w-lg grid-cols-3 gap-3">
        {bots.map((b, i) => (
          <div key={b.geo} className="lb-rise rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-sm font-semibold text-zinc-300">{b.geo[0]}</div>
            <div className="text-sm font-medium text-zinc-200">{b.geo}</div>
            <div className="mt-0.5 text-[10px] tracking-wide text-zinc-600">{b.desc}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart}
        className="mt-12 rounded-full px-12 py-4 text-sm font-semibold tracking-[0.15em] text-[#09090b] transition-transform duration-200 hover:scale-[1.03] active:scale-95"
        style={{ background: AMBER }}>{T.start}</button>
    </div>
  );
}

function Center({ phase, reveal, pile, tableCard, nameOf }) {
  if (reveal)
    return (
      <div className="lb-pop flex flex-col items-center gap-3">
        <div className="flex gap-2">{reveal.cards.map((c, i) => <Card key={i} rank={c.rank} highlight />)}</div>
        <div className="rounded-full border px-4 py-1 text-[11px] font-semibold tracking-[0.2em]"
          style={{ borderColor: reveal.truthful ? AMBER : CRIMSON, color: reveal.truthful ? AMBER : "#e7a3a3", background: reveal.truthful ? "rgba(194,161,90,.08)" : "rgba(153,27,27,.12)" }}>
          {reveal.truthful ? T.truth : T.bluff}
        </div>
      </div>
    );
  if (pile)
    return (
      <div className="lb-pop flex flex-col items-center gap-3">
        <div className="flex -space-x-7">{Array.from({ length: pile.count }).map((_, i) => <CardBack key={i} />)}</div>
        <div className="text-center text-[11px] tracking-wide">
          <span className="text-zinc-500">{nameOf(pile.by)} {T.claims} </span>
          <span className="font-semibold text-zinc-300">{pile.count}× „{RANKS[tableCard].geo}“</span>
        </div>
      </div>
    );
  if (phase === "dealing") return <div className="lb-float text-xs tracking-[0.3em]" style={{ color: AMBER }}>· {RANKS[tableCard].geo} ·</div>;
  return <div className="text-[11px] tracking-[0.3em] text-zinc-700">{T.tableClear}</div>;
}

function Card({ rank, selected, highlight, big }) {
  const r = RANKS[rank] || RANKS.K;
  return (
    <div className={`relative flex flex-col justify-between rounded-xl border p-2 transition-all duration-200 ${big ? "h-[100px] w-[68px]" : "h-[76px] w-[52px]"}`}
      style={{
        background: "linear-gradient(160deg,#1b1b1f,#121215)",
        borderColor: selected || highlight ? AMBER : "rgba(255,255,255,.10)",
        boxShadow: selected ? `0 10px 24px rgba(0,0,0,.6),0 0 0 1px ${AMBER}` : highlight ? "0 8px 20px rgba(0,0,0,.6)" : "0 4px 12px rgba(0,0,0,.45)",
      }}>
      <span className={`font-semibold leading-none ${big ? "text-sm" : "text-xs"}`} style={{ color: r.tint }}>{rank}</span>
      <span className={`self-center ${big ? "text-2xl" : "text-lg"}`} style={{ color: r.tint, opacity: 0.9 }}>{r.glyph}</span>
      <span className={`rotate-180 self-end font-semibold leading-none ${big ? "text-sm" : "text-xs"}`} style={{ color: r.tint }}>{rank}</span>
    </div>
  );
}

const CardBack = () => (
  <div className="h-[64px] w-[44px] rounded-lg border border-white/10" style={{ background: "repeating-linear-gradient(135deg,#141417 0 5px,#0f0f12 5px 10px)" }} />
);

function Opponent({ player, active }) {
  const dead = !player.alive;
  const ring = dead ? "rgba(153,27,27,.5)" : active ? AMBER : "rgba(255,255,255,.12)";
  return (
    <div className="flex flex-col items-center gap-2 transition-all duration-500"
      style={{ opacity: dead ? 0.32 : active ? 1 : 0.42, transform: active ? "scale(1.05)" : "scale(1)", filter: active || dead ? "none" : "grayscale(.5)" }}>
      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-base font-semibold transition-colors duration-300 ${active ? "lb-glow" : ""} ${dead ? "lb-dissolve" : ""}`}
        style={{ borderColor: ring, color: dead ? "#b06a72" : active ? AMBER : "#a1a1aa", background: "#121215" }}>
        {dead ? "✕" : player.persona.geo[0]}
      </div>
      <div className="text-center">
        <div className="text-xs font-medium tracking-wide" style={{ color: dead ? "#71717a" : active ? AMBER : "#d4d4d8" }}>{player.persona.geo}</div>
        <div className="text-[9px] tracking-wide text-zinc-600">{dead ? T.eliminated : `${player.hand.length} ${T.cards}`}</div>
      </div>
      {!dead && (
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-1 w-1 rounded-full transition-colors duration-300"
              style={{ background: i < player.pulls ? CRIMSON : i === player.pulls ? "rgba(231,163,163,.5)" : "rgba(255,255,255,.12)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Roulette({ player, name, reason, spinning, result, onPull, after }) {
  const pulls = player?.pulls || 0;
  const odds = 6 - pulls;
  const isHuman = player?.isHuman;
  const dead = result === "dead";
  const [rot, setRot] = useState(0);
  const rotRef = useRef(0);

  useEffect(() => {
    if (spinning) {
      rotRef.current += 1440 + ((Math.random() * 6) | 0) * 60;
      setRot(rotRef.current);
    }
  }, [spinning]);

  useEffect(() => {
    if (isHuman || spinning || result) return;
    const t = setTimeout(onPull, 1250);
    return () => clearTimeout(t);
  }, [isHuman, spinning, result, onPull]);

  const cx = 100, cy = 100, R = 60, hole = 15;
  return (
    <div className="lb-fade fixed inset-0 z-[65] flex items-center justify-center bg-black/92 px-4 backdrop-blur-sm">
      <div className="lb-pop w-full max-w-sm rounded-3xl border p-8 text-center"
        style={{ borderColor: "rgba(153,27,27,.3)", background: "linear-gradient(180deg,#121012,#0a0809)" }}>
        <div className="mb-1 text-[9px] uppercase tracking-[0.4em]" style={{ color: "#9a6a6a" }}>{T.roulette}</div>
        <div className="mb-1 flex items-center justify-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${dead ? "lb-dissolve" : ""}`}
            style={{ borderColor: "rgba(255,255,255,.15)", color: "#d4d4d8", background: "#1b1b1f" }}>{name[0]}</div>
          <h2 className="text-lg font-semibold tracking-wide text-zinc-200">{name} · {T.facesRevolver}</h2>
        </div>
        <p className="mb-5 text-[11px] tracking-wide text-zinc-600">{reason}</p>

        <div className="relative mx-auto mb-5 h-44 w-44">
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
            style={{ width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `11px solid ${dead ? CRIMSON : "#71717a"}` }} />
          <div className={spinning ? "lb-spin h-full w-full" : "h-full w-full"}
            style={{ "--lb-rot": `${rot}deg`, transform: `rotate(${spinning ? 0 : rot}deg)`, transition: spinning ? "none" : "transform 1.05s cubic-bezier(.33,0,.2,1)" }}>
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <defs>
                <radialGradient id="lbsteel" cx="38%" cy="32%" r="75%">
                  <stop offset="0%" stopColor="#3a3a40" /><stop offset="60%" stopColor="#202024" /><stop offset="100%" stopColor="#101013" />
                </radialGradient>
              </defs>
              <circle cx={cx} cy={cy} r="92" fill="url(#lbsteel)" stroke="#2c2c31" strokeWidth="2" />
              <circle cx={cx} cy={cy} r="78" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
              {Array.from({ length: 6 }).map((_, i) => {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
                const used = i < pulls, fired = dead && i === pulls;
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
          </div>
          {result && (
            <div className="lb-pop pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black tracking-[0.2em]" style={{ color: dead ? "#ef6a6a" : AMBER, textShadow: dead ? "0 0 20px rgba(153,27,27,.8)" : "none" }}>
                {dead ? T.bang : T.click}
              </span>
            </div>
          )}
          {dead && (
            <div className="lb-stamp absolute inset-0 flex items-center justify-center">
              <span className="rounded border-2 px-3 py-1 text-sm font-black tracking-[0.25em]" style={{ borderColor: CRIMSON, color: "#ef6a6a" }}>{T.eliminated}</span>
            </div>
          )}
        </div>

        <div className="mb-5 text-xs tracking-[0.2em] text-zinc-500">{T.odds} · 1 / {odds}</div>

        {result ? (
          <div className="rounded-full py-3 text-sm font-semibold tracking-wide"
            style={dead ? { background: "rgba(153,27,27,.18)", color: "#ef6a6a" } : { background: "rgba(194,161,90,.12)", color: AMBER }}>
            {dead ? `${T.bang} — ${T.eliminated}` : `${T.click} — ${T.survives}`}
          </div>
        ) : isHuman ? (
          <button onClick={onPull} disabled={spinning}
            className="w-full rounded-full py-3 text-sm font-semibold tracking-wide text-zinc-100 transition-transform duration-200 active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(153,27,27,.85)" }}>
            {spinning ? "…" : T.pull}
          </button>
        ) : (
          <div className="rounded-full border border-white/10 py-3 text-sm tracking-wide text-zinc-500">
            {spinning ? `${name} · ${T.pull}…` : `${name}…`}
          </div>
        )}
      </div>
    </div>
  );
}
