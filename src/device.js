// Phone niceties: keeping the screen awake, vibration; mouse parallax on desktop.
import { useEffect } from "react";

/**
 * Tilts `ref`'s scene a few degrees with the mouse. Desktop only: on phones
 * the gyroscope tilt felt jittery, so touch screens keep the table still.
 */
export function useTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    const set = (x, y) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--tx", `${x.toFixed(2)}deg`);
        el.style.setProperty("--ty", `${y.toFixed(2)}deg`);
      });
    };
    const onMouse = (e) => set(((window.innerHeight / 2 - e.clientY) / window.innerHeight) * 5, ((e.clientX - window.innerWidth / 2) / window.innerWidth) * 7);
    window.addEventListener("mousemove", onMouse);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
    };
  }, [ref]);
}

/** Keep the phone screen on while a game is open. */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return;
    let lock = null;
    const get = () => navigator.wakeLock.request("screen").then((l) => { lock = l; }).catch(() => {});
    get();
    const again = () => document.visibilityState === "visible" && get();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

const BUZZ = { bang: [90, 40, 220], click: 35, turn: 18, liar: [25, 40, 25], splat: 30, devil: [60, 50, 60, 50, 160], deal: 10 };
/** Vibrate for a sound effect (Android; iPhone browsers ignore it). */
export function buzz(name) {
  try {
    // Chrome refuses (and logs) vibration before the first tap on the page.
    if (BUZZ[name] && navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(BUZZ[name]);
  } catch { /* ignore */ }
}
