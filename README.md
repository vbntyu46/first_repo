# Aurora

An interactive 3D landing page: a noise-sculpted, iridescent shape rendered live with
[three.js](https://threejs.org), driven by scroll, pointer and drag.

## Develop

```sh
pnpm install
pnpm dev      # local dev server
pnpm build    # production build in dist/
```

## Layout

- `index.html` — page content; each `[data-scene]` section maps to a keyframe in `src/scene.js`.
- `src/scene.js` — renderer, scroll keyframes, pointer/drag input, bloom.
- `src/shaders.js` — GLSL for the shape, sky and star field.
- `src/palettes.js` — colour palettes shared by the shaders and the UI.
