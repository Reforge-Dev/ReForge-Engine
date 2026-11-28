import type { ViewRect } from "../types";

/** Uniform fit of a world rectangle into a CSS-pixel canvas, centered (letterboxed). */
export interface ViewTransform {
  scale: number;
  ox: number;
  oy: number;
  view: ViewRect;
}

export function fitView(view: ViewRect, cssW: number, cssH: number): ViewTransform {
  const raw = view.w > 0 && view.h > 0 ? Math.min(cssW / view.w, cssH / view.h) : 1;
  const scale = Number.isFinite(raw) && raw > 0 ? raw : 1;
  return { scale, ox: (cssW - view.w * scale) / 2, oy: (cssH - view.h * scale) / 2, view };
}

export function toWorld(t: ViewTransform, px: number, py: number): { x: number; y: number } {
  return { x: (px - t.ox) / t.scale + t.view.x, y: (py - t.oy) / t.scale + t.view.y };
}

export function toScreen(t: ViewTransform, wx: number, wy: number): { x: number; y: number } {
  return { x: (wx - t.view.x) * t.scale + t.ox, y: (wy - t.view.y) * t.scale + t.oy };
}
