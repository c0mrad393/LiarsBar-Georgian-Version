// Phone niceties: tilt parallax, keeping the screen awake, vibration.
import { useEffect } from "react";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * iOS asks for motion permission, and only from a tap. Call this from the
 * click that starts a game; elsewhere it is a no-op.
 */
export function requestTilt() {
  try {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === "function") D.requestPermission().catch(() => {});
  } catch { /* not supported */ }
}

/** Tilts `ref`'s scene a few degrees with the phone (or the mouse on desktop). */
export function useTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const set = (x, y) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--tx", `${x.toFixed(2)}deg`);
        el.style.setProperty("--ty", `${y.toFixed(2)}deg`);
      });
    };
    const onOrient = (e) => {
      if (e.beta == null || e.gamma == null) return;
      set(clamp((45 - e.beta) / 7, -6, 6), clamp(e.gamma / 6, -7, 7));
    };
    const onMouse = (e) => set(((window.innerHeight / 2 - e.clientY) / window.innerHeight) * 5, ((e.clientX - window.innerWidth / 2) / window.innerWidth) * 7);
    window.addEventListener("deviceorientation", onOrient);
    window.addEventListener("mousemove", onMouse);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("deviceorientation", onOrient);
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
