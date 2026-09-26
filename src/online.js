// Online play against the Cloudflare room server (server/worker.js).
// One hook for everyone: the room decides who is host; the socket reconnects
// on its own and the server hands the seat back by clientId.
import { useCallback, useEffect, useRef, useState } from "react";
import { accountKey } from "./account.js";
import { SERVER_HTTP } from "./config.js";
import { useFx } from "./fx.js";

const SERVER = SERVER_HTTP.replace(/^http/, "ws");
export const onlineAvailable = !!SERVER;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const PING_MS = 10000;
const STALE_MS = 25000; // nothing heard for this long: the socket is dead even if it says "open"
const FIRST_TRIES = 6; // a room we never reached: give up (server down) after these
const MAX_BACKOFF = 5000;

/** Open public tables (for the list on the home screen). */
export async function fetchTables() {
  if (!SERVER_HTTP) return [];
  const res = await fetch(`${SERVER_HTTP}/api/tables`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  if (!res.ok) throw new Error(`http ${res.status}`);
  return (await res.json()).tables || [];
}

/** Ask the matchmaker for a public table: { code, mode }. */
async function findTable(mode) {
  const res = await fetch(`${SERVER_HTTP}/api/quick`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
  if (!res.ok) throw new Error(`http ${res.status}`);
  return res.json();
}

export const makeCode = () => Array.from({ length: 6 }, () => ALPHABET[(Math.random() * ALPHABET.length) | 0]).join("");

export function inviteLink(code) {
  const u = new URL(window.location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("room", code);
  return u.toString();
}

/** Stable per-browser id (read once per page) so a reload gets the same seat back. */
let cachedId = null;
export function clientId() {
  if (cachedId) return cachedId;
  try {
    cachedId = localStorage.getItem("lb-client");
    if (!cachedId) {
      cachedId = makeCode() + makeCode();
      localStorage.setItem("lb-client", cachedId);
    }
  } catch {
    cachedId = makeCode() + makeCode();
  }
  return cachedId;
}

/**
 * @param code    room code
 * @param create  true for the player opening the room
 * @param quick   a mode (or "any"): find a public table instead of using `code`
 * @returns { status: connecting|lobby|game|reconnecting|error, error, code, lobby, view, isHost, act, fx, emote, throwAt, say, ctl }
 */
export function useOnline({ code: initialCode, create, quick, profile, mode, onCode }) {
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [code, setCode] = useState(initialCode);
  const [lobby, setLobby] = useState(null);
  const [view, setView] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [rewards, setRewards] = useState(null);
  const [fx, pushFx] = useFx();
  const wsRef = useRef(null);

  useEffect(() => {
    if (!SERVER) { setError("serverDown"); setStatus("error"); return; }
    let stopped = false;
    let ws = null;
    let ping = null;
    let watchdog = null;
    let probe = null;
    let lastHeard = Date.now();
    let retryTimer = null;
    let retries = 0;
    let everOpen = false;
    let room = initialCode;
    let creating = create; // only the first successful connect creates the room
    let seeking = !!quick; // quick play: until we're seated, a full/started table means "find another"
    let quickMode = null;
    let hops = 0;

    const seek = async () => {
      try {
        const t = await findTable(quick);
        if (stopped) return;
        room = t.code;
        quickMode = t.mode;
        setCode(room);
        onCode?.(room);
        connect();
      } catch {
        if (stopped) return;
        setError("serverDown");
        setStatus("error");
      }
    };

    const connect = () => {
      const q = seeking
        ? `?quick=1&mode=${encodeURIComponent(quickMode || "classic")}`
        : creating ? `?create=1&mode=${encodeURIComponent(mode || "classic")}` : "";
      if (ws) { ws.onclose = null; ws.onmessage = null; try { ws.close(); } catch { /* already gone */ } }
      ws = new WebSocket(`${SERVER}/room/${room}${q}`);
      wsRef.current = ws;
      ws.onopen = () => {
        retries = 0;
        everOpen = true;
        lastHeard = Date.now();
        ws.send(JSON.stringify({ t: "hello", clientId: clientId(), key: accountKey(), name: profile.name, avatar: profile.avatar }));
        clearInterval(ping);
        ping = setInterval(() => ws.readyState === 1 && ws.send("ping"), PING_MS);
      };
      ws.onmessage = (ev) => {
        lastHeard = Date.now();
        if (ev.data === "pong") return;
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        if (m.t === "lobby") {
          creating = false;
          seeking = false;
          setLobby(m);
          setView(null);
          setIsHost(m.youHost);
          setStatus("lobby");
        } else if (m.t === "state") {
          creating = false;
          seeking = false;
          setView({ ...m.view, clockOffset: Date.now() - m.hostNow });
          if (m.view.phase !== "gameover") setRewards(null);
          setIsHost(m.host);
          setStatus("game");
        } else if (m.t === "rewards") {
          setRewards(m);
        } else if (m.t === "fx" && m.fx) {
          pushFx(m.fx);
        } else if (m.t === "reject") {
          if (m.reason === "codeTaken" && creating) {
            // Someone already sits at this code: pick another and try again.
            room = makeCode();
            setCode(room);
            onCode?.(room);
            ws.onclose = null;
            ws.close();
            connect();
            return;
          }
          if (seeking && ["roomFull", "alreadyStarted", "roomMissing"].includes(m.reason) && ++hops <= 4) {
            // That table filled up or started a moment ago: ask for another.
            ws.onclose = null;
            ws.close();
            seek();
            return;
          }
          stopped = true;
          setError(m.reason);
          setStatus("error");
        }
      };
      ws.onclose = (ev) => {
        clearInterval(ping);
        if (stopped || ev.code === 4001) { // 4001: this seat opened in another tab
          if (ev.code === 4001) { setError("replaced"); setStatus("error"); }
          return;
        }
        retry();
      };
    };

    // Once we've been in the room, never give up: phones drop the connection
    // all the time (tunnels, lifts, switching apps). The server keeps the seat.
    const retry = () => {
      clearTimeout(retryTimer);
      if (stopped) return;
      if (!everOpen && ++retries > FIRST_TRIES) {
        setError("serverDown");
        setStatus("error");
        return;
      }
      if (everOpen) retries++;
      setStatus((s) => (s === "connecting" ? s : "reconnecting"));
      retryTimer = setTimeout(connect, Math.min(MAX_BACKOFF, 300 * 2 ** Math.min(retries, 5)));
    };
    const drop = () => {
      if (ws) { ws.onclose = null; try { ws.close(); } catch { /* already gone */ } }
      clearInterval(ping);
      retry();
    };
    // A socket can die silently (phone asleep, network switch) and still look open.
    watchdog = setInterval(() => {
      if (!stopped && ws?.readyState === 1 && Date.now() - lastHeard > STALE_MS) drop();
    }, 5000);

    if (seeking) seek();
    else connect();
    // The phone woke up or the network came back: reconnect now, or check that
    // the open socket still works (and fetch the current table) before trusting it.
    const kick = () => {
      if (stopped || document.visibilityState === "hidden" || !ws) return;
      if (ws.readyState > 1) { clearTimeout(retryTimer); retries = 0; connect(); return; }
      if (ws.readyState !== 1) return;
      const asked = Date.now();
      try { ws.send("ping"); ws.send(JSON.stringify({ t: "sync" })); } catch { /* handled by the probe */ }
      clearTimeout(probe);
      probe = setTimeout(() => { if (!stopped && lastHeard < asked) { retries = 0; drop(); } }, 3000);
    };
    window.addEventListener("online", kick);
    window.addEventListener("pageshow", kick);
    document.addEventListener("visibilitychange", kick);
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(probe);
      clearInterval(ping);
      clearInterval(watchdog);
      window.removeEventListener("online", kick);
      window.removeEventListener("pageshow", kick);
      document.removeEventListener("visibilitychange", kick);
      if (ws) { ws.onclose = null; ws.close(1000, "leave"); }
    };
  }, [initialCode, quick]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((m) => {
    const ws = wsRef.current;
    if (ws?.readyState === 1) ws.send(JSON.stringify(m));
  }, []);

  return {
    status,
    error,
    code,
    lobby,
    view,
    isHost,
    rewards,
    fx,
    act: useCallback((a) => send({ t: "act", a: { type: a.type, ids: a.ids, q: a.q, f: a.f } }), [send]),
    emote: useCallback((e) => send({ t: "emote", e }), [send]),
    throwAt: useCallback((to, item) => send({ t: "throw", to, item }), [send]),
    say: useCallback((i) => send({ t: "say", i }), [send]),
    ctl: useCallback((t, v) => send({ t, v }), [send]),
  };
}
