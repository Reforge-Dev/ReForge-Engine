---
inclusion: fileMatch
fileMatchPattern: "editor/**"
---

# ReForge editor

Andrew owns `editor/` and authors the Dungeon game in its own repository using the editor. Follow `docs/CONTRACT.md` for the format and integration boundaries and `docs/PLAN.md` for ownership and scope. Raise contract gaps with the team before coding around them.

- Use React, strict TypeScript, and Vite. Keep the interface lightweight and use CSS variables for the shared theme.
- Treat the contract's `game.json` object as the document. Apply pure editing commands and group undo/redo history by gesture. Keep transient UI state outside the exported game, with only optional UI preferences under `editor`.
- Build the component, event, condition, action, and widget controls from the published behavior manifest. Until a release is available, use a contract-shaped fixture under `editor/fixtures/`.
- Validate every document change with the engine validator when available and show errors beside the affected fields and rules.
- Use the engine's `createGame()` API for embedded Play. Use a lightweight editor canvas for authoring.
- Keep the editor app and fixtures under `editor/`. Engine implementation belongs to Muhammad. Author Dungeon as game data plus assets and the agreed bootstrap.
- Review requirements, design, and tasks in order before implementation. Track what was actually done with Kiro in `KIRO_LOG.md` after each phase.
- After each meaningful change, run the relevant checks, make a focused commit, and push the working branch for review.
- Keep canvas input, editor UI state, and document commands behind clear module boundaries. Use composition and encapsulation. Keep the game document plain JSON and document changes in pure commands, as required by the editor spec.
