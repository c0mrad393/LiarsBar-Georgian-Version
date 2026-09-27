// A 3D portrait in place of the drawn character (see three/portrait.js).
import { useEffect, useRef } from "react";
import { portrait } from "../three/portrait.js";

// the drawn seat colours → the 3D table's painted ones
const COLORS_2D = ["#ff5a5f", "#3a86ff", "#2ec4b6", "#9b5de5", "#ffb020", "#ff7b39"];
const COLORS_3D = ["#c23b2e", "#3f6f9e", "#3f7d4c", "#7a2c54", "#c98d22", "#b5462a"];

export default function Portrait3D({ avatar, looks, color, size = 56, state = "idle", blush = 0, hit, hitKey, hitDelay = 0 }) {
  const box = useRef(null);
  const api = useRef(null);
  const i = COLORS_2D.indexOf(color);
  const spec = { avatar, looks, color: i >= 0 ? COLORS_3D[i] : color, state, blush, live: size >= 50, close: size < 70 };
  useEffect(() => {
    const cv = box.current;
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * 1.22 * dpr);
    api.current = portrait(cv, spec);
    return () => api.current.dispose();
  }, [size]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.set(spec); });
  useEffect(() => {
    if (!hit || !hitKey) return;
    const t = setTimeout(() => api.current?.hit(hit), hitDelay);
    return () => clearTimeout(t);
  }, [hitKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={box} className="block" style={{ width: size, height: size * 1.22 }} aria-hidden="true" />;
}
