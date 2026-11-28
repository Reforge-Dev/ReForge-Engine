---
inclusion: always
---

# Repo structure

```
ReForge-Engine/
├── .kiro/            specs/ steering/ hooks/ agents/  (committed, never ignored)
├── docs/             PLAN.md, CONTRACT.md (source of truth), behaviors.md (generated)
├── engine/           runtime (owner: Muhammad)
├── editor/           React editor (owner: Andrew). Do not touch.
├── examples/         hello/, ghost-catcher/ (game.json + index.html)
├── scripts/          sync-games.sh, check-submission.sh
├── dungeon-crawler/  synced from ReForge-Dungeon. NEVER edit.
└── cyberops/         synced from ReForge-CyberOps. NEVER edit.
```

## engine/src

| Folder       | Contains                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/`      | Game loop (fixed timestep), seeded RNG, world/entities, scenes, input, camera, public `createGame`, registry. Nothing here knows about specific behaviors.       |
| `rules/`     | Event bus, when/if/then interpreter, variables store. Pure functions over state.                                                                                 |
| `behaviors/` | One file per behavior (event, condition, action, component). Each registers itself with typed param descriptors.                                                 |
| `ui/`        | DOM overlay widgets (text, bar, button, panel, list/log, table, modal) and `reforge-engine.css`.                                                                 |
| `schema/`    | TypeScript types mirroring CONTRACT §1, `validateGame`, JSON Schema generation. Changes need all three owners to approve.                                       |
| `io/`        | Impure edges: asset loader and cache, DOM/keyboard/mouse listeners, audio, canvas renderer glue.                                                                 |

Tests live next to the code as `*.test.ts`; property tests as `*.prop.test.ts`.

## Dependency direction

`schema` and `core` depend on nothing else. `rules` depends on `core` and `schema`. `behaviors` depends on `core`, `rules`, `schema`. `ui` and `io` depend on `core`. Only `index.ts` wires everything together. No cycles.

## Generated files (never hand-edit)

`dist/behaviors.manifest.json`, `dist/game.schema.json`, `docs/behaviors.md`.