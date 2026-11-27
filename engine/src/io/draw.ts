import type { AssetStore, Entity, Json, JsonObject, RenderState } from "../types";

export const BAR_COLOR = "#0c0d0b";
const DEFAULT_BACKGROUND = "#16181d";
const PLACEHOLDER = "#ff00ff";
const LABEL_COLOR = "#e7e4d8";
const LINK_COLOR = "#5a5e52";
const DEFAULT_COLOR = "#8aa384";
const LABEL_FONT = "11px ui-monospace, monospace";
const STATUS_COLORS: Record<string, string> = {
  healthy: "#8aa384",
  haunted: "#e07a3d",
  working: "#e7e4d8",
  lost: "#c4493a",
};

function num(v: Json | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: Json | undefined, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function layerOf(e: Entity): number {
  return num(e.components.sprite?.layer, num(e.components.shape?.layer, 0));
}

/** Layer ascending, then y ascending, then id. Returns a copy. */
export function sortForDraw(entities: readonly Entity[]): Entity[] {
  return [...entities].sort((a, b) => {
    const dl = layerOf(a) - layerOf(b);
    if (dl !== 0) return dl;
    if (a.y !== b.y) return a.y - b.y;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Color for an entity that has a `node` component; null otherwise. */
export function statusColor(e: Entity): string | null {
  const node = e.components.node;
  if (!node) return null;
  const status = String(e.props.status ?? node.status ?? "healthy");
  const custom = node.colors;
  if (custom && typeof custom === "object" && !Array.isArray(custom)) {
    const own = custom[status];
    if (typeof own === "string") return own;
  }
  return STATUS_COLORS[status] ?? DEFAULT_COLOR;
}

function drawLinks(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  sorted: Entity[],
  px: number,
): void {
  const seen = new Set<string>();
  ctx.lineWidth = px;
  for (const e of sorted) {
    const links = e.props.links;
    if (!e.components.node || !Array.isArray(links)) continue;
    ctx.strokeStyle = str(e.components.node.linkColor, LINK_COLOR);
    for (const id of links) {
      if (typeof id !== "string") continue;
      const other = state.byId.get(id);
      if (!other) continue;
      const key = e.id < id ? `${e.id}\u0000${id}` : `${id}\u0000${e.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(other.x, other.y);
      ctx.stroke();
    }
  }
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  sprite: JsonObject,
  assets: AssetStore,
): void {
  const w = num(sprite.w, 16);
  const h = num(sprite.h, 16);
  const path = str(sprite.image, "");
  const img = path === "" ? null : assets.get(path);
  if (!img) {
    ctx.fillStyle = PLACEHOLDER;
    ctx.fillRect(e.x - w / 2, e.y - h / 2, w, h);
    return;
  }
  const cols = Math.max(1, Math.floor(num(sprite.cols, 1)));
  const rows = Math.max(1, Math.floor(num(sprite.rows, 1)));
  if (cols === 1 && rows === 1) {
    ctx.drawImage(img, e.x - w / 2, e.y - h / 2, w, h);
    return;
  }
  const cw = img.width / cols;
  const ch = img.height / rows;
  const frame = Math.max(0, Math.floor(num(sprite.frame, 0))) % (cols * rows);
  ctx.drawImage(
    img,
    (frame % cols) * cw,
    Math.floor(frame / cols) * ch,
    cw,
    ch,
    e.x - w / 2,
    e.y - h / 2,
    w,
    h,
  );
}

function drawShape(ctx: CanvasRenderingContext2D, e: Entity, px: number): void {
  const shape = e.components.shape ?? {};
  const w = num(shape.w, 24);
  const h = num(shape.h, 24);
  ctx.fillStyle = statusColor(e) ?? str(shape.color, DEFAULT_COLOR);
  const kind = str(shape.kind ?? shape.shape, "rect");
  if (kind === "circle") {
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(e.x - w / 2, e.y - h / 2, w, h);
  }
  const outline = shape.outline;
  if (typeof outline === "string") {
    ctx.strokeStyle = outline;
    ctx.lineWidth = px;
    if (kind === "circle") ctx.stroke();
    else ctx.strokeRect(e.x - w / 2, e.y - h / 2, w, h);
  }
}

function drawLabel(ctx: CanvasRenderingContext2D, e: Entity, below: number): void {
  const text = str(e.components.label?.text, "") || str(e.props.name, "");
  if (text === "") return;
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = LABEL_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(text, e.x, e.y + below + 3);
}

function drawDebug(ctx: CanvasRenderingContext2D, e: Entity, px: number): void {
  const box = e.components.collider;
  ctx.strokeStyle = "#00ffff";
  ctx.lineWidth = px;
  if (box) {
    const off = Array.isArray(box.offset) ? box.offset : [];
    const cx = e.x + num(off[0], 0);
    const cy = e.y + num(off[1], 0);
    const w = num(box.w, 0);
    const h = num(box.h, 0);
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  }
  ctx.fillStyle = "#00ffff";
  ctx.font = "8px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(e.id, e.x, e.y);
}

/** Draw the world in world coordinates. The caller has already applied the view transform and clip. */
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  assets: AssetStore,
  opts: { debug: boolean },
  px: number,
): void {
  ctx.fillStyle = state.background ?? DEFAULT_BACKGROUND;
  ctx.fillRect(state.view.x, state.view.y, state.view.w, state.view.h);
  const sorted = sortForDraw(state.entities);
  drawLinks(ctx, state, sorted, px);
  for (const e of sorted) {
    const sprite = e.components.sprite;
    const hasShape = e.components.shape !== undefined || e.components.node !== undefined;
    if (sprite) drawSprite(ctx, e, sprite, assets);
    else if (hasShape) drawShape(ctx, e, px);
    const body = sprite ?? e.components.shape ?? {};
    drawLabel(ctx, e, sprite || hasShape ? num(body.h, 24) / 2 : 0);
    if (opts.debug) drawDebug(ctx, e, px);
  }
}
