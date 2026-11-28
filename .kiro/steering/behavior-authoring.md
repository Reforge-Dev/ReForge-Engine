---
inclusion: fileMatch
fileMatchPattern: "engine/src/behaviors/**"
---

# Adding a behavior

A behavior is an **event**, **condition**, **action**, **component** or **widget**. **Adding a behavior is one registry entry.** The manifest, `game.schema.json` docs, `docs/behaviors.md` and the editor forms are generated from the registry. Format: `docs/CONTRACT.md` section 7.

## Steps

1. **Genericity.** Could a game that is not a dungeon or a network sim use it? No game words in names or params.
2. **Add one entry** to the array in `behaviors/events.ts`, `conditions.ts`, `actions.ts` or `components.ts` (widgets: `ui/defs.ts`). Build params with `param(name, label, type, extra)` from `behaviors/util.ts`:
   ```ts
   {
     name: "addVar",
     label: "Add to variable",
     params: [
       param("var", "Variable", "variable", { required: true }),
       param("by", "Amount", "number", { required: true, default: 1 }),
     ],
     run: (sim, p, scope) => sim.setVar(str(p["var"]), num(sim.getVar(str(p["var"])), 0) + num(p["by"], 0)),
   }
   ```
   Param types: number, string, boolean, select, color, entityType, tag, variable, scene, asset, target. Give `help`, `default`, `min`/`max`, `options` (select).
3. **Implement through the `Simulation` API** (`sim.setVar`, `sim.spawn`, `sim.targets`, `sim.rng`, `sim.error`). Never read the clock or `Math.random`.
4. **Test.** Example test in `core/sim.test.ts` using `createSimulation`. Add `*.prop.test.ts` when an invariant exists.
5. **Regenerate**: `pnpm -F engine gen`, then `git add docs/behaviors.md`. The save hook and `manifest.prop.test.ts` fail if it is stale.
6. **CONTRACT.** Only if the public catalog (section 2) changes. Additive, proposed to the user first. Note it in section 8.

## Rules semantics your behavior can rely on

- **`$` references** are resolved before `run`/`test` is called: `$var.x`, `$self.f`, `$other.f`, `$selected.f`, `$timer.k`, `$tick`, `$scene`. Params arrive as plain values. Unresolved references arrive as `null`.
- **`not: true`** on a condition is applied by the interpreter. Do not implement negation inside a condition.
- **Targets** (`self`, `other`, `selected`, an id, a type, `tag:x`, a bare tag): call `sim.targets(p["target"] ?? "self", scope)`. Use param type `target`.
- Nested lists (`forEach` with `then` and `if`) are not resolved by the outer action. Call `sim.conditionsPass` and `sim.runActions`.
- Events return a `Scope` or `null` from `matches`. Queue new events with `sim.emit`.
- A component def is metadata and defaults only. A component that needs per-tick behavior needs a system in `core/sim.ts`, so keep that generic.
- Removing entities: use `sim.destroy(e)`. It is deferred to the end of the tick.

## Checklist

- [ ] One registry entry, every param labeled, typed, with defaults.
- [ ] No `any`, globals, `Math.random`, `Date.now`.
- [ ] Tests pass and `docs/behaviors.md` is regenerated and staged.
- [ ] Nothing game-specific.
- [ ] If it affects the editor or a game repo, tell the user so they can notify Andrew or Rakhmonjon.