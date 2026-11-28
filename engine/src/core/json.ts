import type { Json, JsonObject } from "../types";

export function isObj(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isArr(v: unknown): v is Json[] {
  return Array.isArray(v);
}

export function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function clone<T extends Json>(v: T): T {
  return structuredClone(v);
}

/** Walk a dotted path through nested JSON. Returns undefined when any step is missing. */
export function getPath(v: Json | undefined, path: readonly string[]): Json | undefined {
  let cur: Json | undefined = v;
  for (const key of path) {
    if (Array.isArray(cur)) {
      const i = Number(key);
      cur = Number.isInteger(i) ? cur[i] : undefined;
    } else if (isObj(cur)) {
      cur = cur[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Deep merge: objects merge recursively, arrays and primitives are replaced. Never mutates inputs. */
export function deepMerge(base: JsonObject, over: JsonObject): JsonObject {
  const out: JsonObject = clone(base);
  for (const [k, v] of Object.entries(over)) {
    const cur = out[k];
    out[k] = isObj(cur) && isObj(v) ? deepMerge(cur, v) : clone(v);
  }
  return out;
}
