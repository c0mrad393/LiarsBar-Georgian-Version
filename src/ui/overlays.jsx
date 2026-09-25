// Full-screen and table-centre moments: the reveal, LIAR!, the devil, game over.
import { RANKS, T, quipText } from "../i18n.js";
import { sfx } from "../sfx.js";
import { Card, CardBack } from "./cards.jsx";
import Character, { seatColor } from "./Character.jsx";
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
      {rewards.list.length > 1 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1.5 border-t-2 border-dashed border-ink/30 pt-2">
          {rewards.list.filter((r) => r.seat !== view.me).map((r) => (
            <span key={r.seat} className="text-[11px] font-black">{view.seats[r.seat]?.avatar} +{r.got}</span>
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
        <div className="mt-1 text-lg font-extrabold text-sun" style={{ textShadow: "2px 2px 0 #000" }}>{seat?.avatar} {T.devilSub}</div>
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
          <div className="text-5xl">{seat?.avatar}</div>
          <div className="font-black text-white" style={{ fontSize: 40, textShadow: "3px 3px 0 #2b1d14" }}>{T.liar}</div>
          <div className="font-display text-3xl text-sun" style={{ textShadow: "2px 2px 0 #2b1d14" }}>{T.liarEn}</div>
        </div>
      </div>
    </div>
  );
}

export function GameOver({ view, nm, rewards, solo, canRestart, onAgain, onLeave, onToLobby }) {
  const w = view.winner != null ? view.seats[view.winner] : null;
  const iWon = view.winner === view.me;
  const ev = view.log.find((e) => e.type === "win");
  const quip = ev && quipText(ev);
  return (
    <div className="a-fade-up fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 px-4 backdrop-blur-[3px]">
      <div className="a-pop comic w-full max-w-sm rounded-[2rem] bg-paper p-7 text-center">
        <div className="relative mx-auto flex w-fit justify-center pt-8">
          {w ? (
            <Character avatar={w.avatar} looks={{ ...w.looks, hat: "👑" }} color={seatColor(w.idx)} size={112} state="win" />
          ) : (
            <div className="text-7xl">🍺</div>
          )}
        </div>
        <h2 className="mt-2 text-2xl font-black">{iWon ? T.youWin : w ? `${nm(view.winner)} ${T.wins}` : "…"}</h2>
        {quip && <div className="speech mx-auto mt-4 w-fit rounded-2xl px-3 py-1.5 text-sm font-extrabold">„{quip}“</div>}
        <p className="mt-4 text-sm font-bold text-ink-soft">{iWon ? T.winSub : T.loseSub}</p>
        <Rewards view={view} rewards={rewards} solo={solo} />
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
