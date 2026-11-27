# Handoff: engine v0.1.0

Engine release: https://github.com/Reforge-Dev/ReForge-Engine/releases/tag/v0.1.0
Behavior reference (generated): `docs/behaviors.md`. Contract additions: `docs/CONTRACT.md` §8.

## Andrew (editor + Dungeon)

Answers to the open questions in `.kiro/specs/editor/requirements.md`:

- **Validation:** the engine exports `validateGame(json): { ok, errors: [{ path, message }] }` (structure only). Behavior and field names are validated by the registry; use `behaviors.manifest.json` to check them in the editor.
- **Disabled rules:** a rule has an optional `"enabled": false`. Missing or `true` means on. The engine skips disabled rules.
- **Manifest:** release asset `behaviors.manifest.json` (CONTRACT §7). Every param has `name, label, type, required, default?, min?, max?, options?, help?`. Param types are exactly the ones in §7. A few params hold free-form JSON (`setVar.value`, `setProp.value`, `startTimer.data`, `log.lines`): render them as a text box that accepts a number, text, true/false or a `$reference`.
- **Play:** `createGame(gameJson, canvas, { assetBase, seed, debug })` returns `{ start, stop, restart, destroy, setScene, getState, on, off }`. `on("error", cb)` carries `{ code, message, path? }`. Put the canvas inside a positioned wrapper; the engine adds the DOM widgets next to it (`.rf-root`). Call `destroy()` when the panel closes.
- **Scene coordinates are pixels, entity x/y is the center of the thing.**
- **Ghost Catcher:** use `collide`, `timer`, `varChanged`, `spawn`, `addVar`, `destroy`, `showText` and a `text` / `bar` widget. If anything is missing, open an `engine-gap` issue.

## Rakhmonjon (CyberOps)

`cyberops/game.json` on `feat/cyberops-game` validates and runs on the engine with no errors. What it was missing was rules, so the title button, response buttons, timers and penalties did nothing. `docs/handoff/cyberops-game.full.json` is your file plus the missing rules (24 rules total), generated and played headlessly:

- A perfect player (always clears the right node with the right response) **wins** 6 of 6 seeds, finishing with breach 23 to 78. The budget runs out near the end, so it is tight but fair.
- An idle player **loses** 5 of 6 seeds. One seed survives at breach 98, so early pressure is a little low. Tune `breachPerSec`, the spawn timer (14 s) or the first spawn.

What the added rules do (all of it is data, no code):

| Rule | What it does |
|---|---|
| `open-briefing` | Title button goes to the briefing. |
| `start-clocks` | On Begin shift, starts the 1 s clock and the 14 s spawn timer. |
| `spawn-next-haunting` / `-late` | Weighted spawn, at most 2 open before 56 s and 3 after (`maxActive`). |
| `clock-and-breach` | Each second: clock +1; every open haunting that is not lost and not being answered adds its `breachPerSec`. This is "pause the meter while a response runs". |
| `haunting-opened` | On the `spawned` signal: status haunted, log the alert plus one log variant, start `slow` and `fail` timers on that node. |
| `haunting-spreads` / `haunting-lost` | The slow and fail penalties from the row; lost nodes turn red and lose 10 uptime. |
| `select-node` | Clicking a node selects it. |
| `respond-<id>` and `respond-<id>-refused` | One pair per response: spend budget and start the `respond` timer on the selected node, or refuse when the budget is short. |
| `respond-correct` / `respond-wrong` | Compare `$timer.answer` with the row's `correct`. Correct clears the node and drops breach by 5; wrong adds the wrong penalty. |

Things to know:

- **Positions are pixels.** Your node `x`/`y` are 18 to 84 in a 960 x 540 scene, so on screen they would bunch in the top-left corner. Multiply by 9.6 (x) and 5.4 (y), or tell me and I will add percent units.
- **Entity ids, `name`, `kind`, `links`** on instances are supported (they become entity props). `kind` is not drawn yet.
- **The report modal** is open by default in its scene; it only shows the counters in `table`. Add a `win` / `lose` headline with a `text` widget if you want one.
- **Responses are `click` targets** by button id. Your buttons already use those ids.
- Everything in `$self.row.*` is the incident row stored on the node when it was haunted.

## Everyone

- Vendor the engine into a game repo with `node scripts/update-engine.mjs v0.1.0`.
- Record real Kiro use in `KIRO_LOG.md` as you go (specs, steering, hooks), with a screenshot.
