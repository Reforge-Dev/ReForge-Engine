---
inclusion: always
---

# Tech

## Stack

- TypeScript (strict), Vite library mode, pnpm workspace (`engine`, `editor`).
- Canvas 2D for the world, DOM overlay for UI widgets.
- Vitest + fast-check (property tests), happy-dom for DOM tests. ESLint (typescript-eslint strict) + Prettier.
- Zero runtime dependencies in the engine.

## Commands

- `pnpm dev`: serve `examples/hello`.
- `pnpm build`: `vite build`, then `gen` (manifest, schema, docs), then the 60 KB gzip size check.
- `pnpm -F engine gen`: regenerate `dist/behaviors.manifest.json`, `dist/game.schema.json`, `docs/behaviors.md`.
- `pnpm test` (all), `pnpm -F engine test` (engine only).
- `pnpm typecheck`, `pnpm lint`, `pnpm format`. `pnpm lint` (root `package.json`) is the only lint definition. CI, the save hook and the pre-commit check all call it. Do not add another.
- Pre-commit check (run before every commit): `pnpm -r typecheck && pnpm lint && pnpm -r test && pnpm --filter engine build`.

## Code style

- No `any`. Use `unknown` and narrow it. Game JSON is `Json` / `JsonObject` from `types.ts`.
- Rules, validation and geometry are plain functions. Side effects live in `io/`, `ui/` and `core/game.ts`.
- No module-level mutable state. Registries are built by `createRegistry()`.
- No `Math.random()`. All randomness uses the seeded mulberry32 `sim.rng`. ESLint enforces this.
- No `Date.now()` or `performance.now()` in simulation code. Time is `sim.tick` (60 Hz, `DT = 1/60`). Only `core/game.ts` reads the clock.
- No `console.*`. Report problems with `sim.error(code, message, path?)`, which emits the `error` event once.
- Never write game strings with `innerHTML` (a test enforces it).
- State must be plain JSON so it compares with `toEqual`.
- Game data ids are `kebab-case`. Code is `camelCase`, types `PascalCase`.
- No TODO without an issue number.

## Coordinates

Scene units are pixels, origin top-left. Entity `x, y` is the center of the thing. Colliders and sprites extend half their size around it. Draw order: `layer`, then array order (later draws on top). `scene.sortBy: "y"` sorts by `y` inside each layer. `src/order.ts` is the one definition, used for drawing and clicks.

## Budgets and support

- Engine bundle under 60 KB gzip (now about 21 KB). 60 fps with 500 entities.
- Latest Chrome, Firefox, Safari.

## Commits

Small, plain imperative messages. No attribution trailers. Never add `.kiro` to a `.gitignore`.