import type { Json, JsonObject, UiHost } from "../types";
import { barFraction, formatValue, humanize, interpolate } from "./format";

/** One built widget. `update` patches only what changed and runs only while visible. */
export interface Built {
  el: HTMLElement;
  update(): void;
  visible(): boolean;
  /** Last visibility applied to the DOM; null before the first update. */
  shown: boolean | null;
}

function str(v: Json | undefined): string {
  return typeof v === "string" ? v : "";
}

function isObject(v: Json | undefined): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function el(tag: string, className: string, parent?: HTMLElement): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  parent?.appendChild(node);
  return node;
}

function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

function inScene(spec: JsonObject, host: UiHost): boolean {
  const scene = spec.scene;
  return typeof scene !== "string" || scene === host.getScene();
}

/** Show or hide a built widget (cached), then patch its content if visible. */
export function refresh(b: Built): void {
  const v = b.visible();
  if (v !== b.shown) {
    b.shown = v;
    b.el.hidden = !v;
  }
  if (v) b.update();
}

function textWidget(spec: JsonObject, host: UiHost): Built {
  const node = el("div", "rf-text");
  let last = "";
  return {
    el: node,
    shown: null,
    visible: () => inScene(spec, host),
    update() {
      const vars = host.getVars();
      const name = str(spec.var);
      const label = str(spec.label);
      const next =
        name === ""
          ? interpolate(str(spec.text) || label, vars)
          : (label === "" ? "" : `${label}: `) + formatValue(vars[name]);
      if (next !== last) {
        last = next;
        setText(node, next);
      }
    },
  };
}

function barWidget(spec: JsonObject, host: UiHost): Built {
  const node = el("div", "rf-bar");
  node.setAttribute("role", "progressbar");
  const label = el("div", "rf-bar-label", node);
  const track = el("div", "rf-bar-track", node);
  const fill = el("div", "rf-bar-fill", track);
  const color = str(spec.color);
  if (color !== "") fill.style.background = color;
  const max = typeof spec.max === "number" ? spec.max : 100;
  node.setAttribute("aria-valuemin", "0");
  node.setAttribute("aria-valuemax", String(max));
  node.setAttribute("aria-label", str(spec.label) || humanize(str(spec.var)));
  let lastLabel = "";
  let lastWidth = "";
  return {
    el: node,
    shown: null,
    visible: () => inScene(spec, host),
    update() {
      const value = host.getVars()[str(spec.var)];
      const text = `${str(spec.label) || humanize(str(spec.var))}  ${formatValue(value)} / ${formatValue(max)}`;
      if (text !== lastLabel) {
        lastLabel = text;
        setText(label, text);
        node.setAttribute("aria-valuenow", typeof value === "number" ? String(value) : "0");
      }
      const width = `${Math.round(barFraction(value, max) * 1000) / 10}%`;
      if (width !== lastWidth) {
        lastWidth = width;
        fill.style.width = width;
      }
    },
  };
}

function buttonWidget(spec: JsonObject, host: UiHost): Built {
  const node = document.createElement("button");
  node.type = "button";
  node.className = "rf-button";
  node.addEventListener("click", () => {
    host.click(str(spec.id));
  });
  let last = "";
  return {
    el: node,
    shown: null,
    visible: () => inScene(spec, host),
    update() {
      const next = str(spec.label) || str(spec.id);
      if (next !== last) {
        last = next;
        setText(node, next);
      }
    },
  };
}

function listWidget(spec: JsonObject, host: UiHost): Built {
  const node = el("div", "rf-list");
  const title = str(spec.label);
  if (title !== "") setText(el("div", "rf-title", node), title);
  const lines = el("div", "rf-log-lines", node);
  lines.setAttribute("role", "log");
  const id = str(spec.id);
  let lastKey = "";
  return {
    el: node,
    shown: null,
    visible: () => inScene(spec, host),
    update() {
      const all = host.getLog(id);
      const key = `${all.length}|${all[all.length - 1] ?? ""}|${all[0] ?? ""}`;
      if (key === lastKey) return;
      lastKey = key;
      lines.replaceChildren();
      for (const line of all.slice(-200)) setText(el("div", "rf-log-line", lines), line);
      lines.scrollTop = lines.scrollHeight;
    },
  };
}

function tableWidget(spec: JsonObject, host: UiHost): Built {
  const node = el("div", "rf-table");
  const title = str(spec.title);
  if (title !== "") setText(el("div", "rf-title", node), title);
  const names = Array.isArray(spec.vars)
    ? spec.vars.filter((v): v is string => typeof v === "string")
    : [];
  const labels = isObject(spec.labels) ? spec.labels : {};
  const cells = names.map((name) => {
    const row = el("div", "rf-row", node);
    setText(el("span", "rf-key", row), str(labels[name]) || humanize(name));
    return { name, cell: el("span", "rf-value", row), last: "" };
  });
  return {
    el: node,
    shown: null,
    visible: () => inScene(spec, host),
    update() {
      const vars = host.getVars();
      for (const c of cells) {
        const next = formatValue(vars[c.name]);
        if (next !== c.last) {
          c.last = next;
          setText(c.cell, next);
        }
      }
    },
  };
}

function containerWidget(spec: JsonObject, host: UiHost, modal: boolean): Built {
  const node = el("div", modal ? "rf-modal" : "rf-panel");
  const box = modal ? el("div", "rf-modal-box", node) : node;
  if (modal) {
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
  }
  const title = str(spec.title);
  if (title !== "") setText(el("div", "rf-title", box), title);
  const body = str(spec.text) === "" ? null : el("p", "rf-body", box);
  const kids = Array.isArray(spec.children)
    ? spec.children.filter(isObject).flatMap((child) => {
        const b = buildWidget(child, host);
        if (b) box.appendChild(b.el);
        return b ? [b] : [];
      })
    : [];
  const id = str(spec.id);
  let last = "";
  return {
    el: node,
    shown: null,
    visible: () => inScene(spec, host) && (spec.open === true || host.isOpen(id)),
    update() {
      if (body) {
        const next = interpolate(str(spec.text), host.getVars());
        if (next !== last) {
          last = next;
          setText(body, next);
        }
      }
      for (const k of kids) refresh(k);
    },
  };
}

/** Build one widget from its `ui[]` JSON. Unknown widget names return null (the registry reports them elsewhere). */
export function buildWidget(spec: JsonObject, host: UiHost): Built | null {
  switch (spec.widget) {
    case "text":
      return textWidget(spec, host);
    case "bar":
      return barWidget(spec, host);
    case "button":
      return buttonWidget(spec, host);
    case "list":
    case "log":
      return listWidget(spec, host);
    case "table":
      return tableWidget(spec, host);
    case "panel":
      return containerWidget(spec, host, false);
    case "modal":
      return containerWidget(spec, host, true);
    default:
      return null;
  }
}
