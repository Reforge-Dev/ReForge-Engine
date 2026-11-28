import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Entity } from "../types";
import { collisionPairs, colliderBox, moveWithCollision, overlap } from "./geometry";
import type { Box } from "./geometry";

// Properties P4 and P5 (design.md section 8).

const coord = fc.double({ min: -100, max: 100, noNaN: true });
const size = fc.double({ min: 1, max: 50, noNaN: true });
/** One tick of movement. 10 px per tick is 600 px/s, above any speed the games use. */
const step = fc.double({ min: -10, max: 10, noNaN: true });
const boxArb: fc.Arbitrary<Box> = fc.record({ x: coord, y: coord, w: size, h: size });

function entity(id: string, b: Box, solid: boolean): Entity {
  return {
    id,
    type: "t",
    tags: new Set(),
    x: b.x,
    y: b.y,
    props: {},
    components: { collider: { w: b.w, h: b.h, solid } },
  };
}

describe("overlap and collisionPairs (properties)", () => {
  it("P5: overlap is symmetric and a box overlaps itself only if it has area", () => {
    fc.assert(
      fc.property(boxArb, boxArb, (a, b) => {
        expect(overlap(a, b)).toBe(overlap(b, a));
        expect(overlap(a, a)).toBe(true);
      }),
    );
  });

  it("P5: pairs are sorted, unique, free of self-pairs, and equal the naive O(n^2) answer", () => {
    fc.assert(
      fc.property(fc.array(boxArb, { maxLength: 25 }), (boxes) => {
        const list = boxes.map((b, i) => entity(`e${String(i).padStart(2, "0")}`, b, false));
        const pairs = collisionPairs(list);
        const naive: string[] = [];
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = colliderBox(list[i] as Entity);
            const b = colliderBox(list[j] as Entity);
            if (a && b && overlap(a, b))
              naive.push(`${(list[i] as Entity).id}|${(list[j] as Entity).id}`);
          }
        }
        const got = pairs.map(([a, b]) => `${a}|${b}`);
        for (const [a, b] of pairs) expect(a < b).toBe(true);
        expect(new Set(got).size).toBe(got.length);
        expect(got).toEqual([...got].sort());
        expect(got).toEqual(naive.sort());
      }),
      { numRuns: 300 },
    );
  });
});

describe("moveWithCollision (properties)", () => {
  it("P4: a mover never ends inside a solid it did not already overlap", () => {
    fc.assert(
      fc.property(
        boxArb,
        step,
        step,
        fc.array(boxArb, { maxLength: 8 }),
        (moverBox, dx, dy, solidBoxes) => {
          const mover = entity("mover", moverBox, false);
          const solids = solidBoxes.map((b, i) => entity(`s${i}`, b, true));
          const startBox = colliderBox(mover) as Box;
          const clear = solids.filter((s) => !overlap(startBox, colliderBox(s) as Box));
          moveWithCollision(mover, dx, dy, [...solids, mover]);
          const end = colliderBox(mover) as Box;
          for (const s of clear) {
            expect(overlap(end, colliderBox(s) as Box)).toBe(false);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("P4: an entity without a collider just moves", () => {
    fc.assert(
      fc.property(coord, coord, step, step, (x, y, dx, dy) => {
        const e: Entity = {
          id: "free",
          type: "t",
          tags: new Set(),
          x,
          y,
          props: {},
          components: {},
        };
        moveWithCollision(e, dx, dy, []);
        expect(e.x).toBe(x + dx);
        expect(e.y).toBe(y + dy);
      }),
    );
  });
});
