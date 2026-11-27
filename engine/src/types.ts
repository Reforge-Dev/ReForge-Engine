// Shared types. Everything in engine/src imports from here; this file imports nothing.

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export type ParamType =
  | "number"
  | "string"
  | "boolean"
  | "select"
  | "color"
  | "entityType"
  | "tag"
  | "variable"
  | "scene"
  | "asset"
  | "target";

/** CONTRACT §7 Param. */
export interface Param {
  name: string;
  label: string;
  type: ParamType;
  required: boolean;
  default?: Json;
  min?: number;
  max?: number;
  options?: string[];
  help?: string;
}

export type BehaviorKind = "event" | "condition" | "action" | "component" | "widget";

/** Shape every registered behavior shares; this is what the manifest lists. */
export interface BehaviorMeta {
  name: string;
  label: string;
  params: Param[];
  help?: string;
}

/** A live entity in the World. */
export interface Entity {
  id: string;
  type: string;
  tags: Set<string>;
  x: number;
  y: number;
  /** Free-form per-instance data (name, links, kind, status, ...). Set by instances and by actions. */
  props: JsonObject;
  components: Record<string, JsonObject>;
}

/** Plain JSON form of an Entity (tags sorted). */
export interface EntityState {
  id: string;
  type: string;
  tags: string[];
  x: number;
  y: number;
  props: JsonObject;
  components: Record<string, JsonObject>;
}

/** One tick of input. Arrays are sorted and JSON-serializable. */
export interface InputFrame {
  down: string[];
  pressed: string[];
  released: string[];
  /** Mouse position in world coordinates. */
  mouse: { x: number; y: number };
  clicks: { x: number; y: number; button: number }[];
}

export const EMPTY_INPUT: InputFrame = {
  down: [],
  pressed: [],
  released: [],
  mouse: { x: 0, y: 0 },
  clicks: [],
};

export interface EngineError {
  code: string;
  message: string;
  path?: string;
}

/** Rectangle of the world that is visible (whole scene unless the camera follows something). */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What the renderer needs; read-only. */
export interface RenderState {
  sceneId: string;
  size: [number, number];
  view: ViewRect;
  entities: readonly Entity[];
  /** Entities looked up by id, for drawing links between nodes. */
  byId: ReadonlyMap<string, Entity>;
  /** Background color from scene.background or meta.background; undefined = renderer default. */
  background?: string;
}

// ---------- io/ contracts (implemented in io/, consumed by core/index) ----------

export interface AssetStore {
  /** Resolve a game-relative path against assetBase. */
  resolve(path: string): string;
  /** Load all urls. Never rejects; failed urls are returned. */
  preload(paths: string[]): Promise<{ failed: string[] }>;
  get(path: string): HTMLImageElement | null;
}

export interface Renderer {
  /** Re-read canvas size and devicePixelRatio. Call when layout changes. */
  resize(): void;
  draw(state: RenderState, opts: { debug: boolean }): void;
  /** Canvas-relative CSS pixel -> world coordinates for the last drawn view. */
  screenToWorld(px: number, py: number): { x: number; y: number };
  worldToScreen(wx: number, wy: number): { x: number; y: number };
  destroy(): void;
}

export interface InputSource {
  /** Drain queued events into one InputFrame (called once per tick). */
  frame(): InputFrame;
  destroy(): void;
}

// ---------- ui/ contract ----------

/** The slice of the running game that DOM widgets may read and call. */
export interface UiHost {
  /** game.ui array (already parsed JSON). */
  readonly widgets: readonly JsonObject[];
  getScene(): string;
  getVars(): Readonly<Record<string, Json>>;
  /** Lines of a `list`/`log` widget by id (newest last). */
  getLog(id: string): readonly string[];
  /** Panels/modals that are currently opened by id. */
  isOpen(id: string): boolean;
  /** Called when a button is pressed. */
  click(id: string): void;
}

export interface UiHandle {
  /** Re-read host state and patch the DOM. Called once per rendered frame; must be cheap. */
  update(): void;
  destroy(): void;
}
