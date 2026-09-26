// The emotion wheel: press and hold on the table, slide to an emoji, let go.
// (Or tap the 😀 button and tap one.) The centre opens the chat phrases.
import { useEffect, useRef, useState } from "react";
import { EMOTES, T } from "../i18n.js";
import { sfx } from "../sfx.js";

const R = 82; // ring radius, px
const HOLD_MS = 380;
const SLOP = 12;

/** Which slice (0..n-1) a point `dx, dy` from the centre is on, or -1 in the middle. */
function sliceAt(dx, dy, n) {
  if (Math.hypot(dx, dy) < 30) return -1;
  const a = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 2 + Math.PI / n) % (Math.PI * 2);
  return Math.floor((a / (Math.PI * 2)) * n);
}

export function EmoteWheel({ at, drag, hot, onPick, onPhrases, onClose }) {
  const n = EMOTES.length;
  const pad = R + 34;
  const x = Math.min(window.innerWidth - pad, Math.max(pad, at.x));
  const y = Math.min(window.innerHeight - pad, Math.max(pad, at.y));
  return (
    <div className="fixed inset-0 z-[66]" onPointerDown={drag ? undefined : onClose} style={{ touchAction: "none" }}>
      <div className="a-fade-up absolute inset-0 bg-ink/25" />
      <div className="absolute" style={{ left: x, top: y }}>
        <div className="wheel-in absolute -left-[120px] -top-[120px] h-[240px] w-[240px] rounded-full border-[3px] border-ink bg-paper/95" style={{ boxShadow: "0 6px 0 #2b1d14" }} />
        {EMOTES.map((e, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const on = hot === i;
          return (
            <button key={e} onPointerDown={(ev) => { ev.stopPropagation(); onPick(e); }} aria-label={e}
              className={`wheel-item absolute flex h-14 w-14 items-center justify-center rounded-full text-3xl transition-transform ${on ? "scale-125 bg-sun" : ""}`}
              style={{ left: Math.cos(a) * R - 28, top: Math.sin(a) * R - 28, animationDelay: `${i * 25}ms` }}>
              {e}
            </button>
          );
        })}
        <button onPointerDown={(ev) => { ev.stopPropagation(); if (!drag) onPhrases(); }} aria-label={T.chat}
          className={`absolute -left-7 -top-7 flex h-14 w-14 items-center justify-center rounded-full border-[2.5px] border-ink text-2xl ${hot === -1 && drag ? "bg-cream" : "bg-sky"}`}>
          {drag ? "✋" : "💬"}
        </button>
      </div>
    </div>
  );
}

/**
 * Long-press anywhere on `ref` (the table) to open the wheel under the finger;
 * slide and release to send. Returns wheel state + an opener for the button.
 */
export function useEmoteWheel(ref, send) {
  const [wheel, setWheelState] = useState(null); // { at: {x,y}, drag, hot }
  const current = useRef(null); // the same, readable from the pointer handlers
  const setWheel = (w) => { current.current = w; setWheelState(w); };
  const press = useRef(null);
  const swallowClick = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const down = (e) => {
      if (e.button > 0) return;
      const p = { x: e.clientX, y: e.clientY, id: e.pointerId };
      p.timer = setTimeout(() => {
        press.current = { ...p, open: true };
        swallowClick.current = true;
        navigator.vibrate?.(12);
        sfx("pop");
        setWheel({ at: { x: p.x, y: p.y }, drag: true, hot: -1 });
      }, HOLD_MS);
      press.current = p;
    };
    const move = (e) => {
      const p = press.current;
      if (!p || e.pointerId !== p.id) return;
      if (!p.open) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP) { clearTimeout(p.timer); press.current = null; }
        return;
      }
      e.preventDefault();
      const w = current.current;
      if (!w) return;
      const hot = sliceAt(e.clientX - w.at.x, e.clientY - w.at.y, EMOTES.length);
      if (hot === w.hot) return;
      if (hot >= 0) sfx("select");
      setWheel({ ...w, hot });
    };
    const up = (e) => {
      const p = press.current;
      if (!p || e.pointerId !== p.id) return;
      clearTimeout(p.timer);
      press.current = null;
      if (!p.open) return;
      const w = current.current;
      setWheel(null);
      if (w && w.hot >= 0) send(EMOTES[w.hot]);
      setTimeout(() => { swallowClick.current = false; }, 50);
    };
    // A long press must not also tap the seat under the finger.
    const click = (e) => { if (swallowClick.current) { e.stopPropagation(); e.preventDefault(); } };
    const menu = (e) => e.preventDefault();
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("contextmenu", menu);
    return () => {
      clearTimeout(press.current?.timer);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("contextmenu", menu);
    };
  }, [ref, send]);

  const openAt = (x, y) => setWheel({ at: { x, y }, drag: false, hot: null });
  return { wheel, openAt, close: () => setWheel(null) };
}
