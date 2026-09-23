// setTimeout that keeps ticking while the host's tab is in the background.
// Browsers clamp page timers in hidden tabs (down to once a minute), which
// would freeze everyone else's game; timers inside a Worker are not clamped.
let worker = null;
let seq = 0;
const pending = new Map();

function getWorker() {
  if (worker !== null) return worker;
  try {
    const src = "const t={};onmessage=e=>{const{id,ms,cancel}=e.data;if(cancel){clearTimeout(t[id]);delete t[id];return}t[id]=setTimeout(()=>{delete t[id];postMessage(id)},ms)}";
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    worker.onmessage = (e) => {
      const fn = pending.get(e.data);
      pending.delete(e.data);
      fn?.();
    };
  } catch {
    worker = false;
  }
  return worker;
}

/** Runs fn after ms; returns a cancel function. */
export function later(ms, fn) {
  const w = getWorker();
  if (!w) {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
  }
  const id = ++seq;
  pending.set(id, fn);
  w.postMessage({ id, ms });
  return () => {
    if (pending.delete(id)) w.postMessage({ id, cancel: true });
  };
}
