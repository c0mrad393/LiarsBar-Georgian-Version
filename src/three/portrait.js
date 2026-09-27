// 3D portraits for the menus: the profile, shop, lobby, your own seat, the
// winner's screen. One small offscreen renderer draws them all, each into its
// own 2D canvas: live ones (big enough to watch) move at ~30 fps while on
// screen, thumbnails are drawn once. New characters are built a couple per
// frame, so opening the shop never stalls.
import * as THREE from "three";
import { runTweens, studioEnv } from "./kit.js";
import { Char3D } from "./character.js";

const W = 400, H = Math.round(400 * 1.22); // the portrait box is 1 : 1.22, like the 2D one

let R = null;
function setup() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight("#fff4e0", "#3a2616", 1.1));
  const key = new THREE.DirectionalLight("#ffe7c4", 2.4);
  key.position.set(1.5, 2.6, 2.2);
  const rim = new THREE.DirectionalLight("#9cc3ff", 1.6);
  rim.position.set(-2, 1.8, -2);
  scene.add(key, rim);
  // framed from the lap to the top of a hat, like the drawn characters
  const camera = new THREE.PerspectiveCamera(27, W / H, 0.1, 20);
  camera.position.set(0, 1.2, 2.75);
  camera.lookAt(0, 1.08, 0);
  R = { renderer, scene, camera, list: new Set(), queue: [], raf: 0, t0: performance.now(), last: 0 };
  const loop = (now) => {
    R.raf = requestAnimationFrame(loop);
    // build waiting characters, two a frame
    for (let i = 0; i < 2 && R.queue.length; i++) build(R.queue.shift());
    runTweens(now);
    const live = now - R.last > 33;
    if (live) R.last = now;
    const t = (now - R.t0) / 1000;
    for (const p of R.list) {
      if (!p.char) continue;
      if (p.dirty || (live && p.live && p.visible)) draw(p, t, live ? Math.min(0.1, (now - (p.drawn || now)) / 1000) : 0.016, now);
    }
  };
  R.raf = requestAnimationFrame(loop);
  return R;
}

function build(p) {
  if (!R.list.has(p)) return;
  const s = p.spec;
  p.char?.dispose();
  const c = new Char3D({ avatar: s.avatar, looks: s.looks || {}, color: s.color, withChair: false });
  c.root.rotation.y = -0.22;
  c.setState(s.state || "idle", { blush: s.blush || 0 });
  p.char = c;
  p.built = p.sig;
  p.dirty = true;
}

function draw(p, t, dt, now) {
  const { renderer, scene, camera } = R;
  const c = p.char;
  // small ones are a head-and-shoulders close-up, big ones show the whole patron
  if (p.spec.close) { camera.position.set(0, 1.36, 1.95); camera.lookAt(0, 1.27, 0); }
  else { camera.position.set(0, 1.2, 2.75); camera.lookAt(0, 1.08, 0); }
  c.setState(p.spec.state || "idle", { blush: p.spec.blush || 0 });
  c.setLook(p.spec.state === "turn" ? null : camera.position);
  scene.add(c.root);
  c.update(dt, t);
  renderer.render(scene, camera);
  scene.remove(c.root);
  const cv = p.canvas;
  const ctx = p.ctx || (p.ctx = cv.getContext("2d"));
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(renderer.domElement, 0, 0, W, H, 0, 0, cv.width, cv.height);
  p.dirty = false;
  p.drawn = now;
}

/**
 * Show a portrait in `canvas`. spec: { avatar, looks, color, state, blush, live }.
 * Returns { set(spec), hit(item), dispose() }.
 */
export function portrait(canvas, spec) {
  if (!R) setup();
  const p = { canvas, spec, sig: null, char: null, visible: true, live: !!spec.live, dirty: true };
  const io = new IntersectionObserver(([e]) => { p.visible = e.isIntersecting; if (p.visible) p.dirty = true; });
  io.observe(canvas);
  R.list.add(p);
  const api = {
    set(next) {
      p.spec = next;
      p.live = !!next.live;
      const sig = `${next.avatar}|${JSON.stringify(next.looks || {})}|${next.color}`;
      if (sig !== p.sig) { p.sig = sig; R.queue.push(p); } else p.dirty = true;
    },
    hit(item) { p.char?.hit(item); },
    dispose() {
      io.disconnect();
      R.list.delete(p);
      p.char?.dispose();
      p.char = null;
    },
  };
  api.set(spec);
  return api;
}
