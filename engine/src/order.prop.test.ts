import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { layerOf, sortForDraw } from "./order";
import type { SortBy } from "./order";
import type { Entity, JsonObject } from "./types";

// Property P9 (design.md section 8): reordering the entity array changes draw order inside a
// layer and never across layers.

interface Spec {
  layer: number;
  y: number;
  onSprite: boolean;
}

const specArb: fc.Arbitrary<Spec> = fc.record({
  layer: fc.integer({ min: -2, max: 2 }),
  y: fc.integer({ min: 0, max: 5 }),
  onSprite: fc.boolean(),
});

function build(specs: Spec[]): Entity[] {
  return specs.map((s, i): Entity => {
    const body: JsonObject = { w: 4, h: 4, layer: s.layer };
    return {
      id: `e${i}`,
      type: "t",
      tags: new Set<string>(),
      x: 0,
      y: s.y,
      props: {},
      components: s.onSprite ? { sprite: { ...body, image: "a.png" } } : { shape: body },
    };
  });
}

/** An array of entities plus a permutation of it. */
const listAndShuffle = fc
  .array(specArb, { maxLength: 30 })
  .map(build)
  .chain((list) =>
    fc
      .shuffledSubarray(list, { minLength: list.length, maxLength: list.length })
      .map((shuffled) => ({ list, shuffled })),
  );

const sortByArb = fc.constantFrom<SortBy>("order", "y");

describe("sortForDraw (properties)", () => {
  it("P9: layers never move: any reordering gives the same layer sequence", () => {
    fc.assert(
      fc.property(listAndShuffle, sortByArb, ({ list, shuffled }, sortBy) => {
        const a = sortForDraw(list, sortBy).map(layerOf);
        const b = sortForDraw(shuffled, sortBy).map(layerOf);
        expect(b).toEqual(a);
        expect(a).toEqual([...a].sort((x, y) => x - y));
      }),
      { numRuns: 500 },
    );
  });

  it("P9: by default, order inside a layer is exactly the array order", () => {
    fc.assert(
      fc.property(listAndShuffle, ({ shuffled }) => {
        const drawn = sortForDraw(shuffled);
        for (const layer of new Set(shuffled.map(layerOf))) {
          const inArray = shuffled.filter((e) => layerOf(e) === layer).map((e) => e.id);
          const inDraw = drawn.filter((e) => layerOf(e) === layer).map((e) => e.id);
          expect(inDraw).toEqual(inArray);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("P9: moving one entity to the end of the array brings it to the front of its layer only", () => {
    fc.assert(
      fc.property(
        fc.array(specArb, { minLength: 1, maxLength: 20 }).map(build),
        fc.nat(),
        (list, pick) => {
          const moved = list[pick % list.length] as Entity;
          const front = [...list.filter((e) => e !== moved), moved];
          const before = sortForDraw(list);
          const after = sortForDraw(front);
          const sameLayer = after.filter((e) => layerOf(e) === layerOf(moved));
          expect(sameLayer.at(-1)).toBe(moved);
          // Entities on other layers keep their exact positions relative to each other.
          const others = (xs: Entity[]) =>
            xs.filter((e) => layerOf(e) !== layerOf(moved)).map((e) => e.id);
          expect(others(after)).toEqual(others(before));
        },
      ),
      { numRuns: 500 },
    );
  });

  it("P9: with sortBy y, y is non-decreasing inside a layer and ties keep array order", () => {
    fc.assert(
      fc.property(listAndShuffle, ({ shuffled }) => {
        const drawn = sortForDraw(shuffled, "y");
        for (let i = 1; i < drawn.length; i++) {
          const prev = drawn[i - 1] as Entity;
          const cur = drawn[i] as Entity;
          if (layerOf(prev) !== layerOf(cur)) continue;
          expect(prev.y).toBeLessThanOrEqual(cur.y);
          if (prev.y === cur.y) {
            expect(shuffled.indexOf(prev)).toBeLessThan(shuffled.indexOf(cur));
          }
        }
      }),
      { numRuns: 500 },
    );
  });

  it("returns a copy and leaves the input alone", () => {
    fc.assert(
      fc.property(listAndShuffle, sortByArb, ({ shuffled }, sortBy) => {
        const ids = shuffled.map((e) => e.id);
        const out = sortForDraw(shuffled, sortBy);
        expect(out).not.toBe(shuffled);
        expect(shuffled.map((e) => e.id)).toEqual(ids);
        expect(new Set(out)).toEqual(new Set(shuffled));
      }),
    );
  });
});
