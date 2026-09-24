import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Solo play: the engine runs right here in the browser against three bots.
// (Online games run the same engine on the room server, see server/worker.js.)
import { createGame, reduce, schedule, viewFor } from "./engine.js";
import { later } from "./hostTimer.js";
import { EMOTES } from "./i18n.js";
import { bots } from "./shared.js";

const EMOTE_TTL = 2600;

/** Runs the engine: holds full state, applies actions, fires scheduled host actions. */
function useEngine() {
  const [state, setState] = useState(null);
  const ref = useRef(null);

  const dispatch = useCallback((a) => {
    const cur = ref.current;
    if (!cur) return false;
    const next = reduce(cur, { ...a, now: Date.now() });
    if (next === cur) return false;
    ref.current = next;
    setState(next);
    return true;
  }, []);

  const reset = useCallback((s) => {
    ref.current = s;
    setState(s);
  }, []);

  useEffect(() => {
    if (!state) return;
    const plan = schedule(state, Date.now());
    if (!plan) return;
    return later(plan.delay, () => {
      if (ref.current === state) dispatch(plan.make(state));
    });
  }, [state, dispatch]);

  return { state, stateRef: ref, dispatch, reset };
}

function useEmotes() {
  const [emotes, setEmotes] = useState([]);
  const push = useCallback((seat, e) => {
    if (!EMOTES.includes(e)) return;
    const id = Math.random().toString(36).slice(2);
    setEmotes((l) => [...l.slice(-12), { id, seat, e, x: Math.random() }]);
    setTimeout(() => setEmotes((l) => l.filter((x) => x.id !== id)), EMOTE_TTL);
  }, []);
  return [emotes, push];
}

// ------------------------------------------------------------------- solo ---

export function useSolo(profile, mode) {
  const { state, dispatch, reset } = useEngine();
  const [emotes, pushEmote] = useEmotes();

  const again = useCallback(() => {
    reset(createGame([{ name: profile.name, avatar: profile.avatar, kind: "human" }, ...bots(3)], { mode }));
  }, [profile.name, profile.avatar, mode, reset]);

  useEffect(() => { again(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const view = useMemo(() => state && viewFor(state, 0), [state]);
  return {
    view,
    act: useCallback((a) => dispatch({ ...a, seat: 0 }), [dispatch]),
    emotes,
    sendEmote: useCallback((e) => pushEmote(0, e), [pushEmote]),
    again,
  };
}
