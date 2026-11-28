# Requirements: engine-core

> **Status:** Requirements written before implementation; implementation landed in v0.1.0; this revision reconciles the spec with the shipped behavior. The spec did not drive the code. R1–R14 are the original requirements, edited where the shipped code differs. R15–R20 describe what was built beyond them.

Scope: the ReForge runtime: game loop, world, scenes, input, camera, renderer, components, rules, behaviors, DOM widgets, schema validation, registry, bundles, release, example.

Source of truth for the game format: `docs/CONTRACT.md` (§8 holds the additive v0.1 notes).

## Glossary

- **Engine**: the `engine/` package.
- **Game**: the object returned by `createGame`.
- **Simulation**: the DOM-free object (`createSimulation`) that holds the world, rules, timers and variables. The Game wraps one.
- **gameJson**: a parsed `game.json` object.
- **Tick**: one fixed simulation step of 1/60 s (`DT`). Simulation time is the tick count.
- **InputFrame**: input consumed by one tick (`down`, `pressed`, `released`, `mouse`, `clicks`).
- **Coordinates**: scene units are pixels. The origin is the top-left corner of the scene. An entity's `x, y` is the **center** of the thing, and a collider or sprite extends half its width and height around that point.
- **Scope**: the entities an event is about: `self`, `other`, and the `timer` data.
- **Reference**: a string param starting with `$` (R15).
- **Target**: a string that selects entities: `self`, `other`, `selected`, an entity id, an entity type id, `tag:x`, or a bare tag.
- **Instance props**: extra keys on a scene instance (`name`, `links`, `kind`, ...) stored on `entity.props`.

---

## R1 Public API

**User story:** As a game or editor author, I want one stable entry point, so that nothing depends on engine internals.

1. THE Engine SHALL export `createGame(gameJson: unknown, canvas: HTMLCanvasElement, opts?: { assetBase?: string; seed?: number; debug?: boolean }): Game`.
2. THE Game SHALL expose exactly `start()`, `stop()`, `restart()`, `destroy()`, `setScene(id)`, `getState()`, `on(event, cb)` and `off(event, cb)`.
3. WHEN `start()` is called, THE Game SHALL preload every sprite image, then begin the loop.
4. WHEN `start()` is called on a running or starting Game, THE Game SHALL do nothing.
5. WHEN `stop()` is called, THE Game SHALL halt the loop and keep the current state.
6. WHEN `restart()` is called, THE Game SHALL reset the RNG to its seed, reset variables to `gameJson.variables`, clear timers, logs and selection, reset the id counter, reload `meta.startScene`, set the tick to 0, and emit `start` again.
7. WHEN `destroy()` is called, THE Game SHALL stop the loop, remove its DOM listeners, observers and widgets, clear its event listeners, and ignore all later calls.
8. WHEN `getState()` is called, THE Game SHALL return a JSON-serializable `SimState` snapshot (tick, scene, rng, ended, vars, entities, timers, logs, open panels, selected). Mutating the snapshot SHALL NOT affect the Game.
9. THE Game SHALL emit the events listed in R20.
10. WHEN a listener throws, THE Game SHALL continue calling the remaining listeners.
11. WHEN `off(event, cb)` is called, THE Game SHALL stop calling `cb`, including during an emit in progress.
12. IF `gameJson` fails `validateGame`, THEN `createGame` SHALL NOT throw. It SHALL return an inert Game whose `start()` emits one `"error"` (code `invalid-game`, with `path`) per validation error and does nothing else.
13. THE Engine SHALL also export `createSimulation(gameJson, { seed? })`, `validateGame`, `registry`, `gameSchema`, `version`, `EMPTY_INPUT` and the public types. `createSimulation` SHALL throw `Error("Invalid game: <path> <message>")` when the game fails validation, because it is a tool for tests and not a runtime surface.

## R2 Game loop and determinism

**User story:** As a tester, I want identical results for identical inputs, so that bugs reproduce and property tests are meaningful.

1. THE Simulation SHALL advance in fixed steps of `DT = 1/60` s.
2. WHEN a frame arrives, THE loop SHALL add the elapsed real time (capped at 250 ms) to an accumulator and run `floor(accumulator / (1000/60))` ticks. IF that number exceeds 5, THEN THE loop SHALL run 5 ticks and discard the rest of the accumulator.
3. THE loop SHALL render once per `requestAnimationFrame`, after its ticks, and update DOM widgets once per rendered frame.
4. WHEN the document becomes visible again, THE loop SHALL reset its last-frame time and accumulator, so hidden time produces no catch-up ticks. (Browsers suspend `requestAnimationFrame` while a tab is hidden; the Engine adds no separate pause.)
5. WHEN a frame runs several ticks, THE loop SHALL give the full InputFrame to the first tick and the same `down` and `mouse` with empty `pressed`, `released` and `clicks` to the rest.
6. THE Simulation SHALL expose `step(inputFrame?)` with no DOM requirement.
7. FOR ALL gameJson, seeds and input scripts, THE Simulation SHALL produce identical `getState()` after the same number of ticks.
8. THE Simulation SHALL NOT read `Date.now`, `performance.now` or `Math.random`. Only the loop driver in `core/game.ts` reads the clock.
9. THE tick order SHALL be: queue key events (`pressed`, `released`, `down`, in that order) and click events; then, unless the game has ended, queue `tick`, advance timers, run AI, run movers, detect collisions; then drain the event queue through the rules; then apply deferred removals; then increment the tick counter.
10. WHEN a game has ended (`win` or `lose`), THE Simulation SHALL stop timers, AI, movers and the `tick` event. It SHALL still handle key and click events.
11. IF rules trigger more than 10 000 events in one tick, THEN THE Simulation SHALL drop the rest of the queue and report `event-loop` once.

## R3 Seeded RNG

1. THE Engine SHALL provide a mulberry32 PRNG with `next()` in [0, 1), `int(min, max)` (inclusive), `pick(items)`, `getState()` and `setState(state)`.
2. WHEN two RNGs share a seed, THEY SHALL produce identical sequences.
3. A restored state SHALL continue the sequence exactly.
4. THE Simulation SHALL draw all randomness from its single RNG, including `random`, `log` with `pick`, and `spawnFromTable`.
5. IF `opts.seed` is omitted, THEN THE Engine SHALL use seed `1`.
6. IF a seed is not finite, THEN THE Engine SHALL use 0. Finite seeds SHALL be truncated and taken as an unsigned 32-bit integer.

## R4 World (ECS-lite)

1. THE World SHALL store entities `{ id, type, tags: Set<string>, x, y, props, components }`.
2. WHEN an entity is added without an `id`, or with an `id` already live, THE World SHALL generate the id `<type>-<n>` (or `<id>-<n>`) from a counter. A generated id SHALL NOT equal any id previously issued in the run, including ids of removed entities.
3. WHEN an entity is added with a free authored `id`, THE World SHALL use it as given, so scene instance ids are stable across scene reloads.
4. WHEN `remove(id)` is called, THE World SHALL defer the removal to `flush()` at the end of the tick. Until then the entity SHALL NOT appear in `all()`, queries or `count()`, and `getById(id)` SHALL still return it.
5. WHEN `remove(id)` is called with an unknown id, THE World SHALL do nothing.
6. THE World SHALL provide `add`, `remove`, `isRemoved`, `getById`, `all`, `queryByTag`, `queryByType`, `queryByComponent`, `count`, `flush`, `clear`, `resetIds` and `toJSON`.
7. Query results SHALL be snapshot arrays in insertion order, safe to iterate while the World changes.
8. WHEN an entity is added during a tick, THE World SHALL make it visible to queries immediately.
9. `toJSON()` SHALL return plain JSON with tags sorted.
10. `clear()` SHALL NOT reset the id counter. Only a full restart (`resetIds`) SHALL.

## R5 Scenes

1. WHEN `loadScene(id)` or `setScene(id)` is called with a known id, THE Engine SHALL clear the World, clear the selection and collision memory, drop timers attached to entities, spawn the scene's entities, queue `enterScene`, and emit `"sceneChanged"` with the id.
2. WHEN spawning an instance, THE Engine SHALL deep-merge the instance's `components` over `entityTypes[type].components` (objects merge, arrays and primitives replace), union the tags, and fill gaps from the component's registered param defaults.
3. THE Engine SHALL NOT mutate `gameJson`. Each entity SHALL own its component objects.
4. THE Engine SHALL store instance keys other than `type, x, y, id, tags, components` in `entity.props`, over the entity type's `props` defaults.
5. WHEN a Game starts, THE Simulation SHALL already have loaded `meta.startScene`.
6. IF the scene id is unknown, THEN THE Engine SHALL emit `"error"` code `unknown-scene`, keep the current scene, and SHALL NOT throw.
7. IF an instance names an unknown entity type, THEN THE Engine SHALL skip it and emit `"error"` code `unknown-entity-type` with the instance path.
8. WHEN a scene has no entities, THE Engine SHALL load an empty World and keep running.
9. WHEN the `changeScene` action runs, THE Engine SHALL apply it immediately, so later actions in the same rule see the new scene.
10. Global timers SHALL survive a scene change.

## R6 Input

1. THE Engine SHALL track keyboard state by `event.code` and report `down`, `pressed` and `released` sorted arrays per tick.
2. THE movers SHALL read arrows and WASD from `down`. Key events for rules SHALL be matched by normalized name (`Space`, `KeyE`, `e` all compare equal).
3. THE Engine SHALL sample input once per tick. Events between ticks SHALL be queued.
4. WHEN a key is pressed and released between two ticks, THE next InputFrame SHALL report it in both `pressed` and `released`.
5. THE Engine SHALL report the mouse position and click positions in world coordinates, using the renderer's inverse transform.
6. WHEN the window loses focus, THE Engine SHALL release all held keys.
7. THE Engine SHALL call `preventDefault` for arrow keys pressed on the canvas, and not for other targets.
8. THE Simulation SHALL accept scripted InputFrames through `step`.
9. WHEN the Game is destroyed, THE Engine SHALL remove its input listeners.
10. WHEN a click lands on entities, THE Engine SHALL pick the one drawn on top (the last in draw order, R8.2) as `self` of the `click` event.

## R7 Camera and canvas

1. THE Engine SHALL use `scene.size` (pixels) as the world size.
2. THE renderer SHALL scale the visible view uniformly to fit the canvas, preserving aspect ratio, and center it with letterbox bars.
3. THE renderer SHALL size the canvas backing store by `devicePixelRatio` and update it when the CSS size or ratio changes.
4. THE renderer SHALL set `imageSmoothingEnabled = false` before each draw.
5. WHERE `meta.camera.follow` names a tag and an entity carries it, THE view SHALL be centered on that entity's `x, y` (its center) and clamped to the scene. The view size SHALL be `meta.camera.view` (default 320 by 240), capped at the scene size.
6. WHERE `meta.camera` is absent or no entity has the tag, THE view SHALL be the whole scene.
7. THE renderer SHALL provide `screenToWorld` and `worldToScreen`, inverse to each other for the last drawn view.
8. THE renderer SHALL fill the area outside the view with a neutral bar color, and the view with `scene.background` or `meta.background`.

## R8 Renderer and assets

1. THE renderer SHALL read state only and SHALL NOT change the World.
2. THE renderer SHALL draw entities sorted by `layer` ascending (`sprite.layer`, else `shape.layer`, default 0), then by their position in the entity array (later draws on top). WHERE the scene sets `sortBy: "y"`, entities in the same layer SHALL be sorted by `y` ascending, then array position. Reordering the array SHALL change draw order only inside a layer, never across layers.
3. THE renderer SHALL support `sprite` (`image`, `w`, `h`, `cols`, `rows`, `frame`, `layer`) and `shape` (`kind` rect or circle, `color`, `w`, `h`, `layer`).
4. THE renderer SHALL draw `node` entities with links to the entities named in `props.links`, each link once, and color them by `props.status`.
5. THE asset loader SHALL cache images by resolved URL and resolve paths against `opts.assetBase` (default `"./"`). Absolute and data URLs SHALL be left alone.
6. IF an image fails to load, THEN THE renderer SHALL draw a magenta placeholder and THE Game SHALL emit `"error"` code `missing-asset` once per path.
7. WHERE `opts.debug` is true, THE renderer SHALL draw collider boxes and entity ids.
8. THE renderer SHALL skip entities with no drawable component.
9. `props.kind` SHALL NOT be drawn. It is metadata. *(Decision recorded in tasks.md.)*

## R9 Components and collision

1. THE `collider` component SHALL define a center-based box with `w`, `h`, optional `offset: [x, y]` and optional `solid: boolean` (default false).
2. THE Engine SHALL provide strict `overlap(a, b)`: touching edges do not overlap, and the result is symmetric.
3. THE Engine SHALL provide `queryOverlaps(box, entities)`.
4. THE Engine SHALL compute, each tick, sorted unique collision pairs `[idA, idB]` with `idA < idB` and no self-pairs.
5. WHEN a pair starts overlapping, THE Simulation SHALL queue one `collide` event. It SHALL NOT repeat the event while the pair keeps overlapping, and SHALL queue it again after the pair separates and touches again.
6. THE `mover` (`mode: "topdown"`) SHALL move its entity by `speed` px/s along the directions held (arrows and WASD), with diagonal speed normalized.
7. THE Engine SHALL resolve movement one axis at a time (x, then y) against solid colliders other than the mover.
8. IF a mover or AI entity starts an axis step overlapping a solid, THEN THE Engine SHALL ignore that solid for that step, so the entity can walk out without a teleport.
9. WHEN a move would end overlapping a solid it did not already overlap, THE Engine SHALL stop the entity at the contact edge.
10. Non-solid colliders SHALL appear in pair lists and SHALL NOT block.
11. THE `ai` component SHALL support `mode` `chase`, `flee` (toward or away from the nearest entity carrying the tag named by its `target` param, default `player`, within `range`) and `patrol` (through `points`), at `speed` px/s, resolved against solids.
12. THE `health` component SHALL hold `max` and `hp` (default max). `damage` and `heal` SHALL clamp `hp` to [0, max] and queue `died` once when `hp` reaches 0 from above.
13. THE `inventory` component SHALL hold item counts, created by `giveItem`.
14. THE `tags` component SHALL list tags that live on `entity.tags`.
15. THE `label` and `node` components SHALL carry display data (R8.4).

## R10 Schema and validation

1. THE Engine SHALL export TypeScript types mirroring CONTRACT §1 and §8.
2. THE build SHALL generate `game.schema.json` (draft 2020-12). THE schema and the validator SHALL share their required-key lists (`schema/shared.ts`).
3. THE Engine SHALL export `validateGame(json: unknown): { ok: boolean; errors: { path: string; message: string }[] }`.
4. `validateGame` SHALL NOT throw for any input.
5. Each error SHALL carry a JSON-pointer `path` and a plain-English `message`. Errors SHALL be sorted and capped.
6. `validateGame` SHALL check structure only: required keys, field types, unique scene ids, `meta.startScene` exists, instance `type` exists in `entityTypes`, scene sizes greater than 0, rule `when` shape.
7. `validateGame` SHALL NOT reject unknown behavior, component or extra field names.
8. WHEN the same input is validated twice, THE result SHALL be identical.
9. FOR valid games, parse then serialize then parse SHALL yield an equal object.

## R11 Registry

1. THE Registry SHALL provide `registerEvent`, `registerCondition`, `registerAction`, `registerComponent` and `registerWidget`, each taking a definition with `name`, `label`, `params: Param[]` and optional `help`.
2. IF a name is registered twice in one kind, THEN THE Registry SHALL throw `Duplicate <kind> "<name>"`.
3. THE Registry SHALL provide `get(kind, name)`, `list(kind)` (sorted by name), `toManifest(engineVersion)` and `componentDefaults(name)`.
4. THE manifest SHALL follow CONTRACT §7 and be sorted so that output is stable.
5. Each `Param` SHALL have `name`, `label`, `type` (one of the CONTRACT list), `required`, and optional `default`, `min`, `max`, `options`, `help`.
6. `createRegistry()` SHALL return a fresh registry with every built-in behavior. The default `registry` export SHALL be treated as read-only.

## R12 Bundles and release

1. `pnpm -F engine build` SHALL run `vite build`, then `scripts/gen.ts`, then `scripts/check-size.mjs`, and produce `dist/reforge-engine.js` (single-file ES module), `dist/reforge-engine.css`, `dist/behaviors.manifest.json` and `dist/game.schema.json`. It SHALL also write `docs/behaviors.md`.
2. THE build SHALL fail if `reforge-engine.js` is over 60 KB gzip.
3. THE bundle SHALL have no external imports.
4. `.github/workflows/release.yml` SHALL run on tags `v*`, run install, typecheck, lint, test and build, then attach the four dist files with `gh release create`.
5. IF any step fails, THEN THE workflow SHALL NOT create the release.

## R13 Example

1. `examples/hello/game.json` SHALL contain one player (shape, collider, mover), two solid walls and one decorative entity, and SHALL pass `validateGame`.
2. `examples/hello/index.html` SHALL use only `createGame`.
3. `pnpm dev` SHALL serve the example.
4. WHEN a user presses arrows or WASD, THE player SHALL move and SHALL be stopped by the walls.

## R14 Non-functional

1. THE Engine SHALL have zero runtime dependencies.
2. Engine source SHALL contain no game-specific names.
3. Engine source SHALL contain no `any`, no `console.*`, no `innerHTML` with game strings, and no TODO without an issue number.
4. THE Engine SHALL hold 60 fps with 500 entities on a laptop (checked by the benchmark task).
5. THE Engine SHALL support the latest Chrome, Firefox and Safari.

---

## R15 Rules engine and references

**User story:** As a game author, I want `when / if / then` rules in JSON, so that behavior is data.

1. A rule SHALL have `when` (with `event`), optional `if` (list of conditions), `then` (list of actions) and optional `enabled`.
2. THE Simulation SHALL skip a rule whose `enabled` is `false`. Missing or `true` means on.
3. WHEN an event is dispatched, THE Simulation SHALL look up the event definition, and for each enabled rule in file order whose `when.event` matches, ask the definition for a Scope. IF the definition returns null, THEN THE rule SHALL be skipped.
4. THE Simulation SHALL run a rule's actions only if every condition passes. A condition with `"not": true` SHALL pass when the underlying test fails.
5. WHEN an action or condition param is a string starting with `$`, THE Simulation SHALL resolve it before the behavior runs: `$var.name`, `$self.field`, `$other.field`, `$selected.field`, `$timer.key`, `$tick`, `$scene`. Dotted paths SHALL be allowed. An unresolvable reference SHALL become `null`.
6. Entity fields SHALL resolve in this order: `id`, `type`, `x`, `y`, `tags` (sorted), then `props`, then components.
7. THE `then` and `if` keys of `forEach` SHALL NOT be resolved by the outer action. Nested actions SHALL be resolved when they run.
8. `showText` and `log` text SHALL interpolate `{name}` (a variable), `{self.field}`, `{other.field}` and `{selected.field}`. An unresolved placeholder SHALL stay as written.
9. IF an event, condition or action name is unknown, THEN THE Simulation SHALL report `unknown-event` (events are skipped silently), `unknown-condition` or `unknown-action` once, treat an unknown condition as failing, and continue.
10. IF a behavior throws, THEN THE Simulation SHALL report `condition-failed` or `action-failed` once and continue with the next action.
11. WHEN `setVar` or `addVar` changes a value, THE Simulation SHALL queue `varChanged` with the variable name. It SHALL NOT queue it when the value is equal.

## R16 Behavior registry: full catalog and manifest generation

1. THE Engine SHALL register these events: `start`, `tick`, `key`, `click`, `collide`, `enterScene`, `timer`, `varChanged`, `died`, `custom`.
2. THE Engine SHALL register these conditions: `varEq`, `varLt`, `varGt`, `compare`, `hasItem`, `hasTag`, `hasSelection`, `tagNear`, `random`, `inScene`, `entityCount`, `timerRunning`.
3. THE Engine SHALL register these actions: `setVar`, `addVar`, `spawn`, `spawnFromTable`, `destroy`, `damage`, `heal`, `giveItem`, `takeItem`, `move`, `setProp`, `addTag`, `removeTag`, `selectEntity`, `clearSelection`, `forEach`, `showText`, `log`, `openPanel`, `closePanel`, `playSound`, `changeScene`, `startTimer`, `stopTimer`, `emit`, `win`, `lose`.
4. THE Engine SHALL register these components: `sprite`, `shape`, `collider`, `mover`, `health`, `ai`, `inventory`, `node`, `label`, `tags`.
5. THE Engine SHALL register these widgets: `text`, `bar`, `button`, `panel`, `modal`, `list`, `log`, `table`.
6. THE registry SHALL be the only source for `behaviors.manifest.json` and `docs/behaviors.md`. The generator SHALL write both from `registry.toManifest()`.
7. WHEN a behavior is added to its file in `behaviors/` (or to `widgetDefs`), THE manifest and docs SHALL include it with no other code change.
8. THE committed `docs/behaviors.md` SHALL equal the generator's output.
9. Adding behaviors SHALL NOT change CONTRACT §2 unless the public catalog changes. Additive changes SHALL be noted in CONTRACT §8.

## R17 Timers and targets

1. `startTimer` SHALL take `id`, `seconds`, optional `target`, `repeat` and `data`. Seconds SHALL convert to ticks with `max(1, round(seconds / DT))`.
2. WHEN a timer with the same `id` and target is started again, THE Simulation SHALL replace it.
3. WHEN a timer runs out, THE Simulation SHALL queue `timer` with the timer's `id`. A targeted timer SHALL set `self` to its entity. The timer's `data` (with references resolved at start) SHALL be `$timer.*`.
4. WHEN a timer repeats, THE Simulation SHALL restart it from its full period.
5. WHEN a targeted timer's entity is removed, THE Simulation SHALL drop the timer.
6. `stopTimer` SHALL stop the timer by id, optionally for one target. `timerRunning` SHALL test the same.
7. Target strings SHALL resolve as: `self`, `other` and `selected` from the scope; otherwise every live entity whose id, type or tag equals the string, or whose tag equals the part after `tag:`.
8. `selectEntity` SHALL mark exactly one entity with the tag `selected` and remove the tag from the previous one. `clearSelection` SHALL remove it. WHEN the selected entity is destroyed or the scene changes, THE selection SHALL clear.
9. `forEach` SHALL run its nested actions once per matching entity with `self` set to that entity and `other` set to the outer `self`, after checking its nested `if`.

## R18 DOM widgets and UI host

1. THE Engine SHALL mount widgets from `gameJson.ui` into an overlay inside the canvas's parent element, which gets the class `rf-root`.
2. THE widgets SHALL read state through a `UiHost` and SHALL NOT import the simulation. A button press SHALL call `host.click(id)`, which queues a `click` event with `data.ui`.
3. A widget with `scene` SHALL show only in that scene.
4. `panel` and `modal` SHALL be open unless `"hidden": true`, SHALL show only while open, and SHALL render nested `children`. `openPanel` and `closePanel` SHALL toggle them.
5. `bar` SHALL fill by `var / max`, clamped to [0, 1]. `text` SHALL show static text with `{var}` interpolation, or `Label: value` for a variable. `list` and `log` SHALL show the lines of their id. `table` SHALL show one row per listed variable.
6. Widgets SHALL be placed in one of 9 position slots (default `top-left`) and stack within a slot.
7. THE UI layer SHALL rebuild only when the widgets array identity changes, and otherwise patch text and state.
8. THE UI layer SHALL NOT write game strings with `innerHTML`.
9. Unknown widget names SHALL be ignored.
10. Colors, fonts and spacing SHALL come from CSS variables in `reforge-engine.css`.
11. `appendLog` SHALL keep at most 200 lines per log.

## R19 Tables and spawnFromTable

1. THE top-level `tables` key SHALL map a table name to a list of row objects.
2. `spawnFromTable` SHALL pick a row by `id`, or by weighted random through the seeded RNG, find a free host entity (by `host`, or from the row's `hostsField` list), tag it with `markTag` (default `occupied`), store the row at `props.row`, and queue a `custom` event named `spawned` with that host as `self`.
3. IF the table is missing or empty, THEN THE Simulation SHALL report `unknown-table` once and do nothing.
4. IF `maxActive` is set and at least that many entities carry the mark tag, THEN THE action SHALL do nothing.
5. IF no listed host is free, THEN THE action SHALL do nothing.
6. THE action SHALL never mark one host twice.
7. WHERE `status` is set, THE host's `props.status` SHALL be set. WHERE `countVar` is set, THE variable SHALL be incremented.

## R20 Game events on createGame

1. `game.on(event, cb)` SHALL accept `win`, `lose`, `sceneChanged`, `error`, `sound` and `text`.
2. `win` and `lose` SHALL fire once, when the first of `win` or `lose` runs. THE Simulation SHALL ignore later `win` or `lose`.
3. `sceneChanged` SHALL carry the scene id, including the first scene.
4. `error` SHALL carry `{ code, message, path? }` and SHALL fire once per distinct code, path and message.
5. `sound` SHALL carry `{ sound }` from `playSound`. THE Engine SHALL ship no audio.
6. `text` SHALL carry `{ text }` from `showText`, which SHALL also append the line to the `messages` log.
7. A listener that throws SHALL NOT stop other listeners. For events other than `error`, THE Simulation SHALL report `listener-threw`.
