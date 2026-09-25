// Your fanned hand. Tap cards to pick them; drag a card up and let go to
// throw the picked cards onto the table.
import { useRef, useState } from "react";
import { RANKS } from "../i18n.js";
import { Card } from "./cards.jsx";
import { isWild } from "./overlays.jsx";

const TAP = 10; // px of movement before a press counts as a drag
const FLING = 70; // px upwards to play

export default function Hand({ cards, selected, canPick, onToggle, onPlay, round, tableCard }) {
  const tc = RANKS[tableCard];
  const drag = useRef(null);
  const [lift, setLift] = useState(0);
  const n = cards.length;

  const down = (e, id) => {
    if (!canPick) return;
    drag.current = { id, y0: e.clientY, x0: e.clientX, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dy, e.clientX - d.x0) > TAP) {
      d.moved = true;
      if (!selected.includes(d.id)) onToggle(d.id); // dragging a card picks it
    }
    if (d.moved) setLift(Math.min(0, dy));
  };
  const up = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dy = e.clientY - d.y0;
    setLift(0);
    if (!d.moved) onToggle(d.id);
    else if (dy < -FLING) onPlay(selected.includes(d.id) ? selected : [...selected, d.id]);
  };

  return (
    <div className="flex min-h-[124px] items-end justify-center px-2 sm:min-h-[146px] short:min-h-[100px]" style={{ touchAction: canPick ? "none" : "auto" }}>
      {cards.map((c, i) => {
        const on = selected.includes(c.id);
        const off = i - (n - 1) / 2;
        const y = on ? -28 + lift : Math.abs(off) * 5;
        return (
          <button
            key={`${round}-${c.id}`}
            onPointerDown={(e) => down(e, c.id)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => { drag.current = null; setLift(0); }}
            onClick={(e) => { if (e.detail === 0 && canPick) onToggle(c.id); }} // keyboard
            disabled={!canPick}
            className="a-deal -mx-2 sm:-mx-1.5"
            style={{ animationDelay: `${i * 90}ms`, zIndex: on ? 20 : i }}
            aria-pressed={on}>
            <div
              className={`relative ${lift ? "" : "transition-transform duration-200"} ${canPick && !on ? "hover:-translate-y-3" : ""}`}
              style={{ transform: `translateY(${y}px) rotate(${on && lift ? 0 : off * 6}deg) ${on && lift < -FLING ? "scale(1.08)" : ""}` }}>
              <Card
                rank={c.rank}
                suit={c.suit}
                size="lg"
                selected={on}
                glow={isWild(c.rank) && !on ? (c.rank === "D" ? "#ff5a5f" : "#b57be8") : null}
                className={canPick ? "" : "saturate-[.6]"}
              />
              {isWild(c.rank) && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-sun px-1.5 text-[9px] font-black">= {tc.emoji} {tc.geo}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
