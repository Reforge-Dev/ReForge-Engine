# Tasks: engine-core

`[x]` means shipped in v0.1.0 (the commit is named). `[ ]` means open. The shipped tasks were implemented outside Kiro, before this spec was reconciled. Requirement numbers point to `requirements.md`. Property ids (P1..P8) point to `design.md` section 8.

Shipped commits:

- `319403a` Add game schema validator, bundle build, release workflow and hello example
- `dd228bf` Add canvas renderer, input, asset loader and DOM widgets
- `7b79d56` Add simulation, rules engine, behaviors registry and createGame; release 0.1.0 contract notes
- `f7a13c4` Add handoff notes and a runnable CyberOps rule set

## Shipped

- [x] **T1 Workspace, lint, CI.** `fa35b2c`. R12, R14. Files: `package.json`, `eslint.config.js`, `.github/workflows/ci.yml`.
- [x] **T2 Schema types, validator, JSON Schema.** `319403a`. R10. Files: `engine/src/schema/*`. Tests: `validate.test.ts`, `validate.prop.test.ts` (P8).
- [x] **T3 Seeded RNG.** `7b79d56`. R3. File: `core/rng.ts`.
- [x] **T4 World and geometry.** `7b79d56`. R4, R9. Files: `core/world.ts`, `core/geometry.ts`.
- [x] **T5 Simulation: scenes, spawn, tick order, timers, movers, AI, collisions, health.** `7b79d56`. R2, R5, R9, R17. File: `core/sim.ts`. Tests: `sim.test.ts`.
- [x] **T6 Rules engine and `$` references.** `7b79d56`. R15. Files: `rules/expr.ts`, `rules/types.ts`, `sim.dispatch`.
- [x] **T7 Registry and the full behavior catalog.** `7b79d56`. R11, R16. Files: `core/registry.ts`, `behaviors/*`.
- [x] **T8 Asset loader, input, renderer.** `dd228bf`. R6, R7, R8. Files: `io/*`. Tests: `assets.test.ts`, `input.test.ts`, `renderer.test.ts`.
- [x] **T9 DOM widgets and UI host.** `dd228bf`. R18. Files: `ui/*`. Tests: `ui.test.ts`, `safety.test.ts`.
- [x] **T10 Tables and `spawnFromTable`.** `7b79d56`. R19. File: `behaviors/actions.ts`. Test: `sim.test.ts` "never puts two rows on one host".
- [x] **T11 `createGame` and `createSimulation`, game events.** `7b79d56`. R1, R20. Files: `core/game.ts`, `index.ts`.
- [x] **T12 Build, manifest, schema and docs generation, size gate.** `319403a`. R12, R16. Files: `vite.config.ts`, `scripts/gen.ts`, `scripts/check-size.mjs`.
- [x] **T13 Release workflow.** `319403a`. R12.4, R12.5. File: `.github/workflows/release.yml`.
- [x] **T14 Example `hello`.** `319403a`. R13. Dir: `examples/hello/`.
- [x] **T15 Handoff notes and runnable CyberOps rule set.** `f7a13c4`. Dir: `docs/handoff/`.

## Open

### Decisions that need an answer

- [ ] **T16 Draw order.** R8.2. The brief says array order. The renderer sorts by layer, y, id. Pick one:
  - (a) Keep layer, y, id. Andrew's "Bring front" and "Send back" then need to set `layer` (editor change).
  - (b) Draw in array order within a layer, dropping the y sort. Smallest change: replace `a.y - b.y` in `sortForDraw` and `entityAt` with the array index. Breaks the y-sorted look for top-down games unless authors use `layer`.
  - (c) Array order within a layer by default; y-sort only when `meta.ySort: true` (additive).
  - Recommendation: (c). Waiting for the owner's answer. No code change made.

- [ ] **T17 Percent positions.** CyberOps authored 18 to 84 in a 960 by 540 scene. Smallest additive design:
  - **Proposal A (recommended):** optional `scene.units: "px" | "percent"`, default `"px"`. With `"percent"`, an instance's `x` and `y` are percentages of the scene size (0 to 100) and are converted once in `spawnInstance` (`x * size[0] / 100`). Component sizes stay in pixels. The `spawn` action is unchanged (pixels). Cost: about 6 lines in `sim.ts`, one key in the validator and schema, one line in CONTRACT Â§8, one `select` in the editor's scene form.
  - Proposal B: per-instance `xPct` and `yPct` keys. Mixed units per entity, more keys, more places to look.
  - Proposal C: a `$scale` reference or helper. Needs code in the game repo or a new reference type, and fits poorly with static JSON.
  - Needs an answer before any code. CONTRACT Â§8 is shared, so the owner posts it for Andrew and Rakhmonjon.

- [x] **T18 `kind` on instances.** R8.9. Decision: metadata only. It is stored in `props.kind`, readable as `$self.kind`, and never drawn. A visible label is already available through the `label` component. Reason: drawing it would add a game-specific styling rule to the renderer. Still open: one sentence in CONTRACT Â§8 ("`kind` is not drawn"). Needs the owner's approval because CONTRACT is shared.

### Property tests (Kiro session, step 4)

- [x] **T19 P1 determinism.** R2.7. `core/sim.prop.test.ts`.
- [x] **T20 P2, P3 world ids and pending removal.** R4. `core/world.prop.test.ts`. Found a real bug (generated id repeated a removed id); fixed in the commit that adds this test.
- [x] **T21 P4, P5 collision.** R9. `core/geometry.prop.test.ts`.
- [x] **T22 P6 validator mutations.** R10. `schema/mutation.prop.test.ts`.
- [x] **T23 P7 manifest and docs freshness.** R16. `behaviors/manifest.prop.test.ts`, `scripts/docs.ts`.

### Remaining engine work

- [ ] **T24 Coverage gaps in `sim.test.ts`.** R9.5, R9.12, R7.5, R18.4, R17.8. Add: collision enter fires once and again after separating; `damage` to 0 queues `died` once; camera follow clamps to the scene; `openPanel` and `closePanel` change `getState().open`; `selectEntity` marks, replaces and clears on destroy.
- [ ] **T25 Performance benchmark.** R14.4. `engine/scripts/bench.ts`, run with `pnpm -F engine bench`, no new runtime dependency. 500 entities (movers, colliders, a rule on `tick`), 60 ticks, report the worst and mean ms per tick. Target: under 16 ms per tick on a laptop.
- [ ] **T26 Lint script in the engine package.** R12.4. `pnpm -r lint` currently finds no script; lint only runs from the root. Add `"lint"` to `engine/package.json` or change the gate to `pnpm lint`.

### Kiro tooling (this session)

- [x] **T27 Hooks.** `.kiro/hooks/`: generated-docs check on behavior saves, typecheck and lint on `.ts` saves, validate `game.json` on save.
- [x] **T28 Steering update.** `structure.md`, `tech.md`, `behavior-authoring.md`.
- [x] **T29 `KIRO_LOG.md` entry.**
