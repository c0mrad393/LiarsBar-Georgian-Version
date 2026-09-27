// The 3D table, driven by the same view the 2D table gets. You sit at the
// front (first person); the others around the far side of the table, so
// they all fit on a phone held upright. Pure three.js, no React: the React
// wrapper (ui/Table3D.jsx) calls sync() and gives DOM labels to pin to heads.
import * as THREE from "three";
import { HEAD_INFO, ITEMS, headOf } from "../shop.js";
import { Char3D } from "./character.js";
import { damp, emojiTex, mesh, runTweens, toon, tween } from "./kit.js";
import { buildRoom } from "./room.js";
import { CARD_H, card3d, diceCup, die, preloadFaces, revolver, wineGlass } from "./props.js";

const TABLE_R = 1.05, TABLE_Y = 0.78, SEAT_R = 1.38;
const SEAT_COLORS = ["#c23b2e", "#3f6f9e", "#3f7d4c", "#7a2c54", "#c98d22", "#b5462a"];

/** Angles around the table: me at the front, the rest spread over the far side. */
function seatAngles(n) {
  const spread = n <= 2 ? 0 : n === 3 ? 1.35 : n === 4 ? 1.45 : n === 5 ? 1.6 : 1.8;
  return Array.from({ length: n }, (_, k) => (k === 0 ? Math.PI / 2 : n === 2 ? -Math.PI / 2 : -Math.PI / 2 - spread / 2 + (spread * (k - 1)) / (n - 2)));
}

export class Stage {
  constructor(container, { onSeatTap, onContextLost } = {}) {
    this.container = container;
    this.onSeatTap = onSeatTap;
    const phone = matchMedia("(pointer: coarse)").matches;
    this.quality = phone ? "mid" : "high";
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    container.appendChild(r.domElement);
    r.domElement.style.touchAction = "none";
    // the GPU dropped us (low memory, backgrounded too long): hand over to 2D
    r.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); onContextLost?.(); });
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#120c08");
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.05, 30);
    this.camera.position.set(0, 1.62, 2.5); // my seat
    this.camera.lookAt(0, 0.82, -0.5);
    this.scene.add(this.camera);
    this.room = buildRoom(this.quality === "high" ? "high" : "low");
    this.scene.add(this.room.group);

    // the table
    this.cloth = mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.06, 48), toon("#2c6a40"));
    this.cloth.position.y = TABLE_Y;
    const rim = mesh(new THREE.TorusGeometry(TABLE_R, 0.055, 10, 48), toon("#6b4020"), { outline: 0.02, at: [0, TABLE_Y + 0.03, 0], rot: [Math.PI / 2, 0, 0] });
    const leg = mesh(new THREE.CylinderGeometry(0.12, 0.34, TABLE_Y, 16), toon("#4a2c16"), { at: [0, TABLE_Y / 2, 0] });
    this.scene.add(this.cloth, rim, leg);
    // the ring that marks whose turn it is
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.19, 32), new THREE.MeshBasicMaterial({ color: "#eab54a", transparent: true, opacity: 0.8 }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.scene.add(this.ring);

    // my own revolver / glass, first person
    // my revolver, first person: at the right edge, muzzle turned to my temple, my paw on the grip
    this.myGun = new THREE.Group();
    this.myGunModel = revolver();
    this.myGunModel.rotation.set(0, Math.PI - 0.75, 0.5);
    this.myGun.add(this.myGunModel);
    this.myPaw = mesh(new THREE.SphereGeometry(0.065, 14, 10), toon("#f4e2bd"), { outline: 0.08, at: [-0.1, -0.09, 0.06] });
    this.myGun.add(this.myPaw);
    this.myGun.scale.setScalar(0.8);
    this.myGun.position.set(0.14, -0.05, -0.42);
    this.myGun.visible = false;
    this.camera.add(this.myGun);
    this.myGlass = wineGlass();
    this.myGlass.position.set(0.05, -0.22, -0.4);
    this.myGlass.visible = false;
    this.camera.add(this.myGlass);

    this.seats = [];
    this.sig = "";
    this.pile = [];
    this.cups = [];
    this.seenLog = null;
    this.seenFx = new Set();
    this.projectiles = [];
    this.labels = () => null;
    this.view = null;
    this.look = new THREE.Vector3(0, 0.82, -0.5);
    this.shake = 0;
    this.frames = [];
    preloadFaces();

    this.ray = new THREE.Raycaster();
    this.onDown = (e) => { this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    this.onUp = (e) => {
      const d = this.down;
      this.down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 350) return;
      const i = this.pick(e.clientX, e.clientY);
      if (i != null) this.onSeatTap?.(i);
    };
    r.domElement.addEventListener("pointerdown", this.onDown);
    r.domElement.addEventListener("pointerup", this.onUp);

    this.resize = () => {
      const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
      r.setSize(w, h);
      this.camera.aspect = w / h;
      this.tall = this.camera.aspect < 0.8;
      this.baseFov = this.tall ? 74 : 52;
      if (!this.sized) { this.camera.fov = this.baseFov; this.sized = true; }
      this.camera.updateProjectionMatrix();
    };
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(container);
    this.resize();

    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.renderer.domElement.removeEventListener("pointerdown", this.onDown);
    this.renderer.domElement.removeEventListener("pointerup", this.onUp);
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.renderer.domElement.remove();
  }

  /** Which seat (index) is under the screen point, if any. */
  pick(x, y) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1), this.camera);
    let best = null, bestD = Infinity;
    for (const s of this.seats) {
      if (!s.char) continue;
      const c = s.char.headWorld(new THREE.Vector3()).add(new THREE.Vector3(0, -0.25, 0));
      const sphere = new THREE.Sphere(c, 0.42);
      const hit = this.ray.ray.intersectSphere(sphere, new THREE.Vector3());
      if (hit) { const d = hit.distanceTo(this.camera.position); if (d < bestD) { bestD = d; best = s.idx; } }
    }
    return best;
  }

  // ------------------------------------------------------------- seating ---

  seat(view) {
    const n = view.seats.length;
    const sig = `${view.me}|${view.seats.map((s) => `${s.avatar}:${JSON.stringify(s.looks || {})}`).join("|")}`;
    if (sig === this.sig) return;
    this.sig = sig;
    for (const s of this.seats) if (s.char) this.scene.remove(s.char.root);
    const angles = seatAngles(n);
    this.seats = view.seats.map((p) => {
      const k = (p.idx - view.me + n) % n;
      const a = angles[k];
      const pos = new THREE.Vector3(Math.cos(a) * SEAT_R, 0, Math.sin(a) * SEAT_R);
      let char = null;
      if (k !== 0) {
        char = new Char3D({ avatar: p.avatar, looks: p.looks || {}, color: SEAT_COLORS[p.idx % SEAT_COLORS.length] });
        char.root.position.copy(pos);
        char.root.lookAt(0, 0, 0);
        this.scene.add(char.root);
        if (!p.alive) { char.setState("dead"); }
      }
      const front = new THREE.Vector3(Math.cos(a) * 0.72, TABLE_Y + 0.035, Math.sin(a) * 0.72);
      return { idx: p.idx, k, a, pos, char, front };
    });
    // a bigger table needs the camera further back
    this.eye = new THREE.Vector3(0, n >= 5 ? 1.9 : 1.62, n >= 5 ? 3.15 : 2.5);
  }

  seatOf(idx) { return this.seats.find((s) => s.idx === idx); }

  /** Where a seat's hands are (for cards flying from them); for me, the bottom of the screen. */
  handPos(idx) {
    const s = this.seatOf(idx);
    if (!s?.char) return this.camera.localToWorld(new THREE.Vector3(0, -0.28, -0.5));
    return s.char.arms.R.paw.getWorldPosition(new THREE.Vector3());
  }
  headPos(idx) {
    const s = this.seatOf(idx);
    if (!s?.char) return this.camera.localToWorld(new THREE.Vector3(0, -0.1, -0.35));
    return s.char.headWorld(new THREE.Vector3());
  }

  // ---------------------------------------------------------------- sync ---

  /** The React side calls this on every render. */
  sync({ view, states = {}, fx = [], myLooks, flicker }) {
    this.view = view;
    this.seat(view);
    const felt = ITEMS[myLooks?.felt]?.felt;
    this.cloth.material = toon(felt ? felt[1] : "#2c6a40");
    if (flicker && flicker !== this.flickered) { this.flickered = flicker; this.room.flicker(); this.shake = 1; }

    // events since last time: cards thrown, reveals, dice
    const log = view.log;
    if (this.seenLog == null) this.seenLog = log[0]?.id ?? 0;
    if (log[0] && log[0].id < this.seenLog) this.seenLog = 0;
    const fresh = log.filter((e) => e.id > this.seenLog).reverse();
    if (log[0]) this.seenLog = log[0].id;
    for (const ev of fresh) this.event(ev, view);
    this.syncPile(view);
    this.syncDice(view);

    // characters: mood, where they look, what they hold
    const dice = view.kind === "dice";
    for (const s of this.seats) {
      const p = view.seats[s.idx];
      if (!s.char || !p) continue;
      const mood = states[s.idx] || { state: p.alive ? "idle" : "dead" };
      s.char.setState(p.alive ? mood.state : "dead", { point: mood.point != null, blush: dice ? p.pulls / 5 : 0 });
      const r = view.roulette;
      const victim = view.phase === "roulette" && r && r.victim === s.idx;
      s.char.setHold(victim && p.alive ? (dice ? "glass" : "gun") : null, victim && r.spinning, victim ? r.result : null);
      const target = mood.point != null ? mood.point : view.phase === "roulette" && r ? r.victim : view.phase === "playing" ? view.turn : null;
      s.char.setLook(target == null || target === s.idx ? null : this.headPos(target));
    }
    const r = view.roulette;
    const meVictim = view.phase === "roulette" && r && r.victim === view.me && !r.result;
    this.myGun.visible = meVictim && !dice;
    this.myGlass.visible = meVictim && dice;
    this.myGunModel.userData.cock(r?.spinning ? 1 : 0);
    const myFur = HEAD_INFO[headOf(view.seats[view.me]?.avatar)]?.colors.fur;
    if (myFur) this.myPaw.material = toon(myFur);

    // fx: things thrown across the table
    for (const f of fx) {
      if (this.seenFx.has(f.id)) continue;
      this.seenFx.add(f.id);
      if (f.kind === "throw") this.throwItem(f);
    }
  }

  event(ev, view) {
    if (ev.type === "deal" || ev.type === "roll" || ev.type === "start") this.clearTable();
    if (ev.type === "play") {
      const back = ITEMS[view.seats[ev.seat]?.looks?.cards]?.back || "red";
      const from = this.handPos(ev.seat);
      for (let i = 0; i < ev.n; i++) this.addCard(back, from, i * 90);
    }
    if (ev.type === "call" && view.kind !== "dice" && view.reveal?.cards) {
      const cards = view.reveal.cards;
      const last = this.pile.slice(-cards.length);
      last.forEach((c, i) => {
        c.userData.reveal(cards[i]?.rank);
        const up = c.position.clone();
        up.y += 0.14;
        tween(c, { pos: up, rot: [-Math.PI / 2, 0, (i - (cards.length - 1) / 2) * 0.15], dur: 450, delay: 700 + i * 260 });
      });
    }
  }

  clearTable() {
    for (const c of this.pile) tween(c, { scale: 0.01, dur: 280, onEnd: () => this.scene.remove(c) });
    this.pile = [];
    for (const c of this.cups) this.scene.remove(c.group);
    this.cups = [];
  }

  addCard(back, from, delay = 0, instant = false) {
    const c = card3d(back);
    const k = this.pile.length;
    const spot = new THREE.Vector3((Math.random() - 0.5) * 0.16 + ((k % 3) - 1) * 0.05, TABLE_Y + 0.036 + k * 0.0015, (Math.random() - 0.5) * 0.12);
    c.rotation.set(Math.PI / 2, 0, (Math.random() - 0.5) * 1.2);
    this.scene.add(c);
    this.pile.push(c);
    if (instant) { c.position.copy(spot); return; }
    c.position.copy(from);
    c.scale.setScalar(0.6);
    tween(c, { pos: spot, scale: 1, dur: 520, delay, arc: 0.28 });
  }

  /** Keep the pile's size right even if we joined mid-round. */
  syncPile(view) {
    if (view.kind === "dice") return;
    const want = view.pile?.count ?? (view.phase === "reveal" || view.phase === "roulette" ? this.pile.length : 0);
    if (!view.pile && view.phase === "playing" && this.pile.length) this.clearTable();
    while (this.pile.length < want) this.addCard(ITEMS[view.seats[view.pile?.by]?.looks?.cards]?.back || "red", null, 0, true);
  }

  /** Dice mode: a cup in front of everyone; they rattle on the roll and lift on a call. */
  syncDice(view) {
    if (view.kind !== "dice") return;
    for (const s of this.seats) {
      const p = view.seats[s.idx];
      let cup = this.cups.find((c) => c.idx === s.idx);
      if (!p?.alive) { if (cup && !view.reveal) { this.scene.remove(cup.group); this.cups = this.cups.filter((c) => c !== cup); } continue; }
      if (!cup) {
        const group = new THREE.Group();
        group.position.copy(s.front);
        const c = diceCup();
        group.add(c);
        this.scene.add(group);
        cup = { idx: s.idx, group, cup: c, dice: null, lifted: false };
        this.cups.push(cup);
      }
      const reveal = view.phase === "reveal" && view.reveal?.dice?.[s.idx]?.length;
      if (reveal && !cup.lifted) {
        cup.lifted = true;
        const faces = view.reveal.dice[s.idx];
        const f = view.reveal.bid.f;
        cup.dice = new THREE.Group();
        faces.forEach((v, j) => {
          const d = die(v);
          d.position.set((j - 2) * 0.058, 0.025, (j % 2) * 0.03);
          d.rotation.y = (Math.random() - 0.5) * 0.4;
          if (v === f || v === 1) { d.scale.setScalar(0.01); tween(d, { scale: 1.25, dur: 350, delay: 900 + j * 120 }); } else d.scale.setScalar(1);
          cup.dice.add(d);
        });
        cup.group.add(cup.dice);
        tween(cup.cup, { pos: new THREE.Vector3(0, 0.22, -0.12), rot: [-0.9, 0, 0], dur: 500, delay: 300 });
      }
    }
  }

  throwItem(f) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(f.item), depthTest: false }));
    s.scale.setScalar(0.18);
    s.renderOrder = 20;
    const from = this.headPos(f.from), to = this.headPos(f.to);
    s.position.copy(from);
    this.scene.add(s);
    tween(s, { pos: to, dur: 650, arc: 0.45, ease: (k) => k, onEnd: () => {
      this.scene.remove(s);
      this.seatOf(f.to)?.char?.hit(f.item);
    } });
  }

  // ---------------------------------------------------------------- frame ---

  loop() {
    this.raf = requestAnimationFrame(this.loop); // browsers stop this by themselves in hidden tabs
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    runTweens(performance.now());
    this.room.update(t);
    for (const s of this.seats) s.char?.update(dt, t);
    this.camerawork(dt, t);
    this.turnRing(t);
    this.rattle(t);
    this.renderer.render(this.scene, this.camera);
    if (import.meta.env.DEV) window.__stage3d = { calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles, pr: this.renderer.getPixelRatio(), shadows: this.renderer.shadowMap.enabled };
    this.pinLabels();
    this.adapt(dt);
  }

  camerawork(dt, t) {
    const v = this.view;
    const cam = this.camera;
    const eye = this.eye || new THREE.Vector3(0, 1.62, 2.5);
    let look = new THREE.Vector3(0, 0.82, -0.5);
    let dolly = 0, fov = this.baseFov;
    const r = v?.roulette;
    const me = v?.me;
    if (v?.phase === "roulette" && r && r.victim !== me && this.seatOf(r.victim)?.char) {
      look = this.headPos(r.victim).add(new THREE.Vector3(0, -0.12, 0));
      dolly = v.dramatic ? 0.42 : 0.25;
      fov = this.baseFov - (v.dramatic ? 12 : 4);
    } else if (v?.phase === "gameover" && v.winner != null && v.winner !== me && this.seatOf(v.winner)?.char) {
      look = this.headPos(v.winner);
      dolly = 0.2;
    }
    this.look.x = damp(this.look.x, look.x, 3, dt);
    this.look.y = damp(this.look.y, look.y, 3, dt);
    this.look.z = damp(this.look.z, look.z, 3, dt);
    const pos = eye.clone().lerp(this.look, dolly);
    const meDead = v && v.seats[me] && !v.seats[me].alive;
    pos.y += Math.sin(t * 1.3) * 0.006 - (meDead ? 0.4 : 0);
    cam.position.x = damp(cam.position.x, pos.x, 3, dt);
    cam.position.y = damp(cam.position.y, pos.y, 3, dt);
    cam.position.z = damp(cam.position.z, pos.z, 3, dt);
    cam.fov = damp(cam.fov, fov, 3, dt);
    cam.updateProjectionMatrix();
    cam.lookAt(this.look);
    if (meDead) cam.rotateZ(0.32);
    if (r?.victim === me && r?.spinning) this.shake = Math.max(this.shake, 0.25);
    if (this.shake > 0.01) {
      cam.rotateZ((Math.random() - 0.5) * this.shake * 0.05);
      cam.rotateX((Math.random() - 0.5) * this.shake * 0.04);
      this.shake *= 0.9;
    }
    if (this.myGun.visible) this.myGun.position.y = -0.05 + Math.sin(t * 40) * 0.003;
    if (this.myGlass.visible) this.myGlass.rotation.z = damp(this.myGlass.rotation.z, r?.spinning ? 1.2 : 0, 4, dt);
  }

  turnRing(t) {
    const v = this.view;
    const s = v?.phase === "playing" ? this.seatOf(v.turn) : null;
    this.ring.visible = !!s;
    if (s) {
      this.ring.position.copy(s.front);
      this.ring.material.opacity = 0.55 + Math.sin(t * 5) * 0.3;
    }
  }

  rattle(t) {
    const v = this.view;
    if (v?.kind !== "dice" || v.phase !== "dealing") return;
    for (const c of this.cups) if (!c.lifted) c.cup.rotation.set(Math.sin(t * 30 + c.idx) * 0.12, 0, Math.cos(t * 27 + c.idx) * 0.12);
  }

  /** Move each seat's DOM label to its head on screen, and the table label to the table. */
  pinLabels() {
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    const put = (el, p) => {
      if (!el) return;
      p.project(this.camera);
      const behind = p.z > 1;
      el.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px)`;
      el.style.visibility = behind ? "hidden" : "visible";
    };
    for (const s of this.seats) {
      if (!s.char) continue;
      put(this.labels(s.idx), s.char.headWorld(new THREE.Vector3()).add(new THREE.Vector3(0, 0.34, 0)));
    }
    put(this.labels("table"), new THREE.Vector3(0, TABLE_Y + 0.05, 0.42));
    put(this.labels("center"), new THREE.Vector3(0, TABLE_Y + 0.35, 0));
  }

  /** Slow phone? Drop resolution, then shadows. */
  adapt(dt) {
    this.frames.push(dt);
    if (this.frames.length < 90) return;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    this.frames = [];
    const r = this.renderer;
    if (avg > 0.028 && r.getPixelRatio() > 1) { r.setPixelRatio(1); this.resize(); }
    else if (avg > 0.028 && r.shadowMap.enabled) {
      r.shadowMap.enabled = false;
      this.room.lamp.castShadow = false;
      this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    } else if (avg > 0.034 && r.getPixelRatio() > 0.75) { r.setPixelRatio(0.75); this.resize(); }
  }
}

export { CARD_H };
