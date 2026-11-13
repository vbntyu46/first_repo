import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { palettes } from './palettes.js';
import * as glsl from './shaders.js';

// One keyframe per [data-scene] section; x flips sides to sit opposite the copy.
const KEYS = [
  { x: 1.75, y: 0.0, scale: 1.2, amp: 0.2, freq: 1.1, hue: 0.0, gain: 0.85 },
  { x: -1.8, y: 0.0, scale: 1.3, amp: 0.42, freq: 1.5, hue: 0.18, gain: 1 },
  { x: 1.8, y: 0.0, scale: 1.25, amp: 0.12, freq: 0.9, hue: 0.42, gain: 0.85 },
  { x: 0.0, y: 0.0, scale: 3.4, amp: 0.3, freq: 0.8, hue: 0.62, gain: 0.3 },
  { x: 0.0, y: 0.95, scale: 0.82, amp: 0.3, freq: 1.3, hue: 0.0, gain: 1 },
];
const PLAY = KEYS.length - 1;

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

export function createScene(canvas, sections) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const shared = {
    uTime: { value: 0 },
    uHue: { value: 0 },
    uPalC: { value: new THREE.Vector3(...palettes[0].c) },
    uPalD: { value: new THREE.Vector3(...palettes[0].d) },
  };

  const blobUniforms = { ...shared, uAmp: { value: 0.2 }, uFreq: { value: 1.1 }, uGain: { value: 1 } };
  const blob = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 48),
    new THREE.ShaderMaterial({ uniforms: blobUniforms, vertexShader: glsl.blobVertex, fragmentShader: glsl.blobFragment }),
  );

  const additive = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.55, 1)),
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.04, ...additive }),
  );

  const rings = new THREE.Group();
  [
    [1.7, 1.15, 0.2],
    [1.9, -0.5, 0.9],
    [2.15, 0.35, -0.6],
  ].forEach(([radius, rx, ry]) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.004, 6, 240),
      new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.12, ...additive }),
    );
    ring.rotation.set(rx, ry, 0);
    rings.add(ring);
  });

  const rig = new THREE.Group();
  rig.add(blob, shell, rings);
  scene.add(rig);

  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(40, 32, 32),
      new THREE.ShaderMaterial({
        uniforms: shared,
        vertexShader: glsl.skyVertex,
        fragmentShader: glsl.skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    ),
  );

  const STARS = 2600;
  const positions = new Float32Array(STARS * 3);
  const seeds = new Float32Array(STARS);
  const v = new THREE.Vector3();
  for (let i = 0; i < STARS; i++) {
    v.randomDirection().multiplyScalar(4 + Math.random() * 16);
    v.toArray(positions, i * 3);
    seeds[i] = Math.random();
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const starUniforms = { ...shared, uPointScale: { value: 1 } };
  const stars = new THREE.Points(
    starGeometry,
    new THREE.ShaderMaterial({
      uniforms: starUniforms,
      vertexShader: glsl.starVertex,
      fragmentShader: glsl.starFragment,
      ...additive,
    }),
  );
  scene.add(stars);

  // Multisampled target keeps the silhouette smooth through the post-processing chain.
  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }),
  );
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.7, 0.3));
  composer.addPass(new OutputPass());

  let narrow = false;
  let tops = [];
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio, 2);
    narrow = w / h < 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    starUniforms.uPointScale.value = ratio * h * 0.03;
    tops = sections.map((s) => s.offsetTop);
  }
  window.addEventListener('resize', resize);
  // Section offsets shift when fonts load or content reflows without a window resize.
  new ResizeObserver(() => (tops = sections.map((s) => s.offsetTop))).observe(document.body);
  resize();

  // Fractional section index for the current scroll position.
  function progress() {
    const y = window.scrollY;
    for (let i = tops.length - 1; i >= 0; i--) {
      if (y >= tops[i]) {
        const next = tops[i + 1];
        return next === undefined ? i : i + Math.min((y - tops[i]) / (next - tops[i]), 1);
      }
    }
    return 0;
  }

  const pointer = { x: 0, y: 0, down: false, lastX: 0 };
  let spin = 0;
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (pointer.down) {
      spin += (e.clientX - pointer.lastX) * 0.0006;
      pointer.lastX = e.clientX;
    }
  });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.target.closest('a, button, input, label')) return;
    pointer.down = true;
    pointer.lastX = e.clientX;
    document.body.classList.add('dragging');
  });
  const release = () => {
    pointer.down = false;
    document.body.classList.remove('dragging');
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  // Touch pointers are cancelled once the page starts panning, so swipes are read from touch events.
  let touchX = 0;
  window.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
  window.addEventListener(
    'touchmove',
    (e) => {
      spin += (e.touches[0].clientX - touchX) * 0.0006;
      touchX = e.touches[0].clientX;
    },
    { passive: true },
  );

  const target = { c: shared.uPalC.value.clone(), d: shared.uPalD.value.clone() };
  let turbulence = KEYS[PLAY].amp;
  const state = { ...KEYS[0] };
  let last = performance.now();
  let time = 0;

  function frame(now) {
    const dt = Math.min(Math.max(now - last, 0) / 1000, 0.05);
    last = now;
    time += dt * (reduced ? 0.25 : 1);
    shared.uTime.value = time;

    const p = progress();
    const i = Math.min(Math.floor(p), KEYS.length - 1);
    const j = Math.min(i + 1, KEYS.length - 1);
    const t = ease(p - i);
    const k = 1 - Math.exp(-dt * 4.5);
    for (const key in state) {
      let a = KEYS[i][key];
      let b = KEYS[j][key];
      if (key === 'amp') {
        if (i === PLAY) a = turbulence;
        if (j === PLAY) b = turbulence;
      }
      state[key] = lerp(state[key], lerp(a, b, t), k);
    }

    // On portrait screens the shape stays centred above the copy instead of beside it.
    const compact = narrow && state.scale < 2;
    rig.position.x = narrow ? 0 : state.x;
    rig.position.y = compact ? state.y * 0.4 + 1.05 : state.y;
    rig.scale.setScalar(compact ? state.scale * 0.5 : state.scale);
    blobUniforms.uAmp.value = state.amp;
    blobUniforms.uFreq.value = state.freq;
    blobUniforms.uGain.value = state.gain;
    shared.uHue.value = state.hue;
    shared.uPalC.value.lerp(target.c, k);
    shared.uPalD.value.lerp(target.d, k);

    spin *= Math.exp(-dt * 1.6);
    blob.rotation.y += dt * 0.12 + spin;
    shell.rotation.y += spin * 0.4 - dt * 0.05;
    shell.rotation.x += dt * 0.03;
    rings.rotation.z += dt * 0.04;
    rings.rotation.y += dt * 0.06 + spin * 0.6;
    stars.rotation.y = time * 0.008 + p * 0.12;
    stars.position.y = p * 0.5;

    const px = reduced ? 0 : pointer.x;
    const py = reduced ? 0 : pointer.y;
    camera.position.x = lerp(camera.position.x, px * 0.35, k * 0.6);
    camera.position.y = lerp(camera.position.y, -py * 0.25, k * 0.6);
    camera.lookAt(0, 0, 0);

    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setPalette(palette) {
      target.c.set(...palette.c);
      target.d.set(...palette.d);
    },
    setTurbulence(value) {
      turbulence = lerp(0.02, 0.6, value);
    },
  };
}
