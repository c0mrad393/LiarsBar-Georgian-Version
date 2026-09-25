import { useCallback, useEffect, useRef, useState } from "react";
import { useWakeLock } from "../device.js";
import { ITEMS } from "../shop.js";
import { MAX_PLAY } from "../engine.js";
import { EMOTES, MODE_INFO, PHRASES, RANKS, T, describe, quipText } from "../i18n.js";
import { sfx, unlockAudio } from "../sfx.js";
import { Card } from "./cards.jsx";
import Character, { seatColor } from "./Character.jsx";
import Hand from "./Hand.jsx";
import { DevilBurst, GameOver, LiarBurst, RevealCards } from "./overlays.jsx";
import { Btn, Chambers, Confetti, SoundToggle, Timer } from "./parts.jsx";
import Roulette from "./Roulette.jsx";
import Table, { Bubble, Emotes } from "./Table.jsx";

const BUBBLE_MS = 2800;
export const backOf = (looks) => ITEMS[looks?.cards]?.back || "red";

/** Mood of each character right now: moments (from events) beat the phase. */
function moodOf(view, i, moments) {
  const s = view.seats[i];
  if (!s.alive) return { state: "dead" };
  const m = moments[i];
  if (m && m.until > Date.now()) return m;
  if (view.phase === "gameover" && view.winner === i) return { state: "win" };
  if (view.phase === "roulette" && view.roulette?.victim === i && !view.roulette.result) return { state: "nervous" };
  if (view.phase === "playing" && view.turn === i) return { state: "turn" };
  return { state: "idle" };
}

function Log({ view, nm }) {
  return (
    <div className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto pr-1">
      {view.log.map((e) => {
        const text = describe(e, nm);
        if (!text) return null;
        const tone = { devil: "bg-[#ffd0d0]", call: "bg-[#ffe1e2]", dead: "bg-[#ffe1e2]", bluff: "bg-[#ffe1e2]", truth: "bg-[#d8f5f1]", safe: "bg-[#fff1c7]", win: "bg-[#fff1c7]", deal: "bg-[#e6effd]" }[e.type] || "bg-cream";
        return (
          <div key={e.id} className={`a-fade-up rounded-xl px-2.5 py-1.5 text-[12px] font-semibold leading-snug ${tone}`}>
            {text}
            {quipText(e) && <div className="text-[11px] font-bold italic text-ink-soft">„{quipText(e)}“</div>}
          </div>
        );
      })}
    </div>
  );
}

export default function Game({ view, act, fx, emote, throwAt, say, rewards, solo, myLooks, throwables, canRestart, onAgain, onLeave, onToLobby }) {
  const me = view.me;
  const mine = view.seats[me];
  const [selected, setSelected] = useState([]);
  const [bubbles, setBubbles] = useState({});
  const [moments, setMoments] = useState({});
  const [shake, setShake] = useState(null);
  const [flash, setFlash] = useState(0);
  const [burst, setBurst] = useState(null);
  const [devil, setDevil] = useState(null);
  const [confetti, setConfetti] = useState(0);
  const [sheet, setSheet] = useState(null); // emote | chat | log
  const [, tick] = useState(0);
  const lastSeen = useRef(null);
  const seenFx = useRef(new Set());
  useWakeLock(view.phase !== "gameover");

  const nm = useCallback((i) => (i === me ? `${view.seats[i]?.name} (${T.you})` : view.seats[i]?.name ?? "?"), [me, view.seats]);

  const speak = useCallback((seat, text) => {
    if (!text) return;
    const id = Math.random();
    setBubbles((b) => ({ ...b, [seat]: { text, id } }));
    setTimeout(() => setBubbles((b) => (b[seat]?.id === id ? { ...b, [seat]: null } : b)), BUBBLE_MS);
  }, []);
  const moment = useCallback((seat, state, ms, point = null) => {
    setMoments((m) => ({ ...m, [seat]: { state, point, until: Date.now() + ms } }));
    setTimeout(() => tick((x) => x + 1), ms + 20);
  }, []);

  // Engine events → sound, bubbles, moods, effects.
  useEffect(() => {
    const log = view.log;
    if (!log.length) return;
    if (lastSeen.current != null && log[0].id < lastSeen.current) lastSeen.current = log.length <= 3 ? 0 : log[0].id;
    if (lastSeen.current == null) lastSeen.current = log.length <= 3 ? 0 : log[0].id;
    const fresh = log.filter((e) => e.id > lastSeen.current).reverse();
    lastSeen.current = log[0].id;
    for (const ev of fresh) {
      const q = quipText(ev);
      switch (ev.type) {
        case "deal": sfx("deal"); break;
        case "play": sfx("card"); if (q) { speak(ev.seat, q); moment(ev.seat, "talk", 1400); } break;
        case "call":
          sfx("liar");
          setBurst({ id: ev.id, seat: ev.seat });
          setShake("soft");
          setTimeout(() => setBurst((b) => (b?.id === ev.id ? null : b)), 1250);
          speak(ev.seat, q);
          moment(ev.seat, "talk", 2600, ev.other);
          break;
        case "truth": speak(ev.seat, q); moment(ev.seat, "happy", 2400); break;
        case "bluff": speak(ev.seat, q); moment(ev.seat, "sad", 3200); break;
        case "devil":
          sfx("devil");
          setDevil({ id: ev.id, seat: ev.seat });
          setShake("hard");
          setTimeout(() => setDevil((d) => (d?.id === ev.id ? null : d)), 2600);
          speak(ev.seat, q);
          moment(ev.seat, "win", 3000);
          break;
        case "safe": sfx("click"); speak(ev.seat, q); moment(ev.seat, "happy", 2200); break;
        case "dead": sfx("bang"); setFlash(ev.id); setShake("hard"); speak(ev.seat, q); break;
        case "win": sfx("win"); setConfetti(ev.id); break;
        case "left": case "back": sfx("join"); break;
        default:
      }
    }
  }, [view.log, speak, moment]);

  // Table effects: whoosh + splat for throws, a little bob for chat lines.
  useEffect(() => {
    for (const f of fx) {
      if (seenFx.current.has(f.id)) continue;
      seenFx.current.add(f.id);
      if (f.kind === "throw") {
        sfx("whoosh");
        setTimeout(() => sfx(f.item === "💐" ? "joker" : "splat"), 650);
      } else if (f.kind === "say") {
        moment(f.seat, "talk", 1300);
      } else if (f.kind === "emote") {
        sfx("pop");
      }
    }
  }, [fx, moment]);

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(null), shake === "hard" ? 650 : 450);
    return () => clearTimeout(t);
  }, [shake]);

  const myTurn = view.phase === "playing" && view.turn === me && mine.alive;
  useEffect(() => { if (myTurn) sfx("turn"); }, [myTurn]);
  useEffect(() => { if (view.roulette?.spinning) sfx("spin"); }, [view.roulette?.spinning]);

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
  const play = (ids = selected) => {
    const pick = ids.slice(0, MAX_PLAY);
    if (canPick && pick.length) { act({ type: "play", ids: pick }); setSelected([]); }
  };
  const call = () => { if (canCall) act({ type: "call" }); };

  const states = {};
  for (const s of view.seats) states[s.idx] = moodOf(view, s.idx, moments);
  const myMood = states[me];
  const tc = RANKS[view.tableCard];
  const pileKey = view.log.find((e) => e.type === "play")?.id ?? 0;
  const myHit = [...fx].reverse().find((f) => f.kind === "throw" && f.to === me);
  const mySay = [...fx].reverse().find((f) => f.kind === "say" && f.seat === me);

  let status;
  if (!mine.alive) status = T.youDead;
  else if (myTurn) status = view.mustCall ? T.mustCall : T.yourTurn;
  else if (view.phase === "playing") status = `${T.waitingFor} ${view.seats[view.turn]?.name}`;
  else status = "…";

  const center = view.reveal ? (
    <RevealCards reveal={view.reveal} tableCard={view.tableCard} back={backOf(view.seats[view.reveal.by]?.looks)} />
  ) : view.phase === "dealing" ? (
    <div className="a-pop font-display text-3xl text-white" style={{ textShadow: "2px 3px 0 #2b1d14" }}>🃏 {T.round} {view.round}!</div>
  ) : null;

  return (
    <div className={`relative flex min-h-[100dvh] flex-col overflow-x-hidden ${shake === "hard" ? "a-shake" : shake === "soft" ? "a-nudge" : ""}`}>
      <div className="rotate-hint fixed inset-0 z-[99] flex-col items-center justify-center gap-3 bg-cream text-center">
        <span className="a-wiggle text-6xl">📱</span>
        <span className="px-6 text-lg font-black">{T.rotate}</span>
      </div>
      {flash ? <div key={flash} className="a-flash pointer-events-none fixed inset-0 z-[75] bg-white" onAnimationEnd={() => setFlash(0)} /> : null}
      {burst && <LiarBurst burst={burst.id} seat={view.seats[burst.seat]} />}
      {devil && <DevilBurst id={devil.id} seat={view.seats[devil.seat]} />}
      {confetti ? <Confetti key={confetti} /> : null}

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 px-2 sm:px-4 lg:grid-cols-[1fr_270px]">
        <div className="flex min-w-0 flex-col">
          {/* top bar */}
          <header className="safe-t flex items-center justify-between gap-1.5 pb-1">
            <button onClick={onLeave} className="comic-sm flex h-10 items-center rounded-full bg-paper px-3 text-sm font-extrabold" aria-label={T.leave}>
              ←<span className="ml-1 hidden sm:inline">{T.leave}</span>
            </button>
            <div className="comic-sm flex items-center gap-1.5 rounded-full bg-paper py-0.5 pl-0.5 pr-3">
              <Card key={`${view.round}-${view.tableCard}`} rank={view.tableCard} suit={{ K: "H", Q: "D", A: "S" }[view.tableCard]} size="xs" className="a-pop" />
              <div className="leading-none">
                <div className="text-[8px] font-extrabold uppercase tracking-wider text-ink-soft">{T.tableCard}</div>
                <div className="text-sm font-black" style={{ color: tc.color }}>{tc.emoji} {tc.geo}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {view.opts?.mode === "devil" && (
                <span className="comic-sm flex h-10 items-center rounded-full bg-[#2a0508] px-2.5 text-sm font-black text-sun" title={MODE_INFO.devil.hint}>😈</span>
              )}
              <span className="comic-sm flex h-10 items-center rounded-full bg-sun px-2.5 text-xs font-black sm:text-sm" title={T.round}>#{view.round}</span>
              <SoundToggle />
            </div>
          </header>

          {/* table */}
          <Table
            view={view}
            states={states}
            bubbles={Object.fromEntries(Object.entries(bubbles).map(([k, v]) => [k, v?.text]))}
            fx={fx}
            center={center}
            pileKey={pileKey}
            myLooks={myLooks}
            throwables={throwables}
            onThrow={(to, item) => { unlockAudio(); throwAt(to, item); }}
            className="min-h-[270px] flex-1 short:min-h-[220px] sm:min-h-[340px] lg:max-h-[520px]"
          />

          {/* me */}
          <div className="safe-b relative mt-2 short:mt-0">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex items-center gap-2">
                <div className="relative">
                  <Emotes list={fx.filter((f) => f.kind === "emote" && f.seat === me)} />
                  <Character avatar={mine.avatar} looks={mine.looks} color={seatColor(me)} size={54} state={myMood.state} hit={myHit?.item} hitKey={myHit?.id} hitDelay={650}
                    point={myMood.point != null ? -60 : null} />
                  <Bubble text={bubbles[me]?.text || (mySay && PHRASES[mySay.i])} />
                </div>
                <div>
                  <div className="max-w-[110px] truncate text-sm font-black">{mine.name}</div>
                  <Chambers pulls={mine.pulls} dead={!mine.alive} small />
                </div>
              </div>
              <div className={`flex items-center gap-1.5 rounded-full border-[2.5px] border-ink px-3 py-1 text-xs font-black sm:text-sm ${myTurn ? (view.mustCall ? "a-hop bg-coral text-white" : "a-hop bg-sun") : "bg-paper"}`}>
                <span className="max-w-[150px] truncate sm:max-w-none">{status}</span>
                {myTurn && <Timer deadline={view.deadline} offset={view.clockOffset} />}
              </div>
            </div>

            {mine.alive ? (
              mine.hand.length ? (
                <Hand cards={mine.hand} selected={selected} canPick={canPick} onToggle={toggle} onPlay={play} round={view.round} tableCard={view.tableCard} />
              ) : (
                <div className="flex min-h-[90px] items-center justify-center text-sm font-extrabold text-ink-soft">🫳 {T.outOfCards}</div>
              )
            ) : (
              <div className="flex min-h-[70px] items-center justify-center text-sm font-extrabold text-ink-soft">👻</div>
            )}

            {mine.alive && (
              <div className="mt-2 flex items-stretch justify-center gap-3 short:mt-1">
                <Btn color="coral" onClick={call} disabled={!canCall} className={`flex-1 py-3 short:py-2 sm:flex-none sm:px-8 ${canCall && view.mustCall ? "a-hop" : ""}`}>
                  <span className="block text-lg leading-none">🤥 {T.liar}</span>
                  <span className="block font-display text-xs tracking-wider opacity-80">{T.liarEn}</span>
                </Btn>
                <Btn color="sun" onClick={() => play()} disabled={!canPick || !selected.length} className="flex-1 py-3 short:py-2 sm:flex-none sm:px-8">
                  <span className="block text-lg leading-none">🃏 {T.play}{selected.length ? ` ×${selected.length}` : ""}</span>
                  <span className="block text-[11px] font-bold opacity-70">{canPick ? (selected.length ? `${selected.length}× ${tc.emoji} ${tc.geo} · ☝️` : T.pickCards) : " "}</span>
                </Btn>
              </div>
            )}

            {/* toolbar */}
            <div className="relative mt-3 flex items-center justify-center gap-2 pb-1 short:mt-1.5">
              {[["emote", "😀"], ["chat", "💬"], ["log", "📜"]].map(([k, icon]) => (
                <button key={k} onClick={() => setSheet(sheet === k ? null : k)}
                  className={`comic-sm flex h-11 w-11 items-center justify-center rounded-full text-xl transition-transform active:scale-90 short:h-10 short:w-10 short:text-lg ${sheet === k ? "bg-sun" : "bg-paper"} ${k === "log" ? "lg:hidden" : ""}`}
                  aria-label={k === "emote" ? "emoji" : k === "chat" ? T.chat : T.log} aria-expanded={sheet === k}>
                  {icon}
                </button>
              ))}
              <span className="max-w-[120px] text-[10px] font-bold leading-tight text-ink-soft">🍅 {T.throwHint}</span>
              {sheet === "emote" && (
                <div className="a-sheet comic absolute bottom-14 left-1/2 z-50 grid -translate-x-1/2 grid-cols-4 gap-1.5 rounded-3xl bg-paper p-2.5">
                  {EMOTES.map((e) => (
                    <button key={e} onClick={() => { unlockAudio(); emote(e); setSheet(null); }} className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-transform hover:bg-cream active:scale-90" aria-label={e}>{e}</button>
                  ))}
                </div>
              )}
              {sheet === "chat" && (
                <div className="a-sheet comic absolute bottom-14 left-1/2 z-50 grid w-[min(92vw,360px)] -translate-x-1/2 grid-cols-2 gap-1.5 rounded-3xl bg-paper p-2.5">
                  {PHRASES.map((p, i) => (
                    <button key={i} onClick={() => { unlockAudio(); say(i); setSheet(null); }} className="rounded-2xl border-2 border-ink bg-cream px-2 py-2 text-left text-xs font-extrabold transition-transform active:scale-95">{p}</button>
                  ))}
                </div>
              )}
              {sheet === "log" && (
                <div className="a-sheet comic fixed inset-x-2 bottom-2 z-[55] flex max-h-[60dvh] flex-col rounded-3xl bg-paper p-3 lg:hidden">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black">📜 {T.log}</span>
                    <button onClick={() => setSheet(null)} className="rounded-full border-2 border-ink px-2 text-sm font-black" aria-label="close">✕</button>
                  </div>
                  <Log view={view} nm={nm} />
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="comic hidden max-h-[calc(100dvh-24px)] flex-col self-start rounded-3xl bg-paper p-3 lg:sticky lg:top-3 lg:mt-3 lg:flex">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-black">📜 {T.log}</span>
            <span className="rounded-full border-2 border-ink bg-sun px-2 text-[11px] font-black">{T.round} {view.round}</span>
          </div>
          <Log view={view} nm={nm} />
        </aside>
      </div>

      {view.phase === "roulette" && view.roulette && <Roulette view={view} nm={nm} onPull={() => act({ type: "pull" })} />}
      {view.phase === "gameover" && <GameOver view={view} nm={nm} rewards={rewards} solo={solo} canRestart={canRestart} onAgain={onAgain} onLeave={onLeave} onToLobby={onToLobby} />}
    </div>
  );
}
