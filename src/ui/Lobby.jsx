import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { use3D } from "../settings.js";
import { PERSONAS } from "../engine.js";
import { MODE_INFO, T } from "../i18n.js";
import { inviteLink } from "../online.js";
import { sfx } from "../sfx.js";
import { useMusic } from "../music.js";
import { Backdrop, Logo, MODE_SKIN, ModePicker } from "./Home.jsx";
import { BOT_LOOKS, BOT_ORDER } from "../shared.js";
import Character, { seatColor } from "./Character.jsx";
import { Btn, SoundToggle, Stepper, TitleTag } from "./parts.jsx";

/** Seconds until a public table starts by itself. */
function useStartsIn(lobby) {
  const [left, setLeft] = useState(null);
  const at = lobby.startsAt ? lobby.startsAt + (Date.now() - (lobby.now || Date.now())) : null;
  useEffect(() => {
    if (!at) { setLeft(null); return; }
    const tick = () => setLeft(Math.max(0, Math.ceil((at - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [lobby.startsAt]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
}

export default function Lobby({ lobby, isHost, setBots, setMode, setPublic, onStart, onLeave }) {
  const startsIn = useStartsIn(lobby);
  useMusic("bar");
  useEffect(() => { if (startsIn != null && startsIn <= 3 && startsIn > 0) sfx("select"); }, [startsIn]);
  const [copied, setCopied] = useState(false);
  const link = lobby.code ? inviteLink(lobby.code) : "";
  const seats = lobby.seats;
  // Optimistic: quick taps shouldn't wait for the server's echo.
  const [bots, setBotsLocal] = useState(lobby.bots ?? 0);
  useEffect(() => setBotsLocal(lobby.bots ?? 0), [lobby.bots]);
  const changeBots = (v) => { setBotsLocal(v); setBots(v); };
  const botCount = Math.min(bots, lobby.max - seats.length);
  const ready = seats.length + botCount >= 2;
  const [theme] = useState(() => (Math.random() * 4) | 0);
  const three = use3D();
  // in 3D the table shows through a window in the page: keep the room framed on it while scrolling
  const hole = useRef(null);
  const [anchor, setAnchor] = useState(0.6);
  useLayoutEffect(() => {
    if (!three) return;
    const measure = () => { const r = hole.current?.getBoundingClientRect(); if (r) setAnchor(Math.min(1.3, Math.max(-0.3, (r.top + r.height * 0.62) / innerHeight))); };
    measure();
    addEventListener("scroll", measure, { passive: true });
    addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => { removeEventListener("scroll", measure); removeEventListener("resize", measure); ro.disconnect(); };
  }, [three]);
  // the room behind: everyone who's in, the bots, and empty chairs for the rest
  const cast = Array.from({ length: lobby.max }, (_, i) => {
    const p = seats[i];
    if (p) return { key: `p${i}`, avatar: p.avatar, looks: p.looks, seat: i, you: !!p.you };
    const b = i - seats.length;
    if (b < botCount) { const k = BOT_ORDER[b]; return { key: `b${k}`, avatar: PERSONAS[k].avatar, looks: BOT_LOOKS[k], seat: i }; }
    return { key: `e${i}`, empty: true };
  });

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
    <div className="relative isolate mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-10 pt-4">
      <div className="fixed inset-0 -z-10"><Backdrop mode={lobby.mode} cast={cast} theme={theme} anchor={anchor} /></div>
      <div className="flex items-center justify-between">
        <button onClick={onLeave} className="comic-sm rounded-full bg-paper px-4 py-2 text-sm font-extrabold">← {T.leave}</button>
        <SoundToggle />
      </div>
      <div className="mt-4"><Logo /></div>

      <section className="a-pop comic mt-5 rounded-3xl bg-sun p-5 text-center">
        <div className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">{T.roomCode}</div>
        {lobby.public && <div className="mx-auto mb-1 w-fit rounded-full border-2 border-ink bg-paper px-2.5 text-xs font-black">🌍 {T.publicTable}</div>}
        <div className={`font-display tracking-[0.15em] text-ink ${(lobby.code || "").length > 6 ? "text-4xl" : "text-5xl"}`}>{lobby.code || "······"}</div>
        {startsIn != null && (
          <div className="a-pop mx-auto mt-2 flex w-fit items-center gap-2 rounded-full border-[2.5px] border-ink bg-coral px-4 py-1 text-white" style={{ boxShadow: "0 3px 0 #2b1d14" }}>
            <span className="text-sm font-black">🔥 {T.startsIn}</span>
            <span key={startsIn} className="a-pop font-display text-2xl tabular-nums">{startsIn}</span>
          </div>
        )}
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
        <>
          <div className="mt-5"><ModePicker mode={lobby.mode} setMode={setMode} /></div>
          <label className="comic-sm mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-black">🌍 {T.publicToggle}</span>
              <span className="block text-[11px] font-bold text-ink-soft">{lobby.public ? T.publicOn : T.publicOff}</span>
            </span>
            <input type="checkbox" checked={!!lobby.public} onChange={(e) => { setPublic(e.target.checked); sfx("select"); }} className="peer sr-only" />
            <span className="relative h-7 w-12 shrink-0 rounded-full border-[2.5px] border-ink bg-cream transition-colors peer-checked:bg-[#0f8277] peer-focus-visible:outline peer-focus-visible:outline-2 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border-2 after:border-ink after:bg-paper after:transition-transform peer-checked:after:translate-x-5" aria-hidden="true" />
          </label>
        </>
      ) : (
        <div className={`a-pop mt-5 rounded-2xl border-[2.5px] border-ink px-4 py-2.5 text-center ${lobby.mode === "classic" ? "bg-paper" : `${MODE_SKIN[lobby.mode]?.[0] || "bg-paper"} text-white`}`} style={{ boxShadow: "0 3px 0 #2b1d14" }}>
          <div className="text-sm font-black">{MODE_INFO[lobby.mode || "classic"].emoji} {MODE_INFO[lobby.mode || "classic"].name}</div>
          <div className="text-[11px] font-semibold opacity-80">{MODE_INFO[lobby.mode || "classic"].hint}</div>
        </div>
      )}

      {three ? (
        <section className="mt-3">
          <div ref={hole} className="h-[250px] sm:h-[300px]" aria-hidden="true" />
          <div className="flex flex-wrap justify-center gap-1.5">
            {cast.map((c, i) => {
              if (c.empty) return <span key={c.key} className="on-night-soft rounded-full border-2 border-dashed border-cream/30 px-2.5 py-0.5 text-[11px] font-bold">🪑 {T.emptySeat}</span>;
              const p = seats[i];
              const bot = !p && BOT_ORDER[i - seats.length];
              return (
                <span key={c.key} className={`a-pop flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-black ${p ? "bg-paper" : "bg-paper/75 text-ink-soft"}`} style={{ boxShadow: "0 2px 0 #1c1510", animationDelay: `${i * 50}ms` }}>
                  {p?.title && <TitleTag id={p.title} short />}
                  {p ? p.name : `${PERSONAS[bot].name} 🤖`}
                  {p?.host && <span className="rounded-full bg-coral px-1 text-[9px] text-white">{T.hostTag}</span>}
                  {p?.you && <span className="rounded-full bg-mint px-1 text-[9px] text-white">{T.you}</span>}
                </span>
              );
            })}
          </div>
        </section>
      ) : (
      <section className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: lobby.max }).map((_, i) => {
          const p = seats[i];
          if (p)
            return (
              <div key={`p${i}`} className="a-pop comic flex flex-col items-center rounded-3xl bg-paper px-1 pb-2 pt-3" style={{ animationDelay: `${i * 60}ms` }}>
                <Character avatar={p.avatar} looks={p.looks} color={seatColor(i)} size={52} state={i % 2 ? "idle" : "turn"} />
                <div className="mt-1 max-w-full truncate text-sm font-extrabold">{p.name}</div>
                {p.title && <TitleTag id={p.title} className="mt-0.5" />}
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
            <div key={`e${i}`} className="on-night-soft flex flex-col items-center justify-center rounded-3xl border-[3px] border-dashed border-cream/25 p-3">
              <div className="a-wiggle text-3xl opacity-50">🪑</div>
              <div className="mt-1 text-[10px] font-bold">{T.emptySeat}</div>
            </div>
          );
        })}
      </section>
      )}

      {seats.length < lobby.max && <p className="on-night-soft mt-4 text-center text-sm font-bold">{T.waitingPlayers}</p>}

      {isHost ? (
        <div className="mt-5 flex flex-col gap-3">
          <div className="comic-sm flex items-center justify-between rounded-2xl bg-paper px-4 py-2.5 font-extrabold">
            <span>🤖 {T.bots}</span>
            <Stepper value={botCount} min={0} max={lobby.max - seats.length} onChange={changeBots} label={T.bots} />
          </div>
          <Btn color="coral" disabled={!ready} onClick={onStart} className="py-4 text-xl">🔥 {T.start}</Btn>
          {!ready && <p className="text-center text-sm font-bold text-coral">{T.needTwo}</p>}
          <p className="on-night-soft text-center text-xs font-semibold">💡 {lobby.public ? T.autoStartHint : T.keepOpen}</p>
        </div>
      ) : (
        <div className="comic mt-6 rounded-2xl bg-paper px-4 py-4 text-center font-extrabold">
          <span className="a-wiggle inline-block">🍺</span> {lobby.public ? T.autoStartHint : T.waitHost}
        </div>
      )}
    </div>
  );
}
