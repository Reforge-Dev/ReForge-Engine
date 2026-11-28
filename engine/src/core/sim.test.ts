import { describe, expect, it } from "vitest";
import { createSimulation } from "../index";
import type { InputFrame } from "../types";
import { EMPTY_INPUT } from "../types";

const hold = (...keys: string[]): InputFrame => ({ ...EMPTY_INPUT, down: keys, pressed: [] });

function run(
  sim: ReturnType<typeof createSimulation>,
  ticks: number,
  input: InputFrame = EMPTY_INPUT,
) {
  for (let i = 0; i < ticks; i++) sim.step(input);
}

const base = {
  meta: { title: "t", version: 1, startScene: "main" },
  variables: { keys: 0, hp: 5 },
  entityTypes: {
    player: {
      tags: ["player"],
      components: {
        shape: { w: 10, h: 10 },
        collider: { w: 10, h: 10 },
        mover: { mode: "topdown", speed: 60 },
      },
    },
    wall: { components: { shape: { w: 10, h: 40 }, collider: { w: 10, h: 40, solid: true } } },
    key: { tags: ["pickup"], components: { collider: { w: 8, h: 8 } } },
  },
  scenes: [
    {
      id: "main",
      size: [200, 100],
      entities: [
        { type: "player", x: 20, y: 50 },
        { type: "wall", x: 60, y: 50 },
        { type: "key", x: 20, y: 90 },
      ],
    },
  ],
};

describe("movement", () => {
  it("moves at speed px/s and is stopped by a solid wall", () => {
    const sim = createSimulation(base);
    run(sim, 60, hold("ArrowRight"));
    const p = sim.world.queryByTag("player")[0];
    // wall left edge is 55, player half width 5 => rests at x=50
    expect(p?.x).toBeCloseTo(50, 5);
    expect(p?.y).toBe(50);
  });

  it("normalizes diagonal speed", () => {
    const sim = createSimulation(base);
    run(sim, 30, hold("ArrowDown", "ArrowLeft"));
    const p = sim.world.queryByTag("player")[0];
    expect(Math.hypot((p?.x ?? 0) - 20, (p?.y ?? 0) - 50)).toBeCloseTo(30, 3);
  });
});

describe("rules", () => {
  const game = {
    ...base,
    rules: [
      {
        id: "pickup",
        when: { event: "collide", a: "player", b: "key" },
        if: [{ cond: "varLt", var: "keys", value: 3 }],
        then: [
          { do: "addVar", var: "keys", by: 1 },
          { do: "destroy", target: "other" },
          { do: "showText", text: "keys: {keys}" },
        ],
      },
    ],
  };

  it("runs collide rules once, with self=player and other=key", () => {
    const sim = createSimulation(game);
    run(sim, 60, hold("ArrowDown"));
    expect(sim.vars["keys"]).toBe(1);
    expect(sim.world.queryByTag("pickup")).toHaveLength(0);
    expect(sim.logs["messages"]).toEqual(["keys: 1"]);
  });

  it("is deterministic for a seed and input script", () => {
    const a = createSimulation(game, { seed: 7 });
    const b = createSimulation(game, { seed: 7 });
    run(a, 90, hold("ArrowDown"));
    run(b, 90, hold("ArrowDown"));
    expect(a.getState()).toEqual(b.getState());
  });

  it("reports unknown actions once and keeps running", () => {
    const sim = createSimulation({
      ...base,
      rules: [{ when: { event: "tick" }, then: [{ do: "nope" }] }],
    });
    const errors: unknown[] = [];
    sim.on("error", (e) => errors.push(e));
    run(sim, 5);
    expect(errors).toHaveLength(1);
  });

  it("fires timers after the right number of ticks and hands over data", () => {
    const sim = createSimulation({
      ...base,
      rules: [
        {
          when: { event: "start" },
          then: [{ do: "startTimer", id: "t", seconds: 0.5, data: { who: "bob" } }],
        },
        {
          when: { event: "timer", id: "t" },
          then: [{ do: "setVar", var: "name", value: "$timer.who" }],
        },
      ],
    });
    run(sim, 29);
    expect(sim.vars["name"]).toBeUndefined();
    run(sim, 3);
    expect(sim.vars["name"]).toBe("bob");
  });

  it("button clicks reach rules and changeScene applies immediately", () => {
    const sim = createSimulation({
      ...base,
      scenes: [
        ...base.scenes,
        { id: "two", size: [100, 100], entities: [{ type: "key", x: 5, y: 5, id: "spot" }] },
      ],
      rules: [
        {
          when: { event: "click", target: "go" },
          then: [
            { do: "changeScene", scene: "two" },
            { do: "setProp", target: "spot", prop: "status", value: "ready" },
          ],
        },
      ],
    });
    sim.uiClick("go");
    sim.step();
    expect(sim.sceneId).toBe("two");
    expect(sim.world.getById("spot")?.props["status"]).toBe("ready");
  });
});

describe("table placement, per-entity timers, forEach", () => {
  const game = {
    meta: { title: "g", version: 1, startScene: "floor" },
    variables: { breach: 0, spawned: 0 },
    tables: {
      incidents: [
        { id: "a", weight: 1, hosts: ["n1", "n2"], rate: 2, correct: "fix" },
        { id: "b", weight: 1, hosts: ["n1"], rate: 4, correct: "fix" },
      ],
    },
    entityTypes: { node: { tags: ["node"], components: { shape: { w: 10, h: 10 } } } },
    scenes: [
      {
        id: "floor",
        size: [100, 100],
        entities: [
          { type: "node", id: "n1", x: 10, y: 10, links: ["n2"] },
          { type: "node", id: "n2", x: 50, y: 10 },
        ],
      },
    ],
    rules: [
      {
        when: { event: "start" },
        then: [
          {
            do: "spawnFromTable",
            table: "incidents",
            id: "a",
            host: "n1",
            status: "haunted",
            markTag: "haunted",
            countVar: "spawned",
          },
          {
            do: "spawnFromTable",
            table: "incidents",
            markTag: "haunted",
            maxActive: 2,
            countVar: "spawned",
          },
          {
            do: "spawnFromTable",
            table: "incidents",
            markTag: "haunted",
            maxActive: 2,
            countVar: "spawned",
          },
          { do: "startTimer", id: "second", seconds: 1, repeat: true },
        ],
      },
      {
        when: { event: "custom", name: "spawned" },
        then: [
          { do: "startTimer", id: "respond", seconds: 2, target: "self", data: { answer: "fix" } },
        ],
      },
      {
        when: { event: "timer", id: "second" },
        then: [
          {
            do: "forEach",
            target: "tag:haunted",
            then: [{ do: "addVar", var: "breach", by: "$self.row.rate" }],
          },
        ],
      },
      {
        when: { event: "timer", id: "respond" },
        if: [{ cond: "compare", left: "$timer.answer", op: "==", right: "$self.row.correct" }],
        then: [
          { do: "removeTag", tag: "haunted" },
          { do: "setProp", prop: "status", value: "healthy" },
        ],
      },
    ],
  };

  it("never puts two rows on one host and respects maxActive", () => {
    const sim = createSimulation(game, { seed: 3 });
    run(sim, 1);
    const haunted = sim.world.queryByTag("haunted");
    expect(haunted.length).toBeLessThanOrEqual(2);
    expect(new Set(haunted.map((e) => e.id)).size).toBe(haunted.length);
    expect(sim.world.getById("n1")?.props["status"]).toBe("haunted");
  });

  it("adds per-entity values each second and clears on a correct timed response", () => {
    const sim = createSimulation(game, { seed: 3 });
    run(sim, 61);
    const afterOne = sim.vars["breach"] as number;
    expect(afterOne).toBeGreaterThanOrEqual(2);
    run(sim, 61);
    expect(sim.world.queryByTag("haunted")).toHaveLength(0);
    expect(sim.world.getById("n1")?.props["status"]).toBe("healthy");
    const frozen = sim.vars["breach"];
    run(sim, 120);
    expect(sim.vars["breach"]).toBe(frozen);
  });
});

describe("win and lose", () => {
  it("stops the clock after win but still handles clicks", () => {
    const sim = createSimulation({
      ...base,
      rules: [{ when: { event: "start" }, then: [{ do: "win" }] }],
    });
    const seen: string[] = [];
    sim.on("win", () => seen.push("win"));
    run(sim, 3);
    expect(seen).toEqual(["win"]);
    expect(sim.getState().ended).toBe("win");
  });
});

describe("condition negation", () => {
  it("not:true inverts any condition", () => {
    const sim = createSimulation({
      ...base,
      rules: [
        {
          when: { event: "start" },
          if: [{ cond: "varGt", var: "keys", value: 0, not: true }],
          then: [{ do: "setVar", var: "ok", value: true }],
        },
      ],
    });
    run(sim, 2);
    expect(sim.vars["ok"]).toBe(true);
  });
});

describe("click hit-testing follows draw order", () => {
  const stacked = (sortBy?: string) => ({
    meta: { title: "t", version: 1, startScene: "s" },
    variables: { hit: "" },
    entityTypes: { card: { tags: ["card"], components: { shape: { w: 20, h: 20 } } } },
    scenes: [
      {
        id: "s",
        size: [100, 100],
        ...(sortBy === undefined ? {} : { sortBy }),
        // "low" has the larger y but comes first in the array.
        entities: [
          { type: "card", id: "low", x: 50, y: 55 },
          { type: "card", id: "high", x: 50, y: 50 },
        ],
      },
    ],
    rules: [
      {
        when: { event: "click", target: "card" },
        then: [{ do: "setVar", var: "hit", value: "$self.id" }],
      },
    ],
  });
  const clickAt = (x: number, y: number): InputFrame => ({
    ...EMPTY_INPUT,
    clicks: [{ x, y, button: 0 }],
  });

  it("clicks the entity later in the array by default", () => {
    const sim = createSimulation(stacked());
    sim.step(clickAt(50, 52));
    expect(sim.vars["hit"]).toBe("high");
    expect(sim.renderState().sortBy).toBe("order");
  });

  it("clicks the entity with the larger y when the scene sets sortBy y", () => {
    const sim = createSimulation(stacked("y"));
    sim.step(clickAt(50, 52));
    expect(sim.vars["hit"]).toBe("low");
    expect(sim.renderState().sortBy).toBe("y");
  });
});
