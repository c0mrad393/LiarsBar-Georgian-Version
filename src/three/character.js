// A 3D bar patron: a small rig (hips → torso, shoulders → elbows → paws,
// neck → head) built from simple shapes with cartoon shading. The face has
// blinking eyes, eyebrows and mouth shapes per mood; the head is one of the
// five characters (khinkali, pig, fox, bear, tur). Accessories are the small
// hand-fitted set from the shop, placed on per-species anchors.
import * as THREE from "three";
import { HEAD_INFO, headOf } from "../shop.js";
import { bakeLocal, basic, damp, mesh, stopTweens, toon, tween } from "./kit.js";
import { muzzleFlash, revolver, splatTex, wineGlass } from "./props.js";

const G = new Map();
/** Shared geometries (same shape → same buffer). */
function geo(kind, ...a) {
  const key = kind + a.join(",");
  if (!G.has(key)) G.set(key, new THREE[kind](...a));
  return G.get(key);
}

// Where things sit on each head (head space: centre 0,0,0, radius ~0.23, +z forward).
const FIT = {
  pig: { mouth: [-0.12, 0.215], stache: [-0.095, 0.24], hat: [0.19, 1], nose: [-0.04, 0.29] },
  fox: { mouth: [-0.13, 0.2], stache: [-0.1, 0.25], hat: [0.2, 0.95], nose: [-0.06, 0.33] },
  bear: { mouth: [-0.13, 0.215], stache: [-0.105, 0.25], hat: [0.2, 1], nose: [-0.05, 0.26] },
  tur: { mouth: [-0.14, 0.21], stache: [-0.115, 0.245], hat: [0.22, 0.92], nose: [-0.07, 0.26] },
  khinkali: { mouth: [-0.1, 0.22], stache: [-0.07, 0.225], hat: [0.24, 1], nose: [-0.02, 0.24] },
};

// Arm poses per arm: [shoulder swing x, shoulder out z, elbow bend x, elbow z]
const POSE = {
  rest: { L: [-0.6, 0.12, -1.1, 0], R: [-0.6, -0.12, -1.1, 0] },
  chin: { L: [-0.6, 0.12, -1.1, 0], R: [-1.25, 0.5, -2.1, 0] },
  up: { L: [-2.8, 0.45, -0.25, 0], R: [-2.8, -0.45, -0.25, 0] },
  face: { L: [-1.55, -0.45, -1.9, 0], R: [-1.55, 0.45, -1.9, 0] },
  point: { L: [-0.6, 0.12, -1.1, 0], R: [-1.45, 0.25, -0.15, 0] },
  gun: { L: [-0.6, 0.12, -1.1, 0], R: [0, -2.0, 0, -0.6] }, // paw on the grip, muzzle at the temple
  glass: { L: [-0.6, 0.12, -1.1, 0], R: [-1.6, 0.42, -2.25, 0] },
  limp: { L: [-0.15, 0.35, -0.2, 0], R: [-0.15, -0.35, -0.2, 0] },
};

// Face per mood: [eyes, mouth, brows]
const FACE = {
  idle: ["open", "smile", "flat"], turn: ["look", "flat", "think"], nervous: ["wide", "o", "worried"],
  happy: ["happy", "grin", "up"], win: ["happy", "grin", "up"], sad: ["open", "frown", "worried"],
  talk: ["open", "talk", "up"], dead: ["x", "tongue", "flat"], busted: ["wide", "o", "worried"],
  tipsy: ["dizzy", "grin", "up"], brace: ["shut", "grit", "angry"],
};

function hat(id) {
  const g = new THREE.Group();
  const o = 0.05;
  switch (id) {
    case "hat_cap":
      g.add(mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon("#c23b2e"), { outline: o, scale: [1.05, 0.62, 1.05] }));
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.015, 18, 1, false, -Math.PI / 2, Math.PI), toon("#c23b2e"), { at: [0, 0.005, 0.14], outline: o }));
      g.add(mesh(geo("SphereGeometry", 0.025, 8, 6), toon("#f7eedb"), { at: [0, 0.125, 0] }));
      break;
    case "hat_party":
      g.add(mesh(new THREE.ConeGeometry(0.1, 0.3, 16), toon("#7a2c54"), { at: [0, 0.14, 0], rot: [0, 0, 0.18], outline: o }));
      g.add(mesh(geo("SphereGeometry", 0.035, 10, 8), toon("#eab54a"), { at: [-0.05, 0.29, 0] }));
      g.add(mesh(new THREE.TorusGeometry(0.075, 0.01, 6, 16), toon("#eab54a"), { at: [0.012, 0.08, 0], rot: [Math.PI / 2, 0.18, 0] }));
      break;
    case "hat_top":
      g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.26, 20), toon("#1c1510"), { at: [0, 0.14, 0], outline: o }));
      g.add(mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.015, 24), toon("#1c1510"), { at: [0, 0.012, 0], outline: o }));
      g.add(mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.04, 20), toon("#8f2420"), { at: [0, 0.05, 0] }));
      break;
    case "hat_papakha":
      g.add(mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.22, 20), toon("#2e2620"), { at: [0, 0.1, 0], outline: o }));
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        g.add(mesh(geo("SphereGeometry", 0.045, 6, 5), toon("#3d332b"), { at: [Math.cos(a) * 0.18, 0.05 + (i % 3) * 0.06, Math.sin(a) * 0.18], shadow: false }));
      }
      g.add(mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.04, 20), toon("#3d332b"), { at: [0, 0.22, 0] }));
      break;
    case "hat_chef":
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.12, 18), toon("#fbf6ea"), { at: [0, 0.06, 0], outline: o }));
      for (const [x, z] of [[0, 0], [0.08, 0.05], [-0.08, 0.05], [0.07, -0.07], [-0.07, -0.07]]) g.add(mesh(geo("SphereGeometry", 0.1, 12, 10), toon("#fbf6ea"), { at: [x, 0.18, z], outline: 0.03 }));
      break;
    case "hat_viking":
      g.add(mesh(new THREE.SphereGeometry(0.235, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon("#8c95a3"), { outline: o, scale: [1, 0.75, 1], at: [0, -0.04, 0] }));
      g.add(mesh(new THREE.TorusGeometry(0.235, 0.02, 6, 24), toon("#c98d22"), { at: [0, -0.03, 0], rot: [Math.PI / 2, 0, 0] }));
      for (const s of [-1, 1]) g.add(mesh(new THREE.ConeGeometry(0.045, 0.2, 12), toon("#f3ead2"), { at: [s * 0.25, 0.08, 0], rot: [0, 0, -s * 0.9], outline: o }));
      break;
    case "hat_halo": {
      const h = mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 28), basic("#ffe39a"), { at: [0, 0.2, 0], rot: [Math.PI / 2, 0, 0], shadow: false });
      h.userData.spin = true;
      h.userData.anim = true;
      g.add(h);
      break;
    }
    case "hat_crown":
      g.add(mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.08, 20, 1, true), toon("#d9a032", { side: THREE.DoubleSide }), { at: [0, 0.04, 0], outline: o }));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(mesh(geo("ConeGeometry", 0.025, 0.07, 6), toon("#d9a032"), { at: [Math.cos(a) * 0.125, 0.11, Math.sin(a) * 0.125] }));
        g.add(mesh(geo("SphereGeometry", 0.013, 6, 5), toon(i % 2 ? "#b3302a" : "#3f6f9e"), { at: [Math.cos(a) * 0.13, 0.04, Math.sin(a) * 0.13], shadow: false }));
      }
      break;
    default:
  }
  return g;
}

function eyewear(id) {
  const g = new THREE.Group();
  const frame = toon(id === "eye_monocle" ? "#d9a032" : "#1c1510");
  const lens = (x) => {
    if (id === "eye_heart") {
      const s = new THREE.Shape();
      s.moveTo(0, -0.05); s.bezierCurveTo(-0.08, 0, -0.05, 0.06, 0, 0.03); s.bezierCurveTo(0.05, 0.06, 0.08, 0, 0, -0.05);
      g.add(mesh(new THREE.ShapeGeometry(s), basic("#e0415a"), { at: [x, 0.0, 0.03], shadow: false }));
      return;
    }
    g.add(mesh(new THREE.TorusGeometry(0.062, 0.01, 6, 20), frame, { at: [x, 0, 0], shadow: false }));
    if (id === "eye_sun") g.add(mesh(new THREE.CircleGeometry(0.06, 20), basic("#1c1510", { transparent: true, opacity: 0.88 }), { at: [x, 0, 0.002], shadow: false }));
  };
  if (id === "eye_monocle") {
    lens(-0.085);
    g.add(mesh(new THREE.TorusGeometry(0.09, 0.004, 4, 16, Math.PI * 0.8), frame, { at: [-0.12, -0.08, 0], rot: [0, 0, Math.PI * 1.1], shadow: false }));
  } else {
    lens(-0.085);
    lens(0.085);
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.01, 0.01), frame, { at: [0, 0.01, 0], shadow: false }));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.008, 0.008, 0.2), frame, { at: [s * 0.15, 0.01, -0.1], shadow: false }));
  }
  return g;
}

function mouthGear(id) {
  const g = new THREE.Group();
  const hair = toon("#2a1a10");
  if (id === "m_beard") {
    g.add(mesh(geo("SphereGeometry", 0.15, 16, 12), toon("#5a3416"), { at: [0, -0.1, -0.04], scale: [1.1, 1, 0.75], outline: 0.04 }));
    return g;
  }
  for (const s of [-1, 1]) {
    g.add(mesh(geo("CapsuleGeometry", 0.018, 0.07, 4, 8), hair, { at: [s * 0.045, 0, 0], rot: [0, 0, s * 1.2], outline: 0.1 }));
    if (id === "m_curly") g.add(mesh(new THREE.TorusGeometry(0.02, 0.009, 6, 12, Math.PI * 1.5), hair, { at: [s * 0.095, 0.025, 0], rot: [0, 0, s > 0 ? 0 : Math.PI] }));
  }
  return g;
}

function neckGear(id) {
  const g = new THREE.Group();
  switch (id) {
    case "n_redbow":
      for (const s of [-1, 1]) g.add(mesh(geo("ConeGeometry", 0.045, 0.08, 10), toon("#c23b2e"), { at: [s * 0.04, 0, 0], rot: [0, 0, s * Math.PI / 2], outline: 0.06 }));
      g.add(mesh(geo("SphereGeometry", 0.022, 8, 6), toon("#8f2420"), {}));
      break;
    case "n_scarf":
      g.add(mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 20), toon("#c23b2e"), { at: [0, 0.02, -0.12], rot: [Math.PI / 2, 0, 0], outline: 0.04 }));
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.16, 0.03), toon("#c23b2e"), { at: [0.06, -0.08, 0], rot: [0, 0, 0.15], outline: 0.05 }));
      break;
    case "n_medal":
      for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.025, 0.1, 0.01), toon("#3f6f9e"), { at: [s * 0.02, -0.04, 0], rot: [0, 0, -s * 0.35] }));
      g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16), toon("#d9a032"), { at: [0, -0.1, 0.005], rot: [Math.PI / 2, 0, 0], outline: 0.08 }));
      break;
    case "n_chain":
      g.add(mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 24, Math.PI), toon("#d9a032"), { at: [0, 0.02, 0], rot: [0.3, 0, Math.PI], shadow: false }));
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 12), toon("#d9a032"), { at: [0, -0.1, 0.02], rot: [Math.PI / 2, 0, 0], outline: 0.08 }));
      break;
    default:
  }
  return g;
}

function tableItem(id) {
  const g = new THREE.Group();
  if (id === "h_beer") {
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.11, 14), toon("#e0a94a", { transparent: true, opacity: 0.9 }), { at: [0, 0.055, 0], outline: 0.06 }));
    g.add(mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.03, 14), toon("#fbf6ea"), { at: [0, 0.12, 0] }));
    g.add(mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI), toon("#e0a94a"), { at: [0.045, 0.06, 0], rot: [0, 0, -Math.PI / 2] }));
  } else if (id === "h_wine") {
    g.add(wineGlass());
  }
  return g;
}

/** Torso colour and details for an outfit (or the seat colour). */
function dressTorso(body, outfit, seatColor) {
  const add = (m) => body.add(m);
  const colour = { o_chokha: "#2a1e2e", o_tux: "#1c1c24", o_hoodie: "#7d828b", o_gold: "#d9a032" }[outfit] || seatColor;
  if (outfit === "o_chokha") {
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) add(mesh(geo("CylinderGeometry", 0.008, 0.008, 0.06, 6), toon("#d9d9e0"), { at: [s * (0.07 + i * 0.025), 0.33, 0.215 - i * 0.012], rot: [0.2, 0, 0], shadow: false }));
    add(mesh(new THREE.TorusGeometry(0.255, 0.015, 6, 28), toon("#b9bec8"), { at: [0, 0.14, 0], rot: [Math.PI / 2, 0, 0] }));
    add(mesh(new THREE.BoxGeometry(0.06, 0.18, 0.02), toon("#8f1f2b"), { at: [0, 0.38, 0.19], rot: [0.25, 0, 0], shadow: false }));
  } else if (outfit === "o_tux") {
    add(mesh(new THREE.BoxGeometry(0.1, 0.22, 0.02), toon("#fbf6ea"), { at: [0, 0.34, 0.2], rot: [0.22, 0, 0], shadow: false }));
    for (const y of [0.3, 0.36]) add(mesh(geo("SphereGeometry", 0.01, 6, 4), toon("#1c1510"), { at: [0, y, 0.215], shadow: false }));
  } else if (outfit === "o_hoodie") {
    add(mesh(new THREE.TorusGeometry(0.13, 0.05, 8, 18, Math.PI), toon("#6b7079"), { at: [0, 0.5, -0.08], rot: [-0.4, 0, 0], outline: 0.04 }));
    add(mesh(new THREE.BoxGeometry(0.2, 0.07, 0.02), toon("#6b7079"), { at: [0, 0.18, 0.24], rot: [0.1, 0, 0], shadow: false }));
  } else {
    // a shirt collar and buttons
    for (const s of [-1, 1]) add(mesh(geo("ConeGeometry", 0.04, 0.08, 3), toon("#fbf6ea"), { at: [s * 0.035, 0.49, 0.1], rot: [1.2, 0, s * 0.6], shadow: false }));
    for (const y of [0.25, 0.33, 0.41]) add(mesh(geo("SphereGeometry", 0.012, 6, 4), toon("#1c1510"), { at: [0, y, 0.225 - (y - 0.25) * 0.2], shadow: false }));
  }
  return colour;
}

/** The head for a species. Returns { group, skull } with face parts added by the caller. */
function buildHead(kind, fur, light, dark) {
  const head = new THREE.Group();
  const furM = toon(fur);
  const add = (g, m, at, rot, o = 0.06, scale) => { const x = mesh(g, m, { at, rot, outline: o, scale }); head.add(x); return x; };
  let skull;
  if (kind === "khinkali") {
    const pts = [[0.001, -0.22], [0.16, -0.2], [0.235, -0.07], [0.22, 0.06], [0.14, 0.17], [0.05, 0.24], [0.001, 0.26]];
    skull = add(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 16), furM, [0, 0, 0], [0, 0, 0], 0.045);
    const knot = add(new THREE.ConeGeometry(0.06, 0.1, 10), toon(dark), [0, 0.3, 0], [0, 0, 0], 0.08);
    knot.userData.knot = true;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      head.add(mesh(new THREE.BoxGeometry(0.012, 0.18, 0.012), toon(dark), { at: [Math.sin(a) * 0.12, 0.15, Math.cos(a) * 0.12], rot: [Math.cos(a) * 0.55, 0, -Math.sin(a) * 0.55], shadow: false }));
    }
  } else {
    skull = add(geo("SphereGeometry", 0.23, 24, 18), furM, [0, 0, 0], [0, 0, 0], 0.045);
  }
  if (kind === "pig") {
    add(new THREE.CylinderGeometry(0.07, 0.078, 0.08, 18), toon(light), [0, -0.04, 0.225], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) add(geo("SphereGeometry", 0.014, 6, 5), basic("#8a3a52"), [s * 0.025, -0.04, 0.268], [0, 0, 0], 0);
    for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.075, 0.14, 12), furM, [s * 0.14, 0.2, 0.02], [0.3, 0, -s * 0.55]);
  } else if (kind === "fox") {
    add(new THREE.ConeGeometry(0.11, 0.19, 16), toon(light), [0, -0.07, 0.25], [Math.PI / 2, 0, 0]);
    add(geo("SphereGeometry", 0.028, 8, 6), toon("#1c1510"), [0, -0.07, 0.345], [0, 0, 0], 0);
    for (const s of [-1, 1]) {
      add(new THREE.ConeGeometry(0.075, 0.2, 12), furM, [s * 0.13, 0.24, 0], [0, 0, -s * 0.35]);
      add(geo("ConeGeometry", 0.03, 0.06, 8), toon("#1c1510"), [s * 0.165, 0.33, 0], [0, 0, -s * 0.35], 0);
    }
    for (const s of [-1, 1]) add(geo("SphereGeometry", 0.1, 12, 8), toon(light), [s * 0.12, -0.1, 0.12], [0, 0, 0], 0, [1, 0.7, 0.8]);
  } else if (kind === "bear") {
    add(geo("SphereGeometry", 0.105, 16, 12), toon(light), [0, -0.075, 0.17], [0, 0, 0], 0.06, [1, 0.8, 0.85]);
    add(geo("SphereGeometry", 0.035, 10, 8), toon("#1c1510"), [0, -0.045, 0.25], [0, 0, 0], 0, [1.2, 0.8, 1]);
    for (const s of [-1, 1]) {
      add(geo("SphereGeometry", 0.078, 14, 10), furM, [s * 0.17, 0.17, 0]);
      add(geo("CircleGeometry", 0.04, 12), toon(light), [s * 0.172, 0.172, 0.074], [0, 0, 0], 0);
    }
  } else if (kind === "tur") {
    add(geo("SphereGeometry", 0.115, 16, 12), toon(light), [0, -0.085, 0.16], [0, 0, 0], 0.06, [1, 0.85, 0.85]);
    for (const s of [-1, 1]) add(geo("SphereGeometry", 0.013, 6, 5), toon("#1c1510"), [s * 0.03, -0.06, 0.26], [0, 0, 0], 0);
    add(new THREE.ConeGeometry(0.05, 0.15, 10), toon("#6b4a2a"), [0, -0.29, 0.1], [Math.PI, 0, 0]);
    for (const s of [-1, 1]) {
      add(new THREE.TorusGeometry(0.15, 0.036, 8, 18, Math.PI * 0.95), toon("#e8d6b0"), [s * 0.1, 0.19, -0.03], [0, Math.PI / 2, s > 0 ? 0.25 : Math.PI - 0.25], 0.05);
      add(geo("SphereGeometry", 0.06, 10, 8), furM, [s * 0.22, 0.03, 0], [0, 0, 0], 0.05, [1.4, 0.6, 0.8]);
    }
  } else if (kind === "khinkali") {
    add(geo("SphereGeometry", 0.025, 8, 6), toon(light), [0, -0.02, 0.228], [0, 0, 0], 0.08);
  }
  return { head, skull };
}

export class Char3D {
  /**
   * @param avatar head id (av_*); looks: shop items; color: seat colour.
   */
  constructor({ avatar, looks = {}, color = "#c23b2e", withChair = true }) {
    const info = HEAD_INFO[headOf(avatar)];
    this.kind = info.kind;
    const { fur, light, dark } = info.colors;
    this.fit = FIT[this.kind];
    this.root = new THREE.Group();

    if (withChair) {
      const wood = toon("#4a2c16");
      this.root.add(mesh(geo("BoxGeometry", 0.48, 0.06, 0.46), wood, { at: [0, 0.48, 0], outline: 0.03 }));
      this.root.add(mesh(geo("BoxGeometry", 0.48, 0.62, 0.05), wood, { at: [0, 0.82, -0.23], outline: 0.03 }));
      for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.19], [0.2, 0.19]]) this.root.add(mesh(geo("BoxGeometry", 0.05, 0.46, 0.05), wood, { at: [x, 0.23, z] }));
    }

    // hips → torso
    this.hips = new THREE.Group();
    this.hips.userData.bone = true;
    this.hips.position.y = 0.52;
    this.root.add(this.hips);
    const body = new THREE.Group();
    this.hips.add(body);
    this.body = body;
    const colour = dressTorso(body, looks.outfit, color);
    const torsoPts = [[0.001, 0], [0.24, 0.01], [0.27, 0.16], [0.25, 0.34], [0.19, 0.47], [0.1, 0.54], [0.001, 0.55]];
    body.add(mesh(new THREE.LatheGeometry(torsoPts.map(([x, y]) => new THREE.Vector2(x, y)), 20), toon(colour, looks.outfit === "o_gold" ? { emissive: "#3a2400" } : {}), { outline: 0.035 }));
    for (const s of [-1, 1]) body.add(mesh(geo("CapsuleGeometry", 0.07, 0.25, 4, 10), toon("#3a2a20"), { at: [s * 0.11, -0.02, 0.18], rot: [Math.PI / 2, 0, 0], outline: 0.05 })); // legs

    // arms
    this.arms = {};
    for (const side of ["L", "R"]) {
      const s = side === "L" ? 1 : -1;
      const shoulder = new THREE.Group();
      shoulder.userData.bone = true;
      shoulder.position.set(s * 0.21, 0.42, 0);
      body.add(shoulder);
      shoulder.add(mesh(geo("CapsuleGeometry", 0.055, 0.12, 4, 10), toon(colour), { at: [0, -0.09, 0], outline: 0.06 }));
      const elbow = new THREE.Group();
      elbow.userData.bone = true;
      elbow.position.y = -0.18;
      shoulder.add(elbow);
      elbow.add(mesh(geo("CapsuleGeometry", 0.048, 0.11, 4, 10), toon(colour), { at: [0, -0.085, 0], outline: 0.06 }));
      const paw = mesh(geo("SphereGeometry", 0.065, 14, 10), toon(fur), { at: [0, -0.18, 0], outline: 0.08 });
      paw.userData.anim = true; // stays its own mesh: cards fly from here
      elbow.add(paw);
      this.arms[side] = { shoulder, elbow, paw, cur: [...POSE.rest[side]] };
    }

    // neck gear
    if (looks.neck) { const n = neckGear(looks.neck); n.position.set(0, 0.5, 0.13); body.add(n); }

    // head
    this.neck = new THREE.Group();
    this.neck.userData.bone = true;
    this.neck.position.y = 0.58;
    body.add(this.neck);
    const { head, skull } = buildHead(this.kind, fur, light, dark);
    head.position.y = 0.2;
    this.neck.add(head);
    this.head = head;
    this.skull = skull;
    this.buildFace();

    // accessories on the head
    const [hy, hs] = this.fit.hat;
    if (looks.hat) {
      const h = hat(looks.hat);
      h.position.y = hy;
      h.scale.setScalar(hs);
      head.add(h);
      this.halo = h.children.find((c) => c.userData.spin);
      head.traverse((c) => { if (c.userData.knot) c.visible = false; });
    }
    if (looks.eyes) { const e = eyewear(looks.eyes); e.position.set(0, 0.05, 0.245); head.add(e); }
    if (looks.mouth) {
      const m = mouthGear(looks.mouth);
      const [y, z] = looks.mouth === "m_beard" ? [this.fit.mouth[0], this.fit.mouth[1] - 0.02] : this.fit.stache;
      m.position.set(0, y, z);
      head.add(m);
    }
    if (looks.hand) { const t = tableItem(looks.hand); t.position.set(0.24, 0.81, 0.46); this.root.add(t); }

    // state
    this.state = "idle";
    this.blush = 0;
    this.look = null;
    this.hold = null;
    this.blinkAt = 1 + Math.random() * 3;
    this.dead = false;
    this.phase = Math.random() * 10;

    // fewer draw calls: merge what doesn't move on each bone
    bakeLocal(this.root);
    bakeLocal(this.body);
    for (const a of Object.values(this.arms)) { bakeLocal(a.shoulder); bakeLocal(a.elbow); }
    bakeLocal(this.head);
  }

  buildFace() {
    const h = this.head;
    const F = {};
    // eyes (squash for blinks), pupils, glints
    F.eyes = [-1, 1].map((s) => {
      const g = new THREE.Group();
      g.position.set(s * 0.085, 0.05, 0.19);
      const white = mesh(geo("SphereGeometry", 0.056, 14, 10), toon("#ffffff"), { outline: 0.1, shadow: false });
      const pupil = new THREE.Mesh(geo("SphereGeometry", 0.03, 10, 8), basic("#120c08"));
      pupil.position.z = 0.04;
      const glint = new THREE.Mesh(geo("SphereGeometry", 0.009, 6, 5), basic("#ffffff"));
      glint.position.set(-0.01, 0.012, 0.024);
      pupil.add(glint);
      const x1 = new THREE.Mesh(geo("BoxGeometry", 0.07, 0.012, 0.01), basic("#120c08"));
      const x2 = x1.clone();
      x1.rotation.z = 0.8; x2.rotation.z = -0.8;
      x1.position.z = x2.position.z = 0.055;
      const xs = new THREE.Group();
      xs.add(x1, x2);
      xs.visible = false;
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12, Math.PI), basic("#120c08"));
      arc.position.set(0, -0.01, 0.052);
      arc.visible = false;
      g.add(white, pupil, xs, arc);
      g.userData.anim = true;
      h.add(g);
      return { g, white, pupil, xs, arc };
    });
    // brows
    F.brows = [-1, 1].map((s) => {
      const b = new THREE.Mesh(geo("BoxGeometry", 0.07, 0.016, 0.016), basic("#2a1a10"));
      b.position.set(s * 0.085, 0.13, 0.215);
      b.userData.anim = true;
      h.add(b);
      return b;
    });
    // mouths: one visible at a time
    const [my, mz] = this.fit.mouth;
    const place = (m) => { m.position.set(0, my, mz); m.userData.anim = true; h.add(m); m.visible = false; return m; };
    const lip = basic("#5a1a22");
    F.mouth = {
      smile: place(new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.009, 6, 14, Math.PI), lip)),
      frown: place(new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.009, 6, 14, Math.PI), lip)),
      flat: place(new THREE.Mesh(geo("BoxGeometry", 0.06, 0.012, 0.01), lip)),
      o: place(new THREE.Mesh(geo("CircleGeometry", 0.024, 14), lip)),
      grin: place(new THREE.Mesh(new THREE.CircleGeometry(0.05, 16, Math.PI, Math.PI), lip)),
      grit: place(new THREE.Mesh(geo("BoxGeometry", 0.08, 0.03, 0.01), basic("#fbf6ea"))),
    };
    F.mouth.smile.rotation.z = Math.PI;
    F.mouth.frown.position.y -= 0.03;
    F.mouth.talk = F.mouth.grin;
    F.mouth.tongue = F.mouth.smile;
    const teeth = new THREE.Mesh(geo("BoxGeometry", 0.07, 0.012, 0.005), basic("#fbf6ea"));
    teeth.position.set(0, -0.006, 0.002);
    F.mouth.grin.add(teeth);
    // cheeks
    F.cheeks = [-1, 1].map((s) => {
      const c = new THREE.Mesh(geo("CircleGeometry", 0.042, 14), new THREE.MeshBasicMaterial({ color: "#ff5a7a", transparent: true, opacity: 0.3 }));
      c.position.set(s * 0.14, -0.05, 0.19);
      c.rotation.y = s * 0.6;
      c.userData.anim = true;
      h.add(c);
      return c;
    });
    // a Pinocchio nose, grown when caught bluffing
    const [ny, nz] = this.fit.nose;
    F.nose = mesh(new THREE.ConeGeometry(0.03, 0.26, 10), toon(this.kind === "pig" ? "#ff8fb0" : HEAD_INFO[`av_${this.kind}`].colors.fur), { outline: 0.08 });
    F.nose.rotation.x = Math.PI / 2;
    F.nose.position.set(0, ny, nz + 0.12);
    F.nose.scale.set(1, 0.001, 1);
    F.nose.userData.anim = true;
    h.add(F.nose);
    // a sweat drop
    F.sweat = new THREE.Mesh(geo("SphereGeometry", 0.025, 8, 6), basic("#8fd3ff", { transparent: true, opacity: 0.9 }));
    F.sweat.scale.set(1, 1.5, 1);
    F.sweat.visible = false;
    F.sweat.userData.anim = true;
    h.add(F.sweat);
    this.face = F;
  }

  /** idle | turn | nervous | happy | sad | win | talk | dead | busted | tipsy | brace */
  setState(state, { point = false, blush = 0 } = {}) {
    this.state = state;
    this.pointing = point;
    this.blush = blush;
    if (state === "dead" && !this.dead) this.die();
  }
  setLook(v) { this.look = v; }

  /** The roulette: "gun" at the temple, "glass" at the lips; firing = the pull; result = safe | dead. */
  setHold(kind, firing = false, result = null) {
    if (!kind) {
      if (this.held) {
        const h = this.held;
        tween(h, { pos: h.position.clone().add(new THREE.Vector3(-0.05, -0.35, 0.1)), rot: [0, h.rotation.y, 1.2], dur: 500, onEnd: () => h.parent?.remove(h) });
        this.held = null;
        this.hold = null;
      }
      return;
    }
    if (!this.held || this.hold !== kind) {
      if (this.held) this.head.remove(this.held);
      this.hold = kind;
      if (kind === "gun") {
        // pivot at the right temple; the gun hangs off it, muzzle pressed in, grip tilted down
        const pivot = new THREE.Group();
        pivot.position.set(-0.215, 0.03, 0.03);
        pivot.rotation.z = 0.6;
        const gun = revolver();
        gun.rotation.set(0, Math.PI, 0);
        gun.scale.setScalar(0.9);
        gun.position.x = -0.2 * 0.9;
        pivot.add(gun);
        const flash = muzzleFlash();
        flash.position.set(-0.21, 0.02, 0);
        gun.add(flash);
        pivot.userData.cock = gun.userData.cock;
        pivot.userData.flash = flash;
        pivot.userData.gun = gun;
        this.held = pivot;
      } else {
        const glass = wineGlass();
        glass.position.set(-0.07, -0.26, 0.24);
        glass.rotation.set(0, 0, 0.1);
        this.held = glass;
      }
      this.head.add(this.held);
    }
    this.firing = firing;
    if (result && this.result !== result) {
      this.result = result;
      if (kind === "gun" && result === "dead") {
        this.held.userData.cock(1);
        const f = this.held.userData.flash;
        f.visible = true;
        setTimeout(() => (f.visible = false), 120);
      }
      if (kind === "glass" && result === "dead") this.held.userData.poison(true);
    }
    if (!result) this.result = null;
  }

  /** Something thrown just hit this face. */
  hit(item) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: splatTex(item), transparent: true, depthTest: false }));
    s.position.set(0, 0, 0.3);
    s.scale.setScalar(0.05);
    this.head.add(s);
    tween(s, { scale: 0.34, dur: 180 });
    setTimeout(() => tween(s, { scale: 0.01, dur: 400, onEnd: () => this.head.remove(s) }), 2200);
    stopTweens(this.head);
    this.head.scale.set(1.25, 0.75, 1.2);
    tween(this.head, { scale: 1, dur: 500 });
  }

  die() {
    this.dead = true;
    tween(this.hips, { rot: [-1.35, 0, 0.25], pos: new THREE.Vector3(0, 0.3, -0.35), dur: 800 });
    this.setHold(null);
  }

  headWorld(out = new THREE.Vector3()) {
    return this.head.getWorldPosition(out);
  }

  update(dt, t) {
    const F = this.face;
    const st = this.state;
    const [eyesK, mouthK, browK] = FACE[st] || FACE.idle;
    const tt = t + this.phase;

    // body: breathe, bounce when happy, sway when tipsy, tremble when scared
    if (!this.dead) {
      const happy = st === "happy" || st === "win";
      this.body.position.y = happy ? Math.abs(Math.sin(tt * 8)) * 0.04 : Math.sin(tt * 1.8) * 0.006;
      this.body.scale.y = 1 + Math.sin(tt * 1.8) * 0.012;
      this.body.rotation.z = st === "tipsy" ? Math.sin(tt * 2.2) * 0.14 : st === "win" ? Math.sin(tt * 6) * 0.1 : damp(this.body.rotation.z, 0, 6, dt);
      const shakeK = st === "nervous" || st === "brace" || (this.hold && !this.result) ? 0.012 : 0;
      this.body.position.x = shakeK ? (Math.random() - 0.5) * shakeK : 0;
    }

    // head: look at the target, droop when sad, tilt while thinking
    let yaw = 0, pitch = 0, roll = 0;
    if (this.look) {
      const local = this.neck.worldToLocal(this.look.clone());
      yaw = Math.max(-1, Math.min(1, Math.atan2(local.x, local.z)));
      pitch = Math.max(-0.4, Math.min(0.4, -Math.atan2(local.y - 0.2, Math.hypot(local.x, local.z)) * 0.5));
    } else {
      yaw = Math.sin(tt * 0.4) * 0.3;
    }
    if (st === "turn") roll = Math.sin(tt * 1.6) * 0.18;
    if (st === "sad") pitch = 0.4;
    if (st === "busted") roll = -0.2;
    if (st === "tipsy") roll = Math.sin(tt * 1.7) * 0.25;
    if (this.hold === "gun") roll = 0.12;
    this.neck.rotation.y = damp(this.neck.rotation.y, yaw, 5, dt);
    this.neck.rotation.x = damp(this.neck.rotation.x, pitch, 5, dt);
    this.neck.rotation.z = damp(this.neck.rotation.z, roll, 5, dt);
    if (this.halo) this.halo.rotation.z += dt;

    // arms
    const poseName = this.dead ? "limp" : this.hold ? this.hold : st === "turn" ? "chin" : st === "happy" || st === "win" ? "up" : st === "nervous" || st === "busted" ? "face" : this.pointing ? "point" : "rest";
    const pose = POSE[poseName];
    for (const side of ["L", "R"]) {
      const a = this.arms[side];
      const want = [...pose[side]];
      if (poseName === "up") want[0] += Math.sin(tt * 9 + (side === "L" ? 0 : 1.5)) * 0.25;
      if (this.hold === "glass" && this.firing && side === "R") want[2] -= 0.3;
      for (let i = 0; i < 4; i++) a.cur[i] = damp(a.cur[i], want[i], 9, dt);
      a.shoulder.rotation.set(a.cur[0], 0, a.cur[1]);
      a.elbow.rotation.set(a.cur[2], 0, a.cur[3]);
    }

    // the held gun / glass
    if (this.held) {
      if (this.hold === "gun") {
        this.held.userData.cock(this.firing || this.result ? 1 : Math.max(0, Math.sin(tt * 3)) * 0.15);
        this.held.userData.gun.position.y = this.firing ? (Math.random() - 0.5) * 0.008 : 0;
      } else {
        const want = this.firing ? -1.1 : 0.1;
        this.held.rotation.z = damp(this.held.rotation.z, want, 4, dt);
        this.held.position.y = damp(this.held.position.y, this.firing ? -0.16 : -0.26, 4, dt);
      }
    }

    // eyes
    this.blinkAt -= dt;
    let open = 1;
    if (this.blinkAt < 0) { open = 0.1; if (this.blinkAt < -0.12) this.blinkAt = 2 + Math.random() * 4; }
    for (const [i, e] of F.eyes.entries()) {
      const s = i ? 1 : -1;
      e.xs.visible = eyesK === "x";
      e.arc.visible = eyesK === "happy";
      e.pupil.visible = !["x", "happy", "shut"].includes(eyesK);
      e.white.visible = eyesK !== "happy";
      const scaleY = eyesK === "shut" ? 0.12 : eyesK === "wide" ? 1.25 : eyesK === "happy" ? 1 : open;
      e.g.scale.set(eyesK === "wide" ? 1.15 : 1, damp(e.g.scale.y, scaleY, 30, dt), 1);
      let px = 0, py = 0;
      if (eyesK === "look") { px = 0.012; py = 0.015; }
      if (eyesK === "dizzy") { px = Math.cos(tt * 8 + i) * 0.015; py = Math.sin(tt * 8 + i) * 0.015; }
      if (st === "sad") py = -0.012;
      e.pupil.position.set(px, py, 0.04);
      e.pupil.scale.setScalar(eyesK === "wide" ? 0.7 : 1);
      void s;
    }
    // brows
    const browRot = { flat: 0, think: 0.25, worried: 0.35, up: 0, angry: -0.35 }[browK] || 0;
    const browY = browK === "up" ? 0.15 : browK === "worried" ? 0.14 : 0.13;
    F.brows[0].rotation.z = damp(F.brows[0].rotation.z, -browRot, 8, dt);
    F.brows[1].rotation.z = damp(F.brows[1].rotation.z, browK === "think" ? -0.1 : browRot, 8, dt);
    for (const b of F.brows) b.position.y = damp(b.position.y, browY, 8, dt);
    // mouth
    for (const [k, m] of Object.entries(F.mouth)) if (k !== "talk" && k !== "tongue") m.visible = false;
    const m = F.mouth[mouthK] || F.mouth.smile;
    m.visible = true;
    F.mouth.grin.scale.y = mouthK === "talk" ? 0.5 + Math.abs(Math.sin(tt * 14)) * 0.8 : 1;
    // cheeks, nose, sweat
    const blush = Math.min(0.95, 0.25 + this.blush + (st === "tipsy" ? 0.5 : 0) + (st === "busted" ? 0.3 : 0));
    for (const c of F.cheeks) c.material.opacity = blush;
    F.nose.scale.y = damp(F.nose.scale.y, st === "busted" ? 1 : 0.001, st === "busted" ? 4 : 10, dt);
    F.nose.visible = F.nose.scale.y > 0.01;
    const sweating = st === "nervous" || st === "brace" || (this.hold && !this.result);
    F.sweat.visible = sweating;
    if (sweating) {
      const k = (tt * 0.9) % 1;
      F.sweat.position.set(0.19, 0.16 - k * 0.2, 0.1);
    }
  }
}
