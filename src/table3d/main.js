// 3D test table: the real game engine (src/engine.js) against three bots,
// drawn in three.js from the player's seat, like the original Liar's Bar.
// A prototype to try the look and feel; the main game is untouched.
import * as THREE from "three";
import { createGame, reduce, schedule, viewFor, MAX_PLAY } from "../engine.js";
import { bots } from "../shared.js";
import { RANKS, describe, quipText } from "../i18n.js";
import { sfx, unlockAudio } from "../sfx.js";

const $ = (id) => document.getElementById(id);
const SEAT_COLORS = ["#c23b2e", "#3f6f9e", "#3f7d4c", "#7a2c54"];
const SPECIES = { pig: "pig", fox: "fox", bull: "tur", cat: "khinkali", bear: "bear" };
const FUR = {
  pig: ["#ffb3c7", "#ff8fb0"], fox: ["#ff9a3c", "#fff1dc"], bear: ["#a86b3c", "#e8c49a"],
  tur: ["#b08457", "#e5cda6"], khinkali: ["#f4e2bd", "#e3cc98"],
};

// ------------------------------------------------------------------ scene ---

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
$("stage").appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0d0906");
scene.fog = new THREE.Fog("#0d0906", 4.5, 9);
const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 40);
scene.add(camera);

// Cartoon shading: three flat light steps, plus inverted-hull outlines.
const steps = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]), 3, 1);
steps.minFilter = steps.magFilter = THREE.NearestFilter;
steps.needsUpdate = true;
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: steps, ...extra });
const OUTLINE = new THREE.MeshBasicMaterial({ color: "#120c08", side: THREE.BackSide });
function mesh(geo, mat, { outline = 0, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geo, OUTLINE);
    o.scale.setScalar(1 + outline);
    m.add(o);
  }
  return m;
}

// lights: a warm lamp over the table, a dim room
scene.add(new THREE.HemisphereLight("#6b4a2a", "#0d0906", 0.55));
const lamp = new THREE.SpotLight("#ffe2b0", 22, 8, Math.PI / 3, 0.6, 1.6);
lamp.position.set(0, 3, 0);
lamp.target.position.set(0, 0, 0);
lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024);
lamp.shadow.bias = -0.0006;
scene.add(lamp, lamp.target);
const fill = new THREE.PointLight("#ff9a55", 2.2, 6, 1.8);
fill.position.set(0, 1.9, 1.6);
scene.add(fill);
// the lamp itself
const shade = mesh(new THREE.ConeGeometry(0.28, 0.22, 24, 1, true), toon("#2a1d14", { side: THREE.DoubleSide }), { shadow: false });
shade.position.set(0, 2.55, 0);
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffe39a" }));
bulb.position.set(0, 2.47, 0);
const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5), new THREE.MeshBasicMaterial({ color: "#000" }));
cord.position.set(0, 3.4, 0);
scene.add(shade, bulb, cord);

// the room: floor, walls, qvevri, a shelf of bottles
const floor = mesh(new THREE.CircleGeometry(7, 48), toon("#2a1a10"), { shadow: false });
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const wall = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 5, 40, 1, true), toon("#1c130c", { side: THREE.BackSide }));
wall.position.y = 2.5;
scene.add(wall);
function qvevri(x, z, s) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(0.05 + Math.sin(t * Math.PI) * 0.42 + (t > 0.85 ? 0.05 : 0), t * 1.1));
  }
  const q = mesh(new THREE.LatheGeometry(pts, 24), toon("#b85c2c"), { outline: 0.03 });
  q.position.set(x, 0, z);
  q.scale.setScalar(s);
  scene.add(q);
}
qvevri(-2.6, -2.4, 1.2); qvevri(2.8, -2.1, 1); qvevri(-3.3, 0.6, 0.9); qvevri(3.2, 1.2, 1.1);
const shelf = mesh(new THREE.BoxGeometry(2.4, 0.08, 0.35), toon("#5a3416"));
shelf.position.set(0, 1.75, -3.6);
scene.add(shelf);
["#3f7d4c", "#7a2c54", "#c98d22", "#3f7d4c", "#b3302a", "#7a2c54"].forEach((c, i) => {
  const b = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.34, 12), toon(c), { outline: 0.05 });
  b.position.set(-0.9 + i * 0.36, 1.96, -3.55);
  scene.add(b);
});

// the table: bottle-green cloth, wooden rim, one leg
const TABLE_R = 1.05, TABLE_Y = 0.78;
const top = mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.06, 48), toon("#2c6a40"));
top.position.y = TABLE_Y;
const rim = mesh(new THREE.TorusGeometry(TABLE_R, 0.05, 10, 48), toon("#8a5a2b"), { outline: 0.02 });
rim.rotation.x = Math.PI / 2;
rim.position.y = TABLE_Y + 0.03;
const leg = mesh(new THREE.CylinderGeometry(0.12, 0.3, TABLE_Y, 16), toon("#5a3416"));
leg.position.y = TABLE_Y / 2;
scene.add(top, rim, leg);

// ------------------------------------------------------------ characters ---

/** A seated patron built from primitives: body, head with species features, paws, a chair. */
function character(species, color) {
  const root = new THREE.Group();
  const [fur, light] = FUR[species];
  const chair = new THREE.Group();
  const seat = mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), toon("#5a3416"));
  seat.position.y = 0.5;
  const back = mesh(new THREE.BoxGeometry(0.5, 0.7, 0.06), toon("#5a3416"));
  back.position.set(0, 0.85, -0.25);
  chair.add(seat, back);
  root.add(chair);

  const body = new THREE.Group();
  body.position.y = 0.53;
  root.add(body);
  const torso = mesh(new THREE.CapsuleGeometry(0.24, 0.3, 6, 14), toon(color), { outline: 0.05 });
  torso.position.y = 0.38;
  body.add(torso);
  const paws = [];
  for (const sx of [-1, 1]) {
    const p = mesh(new THREE.SphereGeometry(0.07, 12, 10), toon(fur), { outline: 0.08 });
    p.position.set(sx * 0.2, 0.3, 0.26);
    body.add(p);
    paws.push(p);
  }

  const head = new THREE.Group();
  head.position.y = 0.86;
  body.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.23, 24, 18), toon(fur), { outline: 0.045 });
  head.add(skull);
  const eyes = [];
  for (const sx of [-1, 1]) {
    const w = mesh(new THREE.SphereGeometry(0.052, 12, 10), toon("#ffffff"), { outline: 0.12, shadow: false });
    w.position.set(sx * 0.08, 0.05, 0.19);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), new THREE.MeshBasicMaterial({ color: "#120c08" }));
    pupil.position.z = 0.04;
    w.add(pupil);
    head.add(w);
    eyes.push(w);
  }
  for (const sx of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), new THREE.MeshBasicMaterial({ color: "#ff6b8b", transparent: true, opacity: 0.5 }));
    cheek.position.set(sx * 0.14, -0.05, 0.196);
    cheek.rotation.y = sx * 0.6;
    head.add(cheek);
  }
  const add = (geo, c, pos, rot = [0, 0, 0], o = 0.06) => {
    const m = mesh(geo, toon(c), { outline: o });
    m.position.set(...pos);
    m.rotation.set(...rot);
    head.add(m);
    return m;
  };
  if (species === "pig") {
    add(new THREE.CylinderGeometry(0.07, 0.075, 0.07, 16), light, [0, -0.04, 0.22], [Math.PI / 2, 0, 0]);
    for (const sx of [-1, 1]) add(new THREE.ConeGeometry(0.07, 0.13, 12), fur, [sx * 0.14, 0.2, 0], [0, 0, -sx * 0.5]);
  } else if (species === "fox") {
    add(new THREE.ConeGeometry(0.1, 0.18, 14), light, [0, -0.06, 0.24], [Math.PI / 2, 0, 0]);
    add(new THREE.SphereGeometry(0.025, 8, 8), "#120c08", [0, -0.06, 0.33], [0, 0, 0], 0);
    for (const sx of [-1, 1]) add(new THREE.ConeGeometry(0.075, 0.2, 12), fur, [sx * 0.13, 0.24, 0], [0, 0, -sx * 0.35]);
  } else if (species === "bear") {
    add(new THREE.SphereGeometry(0.1, 14, 10), light, [0, -0.07, 0.17]).scale.set(1, 0.8, 0.8);
    add(new THREE.SphereGeometry(0.03, 8, 8), "#120c08", [0, -0.04, 0.25], [0, 0, 0], 0);
    for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.075, 12, 10), fur, [sx * 0.17, 0.17, 0]);
  } else if (species === "tur") {
    add(new THREE.SphereGeometry(0.11, 14, 10), light, [0, -0.08, 0.16]).scale.set(1, 0.85, 0.85);
    add(new THREE.ConeGeometry(0.05, 0.14, 10), "#7a5433", [0, -0.28, 0.1], [Math.PI, 0, 0]);
    for (const sx of [-1, 1]) {
      const horn = add(new THREE.TorusGeometry(0.14, 0.035, 8, 16, Math.PI * 0.9), "#e8d6b0", [sx * 0.1, 0.18, -0.02], [0, Math.PI / 2, sx > 0 ? 0.3 : Math.PI - 0.3]);
      horn.scale.set(1, 1.1, 1);
    }
  } else if (species === "khinkali") {
    add(new THREE.ConeGeometry(0.16, 0.2, 14), fur, [0, 0.24, 0]);
    add(new THREE.SphereGeometry(0.045, 10, 8), light, [0, 0.35, 0]);
  }

  // the revolver, held at the right temple during the roulette
  const gun = new THREE.Group();
  const steel = toon("#9aa3b2");
  const barrel = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 10), steel, { outline: 0.1 });
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = -0.06;
  const drum = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 12), steel, { outline: 0.08 });
  drum.rotation.z = Math.PI / 2;
  drum.position.x = 0.08;
  const grip = mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05), toon("#8a4b24"), { outline: 0.08 });
  grip.position.set(0.14, -0.07, 0);
  grip.rotation.z = -0.3;
  gun.add(barrel, drum, grip);
  gun.position.set(0.36, 0.02, 0);
  gun.visible = false;
  head.add(gun);

  root.userData = { body, head, eyes, paws, gun, skull, fur };
  return root;
}

/** A name label above a head: canvas text on a sprite. */
function nameTag() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 72;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(0.5, 0.14, 1);
  s.renderOrder = 10;
  s.userData.draw = (name, pulls, alive, active) => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, 256, 72);
    g.fillStyle = !alive ? "#6a5643" : active ? "#eab54a" : "#f7eedb";
    g.strokeStyle = "#1c1510";
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(8, 6, 240, 40, 20);
    g.fill();
    g.stroke();
    g.fillStyle = "#1c1510";
    g.font = "900 24px 'Noto Sans Georgian', sans-serif";
    g.textAlign = "center";
    g.fillText(alive ? name : `👻 ${name}`, 128, 35);
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(128 - 50 + i * 20, 60, 6, 0, Math.PI * 2);
      g.fillStyle = i < pulls ? "#1c1510" : "#f7eedb";
      g.fill();
      g.stroke();
    }
    tex.needsUpdate = true;
  };
  return s;
}

// ------------------------------------------------------------------ cards ---

const CARD_W = 0.14, CARD_H = 0.2;
const faceCache = {};
function cardTexture(rank) {
  if (faceCache[rank]) return faceCache[rank];
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 366;
  const g = c.getContext("2d");
  const back = rank === "back";
  g.fillStyle = back ? "#8f2420" : rank === "D" ? "#3a0a10" : "#f8f0dc";
  g.beginPath();
  g.roundRect(0, 0, 256, 366, 22);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = back ? "#f7eedb" : "#1c1510";
  g.stroke();
  if (back) {
    g.strokeStyle = "#f7eedb55";
    g.lineWidth = 3;
    for (let i = -366; i < 366; i += 22) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 366, 366); g.stroke();
      g.beginPath(); g.moveTo(i + 366, 0); g.lineTo(i, 366); g.stroke();
    }
    g.fillStyle = "#5a1414";
    g.beginPath();
    g.ellipse(128, 183, 70, 50, 0, 0, Math.PI * 2);
    g.fill();
    g.font = "64px sans-serif";
    g.textAlign = "center";
    g.fillText("🍷", 128, 205);
  } else {
    const r = RANKS[rank];
    const letter = { K: "მ", Q: "დ", A: "ტ", J: "ჯ", D: "ე" }[rank];
    g.fillStyle = rank === "D" ? "#ffd166" : r.color;
    g.font = "900 58px 'Noto Serif Georgian', Georgia, serif";
    g.textAlign = "center";
    g.fillText(letter, 40, 70);
    g.save();
    g.translate(216, 296);
    g.rotate(Math.PI);
    g.fillText(letter, 0, 0);
    g.restore();
    g.font = "130px sans-serif";
    g.fillText(r.emoji, 128, 220);
    g.font = "900 34px 'Noto Sans Georgian', sans-serif";
    g.fillStyle = rank === "D" ? "#ffd166" : "#1c1510";
    g.fillText(r.geo, 128, 300);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  faceCache[rank] = tex;
  return tex;
}
const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
/** A two-sided card: face on +z, back on -z. */
function card3d(rank) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: cardTexture(rank || "back"), transparent: true }));
  const back = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: cardTexture("back"), transparent: true }));
  back.rotation.y = Math.PI;
  g.add(face, back);
  g.userData.face = face;
  g.userData.setRank = (rk) => { face.material.map = cardTexture(rk); face.material.needsUpdate = true; };
  return g;
}

// ----------------------------------------------------------------- tweens ---

const tweens = [];
const ease = (k) => 1 - (1 - k) ** 3;
function tween(obj, { pos, rot, scale, dur = 450, arc = 0, delay = 0, onEnd }) {
  tweens.push({ obj, pos, rot, scale, dur, arc, onEnd, t0: performance.now() + delay, from: null });
}
function runTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const t = tweens[i];
    if (now < t.t0) continue;
    if (!t.from) t.from = { p: t.obj.position.clone(), r: t.obj.rotation.clone(), s: t.obj.scale.x };
    const k = Math.min(1, (now - t.t0) / t.dur);
    const e = ease(k);
    if (t.pos) {
      t.obj.position.lerpVectors(t.from.p, t.pos, e);
      t.obj.position.y += Math.sin(Math.PI * k) * t.arc;
    }
    if (t.rot) {
      t.obj.rotation.set(
        t.from.r.x + (t.rot[0] - t.from.r.x) * e,
        t.from.r.y + (t.rot[1] - t.from.r.y) * e,
        t.from.r.z + (t.rot[2] - t.from.r.z) * e,
      );
    }
    if (t.scale != null) t.obj.scale.setScalar(t.from.s + (t.scale - t.from.s) * e);
    if (k >= 1) {
      tweens.splice(i, 1);
      t.onEnd?.();
    }
  }
}

// ------------------------------------------------------------------ seats ---

const SEAT_R = 1.55;
// me at the front (+z, the camera); the others around the far side of the
// table, so all of them fit in view even on a phone held upright
const ANGLES = [Math.PI / 2, -Math.PI / 2 - 0.68, -Math.PI / 2, -Math.PI / 2 + 0.68];
const seats = [];
function buildSeats(game) {
  for (const s of seats) scene.remove(s.root, s.tag, s.ring);
  seats.length = 0;
  game.seats.forEach((p, i) => {
    const a = ANGLES[i];
    const pos = new THREE.Vector3(Math.cos(a) * SEAT_R, 0, Math.sin(a) * SEAT_R);
    const root = i === 0 ? new THREE.Group() : character(SPECIES[p.persona] || "pig", SEAT_COLORS[i]);
    root.position.copy(pos);
    root.lookAt(0, 0, 0);
    scene.add(root);
    const tag = nameTag();
    tag.position.set(pos.x * 0.98, 1.95, pos.z * 0.98);
    if (i !== 0) scene.add(tag);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 32), new THREE.MeshBasicMaterial({ color: "#eab54a", transparent: true, opacity: 0.9 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(Math.cos(a) * 0.75, TABLE_Y + 0.035, Math.sin(a) * 0.75);
    scene.add(ring);
    seats.push({ root, tag, ring, pos, fallen: false });
  });
}
const headPos = (i) => {
  const v = new THREE.Vector3();
  if (i === 0) return camera.getWorldPosition(v).add(new THREE.Vector3(0, -0.3, -0.2));
  return seats[i].root.userData.head.getWorldPosition(v);
};

// ------------------------------------------------------------------- hand ---

const hand = new THREE.Group();
camera.add(hand);
let handCards = new Map(); // id -> { obj, rank }
let selected = [];

function layoutHand() {
  const list = [...handCards.values()];
  const n = list.length;
  list.forEach((c, i) => {
    const off = i - (n - 1) / 2;
    const on = selected.includes(c.id);
    tween(c.obj, { pos: new THREE.Vector3(off * 0.085, (on ? 0.05 : 0) - Math.abs(off) * 0.008, -off * 0.002), rot: [0, 0, -off * 0.07], dur: 260 });
  });
}
function syncHand(view) {
  const mine = view.seats[0].hand || [];
  const ids = new Set(mine.map((c) => c.id));
  for (const [id, c] of handCards) if (!ids.has(id)) { hand.remove(c.obj); handCards.delete(id); }
  mine.forEach((c, i) => {
    if (handCards.has(c.id)) return;
    const obj = card3d(c.rank);
    obj.position.set(0, -0.4, 0);
    obj.scale.setScalar(0.2);
    hand.add(obj);
    handCards.set(c.id, { id: c.id, obj, rank: c.rank });
    tween(obj, { scale: 1, dur: 400, delay: i * 90 });
  });
  selected = selected.filter((id) => ids.has(id));
  layoutHand();
}

// ------------------------------------------------------------------- pile ---

let pile = []; // card groups lying on the table
function clearPile() {
  for (const c of pile) tween(c, { scale: 0.01, dur: 300, onEnd: () => scene.remove(c) });
  pile = [];
}
function landSpot() {
  const k = pile.length;
  return new THREE.Vector3((Math.random() - 0.5) * 0.18 + (k % 3 - 1) * 0.05, TABLE_Y + 0.04 + k * 0.002, (Math.random() - 0.5) * 0.14);
}
/** Cards fly from `from` onto the table, face down. */
function throwCards(from, objs) {
  objs.forEach((obj, k) => {
    scene.attach(obj);
    obj.position.copy(from);
    const spot = landSpot();
    pile.push(obj);
    tween(obj, { pos: spot, rot: [Math.PI / 2, 0, (Math.random() - 0.5) * 1.2], dur: 520, arc: 0.3, delay: k * 90, onEnd: () => sfx("card") });
  });
}

// --------------------------------------------------------------- the game ---

let state = null;
let timer = null;
let myPlay = null; // ids I just played, to animate them from my hand
const profileName = (() => {
  try { return JSON.parse(localStorage.getItem("lb-profile") || "{}").name || "შენ"; } catch { return "შენ"; }
})();

function newGame() {
  clearPile();
  for (const c of handCards.values()) hand.remove(c.obj);
  handCards = new Map();
  state = createGame([{ name: profileName, avatar: "av_bear", kind: "human" }, ...bots(3)], { mode: "classic" });
  buildSeats(state);
  $("over").style.display = "none";
  update(null);
}

function dispatch(a) {
  const next = reduce(state, { ...a, now: Date.now() });
  if (next === state) return false;
  const prev = state;
  state = next;
  update(prev);
  return true;
}

function arm() {
  clearTimeout(timer);
  const plan = schedule(state, Date.now());
  if (!plan) return;
  const at = state;
  timer = setTimeout(() => { if (state === at) dispatch(plan.make(at)); }, plan.delay);
}

const nm = (i) => (i === 0 ? `${state.seats[0].name} (შენ)` : state.seats[i]?.name);
function toast(text) {
  if (!text) return;
  const d = document.createElement("div");
  d.textContent = text;
  $("toast").prepend(d);
  setTimeout(() => d.remove(), 3200);
  while ($("toast").children.length > 3) $("toast").lastChild.remove();
}

function update(prev) {
  const view = viewFor(state, 0);
  // new events since last time
  const seen = prev?.log[0]?.id ?? 0;
  const fresh = state.log.filter((e) => e.id > seen).reverse();
  for (const ev of fresh) onEvent(ev, view);
  syncHand(view);
  syncSeats(view);
  syncUI(view);
  arm();
}

let focus = null; // seat the camera turns to (roulette)
let shake = 0;
function onEvent(ev, view) {
  const q = quipText(ev);
  switch (ev.type) {
    case "deal":
      sfx("deal");
      clearPile();
      break;
    case "play": {
      if (ev.seat === 0 && myPlay) {
        const objs = myPlay.map((id) => handCards.get(id)?.obj).filter(Boolean);
        myPlay.forEach((id) => handCards.delete(id));
        objs.forEach((o) => o.userData.setRank("back"));
        const from = new THREE.Vector3();
        objs[0]?.getWorldPosition(from);
        throwCards(from, objs);
        myPlay = null;
      } else {
        throwCards(headPos(ev.seat).add(new THREE.Vector3(0, -0.25, 0)), Array.from({ length: ev.n }, () => card3d(null)));
      }
      break;
    }
    case "call":
      sfx("liar");
      shake = 0.5;
      toast(`📢 ${nm(ev.seat)}: „მატყუარა!“`);
      break;
    case "truth":
    case "bluff": {
      // flip the last cards played, face up
      const cards = view.reveal?.cards || [];
      const last = pile.slice(-cards.length);
      last.forEach((obj, k) => {
        obj.userData.setRank(cards[k]?.rank);
        tween(obj, { pos: obj.position.clone().add(new THREE.Vector3(0, 0.12, 0)), rot: [-Math.PI / 2, 0, 0], dur: 420, delay: k * 180 });
      });
      sfx(ev.type);
      toast(describe(ev, nm));
      break;
    }
    case "devil":
      sfx("devil");
      toast(describe(ev, nm));
      break;
    case "safe":
      sfx("click");
      toast(`😅 ჩხაკ! ${nm(ev.seat)} გადარჩა.${q ? ` „${q}“` : ""}`);
      break;
    case "dead":
      sfx("bang");
      shake = 1;
      flash();
      toast(`💥 BANG! ${nm(ev.seat)} გავარდა.`);
      if (ev.seat !== 0) knockOver(ev.seat);
      break;
    case "win":
      sfx("win");
      break;
    default:
  }
}

function flash() {
  const f = $("flash");
  f.style.transition = "none";
  f.style.opacity = "0.9";
  requestAnimationFrame(() => { f.style.transition = "opacity .7s"; f.style.opacity = "0"; });
}
function knockOver(i) {
  const s = seats[i];
  if (!s || s.fallen) return;
  s.fallen = true;
  const { body, skull, gun } = s.root.userData;
  tween(body, { rot: [-1.35, 0, 0.3], pos: new THREE.Vector3(0, 0.25, -0.3), dur: 700 });
  skull.material = toon("#8a8a8a");
  gun.visible = false;
}

function syncSeats(view) {
  view.seats.forEach((p, i) => {
    const s = seats[i];
    if (!s) return;
    s.tag.material.map && s.tag.userData.draw(p.name, p.pulls, p.alive, view.phase === "playing" && view.turn === i);
    s.ring.visible = view.phase === "playing" && view.turn === i && p.alive;
    if (i && !p.alive) knockOver(i);
    if (i) s.root.userData.gun.visible = view.phase === "roulette" && view.roulette?.victim === i && !view.roulette.result;
  });
  myGun.visible = view.phase === "roulette" && view.roulette?.victim === 0 && !view.roulette.result;
  focus = view.phase === "roulette" && view.roulette ? view.roulette.victim : null;
}

// -------------------------------------------------------------------- UI ---

function syncUI(view) {
  const tc = RANKS[view.tableCard];
  $("table").textContent = `${tc.emoji} ${tc.geo} · რაუნდი ${view.round}`;
  const me = view.seats[0];
  const myTurn = view.phase === "playing" && view.turn === 0 && me.alive;
  const bottom = $("bottom");
  const status = $("status");
  if (view.phase === "gameover") {
    bottom.innerHTML = "";
    status.textContent = "";
    $("winner").textContent = view.winner === 0 ? "🏆 შენ გაიმარჯვე!" : `🏆 ${view.seats[view.winner]?.name} გაიმარჯვა!`;
    $("over").style.display = "flex";
    return;
  }
  if (view.phase === "roulette" && view.roulette?.victim === 0 && !view.roulette.spinning && !view.roulette.result) {
    status.textContent = `🔫 შენი ჯერია · შანსი 1/${6 - me.pulls}`;
    if (!bottom.querySelector(".pull")) {
      bottom.innerHTML = `<button class="btn pull"><i></i><span>ჩახმახს ვწევ… 🙈 (დააჭირე და გააჩერე)</span></button>`;
      holdToPull(bottom.querySelector(".pull"));
    }
    return;
  }
  if (myTurn) {
    const canCall = view.pile && view.pile.by !== 0;
    status.textContent = view.mustCall ? "კარტები აღარ გაქვს: დაიჭირე!" : `შენი სვლაა! აირჩიე 1–3 კარტი (${tc.emoji} ${tc.geo})`;
    bottom.innerHTML = `<button class="btn liar" ${canCall ? "" : "disabled"}>🤥 მატყუარა!</button><button class="btn play" ${selected.length && !view.mustCall ? "" : "disabled"}>🃏 დადება${selected.length ? ` ×${selected.length}` : ""}</button>`;
    bottom.querySelector(".liar").onclick = () => { unlockAudio(); dispatch({ type: "call", seat: 0 }); };
    bottom.querySelector(".play").onclick = () => {
      unlockAudio();
      const ids = selected.slice(0, MAX_PLAY);
      myPlay = ids;
      selected = [];
      if (!dispatch({ type: "play", seat: 0, ids })) myPlay = null;
    };
    return;
  }
  bottom.innerHTML = "";
  const up = view.seats[view.turn];
  status.textContent = view.phase === "playing" && up ? `${up.name} ფიქრობს…` : view.phase === "roulette" && view.roulette ? `🔫 ${view.seats[view.roulette.victim]?.name} რევოლვერთან` : view.phase === "reveal" ? "👀" : "";
}

function holdToPull(btn) {
  let t0 = 0, raf = 0;
  const bar = btn.querySelector("i");
  const stop = () => { cancelAnimationFrame(raf); t0 = 0; bar.style.width = "0"; };
  btn.onpointerdown = (e) => {
    e.preventDefault();
    unlockAudio();
    t0 = performance.now();
    const step = () => {
      if (!t0) return;
      const k = Math.min(1, (performance.now() - t0) / 1300);
      bar.style.width = `${k * 100}%`;
      shake = Math.max(shake, k * 0.15);
      if (k >= 1) { t0 = 0; dispatch({ type: "pull", seat: 0 }); return; }
      raf = requestAnimationFrame(step);
    };
    sfx("heart");
    raf = requestAnimationFrame(step);
  };
  btn.onpointerup = btn.onpointerleave = btn.onpointercancel = stop;
}

// my own revolver: seen at the right edge, barrel to my temple
const myGun = new THREE.Group();
{
  const steel = toon("#9aa3b2");
  const barrel = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 10), steel, { outline: 0.1 });
  barrel.rotation.z = Math.PI / 2;
  const drum = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 12), steel, { outline: 0.08 });
  drum.rotation.z = Math.PI / 2;
  drum.position.x = -0.13;
  const grip = mesh(new THREE.BoxGeometry(0.045, 0.13, 0.045), toon("#8a4b24"), { outline: 0.08 });
  grip.position.set(-0.19, -0.06, 0);
  myGun.add(barrel, drum, grip);
  myGun.position.set(0.28, 0.05, -0.32);
  myGun.rotation.set(0, 0.5, 0.15);
  myGun.visible = false;
  camera.add(myGun);
}

// ----------------------------------------------------------- input: tap ---

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let drag = null;
let yaw = 0, pitch = 0;
renderer.domElement.addEventListener("pointerdown", (e) => {
  unlockAudio();
  drag = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false };
});
window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 8) drag.moved = true;
  if (drag.moved) {
    yaw = Math.max(-0.9, Math.min(0.9, drag.yaw - dx * 0.004));
    pitch = Math.max(-0.3, Math.min(0.35, drag.pitch - dy * 0.003));
  }
});
window.addEventListener("pointerup", (e) => {
  const d = drag;
  drag = null;
  if (!d || d.moved || !state) return;
  const view = viewFor(state, 0);
  if (!(view.phase === "playing" && view.turn === 0) || view.mustCall) return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects([...handCards.values()].map((c) => c.obj), true);
  if (!hits.length) return;
  const hitCard = [...handCards.values()].find((c) => hits[0].object.parent === c.obj);
  if (!hitCard) return;
  selected = selected.includes(hitCard.id) ? selected.filter((x) => x !== hitCard.id) : selected.length >= MAX_PLAY ? selected : [...selected, hitCard.id];
  sfx("select");
  layoutHand();
  syncUI(view);
});

// ------------------------------------------------------------------ frame ---

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // phones held upright need a wider view to fit the table
  const tall = camera.aspect < 0.8;
  camera.fov = tall ? 76 : 55;
  camera.updateProjectionMatrix();
  // the hand: smaller on tall screens so five cards fit across
  hand.position.set(0, tall ? -0.3 : -0.17, -0.62);
  hand.scale.setScalar(tall ? 0.72 : 0.52);
}
window.addEventListener("resize", resize);
resize();

const EYE = new THREE.Vector3(0, 1.62, 2.5);
const LOOK = new THREE.Vector3(0, 0.82, -0.5);
const look = LOOK.clone();
const clock = new THREE.Clock();
function frame() {
  const now = performance.now();
  const t = clock.getElapsedTime();
  runTweens(now);
  // camera: my seat, gentle breathing, drag to look around; turns to the roulette victim
  if (!drag) { yaw *= 0.94; pitch *= 0.94; }
  const target = focus != null && focus !== 0 && seats[focus] ? headPos(focus) : LOOK;
  look.lerp(target, 0.05);
  const dead = state && !state.seats[0].alive;
  camera.position.set(EYE.x, EYE.y + Math.sin(t * 1.3) * 0.006 - (dead ? 0.35 : 0), EYE.z);
  camera.lookAt(look);
  camera.rotateY(yaw);
  camera.rotateX(pitch);
  if (dead) camera.rotateZ(0.35);
  if (shake > 0.01) {
    camera.rotateZ((Math.random() - 0.5) * shake * 0.05);
    camera.rotateX((Math.random() - 0.5) * shake * 0.04);
    shake *= 0.9;
  }
  // the lamp sways
  shade.position.x = bulb.position.x = Math.sin(t * 0.8) * 0.04;
  lamp.position.x = shade.position.x;
  // bots breathe and watch whoever is acting
  if (state) {
    const watch = focus != null ? focus : state.turn;
    seats.forEach((s, i) => {
      if (!i || s.fallen) return;
      const u = s.root.userData;
      u.body.position.y = 0.53 + Math.sin(t * 2 + i) * 0.008;
      const w = headPos(watch);
      const local = s.root.worldToLocal(w.clone());
      const want = i === watch ? Math.sin(t * 1.7) * 0.25 : Math.atan2(local.x, local.z);
      u.head.rotation.y += (Math.max(-1, Math.min(1, want)) - u.head.rotation.y) * 0.08;
      if (u.gun.visible) u.head.rotation.z = Math.sin(t * 40) * 0.02; // trembling
      else u.head.rotation.z *= 0.9;
    });
    seats.forEach((s) => { if (s.ring.visible) s.ring.material.opacity = 0.55 + Math.sin(t * 5) * 0.35; });
    if (myGun.visible) myGun.position.y = 0.05 + Math.sin(t * 38) * 0.004;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

$("go").onclick = () => { unlockAudio(); $("help").style.display = "none"; newGame(); };
$("again").onclick = () => { unlockAudio(); newGame(); };
document.fonts?.ready.then(() => { for (const k in faceCache) delete faceCache[k]; });
