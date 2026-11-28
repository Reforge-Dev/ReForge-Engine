import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { renderDocs } from "../../scripts/docs";
import type { Manifest } from "../../scripts/docs";
import type { BehaviorKind } from "../types";
import { createRegistry, registry } from "./index";

// Property P7 (design.md section 8): the registry is the single source of truth.

const KINDS: BehaviorKind[] = ["event", "condition", "action", "component", "widget"];
const PLURAL = {
  event: "events",
  condition: "conditions",
  action: "actions",
  component: "components",
  widget: "widgets",
} as const;

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
) as { version: string };

describe("registry, manifest and docs (properties)", () => {
  const manifest = registry.toManifest(pkg.version) as Manifest;

  it("P7: every registry entry of every kind appears in the manifest with equal params", () => {
    const all = KINDS.flatMap((kind) => registry.list(kind).map((def) => ({ kind, def })));
    expect(all.length).toBeGreaterThan(50);
    fc.assert(
      fc.property(fc.constantFrom(...all), ({ kind, def }) => {
        const entry = manifest[PLURAL[kind]].find((e) => e.name === def.name);
        expect(entry).toBeDefined();
        expect(entry?.label).toBe(def.label);
        expect(entry?.params).toEqual(def.params);
      }),
      { numRuns: all.length * 2 },
    );
  });

  it("P7: manifest lists are sorted by name, unique, and hold nothing the registry lacks", () => {
    for (const kind of KINDS) {
      const names = manifest[PLURAL[kind]].map((e) => e.name);
      expect(names).toEqual(registry.list(kind).map((d) => d.name));
      expect(new Set(names).size).toBe(names.length);
      expect(names).toEqual([...names].sort());
    }
  });

  it("P7: every param has a name, label, and a type from CONTRACT section 7", () => {
    const types = new Set([
      "number",
      "string",
      "boolean",
      "select",
      "color",
      "entityType",
      "tag",
      "variable",
      "scene",
      "asset",
      "target",
    ]);
    for (const kind of KINDS) {
      for (const def of registry.list(kind)) {
        const seen = new Set<string>();
        for (const p of def.params) {
          expect(p.name.length).toBeGreaterThan(0);
          expect(p.label.length).toBeGreaterThan(0);
          expect(types.has(p.type)).toBe(true);
          expect(typeof p.required).toBe("boolean");
          if (p.type === "select") expect(p.options?.length ?? 0).toBeGreaterThan(0);
          expect(seen.has(p.name)).toBe(false);
          seen.add(p.name);
        }
      }
    }
  });

  it("P7: building the registry twice gives the same manifest", () => {
    expect(createRegistry().toManifest(pkg.version)).toEqual(manifest);
  });

  it("P7: registering a duplicate name throws", () => {
    const fresh = createRegistry();
    const first = fresh.list("action")[0];
    expect(first).toBeDefined();
    if (first) expect(() => fresh.registerAction(first)).toThrow(/Duplicate action/);
  });

  it("P7: docs/behaviors.md equals what the generator renders (run `pnpm -F engine gen` if this fails)", () => {
    const file = fileURLToPath(new URL("../../../docs/behaviors.md", import.meta.url));
    const committed = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    expect(committed).toBe(renderDocs(manifest));
  });
});
