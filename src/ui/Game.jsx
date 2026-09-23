import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_PLAY } from "../engine.js";
import { EMOTES, RANKS, T, describe, quipText } from "../i18n.js";
import { sfx, unlockAudio } from "../sfx.js";
import Roulette from "./Roulette.jsx";
import { Avatar, Btn, Card, CardBack, Chambers, Confetti, SoundToggle, Starburst, Timer } from "./parts.jsx";

const BUBBLE_MS = 2800;

function Emotes({ list }) {
  return list.map((e) => (
    <span
      key={e.id}
      className="a-float-up pointer-events-none absolute bottom-6 z-30 text-3xl"
      style={{ left: `${20 + e.x * 50}%`, "--r": `${(e.x - 0.5) * 50}deg` }}>
      {e.e}
    </span>
  ));
}

function Bubble({ text, down }) {
  if (!text) return null;
  return (
    <div className={`speech a-pop absolute left-1/2 z-40 w-max max-w-[150px] -translate-x-1/2 rounded-2xl px-2.5 py-1.5 text-center text-[11px] font-extrabold leading-snug sm:max-w-[190px] sm:text-xs ${down ? "down top-full mt-3" : "bottom-full mb-3"}`}>
      {text}
    </div>
  );
}

function Opponent({ seat, active, bubble, emotes, holdsPile }) {
  const dead = !seat.alive;
  return (
    <div className="relative flex w-[96px] flex-col items-center sm:w-[120px]">
      {active && <div className="a-arrow absolute -top-7 left-1/2 text-2xl">👇</div>}
      <Emotes list={emotes} />
      <Avatar emoji={seat.avatar} size={56} active={active} dead={dead} />
      <div className={`mt-1 max-w-full truncate text-sm font-black ${dead ? "text-ink-soft line-through" : ""}`}>{seat.name}</div>
      {dead ? (
        <div className="text-[10px] font-extrabold text-coral">{T.eliminated}</div>
      ) : (
        <>
          <div className="mt-1 flex h-[26px] items-end justify-center">
            {Array.from({ length: seat.handCount }).map((_, i) => (
              <div key={i} className="-mx-[5px] h-[24px] w-[17px] rounded-[4px] border-2 border-ink card-back" style={{ transform: `rotate(${(i - (seat.handCount - 1) / 2) * 9}deg)` }} />
            ))}
            {seat.handCount === 0 && <span className="text-[10px] font-bold text-ink-soft">{T.outOfCards}</span>}
          </div>
          <div className="mt-1.5"><Chambers pulls={seat.pulls} small /></div>
        </>
      )}
      {!seat.connected && seat.kind === "human" && (
        <div className="mt-1 rounded-full border-2 border-ink bg-cream px-1.5 text-[9px] font-black">📴 {T.offline}</div>
      )}
      {holdsPile && !dead && <div className="absolute -right-1 top-0 rotate-12 text-lg">🤫</div>}
      <Bubble text={bubble} down />
    </div>
  );
}

function Hand({ cards, selected, canPick, onToggle, round }) {
  const n = cards.length;
  return (
    <div className="flex min-h-[132px] items-end justify-center px-2 sm:min-h-[150px]">
      {cards.map((c, i) => {
        const on = selected.includes(c.id);
        const off = i - (n - 1) / 2;
        return (
          <button
            key={`${round}-${c.id}`}
            onClick={() => onToggle(c.id)}
            disabled={!canPick}
            className="a-deal -mx-1.5 sm:-mx-1"
            style={{ animationDelay: `${i * 90}ms`, zIndex: on ? 20 : i }}
            aria-pressed={on}>
            <div
              className={`transition-transform duration-200 ${canPick ? "hover:-translate-y-3" : ""}`}
              style={{ transform: `translateY(${on ? -30 : Math.abs(off) * 5}px) rotate(${off * 6}deg)` }}>
              <Card rank={c.rank} size="lg" selected={on} className={canPick ? "" : "saturate-[.6]"} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RevealCards({ reveal }) {
  const n = reveal.cards.length;
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2">
        {reveal.cards.map((c, i) => (
          <div key={i} className="flip-wrap relative">
            <CardBack size="md" />
            <div className="a-flip absolute inset-0" style={{ animationDelay: `${1000 + i * 280}ms`, backfaceVisibility: "hidden" }}>
              <Card rank={c.rank} size="md" />
            </div>
          </div>
        ))}
      </div>
      <div onAnimationStart={() => sfx(reveal.truthful ? "truth" : "bluff")} className="a-stamp mt-3 rounded-xl border-[3px] border-ink px-4 py-1 font-display text-2xl tracking-wide"
        style={{ animationDelay: `${1200 + n * 280}ms`, background: reveal.truthful ? "#2ec4b6" : "#ff5a5f", color: "white", textShadow: "2px 2px 0 #2b1d14" }}>
        {reveal.truthful ? `✅ ${T.truth}` : `❌ ${T.bluff}`}
      </div>
    </div>
  );
}

function TableCenter({ view, pileKey, nm }) {
  if (view.reveal) return <RevealCards reveal={view.reveal} />;
  if (view.pile) {
    const r = RANKS[view.tableCard];
    return (
      <div className="flex flex-col items-center">
        <div className="relative flex h-[92px] items-center justify-center">
          {Array.from({ length: view.pile.count }).map((_, i) => (
            <div key={`${pileKey}-${i}`} className="a-drop -mx-3" style={{ "--r": `${(i - 1) * 12 + ((pileKey * 7) % 9) - 4}deg`, animationDelay: `${i * 90}ms` }}>
              <CardBack size="md" />
            </div>
          ))}
        </div>
        <div className="a-pop mt-2 rounded-full border-[2.5px] border-ink bg-paper px-3 py-1 text-center text-xs font-extrabold sm:text-sm">
          {nm(view.pile.by)} {T.claims} <span style={{ color: r.color }}>{view.pile.count}× {r.emoji} {r.geo}</span>
        </div>
      </div>
    );
  }
  if (view.phase === "dealing") return <div className="a-hop font-display text-2xl text-white" style={{ textShadow: "2px 2px 0 #2b1d14" }}>🃏 {T.round} {view.round}!</div>;
  return <div className="text-sm font-extrabold text-white/80">{T.tableClear}</div>;
}

function LiarBurst({ burst, seat }) {
  return (
    <div key={burst} className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
      <div className="a-burst relative flex h-[330px] w-[330px] items-center justify-center sm:h-[420px] sm:w-[420px]">
        <Starburst fill="#ff5a5f" points={16} className="absolute inset-0 h-full w-full" />
        <div className="relative text-center">
          <div className="text-5xl">{seat?.avatar}</div>
          <div className="font-black text-white" style={{ fontSize: 40, textShadow: "3px 3px 0 #2b1d14" }}>{T.liar}</div>
          <div className="font-display text-3xl text-sun" style={{ textShadow: "2px 2px 0 #2b1d14" }}>{T.liarEn}</div>
        </div>
      </div>
    </div>
  );
}

function GameOver({ view, nm, canRestart, onAgain, onLeave, onToLobby }) {
  const w = view.winner != null ? view.seats[view.winner] : null;
  const iWon = view.winner === view.me;
  const ev = view.log.find((e) => e.type === "win");
  const quip = ev && quipText(ev);
  return (
    <div className="a-fade-up fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 px-4 backdrop-blur-[3px]">
      <div className="a-pop comic w-full max-w-sm rounded-[2rem] bg-paper p-7 text-center">
        <div className="relative mx-auto w-fit">
          <div className="absolute -top-7 left-1/2 -translate-x-1/2"><div className="a-hop text-4xl">👑</div></div>
          <div className="a-bob pt-4 text-7xl">{w ? w.avatar : "🍺"}</div>
        </div>
        <h2 className="mt-2 text-2xl font-black">{iWon ? T.youWin : w ? `${nm(view.winner)} ${T.wins}` : "…"}</h2>
        {quip && <div className="speech mx-auto mt-4 w-fit rounded-2xl px-3 py-1.5 text-sm font-extrabold">„{quip}“</div>}
        <p className="mt-4 text-sm font-bold text-ink-soft">{iWon ? T.winSub : T.loseSub}</p>
        <div className="mt-6 flex flex-col gap-2">
          {canRestart ? (
            <Btn color="sun" onClick={onAgain} className="py-3.5 text-lg">🔁 {T.again}</Btn>
          ) : (
            <div className="rounded-2xl border-[3px] border-dashed border-ink/40 px-4 py-3 text-sm font-extrabold">{T.waitRematch}</div>
          )}
          {onToLobby && <Btn color="mint" onClick={onToLobby} className="py-2.5 text-sm">👥 {T.lobby}</Btn>}
          <Btn color="paper" onClick={onLeave} className="py-2.5 text-sm">🏠 {T.menu}</Btn>
        </div>
      </div>
    </div>
  );
}

export default function Game({ view, act, emotes, sendEmote, canRestart, onAgain, onLeave, onToLobby }) {
  const me = view.me;
  const mine = view.seats[me];
  const [selected, setSelected] = useState([]);
  const [bubbles, setBubbles] = useState({});
  const [shake, setShake] = useState(null);
  const [flash, setFlash] = useState(0);
  const [burst, setBurst] = useState(null);
  const [confetti, setConfetti] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const lastSeen = useRef(null);
  const lastEmote = useRef(0);

  const nm = useCallback((i) => (i === me ? `${view.seats[i]?.name} (${T.you})` : view.seats[i]?.name ?? "?"), [me, view.seats]);

  const say = useCallback((seat, text) => {
    if (!text) return;
    const id = Math.random();
    setBubbles((b) => ({ ...b, [seat]: { text, id } }));
    setTimeout(() => setBubbles((b) => (b[seat]?.id === id ? { ...b, [seat]: null } : b)), BUBBLE_MS);
  }, []);

  // Turn engine events into sound, bubbles and effects.
  useEffect(() => {
    const log = view.log;
    if (!log.length) return;
    if (lastSeen.current != null && log[0].id < lastSeen.current) lastSeen.current = 0; // new game
    if (lastSeen.current == null) lastSeen.current = log.length <= 3 ? 0 : log[0].id; // joined mid-game: skip history
    const fresh = log.filter((e) => e.id > lastSeen.current).reverse();
    lastSeen.current = log[0].id;
    for (const ev of fresh) {
      const q = quipText(ev);
      switch (ev.type) {
        case "deal": sfx("deal"); break;
        case "play": sfx("card"); say(ev.seat, q); break;
        case "call":
          sfx("liar");
          setBurst({ id: ev.id, seat: ev.seat });
          setShake("soft");
          setTimeout(() => setBurst((b) => (b?.id === ev.id ? null : b)), 1250);
          say(ev.seat, q);
          break;
        case "truth": case "bluff": say(ev.seat, q); break; // sound plays with the reveal stamp
        case "safe": sfx("click"); say(ev.seat, q); break;
        case "dead": sfx("bang"); setFlash(ev.id); setShake("hard"); say(ev.seat, q); break;
        case "win": sfx("win"); setConfetti(ev.id); break;
        case "left": case "back": sfx("join"); break;
        default:
      }
    }
  }, [view.log, say]);

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(null), shake === "hard" ? 650 : 450);
    return () => clearTimeout(t);
  }, [shake]);

  const myTurn = view.phase === "playing" && view.turn === me && mine.alive;
  useEffect(() => { if (myTurn) sfx("turn"); }, [myTurn]);
  useEffect(() => { if (view.roulette?.spinning) sfx("spin"); }, [view.roulette?.spinning]);

  // Drop selections that are no longer valid.
  const handKey = (mine.hand || []).map((c) => c.id).join(",");
  useEffect(() => {
    if (!myTurn) setSelected([]);
    else setSelected((s) => s.filter((id) => mine.hand.some((c) => c.id === id)));
  }, [myTurn, handKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const canPick = myTurn && !view.mustCall;
  const canCall = myTurn && view.pile && view.pile.by !== me;
  const toggle = (id) => {
    if (!canPick) return;
    unlockAudio();
    sfx("select");
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_PLAY ? s : [...s, id]));
  };
  const play = () => { if (canPick && selected.length) { act({ type: "play", ids: selected }); setSelected([]); } };
  const call = () => { if (canCall) act({ type: "call" }); };
  const emote = (e) => {
    const now = Date.now();
    if (now - lastEmote.current < 600) return;
    lastEmote.current = now;
    unlockAudio();
    sfx("pop");
    sendEmote(e);
  };

  const n = view.seats.length;
  const others = Array.from({ length: n - 1 }, (_, k) => view.seats[(me + 1 + k) % n]);
  const pileKey = view.log.find((e) => e.type === "play")?.id ?? 0;
  const tc = RANKS[view.tableCard];
  const emotesFor = (i) => emotes.filter((e) => e.seat === i);

  let status;
  if (!mine.alive) status = T.youDead;
  else if (myTurn) status = view.mustCall ? T.mustCall : T.yourTurn;
  else if (view.phase === "playing") status = `${T.waitingFor} ${view.seats[view.turn]?.name}`;
  else status = "…";

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${shake === "hard" ? "a-shake" : shake === "soft" ? "a-nudge" : ""}`}>
      {flash ? <div key={flash} className="a-flash pointer-events-none fixed inset-0 z-[75] bg-white" onAnimationEnd={() => setFlash(0)} /> : null}
      {burst && <LiarBurst burst={burst.id} seat={view.seats[burst.seat]} />}
      {confetti ? <Confetti key={confetti} /> : null}

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-4 px-3 pb-4 pt-3 sm:px-5 lg:grid-cols-[1fr_270px]">
        <div className="flex min-w-0 flex-col">
          {/* top bar */}
          <header className="flex items-center justify-between gap-2">
            <button onClick={onLeave} className="comic-sm rounded-full bg-paper px-3 py-1.5 text-xs font-extrabold sm:text-sm">← {T.leave}</button>
            <div className="flex items-center gap-2">
              <span className="comic-sm rounded-full bg-sun px-3 py-1 text-xs font-black sm:text-sm">{T.round} {view.round}</span>
              <button onClick={() => setShowLog(!showLog)} className="comic-sm flex h-10 w-10 items-center justify-center rounded-full bg-paper text-lg lg:hidden" aria-label={T.log}>📜</button>
              <SoundToggle />
            </div>
          </header>

          {/* opponents */}
          <div className="mt-9 flex items-start justify-center gap-1 sm:gap-8">
            {others.map((s) => (
              <Opponent
                key={s.idx}
                seat={s}
                active={view.phase === "playing" && view.turn === s.idx}
                bubble={bubbles[s.idx]?.text}
                emotes={emotesFor(s.idx)}
                holdsPile={view.pile?.by === s.idx}
              />
            ))}
          </div>

          {/* table */}
          <div className="felt relative mx-auto mt-5 flex min-h-[210px] w-full max-w-3xl flex-1 flex-col items-center justify-center rounded-[48px] px-3 py-6 sm:min-h-[250px]">
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-2xl border-[2.5px] border-ink bg-paper py-1 pl-1 pr-3" style={{ boxShadow: "0 3px 0 #2b1d14" }}>
              <Card key={`${view.round}-${view.tableCard}`} rank={view.tableCard} size="sm" className="a-pop" />
              <div className="leading-tight">
                <div className="text-[9px] font-extrabold uppercase tracking-wider text-ink-soft">{T.tableCard}</div>
                <div className="text-sm font-black" style={{ color: tc.color }}>{tc.geo}</div>
              </div>
            </div>
            <div className="mt-10 sm:mt-6">
              <TableCenter view={view} pileKey={pileKey} nm={nm} />
            </div>
          </div>

          {/* me */}
          <div className="relative mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex items-center gap-2">
                <Emotes list={emotesFor(me)} />
                <Avatar emoji={mine.avatar} size={44} active={myTurn} dead={!mine.alive} />
                <div>
                  <div className="text-sm font-black">{mine.name}</div>
                  <Chambers pulls={mine.pulls} dead={!mine.alive} small />
                </div>
                <Bubble text={bubbles[me]?.text} />
              </div>
              <div className={`flex items-center gap-2 rounded-full border-[2.5px] border-ink px-3 py-1 text-xs font-black sm:text-sm ${myTurn ? (view.mustCall ? "a-hop bg-coral text-white" : "a-hop bg-sun") : "bg-paper"}`}>
                {status}
                {myTurn && <Timer deadline={view.deadline} offset={view.clockOffset} />}
              </div>
            </div>

            {mine.alive ? (
              mine.hand.length ? (
                <Hand cards={mine.hand} selected={selected} canPick={canPick} onToggle={toggle} round={view.round} />
              ) : (
                <div className="flex min-h-[100px] items-center justify-center text-sm font-extrabold text-ink-soft">🫳 {T.outOfCards}</div>
              )
            ) : (
              <div className="flex min-h-[100px] items-center justify-center text-sm font-extrabold text-ink-soft"><span className="a-bob mr-2 inline-block text-3xl">👻</span></div>
            )}

            {mine.alive && (
              <div className="mt-3 flex items-stretch justify-center gap-3">
                <Btn color="coral" onClick={call} disabled={!canCall} className={`flex-1 py-3.5 sm:flex-none sm:px-8 ${canCall && view.mustCall ? "a-hop" : ""}`}>
                  <span className="block text-lg leading-none">🤥 {T.liar}</span>
                  <span className="block font-display text-xs tracking-wider opacity-80">{T.liarEn}</span>
                </Btn>
                <Btn color="sun" onClick={play} disabled={!canPick || !selected.length} className="flex-1 py-3.5 sm:flex-none sm:px-8">
                  <span className="block text-lg leading-none">🃏 {T.play}{selected.length ? ` ×${selected.length}` : ""}</span>
                  <span className="block text-[11px] font-bold opacity-70">{canPick ? `${selected.length ? `${selected.length}× ${tc.emoji} ${tc.geo}` : T.pickCards}` : " "}</span>
                </Btn>
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-1 sm:gap-1.5">
              {EMOTES.map((e) => (
                <button key={e} onClick={() => emote(e)} className="comic-sm flex h-9 w-9 items-center justify-center rounded-full bg-paper text-lg transition-transform hover:-translate-y-0.5 active:scale-90 sm:h-10 sm:w-10 sm:text-xl" aria-label={e}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* log */}
        <aside className={`${showLog ? "flex" : "hidden"} comic max-h-72 flex-col rounded-3xl bg-paper p-3 lg:flex lg:max-h-[calc(100vh-24px)] lg:self-start lg:sticky lg:top-3`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-black">📜 {T.log}</span>
            <span className="rounded-full border-2 border-ink bg-sun px-2 text-[11px] font-black">{T.round} {view.round}</span>
          </div>
          <div className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto pr-1">
            {view.log.map((e) => {
              const text = describe(e, nm);
              if (!text) return null;
              const tone = { call: "bg-[#ffe1e2]", dead: "bg-[#ffe1e2]", bluff: "bg-[#ffe1e2]", truth: "bg-[#d8f5f1]", safe: "bg-[#fff1c7]", win: "bg-[#fff1c7]", deal: "bg-[#e6effd]" }[e.type] || "bg-cream";
              return (
                <div key={e.id} className={`a-fade-up rounded-xl px-2.5 py-1.5 text-[12px] font-semibold leading-snug ${tone}`}>
                  {text}
                  {quipText(e) && <div className="text-[11px] font-bold italic text-ink-soft">„{quipText(e)}“</div>}
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {view.phase === "roulette" && view.roulette && <Roulette view={view} nm={nm} onPull={() => act({ type: "pull" })} />}
      {view.phase === "gameover" && <GameOver view={view} nm={nm} canRestart={canRestart} onAgain={onAgain} onLeave={onLeave} onToLobby={onToLobby} />}
    </div>
  );
}
