import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateGame } from "./validate";

const root = resolve(__dirname, "../../..");
const readJson = (rel: string): unknown =>
  JSON.parse(readFileSync(resolve(root, rel), "utf8")) as unknown;

const minimal = (): Record<string, unknown> => ({
  meta: { title: "t", startScene: "a" },
  entityTypes: { thing: {} },
  scenes: [{ id: "a", size: [10, 10], entities: [{ type: "thing", x: 1, y: 2 }] }],
});

describe("validateGame", () => {
  it("accepts a minimal game", () => {
    expect(validateGame(minimal())).toEqual({ ok: true, errors: [] });
  });

  it("accepts examples/hello/game.json", () => {
    const result = validateGame(readJson("examples/hello/game.json"));
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("reports JSON-pointer paths with plain messages", () => {
    const game = minimal();
    (game.scenes as { entities: unknown[] }[])[0]?.entities.push({ type: "nope", x: "1", y: 2 });
    const { errors } = validateGame(game);
    expect(errors.map((e) => e.path)).toEqual([
      "/scenes/0/entities/1/type",
      "/scenes/0/entities/1/x",
    ]);
    expect(errors[0]?.message).toContain("Unknown entity type");
  });

  it("checks required keys, start scene, unique ids and sizes", () => {
    const game = minimal();
    game.meta = { title: "t", startScene: "missing" };
    game.scenes = [
      {
        id: "a",
        size: [0, 5],
        entities: [
          { type: "thing", x: 0, y: 0, id: "e" },
          { type: "thing", x: 0, y: 0, id: "e" },
        ],
      },
      { id: "a", size: [1, 1], entities: [] },
    ];
    const paths = validateGame(game).errors.map((e) => e.path);
    expect(paths).toContain("/meta/startScene");
    expect(paths).toContain("/scenes/0/size");
    expect(paths).toContain("/scenes/0/entities/1/id");
    expect(paths).toContain("/scenes/1/id");
    expect(validateGame({}).errors.map((e) => e.path)).toEqual([
      "/entityTypes",
      "/meta",
      "/scenes",
    ]);
  });

  it("does not reject unknown behavior, component or field names", () => {
    const game = minimal();
    game.rules = [
      {
        when: { event: "somethingNew" },
        if: [{ cond: "madeUp" }],
        then: [{ do: "alsoMadeUp", extra: 1 }],
        note: "x",
      },
    ];
    game.ui = [{ widget: "hologram" }];
    (game.entityTypes as Record<string, unknown>).thing = {
      components: { teleporter: { range: 3 } },
      whatever: true,
    };
    game.tables = { loot: [{ id: "a" }] };
    game.variables = { hp: 3, name: "x", list: [1], obj: { a: 1 }, nothing: null };
    expect(validateGame(game).errors).toEqual([]);
  });

  it("validates rules, ui, tables and variables structure", () => {
    const game = minimal();
    game.rules = [{ when: {}, if: [{}], then: [{ do: 1 }] }, "bad"];
    game.ui = [{ widget: 1 }];
    game.tables = { t: "no" };
    game.variables = { f: () => 1 };
    const paths = validateGame(game).errors.map((e) => e.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/rules/0/when/event",
        "/rules/0/if/0",
        "/rules/0/then/0",
        "/rules/1",
        "/ui/0",
        "/tables/t",
        "/variables/f",
      ]),
    );
  });

  it("is deterministic and sorted", () => {
    const game = { meta: 1, scenes: [1, 2], entityTypes: [] };
    const a = validateGame(game);
    expect(validateGame(game)).toEqual(a);
    const paths = a.errors.map((e) => e.path);
    expect(paths).toEqual([...paths].sort());
  });

  it("caps the number of errors", () => {
    const game = minimal();
    game.scenes = [{ id: "a", size: [1, 1], entities: Array.from({ length: 500 }, () => 7) }];
    expect(validateGame(game).errors).toHaveLength(100);
  });
});

describe("validateGame never throws (R10.4)", () => {
  const cyclic: Record<string, unknown> = {
    meta: { title: "t", startScene: "a" },
    entityTypes: {},
    scenes: [],
  };
  cyclic.self = cyclic;
  (cyclic.meta as Record<string, unknown>).loop = cyclic;
  let deep: Record<string, unknown> = {};
  const deepRoot = deep;
  for (let i = 0; i < 5000; i++) {
    const next: Record<string, unknown> = {};
    deep.next = next;
    deep = next;
  }
  const evil = new Proxy(
    {},
    {
      get() {
        throw new Error("boom");
      },
      has() {
        throw new Error("boom");
      },
      ownKeys() {
        throw new Error("boom");
      },
    },
  );
  const inputs: [string, unknown][] = [
    ["null", null],
    ["undefined", undefined],
    ["number", 42],
    ["NaN", Number.NaN],
    ["string", "game"],
    ["boolean", true],
    ["array", [1, 2, 3]],
    ["empty array", []],
    ["cyclic", cyclic],
    ["deeply nested", deepRoot],
    [
      "deeply nested in meta",
      {
        meta: deepRoot,
        entityTypes: deepRoot,
        scenes: [deepRoot],
        rules: [deepRoot],
        ui: [deepRoot],
        variables: deepRoot,
      },
    ],
    ["throwing proxy", evil],
    ["function", () => 1],
    ["symbol", Symbol("s")],
    ["bigint", BigInt(1)],
  ];
  for (const [name, input] of inputs) {
    it(`handles ${name}`, () => {
      const result = validateGame(input);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});
