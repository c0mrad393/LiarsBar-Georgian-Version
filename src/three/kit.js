// Shared bits for the 3D scenes: materials with fur/cloth/wood grain, canvas
// textures, a tiny tween engine, and static-mesh baking to keep the draw-call
// count low on phones.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const cache = new Map();
const sharedMats = new WeakSet();
/** Materials from the shared cache must outlive any one room or character. */
export const isShared = (m) => sharedMats.has(m);

// ------------------------------------------------------------- surfaces ---
// Small tiling canvases that give fur, cloth, knit and wood their grain. They
// are nearly white, so they tint by the material colour, and double as bump
// maps: the light catches the fibres.

const surfaces = new Map();
function surface(kind) {
  if (surfaces.has(kind)) return surfaces.get(kind);
  const r = rng(kind.length * 97);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#f2f2f2";
  g.fillRect(0, 0, 256, 256);
  const tone = (lo, hi, a = 1) => { const v = Math.round(lo + r() * (hi - lo)); return `rgba(${v},${v},${v},${a})`; };
  if (kind === "fur") {
    for (let i = 0; i < 40; i++) { g.fillStyle = tone(215, 255, 0.35); g.beginPath(); g.arc(r() * 256, r() * 256, 10 + r() * 30, 0, Math.PI * 2); g.fill(); }
    g.lineCap = "round";
    for (let i = 0; i < 2600; i++) {
      const x = r() * 256, y = r() * 256, a = Math.PI / 2 + (r() - 0.5) * 0.9, l = 3 + r() * 7;
      g.strokeStyle = tone(190, 255, 0.55);
      g.lineWidth = 0.6 + r() * 0.9;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  } else if (kind === "cloth") {
    for (let y = 0; y < 256; y += 3) for (let x = 0; x < 256; x += 3) { g.fillStyle = tone((x + y) % 6 ? 205 : 225, 250, 0.7); g.fillRect(x, y, 2, 2); }
    for (let i = 0; i < 30; i++) { g.fillStyle = tone(200, 245, 0.15); g.fillRect(0, r() * 256, 256, 1 + r() * 3); }
  } else if (kind === "knit") {
    for (let y = 0; y < 256; y += 8) for (let x = 0; x < 256; x += 8) {
      g.strokeStyle = tone(170, 215);
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 7); g.lineTo(x + 8, y); g.stroke();
    }
  } else if (kind === "wood") {
    for (let i = 0; i < 90; i++) {
      const y = r() * 256;
      g.strokeStyle = tone(150, 225, 0.5);
      g.lineWidth = 0.5 + r() * 2;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3);
      g.stroke();
    }
  } else if (kind === "leather") {
    for (let i = 0; i < 1800; i++) { g.fillStyle = tone(200, 245, 0.5); g.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  const rep = { fur: [4, 3], cloth: [5, 5], knit: [6, 6], wood: [2, 2], leather: [3, 3] }[kind] || [2, 2];
  t.repeat.set(...rep);
  surfaces.set(kind, t);
  return t;
}

/**
 * The shared material per colour (+ options): soft and a little rough, like
 * clay, felt and painted wood. `grain` adds a surface (fur | cloth | knit |
 * wood | leather) with its bump.
 */
export function mat(color, { grain, ...opts } = {}) {
  const key = `${color}|${grain || ""}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) {
    const extra = grain ? { map: surface(grain), bumpMap: surface(grain), bumpScale: grain === "fur" ? 1.6 : 0.9 } : {};
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...extra, ...opts });
    sharedMats.add(m);
    cache.set(key, m);
  }
  return cache.get(key);
}
export const basic = (color, opts = {}) => {
  const key = `b|${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) { const m = new THREE.MeshBasicMaterial({ color, ...opts }); sharedMats.add(m); cache.set(key, m); }
  return cache.get(key);
};

/** A soft studio light that every surface reflects a little (eyes, steel, glass). */
const envs = new WeakMap();
export function studioEnv(renderer) {
  if (!envs.has(renderer)) {
    const pm = new THREE.PMREMGenerator(renderer);
    envs.set(renderer, pm.fromScene(new RoomEnvironment(), 0.04).texture);
    pm.dispose();
  }
  return envs.get(renderer);
}

/** A mesh with shadows on, placed. */
export function mesh(geo, material, { shadow = true, at, rot, scale } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (at) m.position.set(...at);
  if (rot) m.rotation.set(...rot);
  if (scale) (typeof scale === "number" ? m.scale.setScalar(scale) : m.scale.set(...scale));
  return m;
}

/** Merge a group's static meshes by material: one draw call per material. */
export function bake(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  const drop = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.keep) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const list = byMat.get(o.material) || [];
    list.push(g.index ? g.toNonIndexed() : g);
    byMat.set(o.material, list);
    drop.push(o);
  });
  for (const o of drop) o.parent?.remove(o);
  const out = new THREE.Group();
  for (const [material, geos] of byMat) {
    const m = new THREE.Mesh(mergeGeometries(geos), material);
    m.receiveShadow = true;
    m.castShadow = false; // the room sits outside the lamp's cone: receiving is enough
    out.add(m);
  }
  const kept = [];
  group.traverse((o) => { if (o !== group && o.parent === group) kept.push(o); });
  for (const o of kept) out.add(o);
  return out;
}

/** A canvas-backed texture. `draw(ctx, w, h)` paints it. */
export function canvasTex(w, h, draw, { repeat } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

/** A seeded random, so painted textures look the same every time. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------------------------------------------------------------- tweens ---

const tweens = new Set();
const easeOut = (k) => 1 - (1 - k) ** 3;
/** Animate position / rotation / scale of an object; `arc` lifts it mid-way. */
export function tween(obj, { pos, rot, scale, dur = 400, delay = 0, arc = 0, ease = easeOut, onEnd } = {}) {
  const t = { obj, pos, rot, scale, dur, arc, ease, onEnd, t0: performance.now() + delay, from: null };
  tweens.add(t);
  return t;
}
export function stopTweens(obj) {
  for (const t of tweens) if (t.obj === obj) tweens.delete(t);
}
export function runTweens(now) {
  for (const t of tweens) {
    if (now < t.t0) continue;
    if (!t.from) t.from = { p: t.obj.position.clone(), r: t.obj.rotation.clone(), s: t.obj.scale.clone() };
    const k = Math.min(1, (now - t.t0) / t.dur);
    const e = t.ease(k);
    if (t.pos) {
      t.obj.position.lerpVectors(t.from.p, t.pos, e);
      t.obj.position.y += Math.sin(Math.PI * k) * t.arc;
    }
    if (t.rot) t.obj.rotation.set(t.from.r.x + (t.rot[0] - t.from.r.x) * e, t.from.r.y + (t.rot[1] - t.from.r.y) * e, t.from.r.z + (t.rot[2] - t.from.r.z) * e);
    if (t.scale != null) {
      const s = typeof t.scale === "number" ? [t.scale, t.scale, t.scale] : t.scale;
      t.obj.scale.set(t.from.s.x + (s[0] - t.from.s.x) * e, t.from.s.y + (s[1] - t.from.s.y) * e, t.from.s.z + (s[2] - t.from.s.z) * e);
    }
    if (k >= 1) {
      tweens.delete(t);
      t.onEnd?.();
    }
  }
}

/** An emoji (or any text) as a sprite texture. */
const emojiCache = new Map();
export function emojiTex(e) {
  if (!emojiCache.has(e)) {
    emojiCache.set(e, canvasTex(128, 128, (g) => {
      g.font = "100px sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(e, 64, 70);
    }));
  }
  return emojiCache.get(e);
}

export const lerp = (a, b, k) => a + (b - a) * k;
export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));

/**
 * Merge the static meshes under `group` (in the group's own space) by
 * material. Skips anything marked userData.anim (moves on its own) or
 * userData.bone (a joint with its own children), so a rig stays posable.
 */
export function bakeLocal(group) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const byMat = new Map();
  const drop = [];
  const m4 = new THREE.Matrix4();
  const walk = (o) => {
    for (const c of o.children) {
      if (c.userData.anim || c.userData.bone) continue;
      if (!c.visible) { drop.push(c); continue; } // hidden for good (e.g. the khinkali's knot under a hat)
      if (c.isMesh) {
        const g = c.geometry.clone().applyMatrix4(m4.multiplyMatrices(inv, c.matrixWorld));
        for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
        if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        const list = byMat.get(c.material) || [];
        list.push(g.index ? g.toNonIndexed() : g);
        byMat.set(c.material, list);
        drop.push(c);
      }
      walk(c);
    }
  };
  walk(group);
  for (const c of drop) if (c.parent && !drop.includes(c.parent)) c.parent.remove(c);
  for (const [material, geos] of byMat) {
    const m = new THREE.Mesh(mergeGeometries(geos), material);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
}

// A soft round shadow on the floor (phones have no real shadows).
let blobTex = null;
export function blob(size, opacity) {
  blobTex ||= (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, "rgba(0,0,0,1)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  return m;
}
