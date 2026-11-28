import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createSimulation } from "../index";
import type { InputFrame } from "../types";
import { EMPTY_INPUT } from "../types";

// Property P1 (design.md section 8): same game JSON + seed + input script => identical state.

/** Exercises movers, solids, AI, health, timers, tables, the RNG, selection and rules. */
const fixture = {
  meta: { title: "prop", version: 1, startScene: "main" },
  variables: { score: 0, hurt: 0 },
  tables: {
    waves: [
      { id: "w1", weight: 1, hosts: ["slot-a", "slot-b"] },
      { id: "w2", weight: 3, hosts: ["slot-b"] },
    ],
  },
  entityTypes: {
    hero: {
      tags: ["hero"],
      components: {
        shape: { w: 10, h: 10 },
        collider: { w: 10, h: 10 },
        mover: { mode: "topdown", speed: 70 },
        health: { max: 5 },
      },
    },
    wall: { tags: ["wall"], components: { collider: { w: 12, h: 60, solid: true } } },
    coin: { tags: ["pickup"], components: { collider: { w: 8, h: 8 } } },
    chaser: {
      tags: ["foe"],
      components: {
        collider: { w: 8, h: 8 },
        ai: { mode: "chase", speed: 30, target: "hero" },
        health: { max: 2 },
      },
    },
    slot: { components: { collider: { w: 6, h: 6 } } },
  },
  scenes: [
    {
      id: "main",
      size: [200, 120],
      entities: [
        { type: "hero", x: 20, y: 60 },
        { type: "wall", x: 100, y: 60 },
        { type: "coin", x: 40, y: 60 },
        { type: "coin", x: 60, y: 30 },
        { type: "chaser", x: 180, y: 100 },
        { type: "slot", x: 150, y: 20, id: "slot-a" },
        { type: "slot", x: 170, y: 20, id: "slot-b" },
      ],
    },
  ],
  rules: [
    {
      id: "wave-clock",
      when: { event: "start" },
      then: [{ do: "startTimer", id: "wave", seconds: 0.5, repeat: true }],
    },
    {
      id: "wave",
      when: { event: "timer", id: "wave" },
      if: [{ cond: "random", chance: 0.6 }],
      then: [{ do: "spawnFromTable", table: "waves", maxActive: 2 }],
    },
    {
      id: "wave-spawned",
      when: { event: "custom", name: "spawned" },
      then: [
        { do: "spawn", type: "chaser", at: "self", x: 4, y: 4 },
        { do: "log", text: "wave at {self.id}", to: "feed" },
      ],
    },
    {
      id: "take-coin",
      when: { event: "collide", a: "hero", b: "pickup" },
      then: [
        { do: "addVar", var: "score", by: 1 },
        { do: "destroy", target: "other" },
      ],
    },
    {
      id: "hurt",
      when: { event: "collide", a: "hero", b: "foe" },
      then: [
        { do: "damage", target: "self", amount: 1 },
        { do: "addVar", var: "hurt", by: 1 },
        { do: "destroy", target: "other" },
      ],
    },
    { id: "lose", when: { event: "died", target: "hero" }, then: [{ do: "lose" }] },
    {
      id: "drop-coin",
      when: { event: "key", key: "Space" },
      then: [{ do: "spawn", type: "coin", at: "hero", x: 12, y: 0 }],
    },
    {
      id: "pick",
      when: { event: "click", target: "foe" },
      then: [
        { do: "selectEntity", target: "self" },
        { do: "damage", target: "selected", amount: 1 },
      ],
    },
    {
      id: "heal-all",
      when: { event: "key", key: "KeyE" },
      then: [{ do: "forEach", target: "tag:hero", then: [{ do: "heal", amount: 1 }] }],
    },
    {
      id: "win",
      when: { event: "varChanged", var: "score" },
      if: [{ cond: "varGt", var: "score", value: 9 }],
      then: [{ do: "win" }],
    },
  ],
  ui: [{ widget: "text", text: "score {score}" }],
};

const KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"];
const frameArb: fc.Arbitrary<InputFrame> = fc.record({
  down: fc.subarray(KEYS).map((k) => [...k].sort()),
  pressed: fc.subarray(["Space", "KeyE"]),
  released: fc.constant<string[]>([]),
  mouse: fc.record({ x: fc.integer({ min: 0, max: 200 }), y: fc.integer({ min: 0, max: 120 }) }),
  clicks: fc.array(
    fc.record({
      x: fc.integer({ min: 0, max: 200 }),
      y: fc.integer({ min: 0, max: 120 }),
      button: fc.constant(0),
    }),
    { maxLength: 1 },
  ),
});

describe("Simulation (properties)", () => {
  it("the fixture really runs rules, timers and the RNG", () => {
    const sim = createSimulation(fixture, { seed: 7 });
    for (let i = 0; i < 300; i++) sim.step(EMPTY_INPUT);
    expect(sim.world.queryByTag("foe").length).toBeGreaterThan(1);
    expect(sim.getState().rng).not.toBe(7);
  });

  it("P1: same game, seed and input script give identical state after every tick", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.array(frameArb, { minLength: 1, maxLength: 90 }),
        (seed, frames) => {
          const before = JSON.stringify(fixture);
          const a = createSimulation(fixture, { seed });
          const b = createSimulation(structuredClone(fixture), { seed });
          for (const frame of frames) {
            a.step(frame);
            b.step(frame);
            expect(b.getState()).toEqual(a.getState());
          }
          // The game JSON is never mutated by running it (R5.3).
          expect(JSON.stringify(fixture)).toBe(before);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("P1: restart reproduces the first run exactly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.array(frameArb, { minLength: 1, maxLength: 60 }),
        (seed, frames) => {
          const sim = createSimulation(fixture, { seed });
          for (const f of frames) sim.step(f);
          const first = sim.getState();
          sim.reset();
          for (const f of frames) sim.step(f);
          expect(sim.getState()).toEqual(first);
        },
      ),
      { numRuns: 60 },
    );
  });
});
