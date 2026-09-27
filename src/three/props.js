// Things on (and over) the table: the revolver, a wine glass, dice and cups,
// and cards whose faces are the game's own SVG cards turned into textures.
import * as THREE from "three";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Card } from "../ui/cards.jsx";
import { basic, canvasTex, mesh, toon } from "./kit.js";

// ---------------------------------------------------------------- revolver ---

/**
 * A six-shooter built from parts: barrel with front sight, fluted cylinder,
 * frame, hammer (cocks back), trigger and guard, wooden grip with screws.
 * The muzzle points along -x; the grip hangs down at +x.
 */
export function revolver() {
  const g = new THREE.Group();
  const steel = toon("#8c95a3");
  const dark = toon("#454b56");
  const wood = toon("#7a4020");
  const add = (m) => (g.add(m), m);
  add(mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.2, 12), steel, { outline: 0.12, at: [-0.1, 0.02, 0], rot: [0, 0, Math.PI / 2] }));
  add(mesh(new THREE.BoxGeometry(0.19, 0.012, 0.02), dark, { at: [-0.1, 0.04, 0] })); // rib
  add(mesh(new THREE.BoxGeometry(0.012, 0.02, 0.008), dark, { at: [-0.19, 0.05, 0] })); // front sight
  add(mesh(new THREE.TorusGeometry(0.009, 0.004, 6, 10), dark, { at: [-0.2, 0.02, 0], rot: [0, Math.PI / 2, 0] })); // muzzle
  const cyl = add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.07, 12), steel, { outline: 0.08, at: [0.03, 0.015, 0], rot: [0, 0, Math.PI / 2] }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    cyl.add(mesh(new THREE.BoxGeometry(0.01, 0.072, 0.006), dark, { at: [Math.cos(a) * 0.036, 0, Math.sin(a) * 0.036], rot: [0, -a, 0], shadow: false }));
  }
  add(mesh(new THREE.BoxGeometry(0.08, 0.05, 0.03), steel, { outline: 0.06, at: [0.08, 0.005, 0] })); // frame
  const hammer = new THREE.Group();
  hammer.position.set(0.11, 0.03, 0);
  hammer.add(mesh(new THREE.BoxGeometry(0.014, 0.04, 0.012), dark, { at: [0.004, 0.018, 0], rot: [0, 0, -0.4] }));
  g.add(hammer);
  add(mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 12, Math.PI), dark, { at: [0.06, -0.022, 0], rot: [0, 0, Math.PI] })); // guard
  add(mesh(new THREE.BoxGeometry(0.006, 0.02, 0.006), dark, { at: [0.058, -0.022, 0] })); // trigger
  const grip = add(mesh(new THREE.BoxGeometry(0.04, 0.1, 0.034), wood, { outline: 0.07, at: [0.125, -0.055, 0], rot: [0, 0, -0.35] }));
  grip.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.036, 8), toon("#d9d9e0"), { rot: [Math.PI / 2, 0, 0], shadow: false }));
  g.userData.hammer = hammer;
  /** Pull the hammer back (0…1). */
  g.userData.cock = (k) => { hammer.rotation.z = -0.9 * k; };
  return g;
}

/** A muzzle flash: a burst of light at the barrel. */
export function muzzleFlash() {
  const t = canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,230,1)");
    grd.addColorStop(0.35, "rgba(255,200,80,0.9)");
    grd.addColorStop(1, "rgba(255,120,20,0)");
    g.fillStyle = grd;
    g.beginPath();
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2, r = i % 2 ? 26 : 64;
      g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    g.fill();
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(0.35);
  s.visible = false;
  return s;
}

// ------------------------------------------------------------------- wine ---

export function wineGlass() {
  const g = new THREE.Group();
  const glass = new THREE.MeshToonMaterial({ color: "#e8f4ff", transparent: true, opacity: 0.45 });
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.035, 0.01], [0.045, 0.05], [0.04, 0.09]].map(([x, y]) => new THREE.Vector2(x, y)), 16), glass);
  bowl.position.y = 0.09;
  const wine = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.033, 0.01], [0.041, 0.045], [0.001, 0.045]].map(([x, y]) => new THREE.Vector2(x, y)), 16), toon("#8f1f2b"));
  wine.position.y = 0.092;
  const stem = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 8), glass, { at: [0, 0.045, 0], shadow: false });
  const foot = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.006, 16), glass, { at: [0, 0.003, 0], shadow: false });
  g.add(bowl, wine, stem, foot);
  g.userData.wine = wine;
  /** Poisoned wine turns green. */
  g.userData.poison = (on) => { wine.material = toon(on ? "#57cc3b" : "#8f1f2b"); };
  return g;
}

// ------------------------------------------------------------------- dice ---

const dieFaces = {};
function dieTex(n) {
  if (!dieFaces[n]) {
    const pips = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]], 6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]] }[n];
    dieFaces[n] = canvasTex(64, 64, (g) => {
      g.fillStyle = n === 1 ? "#f1e3fa" : "#f8f0dc";
      g.fillRect(0, 0, 64, 64);
      g.strokeStyle = "#1c1510";
      g.lineWidth = 4;
      g.strokeRect(2, 2, 60, 60);
      g.fillStyle = n === 1 ? "#7a2c54" : "#1c1510";
      for (const [x, y] of pips) { g.beginPath(); g.arc(x * 64, y * 64, n === 1 ? 11 : 6.5, 0, Math.PI * 2); g.fill(); }
    });
  }
  return dieFaces[n];
}
/** A die showing `face` on top. */
export function die(face) {
  // box face order: +x, -x, +y, -y, +z, -z; opposite faces sum to 7
  const rest = [1, 2, 3, 4, 5, 6].filter((n) => n !== face && n !== 7 - face);
  const order = [rest[0], rest[1], face, 7 - face, rest[2], rest[3]];
  const mats = order.map((n) => new THREE.MeshToonMaterial({ map: dieTex(n) }));
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), mats);
  m.castShadow = true;
  return m;
}
/** A leather dice cup (open end down). */
export function diceCup() {
  const pts = [[0.001, 0.14], [0.06, 0.14], [0.075, 0.02], [0.08, 0]].map(([x, y]) => new THREE.Vector2(x, y));
  return mesh(new THREE.LatheGeometry(pts, 18), toon("#9a5a2c", { side: THREE.DoubleSide }), { outline: 0.04 });
}

// ------------------------------------------------------------------ cards ---

export const CARD_W = 0.105, CARD_H = 0.147;
const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);

const BACKS = {
  red: ["#8f2420", "#f7eedb"], blue: ["#24435e", "#f7eedb"], money: ["#2e6b3a", "#cfe8b0"], rainbow: ["#7a2c54", "#eab54a"],
  leopard: ["#c98d22", "#3a2414"], georgia: ["#f7eedb", "#c23b2e"], gold: ["#15100c", "#d9a032"], galaxy: ["#241a3d", "#c9b3ff"],
};
const backCache = {};
function backTex(style = "red") {
  if (!backCache[style]) {
    const [bg, fg] = BACKS[style] || BACKS.red;
    backCache[style] = canvasTex(128, 180, (g) => {
      g.fillStyle = "#f7eedb";
      g.fillRect(0, 0, 128, 180);
      g.fillStyle = bg;
      g.fillRect(8, 8, 112, 164);
      g.strokeStyle = fg;
      g.globalAlpha = 0.45;
      g.lineWidth = 2;
      for (let i = -180; i < 180; i += 14) {
        g.beginPath(); g.moveTo(8 + i, 8); g.lineTo(8 + i + 164, 172); g.stroke();
        g.beginPath(); g.moveTo(8 + i + 164, 8); g.lineTo(8 + i, 172); g.stroke();
      }
      g.globalAlpha = 1;
      if (style === "georgia") {
        g.fillStyle = "#c23b2e";
        g.fillRect(58, 30, 12, 120); g.fillRect(24, 84, 80, 12);
      } else {
        g.fillStyle = bg;
        g.beginPath(); g.ellipse(64, 90, 34, 26, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = fg; g.lineWidth = 3; g.stroke();
        g.font = "30px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText("🍷", 64, 92);
      }
    });
  }
  return backCache[style];
}

// Card faces: the real SVG card, rasterized once per rank.
const faceCache = {};
const SUIT = { K: "H", Q: "D", A: "S", J: "S", D: "S" };
function faceTex(rank) {
  if (faceCache[rank]) return faceCache[rank];
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 358;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  faceCache[rank] = tex;
  const g = c.getContext("2d");
  g.fillStyle = rank === "D" ? "#3a0a10" : "#f8f0dc";
  g.beginPath();
  g.roundRect(0, 0, 256, 358, 18);
  g.fill();
  // Render the real card into a detached node (off React's current render),
  // read its SVG back and paint it onto the texture.
  const host = document.createElement("div");
  const root = createRoot(host);
  root.render(createElement(Card, { rank, suit: SUIT[rank] || "S", size: "lg" }));
  const grab = (tries = 0) => {
    const html = host.innerHTML;
    if (!html.includes("<svg") && tries < 20) { setTimeout(() => grab(tries + 1), 30); return; }
    setTimeout(() => root.unmount(), 0);
    const svg = (html.match(/<svg[\s\S]*<\/svg>/) || [""])[0].replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="358"');
    const img = new Image();
    img.onload = () => { g.drawImage(img, 0, 0, 256, 358); tex.needsUpdate = true; };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  setTimeout(grab, 0);
  return tex;
}

/** A two-sided card lying face down; `reveal(rank)` gives it a face. */
export function card3d(back = "red") {
  const g = new THREE.Group();
  const face = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: backTex(back), transparent: true }));
  const rear = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: backTex(back), transparent: true }));
  rear.rotation.y = Math.PI;
  face.castShadow = rear.castShadow = true;
  g.add(face, rear);
  g.userData.reveal = (rank) => { face.material.map = faceTex(rank); face.material.needsUpdate = true; };
  return g;
}

/** Warm up the face textures (so a reveal never shows a blank card). */
export function preloadFaces() {
  for (const r of ["K", "Q", "A", "J", "D"]) faceTex(r);
}

// ---------------------------------------------------------------- splats ---

export const SPLAT_COLOR = { "🍅": "#e8352e", "🥚": "#fff6d8", "🥧": "#fff3d6", "💩": "#7a4a1e", "💦": "#6ec6ff", "🐟": "#6ec6ff", "🧦": "#b6e36b", "🌶️": "#ff4d2e", "🧻": "#ffffff", "💐": "#ff8fb0" };
const splatCache = {};
export function splatTex(item) {
  const c = SPLAT_COLOR[item] || "#e8352e";
  if (!splatCache[c]) {
    splatCache[c] = canvasTex(128, 128, (g) => {
      g.fillStyle = c;
      g.strokeStyle = "#1c1510";
      g.lineWidth = 4;
      g.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2, r = i % 2 ? 38 : 56 + (i % 4) * 3;
        g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.stroke();
    });
  }
  return splatCache[c];
}
export { basic };
