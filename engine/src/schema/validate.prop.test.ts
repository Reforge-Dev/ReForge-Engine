import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  GAME_REQUIRED,
  INSTANCE_REQUIRED,
  META_REQUIRED,
  RULE_REQUIRED,
  SCENE_REQUIRED,
} from "./shared";
import { gameSchema } from "./jsonschema";
import { validateGame } from "./validate";

type Rec = Record<string, unknown>;

const name = fc.stringMatching(/^[a-z][a-z0-9-]{0,8}$/);
const finite = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 });
const jsonValue = fc.jsonValue({ maxDepth: 2 });

const validGame = fc
  .record({
    title: fc.string(),
    typeIds: fc.uniqueArray(name, { minLength: 1, maxLength: 4 }),
    sceneIds: fc.uniqueArray(name, { minLength: 1, maxLength: 3 }),
    seed: fc.integer({ min: 0, max: 1e6 }),
    vars: fc.dictionary(name, jsonValue, { maxKeys: 4 }),
    rules: fc.array(
      fc.record({
        when: fc.record({ event: name }),
        then: fc.array(fc.record({ do: name }), { maxLength: 3 }),
      }),
      { maxLength: 3 },
    ),
  })
  .chain(({ title, typeIds, sceneIds, vars, rules }) =>
    fc
      .array(fc.record({ type: fc.constantFrom(...typeIds), x: finite, y: finite }), {
        maxLength: 6,
      })
      .map((entities) => ({
        meta: { title, version: 1, startScene: sceneIds[0] },
        variables: vars,
        entityTypes: Object.fromEntries(
          typeIds.map((t) => [t, { tags: [t], components: { shape: { w: 1, h: 1 } } }]),
        ),
        scenes: sceneIds.map((id) => ({ id, size: [100, 100], entities })),
        rules,
        ui: [{ widget: "text", text: "hi" }],
      })),
  );

describe("validateGame (properties)", () => {
  it("accepts every generated valid game", () => {
    fc.assert(fc.property(validGame, (game) => validateGame(game).ok));
  });

  it("round-trips: parse, serialize, parse stays equal and valid (R10.9)", () => {
    fc.assert(
      fc.property(validGame, (game) => {
        const once = JSON.parse(JSON.stringify(game)) as unknown;
        const twice = JSON.parse(JSON.stringify(once)) as unknown;
        expect(twice).toEqual(once);
        expect(validateGame(once).ok).toBe(true);
      }),
    );
  });

  it("is deterministic", () => {
    fc.assert(
      fc.property(
        validGame,
        (game) => JSON.stringify(validateGame(game)) === JSON.stringify(validateGame(game)),
      ),
    );
  });

  it("reports an error when any top-level required key is removed", () => {
    fc.assert(
      fc.property(validGame, fc.constantFrom(...GAME_REQUIRED), (game, key) => {
        const copy = { ...game } as Rec;
        Reflect.deleteProperty(copy, key);
        const result = validateGame(copy);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.path === `/${key}`)).toBe(true);
      }),
    );
  });

  it("reports an error when a nested required key is removed", () => {
    const places: { pick: (g: Rec) => Rec | undefined; keys: readonly string[]; base: string }[] = [
      { pick: (g) => g.meta as Rec, keys: META_REQUIRED, base: "/meta" },
      { pick: (g) => (g.scenes as Rec[])[0], keys: SCENE_REQUIRED, base: "/scenes/0" },
      {
        pick: (g) => ((g.scenes as Rec[])[0]?.entities as Rec[])[0],
        keys: INSTANCE_REQUIRED,
        base: "/scenes/0/entities/0",
      },
      { pick: (g) => (g.rules as Rec[])[0], keys: RULE_REQUIRED, base: "/rules/0" },
    ];
    fc.assert(
      fc.property(validGame, fc.nat(3), fc.nat(5), (game, p, k) => {
        const copy = JSON.parse(JSON.stringify(game)) as Rec;
        const place = places[p % places.length];
        const target = place?.pick(copy);
        if (!place || !target) return; // generated game had no such element
        const key = place.keys[k % place.keys.length] as string;
        Reflect.deleteProperty(target, key);
        const result = validateGame(copy);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.path === `${place.base}/${key}`)).toBe(true);
      }),
    );
  });

  it("reports an error when a typed field has the wrong type", () => {
    fc.assert(
      fc.property(validGame, fc.constantFrom("a string", 5, true, null, [], {}), (game, bad) => {
        const copy = JSON.parse(JSON.stringify(game)) as Rec;
        (copy.meta as Rec).startScene = bad; // not a string, or a string naming no scene
        const result = validateGame(copy);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.path === "/meta/startScene")).toBe(true);
      }),
    );
  });

  it("never throws on arbitrary JSON", () => {
    fc.assert(fc.property(fc.anything(), (value) => typeof validateGame(value).ok === "boolean"));
  });
});

describe("gameSchema", () => {
  it("is draft 2020-12 and shares required lists with the validator", () => {
    expect(gameSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(gameSchema.required).toEqual([...GAME_REQUIRED]);
    const props = gameSchema.properties as Rec;
    expect((props.meta as Rec).required).toEqual([...META_REQUIRED]);
    const sceneItems = (props.scenes as Rec).items as Rec;
    expect(sceneItems.required).toEqual([...SCENE_REQUIRED]);
    const instance = ((sceneItems.properties as Rec).entities as Rec).items as Rec;
    expect(instance.required).toEqual([...INSTANCE_REQUIRED]);
    expect(((props.rules as Rec).items as Rec).required).toEqual([...RULE_REQUIRED]);
  });

  it("is plain JSON", () => {
    expect(JSON.parse(JSON.stringify(gameSchema))).toEqual(gameSchema);
  });
});
