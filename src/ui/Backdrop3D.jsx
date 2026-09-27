// The 3D bar behind the home screen and the lobby (src/three/showcase.js).
// The 2D bar shows until the first 3D frame is ready, then fades out.
import { useEffect, useRef, useState } from "react";
import { fallbackTo2D } from "../settings.js";
import { Showcase } from "../three/showcase.js";
import BarScene from "./BarScene.jsx";

export default function Backdrop3D({ cast, theme, felt, anchor = 0.5, onTap, mode }) {
  const box = useRef(null);
  const show = useRef(null);
  const tap = useRef(onTap);
  tap.current = onTap;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = new Showcase(box.current, { onReady: () => setReady(true), onTap: (k) => tap.current?.(k), onContextLost: fallbackTo2D });
    show.current = s;
    return () => s.dispose();
  }, []);
  useEffect(() => { show.current?.set({ cast, theme, felt }); });
  useEffect(() => { show.current?.setAnchor(anchor); }, [anchor]);

  return (
    <div className="fixed inset-0 z-0">
      {!ready && <BarScene mode={mode} />}
      <div ref={box} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }} />
      {/* a soft vignette keeps the buttons readable over a busy room */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 55%, transparent 45%, rgba(10,6,3,0.55) 100%)" }} />
    </div>
  );
}
