import '@fontsource-variable/space-grotesk';
import '@fontsource/instrument-serif/400-italic.css';
import './style.css';
import { palettes, sample, toCss, accent } from './palettes.js';
import { createScene } from './scene.js';

const sections = [...document.querySelectorAll('[data-scene]')];
const root = document.documentElement;

let stage = null;
try {
  stage = createScene(document.getElementById('stage'), sections);
} catch (error) {
  console.warn('WebGL unavailable, showing static backdrop.', error);
  root.classList.add('no-webgl');
}

// Staggered reveal as each block of copy enters the viewport.
const revealer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      revealer.unobserve(entry.target);
    }
  },
  { threshold: 0.2 },
);
for (const section of sections) {
  section.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.setProperty('--delay', `${i * 0.09}s`);
    revealer.observe(el);
  });
}

const links = [...document.querySelectorAll('.nav nav a')];
function onScroll() {
  const max = root.scrollHeight - window.innerHeight;
  root.style.setProperty('--progress', max > 0 ? window.scrollY / max : 0);
  const mid = window.scrollY + window.innerHeight / 2;
  const current = sections.findLast((s) => s.offsetTop <= mid);
  for (const link of links) link.classList.toggle('active', link.hash === `#${current?.id}`);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

if (matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
  for (const card of document.querySelectorAll('[data-tilt]')) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 14}deg`);
      card.style.setProperty('--rx', `${(0.5 - (e.clientY - r.top) / r.height) * 14}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }
}

const swatches = document.querySelector('.swatches');
function choose(palette, button) {
  for (const el of swatches.children) el.setAttribute('aria-checked', String(el === button));
  root.style.setProperty('--accent', accent(palette));
  stage?.setPalette(palette);
}
palettes.forEach((palette, index) => {
  const button = document.createElement('button');
  const stops = Array.from({ length: 7 }, (_, i) => toCss(sample(palette, i / 6)));
  button.type = 'button';
  button.className = 'swatch';
  button.setAttribute('role', 'radio');
  button.setAttribute('aria-label', palette.name);
  button.title = palette.name;
  button.style.backgroundImage = `conic-gradient(${stops.join(', ')})`;
  button.addEventListener('click', () => choose(palette, button));
  swatches.append(button);
  if (index === 0) choose(palette, button);
});

const turbulence = document.getElementById('turbulence');
turbulence.addEventListener('input', () => stage?.setTurbulence(Number(turbulence.value)));
stage?.setTurbulence(Number(turbulence.value));
