// Shared bits for the 3D table: cartoon (toon) materials with outlines,
// canvas textures, a tiny tween engine, and static-mesh baking to keep the
// draw-call count low on phones.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Three flat light steps: the painted, cartoon look.
const steps = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1);
steps.minFilter = steps.magFilter = THREE.NearestFilter;
steps.needsUpdate = true;

const cache = new Map();
/** A shared toon material per colour (+ options). */
export function toon(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: steps, ...opts }));
  return cache.get(key);
}
export const OUTLINE = new THREE.MeshBasicMaterial({ color: "#120c08", side: THREE.BackSide });
export const basic = (color, opts = {}) => {
  const key = `b|${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return cache.get(key);
};

/** A mesh; `outline` > 0 adds an inverted-hull outline that much bigger. */
export function mesh(geo, mat, { outline = 0, shadow = true, at, rot, scale } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geo, OUTLINE);
    o.scale.setScalar(1 + outline);
    o.userData.outline = true;
    m.add(o);
  }
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
  for (const [mat, geos] of byMat) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
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
  for (const [mat, geos] of byMat) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = mat !== OUTLINE;
    m.receiveShadow = true;
    group.add(m);
  }
}
