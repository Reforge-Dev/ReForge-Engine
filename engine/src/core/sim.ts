import type {
  EngineError,
  Entity,
  EntityState,
  InputFrame,
  Json,
  JsonObject,
  RenderState,
  ViewRect,
} from "../types";
import { EMPTY_INPUT } from "../types";
import type { GameEvent, Scope } from "../rules/types";
import { interpolate, matchesSpec, resolveValue } from "../rules/expr";
import type { ExprEnv } from "../rules/expr";
import { Registry } from "./registry";
import { Rng } from "./rng";
import { World } from "./world";
import { clone, deepMerge, isArr, isObj, num, str } from "./json";
import { collisionPairs, contains, isSolid, moveWithCollision, sizeOf } from "./geometry";
import { parseSortBy, sortForDraw } from "../order";

/** Fixed simulation step, in seconds. */
export const DT = 1 / 60;
const MAX_EVENTS_PER_TICK = 10000;
const RESERVED_INSTANCE_KEYS = new Set(["type", "x", "y", "id", "tags", "components"]);

interface Timer {
  id: string;
  target?: string;
  remaining: number;
  period: number;
  repeat: boolean;
  data: JsonObject;
}

export interface SimState {
  tick: number;
  scene: string;
  rng: number;
  ended: "win" | "lose" | null;
  vars: Record<string, Json>;
  entities: EntityState[];
  timers: {
    id: string;
    target: string | null;
    remaining: number;
    repeat: boolean;
    data: JsonObject;
  }[];
  logs: Record<string, string[]>;
  open: string[];
  selected: string | null;
}

export type HostEventName = "win" | "lose" | "sceneChanged" | "error" | "sound" | "text";
type Listener = (payload: unknown) => void;

export interface SimOptions {
  seed?: number;
  registry: Registry;
}

const KEY_DIRS: [string[], number, number][] = [
  [["ArrowLeft", "KeyA"], -1, 0],
  [["ArrowRight", "KeyD"], 1, 0],
  [["ArrowUp", "KeyW"], 0, -1],
  [["ArrowDown", "KeyS"], 0, 1],
];

/**
 * The whole game without a DOM: world, rules, timers, variables. Time is the tick count.
 * Never reads the clock and never calls Math.random.
 */
export class Simulation {
  readonly world = new World();
  rng: Rng;
  vars: Record<string, Json> = {};
  tick = 0;
  sceneId = "";
  ended: "win" | "lose" | undefined;
  selectedId: string | undefined;
  readonly logs: Record<string, string[]> = {};
  readonly open = new Set<string>();
  private timers: Timer[] = [];
  private queue: GameEvent[] = [];
  private prevPairs = new Set<string>();
  private listeners = new Map<string, Set<Listener>>();
  private warned = new Set<string>();
  private input: InputFrame = EMPTY_INPUT;
  private readonly seed: number;
  private readonly reg: Registry;
  private readonly meta: JsonObject;
  private readonly entityTypes: JsonObject;
  private readonly scenes: JsonObject[];
  private readonly rules: JsonObject[];
  readonly tables: Record<string, JsonObject[]> = {};
  readonly ui: JsonObject[];

  constructor(
    private readonly game: JsonObject,
    opts: SimOptions,
  ) {
    this.reg = opts.registry;
    this.seed = Rng.coerce(opts.seed ?? 1);
    this.rng = new Rng(this.seed);
    this.meta = isObj(game["meta"]) ? game["meta"] : {};
    this.entityTypes = isObj(game["entityTypes"]) ? game["entityTypes"] : {};
    this.scenes = isArr(game["scenes"]) ? game["scenes"].filter(isObj) : [];
    this.rules = isArr(game["rules"]) ? game["rules"].filter(isObj) : [];
    this.ui = isArr(game["ui"]) ? game["ui"].filter(isObj) : [];
    if (isObj(game["tables"])) {
      for (const [name, rows] of Object.entries(game["tables"])) {
        if (isArr(rows)) this.tables[name] = rows.filter(isObj);
      }
    }
    this.reset();
  }

  // ---------- lifecycle ----------

  /** Back to tick 0: same seed, initial variables, start scene. */
  reset(): void {
    this.rng = new Rng(this.seed);
    this.vars = isObj(this.game["variables"]) ? clone(this.game["variables"]) : {};
    this.tick = 0;
    this.ended = undefined;
    this.selectedId = undefined;
    this.timers = [];
    this.queue = [];
    this.prevPairs.clear();
    for (const k of Object.keys(this.logs)) Reflect.deleteProperty(this.logs, k);
    this.open.clear();
    for (const w of this.ui) {
      const kind = w["widget"];
      if (
        (kind === "panel" || kind === "modal") &&
        typeof w["id"] === "string" &&
        w["hidden"] !== true
      ) {
        this.open.add(w["id"]);
      }
    }
    this.world.clear();
    this.world.resetIds();
    this.loadScene(str(this.meta["startScene"]));
    this.queue.push({ name: "start", data: {} });
  }

  on(event: string, cb: Listener): void {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(cb);
    this.listeners.set(event, set);
  }

  off(event: string, cb: Listener): void {
    this.listeners.get(event)?.delete(cb);
  }

  hostEmit(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of [...set]) {
      if (!set.has(cb)) continue;
      try {
        cb(payload);
      } catch (e) {
        if (event !== "error") {
          this.error("listener-threw", e instanceof Error ? e.message : "A listener threw.");
        }
      }
    }
  }

  /** Report a problem once per distinct code/path/message. Never throws. */
  error(code: string, message: string, path?: string): void {
    const key = `${code}|${path ?? ""}|${message}`;
    if (this.warned.has(key)) return;
    this.warned.add(key);
    const err: EngineError = path === undefined ? { code, message } : { code, message, path };
    this.hostEmit("error", err);
  }

  // ---------- scenes and spawning ----------

  hasScene(id: string): boolean {
    return this.scenes.some((s) => s["id"] === id);
  }

  /** Replace the world with the entities of scene `id`. Returns false (and reports) if unknown. */
  loadScene(id: string): boolean {
    const index = this.scenes.findIndex((s) => s["id"] === id);
    const scene = this.scenes[index];
    if (!scene) {
      this.error("unknown-scene", `There is no scene "${id}".`, `/scenes/${id}`);
      return false;
    }
    this.world.clear();
    this.selectedId = undefined;
    this.prevPairs.clear();
    this.timers = this.timers.filter((t) => t.target === undefined);
    this.sceneId = id;
    const instances = isArr(scene["entities"]) ? scene["entities"] : [];
    instances.forEach((inst, i) => {
      if (isObj(inst)) this.spawnInstance(inst, `/scenes/${index}/entities/${i}`);
    });
    this.queue.push({ name: "enterScene", data: { scene: id } });
    this.hostEmit("sceneChanged", id);
    return true;
  }

  /** Build an entity from an instance: instance values merged over its type. */
  spawnInstance(inst: JsonObject, path: string): Entity | null {
    const type = str(inst["type"]);
    const def = this.entityTypes[type];
    if (!isObj(def)) {
      this.error("unknown-entity-type", `There is no entity type "${type}".`, path);
      return null;
    }
    const tags = new Set<string>();
    const addTags = (v: Json | undefined): void => {
      if (isArr(v)) for (const t of v) if (typeof t === "string") tags.add(t);
    };
    addTags(def["tags"]);
    addTags(inst["tags"]);

    const components: Record<string, JsonObject> = {};
    const typeComps = isObj(def["components"]) ? def["components"] : {};
    const instComps = isObj(inst["components"]) ? inst["components"] : {};
    for (const name of new Set([...Object.keys(typeComps), ...Object.keys(instComps)])) {
      if (name === "tags") {
        addTags(typeComps[name]);
        addTags(instComps[name]);
        continue;
      }
      const base = typeComps[name];
      const over = instComps[name];
      const merged = deepMerge(isObj(base) ? base : {}, isObj(over) ? over : {});
      components[name] = { ...this.reg.componentDefaults(name), ...merged };
    }

    const props: JsonObject = isObj(def["props"]) ? clone(def["props"]) : {};
    for (const [k, v] of Object.entries(inst)) {
      if (!RESERVED_INSTANCE_KEYS.has(k) && v !== undefined) props[k] = clone(v);
    }
    const id = typeof inst["id"] === "string" ? inst["id"] : undefined;
    return this.world.add({
      ...(id === undefined ? {} : { id }),
      type,
      tags,
      x: num(inst["x"], 0),
      y: num(inst["y"], 0),
      props,
      components,
    });
  }

  /** Spawn a new entity of `type` at a point, with optional extra props. */
  spawn(type: string, x: number, y: number, extra: JsonObject = {}): Entity | null {
    return this.spawnInstance({ ...extra, type, x, y }, `/spawn/${type}`);
  }

  destroy(e: Entity): void {
    this.world.remove(e.id);
    if (this.selectedId === e.id) this.selectedId = undefined;
  }

  // ---------- variables, timers, logs ----------

  getVar(name: string): Json {
    return this.vars[name] ?? null;
  }

  setVar(name: string, value: Json): void {
    const old = this.vars[name];
    this.vars[name] = value;
    if (JSON.stringify(old) !== JSON.stringify(value)) {
      this.emit("varChanged", { var: name, value });
    }
  }

  startTimer(
    id: string,
    seconds: number,
    opts: { target?: Entity; repeat?: boolean; data?: JsonObject } = {},
  ): void {
    const ticks = Math.max(1, Math.round(seconds / DT));
    const targetId = opts.target?.id;
    this.timers = this.timers.filter((t) => !(t.id === id && t.target === targetId));
    const timer: Timer = {
      id,
      remaining: ticks,
      period: ticks,
      repeat: opts.repeat === true,
      data: opts.data ?? {},
    };
    if (targetId !== undefined) timer.target = targetId;
    this.timers.push(timer);
  }

  stopTimer(id: string, target?: Entity): void {
    this.timers = this.timers.filter(
      (t) => !(t.id === id && (target === undefined || t.target === target.id)),
    );
  }

  timerRunning(id: string, target?: Entity): boolean {
    return this.timers.some((t) => t.id === id && (target === undefined || t.target === target.id));
  }

  appendLog(listId: string, line: string): void {
    const lines = this.logs[listId] ?? [];
    lines.push(line);
    if (lines.length > 200) lines.splice(0, lines.length - 200);
    this.logs[listId] = lines;
  }

  setOpen(id: string, isOpen: boolean): void {
    if (isOpen) this.open.add(id);
    else this.open.delete(id);
  }

  finish(result: "win" | "lose"): void {
    if (this.ended) return;
    this.ended = result;
    this.hostEmit(result, undefined);
  }

  select(e: Entity | undefined): void {
    if (this.selectedId !== undefined) this.world.getById(this.selectedId)?.tags.delete("selected");
    this.selectedId = e?.id;
    e?.tags.add("selected");
  }

  get selected(): Entity | undefined {
    return this.selectedId === undefined ? undefined : this.world.getById(this.selectedId);
  }

  // ---------- rule helpers (used by behaviors) ----------

  get env(): ExprEnv {
    return { vars: this.vars, tick: this.tick, sceneId: this.sceneId, selected: this.selected };
  }

  resolve(value: Json, scope: Scope): Json {
    return resolveValue(value, this.env, scope);
  }

  /** Resolve `$...` references one level deep inside an object value. */
  resolveObject(obj: JsonObject, scope: Scope): JsonObject {
    const out: JsonObject = {};
    for (const [k, v] of Object.entries(obj)) out[k] = this.resolve(v, scope);
    return out;
  }

  text(value: string, scope: Scope): string {
    return interpolate(value, this.env, scope);
  }

  /** Entities a `target` param points at: self, other, selected, an id, a type, or a tag. */
  targets(spec: Json | undefined, scope: Scope): Entity[] {
    if (typeof spec !== "string" || spec === "") return [];
    if (spec === "self") return scope.self ? [scope.self] : [];
    if (spec === "other") return scope.other ? [scope.other] : [];
    if (spec === "selected") return this.selected ? [this.selected] : [];
    return this.world.all().filter((e) => matchesSpec(e, spec));
  }

  matches(e: Entity, spec: Json | undefined): boolean {
    return typeof spec === "string" && matchesSpec(e, spec);
  }

  emit(name: string, data: JsonObject, scope: Scope = {}): void {
    const ev: GameEvent = { name, data };
    if (scope.self) ev.self = scope.self;
    if (scope.other) ev.other = scope.other;
    this.queue.push(ev);
  }

  /** Resolve `$...` references in every param except the given raw keys. */
  private params(src: JsonObject, scope: Scope, raw: readonly string[]): JsonObject {
    const out: JsonObject = {};
    for (const [k, v] of Object.entries(src)) out[k] = raw.includes(k) ? v : this.resolve(v, scope);
    return out;
  }

  conditionsPass(list: Json | undefined, scope: Scope): boolean {
    if (!isArr(list)) return true;
    for (const raw of list) {
      if (!isObj(raw)) return false;
      const name = str(raw["cond"]);
      const def = this.reg.get("condition", name);
      if (!def) {
        this.error("unknown-condition", `There is no condition "${name}".`);
        return false;
      }
      try {
        const passed = def.test(this, this.params(raw, scope, []), scope);
        if (passed === (raw["not"] === true)) return false;
      } catch (e) {
        this.error("condition-failed", e instanceof Error ? e.message : "Condition failed.");
        return false;
      }
    }
    return true;
  }

  runActions(list: Json | undefined, scope: Scope): void {
    if (!isArr(list)) return;
    for (const raw of list) {
      if (!isObj(raw)) continue;
      const name = str(raw["do"]);
      const def = this.reg.get("action", name);
      if (!def) {
        this.error("unknown-action", `There is no action "${name}".`);
        continue;
      }
      try {
        def.run(this, this.params(raw, scope, ["then", "if"]), scope);
      } catch (e) {
        this.error("action-failed", e instanceof Error ? e.message : "Action failed.");
      }
    }
  }

  // ---------- events ----------

  /** Queue a UI button press (ui widget id). */
  uiClick(id: string): void {
    this.queue.push({ name: "click", data: { ui: id } });
  }

  private dispatch(ev: GameEvent): void {
    const def = this.reg.get("event", ev.name);
    if (!def) return;
    for (const rule of this.rules) {
      if (rule["enabled"] === false) continue;
      const when = rule["when"];
      if (!isObj(when) || when["event"] !== ev.name) continue;
      const scope = def.matches(when, ev, this);
      if (!scope) continue;
      if (!this.conditionsPass(rule["if"], scope)) continue;
      this.runActions(rule["then"], scope);
    }
  }

  private drain(): void {
    let handled = 0;
    for (let ev = this.queue.shift(); ev; ev = this.queue.shift()) {
      handled += 1;
      if (handled > MAX_EVENTS_PER_TICK) {
        this.queue = [];
        this.error("event-loop", "Rules kept triggering each other; this tick was cut short.");
        return;
      }
      this.dispatch(ev);
    }
  }

  // ---------- the tick ----------

  /** Advance one fixed step. Order: input, tick event, timers, ai, movers, collisions, rules, flush. */
  step(input: InputFrame = EMPTY_INPUT): void {
    this.input = input;
    for (const key of input.pressed)
      this.queue.push({ name: "key", data: { key, mode: "pressed" } });
    for (const key of input.released)
      this.queue.push({ name: "key", data: { key, mode: "released" } });
    for (const key of input.down) this.queue.push({ name: "key", data: { key, mode: "down" } });
    for (const click of input.clicks) {
      const hit = this.entityAt(click.x, click.y);
      const ev: GameEvent = {
        name: "click",
        data: { x: click.x, y: click.y, button: click.button },
      };
      if (hit) ev.self = hit;
      this.queue.push(ev);
    }
    if (!this.ended) {
      this.queue.push({ name: "tick", data: {} });
      this.advanceTimers();
      this.runAi();
      this.runMovers();
      this.detectCollisions();
    }
    this.drain();
    for (const id of this.world.flush()) {
      this.timers = this.timers.filter((t) => t.target !== id);
    }
    this.tick += 1;
  }

  private entityAt(x: number, y: number): Entity | undefined {
    // Topmost = drawn last, using the same order as the renderer.
    const order = sortForDraw(this.world.all(), parseSortBy(this.currentScene()?.["sortBy"]));
    return order.filter((e) => contains(e, x, y)).at(-1);
  }

  private advanceTimers(): void {
    for (const timer of [...this.timers]) {
      timer.remaining -= 1;
      if (timer.remaining > 0) continue;
      const target = timer.target === undefined ? undefined : this.world.getById(timer.target);
      if (timer.target !== undefined && !target) {
        this.timers = this.timers.filter((t) => t !== timer);
        continue;
      }
      const ev: GameEvent = { name: "timer", data: { id: timer.id, data: timer.data } };
      if (target) ev.self = target;
      this.queue.push(ev);
      if (timer.repeat) timer.remaining = timer.period;
      else this.timers = this.timers.filter((t) => t !== timer);
    }
  }

  private runMovers(): void {
    const down = new Set(this.input.down);
    const solids = this.world.all().filter(isSolid);
    for (const e of this.world.queryByComponent("mover")) {
      const m = e.components["mover"];
      if (!m || str(m["mode"], "topdown") !== "topdown") continue;
      let dx = 0;
      let dy = 0;
      for (const [keys, kx, ky] of KEY_DIRS) {
        if (keys.some((k) => down.has(k))) {
          dx += kx;
          dy += ky;
        }
      }
      if (dx === 0 && dy === 0) continue;
      const len = Math.hypot(dx, dy);
      const step = num(m["speed"], 90) * DT;
      moveWithCollision(e, (dx / len) * step, (dy / len) * step, solids);
    }
  }

  private runAi(): void {
    const solids = this.world.all().filter(isSolid);
    for (const e of this.world.queryByComponent("ai")) {
      const ai = e.components["ai"];
      if (!ai) continue;
      const mode = str(ai["mode"], "chase");
      const step = num(ai["speed"], 40) * DT;
      if (mode === "patrol") {
        const pts = isArr(ai["points"]) ? ai["points"] : [];
        const i = Math.trunc(num(ai["i"], 0)) % Math.max(1, pts.length);
        const p = pts[i];
        if (!isArr(p)) continue;
        const dx = num(p[0], e.x) - e.x;
        const dy = num(p[1], e.y) - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= Math.max(1, step)) {
          e.x = num(p[0], e.x);
          e.y = num(p[1], e.y);
          ai["i"] = (i + 1) % pts.length;
        } else {
          moveWithCollision(e, (dx / dist) * step, (dy / dist) * step, solids);
        }
        continue;
      }
      const tag = str(ai["target"], "player");
      const range = num(ai["range"], Infinity);
      let best: Entity | undefined;
      let bestD = Infinity;
      for (const t of this.world.queryByTag(tag)) {
        const d = Math.hypot(t.x - e.x, t.y - e.y);
        if (d < bestD) {
          best = t;
          bestD = d;
        }
      }
      if (!best || bestD > range || bestD === 0) continue;
      const sign = mode === "flee" ? -1 : 1;
      moveWithCollision(
        e,
        ((best.x - e.x) / bestD) * step * sign,
        ((best.y - e.y) / bestD) * step * sign,
        solids,
      );
    }
  }

  private detectCollisions(): void {
    const now = new Set<string>();
    for (const [a, b] of collisionPairs(this.world.all())) {
      const key = `${a}|${b}`;
      now.add(key);
      if (this.prevPairs.has(key)) continue;
      const ea = this.world.getById(a);
      const eb = this.world.getById(b);
      if (ea && eb) this.queue.push({ name: "collide", self: ea, other: eb, data: {} });
    }
    this.prevPairs = now;
  }

  /** Apply damage to an entity with a `health` component. Emits `died` once when it reaches 0. */
  damage(e: Entity, amount: number): void {
    const h = e.components["health"];
    if (!h) return;
    const max = num(h["max"], 10);
    const before = num(h["hp"], max);
    const hp = Math.min(max, before - amount);
    h["hp"] = Math.max(0, hp);
    if (before > 0 && hp <= 0) this.emit("died", {}, { self: e });
  }

  // ---------- reading state ----------

  getState(): SimState {
    return {
      tick: this.tick,
      scene: this.sceneId,
      rng: this.rng.getState(),
      ended: this.ended ?? null,
      vars: clone(this.vars),
      entities: this.world.toJSON(),
      timers: this.timers.map((t) => ({
        id: t.id,
        target: t.target ?? null,
        remaining: t.remaining,
        repeat: t.repeat,
        data: clone(t.data),
      })),
      logs: clone(this.logs) as Record<string, string[]>,
      open: [...this.open].sort(),
      selected: this.selectedId ?? null,
    };
  }

  /** Read-only snapshot for the renderer. */
  renderState(): RenderState {
    const scene = this.currentScene();
    const sz = isArr(scene?.["size"]) ? scene["size"] : [320, 240];
    const size: [number, number] = [Math.max(1, num(sz[0], 320)), Math.max(1, num(sz[1], 240))];
    const entities = this.world.all();
    const byId = new Map(entities.map((e) => [e.id, e]));
    const state: RenderState = {
      sceneId: this.sceneId,
      size,
      view: this.viewRect(size, entities),
      entities,
      byId,
    };
    const bg = scene?.["background"] ?? this.meta["background"];
    if (typeof bg === "string") state.background = bg;
    state.sortBy = parseSortBy(scene?.["sortBy"]);
    return state;
  }

  private viewRect(size: [number, number], entities: readonly Entity[]): ViewRect {
    const cam = isObj(this.meta["camera"]) ? this.meta["camera"] : undefined;
    const follow = cam?.["follow"];
    const target =
      typeof follow === "string" ? entities.find((e) => e.tags.has(follow)) : undefined;
    if (!cam || !target) return { x: 0, y: 0, w: size[0], h: size[1] };
    const v = isArr(cam["view"]) ? cam["view"] : [];
    const w = Math.min(size[0], Math.max(1, num(v[0], 320)));
    const h = Math.min(size[1], Math.max(1, num(v[1], 240)));
    return {
      x: Math.min(Math.max(0, target.x - w / 2), size[0] - w),
      y: Math.min(Math.max(0, target.y - h / 2), size[1] - h),
      w,
      h,
    };
  }

  /** Image paths referenced by sprites anywhere in the game, for preloading. */
  assetPaths(): string[] {
    const out = new Set<string>();
    const scan = (comps: Json | undefined): void => {
      if (!isObj(comps)) return;
      const sprite = comps["sprite"];
      if (isObj(sprite) && typeof sprite["image"] === "string" && sprite["image"] !== "") {
        out.add(sprite["image"]);
      }
    };
    for (const def of Object.values(this.entityTypes)) if (isObj(def)) scan(def["components"]);
    for (const scene of this.scenes) {
      if (!isArr(scene["entities"])) continue;
      for (const inst of scene["entities"]) if (isObj(inst)) scan(inst["components"]);
    }
    return [...out].sort();
  }

  private currentScene(): JsonObject | undefined {
    return this.scenes.find((s) => s["id"] === this.sceneId);
  }

  sizeOf(e: Entity): [number, number] {
    return sizeOf(e);
  }
}
