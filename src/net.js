// Peer-to-peer transport (WebRTC via PeerJS). The host's browser owns the game;
// PeerJS's free public broker is only used to find each other.
import Peer from "peerjs";

const PREFIX = "lbge-v1-";
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CONNECT_TIMEOUT = 15000;

export const makeCode = () => Array.from({ length: 6 }, () => ALPHABET[(Math.random() * ALPHABET.length) | 0]).join("");
export const cleanCode = (c) => (c || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);

export function inviteLink(code) {
  const u = new URL(window.location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("room", code);
  return u.toString();
}

/** Stable per-browser id so a guest who reloads gets their seat back. */
export function clientId() {
  try {
    let id = localStorage.getItem("lb-client");
    if (!id) {
      id = makeCode() + makeCode();
      localStorage.setItem("lb-client", id);
    }
    return id;
  } catch {
    return makeCode() + makeCode();
  }
}

const ERR = {
  "peer-unavailable": "roomMissing",
  network: "netError",
  "server-error": "netError",
  "socket-error": "netError",
  "socket-closed": "netError",
  "browser-incompatible": "netError",
};

/**
 * Opens a room. handlers: onOpen(code), onConnection(conn), onError(key, err)
 * Returns { destroy }.
 */
export function hostRoom({ onOpen, onConnection, onError }) {
  let peer = null;
  let dead = false;
  let tries = 0;

  const open = () => {
    const code = makeCode();
    peer = new Peer(PREFIX + code, { debug: 1 });
    peer.on("open", () => !dead && onOpen(code));
    peer.on("connection", (conn) => !dead && onConnection(conn));
    peer.on("disconnected", () => { if (!dead && !peer.destroyed) peer.reconnect(); });
    peer.on("error", (err) => {
      if (dead) return;
      if (err.type === "unavailable-id" && tries++ < 5) {
        peer.destroy();
        open();
      } else if (err.type !== "peer-unavailable") {
        onError(ERR[err.type] || "netError", err);
      }
    });
  };
  open();
  return { destroy: () => { dead = true; peer?.destroy(); } };
}

/**
 * Joins a room. handlers: onOpen(conn), onData(msg), onClose(), onError(key, err)
 * Returns { send, destroy }.
 */
export function joinRoom(code, { onOpen, onData, onClose, onError }) {
  let dead = false;
  let conn = null;
  const peer = new Peer({ debug: 1 });
  const timer = setTimeout(() => { if (!conn?.open && !dead) onError("roomMissing"); }, CONNECT_TIMEOUT);

  peer.on("open", () => {
    if (dead) return;
    conn = peer.connect(PREFIX + code, { reliable: true, serialization: "json" });
    conn.on("open", () => { clearTimeout(timer); if (!dead) onOpen(conn); });
    conn.on("data", (m) => !dead && onData(m));
    conn.on("close", () => !dead && onClose());
    conn.on("error", (err) => !dead && onError("netError", err));
  });
  peer.on("error", (err) => {
    if (dead) return;
    clearTimeout(timer);
    onError(ERR[err.type] || "netError", err);
  });

  return {
    send: (m) => { if (conn?.open) conn.send(m); },
    destroy: () => { dead = true; clearTimeout(timer); peer.destroy(); },
  };
}
