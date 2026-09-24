// Short-lived table effects (emotes, thrown items, chat lines), shared by solo
// and online play. Each fx lives long enough for its animation, then goes.
import { useCallback, useState } from "react";

const TTL = { emote: 2600, say: 3200, throw: 3400 };

export function useFx() {
  const [list, setList] = useState([]);
  const push = useCallback((fx) => {
    const id = Math.random().toString(36).slice(2);
    setList((l) => [...l.slice(-16), { ...fx, id, at: Date.now(), x: Math.random() }]);
    setTimeout(() => setList((l) => l.filter((f) => f.id !== id)), TTL[fx.kind] || 2600);
  }, []);
  return [list, push];
}
