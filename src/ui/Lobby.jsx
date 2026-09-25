import { useEffect, useRef, useState } from "react";
import { PERSONAS } from "../engine.js";
import { MODE_INFO, T } from "../i18n.js";
import { inviteLink } from "../online.js";
import { sfx } from "../sfx.js";
import { Logo, ModePicker } from "./Home.jsx";
import { BOT_LOOKS, BOT_ORDER } from "../shared.js";
import Character, { seatColor } from "./Character.jsx";
import { Btn, SoundToggle, Stepper } from "./parts.jsx";

export default function Lobby({ lobby, isHost, setBots, setMode, onStart, onLeave }) {
  const [copied, setCopied] = useState(false);
  const link = lobby.code ? inviteLink(lobby.code) : "";
  const seats = lobby.seats;
  // Optimistic: quick taps shouldn't wait for the server's echo.
  const [bots, setBotsLocal] = useState(lobby.bots ?? 0);
  useEffect(() => setBotsLocal(lobby.bots ?? 0), [lobby.bots]);
  const changeBots = (v) => { setBotsLocal(v); setBots(v); };
  const botCount = Math.min(bots, lobby.max - seats.length);
  const ready = seats.length + botCount >= 2;

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

      {isHost ? (
        <div className="mt-5"><ModePicker mode={lobby.mode} setMode={setMode} /></div>
      ) : (
        <div className={`a-pop mt-5 rounded-2xl border-[2.5px] border-ink px-4 py-2.5 text-center ${lobby.mode === "devil" ? "bg-[#2a0508] text-white" : "bg-paper"}`} style={{ boxShadow: "0 3px 0 #2b1d14" }}>
          <div className="text-sm font-black">{MODE_INFO[lobby.mode || "classic"].emoji} {MODE_INFO[lobby.mode || "classic"].name}</div>
          <div className="text-[11px] font-semibold opacity-80">{MODE_INFO[lobby.mode || "classic"].hint}</div>
        </div>
      )}

      <section className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: lobby.max }).map((_, i) => {
          const p = seats[i];
          if (p)
            return (
              <div key={`p${i}`} className="a-pop comic flex flex-col items-center rounded-3xl bg-paper px-1 pb-2 pt-3" style={{ animationDelay: `${i * 60}ms` }}>
                <Character avatar={p.avatar} looks={p.looks} color={seatColor(i)} size={52} state={i % 2 ? "idle" : "turn"} />
                <div className="mt-1 max-w-full truncate text-sm font-extrabold">{p.name}</div>
                <div className="mt-0.5 flex gap-1">
                  {p.host && <span className="rounded-full border-2 border-ink bg-coral px-1.5 text-[9px] font-black text-white">{T.hostTag}</span>}
                  {p.you && <span className="rounded-full border-2 border-ink bg-mint px-1.5 text-[9px] font-black text-white">{T.you}</span>}
                </div>
              </div>
            );
          const b = i - seats.length;
          if (b < botCount) {
            const k = BOT_ORDER[b];
            return (
              <div key={`b${i}`} className="flex flex-col items-center rounded-3xl border-[3px] border-dashed border-ink/40 bg-paper/60 px-1 pb-2 pt-3">
                <div className="opacity-80"><Character avatar={PERSONAS[k].avatar} looks={BOT_LOOKS[k]} color={seatColor(i)} size={52} /></div>
                <div className="mt-1 text-sm font-extrabold text-ink-soft">{PERSONAS[k].name} 🤖</div>
                <div className="text-[9px] font-bold text-ink-soft">{PERSONAS[k].desc}</div>
              </div>
            );
          }
          return (
            <div key={`e${i}`} className="flex flex-col items-center justify-center rounded-3xl border-[3px] border-dashed border-ink/25 p-3 text-ink-soft">
              <div className="a-wiggle text-3xl opacity-50">🪑</div>
              <div className="mt-1 text-[10px] font-bold">{T.emptySeat}</div>
            </div>
          );
        })}
      </section>

      {seats.length < lobby.max && <p className="mt-4 text-center text-sm font-bold text-ink-soft">{T.waitingPlayers}</p>}

      {isHost ? (
        <div className="mt-5 flex flex-col gap-3">
          <div className="comic-sm flex items-center justify-between rounded-2xl bg-paper px-4 py-2.5 font-extrabold">
            <span>🤖 {T.bots}</span>
            <Stepper value={botCount} min={0} max={lobby.max - seats.length} onChange={changeBots} label={T.bots} />
          </div>
          <Btn color="coral" disabled={!ready} onClick={onStart} className="py-4 text-xl">🔥 {T.start}</Btn>
          {!ready && <p className="text-center text-sm font-bold text-coral">{T.needTwo}</p>}
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
