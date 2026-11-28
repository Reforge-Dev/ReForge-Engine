---
inclusion: always
---

# Product: ReForge

ReForge is a small, generic 2D game engine plus a visual editor. A game is **data**: a `game.json` file plus assets. The format is defined in `docs/CONTRACT.md`, which is the source of truth.

## The three apps

1. **Dungeon** (`ReForge-Dungeon`, synced to `dungeon-crawler/`): top-down dungeon crawler. Movement, enemies with AI, combat, keys and doors, items, boss, win/lose.
2. **CyberOps** (`ReForge-CyberOps`, synced to `cyberops/`): click-driven incident-response management sim on a network graph. Timers, spawn tables, logs, panels, meters.
3. **Ghost Catcher** (`examples/ghost-catcher/`): third game, built live in the editor using only existing behaviors. `git diff engine/` for that work must be empty.

## The RULE

**Games are data.** No custom code in game repos beyond the 3-line `createGame` bootstrap. If a game needs something the engine lacks, it becomes a **generic engine behavior** (event, condition, action, component or widget) registered in the registry. Never add a special case for one game.

Test for genericity: could a game that is not a dungeon or a network sim use this behavior with different data? If not, redesign it.

## Who uses the engine

- Games and the editor use only the public API: `createGame(gameJson, canvas, opts)`.
- The editor builds its forms from `behaviors.manifest.json`, which is generated from the registry. It never hard-codes behaviors.

## Non-goals

- No 3D.
- No networking or multiplayer.
- No physics engine beyond AABB overlap and axis-separated collision resolution.
- No runtime dependencies in the engine.
- No game-specific words in engine code or tests (no "dungeon", "ghost", "key", "network").

## Constraints

- Contract changes are additive only. Propose any change before making it.
- Hard deadline: Dec 4 2026 2PM PT. Feature freeze: Nov 29.