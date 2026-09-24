// The 2.5D table: a felt oval in perspective, players seated around its far
// side (you sit at the near edge, below it), cards that land lying on the
// felt, and thrown tomatoes flying between seats.
import { useLayoutEffect, useRef, useState } from "react";
import { useTilt } from "../device.js";
import { PHRASES, RANKS, T } from "../i18n.js";
import { THROWABLES } from "../shared.js";
import { sfx } from "../sfx.js";
import { Card, CardBack } from "./cards.jsx";
import Character, { seatColor } from "./Character.jsx";
import { Chambers } from "./parts.jsx";

function useSize(ref) {
  const [size, setSize] = useState({ w: 360, h: 300 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Screen positions of every seat (px, relative to the table box). You sit below it. */
export function layout(n, me, w, h) {
  const cx = w / 2;
  const cy = h * 0.57;
  const rx = Math.min(w * 0.43, 420);
  const ry = Math.min(h * 0.33, 165);
  const k = n - 1;
  const span = k <= 1 ? 0 : Math.min(160, 52 * (k - 1));
  const pos = {};
  for (let j = 0; j < k; j++) {
    const idx = (me + 1 + j) % n;
    const deg = 270 - span / 2 + (k <= 1 ? 0 : (span * j) / (k - 1));
    const a = (deg * Math.PI) / 180;
    const x = Math.max(44, Math.min(w - 44, cx + rx * 1.08 * Math.cos(a)));
    const y = Math.max(46, cy + ry * 1.5 * Math.sin(a));
    pos[idx] = { x, y, scale: 1 - 0.1 * Math.max(0, -Math.sin(a)) };
  }
  pos[me] = { x: cx, y: h + 34, scale: 1 };
  return { pos, felt: { cx, cy, rx, ry } };
}

export function Bubble({ text, down }) {
  if (!text) return null;
  return (
    <div className={`speech a-pop pointer-events-none absolute left-1/2 z-40 w-max max-w-[140px] -translate-x-1/2 rounded-2xl px-2.5 py-1.5 text-center text-[11px] font-extrabold leading-snug sm:max-w-[190px] sm:text-xs ${down ? "down top-full mt-2" : "bottom-full mb-2"}`}>
      {text}
    </div>
  );
}

export function Emotes({ list }) {
  return list.map((e) => (
    <span key={e.id} className="a-float-up pointer-events-none absolute bottom-6 z-30 text-3xl" style={{ left: `${10 + e.x * 50}%`, "--r": `${(e.x - 0.5) * 50}deg` }}>
      {e.e}
    </span>
  ));
}

function Seat({ seat, p, compact, state, point, bubble, emotes, hit, active, holdsPile, onTap, menuOpen, onThrow }) {
  const dead = !seat.alive;
  const size = compact ? 46 : 58;
  return (
    <div className="absolute z-20" style={{ left: p.x, top: p.y, transform: `translate(-50%, -50%) scale(${p.scale})` }}>
      <div className="relative flex flex-col items-center">
        {active && <div className="a-arrow absolute -top-6 left-1/2 z-30 text-xl">👇</div>}
        <Emotes list={emotes} />
        {menuOpen && (
          <div className="a-pop absolute -top-12 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full border-[2.5px] border-ink bg-paper px-1.5 py-1" style={{ boxShadow: "0 3px 0 #2b1d14" }}>
            {THROWABLES.map((it) => (
              <button key={it} onClick={(e) => { e.stopPropagation(); onThrow(it); }} className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-110 active:scale-90" aria-label={`${T.throwAt} ${it}`}>{it}</button>
            ))}
          </div>
        )}
        <button onClick={onTap} className="touch relative rounded-full focus:outline-none" aria-label={`${seat.name}: ${T.throwAt}`}>
          <Character avatar={seat.avatar} looks={seat.looks} color={seatColor(seat.idx)} size={size} state={state} point={point} hit={hit?.item} hitKey={hit?.id} hitDelay={650} />
          {holdsPile && !dead && <span className="absolute -left-2 top-0 -rotate-12 text-base">🤫</span>}
          {!dead && (
            <span className="absolute -right-2 bottom-1 flex items-center gap-0.5 rounded-full border-2 border-ink bg-paper px-1 text-[10px] font-black leading-4">
              <CardBack size="xs" className="!h-[12px] !w-[8px] !rounded-[2px]" />{seat.handCount}
            </span>
          )}
        </button>
        <div className={`-mt-1 max-w-[84px] truncate rounded-full border-2 border-ink px-2 text-[11px] font-black leading-5 ${dead ? "bg-cream text-ink-soft line-through" : active ? "bg-sun" : "bg-paper"}`}>
          {seat.name}
        </div>
        {!dead && <div className="mt-0.5"><Chambers pulls={seat.pulls} small /></div>}
        {!seat.connected && seat.kind === "human" && (
          <div className="mt-0.5 rounded-full border-2 border-ink bg-cream px-1.5 text-[9px] font-black">📴 offline</div>
        )}
        <Bubble text={bubble} down />
      </div>
    </div>
  );
}

function Pile({ pile, pileKey, from }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 90 }}>
      {Array.from({ length: pile.count }).map((_, i) => (
        <div key={`${pileKey}-${i}`} className="a-fly-in absolute"
          style={{ "--fx": `${from.x}px`, "--fy": `${from.y}px`, "--r": `${(i - 1) * 14 + ((pileKey * 7) % 11) - 5}deg`, animationDelay: `${i * 80}ms`, marginLeft: (i - (pile.count - 1) / 2) * 16 }}>
          <CardBack size="md" />
        </div>
      ))}
    </div>
  );
}

function Throws({ list, pos }) {
  return list.map((f) => {
    const a = pos[f.from];
    const b = pos[f.to];
    if (!a || !b) return null;
    return (
      <div key={f.id} className="throw-x pointer-events-none absolute z-50" style={{ left: a.x, top: a.y, "--dx": `${b.x - a.x}px` }}>
        <div className="throw-y" style={{ "--dy": `${b.y - a.y}px`, fontSize: 30, marginLeft: -15, marginTop: -15 }}>{f.item}</div>
      </div>
    );
  });
}

/**
 * @param states  { [seat]: { state, point } } character moods for this moment
 * @param bubbles { [seat]: text }
 * @param fx      live effects (emotes, throws, chat) from useFx
 * @param center  node drawn upright in the middle (reveal, round banner)
 */
export default function Table({ view, states, bubbles, fx, center, pileKey, onThrow, className = "" }) {
  const box = useRef(null);
  const tilt = useRef(null);
  const { w, h } = useSize(box);
  useTilt(tilt);
  const [menu, setMenu] = useState(null);
  const n = view.seats.length;
  const { pos, felt } = layout(n, view.me, w, h);
  const compact = n > 4 || w < 420;

  // Seat a thrown item lands on: the latest throw at them.
  const hitOf = (i) => [...fx].reverse().find((f) => f.kind === "throw" && f.to === i);
  const sayOf = (i) => [...fx].reverse().find((f) => f.kind === "say" && f.seat === i);

  const seatStates = view.seats.map((s) => states[s.idx] || { state: "idle" });
  const pointAngle = (from, to) => {
    const a = pos[from], b = pos[to];
    return a && b ? (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI : null;
  };
  const pileFrom = view.pile && pos[view.pile.by] ? { x: pos[view.pile.by].x - felt.cx, y: pos[view.pile.by].y - felt.cy } : { x: 0, y: -80 };
  const tc = RANKS[view.tableCard];

  return (
    <div ref={box} className={`scene relative ${className}`} onClick={() => setMenu(null)}>
      <div ref={tilt} className="scene-tilt absolute inset-0">
        <div className="felt3d" style={{ left: felt.cx - felt.rx, top: felt.cy - felt.ry, width: felt.rx * 2, height: felt.ry * 2 }}>
          <div className="absolute inset-0 flex items-center justify-center">
            {view.pile ? (
              <Pile pile={view.pile} pileKey={pileKey} from={pileFrom} />
            ) : !view.reveal ? (
              <div className="opacity-40" style={{ transform: "rotate(-8deg)" }}>
                <Card rank={view.tableCard} suit={{ K: "H", Q: "D", A: "S" }[view.tableCard]} size="md" />
              </div>
            ) : null}
          </div>
        </div>

        {view.seats.map((s) =>
          s.idx === view.me ? null : (
            <Seat
              key={s.idx}
              seat={s}
              p={pos[s.idx]}
              compact={compact}
              state={seatStates[s.idx].state}
              point={seatStates[s.idx].point != null ? pointAngle(s.idx, seatStates[s.idx].point) : null}
              bubble={bubbles[s.idx] || (sayOf(s.idx) && PHRASES[sayOf(s.idx).i])}
              emotes={fx.filter((f) => f.kind === "emote" && f.seat === s.idx)}
              hit={hitOf(s.idx)}
              active={view.phase === "playing" && view.turn === s.idx}
              holdsPile={view.pile?.by === s.idx}
              menuOpen={menu === s.idx}
              onTap={(e) => { e.stopPropagation(); setMenu(menu === s.idx ? null : s.idx); sfx("select"); }}
              onThrow={(item) => { setMenu(null); onThrow(s.idx, item); }}
            />
          ),
        )}
      </div>

      {/* upright things in the middle of the table */}
      <div className="pointer-events-none absolute z-30 flex items-center justify-center" style={{ left: felt.cx, top: felt.cy, transform: "translate(-50%, -50%)" }}>
        {center}
      </div>
      {view.pile && (
        <div className="a-pop pointer-events-none absolute z-30 whitespace-nowrap rounded-full border-[2.5px] border-ink bg-paper px-3 py-0.5 text-[11px] font-extrabold sm:text-sm"
          style={{ left: felt.cx, top: felt.cy + felt.ry * 0.62, transform: "translateX(-50%)" }} key={pileKey}>
          {view.seats[view.pile.by]?.name} {T.claims} <span style={{ color: tc.color }}>{view.pile.count}× {tc.emoji} {tc.geo}</span>
        </div>
      )}
      <Throws list={fx.filter((f) => f.kind === "throw")} pos={pos} />
    </div>
  );
}

