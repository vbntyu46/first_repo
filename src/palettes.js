// Cosine palettes: colour(t) = 0.5 + 0.5 * cos(2π (c·t + d)).
export const palettes = [
  { name: 'Aurora', c: [1, 1, 1], d: [0.0, 0.1, 0.2] },
  { name: 'Prism', c: [1, 1, 1], d: [0.0, 0.33, 0.67] },
  { name: 'Ember', c: [1, 0.7, 0.4], d: [0.0, 0.15, 0.2] },
  { name: 'Orchid', c: [1, 1, 0.5], d: [0.8, 0.9, 0.3] },
  { name: 'Glacier', c: [1, 1, 1], d: [0.3, 0.2, 0.2] },
];

export function sample({ c, d }, t) {
  return c.map((ci, i) => 0.5 + 0.5 * Math.cos(2 * Math.PI * (ci * t + d[i])));
}

export const toCss = (rgb) => `rgb(${rgb.map((v) => Math.round(v * 255)).join(' ')})`;

// A bright, saturated stop of the palette, lifted toward white so it stays legible as text.
export function accent(palette) {
  let best = [1, 1, 1];
  let bestScore = -1;
  for (let i = 0; i <= 24; i++) {
    const rgb = sample(palette, i / 24);
    const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    const score = lum * (0.4 + Math.max(...rgb) - Math.min(...rgb));
    if (score > bestScore) {
      bestScore = score;
      best = rgb;
    }
  }
  return toCss(best.map((v) => v * 0.65 + 0.35));
}
