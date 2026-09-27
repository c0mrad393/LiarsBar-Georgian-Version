import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { use3D } from "../settings.js";
import Guard3D from "./Guard3D.jsx";
import { useWakeLock } from "../device.js";
import { ITEMS } from "../shop.js";
import { MAX_PLAY } from "../engine.js";
import { CHAOS_INFO, MODE_INFO, PHRASES, RANKS, T, quipText } from "../i18n.js";
import { sfx, unlockAudio } from "../sfx.js";
import { useMusic } from "../music.js";
import { Card } from "./cards.jsx";
import Character, { Avatar, seatColor } from "./Character.jsx";
import Hand from "./Hand.jsx";
import { BidPicker, Die, MyDice, RevealDice } from "./dice.jsx";
import { ChaosBanner, DevilBurst, DuelSplit, GameOver, LiarBurst, RevealCards } from "./overlays.jsx";
import { Btn, Chambers, Confetti, SoundToggle, Timer, TitleTag } from "./parts.jsx";
import Roulette, { RouletteHud } from "./Roulette.jsx";
import BarScene from "./BarScene.jsx";
import { EmoteWheel, useEmoteWheel } from "./EmoteWheel.jsx";
import { TamadaTip, useTutorial } from "./Tutorial.jsx";
import Table, { Bubble, Emotes } from "./Table.jsx";

// three.js loads only for players on the 3D table.
const Table3D = lazy(() => import("./Table3D.jsx"));

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

export default function Game({ view, act, fx, emote, throwAt, say, rewards, solo, myLooks, throwables, canRestart, onAgain, onLeave, onToLobby }) {
  const me = view.me;
  const mine = view.seats[me];
  const three = use3D();
  const [selected, setSelected] = useState([]);
  const [bubbles, setBubbles] = useState({});
  const [moments, setMoments] = useState({});
  const [shake, setShake] = useState(null);
  const [flash, setFlash] = useState(0);
  const [burst, setBurst] = useState(null);
  const [devil, setDevil] = useState(null);
  const [confetti, setConfetti] = useState(0);
  const [chaos, setChaos] = useState(null);
  const [lamps, setLamps] = useState(0); // bumps on every shot: the bar's lamps flicker
  const [duel, setDuel] = useState(null);
  const duelShown = useRef(false);
  const [sheet, setSheet] = useState(null); // react
  // One-time hint that you can throw things at people.
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (view.phase !== "playing") return;
    let seen = true;
    try { seen = localStorage.getItem("lb-tip-wheel") === "1"; localStorage.setItem("lb-tip-wheel", "1"); } catch { /* private mode */ }
    if (seen) return;
    setTip(true);
    const t = setTimeout(() => setTip(false), 8000);
    return () => clearTimeout(t);
  }, [view.phase === "playing"]); // eslint-disable-line react-hooks/exhaustive-deps
  const [, tick] = useState(0);
  const tableRef = useRef(null);
  const sendEmote = useCallback((e) => { unlockAudio(); emote(e); }, [emote]);
  const wheel = useEmoteWheel(tableRef, sendEmote);
  const tut = useTutorial(view, solo);
  const lastSeen = useRef(null);
  const seenFx = useRef(new Set());
  useWakeLock(view.phase !== "gameover");
  useMusic(view.phase === "roulette" ? "tense" : view.opts?.mode === "chaos" ? "chaos" : "bar");

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
        case "start": duelShown.current = false; break;
        case "deal":
        case "roll": {
          if (ev.type === "deal") sfx("deal");
          // Down to the last two: a split-screen face-off, once per game.
          const alive = view.seats.filter((p) => p.alive);
          if (alive.length === 2 && !duelShown.current && view.phase !== "gameover") {
            duelShown.current = true;
            sfx("devil");
            setDuel({ id: ev.id, a: alive[0], b: alive[1] });
            setTimeout(() => setDuel((d) => (d?.id === ev.id ? null : d)), 2700);
          }
          break;
        }
        case "chaos":
          sfx("joker");
          setChaos({ id: ev.id, event: ev.event });
          setTimeout(() => setChaos((c) => (c?.id === ev.id ? null : c)), 2700);
          break;
        case "play": case "bid": sfx("card"); if (q) { speak(ev.seat, q); moment(ev.seat, "talk", 1400); } break;
        case "call":
          sfx("liar");
          setBurst({ id: ev.id, seat: ev.seat });
          setShake("soft");
          setTimeout(() => setBurst((b) => (b?.id === ev.id ? null : b)), 1250);
          speak(ev.seat, q);
          moment(ev.seat, "talk", 2600, ev.other);
          if (ev.other != null) moment(ev.other, "nervous", 2600); // the accused starts sweating
          break;
        case "truth": speak(ev.seat, q); moment(ev.seat, "happy", 2400); if (ev.other != null) moment(ev.other, "sad", 2400); break;
        case "bluff": speak(ev.seat, q); moment(ev.seat, "busted", 3400); if (ev.other != null) moment(ev.other, "happy", 2400); break; // caught: the nose grows
        case "devil":
          sfx("devil");
          setDevil({ id: ev.id, seat: ev.seat });
          setShake("hard");
          setTimeout(() => setDevil((d) => (d?.id === ev.id ? null : d)), 2600);
          speak(ev.seat, q);
          moment(ev.seat, "win", 3000);
          break;
        case "safe": sfx("click"); speak(ev.seat, q); moment(ev.seat, ev.wine ? "tipsy" : "happy", ev.wine ? 3000 : 2200); break;
        case "dead": sfx("bang"); setFlash(ev.id); setLamps(ev.id); setShake("hard"); speak(ev.seat, q); break;
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

  const dice = view.kind === "dice";
  const maxPlay = view.maxPlay || MAX_PLAY;
  const ev = view.event && CHAOS_INFO[view.event];
  const canPick = myTurn && !view.mustCall && !dice;
  const canCall = myTurn && (dice ? view.bid && view.bid.by !== me : view.pile && view.pile.by !== me);
  const toggle = (id) => {
    if (!canPick) return;
    unlockAudio();
    sfx("select");
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= maxPlay ? (maxPlay === 1 ? [id] : s) : [...s, id]));
  };
  const play = (ids = selected) => {
    const pick = ids.slice(0, maxPlay);
    if (canPick && pick.length) { act({ type: "play", ids: pick }); setSelected([]); }
  };
  const call = () => { if (canCall) act({ type: "call" }); };

  const pill = three ? "glass" : "comic-sm bg-paper";
  const states = {};
  for (const s of view.seats) states[s.idx] = moodOf(view, s.idx, moments);
  const myMood = states[me];
  const tc = RANKS[view.tableCard] || RANKS.K;
  const pileKey = view.log.find((e) => e.type === "play")?.id ?? 0;
  const myHit = [...fx].reverse().find((f) => f.kind === "throw" && f.to === me);
  const mySay = [...fx].reverse().find((f) => f.kind === "say" && f.seat === me);

  const up = view.seats[view.turn];
  const waiting =
    view.phase === "playing" && up ? (
      <><Avatar id={up.avatar} looks={up.looks} color={seatColor(up.idx)} size={26} /><span className="truncate">{up.name} {T.thinking}</span></>
    ) : view.phase === "dealing" ? (
      <>{dice ? "🎲" : "🃏"} {T.round} {view.round}</>
    ) : view.phase === "reveal" ? (
      <span className="a-wiggle inline-block text-xl">👀</span>
    ) : view.phase === "roulette" && view.roulette && !three ? (
      <>{dice ? "🍷" : "🔫"} {view.seats[view.roulette.victim]?.name} {dice ? T.faceGlass : T.facesGun}</>
    ) : null;

  const center = view.reveal ? (
    dice ? <RevealDice reveal={view.reveal} seats={view.seats} /> : <RevealCards reveal={view.reveal} tableCard={view.tableCard} back={backOf(view.seats[view.reveal.by]?.looks)} />
  ) : view.phase === "dealing" ? (
    <div className="a-pop font-display text-3xl text-white" style={{ textShadow: "2px 3px 0 #2b1d14" }}>{dice ? <><span className="a-cup inline-block">🎲</span> {T.diceRound}</> : <>🃏 {T.round} {view.round}!</>}</div>
  ) : null;

  // On the 3D table the cards flip in 3D; the verdict is stamped over the table.
  const stamp = view.reveal && !dice && (
    <div key={view.log[0]?.id} className="a-stamp glass rounded-full px-5 py-1.5 text-xl font-black tracking-wide"
      style={{ animationDelay: "1400ms", color: view.reveal.devil ? "#ff8a6e" : view.reveal.truthful ? "#9ee6a8" : "#ff8a7a" }}
      onAnimationStart={() => sfx(view.reveal.devil ? "devil" : view.reveal.truthful ? "truth" : "bluff")}>
      {view.reveal.devil ? `😈 ${RANKS.D.geo}!` : view.reveal.truthful ? `✅ ${T.truth}` : `❌ ${T.bluff}`}
    </div>
  );
  const center3d = view.reveal ? (dice ? <div className="origin-center scale-90"><RevealDice reveal={view.reveal} seats={view.seats} /></div> : stamp) : view.phase === "dealing" ? center : null;

  return (
    <div className={`relative flex min-h-[100dvh] flex-col overflow-x-hidden ${shake === "hard" ? "a-shake" : shake === "soft" ? "a-nudge" : ""}`}>
      <div className="rotate-hint fixed inset-0 z-[99] flex-col items-center justify-center gap-3 bg-cream text-center">
        <span className="a-wiggle text-6xl">📱</span>
        <span className="px-6 text-lg font-black">{T.rotate}</span>
      </div>
      {flash ? <div key={flash} className="a-flash pointer-events-none fixed inset-0 z-[75] bg-white" onAnimationEnd={() => setFlash(0)} /> : null}
      {burst && <LiarBurst burst={burst.id} seat={view.seats[burst.seat]} three={three} />}
      {devil && <DevilBurst id={devil.id} seat={view.seats[devil.seat]} />}
      {confetti ? <Confetti key={confetti} /> : null}
      {chaos && <ChaosBanner key={chaos.id} event={chaos.event} />}
      {duel && <DuelSplit key={duel.id} a={duel.a} b={duel.b} />}
      {tut.text && view.phase !== "gameover" && <TamadaTip text={tut.text} step={tut.step} onNext={tut.next} onSkip={tut.skip} />}
      {wheel.wheel && (
        <EmoteWheel {...wheel.wheel} onPick={(e) => { sendEmote(e); wheel.close(); }} onClose={wheel.close}
          onPhrases={() => { wheel.close(); setSheet("react"); }} />
      )}

      {three ? (
        <div ref={tableRef} className="fixed inset-0 z-0">
          <Guard3D>
          <Suspense fallback={<BarScene mode={view.opts?.mode} />}>
            <Table3D view={view} states={states} bubbles={Object.fromEntries(Object.entries(bubbles).map(([k, v]) => [k, v?.text]))} fx={fx}
              myLooks={myLooks} throwables={throwables} onThrow={(to, item) => { unlockAudio(); throwAt(to, item); }} flicker={lamps} center={center3d} />
          </Suspense>
          </Guard3D>
        </div>
      ) : (
        <BarScene mode={view.opts?.mode} flicker={lamps} />
      )}
      <div className={`relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-2 sm:px-4 ${three ? "pointer-events-none" : ""}`}>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* top bar */}
          <header className="safe-t pointer-events-auto flex items-center justify-between gap-1.5 pb-1">
            <button onClick={onLeave} className={`${pill} flex h-10 w-10 items-center justify-center rounded-full text-lg font-black`} aria-label={T.leave} title={T.leave}>←</button>
            {dice ? (
              <div className={`${pill} flex h-10 items-center gap-1.5 rounded-full pl-1 pr-3`}>
                <Die face={1} size={30} />
                <div className="leading-none">
                  <div className="text-[8px] font-extrabold uppercase tracking-wider opacity-60">{T.diceTotal}</div>
                  <div className="text-sm font-black">🎲 {view.totalDice}</div>
                </div>
              </div>
            ) : (
              <div className={`${pill} flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-3`}>
                <Card key={`${view.round}-${view.tableCard}`} rank={view.tableCard} suit={{ K: "H", Q: "D", A: "S" }[view.tableCard]} size="xs" className="a-pop" />
                <div className="leading-none">
                  <div className="text-[8px] font-extrabold uppercase tracking-wider opacity-60">{T.tableCard}</div>
                  <div className="text-sm font-black" style={{ color: three ? undefined : tc.color }}>{tc.emoji} {tc.geo}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {view.opts?.mode === "devil" && (
                <span className={`${three ? "glass" : "comic-sm bg-[#2a0508] text-sun"} flex h-10 w-10 items-center justify-center rounded-full text-sm font-black`} title={MODE_INFO.devil.hint}>😈</span>
              )}
              {ev && (
                <button key={view.event + view.round} onClick={() => setChaos({ id: Math.random(), event: view.event })} title={`${ev.name} ${ev.desc}`} aria-label={`${ev.name} ${ev.desc}`}
                  className={`a-pop ${three ? "glass" : "comic-sm bg-grape text-white"} flex h-10 items-center gap-1 rounded-full px-2.5 text-sm font-black`}>
                  <span className="a-wiggle inline-block">{ev.emoji}</span><span className="hidden sm:inline">{ev.name}</span>
                </button>
              )}
              <SoundToggle glass={three} />
            </div>
          </header>

          {/* table */}
          {three ? (
            <div className="min-h-[270px] flex-1 short:min-h-[220px] sm:min-h-[340px]" />
          ) : (
          <div ref={tableRef} className="contents">
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
          </div>
          )}

          {/* me */}
          <div className="safe-b pointer-events-auto relative mt-2 short:mt-0">
            <div className="relative flex items-center justify-between gap-2">
              <div className="relative flex min-w-0 items-center gap-2">
                <div className="relative">
                  <Emotes list={fx.filter((f) => f.kind === "emote" && f.seat === me)} />
                  <Character avatar={mine.avatar} looks={mine.looks} color={seatColor(me)} size={54} state={myMood.state} blush={dice ? mine.pulls / 5 : 0} hit={myHit?.item} hitKey={myHit?.id} hitDelay={650}
                    point={myMood.point != null ? -60 : null} />
                  <Bubble text={bubbles[me]?.text || (mySay && PHRASES[mySay.i])} />
                </div>
                <div className="min-w-0">
                  <div className="on-night max-w-[140px] truncate text-sm font-black">{mine.title && <TitleTag id={mine.title} short className="mr-0.5" />}{mine.name}</div>
                  <Chambers pulls={mine.pulls} dead={!mine.alive} small />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {myTurn && (
                  <span className={`a-pop flex items-center gap-1.5 rounded-full border-[2.5px] border-ink py-0.5 pl-2.5 pr-1 text-xs font-black ${view.mustCall ? "bg-coral text-white" : "bg-sun"}`}>
                    <span className="a-heartbeat inline-block">{T.yourTurn}</span>
                    <Timer deadline={view.deadline} offset={view.clockOffset} className="!border-0 !px-1" />
                  </span>
                )}
                <button onClick={(e) => { unlockAudio(); sfx("pop"); setSheet(null); const r = e.currentTarget.getBoundingClientRect(); wheel.openAt(r.left + r.width / 2, r.top - 60); }} aria-label={T.react}
                  className={`${three ? "glass" : "comic-sm"} flex h-11 w-11 items-center justify-center rounded-full text-xl transition-transform active:scale-90 ${sheet === "react" ? "!bg-sun" : three ? "" : "bg-paper"}`}>😀</button>
              </div>
              {sheet === "react" && (
                <div className="a-pop comic absolute bottom-full right-0 z-50 mb-2 w-[min(92vw,340px)] rounded-3xl bg-paper p-2.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {PHRASES.map((p, i) => (
                      <button key={i} onClick={() => { unlockAudio(); say(i); setSheet(null); }} className="rounded-xl bg-cream px-2 py-1.5 text-left text-xs font-extrabold transition-transform active:scale-95">{p}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {mine.alive ? (
              dice ? (
                <MyDice dice={mine.dice || []} round={view.round} bidFace={view.bid?.f} />
              ) : mine.hand.length ? (
                <Hand cards={mine.hand} selected={selected} canPick={canPick} onToggle={toggle} onPlay={play} round={view.round} tableCard={view.tableCard} back={backOf(myLooks)} />
              ) : (
                <div className="on-night-soft flex min-h-[90px] items-center justify-center text-sm font-extrabold">🫳 {T.outOfCards}</div>
              )
            ) : (
              <div className="on-night-soft flex min-h-[90px] flex-col items-center justify-center gap-1 text-sm font-extrabold"><span className="a-bob inline-block text-3xl">👻</span>{T.youDead}</div>
            )}

            {/* actions on your turn; otherwise a calm line saying who's up */}
            {mine.alive && (
              <div className="mt-2 flex min-h-[60px] items-stretch justify-center gap-3 short:mt-1 short:min-h-[50px]">
                {myTurn && dice ? (
                  <BidPicker bid={view.bid} total={view.totalDice} dice={mine.dice || []} canCall={canCall} mustCall={view.mustCall}
                    onBid={(q, f) => act({ type: "bid", q, f })} onCall={call} />
                ) : myTurn ? (
                  <>
                    <Btn color="coral" onClick={call} disabled={!canCall} className={`a-pop flex-1 py-3 short:py-2 sm:flex-none sm:px-8 ${canCall && view.mustCall ? "a-hop" : ""}`}>
                      <span className="block text-lg leading-none">🤥 {T.liar}</span>
                      <span className="block font-display text-xs tracking-wider opacity-80">{T.liarEn}</span>
                    </Btn>
                    {view.mustCall ? (
                      <div className="a-pop flex flex-1 items-center justify-center rounded-2xl border-[2.5px] border-dashed border-coral px-2 text-center text-xs font-black text-coral sm:flex-none sm:px-6">{T.mustCall}</div>
                    ) : (
                      <Btn color="sun" onClick={() => play()} disabled={!selected.length} className="a-pop flex-1 py-3 short:py-2 sm:flex-none sm:px-8" style={{ animationDelay: "60ms" }}>
                        <span className="block text-lg leading-none">🃏 {T.play}{selected.length ? ` ×${selected.length}` : ""}</span>
                        <span className="block text-[11px] font-bold opacity-70">{selected.length ? `${selected.length}× ${tc.emoji} ${tc.geo} · ☝️` : maxPlay === 1 ? T.pickOne : T.pickCards}</span>
                      </Btn>
                    )}
                  </>
                ) : (
                  waiting && <div className={`${three ? "glass" : "on-night-soft border-2 border-cream/10 bg-black/35"} mx-auto flex max-w-full items-center justify-center gap-2 self-center rounded-full px-4 py-1.5 text-sm font-extrabold`}>{waiting}</div>
                )}
              </div>
            )}

            {tip && !tut.text && (
              <div className="a-pop pointer-events-none absolute -top-16 left-1/2 z-40 w-max max-w-[92vw] -translate-x-1/2 rounded-2xl border-[2.5px] border-ink bg-sun px-3 py-1 text-center text-xs font-black leading-relaxed" style={{ boxShadow: "0 3px 0 #2b1d14" }}>
                {T.tipThrow}<br />{T.tipWheel}
              </div>
            )}
          </div>
        </div>
      </div>

      {view.phase === "roulette" && view.roulette && (three
        ? <RouletteHud view={view} nm={nm} onPull={() => act({ type: "pull" })} />
        : <Roulette view={view} nm={nm} onPull={() => act({ type: "pull" })} />)}
      {view.phase === "gameover" && <GameOver view={view} nm={nm} rewards={rewards} solo={solo} canRestart={canRestart} onAgain={onAgain} onLeave={onLeave} onToLobby={onToLobby} fx={fx} emote={(e) => { unlockAudio(); emote(e); }} />}
    </div>
  );
}
