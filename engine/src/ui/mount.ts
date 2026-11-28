import type { JsonObject, UiHandle, UiHost } from "../types";
import { buildWidget, refresh, type Built } from "./widgets";

export const POSITIONS = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;

function positionOf(spec: JsonObject): string {
  const pos = spec.pos;
  return typeof pos === "string" && (POSITIONS as readonly string[]).includes(pos)
    ? pos
    : "top-left";
}

/** Mount the DOM overlay for `host.widgets` inside `root`. Call `update()` once per rendered frame. */
export function mountUi(root: HTMLElement, host: UiHost): UiHandle {
  const container = document.createElement("div");
  container.className = "rf-ui";
  root.appendChild(container);

  let built: Built[] = [];
  let builtFrom: readonly JsonObject[] | null = null;

  function rebuild(): void {
    container.replaceChildren();
    built = [];
    const slots = new Map<string, HTMLElement>();
    for (const spec of host.widgets) {
      if (typeof spec !== "object" || spec === null) continue;
      const b = buildWidget(spec, host);
      if (!b) continue;
      built.push(b);
      if (spec.widget === "modal") {
        container.appendChild(b.el);
        continue;
      }
      const pos = positionOf(spec);
      let slot = slots.get(pos);
      if (!slot) {
        slot = document.createElement("div");
        slot.className = `rf-slot rf-pos-${pos}`;
        slots.set(pos, slot);
        container.appendChild(slot);
      }
      slot.appendChild(b.el);
    }
    builtFrom = host.widgets;
  }

  return {
    update(): void {
      if (host.widgets !== builtFrom) rebuild();
      for (const b of built) refresh(b);
    },
    destroy(): void {
      container.remove();
      built = [];
      builtFrom = null;
    },
  };
}
