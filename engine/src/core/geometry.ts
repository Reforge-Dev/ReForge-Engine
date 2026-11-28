import type { Entity } from "../types";
import { isArr, num } from "./json";

/** Center-based axis-aligned box. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function colliderBox(e: Entity): Box | null {
  const c = e.components["collider"];
  if (!c) return null;
  const off = isArr(c["offset"]) ? c["offset"] : [];
  return {
    x: e.x + num(off[0], 0),
    y: e.y + num(off[1], 0),
    w: Math.max(0, num(c["w"], 16)),
    h: Math.max(0, num(c["h"], 16)),
  };
}

/** Strict overlap: touching edges do not overlap. */
export function overlap(a: Box, b: Box): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

export function isSolid(e: Entity): boolean {
  return e.components["collider"]?.["solid"] === true;
}

/** Width/height used for hit-testing: collider, then sprite, then shape, else 16. */
export function sizeOf(e: Entity): [number, number] {
  for (const name of ["collider", "sprite", "shape"]) {
    const c = e.components[name];
    if (c && typeof c["w"] === "number" && typeof c["h"] === "number") return [c["w"], c["h"]];
  }
  return [16, 16];
}

export function contains(e: Entity, px: number, py: number): boolean {
  const [w, h] = sizeOf(e);
  return Math.abs(px - e.x) * 2 <= w && Math.abs(py - e.y) * 2 <= h;
}

/** Entities overlapping a box, in input order. */
export function queryOverlaps(box: Box, entities: readonly Entity[]): Entity[] {
  return entities.filter((e) => {
    const b = colliderBox(e);
    return b !== null && overlap(box, b);
  });
}

/** Unordered collision pairs [idA, idB] with idA < idB, sorted, no duplicates (sweep along x). */
export function collisionPairs(entities: readonly Entity[]): [string, string][] {
  const boxed: { id: string; box: Box }[] = [];
  for (const e of entities) {
    const box = colliderBox(e);
    if (box) boxed.push({ id: e.id, box });
  }
  boxed.sort((a, b) => a.box.x - a.box.w / 2 - (b.box.x - b.box.w / 2) || (a.id < b.id ? -1 : 1));
  const pairs: [string, string][] = [];
  for (let i = 0; i < boxed.length; i++) {
    const a = boxed[i];
    if (!a) continue;
    const aRight = a.box.x + a.box.w / 2;
    for (let j = i + 1; j < boxed.length; j++) {
      const b = boxed[j];
      if (!b) continue;
      if (b.box.x - b.box.w / 2 >= aRight) break;
      if (overlap(a.box, b.box)) pairs.push(a.id < b.id ? [a.id, b.id] : [b.id, a.id]);
    }
  }
  pairs.sort((p, q) => (p[0] === q[0] ? (p[1] < q[1] ? -1 : 1) : p[0] < q[0] ? -1 : 1));
  return pairs;
}

/**
 * Move an entity by (dx, dy), one axis at a time, stopping at the contact edge of solid colliders.
 * Solids the entity already overlaps at the start of an axis step are ignored for that step, so it
 * can walk out of them without being teleported.
 */
export function moveWithCollision(
  e: Entity,
  dx: number,
  dy: number,
  solids: readonly Entity[],
): void {
  if (!colliderBox(e)) {
    e.x += dx;
    e.y += dy;
    return;
  }
  const others = solids.filter((s) => s.id !== e.id);
  for (const axis of ["x", "y"] as const) {
    const d = axis === "x" ? dx : dy;
    if (d === 0) continue;
    const before = colliderBox(e);
    if (!before) return;
    const blockers = others.filter((s) => {
      const sb = colliderBox(s);
      return sb !== null && !overlap(before, sb);
    });
    e[axis] += d;
    for (const s of blockers) {
      const sb = colliderBox(s);
      const eb = colliderBox(e);
      if (!sb || !eb || !overlap(eb, sb)) continue;
      const half = (axis === "x" ? eb.w + sb.w : eb.h + sb.h) / 2;
      const offset = axis === "x" ? eb.x - e.x : eb.y - e.y;
      const centre = axis === "x" ? sb.x : sb.y;
      e[axis] = d > 0 ? centre - half - offset : centre + half - offset;
    }
  }
}
