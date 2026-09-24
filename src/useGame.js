import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createGame, reduce, schedule, viewFor, MAX_SEATS, MODES, PERSONAS } from "./engine.js";
import { hostRoom, joinRoom, clientId } from "./net.js";
import { later } from "./hostTimer.js";
import { AVATARS, EMOTES } from "./i18n.js";

const ONLINE_OPTS = { turnMs: 30000, pullMs: 15000 };
const BOT_ORDER = ["pig", "fox", "bull", "cat"];
const GUEST_ACTIONS = new Set(["play", "call", "pull"]);
const EMOTE_TTL = 2600;
const EMOTE_GAP = 500;

export const cleanName = (n, fallback = "სტუმარი") => String(n || "").replace(/\s+/g, " ").trim().slice(0, 16) || fallback;
export const cleanAvatar = (a) => (AVATARS.includes(a) ? a : AVATARS[0]);

const bots = (n) => BOT_ORDER.slice(0, n).map((k) => ({ name: PERSONAS[k].name, avatar: PERSONAS[k].avatar, kind: "bot", persona: k }));

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

// ------------------------------------------------------------------- host ---

export function useHost(profile, initialMode = "classic") {
  const { state, stateRef, dispatch, reset } = useEngine();
  const [status, setStatus] = useState("creating"); // creating | lobby | game | error
  const [error, setError] = useState(null);
  const [code, setCode] = useState(null);
  const [botFill, setBotFill] = useState(true);
  const [mode, setModeRaw] = useState(initialMode);
  const setMode = useCallback((m) => { if (MODES.includes(m)) setModeRaw(m); }, []);
  const [lobby, setLobby] = useState([{ clientId: "host", name: profile.name, avatar: profile.avatar, connected: true }]);
  const [emotes, pushEmote] = useEmotes();

  const lobbyRef = useRef(lobby);
  lobbyRef.current = lobby;
  const conns = useRef(new Map()); // clientId → DataConnection
  const lastEmote = useRef(new Map());

  const seatOf = (cid) => stateRef.current?.seats.findIndex((s) => s.clientId === cid) ?? -1;
  const send = (conn, m) => { try { if (conn.open) conn.send(m); } catch { /* closed mid-send */ } };
  const broadcast = (m) => conns.current.forEach((c) => send(c, m));

  const lobbyMsg = (cid) => ({
    t: "lobby",
    code: codeRef.current,
    botFill: botFillRef.current,
    mode: modeRef.current,
    max: MAX_SEATS,
    seats: lobbyRef.current.filter((p) => p.connected).map((p) => ({ name: p.name, avatar: p.avatar, host: p.clientId === "host", you: p.clientId === cid })),
  });
  const codeRef = useRef(code);
  codeRef.current = code;
  const botFillRef = useRef(botFill);
  botFillRef.current = botFill;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const sendView = (cid, conn) => {
    const s = stateRef.current;
    const seat = seatOf(cid);
    if (s && seat >= 0) send(conn, { t: "state", view: viewFor(s, seat), hostNow: Date.now() });
  };

  // Keep guests in sync.
  useEffect(() => {
    if (status === "lobby") conns.current.forEach((c, cid) => send(c, lobbyMsg(cid)));
  }, [status, lobby, botFill, mode, code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (state) conns.current.forEach((c, cid) => sendView(cid, c));
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before closing the tab that is running everyone's game.
  useEffect(() => {
    if (status !== "game" && lobby.length < 2) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [status, lobby.length]);

  useEffect(() => {
    const onData = (conn, m) => {
      if (!m || typeof m !== "object") return;
      if (m.t === "hello") {
        const cid = String(m.clientId || "").slice(0, 40);
        if (!cid || cid === "host") return conn.close();
        const name = cleanName(m.name);
        const avatar = cleanAvatar(m.avatar);
        const known = lobbyRef.current.find((p) => p.clientId === cid);
        const inGame = !!stateRef.current;
        if (!known && inGame) { send(conn, { t: "reject", reason: "alreadyStarted" }); return setTimeout(() => conn.close(), 500); }
        if (!known && lobbyRef.current.filter((p) => p.connected).length >= MAX_SEATS) { send(conn, { t: "reject", reason: "roomFull" }); return setTimeout(() => conn.close(), 500); }
        const old = conns.current.get(cid);
        conn.cid = cid;
        conns.current.set(cid, conn);
        if (old && old !== conn) old.close();
        setLobby((l) => known
          ? l.map((p) => (p.clientId === cid ? { ...p, connected: true, ...(inGame ? {} : { name, avatar }) } : p))
          : [...l, { clientId: cid, name, avatar, connected: true }]);
        if (inGame) {
          const seat = seatOf(cid);
          if (seat >= 0) dispatch({ type: "presence", seat, connected: true });
          sendView(cid, conn);
        } else {
          send(conn, lobbyMsg(cid));
        }
        return;
      }
      const cid = conn.cid;
      if (!cid || conns.current.get(cid) !== conn) return;
      if (m.t === "act" && m.a && GUEST_ACTIONS.has(m.a.type)) {
        const seat = seatOf(cid);
        if (seat >= 0) dispatch({ type: m.a.type, ids: m.a.ids, seat });
      } else if (m.t === "emote" && EMOTES.includes(m.e)) {
        const now = Date.now();
        if (now - (lastEmote.current.get(cid) || 0) < EMOTE_GAP) return;
        lastEmote.current.set(cid, now);
        const seat = seatOf(cid);
        if (seat < 0) return;
        pushEmote(seat, m.e);
        broadcast({ t: "emote", seat, e: m.e });
      }
    };

    const onClose = (conn) => {
      const cid = conn.cid;
      if (!cid || conns.current.get(cid) !== conn) return;
      conns.current.delete(cid);
      if (stateRef.current) {
        setLobby((l) => l.map((p) => (p.clientId === cid ? { ...p, connected: false } : p)));
        const seat = seatOf(cid);
        if (seat >= 0) dispatch({ type: "presence", seat, connected: false });
      } else {
        setLobby((l) => l.filter((p) => p.clientId !== cid));
      }
    };

    const room = hostRoom({
      onOpen: (c) => { setCode(c); setStatus((s) => (s === "creating" ? "lobby" : s)); },
      onConnection: (conn) => {
        conn.on("data", (m) => onData(conn, m));
        conn.on("close", () => onClose(conn));
        conn.on("error", () => onClose(conn));
      },
      onError: (k) => { setError(k); setStatus((s) => (s === "creating" ? "error" : s)); },
    });
    return () => room.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    const roster = lobbyRef.current.filter((p) => p.connected);
    const seats = roster.map((p) => ({ name: p.name, avatar: p.avatar, kind: "human", clientId: p.clientId }));
    if (botFillRef.current) seats.push(...bots(MAX_SEATS - seats.length));
    setLobby(roster);
    if (seats.length < 2) {
      reset(null);
      setStatus("lobby");
      return;
    }
    reset(createGame(seats, { ...ONLINE_OPTS, mode: modeRef.current }));
    setStatus("game");
  }, [reset]);

  const toLobby = useCallback(() => {
    setLobby((l) => l.filter((p) => p.connected));
    reset(null);
    setStatus("lobby");
  }, [reset]);

  const hostSeat = state ? state.seats.findIndex((s) => s.clientId === "host") : 0;
  const view = useMemo(() => state && viewFor(state, hostSeat), [state, hostSeat]);
  const connected = lobby.filter((p) => p.connected);

  return {
    status,
    error,
    code,
    view,
    lobby: { code, botFill, mode, max: MAX_SEATS, seats: connected.map((p) => ({ name: p.name, avatar: p.avatar, host: p.clientId === "host", you: p.clientId === "host" })) },
    botFill,
    setBotFill,
    setMode,
    canStart: connected.length + (botFill ? MAX_SEATS - connected.length : 0) >= 2,
    start,
    again: start,
    toLobby,
    act: useCallback((a) => dispatch({ ...a, seat: hostSeat }), [dispatch, hostSeat]),
    emotes,
    sendEmote: useCallback((e) => {
      if (!stateRef.current) return;
      pushEmote(hostSeat, e);
      conns.current.forEach((c) => send(c, { t: "emote", seat: hostSeat, e }));
    }, [hostSeat, pushEmote, stateRef]),
  };
}

// ------------------------------------------------------------------ guest ---

export function useGuest(code, profile) {
  const [status, setStatus] = useState("connecting"); // connecting | lobby | game | error | closed
  const [error, setError] = useState(null);
  const [lobby, setLobby] = useState(null);
  const [view, setView] = useState(null);
  const [emotes, pushEmote] = useEmotes();
  const room = useRef(null);

  useEffect(() => {
    let rejected = false;
    const r = joinRoom(code, {
      onOpen: () => r.send({ t: "hello", clientId: clientId(), name: profile.name, avatar: profile.avatar }),
      onData: (m) => {
        if (!m || typeof m !== "object") return;
        if (m.t === "lobby") { setLobby(m); setView(null); setStatus("lobby"); }
        else if (m.t === "state") { setView({ ...m.view, clockOffset: Date.now() - m.hostNow }); setStatus("game"); }
        else if (m.t === "emote") pushEmote(m.seat, m.e);
        else if (m.t === "reject") { rejected = true; setError(m.reason); setStatus("error"); }
      },
      onClose: () => { if (!rejected) setStatus("closed"); },
      onError: (k) => { setError(k); setStatus("error"); },
    });
    room.current = r;
    return () => r.destroy();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    error,
    lobby,
    view,
    act: useCallback((a) => room.current?.send({ t: "act", a: { type: a.type, ids: a.ids } }), []),
    emotes,
    sendEmote: useCallback((e) => room.current?.send({ t: "emote", e }), []),
  };
}
