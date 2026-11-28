import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { GAME_REQUIRED, INSTANCE_REQUIRED, META_REQUIRED, SCENE_REQUIRED } from "./shared";
import { validateGame } from "./validate";

// Property P6 (design.md section 8): mutations of a real game never crash the validator.

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const helloUrl = new URL("../../../examples/hello/game.json", import.meta.url);
const hello = JSON.parse(readFileSync(fileURLToPath(helloUrl), "utf8")) as Json;

/** JSON-pointer-like paths (as key arrays) to every value in the document, root excluded. */
function allPaths(value: Json, prefix: string[] = [], out: string[][] = []): string[][] {
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      out.push([...prefix, String(i)]);
      allPaths(v, [...prefix, String(i)], out);
    });
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.push([...prefix, k]);
      allPaths(v, [...prefix, k], out);
    }
  }
  return out;
}

const paths = allPaths(hello);
const pointer = (path: string[]): string =>
  "/" + path.map((k) => k.replace(/~/g, "~0").replace(/\//g, "~1")).join("/");

function parentOf(doc: Json, path: string[]): Json {
  let cur: Json = doc;
  for (const key of path.slice(0, -1)) {
    cur = (cur as { [key: string]: Json })[key] as Json;
  }
  return cur;
}

type Kind = "null" | "boolean" | "number" | "string" | "array" | "object";
const kindOf = (v: Json): Kind =>
  v === null ? "null" : Array.isArray(v) ? "array" : (typeof v as Kind);
const replacements: Record<Kind, Json> = {
  null: null,
  boolean: true,
  number: 42,
  string: "text",
  array: ["x"],
  object: { x: 1 },
};

function mutate(path: string[], how: "delete" | "retype", retypeTo: Kind): Json {
  const doc = structuredClone(hello);
  const parent = parentOf(doc, path);
  const key = path[path.length - 1] as string;
  if (how === "delete") {
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else Reflect.deleteProperty(parent as object, key);
  } else {
    (parent as { [key: string]: Json })[key] = replacements[retypeTo];
  }
  return doc;
}

const kinds: Kind[] = ["null", "boolean", "number", "string", "array", "object"];

describe("validateGame on mutated examples/hello/game.json (properties)", () => {
  it("the unmodified example is valid", () => {
    expect(validateGame(hello)).toEqual({ ok: true, errors: [] });
  });

  it("P6: deleting or retyping any value never throws and reports well-formed errors", () => {
    fc.assert(
      fc.property(
        fc.nat(paths.length - 1),
        fc.constantFrom("delete" as const, "retype" as const),
        fc.constantFrom(...kinds),
        (index, how, to) => {
          const path = paths[index] as string[];
          const doc = mutate(path, how, to);
          const result = validateGame(doc);
          expect(result.ok).toBe(result.errors.length === 0);
          for (const err of result.errors) {
            expect(typeof err.message).toBe("string");
            expect(err.message.length).toBeGreaterThan(0);
            expect(err.path === "" || err.path.startsWith("/")).toBe(true);
          }
          // Deterministic for the same input.
          expect(validateGame(doc)).toEqual(result);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("P6: deleting any required key reports an error at exactly that path", () => {
    const required: string[][] = [
      ...GAME_REQUIRED.map((k) => [k]),
      ...META_REQUIRED.map((k) => ["meta", k]),
      ...SCENE_REQUIRED.map((k) => ["scenes", "0", k]),
      ...INSTANCE_REQUIRED.map((k) => ["scenes", "0", "entities", "0", k]),
    ];
    fc.assert(
      fc.property(fc.constantFrom(...required), (path) => {
        const result = validateGame(mutate(path, "delete", "null"));
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.path === pointer(path))).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("P6: giving a checked field the wrong type reports an error at that path", () => {
    const checked: string[][] = [
      ["meta", "title"],
      ["meta", "startScene"],
      ["scenes", "0", "id"],
      ["scenes", "0", "size"],
      ["scenes", "0", "entities"],
      ["scenes", "0", "entities", "0", "type"],
      ["scenes", "0", "entities", "0", "x"],
      ["scenes", "0", "entities", "0", "y"],
      ["entityTypes"],
      ["rules"],
      ["variables"],
    ];
    const wrong: Json[] = [null, true, "text", ["x"]];
    fc.assert(
      fc.property(fc.constantFrom(...checked), fc.constantFrom(...wrong), (path, value) => {
        const doc = structuredClone(hello);
        (parentOf(doc, path) as { [key: string]: Json })[path[path.length - 1] as string] = value;
        const sameKind = kindOf(value) === kindOf(path.reduce((c, k) => (c as never)[k], hello));
        const result = validateGame(doc);
        if (sameKind) return; // e.g. a list replaced by another list can be legal
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.path === pointer(path))).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
});
