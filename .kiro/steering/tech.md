---
inclusion: always
---

# Tech

## Stack

- TypeScript (strict), Vite library mode, pnpm workspace (`engine`, `editor`).
- Rendering: Canvas 2D for the world, DOM overlay for UI widgets.
- Tests: Vitest + fast-check. Lint: ESLint (typescript-eslint strict) + Prettier.
- Zero runtime dependencies in the engine. Dev dependencies only.

## Commands

- `pnpm dev`: serve `examples/hello`.
- `pnpm build`: engine bundles into `engine/dist/`.
- `pnpm test`: Vitest, all packages. `pnpm -F engine test` for the engine only.
- `pnpm typecheck`, `pnpm lint`, `pnpm format`.

## Code style

- No `any`. Use `unknown` and narrow it. No non-null `!` unless an invariant is commented.
- Rules, state transitions and validation are **pure functions**: input in, new value out. Side effects live at the edges (`io/`, `ui/`, the renderer).
- No module-level mutable state. No globals. Pass dependencies in.
- No `Math.random()`. All randomness goes through the seeded RNG (mulberry32), whose state is serializable.
- No `Date.now()`, `performance.now()` or timers inside simulation code. Simulation time is the tick count (fixed 60 Hz step). Only the loop driver reads the real clock.
- No `console.log`. Use the `error` event or the debug overlay.
- No TODO without a linked issue number.
- Plain JSON-serializable state so it can be compared with `toEqual` and saved.
- Naming: `kebab-case` ids in game data, `camelCase` in code, `PascalCase` types.

## Budgets and support

- Engine core bundle: under **60 KB gzip**. Check after each feature.
- Browsers: latest Chrome, Firefox, Safari.
- Target 60 fps with a few hundred entities.

## Commits

Small commits, plain imperative messages ("Add world query by tag"). No attribution trailers. Never add `.kiro` to any `.gitignore`.