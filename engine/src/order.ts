// Draw order, shared by the renderer (what is drawn on top) and click hit-testing (what is clicked).
// A leaf module like types.ts: pure, and imports only types, so io/ and core/ can both use it.
import type { Entity } from "./types";

/**
 * How entities are ordered inside one layer.
 * "order" (default): array order, so later entities draw on top (the editor's Bring front / Send back).
 * "y": smaller y first, then array order (a top-down look where lower things cover higher ones).
 */
export type SortBy = "order" | "y";

/** Parse a scene's `sortBy`. Anything other than "y" means array order. */
export function parseSortBy(value: unknown): SortBy {
  return value === "y" ? "y" : "order";
}

/** `sprite.layer`, else `shape.layer`, else 0. Non-numbers count as 0. */
export function layerOf(e: Entity): number {
  const sprite = e.components["sprite"]?.["layer"];
  if (typeof sprite === "number" && Number.isFinite(sprite)) return sprite;
  const shape = e.components["shape"]?.["layer"];
  return typeof shape === "number" && Number.isFinite(shape) ? shape : 0;
}

/**
 * Entities in the order they are drawn (first = bottom). Layer ascending first, always.
 * Within a layer: array order, or y then array order when `sortBy` is "y". Returns a copy.
 */
export function sortForDraw(entities: readonly Entity[], sortBy: SortBy = "order"): Entity[] {
  return entities
    .map((e, index) => ({ e, index, layer: layerOf(e) }))
    .sort((a, b) => a.layer - b.layer || (sortBy === "y" ? a.e.y - b.e.y : 0) || a.index - b.index)
    .map((item) => item.e);
}
