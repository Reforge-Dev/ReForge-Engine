# hello

The smallest ReForge game: a square you move with arrows or WASD, two solid walls that stop it, and a decorative circle. No images, no rules, no UI.

Run it with hot reload from the repo root:

```sh
pnpm install
pnpm dev
```

Then open `/hello/`. To check the built bundle instead, run `pnpm build` and open `index.prod.html` through any static server (it loads `engine/dist/reforge-engine.js`).

Everything here is data in `game.json`. There is no custom code besides the three-line bootstrap in `main.js`.
