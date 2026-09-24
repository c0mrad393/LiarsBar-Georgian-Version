// Online play against the Cloudflare room server (server/worker.js).
// One hook for everyone: the room decides who is host; the socket reconnects
// on its own and the server hands the seat back by clientId.
import { useCallback, useEffect, useRef, useState } from "react";
import { EMOTES } from "./shared.js";

const SERVER = (import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? "http://localhost:8787" : "")).replace(/^http/, "ws").replace(/\/$/, "");
export const onlineAvailable = !!SERVER;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const PING_MS = 25000;
const EMOTE_TTL = 2600;
const MAX_RETRIES = 8;

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

/**
 * @param code    room code
 * @param create  true for the player opening the room
 * @returns { status: connecting|lobby|game|reconnecting|error, error, code, lobby, view, isHost, act, sendEmote, emotes, ctl }
 */
export function useOnline({ code: initialCode, create, profile, mode, onCode }) {
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [code, setCode] = useState(initialCode);
  const [lobby, setLobby] = useState(null);
  const [view, setView] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [emotes, pushEmote] = useEmotes();
  const wsRef = useRef(null);

  useEffect(() => {
    if (!SERVER) { setError("serverDown"); setStatus("error"); return; }
    let stopped = false;
    let ws = null;
    let ping = null;
    let retryTimer = null;
    let retries = 0;
    let everOpen = false;
    let room = initialCode;
    let creating = create; // only the first successful connect creates the room

    const connect = () => {
      const q = creating ? `?create=1&mode=${encodeURIComponent(mode || "classic")}` : "";
      ws = new WebSocket(`${SERVER}/room/${room}${q}`);
      wsRef.current = ws;
      ws.onopen = () => {
        retries = 0;
        everOpen = true;
        ws.send(JSON.stringify({ t: "hello", clientId: clientId(), name: profile.name, avatar: profile.avatar }));
        clearInterval(ping);
        ping = setInterval(() => ws.readyState === 1 && ws.send("ping"), PING_MS);
      };
      ws.onmessage = (ev) => {
        if (ev.data === "pong") return;
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        if (m.t === "lobby") {
          creating = false;
          setLobby(m);
          setView(null);
          setIsHost(m.youHost);
          setStatus("lobby");
        } else if (m.t === "state") {
          creating = false;
          setView({ ...m.view, clockOffset: Date.now() - m.hostNow });
          setIsHost(m.host);
          setStatus("game");
        } else if (m.t === "emote") {
          pushEmote(m.seat, m.e);
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
        if (++retries > MAX_RETRIES) {
          setError(everOpen ? "netError" : "serverDown");
          setStatus("error");
          return;
        }
        setStatus((s) => (s === "connecting" ? s : "reconnecting"));
        retryTimer = setTimeout(connect, Math.min(8000, 500 * 2 ** retries));
      };
    };

    connect();
    // Reconnect right away when the phone wakes up or the network returns.
    const kick = () => {
      if (!stopped && ws && ws.readyState > 1) { clearTimeout(retryTimer); retries = 0; connect(); }
    };
    window.addEventListener("online", kick);
    document.addEventListener("visibilitychange", kick);
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearInterval(ping);
      window.removeEventListener("online", kick);
      document.removeEventListener("visibilitychange", kick);
      ws?.close(1000, "leave");
    };
  }, [initialCode]); // eslint-disable-line react-hooks/exhaustive-deps

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
    emotes,
    act: useCallback((a) => send({ t: "act", a: { type: a.type, ids: a.ids } }), [send]),
    sendEmote: useCallback((e) => send({ t: "emote", e }), [send]),
    ctl: useCallback((t, v) => send({ t, v }), [send]),
  };
}
