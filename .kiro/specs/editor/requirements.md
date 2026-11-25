# ReForge visual editor requirements

**Status:** Draft for Andrew’s review. This is the requirements checkpoint.

The editor lets a non-programmer author a 2D game as `game.json` and play it through the shared engine. The contract and plan on `docs/team-plan` define the format and team ownership. Dungeon is authored through the editor and lives in its own repo. Ghost Catcher is the demonstration that existing behaviors can make a third game without changing the engine.

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| E1 | The editor shall provide an entity palette, scene canvas, inspector, rule builder, file and play controls, scene tabs, variables, and UI widgets. | A user can find all areas from the editor workspace. The canvas supports grid, pan, zoom, and snap. |
| E2 | When a user edits a scene, the editor shall apply a pure document command for placement, movement, duplication, deletion, or layer changes. | Drag from the palette into the scene. Move and edit selected entities with snap on or off, including marquee selection, arrow nudges, Delete, and Ctrl+D. |
| E3 | When an entity type or instance is selected, the inspector shall generate its fields from manifest descriptors. | Forms support number bounds, string, boolean, select, color, entity type, tag, variable, scene, asset, and target. Users can edit type defaults and instance overrides. An added descriptor appears without editor code changes. |
| E4 | When users create or edit a prefab, the editor shall let them configure its components and tags through the manifest. | A prefab can be placed more than once. Each instance can override supported properties without changing the prefab. |
| E5 | When users edit a rule, the editor shall show WHEN, IF, and THEN controls with manifest-driven fields and inline errors. | Rules can be added, removed, reordered, enabled or disabled, and duplicated. Conditions and actions support ordering, and each rule has a plain-English preview and validation status. Verify the disabled-rule encoding against the contract before exporting it. |
| E6 | The editor shall let users define variables and add or edit manifest-backed UI widgets. | A user can create a health variable, link it to a health bar, and add text without editing JSON by hand. |
| E7 | When users open, save, export, or import assets, the editor shall preserve contract-shaped data and relative asset references. | Load and save work with supported file access and upload/download fallback. Autosave offers recovery. Dragged-in assets can be exported with the game in a ZIP when directory access is unavailable. |
| E8 | When users undo or redo an edit, the editor shall restore the corresponding document state. | Ctrl+Z and redo shortcuts work across the current session, and one drag gesture produces one undo step. |
| E9 | When users press Play, the editor shall run the current game through the public `createGame()` API in an embedded panel. | Start, stop, restart, play from the current scene, debug mode, and an error console use the engine API. The editing canvas can show entity placeholders while a release is pending. |
| E10 | The editor shall offer Blank, Top-down, and Click-and-manage starter templates. | A first-time user can launch a playable starter within 30 seconds. The team can author Ghost Catcher using only the editor and existing behaviors. |
| E11 | The editor shall support keyboard navigation, WCAG AA contrast for interface text and controls, and smooth panning. | Core controls are keyboard-reachable, theme contrast is checked, and panning targets 60 fps with 500 entities. |
| E12 | When a document edit is applied, the editor shall validate the game and surface errors inline. | Invalid edits show field or rule feedback without crashing or opening a blocking modal. The released engine validator is used when available. |

## First working slice

The first three implementation tasks must let someone open a contract-shaped `game.json`, see its entities, drag one to a new position, then save and reopen the result. Use fixtures until the team publishes the engine release.

## Properties to verify

- Random edit sequences preserve valid documents or surface validation errors without crashing.
- Undo followed by redo restores the exact document. Applying a command and undoing it restores the previous document.
- Saving and loading a valid document preserves its game data.
- Valid manifest descriptors produce valid default form values for every supported parameter type.

## Contract questions to resolve before affected implementation

- Confirm how validation is exposed by the released engine. The kickoff requires `validateGame()`, while the public API section illustrates `createGame()`.
- Confirm the persisted representation for disabled rules and enabled state. The example rule in the contract does not define one.
- Confirm whether path brushes, terrain height, saved room stamps, or extra player placement belong in the first release. Any exported mechanics must use generic contract behaviors.
