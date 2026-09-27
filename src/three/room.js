// The rooms the table can stand in, one picked per game (engine opts.scene):
//   0 დუქანი   — a tavern: plaster, Pirosmani paintings, a panduri player
//   1 მარანი   — a wine cellar: stone vault, barrels, qvevri in the floor, candles
//   2 თბილისი  — an Old Tbilisi courtyard at night: carved balconies, stars,
//                string lights over the table, fireflies
//   3 სვანეთი  — a Svan hut: log walls, a fire in the hearth, snow outside
// Walls and floors are lit by their own paint (emissive), so they never go
// black on phones; static parts are baked into a few meshes; the "life"
// (flames, stars, snow, dust, the musician) is cheap: sprites and points.
import * as THREE from "three";
import { TOON_STEPS, bake, basic, canvasTex, isShared, mesh, rng, toon } from "./kit.js";
import { paintingsAtlas } from "./paintings.js";
import { Char3D } from "./character.js";

export const THEMES = ["dukani", "marani", "tbilisi", "svaneti"];
const W = 7.2, D = 7.2, H = 3.4;

// --------------------------------------------------------------- textures ---

function painted(base, specks, seed, repeat, blobs = 900) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < blobs; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? specks : "15,8,4"},${r() * 0.08})`;
      g.beginPath();
      g.arc(r() * w, r() * h, 2 + r() * 14, 0, Math.PI * 2);
      g.fill();
    }
  }, { repeat });
}
function planks(color, repeat = [3, 3], seed = 3) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.14})`;
      g.fillRect(0, y, w, 32);
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(0, y, w, 2);
      for (let i = 0; i < 5; i++) {
        g.strokeStyle = `rgba(255,220,170,${r() * 0.1})`;
        g.beginPath();
        g.moveTo(0, y + 6 + r() * 20);
        g.bezierCurveTo(w / 3, y + r() * 30, (2 * w) / 3, y + r() * 30, w, y + 6 + r() * 20);
        g.stroke();
      }
    }
  }, { repeat });
}
function stones(base, repeat = [4, 2]) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = "#1c140e";
    g.fillRect(0, 0, w, h);
    for (let y = 0, row = 0; y < h; y += 40, row++) {
      for (let x = -((row % 2) * 30); x < w; x += 60) {
        const l = 60 + r() * 30;
        g.fillStyle = base;
        g.globalAlpha = 0.75 + r() * 0.25;
        g.beginPath();
        g.roundRect(x + 3, y + 3, 54, 34, 8);
        g.fill();
        g.globalAlpha = 1;
        g.fillStyle = `rgba(255,230,190,${r() * 0.12})`;
        g.fillRect(x + 8, y + 7, l * 0.3, 4);
      }
    }
  }, { repeat });
}
function logs(repeat = [1, 6]) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(8);
    for (let y = 0; y < h; y += 42) {
      const grd = g.createLinearGradient(0, y, 0, y + 42);
      grd.addColorStop(0, "#6b4020"); grd.addColorStop(0.5, "#8a5a2c"); grd.addColorStop(1, "#3e2412");
      g.fillStyle = grd;
      g.fillRect(0, y, w, 42);
      for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.beginPath(); g.ellipse(r() * w, y + 21, 10 + r() * 20, 3, 0, 0, Math.PI * 2); g.fill(); }
    }
  }, { repeat });
}
function signTex(text, w = 512, h = 160) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = "#0f0b08";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#c98d22";
    g.lineWidth = 10;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = "#f7eedb";
    g.font = `900 ${Math.round(h * 0.52)}px 'Noto Serif Georgian', Georgia, serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 4);
  });
}
function roundTex() {
  return canvasTex(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.4, "rgba(255,255,255,0.6)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  });
}
function flameTex() {
  return canvasTex(64, 128, (g) => {
    const grd = g.createRadialGradient(32, 92, 2, 32, 80, 60);
    grd.addColorStop(0, "rgba(255,250,200,1)");
    grd.addColorStop(0.35, "rgba(255,190,70,0.95)");
    grd.addColorStop(0.7, "rgba(230,90,20,0.6)");
    grd.addColorStop(1, "rgba(200,40,0,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(32, 4);
    g.bezierCurveTo(60, 60, 60, 120, 32, 124);
    g.bezierCurveTo(4, 120, 4, 60, 32, 4);
    g.fill();
  });
}
/** The view from the Svan hut: night mountains, a Svan tower, a moon. */
function mountainsTex() {
  return canvasTex(512, 320, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#0e1a33"); sky.addColorStop(1, "#3a4d6e");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f3ead2";
    g.beginPath(); g.arc(400, 70, 26, 0, Math.PI * 2); g.fill();
    const peaks = (y0, c, snow, seed) => {
      const r = rng(seed);
      g.fillStyle = c;
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 64) g.lineTo(x, y0 - r() * 90);
      g.lineTo(w, h); g.fill();
      if (snow) {
        g.fillStyle = "rgba(240,245,255,0.8)";
        const r2 = rng(seed);
        for (let x = 0; x <= w; x += 64) { const y = y0 - r2() * 90; g.beginPath(); g.moveTo(x - 14, y + 18); g.lineTo(x, y); g.lineTo(x + 14, y + 18); g.fill(); }
      }
    };
    peaks(200, "#50607e", true, 4);
    peaks(260, "#2a3450", false, 9);
    // the Svan tower
    g.fillStyle = "#1a2033";
    g.fillRect(150, 150, 34, 130);
    g.beginPath(); g.moveTo(144, 150); g.lineTo(167, 124); g.lineTo(190, 150); g.fill();
    g.fillStyle = "#ffcf6e"; g.fillRect(162, 176, 8, 12);
    g.fillStyle = "#e8eef8"; g.fillRect(0, h - 26, w, 26);
  });
}

// ---------------------------------------------------------------- helpers ---

/** A toon surface that shows its own paint even in the dark. */
function selfLit(tex, color, glow = 0.42) {
  return new THREE.MeshToonMaterial({ map: tex, color, gradientMap: TOON_STEPS, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: glow });
}
function plane(w, h, mat, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.receiveShadow = true;
  m.userData.keep = true;
  return m;
}
function lathe(profile, color, outline = 0.03, seg = 20) {
  return mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg), toon(color), { outline });
}
const JUG = [[0.001, 0], [0.12, 0.01], [0.16, 0.12], [0.13, 0.26], [0.07, 0.32], [0.075, 0.38], [0.001, 0.38]];
const QVEVRI = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return [0.05 + Math.sin(t * Math.PI) * 0.46 + (t > 0.85 ? 0.06 : 0), t * 1.15]; });

function glowSprite(tex, color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

/** Drifting specks (dust in the lamplight, fireflies, snow, embers). */
function particles(n, box, { color = "#fff2cc", size = 0.03, speed = [0, 0.02, 0], wobble = 0.1, fall = false, tex }) {
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const r = rng(n + 17);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = box[0] + r() * (box[3] - box[0]);
    pos[i * 3 + 1] = box[1] + r() * (box[4] - box[1]);
    pos[i * 3 + 2] = box[2] + r() * (box[5] - box[2]);
    seed[i] = r() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  const base = pos.slice();
  pts.userData.update = (t, dt) => {
    for (let i = 0; i < n; i++) {
      const k = seed[i];
      if (fall) {
        pos[i * 3 + 1] -= speed[1] * dt * (0.6 + (k % 1));
        if (pos[i * 3 + 1] < box[1]) pos[i * 3 + 1] = box[4];
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.7 + k) * wobble;
      } else {
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.3 + k) * wobble;
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.23 + k * 2) * wobble;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.27 + k) * wobble;
      }
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

/** A flame that licks and flickers. */
function flame(tex, x, y, z, s = 0.12) {
  const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  f.position.set(x, y + s * 0.8, z);
  f.scale.set(s, s * 2, 1);
  const ph = x * 7 + z * 3;
  f.userData.update = (t) => {
    const k = 0.85 + Math.sin(t * 13 + ph) * 0.08 + Math.sin(t * 29 + ph) * 0.05;
    f.scale.set(s * (0.9 + Math.sin(t * 17 + ph) * 0.08), s * 2 * k, 1);
  };
  return f;
}

/** The panduri player in the corner: strums and sways to the music. */
function musician() {
  const npc = new Char3D({ avatar: "av_tur", looks: { hat: "hat_papakha", outfit: "o_chokha", mouth: "m_curly" }, color: "#2a1e2e" });
  const pan = new THREE.Group();
  pan.add(mesh(new THREE.SphereGeometry(0.13, 14, 10), toon("#b86a2c"), { scale: [1, 1.25, 0.45], outline: 0.04 }));
  pan.add(mesh(new THREE.BoxGeometry(0.04, 0.36, 0.03), toon("#6b3a1c"), { at: [0, 0.3, 0], outline: 0.06 }));
  pan.add(mesh(new THREE.BoxGeometry(0.06, 0.08, 0.035), toon("#4a2810"), { at: [0, 0.5, 0] }));
  pan.add(mesh(new THREE.CircleGeometry(0.035, 12), basic("#1c1510"), { at: [0, 0.02, 0.06] }));
  pan.position.set(0.04, 0.3, 0.27);
  pan.rotation.set(0.2, 0, -0.95);
  npc.body.add(pan);
  npc.setState("talk");
  npc.update(0.016, 0);
  const arms = npc.arms;
  return {
    root: npc.root,
    update(t, dt) {
      npc.update(dt, t);
      const strum = Math.sin(t * 9) * 0.25;
      arms.R.shoulder.rotation.set(-0.75 + strum * 0.3, 0, 0.35);
      arms.R.elbow.rotation.set(-1.25 + strum, 0, 0);
      arms.L.shoulder.rotation.set(-1.35, 0, -0.1);
      arms.L.elbow.rotation.set(-0.5, 0, 0.9);
      npc.body.rotation.z = Math.sin(t * 2.2) * 0.06;
      npc.neck.rotation.x = Math.max(0, Math.sin(t * 4.4)) * 0.12;
    },
  };
}

// ----------------------------------------------------------------- rooms ---

function dukani(stat, room, live) {
  const wallTex = painted("#6a4a30", "255,220,170", 7, [4, 2]);
  const wallMat = selfLit(wallTex, "#e0b88c", 0.5);
  const wainMat = selfLit(planks("#5a3418", [3, 1]), "#c08a60", 0.4);
  walls(room, wallMat, wainMat);
  room.add(plane(W, D, selfLit(planks("#6b4424"), "#c9a07a", 0.35), [0, 0, 0], [-Math.PI / 2, 0, 0]));
  stat.add(mesh(new THREE.PlaneGeometry(W, D), toon("#24170d"), { at: [0, H, 0], rot: [Math.PI / 2, 0, 0], shadow: false }));
  for (let i = -2; i <= 2; i++) stat.add(mesh(new THREE.BoxGeometry(W, 0.16, 0.2), toon("#3a2414"), { at: [0, H - 0.08, i * 1.4] }));
  hangPaintings(room, stat, [[0, -1.25, 2.05, -D / 2 + 0.04, 0], [2, 1.35, 2.05, -D / 2 + 0.04, 0, 0.95], [1, -W / 2 + 0.04, 1.95, -0.6, Math.PI / 2], [3, W / 2 - 0.04, 1.95, -0.4, -Math.PI / 2]]);
  room.add(plane(1.1, 0.34, new THREE.MeshBasicMaterial({ map: signTex("დუქანი") }), [0.1, 2.75, -D / 2 + 0.05]));
  stat.add(mesh(new THREE.BoxGeometry(1.6, 0.06, 0.32), toon("#4a2c16"), { at: [0.1, 1.45, -D / 2 + 0.18], outline: 0.02 }));
  ["#8f2420", "#b5462a", "#8f2420"].forEach((c, i) => { const j = lathe(JUG, c); j.position.set(-0.45 + i * 0.5, 1.48, -D / 2 + 0.18); stat.add(j); });
  for (const [x, z, s] of [[-2.9, -2.9, 1.1], [2.9, -2.8, 1], [-3.0, 1.8, 0.9], [2.95, 2.1, 1.05]]) { const q = lathe(QVEVRI, "#b85c2c"); q.position.set(x, 0, z); q.scale.setScalar(s); stat.add(q); }
  stat.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 16), toon("#6b4020"), { at: [2.3, 0.4, -3.0], outline: 0.03 }));
  churchkhela(stat, -W / 2 + 0.2, 1.2);
  // the musician on a stool in the back corner, facing the table
  const m = musician();
  m.root.position.set(-0.95, 0, -3.0);
  m.root.lookAt(0, 0, 0);
  room.add(m.root);
  live.push(m.update);
  sconces(room, stat, live, [[-2.6, 2.1, -D / 2 + 0.1], [2.8, 2.1, -D / 2 + 0.1], [-W / 2 + 0.1, 2.1, 2.2], [W / 2 - 0.1, 2.1, 2.2]]);
  const dust = particles(90, [-1.2, 0.9, -1.2, 1.2, 2.6, 1.2], { color: "#ffe2a8", size: 0.025, wobble: 0.25, tex: roundTex() });
  room.add(dust);
  live.push(dust.userData.update);
  return { hemi: ["#b08050", "#2a180c", 1.0], lampY: 2.55, fixture: "shade" };
}

function marani(stat, room, live) {
  const stoneMat = selfLit(stones("#6e5a44"), "#d8c0a0", 0.45);
  walls(room, stoneMat, null);
  room.add(plane(W, D, selfLit(stones("#5a4838", [5, 5]), "#b8a080", 0.35), [0, 0, 0], [-Math.PI / 2, 0, 0]));
  // the barrel vault
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, D, 24, 1, true, Math.PI / 2, Math.PI), selfLit(stones("#6e5a44", [6, 3]), "#c8b090", 0.4));
  vault.material.side = THREE.BackSide;
  vault.rotation.x = Math.PI / 2; // axis front-to-back, the open half facing down
  vault.position.y = 2.2;
  vault.scale.set(1, 1, 0.33);
  vault.userData.keep = true;
  room.add(vault);
  for (let i = -2; i <= 2; i++) stat.add(mesh(new THREE.TorusGeometry(W / 2 - 0.02, 0.07, 6, 24, Math.PI), toon("#4a3a2c"), { at: [0, 2.2, i * 1.5], scale: [1, 0.33, 1] }));
  // barrels along the walls, lying down
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const z = -2.6 + i * 1.3;
    const b = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 16), toon("#7a4a24"), { at: [side * (W / 2 - 0.55), 0.42, z], rot: [0, 0, Math.PI / 2], outline: 0.02 });
    stat.add(b);
    for (const dx of [-0.3, 0.3]) stat.add(mesh(new THREE.TorusGeometry(0.43, 0.02, 6, 20), toon("#3a3a3a"), { at: [side * (W / 2 - 0.55) + dx, 0.42, z], rot: [0, Math.PI / 2, 0] }));
    stat.add(mesh(new THREE.CircleGeometry(0.34, 16), toon("#5a3418"), { at: [side * (W / 2 - 0.55) - side * 0.455, 0.42, z], rot: [0, -side * Math.PI / 2, 0] }));
  }
  // qvevri buried in the floor: only their mouths and lids show
  for (const [x, z] of [[-1.9, 2.2], [0, 2.7], [1.9, 2.2], [-2.3, -1.2], [2.3, -1.4]]) {
    stat.add(mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 20), toon("#b85c2c"), { at: [x, 0.03, z], rot: [Math.PI / 2, 0, 0] }));
    stat.add(mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.03, 18), toon("#5a3418"), { at: [x, 0.05, z] }));
  }
  room.add(plane(1.2, 0.36, new THREE.MeshBasicMaterial({ map: signTex("მარანი") }), [0, 2.3, -D / 2 + 0.05]));
  hangPaintings(room, stat, [[0, -1.6, 1.65, -D / 2 + 0.04, 0, 0.9], [2, 1.6, 1.65, -D / 2 + 0.04, 0, 0.9]]);
  // grapevines hanging from the vault
  for (let i = 0; i < 7; i++) {
    const x = -2.4 + i * 0.8;
    for (let j = 0; j < 5; j++) stat.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), toon(j % 2 ? "#5b2a6e" : "#7b2d8e"), { at: [x + (j % 2) * 0.05, 2.6 - j * 0.08, -2.2], shadow: false }));
    for (let k = 0; k < 4; k++) stat.add(mesh(new THREE.CircleGeometry(0.06, 5), toon(k % 2 ? "#4f8a3a" : "#3f7030", { side: THREE.DoubleSide }), { at: [x - 0.1 + k * 0.07, 2.7 + (k % 2) * 0.05, -2.2], rot: [0, 0, k], shadow: false }));
  }
  // candles on the barrels, flickering
  const ft = flameTex();
  for (const [x, z] of [[-W / 2 + 0.55, -2.6], [W / 2 - 0.55, -1.3], [-W / 2 + 0.55, 0], [W / 2 - 0.55, 1.3]]) {
    stat.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10), toon("#f3ead2"), { at: [x, 0.92, z] }));
    const f = flame(ft, x, 1.0, z, 0.07);
    room.add(f);
    live.push(f.userData.update);
    const g = glowSprite(roundTex(), "#ffb060", 0.9);
    g.position.set(x, 1.05, z);
    room.add(g);
  }
  const candleLight = new THREE.PointLight("#ffa04a", 3, 5, 1.6);
  candleLight.position.set(0, 1.6, -2.2);
  room.add(candleLight);
  live.push((t) => { candleLight.intensity = 2.6 + Math.sin(t * 11) * 0.4 + Math.sin(t * 23) * 0.3; });
  const dust = particles(80, [-1.4, 0.9, -1.4, 1.4, 2.6, 1.4], { color: "#ffd9a0", size: 0.025, wobble: 0.25, tex: roundTex() });
  room.add(dust);
  live.push(dust.userData.update);
  return { hemi: ["#a08060", "#1a120c", 1.0], lampY: 2.3, fixture: "chandelier" };
}

function tbilisi(stat, room, live) {
  // the night sky, a moon and stars
  const skyMat = new THREE.MeshBasicMaterial({ color: "#0d1630", side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 12), skyMat);
  sky.userData.keep = true;
  room.add(sky);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), basic("#f3ead2", { fog: false }));
  moon.position.set(1.4, 6.0, -11);
  moon.lookAt(0, 1, 0);
  room.add(moon);
  const mg = glowSprite(roundTex(), "#c9d8ff", 3.2);
  mg.position.copy(moon.position);
  room.add(mg);
  const stars = particles(220, [-12, 4.3, -13, 12, 10, -7.5], { color: "#fff6dd", size: 0.12, wobble: 0.02, tex: roundTex() });
  stars.material.fog = false;
  room.add(stars);
  live.push((t) => { stars.material.opacity = 0.75 + Math.sin(t * 1.7) * 0.2; });
  // cobbled yard
  room.add(plane(14, 14, selfLit(stones("#6a6258", [9, 9]), "#b8b0a0", 0.3), [0, 0, 0], [-Math.PI / 2, 0, 0]));
  // houses around the yard: plaster, glowing windows, carved wooden balconies
  const houseMat = selfLit(painted("#8a6a50", "255,230,200", 21, [3, 2]), "#d8b894", 0.4);
  // set back from the table, and low, so the sky shows over the roofs
  const facades = [[0, -6, 0, 11], [-5.2, 0, Math.PI / 2, 12], [5.2, 0, -Math.PI / 2, 12]];
  const windowMat = basic("#ffcf6e");
  for (const [x, z, ry, fw] of facades) {
    room.add(plane(fw, 3.5, houseMat, [x, 1.75, z], [0, ry, 0]));
    const f = new THREE.Group();
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    // balcony: floor, railing with carved posts, roof
    f.add(mesh(new THREE.BoxGeometry(5.5, 0.1, 0.9), toon("#5a3a22"), { at: [0, 1.9, 0.45] }));
    for (let i = 0; i <= 22; i++) f.add(mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), toon(i % 2 ? "#3f6f9e" : "#5a8ab8"), { at: [-2.7 + i * 0.25, 2.2, 0.88] }));
    f.add(mesh(new THREE.BoxGeometry(5.5, 0.07, 0.07), toon("#3f6f9e"), { at: [0, 2.5, 0.88] }));
    for (const px of [-2.7, -0.9, 0.9, 2.7]) f.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), toon("#5a3a22"), { at: [px, 2.55, 0.85] }));
    f.add(mesh(new THREE.BoxGeometry(5.6, 0.08, 0.08), toon("#5a3a22"), { at: [0, 3.2, 0.85] }));
    // tiled roof edge
    f.add(mesh(new THREE.BoxGeometry(fw + 0.2, 0.18, 0.7), toon("#8a3a22"), { at: [0, 3.55, 0.2], rot: [0.35, 0, 0] }));
    for (const cx of [-3.2, 3.4]) f.add(mesh(new THREE.BoxGeometry(0.35, 0.7, 0.35), toon("#6a5040"), { at: [cx, 3.9, -0.1] }));
    for (const wx of [-1.8, 0, 1.8]) {
      f.add(mesh(new THREE.PlaneGeometry(0.55, 0.7), windowMat, { at: [wx, 2.65, 0.02], shadow: false }));
      f.add(mesh(new THREE.PlaneGeometry(0.5, 0.75), windowMat, { at: [wx, 0.95, 0.02], shadow: false }));
    }
    stat.add(f);
  }
  // string lights across the yard, house to house
  const bulbs = [];
  const colors = ["#ffcf6e", "#ff8a6e", "#8fd3ff", "#b6ff8a"];
  for (let line = 0; line < 3; line++) for (let i = 0; i <= 20; i++) {
    const x = -5.1 + (i / 20) * 10.2, z = -3.6 + line * 1.5;
    const y = 3.3 - Math.sin((i / 20) * Math.PI) * 0.45;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: colors[(i + line) % 4] }));
    b.position.set(x, y, z);
    room.add(b);
    bulbs.push(b);
  }
  live.push((t) => bulbs.forEach((b, i) => { b.visible = Math.sin(t * 2 + i * 1.7) > -0.85; }));
  const flies = particles(40, [-3, 0.4, -3, 3, 2.4, 3], { color: "#e8ff8a", size: 0.05, wobble: 0.6, tex: roundTex() });
  room.add(flies);
  live.push(flies.userData.update);
  live.push((t) => { flies.material.opacity = 0.5 + Math.sin(t * 3) * 0.4; });
  return { hemi: ["#8098d0", "#2a2018", 0.9], lampY: 2.5, fixture: "lantern", open: true };
}

function svaneti(stat, room, live) {
  const logMat = selfLit(logs([1, 6]), "#d8a878", 0.42);
  walls(room, logMat, null);
  room.add(plane(W, D, selfLit(planks("#5a3a20", [4, 4]), "#c09070", 0.35), [0, 0, 0], [-Math.PI / 2, 0, 0]));
  stat.add(mesh(new THREE.PlaneGeometry(W, D), toon("#2a1a0e"), { at: [0, H, 0], rot: [Math.PI / 2, 0, 0], shadow: false }));
  for (let i = -3; i <= 3; i++) stat.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, W, 10), toon("#4a2c16"), { at: [0, H - 0.14, i * 1.1], rot: [0, 0, Math.PI / 2] }));
  // the window onto the mountains, with snow falling outside
  const view = plane(2.2, 1.4, new THREE.MeshBasicMaterial({ map: mountainsTex() }), [1.2, 1.9, -D / 2 + 0.03]);
  room.add(view);
  stat.add(mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), toon("#3a2414"), { at: [1.2, 2.66, -D / 2 + 0.08] }));
  stat.add(mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), toon("#3a2414"), { at: [1.2, 1.14, -D / 2 + 0.08] }));
  for (const x of [0.05, 1.2, 2.35]) stat.add(mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), toon("#3a2414"), { at: [x, 1.9, -D / 2 + 0.08] }));
  const snow = particles(120, [0.1, 1.2, -D / 2 + 0.05, 2.3, 2.6, -D / 2 + 0.07], { color: "#ffffff", size: 0.035, speed: [0, 0.4, 0], wobble: 0.05, fall: true, tex: roundTex() });
  room.add(snow);
  live.push(snow.userData.update);
  // the hearth: stone, logs, a live fire, embers
  const hx = -2.2, hz = -D / 2 + 0.5;
  stat.add(mesh(new THREE.BoxGeometry(1.6, 1.4, 0.8), toon("#5a5048"), { at: [hx, 0.7, hz], outline: 0.02 }));
  stat.add(mesh(new THREE.BoxGeometry(1.1, 0.8, 0.5), toon("#140d08"), { at: [hx, 0.5, hz + 0.18] }));
  stat.add(mesh(new THREE.BoxGeometry(0.6, 1.9, 0.6), toon("#4a4038"), { at: [hx, 2.35, hz - 0.1] }));
  for (const [dx, ry] of [[-0.15, 0.3], [0.15, -0.3]]) stat.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), toon("#3a2414"), { at: [hx + dx, 0.18, hz + 0.3], rot: [0, ry, Math.PI / 2] }));
  const ft = flameTex();
  for (const [dx, s] of [[-0.14, 0.2], [0.02, 0.26], [0.16, 0.18]]) {
    const f = flame(ft, hx + dx, 0.18, hz + 0.34, s);
    room.add(f);
    live.push(f.userData.update);
  }
  const fireGlow = glowSprite(roundTex(), "#ff8a3a", 1.6);
  fireGlow.position.set(hx, 0.45, hz + 0.5);
  room.add(fireGlow);
  const embers = particles(30, [hx - 0.3, 0.3, hz + 0.25, hx + 0.3, 1.2, hz + 0.45], { color: "#ffb04a", size: 0.03, wobble: 0.1, tex: roundTex() });
  room.add(embers);
  live.push(embers.userData.update);
  const fire = new THREE.PointLight("#ff8a3a", 5, 6, 1.4);
  fire.position.set(hx, 0.7, hz + 0.9);
  room.add(fire);
  live.push((t) => {
    fire.intensity = 4.2 + Math.sin(t * 9) * 0.8 + Math.sin(t * 23) * 0.5;
    fireGlow.material.opacity = 0.75 + Math.sin(t * 11) * 0.15;
  });
  // antlers and drinking horns on the walls, a fur rug
  for (const s of [-1, 1]) stat.add(mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 14, Math.PI * 0.8), toon("#e8d6b0"), { at: [W / 2 - 0.05, 2.2, s * 0.35], rot: [0, -Math.PI / 2, s > 0 ? 0.4 : Math.PI - 0.4] }));
  stat.add(mesh(new THREE.BoxGeometry(0.08, 0.3, 0.24), toon("#5a3418"), { at: [W / 2 - 0.04, 2.1, 0] }));
  for (let i = 0; i < 3; i++) stat.add(mesh(new THREE.ConeGeometry(0.05, 0.36, 10), toon("#c98d22"), { at: [-W / 2 + 0.1, 1.9, -0.5 + i * 0.5], rot: [0, 0, -1.2], outline: 0.06 }));
  stat.add(mesh(new THREE.CircleGeometry(1.9, 20), toon("#6b5646"), { at: [0, 0.005, 0], rot: [-Math.PI / 2, 0, 0], shadow: false }));
  room.add(plane(1.0, 0.3, new THREE.MeshBasicMaterial({ map: signTex("სვანეთი") }), [-2.2, 2.9, -D / 2 + 0.06]));
  hangPaintings(room, stat, [[1, -W / 2 + 0.04, 2.0, 1.2, Math.PI / 2, 0.9]]);
  return { hemi: ["#b08060", "#1a0e06", 0.95], lampY: 2.5, fixture: "oil" };
}

function walls(room, wallMat, wainMat) {
  for (const [x, z, ry] of [[0, -D / 2, 0], [0, D / 2, Math.PI], [-W / 2, 0, Math.PI / 2], [W / 2, 0, -Math.PI / 2]]) {
    room.add(plane(W, H, wallMat, [x, H / 2, z], [0, ry, 0]));
    if (wainMat) room.add(plane(W, 0.9, wainMat, [x * 0.998, 0.45, z * 0.998], [0, ry, 0]));
  }
}

let atlas = null;
function hangPaintings(room, stat, list) {
  atlas ||= paintingsAtlas();
  const mat = new THREE.MeshBasicMaterial({ map: atlas });
  for (const [cell, x, y, z, ry, w = 1.1] of list) {
    const geo = new THREE.PlaneGeometry(w, w * 0.75);
    const uv = geo.attributes.uv;
    const [cx, cy] = [cell % 2, 1 - Math.floor(cell / 2)];
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / 2, (cy + uv.getY(i)) / 2);
    const art = new THREE.Mesh(geo, mat);
    art.position.set(x, y, z);
    art.rotation.y = ry;
    art.userData.keep = true;
    room.add(art);
    const frame = mesh(new THREE.BoxGeometry(w + 0.12, w * 0.75 + 0.12, 0.05), toon("#3a2414"), { at: [x, y, z], rot: [0, ry, 0], shadow: false });
    frame.translateZ(-0.03);
    stat.add(frame);
  }
}

function churchkhela(stat, x, z) {
  const ch = ["#8b2a3a", "#c47a2c", "#6d1a36", "#b5651d"];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) stat.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), toon(ch[i]), { at: [x, 2.3 - j * 0.09, z + i * 0.16], scale: [1, 1.2, 1] }));
}

function sconces(room, stat, live, spots) {
  const tex = roundTex();
  const glows = spots.map(([x, y, z]) => {
    stat.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), basic("#ffe39a"), { at: [x, y, z], shadow: false }));
    const s = glowSprite(tex, "#ffc070", 1.3);
    s.position.set(x, y, z);
    room.add(s);
    return s;
  });
  live.push((t) => glows.forEach((s, i) => { s.material.opacity = 0.75 + Math.sin(t * 2.3 + i) * 0.12; }));
}

/**
 * Builds room `theme` (0…3). Returns { group, lamp, flicker(), update(t, dt), theme }.
 */
export function buildRoom(quality = "high", { shadows = true, theme = 0 } = {}) {
  const room = new THREE.Group();
  const stat = new THREE.Group();
  const live = [];
  const name = THEMES[((theme % THEMES.length) + THEMES.length) % THEMES.length];
  const cfg = { dukani, marani, tbilisi, svaneti }[name](stat, room, live, quality);
  room.add(bake(stat));

  const hemi = new THREE.HemisphereLight(...cfg.hemi);
  room.add(hemi);
  const lamp = new THREE.SpotLight("#ffe2b0", 26, 7, Math.PI / 3, 0.6, 1.5);
  lamp.position.set(0, 2.9, 0);
  lamp.target.position.set(0, 0, 0);
  lamp.castShadow = shadows;
  lamp.shadow.mapSize.set(quality === "low" ? 512 : 1024, quality === "low" ? 512 : 1024);
  lamp.shadow.bias = -0.0008;
  room.add(lamp, lamp.target);

  // the light fixture over the table
  const fix = new THREE.Group();
  const bulbMat = new THREE.MeshBasicMaterial({ color: "#ffe39a" });
  if (cfg.fixture === "shade" || cfg.fixture === "oil") {
    fix.add(mesh(new THREE.ConeGeometry(0.3, 0.24, 24, 1, true), toon(cfg.fixture === "oil" ? "#3a3a3a" : "#2a1d14", { side: THREE.DoubleSide }), { shadow: false }));
    fix.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), bulbMat)).position.y = -0.08;
  } else if (cfg.fixture === "chandelier") {
    fix.add(mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 24), toon("#2a2420"), { rot: [Math.PI / 2, 0, 0], shadow: false }));
    const ft = flameTex();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      fix.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), toon("#f3ead2"), { at: [Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45], shadow: false }));
      const f = flame(ft, Math.cos(a) * 0.45, 0.12, Math.sin(a) * 0.45, 0.06);
      fix.add(f);
      live.push(f.userData.update);
    }
  } else if (cfg.fixture === "lantern") {
    fix.add(mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), toon("#2a2420"), { shadow: false }));
    fix.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.24, 0.17), bulbMat));
  }
  const glow = glowSprite(roundTex(), "#ffd48a", 1.4);
  fix.add(glow);
  fix.position.set(0, cfg.lampY, 0);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2), basic("#000"));
  cord.position.y = 0.62;
  fix.add(cord);
  room.add(fix);

  let flickerUntil = 0;
  return {
    group: room,
    lamp,
    theme: name,
    open: !!cfg.open,
    /** A shot: the lamp stutters for a moment. */
    flicker() { flickerUntil = performance.now() + 700; },
    /** Frees what this room made (shared materials and the paintings stay). */
    dispose() {
      room.traverse((o) => {
        o.geometry?.dispose();
        for (const m of [].concat(o.material || [])) {
          if (isShared(m)) continue;
          if (m.map && m.map !== atlas) m.map.dispose();
          m.dispose();
        }
      });
    },
    update(t, dt = 0.016) {
      const sway = Math.sin(t * 0.8) * 0.05;
      fix.position.x = lamp.position.x = sway;
      fix.rotation.z = -sway * 0.6;
      const on = performance.now() > flickerUntil || Math.sin(t * 60) > 0.2;
      lamp.intensity = on ? 26 : 3;
      bulbMat.color.set(on ? "#ffe39a" : "#6b5a3a");
      glow.visible = on;
      for (const f of live) f(t, dt);
    },
  };
}
