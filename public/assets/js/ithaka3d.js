// Ithaka cia Kamĩrĩĩthũ — artistic 3D hero (three.js, self-hosted, lazy-loaded).
// Dawn over layered Kikuyu ridges, a sacred mũgumo silhouette, nine orbiting lights
// for the nine clans of Gĩkũyũ and Mũmbi, and rising embers.
import * as THREE from '../vendor/three.module.min.js';

const CLANS = [
  ['Anjirũ', 'Wanjirũ'], ['Ambũi', 'Wambũi'], ['Agacikũ', 'Wanjikũ'], ['Angũi', 'Wangũi'], ['Angeci', 'Wangeci'],
  ['Aceera', 'Wanjeeri'], ['Ambura', 'Nyambura'], ['Airimũ', 'Wairimũ'], ['Angarĩ', 'Wangarĩ'],
];

export function start(canvas, tip) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8a4a48, 40, 150);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
  camera.position.set(0, 5, 24);

  // --- sun & glow --------------------------------------------------------
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(.25, 'rgba(255,190,90,.75)'); r.addColorStop(.6, 'rgba(242,90,60,.18)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sun.scale.set(95, 95, 1); sun.position.set(-12, -1, -115); scene.add(sun);

  // --- layered ridges (silhouettes) --------------------------------------
  const ridgeColors = [0xc06a52, 0x9a4e4e, 0x70384a, 0x4a2640, 0x2a1730, 0x120c18];
  const ridges = [];
  ridgeColors.forEach((col, i) => {
    const shape = new THREE.Shape(); const W = 140, z = -95 + i * 17, amp = 3 + i * 0.9, base = -12;
    shape.moveTo(-W / 2, base);
    for (let x = -W / 2; x <= W / 2; x += 1.2) {
      const y = Math.sin(x * 0.045 + i * 1.7) * amp + Math.sin(x * 0.13 + i) * amp * 0.35 + Math.sin(x * 0.31 + i * 3.1) * 0.6 + (i < 2 ? 4 : 0) - i * 0.8;
      shape.lineTo(x, y);
    }
    shape.lineTo(W / 2, base); shape.lineTo(-W / 2, base);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: col }));
    m.position.z = z; scene.add(m); ridges.push(m);
  });

  // --- mũgumo (sacred fig) silhouette on the front ridge -------------------
  const tree = new THREE.Group(); const bark = new THREE.MeshBasicMaterial({ color: 0x07050a });
  function branch(len, rad, depth, parent) {
    const geo = new THREE.CylinderGeometry(rad * 0.62, rad, len, 7); geo.translate(0, len / 2, 0);
    const b = new THREE.Mesh(geo, bark); parent.add(b);
    if (depth <= 0) {
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 + Math.random() * 1.2, 1), bark);
      leaves.position.y = len; b.add(leaves); return;
    }
    const n = depth > 2 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const holder = new THREE.Group(); holder.position.y = len * (0.75 + Math.random() * 0.2);
      holder.rotation.z = (k - (n - 1) / 2) * 0.62 + (Math.random() - 0.5) * 0.25;
      holder.rotation.y = Math.random() * Math.PI * 2;
      b.add(holder); branch(len * 0.72, rad * 0.62, depth - 1, holder);
    }
  }
  branch(5.2, 0.9, 4, tree);
  for (let k = 0; k < 4; k++) { // aerial roots
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 3.5, 5), bark); r.position.set(-1.6 + k * 1.1, 1.7, 0.4); tree.add(r);
  }
  tree.position.set(9.5, -3.6, -6); tree.scale.setScalar(1.05); scene.add(tree);

  // --- nine clan lights ------------------------------------------------------
  const palette = [0xffc23d, 0xf2456e, 0x8b5cf6, 0x3b82f6, 0x22c7b8, 0xff8a3d, 0xf5e6a8, 0x34d399, 0xff6fb1];
  const orbs = new THREE.Group(); orbs.position.set(9.5, 7.6, -6); scene.add(orbs);
  const orbList = CLANS.map(([clan, daughter], i) => {
    const mat = new THREE.SpriteMaterial({ map: glowTex, color: palette[i], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    const s = new THREE.Sprite(mat); s.scale.set(2.4, 2.4, 1); s.userData = { clan, daughter, phase: (i / 9) * Math.PI * 2 };
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: palette[i], fog: false })); s.add(core);
    orbs.add(s); return s;
  });

  // --- embers ---------------------------------------------------------------
  const N = reduce ? 0 : 520, pos = new Float32Array(N * 3), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 70; pos[i * 3 + 1] = Math.random() * 30 - 8; pos[i * 3 + 2] = -Math.random() * 60 + 8; speed[i] = 0.4 + Math.random(); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffb35c, size: 0.18, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(embers);

  // --- interaction ------------------------------------------------------------
  const mouse = new THREE.Vector2(0, 0), target = new THREE.Vector2(0, 0), ray = new THREE.Raycaster();
  let hovered = null;
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    target.set(mouse.x, mouse.y);
  };
  canvas.parentElement.addEventListener('pointermove', onMove, { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w < 700 ? 62 : 48; // phones: wider view so the tree stays in frame
    const mob = w < 700; tree.position.x = orbs.position.x = mob ? 7.5 : 9.5; tree.scale.setScalar(mob ? 0.75 : 1.05); orbs.position.y = mob ? 5.6 : 7.6; orbs.scale.setScalar(mob ? 0.7 : 1);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  let running = true, t0 = performance.now();
  const io = new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) loop(); }, { threshold: 0 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) loop(); });

  function frame(now) {
    const t = (now - t0) / 1000;
    camera.position.x += (target.x * 2.2 - camera.position.x) * 0.03;
    camera.position.y += (5 + target.y * 1.2 - camera.position.y) * 0.03;
    camera.lookAt(2, 3, -30);
    ridges.forEach((r, i) => { r.position.x = Math.sin(t * 0.05 + i) * 0.3 * (i + 1) * 0.2; });
    sun.material.opacity = 0.85 + Math.sin(t * 0.6) * 0.08;
    orbList.forEach((o) => {
      const a = o.userData.phase + t * 0.25;
      o.position.set(Math.cos(a) * 7.2, Math.sin(a * 2) * 0.9 + Math.sin(a) * 1.4, Math.sin(a) * 3.2);
      const k = o === hovered ? 3.6 : 2.4 + Math.sin(t * 2 + o.userData.phase) * 0.25; o.scale.set(k, k, 1);
    });
    if (N) {
      const p = eg.attributes.position.array;
      for (let i = 0; i < N; i++) { p[i * 3 + 1] += speed[i] * 0.02; p[i * 3] += Math.sin(t + i) * 0.004; if (p[i * 3 + 1] > 24) p[i * 3 + 1] = -8; }
      eg.attributes.position.needsUpdate = true;
    }
    // hover a clan light
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(orbList, false)[0]?.object || null;
    if (hit !== hovered) {
      hovered = hit;
      tip.textContent = hit ? `✦ ${hit.userData.clan} — the clan of ${hit.userData.daughter}` : '';
    }
    renderer.render(scene, camera);
  }
  function loop() { if (!running) return; frame(performance.now()); if (!reduce) requestAnimationFrame(loop); }
  loop();
  return () => { running = false; io.disconnect(); renderer.dispose(); };
}
