# ReForge Contract v0

This is the agreement between the engine, the editor, and both games. **Frozen on Day 1 (Mon Nov 23).**
Additive changes are fine. Breaking changes need a PR approved by all three members.

A game is **data**: `game.json` (+ assets). Game repos contain no custom engine code.
If a game needs a capability the engine lacks, open an issue labeled `engine-gap`; the engine owner adds it as a **generic** behavior.

## 1. `game.json`

```jsonc
{
  "meta":      { "title": "Crypt of the Reforged", "version": 1, "startScene": "room1", "theme": "crypt" },
  "variables": { "hp": 10, "keys": 0 },
  "entityTypes": {
    "player": {
      "tags": ["player"],
      "components": {
        "sprite":   { "image": "assets/hero.png", "w": 16, "h": 16 },
        "collider": { "w": 12, "h": 12 },
        "health":   { "max": 10 },
        "mover":    { "mode": "topdown", "speed": 90 }
      }
    }
  },
  "scenes": [
    { "id": "room1", "size": [320, 240], "entities": [ { "type": "player", "x": 40, "y": 40 } ] }
  ],
  "rules": [
    {
      "id": "pickup-key",
      "when": { "event": "collide", "a": "player", "b": "key" },
      "if":   [ { "cond": "varLt", "var": "keys", "value": 3 } ],
      "then": [
        { "do": "addVar", "var": "keys", "by": 1 },
        { "do": "destroy", "target": "other" },
        { "do": "showText", "text": "You found a rusty key." }
      ]
    }
  ],
  "ui": [ { "widget": "bar", "var": "hp", "max": 10, "label": "HP", "pos": "top-left" } ]
}
```

## 2. Behavior catalog v1

| Kind | Names |
|---|---|
| **Events** (`when`) | `start`, `tick`, `key`, `click`, `collide`, `enterScene`, `timer`, `varChanged`, `died`, `custom` |
| **Conditions** (`if`) | `varEq`, `varLt`, `varGt`, `hasItem`, `tagNear`, `random`, `inScene`, `entityCount`, `timerRunning` |
| **Actions** (`then`) | `setVar`, `addVar`, `spawn`, `spawnFromTable`, `destroy`, `damage`, `heal`, `giveItem`, `move`, `setProp`, `showText`, `openPanel`, `closePanel`, `log`, `playSound`, `changeScene`, `startTimer`, `emit`, `win`, `lose` |
| **Components** | `sprite`, `shape`, `collider`, `health`, `mover` (topdown), `ai` (chase / patrol / flee), `inventory`, `node` (graph node with links), `label`, `tags` |
| **UI widgets** | `text`, `bar`, `button`, `panel`, `list` / `log`, `table`, `modal` |

Every behavior is registered in the engine's **registry** with typed parameter descriptors.
The registry is the single source of truth: the editor's dropdowns, the validator, `behaviors.manifest.json`, and `docs/behaviors.md` are all generated from it.

## 3. Engine public API

```ts
import { createGame } from "./vendor/reforge-engine.js";

const game = createGame(gameJson, canvasElement, { assetBase: "./", seed: 1234 });
game.start();  game.stop();  game.restart();
game.setScene("room2");  game.getState();  game.on("win", cb);  game.on("lose", cb);
```

The editor's Play button and both games use **only** this API.

## 4. Engine release artifacts

Each engine release (git tag `vX.Y.Z` → GitHub Release) attaches:

| Asset | Purpose |
|---|---|
| `reforge-engine.js` | Single-file ES module bundle (runtime + rules + UI widgets) |
| `reforge-engine.css` | Default widget styles; games re-skin via CSS variables |
| `behaviors.manifest.json` | Generated from the registry; consumed by the editor |
| `game.schema.json` | JSON Schema for `game.json` |

Game repos pull a release into `vendor/` with `node scripts/update-engine.mjs vX.Y.Z`.
No npm account and no build step are needed in game repos.

## 5. Game repo layout

```
index.html        # <canvas> + 3-line bootstrap that calls createGame
game.json         # the whole game
assets/           # CC0 art/audio (credit in assets/CREDITS.md)
theme.css         # CSS variable overrides only
vendor/           # reforge-engine.js/.css pinned by vendor/VERSION
scripts/update-engine.mjs
.kiro/            # specs, steering, hooks used while building this game
```

## 6. Naming

- Entity type ids, tags, variable ids, rule ids, scene ids: `kebab-case` (variables may be `camelCase`; pick one per game and stay consistent).
- Asset paths are relative to the game folder.
