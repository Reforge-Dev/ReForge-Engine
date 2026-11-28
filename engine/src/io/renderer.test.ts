import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { AssetStore, Entity, JsonObject, RenderState } from "../types";
import { createRenderer } from "./renderer";
import { fitView, toScreen, toWorld } from "./transform";

interface Call {
  name: string;
  args: unknown[];
  fill: unknown;
}

function fakeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; calls: Call[] } {
  const calls: Call[] = [];
  const store: Record<string, unknown> = {};
  const ctx = new Proxy(store, {
    get(target, key) {
      if (typeof key !== "string") return undefined;
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push({ name: key, args, fill: target.fillStyle });
      };
    },
    set(target, key, value) {
      target[String(key)] = value;
      return true;
    },
  });
  const canvas = {
    clientWidth: w,
    clientHeight: h,
    width: w,
    height: h,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
  return { canvas, calls };
}

const noAssets: AssetStore = {
  resolve: (p) => p,
  preload: () => Promise.resolve({ failed: [] }),
  get: () => null,
};

function entity(
  id: string,
  x: number,
  y: number,
  components: Record<string, JsonObject>,
  props: JsonObject = {},
): Entity {
  return Object.freeze({
    id,
    type: "t",
    tags: new Set<string>(),
    x,
    y,
    props: Object.freeze(props),
    components: Object.freeze(components),
  });
}

function stateOf(entities: Entity[], size: [number, number] = [200, 100]): RenderState {
  return {
    sceneId: "s",
    size,
    view: { x: 0, y: 0, w: size[0], h: size[1] },
    entities,
    byId: new Map(entities.map((e) => [e.id, e])),
  };
}

const rects = (calls: Call[]): unknown[] =>
  calls.filter((c) => c.name === "fillRect").map((c) => c.fill);

describe("transform", () => {
  const view = fc.record({
    x: fc.integer({ min: -500, max: 500 }),
    y: fc.integer({ min: -500, max: 500 }),
    w: fc.integer({ min: 1, max: 2000 }),
    h: fc.integer({ min: 1, max: 2000 }),
  });
  it("screen and world conversions are inverses", () => {
    fc.assert(
      fc.property(
        view,
        fc.integer({ min: 1, max: 3000 }),
        fc.integer({ min: 1, max: 3000 }),
        fc.double({ min: -5000, max: 5000, noNaN: true }),
        fc.double({ min: -5000, max: 5000, noNaN: true }),
        (v, cw, ch, px, py) => {
          const t = fitView(v, cw, ch);
          const w = toWorld(t, px, py);
          const s = toScreen(t, w.x, w.y);
          expect(s.x).toBeCloseTo(px, 6);
          expect(s.y).toBeCloseTo(py, 6);
        },
      ),
    );
  });

  it("fits uniformly and centers", () => {
    const t = fitView({ x: 0, y: 0, w: 100, h: 50 }, 400, 400);
    expect(t.scale).toBe(4);
    expect(t.ox).toBe(0);
    expect(t.oy).toBe(100);
  });
});

describe("createRenderer", () => {
  it("exposes inverse coordinate transforms for the last drawn view", () => {
    const { canvas } = fakeCanvas(640, 480);
    const r = createRenderer(canvas, noAssets);
    r.draw(stateOf([]), { debug: false });
    const w = r.screenToWorld(320, 240);
    expect(w.x).toBeCloseTo(100);
    expect(w.y).toBeCloseTo(50);
    const s = r.worldToScreen(w.x, w.y);
    expect(s.x).toBeCloseTo(320);
    expect(s.y).toBeCloseTo(240);
    const bars = r.screenToWorld(0, 0);
    expect(bars.y).toBeLessThan(0);
  });

  it("sorts by layer, then y, then id and does not mutate state", () => {
    const { canvas, calls } = fakeCanvas(200, 100);
    const shape = (color: string, layer = 0): JsonObject => ({ w: 4, h: 4, color, layer });
    const list = [
      entity("a", 5, 0, { shape: shape("#111111", 1) }),
      entity("b", 5, 10, { shape: shape("#222222") }),
      entity("c", 5, 5, { shape: shape("#333333") }),
    ];
    const state = stateOf(list);
    createRenderer(canvas, noAssets).draw(state, { debug: false });
    expect(rects(calls).slice(2)).toEqual(["#333333", "#222222", "#111111"]);
    expect(state.entities.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("draws a magenta placeholder for a missing sprite and skips undrawable entities", () => {
    const { canvas, calls } = fakeCanvas(200, 100);
    const list = [
      entity("s", 10, 10, { sprite: { image: "nope.png", w: 8, h: 8 } }),
      entity("n", 20, 20, { health: { max: 3 } }),
    ];
    createRenderer(canvas, noAssets).draw(stateOf(list), { debug: false });
    expect(rects(calls).slice(2)).toEqual(["#ff00ff"]);
  });

  it("colors node entities by status and draws each link once", () => {
    const { canvas, calls } = fakeCanvas(200, 100);
    const node = { node: { status: "healthy" }, shape: { w: 6, h: 6, color: "#123456" } };
    const list = [
      entity("a", 10, 10, node, { links: ["b"], status: "haunted" }),
      entity("b", 50, 10, node, { links: ["a", "ghost-id"] }),
    ];
    createRenderer(canvas, noAssets).draw(stateOf(list), { debug: false });
    expect(calls.filter((c) => c.name === "stroke")).toHaveLength(1);
    expect(rects(calls).slice(2)).toEqual(["#e07a3d", "#8aa384"]);
  });

  it("draws a circle when shape.kind is circle (and accepts shape.shape as a fallback)", () => {
    const bodies: JsonObject[] = [
      { kind: "circle", w: 6, h: 6 },
      { shape: "circle", w: 6, h: 6 },
    ];
    for (const body of bodies) {
      const { canvas, calls } = fakeCanvas(200, 100);
      createRenderer(canvas, noAssets).draw(stateOf([entity("c", 10, 10, { shape: body })]), {
        debug: false,
      });
      expect(calls.some((c) => c.name === "ellipse")).toBe(true);
      expect(rects(calls)).toHaveLength(2);
    }
    const { canvas, calls } = fakeCanvas(200, 100);
    createRenderer(canvas, noAssets).draw(
      stateOf([entity("r", 10, 10, { shape: { kind: "rect", w: 6, h: 6 } })]),
      { debug: false },
    );
    expect(calls.some((c) => c.name === "ellipse")).toBe(false);
  });

  it("draws collider boxes and ids in debug mode only", () => {
    const list = [
      entity("p", 10, 10, { shape: { w: 4, h: 4 }, collider: { w: 6, h: 6, offset: [1, 1] } }),
    ];
    const off = fakeCanvas(200, 100);
    createRenderer(off.canvas, noAssets).draw(stateOf(list), { debug: false });
    expect(off.calls.some((c) => c.name === "strokeRect")).toBe(false);
    const on = fakeCanvas(200, 100);
    createRenderer(on.canvas, noAssets).draw(stateOf(list), { debug: true });
    expect(on.calls.find((c) => c.name === "strokeRect")?.args).toEqual([8, 8, 6, 6]);
    expect(on.calls.some((c) => c.name === "fillText")).toBe(true);
  });
});
