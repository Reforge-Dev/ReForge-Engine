---
inclusion: fileMatch
fileMatchPattern: "engine/src/behaviors/**"
---

# Adding a behavior

A behavior is an **event**, **condition**, **action**, **component** or **widget**. The registry is the single source of truth. The editor, validator, manifest and `docs/behaviors.md` are all generated from it. Format: `docs/CONTRACT.md` §7.

## Steps (do them in this order)

1. **Check genericity.** The name and params must make sense for any game. No game-specific words.
2. **Register** in `engine/src/behaviors/<kind>/<name>.ts` with typed param descriptors:
   ```ts
   registry.registerAction({
     name: "addVar",
     label: "Add to variable",
     params: [
       { name: "var", label: "Variable", type: "variable", required: true },
       { name: "by", label: "Amount", type: "number", required: true, default: 1 },
     ],
     run: (ctx, p) => ctx.setVar(p.var, ctx.getVar(p.var) + p.by),
   });
   ```
   Param `type` is one of: number, string, boolean, select, color, entityType, tag, variable, scene, asset, target. Add `help` text, plus `min`/`max` for numbers and `options` for select/target.
3. **Implement** as a pure function of `(state, params)` returning new state or a list of effects. Use `ctx.rng` for randomness. Never read the clock.
4. **Unit test** in `<name>.test.ts`: normal case, edge cases, bad params.
5. **Property test** in `<name>.prop.test.ts` where an invariant exists (inverse restores state, deterministic for a seed, result stays in bounds).
6. **Regenerate** the manifest and docs (`pnpm -F engine gen`). Commit the regenerated `docs/behaviors.md`.
7. **Update `docs/CONTRACT.md` only if the public catalog (§2) changes.** Additive only. Propose the change to the user first. All three owners approve.
8. Run `pnpm typecheck && pnpm lint && pnpm test`.

## Checklist

- [ ] Registered with every param described (label, type, required, default).
- [ ] No `any`, no globals, no `Math.random`, no `Date.now`.
- [ ] Tests pass, manifest regenerated.
- [ ] Nothing game-specific.
- [ ] If it affects the editor or a game repo, tell the user so they can notify Andrew or Rakhmonjon.