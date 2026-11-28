import type { Entity, Json, JsonObject } from "../types";
import { getPath } from "../core/json";
import type { Scope } from "./types";

/** What expression lookups need from the simulation. Keeps this module pure and testable. */
export interface ExprEnv {
  vars: Readonly<Record<string, Json>>;
  tick: number;
  sceneId: string;
  selected: Entity | undefined;
}

/** Look a dotted path up on an entity: id/type/x/y/tags first, then props, then components. */
export function entityField(e: Entity, path: readonly string[]): Json | undefined {
  const [head, ...rest] = path;
  if (head === undefined) return undefined;
  let base: Json | undefined;
  switch (head) {
    case "id":
      base = e.id;
      break;
    case "type":
      base = e.type;
      break;
    case "x":
      base = e.x;
      break;
    case "y":
      base = e.y;
      break;
    case "tags":
      base = [...e.tags].sort();
      break;
    default:
      base = e.props[head] ?? e.components[head];
  }
  return getPath(base, rest);
}

/**
 * Resolve `$...` references in a param value. Anything else is returned unchanged.
 *   $var.name   a game variable        $self.field / $other.field / $selected.field   an entity field
 *   $timer.key  startTimer data        $tick  $scene
 */
export function resolveValue(value: Json, env: ExprEnv, scope: Scope): Json {
  if (typeof value !== "string" || value.length < 2 || !value.startsWith("$")) return value;
  const [head, ...rest] = value.slice(1).split(".");
  let found: Json | undefined;
  switch (head) {
    case "var": {
      const [name, ...more] = rest;
      found = name === undefined ? undefined : getPath(env.vars[name], more);
      break;
    }
    case "self":
      found = scope.self ? entityField(scope.self, rest) : undefined;
      break;
    case "other":
      found = scope.other ? entityField(scope.other, rest) : undefined;
      break;
    case "selected":
      found = env.selected ? entityField(env.selected, rest) : undefined;
      break;
    case "timer":
      found = getPath(scope.timer, rest);
      break;
    case "tick":
      found = env.tick;
      break;
    case "scene":
      found = env.sceneId;
      break;
    default:
      return value;
  }
  return found === undefined ? null : found;
}

/** Replace `{name}` in text with a variable, or `{self.field}` / `{other.field}` with an entity field. */
export function interpolate(text: string, env: ExprEnv, scope: Scope): string {
  return text.replace(/\{([A-Za-z0-9_.-]+)\}/g, (whole, key: string) => {
    const [head, ...rest] = key.split(".");
    let v: Json | undefined;
    if (head === "self" && scope.self) v = entityField(scope.self, rest);
    else if (head === "other" && scope.other) v = entityField(scope.other, rest);
    else if (head === "selected" && env.selected) v = entityField(env.selected, rest);
    else if (head !== undefined) v = getPath(env.vars[head], rest);
    if (v === undefined || v === null) return whole;
    return typeof v === "number" ? String(Math.round(v * 100) / 100) : String(v);
  });
}

/** Does an entity match a spec: its id, its type, or a tag (`tag:x` or bare `x`)? */
export function matchesSpec(e: Entity, spec: string): boolean {
  if (spec.startsWith("tag:")) return e.tags.has(spec.slice(4));
  return e.id === spec || e.type === spec || e.tags.has(spec);
}

export type { JsonObject };
