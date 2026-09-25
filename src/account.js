// Password-free account: a secret key made in this browser. The server only
// ever stores its hash. The key doubles as the recovery code for moving the
// profile (coins, stats) to another device.
import { useCallback, useEffect, useState } from "react";
import { SERVER_HTTP } from "./config.js";
import { KEY_ALPHABET, KEY_RE, normKey } from "./shared.js";

const STORE = "lb-key";

let cached = null; // read once per page, like the seat id

export function accountKey() {
  if (cached) return cached;
  try {
    let k = normKey(localStorage.getItem(STORE));
    if (!KEY_RE.test(k)) {
      const bytes = crypto.getRandomValues(new Uint8Array(20));
      k = [...bytes].map((b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join("");
      localStorage.setItem(STORE, k);
    }
    cached = k;
  } catch {
    cached = null;
  }
  return cached;
}

function setAccountKey(k) {
  cached = k;
  try { localStorage.setItem(STORE, k); } catch { /* private mode */ }
}

async function call(path, body) {
  if (!SERVER_HTTP) throw new Error("offline");
  const res = await fetch(`${SERVER_HTTP}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `http ${res.status}`);
  return data;
}

export const fetchBoard = (period) => call("leaderboard", { key: accountKey(), period });

/**
 * The player's server profile, kept in step with their name/avatar.
 * Returns { me, loading, error, refresh, claimDaily, restore }.
 */
export function useAccount(profile) {
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const [synced, setSynced] = useState(false);

  const load = useCallback(async () => {
    try {
      const { profile: p } = await call("me", { key: accountKey() });
      setMe(p); // null for a new player: created on first save
      setError(null);
    } catch {
      setError("offline");
    } finally {
      setSynced(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Save name/avatar changes (debounced, and only when they differ).
  useEffect(() => {
    const name = profile.name.trim();
    if (!synced || !name || (me && me.name === name && me.avatar === profile.avatar)) return;
    const t = setTimeout(async () => {
      try {
        const { profile: p } = await call("profile", { key: accountKey(), name, avatar: profile.avatar });
        setMe(p);
      } catch { /* retried on next change */ }
    }, me ? 1200 : 300);
    return () => clearTimeout(t);
  }, [synced, profile.name, profile.avatar, me]);

  const claimDaily = useCallback(async () => {
    const r = await call("daily", { key: accountKey() });
    setMe(r.profile);
    return r;
  }, []);

  /** Buy an item. Returns { ok, error? }; the profile updates either way. */
  const buy = useCallback(async (item) => {
    const r = await call("buy", { key: accountKey(), item });
    if (r.profile) setMe(r.profile);
    return r;
  }, []);

  /** Put on gear (and optionally switch head). */
  const equip = useCallback(async (looks, avatar) => {
    const { profile: p } = await call("equip", { key: accountKey(), looks, avatar });
    setMe(p);
    return p;
  }, []);

  /** The owner's secret coin tap (needs the ADMIN_TOKEN password). */
  const adminGrant = useCallback(async (token, amount) => {
    const r = await call("admin", { key: accountKey(), token, amount });
    setMe(r.profile);
    return r;
  }, []);

  /** Switch this device to another account. Returns its profile, or throws "unknown". */
  const restore = useCallback(async (code) => {
    const key = normKey(code);
    if (!KEY_RE.test(key)) throw new Error("unknown");
    const { profile: p } = await call("restore", { key });
    setAccountKey(key);
    setMe(p);
    return p;
  }, []);

  return { me, error, refresh: load, claimDaily, restore, buy, equip, adminGrant };
}
