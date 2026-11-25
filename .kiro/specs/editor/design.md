# ReForge visual editor design

**Status:** Draft for review before task planning.

## Workspace

Use React, strict TypeScript, and Vite in `editor/`. The top bar contains New, Open, Save, Export, and Play. The entity palette is on the left, the scene canvas and scene tabs are in the middle, the inspector is on the right, and the rule builder is below. Variables and UI widgets get their own panels. Use CSS variables for the shared theme and keep primary controls reachable by keyboard.

| Area | Responsibility |
| --- | --- |
| `editor/src/document/` | Contract-shaped document types, pure editing commands, history, validation paths |
| `editor/src/scene/` | Editing canvas, camera, grid, hit testing, selection, drag preview |
| `editor/src/manifest/` | Parse the published behavior manifest and render parameter controls |
| `editor/src/panels/` | Palette, inspector, scenes, rule builder, variables, widgets |
| `editor/src/io/` | Open, save, recovery, asset references and export |
| `editor/src/runtime/` | Adapter for the released validator and embedded `createGame()` |
| `editor/fixtures/` | Contract-shaped sample games and a sample manifest while releases are pending |

## Document and editing flow

The editable document is `game.json` as defined in Contract §1. Scenes hold entity instances, and `entityTypes` holds reusable type defaults. Preserve fields the editor does not currently expose. Keep selection, active tools, transient drag coordinates, and history in session state. Write optional editor preferences only under the contract-approved `editor` key.

Use a reducer with Immer patches for document edits. Commands receive the current document and explicit arguments. Pointer motion updates the drag preview, then pointer release commits one move command and one undo entry. Undo and redo use inverse and forward patches. Opening a document resets its session history. Validate document changes, including undo and redo, through the validation adapter and associate returned paths with the corresponding fields or rules.

The editing canvas transforms pointer coordinates into scene coordinates before snapping or hit testing. Its camera is independent of gameplay. Start with rectangles for entity bounds, then use available sprite assets for the authoring view. Store scene coordinates and keep pan and zoom out of gameplay data.

## Behavior forms and play

Load descriptors from `behaviors.manifest.json` (Contract §7). Map descriptor types to reusable inputs. Source entity type, tag, variable, scene, and asset choices from the current document and asset workspace. Use the same descriptor controls for components, rule events, conditions, actions, and widgets. A manifest update must expose newly registered behaviors without editing React components.

Use a clearly identified sample manifest and contract-shaped fixtures until the release is available. Keep validator wiring behind the runtime adapter. Confirm how the release exports `validateGame()` before relying on its import path, and confirm the contract representation for disabled rules before exporting that state.

Play mounts a separate canvas and passes a snapshot of the current document to the released `createGame()`. Use public methods for Start, Stop, Restart, and scene selection. Subscribe to runtime errors and release subscriptions and engine resources when the panel closes or a new session starts. Keep the editing canvas available without a runtime release.

## Files and assets

Open and save JSON using browser file access where available, with upload and download as the fallback. Keep asset references relative to the game folder. Hold imported asset bytes in the editor workspace and bundle them with `game.json` on export when direct folder access is unavailable. Autosave a recoverable draft locally and offer recovery before replacing an open document.

## What carries over from the prototype

| Prototype idea | Browser editor design |
| --- | --- |
| Clickable terrain thumbnails and hover names | Reuse the interaction in the entity and asset palette. A terrain prefab can use a registered sprite and, where needed, a solid collider. |
| Import texture artwork | Import files as assets and reference their relative paths in sprite properties. The prototype stores raw image data inside its own map format. |
| Spawn and additional players | Place player entity instances using supported components. Any additional input assignment or player joining depends on the engine's public behaviors. |
| Saved rooms | Use scenes for separate rooms. Reusable groups and stamp rotation are candidates for a later authoring feature that expands into ordinary entity placements. |
| Elevation brushes and green walkable outlines | Keep the visual ideas as prototype references. Use contract-supported solid colliders for movement boundaries in the first playable slice. Request a generic behavior if a game needs true elevation or walkable-region rules. |

The Tkinter and Pygame prototype stays on `andrew`. It demonstrated authoring interactions and playtesting. The production editor targets the browser and uses the shared engine contract, so its runtime, save format, and widget code are implemented in the editor checkout.

## First slice and checks

1. Open a contract-shaped sample game and render its active scene.
2. Drag one entity, commit the new coordinates, and verify undo and redo.
3. Save and reopen the result with the same data apart from the intended edit.

Cover coordinate transforms, command history, manifest defaults, and save/load round trips. Use fast-check for edit sequences, undo/redo, and manifest-driven defaults. Verify embedded Play separately with the released engine and Dungeon content authored in the editor.
