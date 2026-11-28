---
inclusion: always
---

# Repo structure

```
ReForge-Engine/
├── .kiro/            specs/ steering/ hooks/  (committed, never ignored)
├── docs/             PLAN.md, CONTRACT.md (source of truth), behaviors.md (generated), handoff/
├── engine/           runtime (owner: Muhammad)
├── editor/           React editor (owner: Andrew). Do not touch.
├── examples/         hello/ (game.json + index.html), ghost-catcher/
├── scripts/          sync-games.sh, check-submission.sh
├── dungeon-crawler/  synced from ReForge-Dungeon. NEVER edit.
└── cyberops/         synced from ReForge-CyberOps. NEVER edit.
```

## engine/src

| Folder       | Contains                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`   | Shared types (`Json`, `Entity`, `InputFrame`, `Param`, `RenderState`, `UiHost`). Imports nothing.                                                    |
| `core/`      | `sim.ts` (Simulation: scenes, tick, timers, movers, AI, collisions), `world.ts`, `geometry.ts`, `rng.ts`, `registry.ts`, `json.ts`, `game.ts` (loop). |
| `rules/`     | `expr.ts` (`$` references, `{name}` text, target matching) and `types.ts` (Event/Condition/Action defs, `Scope`).                                    |
| `behaviors/` | `events.ts`, `conditions.ts`, `actions.ts`, `components.ts`: arrays of definitions. `index.ts` builds the registry.                                   |
| `ui/`        | DOM widgets (`widgets.ts`, `mount.ts`), widget definitions (`defs.ts`), `reforge-engine.css`.                                                        |
| `io/`        | Impure edges: `assets.ts`, `input.ts`, `renderer.ts`, `draw.ts`, `transform.ts`.                                                                     |
| `schema/`    | `types.ts`, `validate.ts` (`validateGame`), `jsonschema.ts`, `shared.ts` (required keys). Needs all three owners to approve changes.                 |
| `index.ts`   | Public API: `createGame`, `createSimulation`, `validateGame`, `registry`, `gameSchema`.                                                              |

`engine/scripts/`: `gen.ts` (manifest, schema, `docs/behaviors.md`), `docs.ts` (pure docs renderer), `check-size.mjs` (60 KB gzip gate), `validate-game.ts`, `hook-run.mjs` (used by `.kiro/hooks`).

Tests sit next to the code: `*.test.ts` for examples, `*.prop.test.ts` for fast-check properties.

## Dependency direction

Everything may import `types.ts`. `ui`, `io` and `schema` import nothing else. `core/sim` uses `rules`, `core/*`. `behaviors` uses `core`, `rules`, `ui` (widget defs). `core/game.ts` wires `sim`, `io`, `ui` and `schema`. Only `index.ts` is public. The one cycle (`rules/types` imports the `Simulation` type) is type-only.

## Generated files (never hand-edit)

`engine/dist/*`, `docs/behaviors.md`. Regenerate with `pnpm -F engine gen`.