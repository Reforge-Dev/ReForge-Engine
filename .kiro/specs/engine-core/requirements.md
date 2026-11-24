# Requirements: engine-core

Scope: the runtime foundation for ReForge (game loop, world, scenes, input, camera, renderer, components, schema validation, registry skeleton, bundles, release, example). The rules system, UI widgets and behaviors beyond the five components below are out of scope (spec `rules-system`).

Source of truth: `docs/CONTRACT.md`. This spec adds only additive fields, listed in the Glossary under "Additive fields".

## Glossary

- **Engine**: the `engine/` package.
- **Game**: the object returned by `createGame`.
- **gameJson**: a parsed `game.json` object (CONTRACT §1).
- **Tick**: one fixed simulation step of 1/60 s. Simulation time is the tick count.
- **Simulation**: all code that changes game state in a tick. It never reads the wall clock and never calls `Math.random`.
- **InputFrame**: the input snapshot consumed by one tick (keys down, pressed, released; mouse world position; clicks).
- **World**: the container of entities for the current scene.
- **Solid collider**: a collider with `solid: true`.
- **Additive fields** (not yet in CONTRACT, proposed in design.md for your approval): `meta.camera` (`{ follow?: tag }`), `sprite.frame` / `sprite.cols` / `sprite.rows` / `sprite.layer`, `shape.layer`, `collider.offset` (`[x, y]`), `mover.speed` semantics, and the headless export `createSimulation` (R2).

---

## R1 Public API

**User story:** As a game or editor author, I want one stable entry point, so that nothing depends on engine internals.

1. THE Engine SHALL export `createGame(gameJson: unknown, canvas: HTMLCanvasElement, opts?: { assetBase?: string; seed?: number; debug?: boolean }): Game`.
2. THE Game SHALL expose exactly `start()`, `stop()`, `restart()`, `destroy()`, `setScene(id)`, `getState()`, `on(event, cb)` and `off(event, cb)`.
3. WHEN `start()` is called, THE Game SHALL wait for asset preloading to finish, then begin the loop.
4. WHEN `start()` is called on a running Game, THE Game SHALL do nothing.
5. WHEN `stop()` is called, THE Game SHALL halt the loop and keep the current state.
6. WHEN `restart()` is called, THE Game SHALL reset the RNG to its initial seed, reset variables to `gameJson.variables`, reload `meta.startScene`, and set the tick counter to 0.
7. WHEN `destroy()` is called, THE Game SHALL stop the loop, remove every DOM listener it added, release asset references, and ignore all later calls except `destroy()`.
8. WHEN `getState()` is called, THE Game SHALL return a JSON-serializable snapshot (tick, scene id, RNG state, variables, entities). Mutating the snapshot SHALL NOT affect the Game.
9. THE Game SHALL emit the events `"win"`, `"lose"`, `"sceneChanged"` and `"error"` to registered listeners. `"sceneChanged"` carries the new scene id. `"error"` carries `{ code: string; message: string; path?: string }`.
10. WHEN a listener throws, THE Game SHALL emit `"error"` and continue calling the remaining listeners.
11. WHEN `off(event, cb)` is called, THE Game SHALL stop calling `cb` for that event, including during an emit in progress.
12. IF `gameJson` fails validation, THEN `createGame` SHALL NOT throw. It SHALL return a Game whose `start()` emits `"error"` with the validation errors and does nothing else.
13. THE Engine SHALL expose no other runtime entry point for games, except the headless `createSimulation` and `validateGame` exports used by tests and the editor.

## R2 Game loop and determinism

**User story:** As a tester, I want identical results for identical inputs, so that bugs reproduce and property tests are meaningful.

1. THE Simulation SHALL advance in fixed steps of 1/60 s using a time accumulator.
2. WHEN a frame arrives, THE loop SHALL run `floor(accumulator / step)` ticks, capped at 5 ticks per frame, and discard accumulator time beyond the cap.
3. THE loop SHALL render once per `requestAnimationFrame`, after its ticks.
4. WHILE the document is hidden, THE loop SHALL not tick. WHEN it becomes visible again, THE loop SHALL resume without running catch-up ticks for the hidden time.
5. THE Engine SHALL export a DOM-free `createSimulation(gameJson, opts?)` with `step(inputFrame): void`, `getState()` and the same scene and world behavior as the Game.
6. FOR ALL gameJson, seeds and input sequences, running N ticks SHALL produce the same serialized state regardless of how real time is divided into frames.
7. THE Simulation SHALL NOT read `Date.now`, `performance.now` or `Math.random`. Only the loop driver reads the real clock.
8. THE tick order SHALL be fixed and documented: sample input, apply movers, resolve collisions, build collision pairs, flush deferred world changes, increment tick.

## R3 Seeded RNG

1. THE Engine SHALL provide a mulberry32-based PRNG with `next(): number` in [0, 1), `int(min, max)` inclusive and `pick(array)`.
2. WHEN two RNGs are created with the same seed, THEY SHALL produce identical sequences.
3. THE RNG SHALL expose `getState(): number` and be restorable from that state. A restored RNG SHALL continue exactly where the original would have.
4. THE Simulation SHALL obtain all randomness from its single RNG instance.
5. IF `opts.seed` is omitted, THEN THE Game SHALL use seed `1`.
6. IF a seed is not a finite number, THEN THE Engine SHALL coerce it with `>>> 0` of its integer part (NaN becomes 0).

## R4 World (ECS-lite)

1. THE World SHALL store entities of the form `{ id: string; type: string; tags: Set<string>; x: number; y: number; components: Record<string, object> }`.
2. WHEN an entity is added, THE World SHALL assign an id unique within the run. Ids SHALL NOT be reused, including after removal and after `setScene`.
3. WHEN `remove(id)` is called, THE World SHALL mark the entity for removal and apply it at the end of the tick. The entity SHALL remain queryable until then.
4. WHEN `remove(id)` is called on an unknown id or an already-removed id, THE World SHALL do nothing.
5. THE World SHALL provide `add`, `remove`, `getById`, `queryByTag(tag)`, `queryByComponent(name)` and `count()`.
6. Query results SHALL be returned in insertion order, as a snapshot array that is safe to iterate while the World changes.
7. WHEN an entity is added during a tick, THE World SHALL make it visible to queries at the end of that tick.
8. THE World SHALL serialize to a plain JSON object (tags as sorted arrays) and restore from it.

## R5 Scenes

1. WHEN `setScene(id)` is called, THE Game SHALL clear the World, spawn the entities of that scene, and emit `"sceneChanged"` with the id.
2. WHEN spawning an entity instance, THE Engine SHALL deep-merge the instance's `components` and `tags` over `entityTypes[type]`. Objects merge recursively. Arrays and primitives are replaced, except `tags`, which are unioned.
3. THE Engine SHALL NOT mutate `gameJson` or the shared `entityTypes` objects when spawning. Each entity SHALL own its component objects.
4. WHEN a Game starts, THE Game SHALL load `meta.startScene`.
5. IF the scene id is unknown, THEN THE Game SHALL emit `"error"` with code `"unknown-scene"`, keep the current scene, and SHALL NOT throw.
6. IF an instance references an unknown entity type, THEN THE Engine SHALL skip that instance and emit `"error"` with code `"unknown-entity-type"` and the instance path.
7. WHEN a scene has an empty `entities` array, THE Game SHALL load an empty World and keep running.
8. WHEN `setScene` is called during a tick, THE Game SHALL apply it after the current tick completes.

## R6 Input

1. THE Engine SHALL track keyboard state by `event.code` and expose per tick `down`, `pressed` and `released` sets.
2. THE Engine SHALL map arrows, WASD, Space, Enter, Escape and Shift to named actions without consuming other keys.
3. THE Engine SHALL sample input once per tick. Events that arrive between ticks SHALL be queued and delivered on the next tick.
4. WHEN a key is pressed and released between two ticks, THE next InputFrame SHALL report it in both `pressed` and `released`.
5. THE Engine SHALL report mouse position in world coordinates (after camera and letterbox transform) and queue click events with world position and button.
6. WHILE the pointer is in the letterbox bars, THE Engine SHALL report positions outside the world rectangle and SHALL NOT clamp them.
7. WHEN the window loses focus, THE Engine SHALL release all held keys.
8. THE Simulation SHALL accept scripted InputFrames through `step(inputFrame)` without any DOM.
9. WHEN the Game is destroyed, THE Engine SHALL remove its input listeners.

## R7 Camera and canvas

1. THE Engine SHALL use `scene.size` as the world size in pixels.
2. THE Engine SHALL scale the world uniformly to fit the canvas, preserving aspect ratio, and center it with letterboxing.
3. THE Engine SHALL size the canvas backing store by `devicePixelRatio` and update it when the canvas size or ratio changes.
4. THE Engine SHALL set `imageSmoothingEnabled = false` before every draw pass.
5. WHERE `meta.camera.follow` names a tag, THE camera SHALL center on the first entity with that tag, clamped to the world bounds. IF no entity has the tag, THE camera SHALL stay where it was.
6. WHERE `meta.camera` is absent, THE camera SHALL be fixed and show the whole world.
7. THE camera SHALL provide screen-to-world and world-to-screen conversions that are inverse to each other.
8. WHERE the world is smaller than the viewport after fitting, THE Engine SHALL fill the bars with a neutral color.

## R8 Renderer and assets

1. THE renderer SHALL draw the World with Canvas 2D after the simulation, reading state only. It SHALL NOT change the World.
2. THE renderer SHALL draw entities sorted by `layer` ascending (default 0), then by `y` ascending, then by id for ties.
3. THE renderer SHALL support the `sprite` component (`image`, `w`, `h`, optional frame grid) and the `shape` component (`rect` or `circle`, `color`, `w`, `h`).
4. THE asset loader SHALL cache images by resolved URL and resolve paths against `opts.assetBase` (default `"./"`).
5. THE asset loader SHALL preload every image referenced by the game before `start()` resolves.
6. IF an image fails to load, THEN THE renderer SHALL draw a magenta placeholder of the sprite size and THE Game SHALL emit `"error"` with code `"missing-asset"` once per URL.
7. WHERE `opts.debug` is true, THE renderer SHALL draw collider boxes and entity ids.
8. THE renderer SHALL treat an entity without a drawable component as invisible, not as an error.

## R9 Components: sprite, shape, collider, mover, tags

1. THE `collider` component SHALL define an AABB with `w`, `h`, optional `offset: [x, y]`, and optional `solid: boolean` (default false). The AABB origin SHALL be the entity's `x, y` center plus offset.
2. THE Engine SHALL provide `overlap(a, b): boolean`, using strict inequality so that touching edges do not overlap.
3. THE Engine SHALL provide `queryOverlaps(box): Entity[]`.
4. THE Engine SHALL build, once per tick, a list of unordered collision pairs `[idA, idB]` with `idA < idB`. The list SHALL exclude self-pairs and duplicate pairs and SHALL be sorted. The list SHALL be readable by later systems.
5. THE `mover` component with `mode: "topdown"` SHALL move its entity by `speed` px/s along the directions held in the InputFrame (arrows and WASD).
6. THE mover SHALL normalize diagonal movement to the same speed as straight movement.
7. THE mover SHALL resolve collisions per axis: move on x, resolve against solid colliders, then move on y, resolve.
8. WHEN a mover with a collider would end a tick overlapping a solid collider (other than its own), THE Engine SHALL stop it at the contact edge.
9. IF a mover starts a tick already overlapping a solid collider, THEN THE Engine SHALL allow movement that does not increase penetration. It SHALL NOT teleport it.
10. Non-solid colliders SHALL appear in collision pair lists and SHALL NOT block movers.
11. THE `tags` component descriptor SHALL be registered for the editor. At runtime the tags SHALL live on `entity.tags`.
12. IF a component has invalid or missing params, THEN THE Engine SHALL use the descriptor defaults and emit `"error"` once with the entity path.

## R10 Schema and validation

1. THE Engine SHALL export TypeScript types mirroring CONTRACT §1.
2. THE build SHALL generate `game.schema.json` (JSON Schema draft 2020-12) from a single definition shared with the validator.
3. THE Engine SHALL export `validateGame(json: unknown): { ok: boolean; errors: { path: string; message: string }[] }`.
4. `validateGame` SHALL NOT throw for any input, including `null`, `undefined`, numbers, strings, arrays, cyclic objects, and objects nested deeper than 1000 levels.
5. `validateGame` SHALL report each error with a JSON-pointer-style `path` (for example `/scenes/0/entities/2/x`) and a plain-English `message`.
6. `validateGame` SHALL check structure only: required keys, types, unique scene ids, `meta.startScene` exists, entity `type` exists in `entityTypes`, numeric sizes greater than 0.
7. `validateGame` SHALL NOT reject unknown behavior names, unknown component names or unknown rule/UI fields. The registry validates those later.
8. WHEN the same input is validated twice, THE result SHALL be identical.
9. FOR valid games, parse then serialize then parse SHALL yield a deep-equal object.

## R11 Registry skeleton

1. THE Engine SHALL provide a `Registry` with `registerComponent`, `registerAction`, `registerCondition`, `registerEvent` and `registerWidget`, each taking a definition with `name`, `label`, `params: Param[]` as in CONTRACT §7.
2. IF a name is registered twice in the same kind, THEN THE Registry SHALL throw at registration time (a programming error, not game input).
3. THE Registry SHALL provide `get(kind, name)`, `list(kind)` and `toManifest(engineVersion)`.
4. THE manifest SHALL follow CONTRACT §7, with entries sorted by name so output is stable.
5. IN this spec the Engine SHALL register only the components `sprite`, `shape`, `collider`, `mover` and `tags`. The `events`, `conditions`, `actions` and `widgets` arrays MAY be empty.
6. EACH Param SHALL have `name`, `label`, `type` (from the CONTRACT list), `required`, and optional `default`, `min`, `max`, `options`, `help`.
7. THE build SHALL write `dist/behaviors.manifest.json` from `registry.toManifest()`.

## R12 Bundles and release

1. `pnpm build` in `engine/` SHALL produce `dist/reforge-engine.js` (single-file ES module), `dist/reforge-engine.css`, `dist/behaviors.manifest.json` and `dist/game.schema.json`.
2. THE core bundle SHALL be under 60 KB gzip. The build SHALL fail if it is not.
3. THE bundle SHALL have no runtime imports from other files or packages.
4. `.github/workflows/release.yml` SHALL run on tags matching `v*`, run install, typecheck, lint, test and build, then attach the four files to a GitHub Release.
5. IF any step fails, THEN THE workflow SHALL NOT create the release.

## R13 Example

1. `examples/hello/game.json` SHALL contain one player (sprite, collider, mover), two solid walls and one decorative entity, and SHALL pass `validateGame`.
2. `examples/hello/index.html` SHALL use only `createGame` from the built bundle.
3. `pnpm dev` SHALL serve the example with hot reload.
4. WHEN a user presses arrows or WASD, THE player SHALL move and SHALL be stopped by the walls.
5. THE example SHALL use only generated or CC0 assets, listed in its folder.

## R14 Non-functional

1. THE Engine SHALL have zero runtime dependencies.
2. Engine source and tests SHALL contain no game-specific names ("dungeon", "ghost", "key", "network") except where quoting CONTRACT.
3. Engine source SHALL contain no `any`, no `console.*`, no TODO without an issue number.
4. THE Engine SHALL run at 60 fps with 500 entities in a current desktop browser.
5. THE Engine SHALL support the latest Chrome, Firefox and Safari.
