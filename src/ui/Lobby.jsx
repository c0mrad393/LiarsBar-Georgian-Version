import { useEffect, useRef, useState } from "react";
import { PERSONAS } from "../engine.js";
import { T } from "../i18n.js";
import { inviteLink } from "../net.js";
import { sfx } from "../sfx.js";
import { Logo } from "./Home.jsx";
import { Btn, SoundToggle } from "./parts.jsx";

const BOT_FACES = Object.values(PERSONAS);

export default function Lobby({ lobby, isHost, setBotFill, canStart, onStart, onLeave }) {
  const [copied, setCopied] = useState(false);
  const link = lobby.code ? inviteLink(lobby.code) : "";
  const seats = lobby.seats;

  // Little fanfare when someone walks in.
  const prev = useRef(seats.length);
  useEffect(() => {
    if (seats.length > prev.current) sfx("join");
    prev.current = seats.length;
  }, [seats.length]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    sfx("pop");
    setTimeout(() => setCopied(false), 1800);
  };
  const share = () => navigator.share?.({ title: T.title, text: "მოდი, ვითამაშოთ მატყუარას ბარი! 🍻", url: link }).catch(() => {});

  let bot = 0;
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-10 pt-4">
      <div className="flex items-center justify-between">
        <button onClick={onLeave} className="comic-sm rounded-full bg-paper px-4 py-2 text-sm font-extrabold">← {T.leave}</button>
        <SoundToggle />
      </div>
      <div className="mt-4"><Logo small /></div>

      <section className="a-pop comic mt-5 rounded-3xl bg-sun p-5 text-center">
        <div className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">{T.roomCode}</div>
        <div className="font-display text-5xl tracking-[0.2em] text-ink">{lobby.code || "······"}</div>
        {isHost && lobby.code && (
          <>
            <div className="mt-3 text-sm font-extrabold">{T.invite}</div>
            <div className="mt-1.5 flex gap-2">
              <input readOnly value={link} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-xl border-[2.5px] border-ink bg-paper px-3 py-2 font-mono text-xs" />
              <Btn color="paper" onClick={copy} className="whitespace-nowrap px-3 py-2 text-sm">{copied ? T.copied : `📋 ${T.copy}`}</Btn>
              {typeof navigator !== "undefined" && navigator.share && (
                <Btn color="coral" onClick={share} className="px-3 py-2 text-sm" aria-label={T.share}>📤</Btn>
              )}
            </div>
          </>
        )}
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        {Array.from({ length: lobby.max }).map((_, i) => {
          const p = seats[i];
          if (p)
            return (
              <div key={`p${i}`} className="a-pop comic flex flex-col items-center rounded-3xl bg-paper p-4" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="a-hop text-5xl" style={{ animationDelay: `${i * 150}ms` }}>{p.avatar}</div>
                <div className="mt-1 max-w-full truncate text-base font-extrabold">{p.name}</div>
                <div className="mt-1 flex gap-1">
                  {p.host && <span className="rounded-full border-2 border-ink bg-coral px-2 text-[10px] font-black text-white">{T.hostTag}</span>}
                  {p.you && <span className="rounded-full border-2 border-ink bg-mint px-2 text-[10px] font-black text-white">{T.you}</span>}
                </div>
              </div>
            );
          if (lobby.botFill) {
            const b = BOT_FACES[bot++];
            return (
              <div key={`b${i}`} className="flex flex-col items-center rounded-3xl border-[3px] border-dashed border-ink/40 bg-paper/60 p-4">
                <div className="text-5xl opacity-70">{b.avatar}</div>
                <div className="mt-1 text-base font-extrabold text-ink-soft">{b.name} 🤖</div>
                <div className="text-[10px] font-bold text-ink-soft">{b.desc}</div>
              </div>
            );
          }
          return (
            <div key={`e${i}`} className="flex flex-col items-center justify-center rounded-3xl border-[3px] border-dashed border-ink/30 p-4 text-ink-soft">
              <div className="a-wiggle text-4xl opacity-50">🪑</div>
              <div className="mt-1 text-xs font-bold">{T.emptySeat}</div>
            </div>
          );
        })}
      </section>

      {seats.length < lobby.max && <p className="mt-4 text-center text-sm font-bold text-ink-soft">{T.waitingPlayers}</p>}

      {isHost ? (
        <div className="mt-5 flex flex-col gap-3">
          <label className="comic-sm flex cursor-pointer items-center justify-between rounded-2xl bg-paper px-4 py-3 font-extrabold">
            <span>🤖 {T.botFill}</span>
            <input type="checkbox" checked={lobby.botFill} onChange={(e) => setBotFill(e.target.checked)} className="h-6 w-6 accent-[#2ec4b6]" />
          </label>
          <Btn color="coral" disabled={!canStart} onClick={onStart} className="py-4 text-xl">🔥 {T.start}</Btn>
          {!canStart && <p className="text-center text-sm font-bold text-coral">{T.needTwo}</p>}
          <p className="text-center text-xs font-semibold text-ink-soft">💡 {T.keepOpen}</p>
        </div>
      ) : (
        <div className="comic mt-6 rounded-2xl bg-paper px-4 py-4 text-center font-extrabold">
          <span className="a-wiggle inline-block">🍺</span> {T.waitHost}
        </div>
      )}
    </div>
  );
}
