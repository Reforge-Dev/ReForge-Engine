import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { World } from "./world";

// Properties P2 and P3 (design.md section 8): ids and deferred removal.

type Op =
  | { k: "add"; type: string; id: string | undefined; tags: string[]; mover: boolean }
  | { k: "remove"; pick: number }
  | { k: "removeUnknown" }
  | { k: "flush" }
  | { k: "clear" };

const opArb: fc.Arbitrary<Op> = fc.oneof(
  {
    weight: 5,
    arbitrary: fc.record({
      k: fc.constant("add" as const),
      type: fc.constantFrom("a", "b"),
      // Authored ids deliberately look like generated ones ("a-1") to provoke clashes.
      id: fc.option(fc.constantFrom("a-1", "a-2", "b-1", "x", "y"), { nil: undefined }),
      tags: fc.subarray(["t1", "t2", "t3"]),
      mover: fc.boolean(),
    }),
  },
  { weight: 3, arbitrary: fc.record({ k: fc.constant("remove" as const), pick: fc.nat(50) }) },
  { weight: 1, arbitrary: fc.constant({ k: "removeUnknown" as const }) },
  { weight: 2, arbitrary: fc.constant({ k: "flush" as const }) },
  { weight: 1, arbitrary: fc.constant({ k: "clear" as const }) },
);

interface Model {
  /** Ids in insertion order, live or pending removal (the World keeps both until flush). */
  inMap: { id: string; tags: string[]; type: string; mover: boolean }[];
  pending: Set<string>;
  /** Every id the World has ever returned from add(). */
  issued: Set<string>;
}

function checkInvariants(world: World, m: Model): void {
  const live = m.inMap.filter((e) => !m.pending.has(e.id));
  expect(world.all().map((e) => e.id)).toEqual(live.map((e) => e.id));
  expect(new Set(world.all().map((e) => e.id)).size).toBe(world.all().length);
  expect(world.count()).toBe(live.length);
  for (const tag of ["t1", "t2", "t3"]) {
    expect(world.queryByTag(tag).map((e) => e.id)).toEqual(
      live.filter((e) => e.tags.includes(tag)).map((e) => e.id),
    );
  }
  for (const type of ["a", "b"]) {
    expect(world.queryByType(type).map((e) => e.id)).toEqual(
      live.filter((e) => e.type === type).map((e) => e.id),
    );
  }
  expect(world.queryByComponent("mover").map((e) => e.id)).toEqual(
    live.filter((e) => e.mover).map((e) => e.id),
  );
  // P3: an entity waiting for removal is in no query but can still be fetched by id.
  for (const id of m.pending) {
    expect(world.all().some((e) => e.id === id)).toBe(false);
    expect(world.getById(id)).toBeDefined();
    expect(world.isRemoved(id)).toBe(true);
  }
}

describe("World (properties)", () => {
  it("P2/P3: generated ids are never reused, queries equal a naive filter, pending removals are hidden", () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 60 }), (ops) => {
        const world = new World();
        const m: Model = { inMap: [], pending: new Set(), issued: new Set() };
        for (const op of ops) {
          if (op.k === "add") {
            const e = world.add({
              type: op.type,
              ...(op.id === undefined ? {} : { id: op.id }),
              tags: op.tags,
              x: 0,
              y: 0,
              components: op.mover ? { mover: {} } : {},
            });
            const taken = m.inMap.some((x) => x.id === op.id);
            if (op.id !== undefined && !taken) {
              // A free authored id is used as given, so scene reloads keep stable ids.
              expect(e.id).toBe(op.id);
            } else {
              // A generated id must be brand new: not live, not pending, and never issued before.
              expect(m.issued.has(e.id)).toBe(false);
              expect(m.inMap.some((x) => x.id === e.id)).toBe(false);
            }
            m.issued.add(e.id);
            m.inMap.push({ id: e.id, tags: op.tags, type: op.type, mover: op.mover });
          } else if (op.k === "remove") {
            const target = m.inMap[op.pick % Math.max(1, m.inMap.length)];
            if (target) {
              world.remove(target.id);
              m.pending.add(target.id);
            }
          } else if (op.k === "removeUnknown") {
            world.remove("no-such-id");
          } else if (op.k === "flush") {
            const removed = world.flush();
            expect(new Set(removed)).toEqual(m.pending);
            m.inMap = m.inMap.filter((e) => !m.pending.has(e.id));
            m.pending = new Set();
          } else {
            world.clear();
            m.inMap = [];
            m.pending = new Set();
          }
          checkInvariants(world, m);
        }
      }),
      { numRuns: 300 },
    );
  });
});
