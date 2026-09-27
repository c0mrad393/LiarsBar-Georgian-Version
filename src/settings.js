// Player settings that several screens read: for now, the 3D table.
import { useEffect, useState } from "react";

let webgl = null;
/** Can this browser draw 3D at all? */
export function webglOK() {
  if (webgl == null) {
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { webgl = false; }
  }
  return webgl;
}

let three = (() => {
  try { return localStorage.getItem("lb-3d") !== "0"; } catch { return true; }
})();
const subs = new Set();
let broken = false; // 3D failed this session (couldn't load, or WebGL died): play in 2D
export const is3D = () => three && !broken && webglOK();
/** Fall back to the 2D table for the rest of this visit, without changing the setting. */
export function fallbackTo2D() {
  broken = true;
  for (const f of subs) f(false);
}
export function set3D(v) {
  three = v;
  try { localStorage.setItem("lb-3d", v ? "1" : "0"); } catch { /* private mode */ }
  for (const f of subs) f(is3D());
}
/** The 3D table on or off (3D is the default where the browser can do it). */
export function use3D() {
  const [v, setV] = useState(is3D);
  useEffect(() => { subs.add(setV); return () => subs.delete(setV); }, []);
  return v;
}
