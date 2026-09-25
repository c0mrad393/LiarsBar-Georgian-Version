import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Solo play: the engine runs right here in the browser against three bots.
// (Online games run the same engine on the room server, see server/worker.js.)
import { createGame, reduce, schedule, viewFor } from "./engine.js";
import { later } from "./hostTimer.js";
import { useFx } from "./fx.js";
import { botFx, botThrowBack, bots } from "./shared.js";

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

// ------------------------------------------------------------------- solo ---

export function useSolo(profile, mode, botCount = 3, looks = null) {
  const { state, stateRef, dispatch, reset } = useEngine();
  const [fx, pushFx] = useFx();

  const again = useCallback(() => {
    reset(createGame([{ name: profile.name, avatar: profile.avatar, looks, kind: "human" }, ...bots(botCount)], { mode }));
  }, [profile.name, profile.avatar, mode, botCount, looks, reset]);

  useEffect(() => { again(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Bots react to what happens at the table, and throw back when hit.
  const later = useCallback((list) => {
    for (const { delay, fx: f } of list) setTimeout(() => stateRef.current && pushFx(f), delay);
  }, [pushFx, stateRef]);
  const seen = useRef(0);
  useEffect(() => {
    if (!state) return;
    if (state.log[0].id < seen.current) seen.current = 0;
    for (const ev of state.log) {
      if (ev.id <= seen.current) break;
      later(botFx(state, ev));
    }
    seen.current = state.log[0].id;
  }, [state, later]);

  const throwAt = useCallback((to, item) => {
    const f = { kind: "throw", from: 0, to, item };
    pushFx(f);
    if (stateRef.current) later(botThrowBack(stateRef.current, f));
  }, [pushFx, later, stateRef]);

  const view = useMemo(() => state && viewFor(state, 0), [state]);
  return {
    view,
    act: useCallback((a) => dispatch({ ...a, seat: 0 }), [dispatch]),
    fx,
    emote: useCallback((e) => pushFx({ kind: "emote", seat: 0, e }), [pushFx]),
    throwAt,
    say: useCallback((i) => pushFx({ kind: "say", seat: 0, i }), [pushFx]),
    again,
  };
}
