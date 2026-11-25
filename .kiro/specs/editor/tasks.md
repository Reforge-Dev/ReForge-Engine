# ReForge visual editor tasks

**Status:** Implementation in progress. See [requirements](requirements.md) and [design](design.md). Work in `editor/` on `feat/editor-shell`. Use contract-shaped fixtures until the relevant engine release is available.

## First working slice

- [x] **1. Open and display a sample game** (E1, E7, E12). Set up the React, strict TypeScript, Vite, and Vitest workspace. Add a Contract §1 sample game and minimal document-loading checks. Build the editor shell and draw the active scene with a grid and entity rectangles. **Check:** Open an uploaded `game.json` and see its entities. A malformed file shows an inline error and preserves the open document.
- [x] **2. Drag one entity and track the edit** (E2, E8, E12). Convert pointer positions to scene coordinates, preview the drag, and commit one pure move command per gesture with Immer patches. Add undo and redo for the move. **Check:** Drag an entity, then undo and redo. Only that instance's coordinates change, and one drag produces one undo entry.
- [x] **3. Save and reopen the edited game** (E7). Add JSON download and upload round-trip support. Preserve contract fields the editor does not expose. **Check:** Download the edited document, reopen it, and compare it to the prior document with only the intended coordinate change. Add a fast-check round-trip property.

## Authoring tools

- [x] **4. Complete scene editing** (E1, E2, E8, E11). Add scene tabs, scene add and rename, pan and zoom, snap toggle, palette placement, marquee and multi-select, delete, duplicate, layer ordering, and keyboard nudges. **Check:** Edit several entities across two scenes using mouse and keyboard. Verify undo/redo across command types and measure panning against the 500-entity target.
- [ ] **5. Build the manifest-driven inspector and prefab palette** (E3, E4). Load the sample manifest under `editor/fixtures/` and render every Contract §7 parameter type with reusable controls. Edit prefab defaults, tags, components, and per-instance overrides. **Check:** Add a component descriptor to the fixture and use it without editing React code. Property-test valid defaults for each parameter type.
- [ ] **6. Connect validation and field errors** (E12). Confirm the engine validator export with Muhammad and wire it through the runtime adapter when available. Validate committed changes, undo, and redo. Associate reported paths with their fields and rules. **Check:** An invalid value produces a field-level error that clears when corrected. Property-test random edit sequences for valid output or surfaced errors without crashes.
- [ ] **7. Build the rule editor** (E5). Generate WHEN, IF, and THEN controls from the manifest. Add, remove, reorder, and duplicate rules and their clauses. Add plain-English previews and inline validation. Confirm disabled-rule serialization before shipping enable/disable. **Check:** Build a pickup rule in the UI and inspect the saved rule against the contract.
- [ ] **8. Add variables and UI widgets** (E6). Edit document variables and generate widget forms from the manifest. **Check:** Create an HP variable and a linked bar, then save and reopen the document.
- [ ] **9. Complete asset and file workflows** (E7). Add browser file access where supported, drag-and-drop asset import with relative paths, ZIP fallback, and local draft recovery. **Check:** Import a sprite, save or export the game with its asset, reopen it, and verify recovery after a reload.

## Play and demo

- [ ] **10. Embed the released engine** (E9). Use published engine artifacts and `createGame()` for Play, Stop, Restart, debug mode, and play from this scene. Surface runtime errors and clean up listeners and engine resources. **Check:** Run a sample game, switch scenes, restart, and close the panel without duplicate listeners or a running loop.
- [ ] **11. Add starter templates and check accessibility** (E10, E11). Provide Blank, Top-down, and Click-and-manage starters. Check keyboard navigation, WCAG AA contrast, and panning performance. **Check:** A first-time user can load and play a starter within 30 seconds.
- [ ] **12. Prove the workflow with Dungeon and Ghost Catcher** (E9, E10). Author Dungeon through the editor in `ReForge-Dungeon`. Build Ghost Catcher through the editor using existing behaviors and save the example under `examples/ghost-catcher/`. Record contract gaps for team review and check that the example requires no engine changes. **Check:** Both games load through the public runtime and can reach their intended end states. Verify the deployed editor and Dungeon on a second device when available.

Run the relevant checks after each task. Commit focused changes and push the working branch. After each completed Kiro phase, record what actually happened in `KIRO_LOG.md` and capture the screenshot called for in the team plan.
