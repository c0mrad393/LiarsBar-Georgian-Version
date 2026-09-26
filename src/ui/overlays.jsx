// Full-screen and table-centre moments: the reveal, LIAR!, the devil, game over.
import { CHAOS_INFO, END_EMOTES, RANKS, T, quipText } from "../i18n.js";
import { ACH } from "../achievements.js";
import { sfx } from "../sfx.js";
import { Card, CardBack } from "./cards.jsx";
import Character, { seatColor } from "./Character.jsx";
import { Face } from "./heads.jsx";
import { useEffect, useState } from "react";
import { Btn, Confetti, Starburst } from "./parts.jsx";

/** Counts up to `to` for a little slot-machine feel. */
function useCountUp(to, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!to) { setN(0); return; }
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

const PART_LABEL = { seat: "rewardSeat", win: "rewardWin", safe: "rewardSafe", catch: "rewardCatch", devil: "rewardDevil" };

function Rewards({ view, rewards, solo }) {
  const mine = rewards?.list.find((r) => r.seat === view.me);
  const got = rewards?.you?.got ?? 0;
  const shown = useCountUp(got);
  useEffect(() => { if (got) setTimeout(() => sfx("win"), 250); }, [got]);
  if (solo) return <p className="mt-4 rounded-2xl bg-cream px-3 py-2 text-xs font-bold text-ink-soft">{T.coinsSolo}</p>;
  if (!rewards) return <p className="mt-4 text-2xl"><span className="a-wiggle inline-block">🪙</span></p>;
  if (!rewards.eligible) return <p className="mt-4 rounded-2xl bg-cream px-3 py-2 text-xs font-bold text-ink-soft">{T.coinsNeedTwo}</p>;
  return (
    <div className="a-pop mt-4 rounded-2xl border-[2.5px] border-ink bg-sun px-3 py-3">
      <div className="text-3xl font-black tabular-nums">+{shown} <span className="a-bob inline-block">🪙</span></div>
      {mine && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-1">
          {Object.entries(mine.parts).filter(([, v]) => v > 0).map(([k, v]) => (
            <span key={k} className="rounded-full border-2 border-ink bg-paper px-2 text-[11px] font-black">{T[PART_LABEL[k]]} +{v}</span>
          ))}
        </div>
      )}
      {rewards.you && <div className="mt-1.5 text-xs font-bold">{T.balance}: 🪙 {rewards.you.coins}{rewards.you.capped ? ` · ${T.coinsCapped}` : ""}</div>}
      {rewards.you?.unlocked?.length > 0 && (
        <div className="mt-2 border-t-2 border-dashed border-ink/30 pt-2">
          <div className="text-xs font-black">🏅 {T.newAch}</div>
          <div className="mt-1 flex flex-wrap justify-center gap-1.5">
            {rewards.you.unlocked.map((id, i) => ACH[id] && (
              <span key={id} className="a-pop inline-flex items-center gap-1 rounded-full border-2 border-ink bg-grape px-2 py-0.5 text-xs font-black text-white" style={{ animationDelay: `${600 + i * 200}ms` }}>
                <span className="a-hop inline-block">{ACH[id].icon}</span> {ACH[id].name}
              </span>
            ))}
          </div>
        </div>
      )}
      {rewards.list.length > 1 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1.5 border-t-2 border-dashed border-ink/30 pt-2">
          {rewards.list.filter((r) => r.seat !== view.me).map((r) => (
            <span key={r.seat} className="text-[11px] font-black"><Face id={view.seats[r.seat]?.avatar} size={18} /> +{r.got}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export const isWild = (rank) => rank === "J" || rank === "D";

function Sparkles() {
  return Array.from({ length: 8 }).map((_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return (
      <span key={i} className="a-sparkle pointer-events-none absolute left-1/2 top-1/2 text-base"
        style={{ "--dx": `${Math.cos(a) * 48}px`, "--dy": `${Math.sin(a) * 58}px`, animationDelay: "inherit" }}>✨</span>
    );
  });
}

export function RevealCards({ reveal, tableCard, back }) {
  const n = reveal.cards.length;
  const tc = RANKS[tableCard];
  const stamp = reveal.devil
    ? { text: `😈 ${RANKS.D.geo}!`, bg: "#2a0508", sound: "devil" }
    : reveal.truthful
      ? { text: `✅ ${T.truth}`, bg: "#2ec4b6", sound: "truth" }
      : { text: `❌ ${T.bluff}`, bg: "#ff5a5f", sound: "bluff" };
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2">
        {reveal.cards.map((c, i) => {
          const wild = isWild(c.rank);
          const delay = `${1000 + i * 280}ms`;
          return (
            <div key={i} className="flip-wrap relative">
              <CardBack size="md" back={back} />
              <div
                className={`a-flip absolute inset-0 ${wild && c.rank === "J" ? "a-rainbow" : ""}`}
                style={{ animationDelay: delay, backfaceVisibility: "hidden" }}
                onAnimationStart={(e) => { if (wild && e.animationName === "flip") sfx(c.rank === "J" ? "joker" : "liar"); }}>
                <Card rank={c.rank} suit={c.suit} size="md" glow={c.rank === "D" ? "#ff5a5f" : null} />
                {wild && (
                  <div style={{ animationDelay: delay }}>
                    <Sparkles />
                    <span className="a-pop absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-sun px-1.5 text-[10px] font-black" style={{ animationDelay: delay }}>
                      = {tc.emoji} {tc.geo}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div onAnimationStart={() => sfx(stamp.sound)} className="a-stamp mt-5 rounded-xl border-[3px] border-ink px-4 py-1 font-display text-2xl tracking-wide"
        style={{ animationDelay: `${1200 + n * 280}ms`, background: stamp.bg, color: "white", textShadow: "2px 2px 0 #2b1d14" }}>
        {stamp.text}
      </div>
    </div>
  );
}

export function DevilBurst({ id, seat }) {
  return (
    <div key={id} className="a-devil-bg pointer-events-none fixed inset-0 z-[72] flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(circle at 50% 42%, rgba(214,60,30,.96), rgba(110,8,20,.97) 50%, rgba(20,2,4,.99))" }}>
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 text-6xl sm:text-7xl">
        {Array.from({ length: 9 }).map((_, i) => <span key={i} className="a-flicker inline-block" style={{ animationDelay: `${i * 70}ms` }}>🔥</span>)}
      </div>
      <div className="a-devil-card"><div className="scale-[1.7] sm:scale-[1.9]"><Card rank="D" size="lg" glow="#ffb02e" /></div></div>
      <div className="a-pop mt-20 px-4 text-center sm:mt-24" style={{ animationDelay: "0.5s" }}>
        <div className="font-black text-white" style={{ fontSize: 36, textShadow: "3px 3px 0 #000" }}>{T.devilTitle}</div>
        <div className="mt-1 text-lg font-extrabold text-sun" style={{ textShadow: "2px 2px 0 #000" }}><Face id={seat?.avatar} size={26} /> {T.devilSub}</div>
      </div>
    </div>
  );
}

export function LiarBurst({ burst, seat }) {
  return (
    <div key={burst} className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
      <div className="a-burst relative flex h-[330px] w-[330px] items-center justify-center sm:h-[420px] sm:w-[420px]">
        <Starburst fill="#ff5a5f" points={16} className="absolute inset-0 h-full w-full" />
        <div className="relative text-center">
          <Face id={seat?.avatar} size={60} state="talk" />
          <div className="font-black text-white" style={{ fontSize: 40, textShadow: "3px 3px 0 #2b1d14" }}>{T.liar}</div>
          <div className="font-display text-3xl text-sun" style={{ textShadow: "2px 2px 0 #2b1d14" }}>{T.liarEn}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Game over: everyone at the table in a row, with their reactions popping up
 * over their faces, and the buttons to send your own.
 */
function EndReactions({ view, fx, emote }) {
  const [sent, setSent] = useState(null);
  const send = (e) => {
    emote(e);
    sfx("pop");
    setSent(e);
  };
  return (
    <div className="mt-4 rounded-2xl border-[2.5px] border-ink bg-cream px-2 pb-2 pt-1">
      <div className="flex justify-center gap-1.5 pt-7">
        {view.seats.map((s) => {
          const mine = fx.filter((f) => f.kind === "emote" && f.seat === s.idx);
          return (
            <div key={s.idx} className="relative flex flex-col items-center" title={s.name}>
              {mine.map((f) => (
                <span key={f.id} className="a-float-up pointer-events-none absolute bottom-6 z-10 text-3xl" style={{ left: `${10 + f.x * 30}%`, "--r": `${(f.x - 0.5) * 40}deg` }}>{f.e}</span>
              ))}
              <span className={`flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-ink ${s.idx === view.me ? "ring-2 ring-sun ring-offset-1" : ""}`} style={{ background: seatColor(s.idx) }}>
                <Face id={s.avatar} size={34} state={s.idx === view.winner ? "win" : "sad"} />
              </span>
              <span className="mt-0.5 max-w-[48px] truncate text-[10px] font-black">{s.name}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-[11px] font-black text-ink-soft">{T.endReact}</div>
      <div className="mt-1 grid grid-cols-5 gap-1">
        {END_EMOTES.map((e) => (
          <button key={e} onClick={() => send(e)} aria-label={e}
            className={`flex h-10 items-center justify-center rounded-xl text-2xl transition-transform active:scale-90 ${sent === e ? "bg-sun" : "bg-paper"}`}>{e}</button>
        ))}
      </div>
    </div>
  );
}

export function GameOver({ view, nm, rewards, solo, canRestart, onAgain, onLeave, onToLobby, fx = [], emote }) {
  const w = view.winner != null ? view.seats[view.winner] : null;
  const iWon = view.winner === view.me;
  const ev = view.log.find((e) => e.type === "win");
  const quip = ev && quipText(ev);
  return (
    <div className="a-fade-up fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 px-4 backdrop-blur-[3px]">
      <div className="a-pop comic no-scrollbar max-h-[94dvh] w-full max-w-sm overflow-y-auto rounded-[2rem] bg-paper px-6 pb-6 pt-4 text-center">
        <div className="relative mx-auto flex w-fit justify-center pt-8 short:pt-6">
          {w ? (
            <Character avatar={w.avatar} looks={{ ...w.looks, hat: "hat_crown" }} color={seatColor(w.idx)} size={96} state="win" />
          ) : (
            <div className="text-7xl">🍺</div>
          )}
        </div>
        <h2 className="mt-2 text-2xl font-black">{iWon ? T.youWin : w ? `${nm(view.winner)} ${T.wins}` : "…"}</h2>
        {quip && <div className="speech mx-auto mt-2 w-fit rounded-2xl px-3 py-1.5 text-sm font-extrabold">„{quip}“</div>}
        <p className="mt-2 text-sm font-bold text-ink-soft">{iWon ? T.winSub : T.loseSub}</p>
        <Rewards view={view} rewards={rewards} solo={solo} />
        {emote && <EndReactions view={view} fx={fx} emote={emote} />}
        <div className="mt-4 flex flex-col gap-2">
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

/** Chaos mode: the round's event spins in over the table. */
export function ChaosBanner({ event }) {
  const ev = CHAOS_INFO[event];
  if (!ev) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[71] flex items-center justify-center px-6">
      <div className="a-chaos relative flex h-[300px] w-[300px] items-center justify-center sm:h-[360px] sm:w-[360px]">
        <Starburst fill="#9b5de5" points={18} className="a-spin-slow absolute inset-0 h-full w-full" />
        <div className="relative max-w-[210px] text-center text-white">
          <div className="font-display text-sm tracking-[0.3em] opacity-90">🌀 {T.chaosRound}</div>
          <div className="a-wiggle my-1 inline-block text-6xl">{ev.emoji}</div>
          <div className="font-display text-3xl leading-none" style={{ textShadow: "3px 3px 0 #2b1d14" }}>{ev.name}</div>
          <div className="mt-2 text-sm font-extrabold leading-snug">{ev.desc}</div>
        </div>
      </div>
    </div>
  );
}

/** Only two left: the screen splits for a face-off. */
export function DuelSplit({ a, b }) {
  const half = (seat, side) => (
    <div className={`absolute inset-0 flex items-center ${side === "l" ? "duel-l justify-start pl-[8%]" : "duel-r justify-end pr-[8%]"}`}
      style={{ background: `linear-gradient(${side === "l" ? "135deg" : "315deg"}, ${seatColor(seat.idx)}, color-mix(in srgb, ${seatColor(seat.idx)} 70%, #2b1d14))` }}>
      <div className={`flex flex-col items-center ${side === "l" ? "mt-[-22vh]" : "mt-[22vh]"}`}>
        <div style={side === "r" ? { transform: "scaleX(-1)" } : undefined}>
          <Character avatar={seat.avatar} looks={seat.looks} color={seatColor(seat.idx)} size={120} state="turn" />
        </div>
        <div className="mt-2 max-w-[40vw] truncate rounded-full border-[3px] border-ink bg-paper px-3 font-black">{seat.name}</div>
      </div>
    </div>
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[73] overflow-hidden">
      {half(a, "l")}
      {half(b, "r")}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="duel-vs relative flex h-40 w-40 items-center justify-center">
          <Starburst fill="#ffc83d" points={14} className="absolute inset-0 h-full w-full" />
          <span className="relative font-display text-5xl text-ink">VS</span>
        </div>
        <div className="duel-vs mt-2 rounded-2xl border-[3px] border-ink bg-ink px-4 py-1.5 text-center text-white" style={{ animationDelay: "0.1s" }}>
          <div className="font-display text-2xl text-sun">⚔️ {T.finalDuel}</div>
          <div className="text-xs font-bold">{T.finalDuelSub}</div>
        </div>
      </div>
    </div>
  );
}
