// The 3D table (src/three/stage.js) inside React: the canvas fills the
// screen behind the game UI; names, chambers, speech bubbles, emotes and the
// throw menu are DOM labels the stage pins above each head every frame.
import { useEffect, useRef, useState } from "react";
import { PHRASES, RANKS, T } from "../i18n.js";
import { sfx } from "../sfx.js";
import { fallbackTo2D } from "../settings.js";
import { Stage } from "../three/stage.js";
import BarScene from "./BarScene.jsx";
import { BidBadge } from "./dice.jsx";
import { Chambers, TitleTag } from "./parts.jsx";
import { Bubble, Emotes } from "./Table.jsx";

export default function Table3D({ view, states, bubbles, fx, myLooks, throwables, onThrow, flicker, center }) {
  const box = useRef(null);
  const stage = useRef(null);
  const labels = useRef({});
  const [menu, setMenu] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = new Stage(box.current, { onSeatTap: (i) => { setMenu((m) => (m === i ? null : i)); sfx("select"); }, onContextLost: fallbackTo2D, onReady: () => setReady(true) });
    s.labels = (k) => labels.current[k] || null;
    stage.current = s;
    return () => s.dispose();
  }, []);

  useEffect(() => {
    stage.current?.sync({ view, states, fx, myLooks, flicker });
  });

  const tc = RANKS[view.tableCard] || RANKS.K;
  const sayOf = (i) => [...fx].reverse().find((f) => f.kind === "say" && f.seat === i);

  return (
    <div className="fixed inset-0" onClick={() => menu != null && setMenu(null)}>
      {!ready && <BarScene mode={view.opts?.mode} />}
      <div ref={box} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: ready ? 1 : 0 }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {view.seats.map((s) =>
          s.idx === view.me ? null : (
            <div key={s.idx} ref={(el) => { labels.current[s.idx] = el; }} className="absolute left-0 top-0" style={{ visibility: "hidden" }}>
              <div className="relative -translate-x-1/2 -translate-y-full">
                <Emotes list={fx.filter((f) => f.kind === "emote" && f.seat === s.idx)} />
                <div className="flex flex-col items-center">
                  <div className={`max-w-[110px] truncate rounded-full border-2 border-ink px-2 text-[11px] font-black leading-5 ${!s.alive ? "bg-cream text-ink-soft line-through" : view.phase === "playing" && view.turn === s.idx ? "bg-sun" : "bg-paper"}`}>
                    {s.title && <TitleTag id={s.title} short className="mr-0.5" />}{s.name}
                    {!s.connected && s.kind === "human" && " 📴"}
                  </div>
                  {s.alive && <div className="mt-0.5"><Chambers pulls={s.pulls} small /></div>}
                </div>
                <Bubble text={bubbles[s.idx] || (sayOf(s.idx) && PHRASES[sayOf(s.idx).i])} />
                {menu === s.idx && (
                  <div className="a-pop pointer-events-auto absolute -top-14 left-1/2 z-50 flex max-w-[80vw] -translate-x-1/2 gap-1 rounded-3xl border-[2.5px] border-ink bg-paper px-1.5 py-1" style={{ boxShadow: "0 3px 0 #1c1510", width: "max-content" }}>
                    {throwables.map((it) => (
                      <button key={it} onClick={(e) => { e.stopPropagation(); setMenu(null); onThrow(s.idx, it); }} className="flex h-9 w-9 items-center justify-center rounded-full text-xl active:scale-90" aria-label={`${T.throwAt} ${it}`}>{it}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {/* what's been claimed, on the table's front edge */}
        <div ref={(el) => { labels.current.table = el; }} className="absolute left-0 top-0" style={{ visibility: "hidden" }}>
          <div className="-translate-x-1/2 -translate-y-1/2">
            {view.kind === "dice" ? (
              <BidBadge bid={view.bid} seat={view.bid && view.seats[view.bid.by]} total={view.totalDice} />
            ) : view.pile ? (
              <div key={view.log.find((e) => e.type === "play")?.id} className="a-pop whitespace-nowrap rounded-full border-[2.5px] border-ink bg-paper px-3 py-0.5 text-[11px] font-extrabold sm:text-sm">
                {view.seats[view.pile.by]?.name} {T.claims} <span style={{ color: tc.color }}>{view.pile.count}× {tc.emoji} {tc.geo}</span>
              </div>
            ) : null}
          </div>
        </div>
        {/* round banners and the call's verdict, over the middle of the table */}
        <div ref={(el) => { labels.current.center = el; }} className="absolute left-0 top-0" style={{ visibility: "hidden" }}>
          <div className="-translate-x-1/2 -translate-y-1/2">{center}</div>
        </div>
      </div>
    </div>
  );
}
