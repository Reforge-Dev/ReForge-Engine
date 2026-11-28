import type { EngineError, InputFrame, UiHandle, UiHost } from "../types";
import { createAssetStore, createInput, createRenderer } from "../io/index";
import { mountUi } from "../ui/index";
import { validateGame } from "../schema/index";
import type { Registry } from "./registry";
import { Simulation } from "./sim";
import type { SimState } from "./sim";
import { isObj } from "./json";

export type GameEventName = "win" | "lose" | "sceneChanged" | "error" | "sound" | "text";

export interface GameOptions {
  /** Folder that asset paths in game.json are relative to. Default "./". */
  assetBase?: string;
  /** Seed for the random number generator. Default 1. */
  seed?: number;
  /** Draw collider boxes and entity ids. */
  debug?: boolean;
}

export interface Game {
  start(): void;
  stop(): void;
  restart(): void;
  destroy(): void;
  setScene(id: string): void;
  getState(): SimState;
  on(event: GameEventName, cb: (payload: unknown) => void): void;
  off(event: GameEventName, cb: (payload: unknown) => void): void;
}

const STEP_MS = 1000 / 60;
const MAX_TICKS_PER_FRAME = 5;

/**
 * Wire a Simulation to a canvas: assets, renderer, input, DOM widgets and the real-time loop.
 * This is the only place that reads the clock.
 */
export function createGameWith(
  gameJson: unknown,
  canvas: HTMLCanvasElement,
  opts: GameOptions,
  registry: Registry,
): Game {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  const emit = (event: string, payload: unknown): void => {
    for (const cb of [...(listeners.get(event) ?? [])]) {
      try {
        cb(payload);
      } catch {
        // A throwing listener must not stop the others.
      }
    }
  };

  const checked = validateGame(gameJson);
  if (!checked.ok || !isObj(gameJson)) {
    return invalidGame(checked.errors, listeners, emit);
  }

  const sim = new Simulation(gameJson, {
    registry,
    ...(opts.seed === undefined ? {} : { seed: opts.seed }),
  });
  for (const name of ["win", "lose", "sceneChanged", "error", "sound", "text"]) {
    sim.on(name, (payload) => emit(name, payload));
  }

  const assets = createAssetStore(opts.assetBase ?? "./");
  const renderer = createRenderer(canvas, assets);
  const input = createInput(canvas, (px, py) => renderer.screenToWorld(px, py));

  const host: UiHost = {
    widgets: sim.ui,
    getScene: () => sim.sceneId,
    getVars: () => sim.vars,
    getLog: (id) => sim.logs[id] ?? [],
    isOpen: (id) => sim.open.has(id),
    click: (id) => sim.uiClick(id),
  };
  const root = canvas.parentElement;
  let ui: UiHandle | undefined;
  if (root) {
    root.classList.add("rf-root");
    ui = mountUi(root, host);
  }

  let destroyed = false;
  let running = false;
  let starting = false;
  let raf = 0;
  let last = 0;
  let acc = 0;
  const debug = opts.debug === true;

  const draw = (): void => {
    renderer.draw(sim.renderState(), { debug });
    ui?.update();
  };

  const frame = (now: number): void => {
    if (!running || destroyed) return;
    acc += Math.min(now - last, 250);
    last = now;
    let ticks = Math.floor(acc / STEP_MS);
    if (ticks > MAX_TICKS_PER_FRAME) {
      ticks = MAX_TICKS_PER_FRAME;
      acc = 0;
    } else {
      acc -= ticks * STEP_MS;
    }
    if (ticks > 0) {
      const first: InputFrame = input.frame();
      const rest: InputFrame = { ...first, pressed: [], released: [], clicks: [] };
      for (let i = 0; i < ticks; i++) sim.step(i === 0 ? first : rest);
    }
    draw();
    raf = requestAnimationFrame(frame);
  };

  const onVisible = (): void => {
    if (typeof document !== "undefined" && !document.hidden) {
      last = performance.now();
      acc = 0;
    }
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(() => {
          renderer.resize();
          if (!running) draw();
        });
  resizeObserver?.observe(canvas);

  const game: Game = {
    start() {
      if (destroyed || running || starting) return;
      starting = true;
      void assets.preload(sim.assetPaths()).then(({ failed }) => {
        for (const path of failed)
          sim.error("missing-asset", `Could not load image "${path}".`, path);
        starting = false;
        if (destroyed || running) return;
        running = true;
        renderer.resize();
        last = performance.now();
        acc = 0;
        raf = requestAnimationFrame(frame);
      });
    },
    stop() {
      if (destroyed) return;
      running = false;
      starting = false;
      cancelAnimationFrame(raf);
    },
    restart() {
      if (destroyed) return;
      sim.reset();
      acc = 0;
      draw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      if (typeof document !== "undefined")
        document.removeEventListener("visibilitychange", onVisible);
      input.destroy();
      renderer.destroy();
      ui?.destroy();
      listeners.clear();
    },
    setScene(id) {
      if (destroyed) return;
      sim.loadScene(id);
      draw();
    },
    getState: () => sim.getState(),
    on: (event, cb) => addListener(listeners, event, cb),
    off: (event, cb) => listeners.get(event)?.delete(cb),
  };
  draw();
  return game;
}

function addListener(
  listeners: Map<string, Set<(payload: unknown) => void>>,
  event: string,
  cb: (payload: unknown) => void,
): void {
  const set = listeners.get(event) ?? new Set();
  set.add(cb);
  listeners.set(event, set);
}

/** A Game for invalid JSON: start() reports the validation errors and does nothing else. */
function invalidGame(
  errors: { path: string; message: string }[],
  listeners: Map<string, Set<(payload: unknown) => void>>,
  emit: (event: string, payload: unknown) => void,
): Game {
  let destroyed = false;
  const state: SimState = {
    tick: 0,
    scene: "",
    rng: 0,
    ended: null,
    vars: {},
    entities: [],
    timers: [],
    logs: {},
    open: [],
    selected: null,
  };
  return {
    start() {
      if (destroyed) return;
      for (const e of errors) {
        const err: EngineError = { code: "invalid-game", message: e.message, path: e.path };
        emit("error", err);
      }
    },
    stop() {},
    restart() {},
    destroy() {
      destroyed = true;
      listeners.clear();
    },
    setScene() {},
    getState: () => state,
    on: (event, cb) => addListener(listeners, event, cb),
    off: (event, cb) => listeners.get(event)?.delete(cb),
  };
}
