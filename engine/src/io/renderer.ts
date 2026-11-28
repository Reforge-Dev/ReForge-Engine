import type { AssetStore, Renderer, RenderState } from "../types";
import { BAR_COLOR, drawWorld } from "./draw";
import { fitView, toScreen, toWorld, type ViewTransform } from "./transform";

export function createRenderer(canvas: HTMLCanvasElement, assets: AssetStore): Renderer {
  const ctx = canvas.getContext("2d");
  let cssW = 0;
  let cssH = 0;
  let ratio = 1;
  let transform: ViewTransform = fitView({ x: 0, y: 0, w: 1, h: 1 }, 1, 1);

  function measure(): { w: number; h: number; ratio: number } {
    const r = globalThis.devicePixelRatio;
    return {
      w: canvas.clientWidth || cssW || canvas.width || 300,
      h: canvas.clientHeight || cssH || canvas.height || 150,
      ratio: Number.isFinite(r) && r > 0 ? r : 1,
    };
  }

  function resize(): void {
    const m = measure();
    cssW = m.w;
    cssH = m.h;
    ratio = m.ratio;
    const bw = Math.max(1, Math.round(cssW * ratio));
    const bh = Math.max(1, Math.round(cssH * ratio));
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
  }

  resize();

  return {
    resize,
    draw(state: RenderState, opts: { debug: boolean }): void {
      const m = measure();
      if (m.w !== cssW || m.h !== cssH || m.ratio !== ratio) resize();
      transform = fitView(state.view, cssW, cssH);
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = BAR_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const s = transform.scale * ratio;
      ctx.setTransform(
        s,
        0,
        0,
        s,
        (transform.ox - state.view.x * transform.scale) * ratio,
        (transform.oy - state.view.y * transform.scale) * ratio,
      );
      ctx.save();
      ctx.beginPath();
      ctx.rect(state.view.x, state.view.y, state.view.w, state.view.h);
      ctx.clip();
      drawWorld(ctx, state, assets, opts, 1 / transform.scale);
      ctx.restore();
    },
    screenToWorld: (px, py) => toWorld(transform, px, py),
    worldToScreen: (wx, wy) => toScreen(transform, wx, wy),
    destroy(): void {
      // nothing is held outside the canvas
    },
  };
}
