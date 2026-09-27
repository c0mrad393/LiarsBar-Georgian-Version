// The 3D bar behind the home screen and the lobby: one of the rooms, the
// table, you facing the camera and the others around it — chatting, laughing,
// sipping wine — while the camera drifts slowly from side to side.
import * as THREE from "three";
import { blob, mesh, toon } from "./kit.js";
import { buildRoom } from "./room.js";
import { Char3D } from "./character.js";

const TABLE_R = 1.05, TABLE_Y = 0.78, SEAT_R = 1.38;
// you sit across the table, facing the camera; the rest fill in on both sides
const OFFSETS = [0, -0.95, 0.95, -1.8, 1.8, -2.45, 2.45];
const COLORS = ["#c23b2e", "#3f6f9e", "#3f7d4c", "#7a2c54", "#c98d22", "#b5462a"];
const MOODS = ["idle", "talk", "happy", "turn", "idle", "win", "talk"];

function emptyChair() {
  const g = new THREE.Group();
  const wood = toon("#4a2c16");
  g.add(mesh(new THREE.BoxGeometry(0.48, 0.06, 0.46), wood, { at: [0, 0.48, 0], outline: 0.03 }));
  g.add(mesh(new THREE.BoxGeometry(0.48, 0.62, 0.05), wood, { at: [0, 0.82, -0.23], outline: 0.03 }));
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.19], [0.2, 0.19]]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.46, 0.05), wood, { at: [x, 0.23, z] }));
  return g;
}

export class Showcase {
  /** onTap(key) when a character is tapped (key from the cast). */
  constructor(container, { onReady, onTap, onContextLost } = {}) {
    this.onReady = onReady;
    this.onTap = onTap;
    const phone = matchMedia("(pointer: coarse)").matches;
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 1.75));
    r.shadowMap.enabled = false; // a backdrop: blob shadows are plenty
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    container.appendChild(r.domElement);
    r.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (!this.disposed) onContextLost?.(); });
    this.renderer = r;
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#120c08");
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 30);
    this.cloth = mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.06, 40), toon("#2c6a40"), { at: [0, TABLE_Y, 0] });
    const rim = mesh(new THREE.TorusGeometry(TABLE_R, 0.055, 8, 40), toon("#6b4020"), { outline: 0.02, at: [0, TABLE_Y + 0.03, 0], rot: [Math.PI / 2, 0, 0] });
    const leg = mesh(new THREE.CylinderGeometry(0.12, 0.34, TABLE_Y, 14), toon("#4a2c16"), { at: [0, TABLE_Y / 2, 0] });
    this.scene.add(this.cloth, rim, leg, blob(2.9, 0.55));
    this.cast = [];
    this.sig = "";
    this.anchor = 0.5;
    this.nextMood = 0;
    this.nextSip = 3;

    this.resize = () => {
      const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
      r.setSize(w, h);
      this.camera.aspect = w / h;
      this.tall = this.camera.aspect < 0.8;
      this.camera.fov = this.tall ? 62 : 55;
      this.frame();
    };
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(container);
    this.resize();

    this.ray = new THREE.Raycaster();
    this.onUp = (e) => {
      if (!this.onTap) return;
      const rect = r.domElement.getBoundingClientRect();
      this.ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), this.camera);
      let best = null, bestD = 0.45;
      for (const c of this.cast) {
        if (!c.char) continue;
        const d = this.ray.ray.distanceToPoint(c.char.headWorld(new THREE.Vector3()).add(new THREE.Vector3(0, -0.2, 0)));
        if (d < bestD) { bestD = d; best = c.key; }
      }
      if (best != null) this.onTap(best);
    };
    r.domElement.addEventListener("pointerup", this.onUp);

    this.clock = new THREE.Timer();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  /** Where on the screen (0 = top, 1 = bottom) the characters should stand. */
  setAnchor(k) {
    if (Math.abs(k - this.anchor) < 0.005) return;
    this.anchor = k;
    this.frame();
  }
  frame() {
    const w = this.renderer.domElement.width, h = this.renderer.domElement.height;
    // shift the picture so the table's middle lands on the anchor
    this.camera.setViewOffset(w, h, 0, (0.5 - this.anchor) * h, w, h);
    this.camera.updateProjectionMatrix();
  }

  /** cast: [{ key, avatar, looks, seat, you, empty }]; theme: the room (0…3). */
  set({ cast, theme = 0, felt }) {
    if (import.meta.env.DEV && window.__scene != null) theme = window.__scene;
    if (theme !== this.theme) {
      this.theme = theme;
      if (this.room) { this.scene.remove(this.room.group); this.room.dispose(); }
      this.room = buildRoom("low", { shadows: false, theme });
      this.scene.add(this.room.group);
      if (this.ready) this.renderer.compileAsync?.(this.room.group, this.camera, this.scene);
    }
    if (felt) this.cloth.material = toon(felt);
    const sig = cast.map((c) => `${c.key}:${c.empty ? "-" : c.avatar}:${JSON.stringify(c.looks || {})}`).join("|");
    if (sig !== this.sig) {
      this.sig = sig;
      const old = new Map(this.cast.map((c) => [c.key + (c.empty ? "-" : c.avatar) + JSON.stringify(c.looks || {}), c]));
      for (const c of this.cast) this.scene.remove(c.root);
      const you = cast.findIndex((c) => c.you);
      const order = you > 0 ? [cast[you], ...cast.filter((_, i) => i !== you)] : cast;
      this.cast = order.slice(0, OFFSETS.length).map((c, k) => {
        const id = c.key + (c.empty ? "-" : c.avatar) + JSON.stringify(c.looks || {});
        const keep = old.get(id);
        const a = -Math.PI / 2 + OFFSETS[k];
        const pos = new THREE.Vector3(Math.cos(a) * SEAT_R, 0, Math.sin(a) * SEAT_R);
        let root, char = null;
        if (keep) ({ root, char } = keep);
        else if (c.empty) root = emptyChair();
        else {
          char = new Char3D({ avatar: c.avatar, looks: c.looks || {}, color: COLORS[(c.seat ?? k) % COLORS.length] });
          root = char.root;
          root.add(blob(0.9, 0.5));
          char.setState(c.you ? "happy" : "idle");
        }
        root.position.copy(pos);
        root.lookAt(0, 0, 0);
        this.scene.add(root);
        return { key: c.key, empty: !!c.empty, you: !!c.you, root, char };
      });
      this.nextMood = 0;
    }
    if (!this.warmed) this.warm();
  }

  warm() {
    this.warmed = true;
    const done = () => { this.ready = true; this.onReady?.(); };
    const r = this.renderer;
    this.scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of ["map", "emissiveMap"]) if (m[k]) r.initTexture(m[k]); });
    (r.compileAsync ? r.compileAsync(this.scene, this.camera) : Promise.resolve(r.compile(this.scene, this.camera))).then(done, done);
  }

  /** Bar life: moods change, heads turn, someone takes a sip now and then. */
  life(t) {
    const people = this.cast.filter((c) => c.char);
    if (t > this.nextMood) {
      this.nextMood = t + 1.8 + Math.random() * 1.6;
      for (const c of people) {
        if (Math.random() < 0.55) continue;
        c.char.setState(c.you ? (Math.random() < 0.7 ? "happy" : "win") : MOODS[(Math.random() * MOODS.length) | 0]);
        const other = people[(Math.random() * people.length) | 0];
        c.char.setLook(c.you || other === c || Math.random() < 0.3 ? this.camera.position.clone() : other.char.headWorld(new THREE.Vector3()));
      }
    }
    if (t > this.nextSip && people.length > 1) {
      this.nextSip = t + 4 + Math.random() * 4;
      const c = people[1 + ((Math.random() * (people.length - 1)) | 0)];
      if (!c.char.hold) {
        c.char.setHold("glass");
        setTimeout(() => c.char.setHold(null), 1600);
      }
    }
  }

  loop() {
    this.raf = requestAnimationFrame(this.loop);
    this.clock.update();
    if (!this.ready) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.getElapsed();
    // the camera drifts across the front of the table
    const th = Math.sin(t * 0.13) * 0.42;
    const d = this.tall ? 4.3 : 4.1;
    this.camera.position.set(Math.sin(th) * d, 2.05, Math.cos(th) * d);
    this.camera.lookAt(0, 1.0, -0.3);
    this.life(t);
    this.room.update(t, dt);
    for (const c of this.cast) c.char?.update(dt, t);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.renderer.domElement.removeEventListener("pointerup", this.onUp);
    this.room?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.renderer.domElement.remove();
  }
}
