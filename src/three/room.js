// The dukani around the table: plastered walls, a plank floor, ceiling beams,
// a shelf of jugs, qvevri, a barrel, churchkhela, a "დუქანი" sign and four
// paintings in Niko Pirosmani's naive style (painted here, on black oilcloth).
// Static parts are baked into a handful of meshes for phones.
import * as THREE from "three";
import { bake, basic, canvasTex, mesh, rng, toon } from "./kit.js";

const W = 7.2, D = 7.2, H = 3.4; // room size (the table is at the origin)

function plaster() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = "#4a3120";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "255,220,170" : "20,10,4"},${r() * 0.07})`;
      g.beginPath();
      g.arc(r() * w, r() * h, 2 + r() * 14, 0, Math.PI * 2);
      g.fill();
    }
  }, { repeat: [4, 2] });
}
function planks(color = "#5b3a20") {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.15})`;
      g.fillRect(0, y, w, 32);
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(0, y, w, 2);
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = `rgba(255,220,170,${r() * 0.08})`;
        g.beginPath();
        g.moveTo(0, y + 6 + r() * 20);
        g.bezierCurveTo(w / 3, y + r() * 30, (2 * w) / 3, y + r() * 30, w, y + 6 + r() * 20);
        g.stroke();
      }
    }
  }, { repeat: [3, 3] });
}

// -------------------------------------------------------------- paintings ---
// Four canvases on one atlas (2×2), painted like Pirosmani: black ground,
// flat figures lit warm against it, a white title painted along the bottom.

function paintingsAtlas() {
  return canvasTex(1024, 768, (g) => {
    const r = rng(11);
    const panel = (px, py, draw, title) => {
      g.save();
      g.translate(px, py);
      g.fillStyle = "#15100c";
      g.fillRect(0, 0, 512, 384);
      // oilcloth weave
      for (let i = 0; i < 380; i++) {
        g.fillStyle = `rgba(255,255,255,${r() * 0.035})`;
        g.fillRect(r() * 512, r() * 384, 1 + r() * 3, 1);
      }
      draw(g);
      g.fillStyle = "#f3ead2";
      g.font = "900 26px 'Noto Serif Georgian', Georgia, serif";
      g.textAlign = "center";
      g.fillText(title, 256, 368);
      g.restore();
    };
    const blob = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };

    // 1. the feast
    panel(0, 0, () => {
      g.fillStyle = "#1f3a22";
      g.fillRect(0, 300, 512, 40);
      [[110, "#2a2018"], [190, "#3b2a1d"], [270, "#2a2018"], [350, "#3b2a1d"], [420, "#2a2018"]].forEach(([x, c], i) => {
        g.fillStyle = c;
        g.fillRect(x - 28, 150, 56, 110);
        blob(x, 130, 22, 26, "#e8c49a");
        g.fillStyle = "#1a120c";
        g.fillRect(x - 20, 96, 40, 18); // papakha
        g.fillStyle = "#1a120c";
        g.fillRect(x - 14, 138, 28, 5); // moustache
        if (i === 2) { g.strokeStyle = "#e0a94a"; g.lineWidth = 8; g.beginPath(); g.moveTo(x + 22, 170); g.quadraticCurveTo(x + 52, 150, x + 46, 110); g.stroke(); } // tamada's horn
      });
      g.fillStyle = "#f3ead2";
      g.fillRect(40, 240, 432, 60); // white tablecloth
      [[90, "#8f2420"], [300, "#8f2420"]].forEach(([x, c]) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, 250); g.lineTo(x + 30, 250); g.lineTo(x + 36, 214); g.lineTo(x - 6, 214); g.fill(); });
      blob(200, 236, 34, 12, "#d9a032");
      blob(390, 236, 26, 10, "#3f6b3a");
    }, "ქეიფი");

    // 2. the deer
    panel(512, 0, () => {
      g.fillStyle = "#23402a";
      g.beginPath(); g.moveTo(0, 330); g.quadraticCurveTo(256, 250, 512, 330); g.lineTo(512, 340); g.lineTo(0, 340); g.fill();
      blob(420, 70, 30, 30, "#f3ead2");
      g.fillStyle = "#e0a94a";
      blob(250, 230, 90, 42, "#c98d4a");
      g.fillStyle = "#c98d4a";
      g.fillRect(310, 150, 26, 80);
      blob(330, 140, 30, 22, "#c98d4a");
      [[190, 260], [215, 262], [285, 262], [305, 260]].forEach(([x, y]) => g.fillRect(x, y, 12, 64));
      g.strokeStyle = "#f3ead2"; g.lineWidth = 6;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(330 + s * 8, 122); g.lineTo(330 + s * 30, 80); g.lineTo(330 + s * 22, 60); g.moveTo(330 + s * 22, 96); g.lineTo(330 + s * 44, 90); g.stroke(); }
      for (let i = 0; i < 40; i++) blob(r() * 512, 300 + r() * 30, 3, 3, r() < 0.5 ? "#f3ead2" : "#b3302a");
    }, "ირემი");

    // 3. Margarita
    panel(0, 384, () => {
      g.fillStyle = "#f3ead2";
      g.beginPath(); g.moveTo(256, 130); g.lineTo(180, 320); g.lineTo(332, 320); g.fill();
      blob(256, 100, 30, 36, "#f2cfa6");
      blob(256, 70, 36, 20, "#2a1a10");
      g.strokeStyle = "#f2cfa6"; g.lineWidth = 12;
      g.beginPath(); g.moveTo(236, 160); g.lineTo(170, 120); g.moveTo(276, 160); g.lineTo(342, 120); g.stroke();
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2, d = 90 + r() * 140;
        blob(256 + Math.cos(a) * d, 190 + Math.sin(a) * d * 0.7, 5 + r() * 5, 5 + r() * 5, r() < 0.6 ? "#b3302a" : "#f3ead2");
      }
      blob(246, 100, 3, 3, "#1a120c"); blob(266, 100, 3, 3, "#1a120c");
      blob(256, 118, 8, 3, "#b3302a");
    }, "მსახიობი მარგარიტა");

    // 4. still life: wine, bread and fish
    panel(512, 384, () => {
      g.fillStyle = "#f3ead2";
      g.fillRect(40, 250, 432, 70);
      g.fillStyle = "#8f2420";
      g.beginPath(); g.moveTo(120, 250); g.quadraticCurveTo(60, 190, 110, 120); g.lineTo(150, 120); g.quadraticCurveTo(200, 190, 140, 250); g.fill();
      g.fillStyle = "#8f2420"; g.fillRect(118, 96, 24, 26);
      blob(280, 238, 80, 26, "#d9a032");
      g.strokeStyle = "#8a5a14"; g.lineWidth = 4;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(230 + i * 30, 222); g.lineTo(242 + i * 30, 250); g.stroke(); }
      blob(410, 232, 52, 16, "#9aa3b2");
      g.fillStyle = "#9aa3b2"; g.beginPath(); g.moveTo(452, 232); g.lineTo(478, 214); g.lineTo(478, 250); g.fill();
      for (let i = 0; i < 12; i++) blob(200 + (i % 4) * 14, 180 + Math.floor(i / 4) * 14, 8, 8, "#5b2a6e");
    }, "ღვინო, პური და თევზი");
  });
}

function signTex() {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = "#0f0b08";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#c98d22";
    g.lineWidth = 10;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = "#f7eedb";
    g.font = "900 84px 'Noto Serif Georgian', Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("დუქანი", w / 2, h / 2 + 4);
  });
}

function lathe(profile, color, outline = 0.03, seg = 20) {
  return mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg), toon(color), { outline });
}
const JUG = [[0.001, 0], [0.12, 0.01], [0.16, 0.12], [0.13, 0.26], [0.07, 0.32], [0.075, 0.38], [0.001, 0.38]];
const QVEVRI = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return [0.05 + Math.sin(t * Math.PI) * 0.46 + (t > 0.85 ? 0.06 : 0), t * 1.15]; });

/**
 * Builds the room. Returns { group, update(t), flicker() }.
 * `quality` "low" skips the extra wall lights.
 */
export function buildRoom(quality = "high") {
  const room = new THREE.Group();
  const stat = new THREE.Group();

  // floor, walls, ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshToonMaterial({ map: planks(), color: "#b08a6a" }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.keep = true;
  room.add(floor);
  const wallMat = new THREE.MeshToonMaterial({ map: plaster(), color: "#c9a27a" });
  const wainMat = new THREE.MeshToonMaterial({ map: planks("#4a2c16"), color: "#a07050" });
  for (const [x, z, ry] of [[0, -D / 2, 0], [0, D / 2, Math.PI], [-W / 2, 0, Math.PI / 2], [W / 2, 0, -Math.PI / 2]]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
    wall.position.set(x, H / 2, z);
    wall.rotation.y = ry;
    wall.userData.keep = true;
    room.add(wall);
    const wain = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.9), wainMat);
    wain.position.set(x * 0.998, 0.45, z * 0.998);
    wain.rotation.y = ry;
    wain.userData.keep = true;
    room.add(wain);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon("#1c130c"));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  stat.add(ceil);
  for (let i = -2; i <= 2; i++) stat.add(mesh(new THREE.BoxGeometry(W, 0.16, 0.2), toon("#2e1d10"), { at: [0, H - 0.08, i * 1.4] }));

  // the paintings (one atlas, one draw call), in dark wooden frames
  const atlas = paintingsAtlas();
  const artMat = new THREE.MeshBasicMaterial({ map: atlas });
  const arts = [];
  const hang = (cell, x, y, z, ry, w = 1.1) => {
    const geo = new THREE.PlaneGeometry(w, w * 0.75);
    const uv = geo.attributes.uv;
    const [cx, cy] = [cell % 2, 1 - Math.floor(cell / 2)];
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / 2, (cy + uv.getY(i)) / 2);
    const art = new THREE.Mesh(geo, artMat);
    art.position.set(x, y, z);
    art.rotation.y = ry;
    arts.push(art);
    const frame = mesh(new THREE.BoxGeometry(w + 0.12, w * 0.75 + 0.12, 0.05), toon("#3a2414"), { at: [x, y, z], rot: [0, ry, 0], shadow: false });
    frame.translateZ(-0.03);
    stat.add(frame);
  };
  hang(0, -1.25, 2.05, -D / 2 + 0.04, 0);
  hang(2, 1.35, 2.05, -D / 2 + 0.04, 0, 0.95);
  hang(1, -W / 2 + 0.04, 1.95, -0.6, Math.PI / 2);
  hang(3, W / 2 - 0.04, 1.95, -0.4, -Math.PI / 2);
  const artMesh = new THREE.Mesh(mergeArts(arts), artMat);
  room.add(artMesh);

  // the sign over the shelf
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshBasicMaterial({ map: signTex() }));
  sign.position.set(0.1, 2.75, -D / 2 + 0.05);
  room.add(sign);

  // shelf with jugs and bottles
  stat.add(mesh(new THREE.BoxGeometry(1.6, 0.06, 0.32), toon("#4a2c16"), { at: [0.1, 1.45, -D / 2 + 0.18], outline: 0.02 }));
  ["#8f2420", "#b5462a", "#8f2420"].forEach((c, i) => { const j = lathe(JUG, c); j.position.set(-0.45 + i * 0.5, 1.48, -D / 2 + 0.18); stat.add(j); });
  ["#3f7d4c", "#7a2c54"].forEach((c, i) => stat.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 10), toon(c), { at: [-0.2 + i * 0.5, 1.63, -D / 2 + 0.18], outline: 0.06 })));

  // qvevri in the corners, a barrel, churchkhela
  for (const [x, z, s] of [[-2.9, -2.9, 1.1], [2.9, -2.8, 1], [-3.0, 1.8, 0.9], [2.95, 2.1, 1.05]]) {
    const q = lathe(QVEVRI, "#b85c2c");
    q.position.set(x, 0, z);
    q.scale.setScalar(s);
    stat.add(q);
    stat.add(mesh(new THREE.TorusGeometry(0.28 * s, 0.03, 6, 16), toon("#7a3b1e"), { at: [x, 1.15 * s, z], rot: [Math.PI / 2, 0, 0] }));
  }
  const barrel = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 16), toon("#6b4020"), { at: [2.3, 0.4, -3.0], outline: 0.03 });
  stat.add(barrel);
  for (const y of [0.12, 0.68]) stat.add(mesh(new THREE.TorusGeometry(0.35, 0.02, 6, 20), toon("#3a3a3a"), { at: [2.3, y, -3.0], rot: [Math.PI / 2, 0, 0] }));
  const ch = ["#8b2a3a", "#c47a2c", "#6d1a36", "#b5651d"];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
    stat.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), toon(ch[i]), { at: [-W / 2 + 0.2, 2.3 - j * 0.09, 1.2 + i * 0.16], scale: [1, 1.2, 1] }));
  }

  // wall lamps: a warm glow on the plaster
  const glows = [];
  const glowTex = canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,210,130,0.9)");
    grd.addColorStop(1, "rgba(255,180,90,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });
  for (const [x, y, z] of [[-2.6, 2.1, -D / 2 + 0.1], [2.8, 2.1, -D / 2 + 0.1], [-W / 2 + 0.1, 2.1, 2.2], [W / 2 - 0.1, 2.1, 2.2]]) {
    stat.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), basic("#ffe39a"), { at: [x, y, z], shadow: false }));
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(x, y, z);
    s.scale.setScalar(1.3);
    room.add(s);
    glows.push(s);
  }

  room.add(bake(stat));

  // lights: a dim room, a warm lamp over the table (the only shadow caster)
  const hemi = new THREE.HemisphereLight("#8a5a34", "#1a0f08", 0.75);
  room.add(hemi);
  const lamp = new THREE.SpotLight("#ffe2b0", 26, 7, Math.PI / 3, 0.6, 1.5);
  lamp.position.set(0, 2.9, 0);
  lamp.target.position.set(0, 0, 0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(quality === "low" ? 512 : 1024, quality === "low" ? 512 : 1024);
  lamp.shadow.bias = -0.0008;
  room.add(lamp, lamp.target);
  if (quality !== "low") {
    const back = new THREE.PointLight("#ff9a55", 3, 6, 1.6);
    back.position.set(0, 2.2, -3);
    room.add(back);
  }
  // the lamp itself, over the table
  const shade = mesh(new THREE.ConeGeometry(0.3, 0.24, 24, 1, true), toon("#2a1d14", { side: THREE.DoubleSide }), { shadow: false });
  shade.position.set(0, 2.55, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), basic("#ffe39a"));
  bulb.position.set(0, 2.47, 0);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9), basic("#000"));
  cord.position.set(0, 3.0, 0);
  room.add(shade, bulb, cord);

  let flickerUntil = 0;
  return {
    group: room,
    lamp,
    /** A shot: the lamp stutters for a moment. */
    flicker() { flickerUntil = performance.now() + 700; },
    update(t) {
      const sway = Math.sin(t * 0.8) * 0.05;
      shade.position.x = bulb.position.x = lamp.position.x = sway;
      const on = performance.now() > flickerUntil || Math.sin(t * 60) > 0.2;
      lamp.intensity = on ? 26 : 3;
      bulb.material.color.set(on ? "#ffe39a" : "#6b5a3a");
      for (const [i, s] of glows.entries()) s.material.opacity = 0.75 + Math.sin(t * 2.3 + i) * 0.12;
    },
  };
}

function mergeArts(arts) {
  const geos = arts.map((a) => { a.updateMatrix(); return a.geometry.clone().applyMatrix4(a.matrix); });
  const pos = [], uv = [], idx = [];
  let off = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(i + off);
    off += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
}
