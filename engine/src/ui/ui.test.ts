// @vitest-environment happy-dom
import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";
import type { Json, JsonObject, UiHost } from "../types";
import { widgetDefs } from "./defs";
import { barFraction, formatValue, humanize, interpolate } from "./format";
import { mountUi } from "./mount";

interface FakeHost extends UiHost {
  scene: string;
  vars: Record<string, Json>;
  logs: Record<string, string[]>;
  open: Set<string>;
  clicks: string[];
  widgets: JsonObject[];
}

function makeHost(widgets: JsonObject[]): FakeHost {
  const host: FakeHost = {
    scene: "a",
    vars: {},
    logs: {},
    open: new Set(),
    clicks: [],
    widgets,
    getScene: () => host.scene,
    getVars: () => host.vars,
    getLog: (id) => host.logs[id] ?? [],
    isOpen: (id) => host.open.has(id),
    click: (id) => host.clicks.push(id),
  };
  return host;
}

let root: HTMLElement | null = null;
function mount(host: FakeHost): { handle: ReturnType<typeof mountUi>; root: HTMLElement } {
  root = document.createElement("div");
  document.body.appendChild(root);
  const handle = mountUi(root, host);
  handle.update();
  return { handle, root };
}
afterEach(() => {
  root?.remove();
});

describe("format helpers", () => {
  it("formats numbers, interpolates and humanizes", () => {
    expect(formatValue(4)).toBe("4");
    expect(formatValue(4.26)).toBe("4.3");
    expect(formatValue(undefined)).toBe("");
    expect(interpolate("HP {hp} / {max}", { hp: 3 })).toBe("HP 3 / ");
    expect(humanize("threatLevel")).toBe("Threat level");
    expect(humanize("stopped_count")).toBe("Stopped count");
  });

  it("keeps the bar fraction within 0..1 for any input", () => {
    fc.assert(
      fc.property(fc.double(), fc.double(), (value, max) => {
        const f = barFraction(value, max);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }),
    );
    expect(barFraction(150, 100)).toBe(1);
    expect(barFraction(-5, 100)).toBe(0);
    expect(barFraction("x", 100)).toBe(0);
  });
});

describe("mountUi", () => {
  it("shows widgets only in their scene", () => {
    const host = makeHost([
      { widget: "button", id: "go", label: "Go", scene: "a" },
      { widget: "button", id: "stay", label: "Stay", scene: "b" },
      { widget: "text", text: "everywhere" },
    ]);
    const { handle, root: r } = mount(host);
    const buttons = [...r.querySelectorAll<HTMLElement>(".rf-button")];
    expect(buttons.map((b) => b.hidden)).toEqual([false, true]);
    host.scene = "b";
    handle.update();
    expect(buttons.map((b) => b.hidden)).toEqual([true, false]);
    expect(r.querySelector(".rf-text")?.textContent).toBe("everywhere");
  });

  it("calls host.click with the button id", () => {
    const host = makeHost([{ widget: "button", id: "go", label: "Go" }]);
    const { root: r } = mount(host);
    r.querySelector<HTMLButtonElement>("button")?.click();
    expect(host.clicks).toEqual(["go"]);
  });

  it("clamps bar width and shows label and value", () => {
    const host = makeHost([{ widget: "bar", var: "hp", max: 10, label: "HP" }]);
    host.vars = { hp: 25 };
    const { handle, root: r } = mount(host);
    const fill = r.querySelector<HTMLElement>(".rf-bar-fill");
    expect(fill?.style.width).toBe("100%");
    host.vars = { hp: -3 };
    handle.update();
    expect(fill?.style.width).toBe("0%");
    host.vars = { hp: 5 };
    handle.update();
    expect(fill?.style.width).toBe("50%");
    expect(r.querySelector(".rf-bar-label")?.textContent).toBe("HP  5 / 10");
  });

  it("shows `label: value` for variable text and interpolates static text", () => {
    const host = makeHost([
      { widget: "text", var: "clock", label: "Clock" },
      { widget: "text", text: "Keys: {keys}" },
    ]);
    host.vars = { clock: 12, keys: 2 };
    const { handle, root: r } = mount(host);
    const texts = [...r.querySelectorAll(".rf-text")].map((n) => n.textContent);
    expect(texts).toEqual(["Clock: 12", "Keys: 2"]);
    host.vars = { clock: 13, keys: 3 };
    handle.update();
    expect([...r.querySelectorAll(".rf-text")].map((n) => n.textContent)).toEqual([
      "Clock: 13",
      "Keys: 3",
    ]);
  });

  it("renders log lines and table rows", () => {
    const host = makeHost([
      { widget: "list", id: "log", label: "Log" },
      { widget: "table", vars: ["stopped", "threatLevel"], title: "Report" },
    ]);
    host.logs = { log: ["one", "two"] };
    host.vars = { stopped: 3, threatLevel: 1 };
    const { handle, root: r } = mount(host);
    expect([...r.querySelectorAll(".rf-log-line")].map((n) => n.textContent)).toEqual([
      "one",
      "two",
    ]);
    host.logs = { log: ["one", "two", "three"] };
    handle.update();
    expect(r.querySelectorAll(".rf-log-line")).toHaveLength(3);
    expect([...r.querySelectorAll(".rf-row")].map((n) => n.textContent)).toEqual([
      "Stopped3",
      "Threat level1",
    ]);
  });

  it("shows panels and modals only while open, with nested children", () => {
    const host = makeHost([
      {
        widget: "panel",
        id: "inv",
        title: "Items",
        children: [{ widget: "text", text: "Keys: {keys}" }],
      },
      { widget: "modal", id: "end", title: "Done", text: "Score {score}" },
    ]);
    host.vars = { keys: 1, score: 9 };
    const { handle, root: r } = mount(host);
    const panel = r.querySelector<HTMLElement>(".rf-panel");
    const modal = r.querySelector<HTMLElement>(".rf-modal");
    expect([panel?.hidden, modal?.hidden]).toEqual([true, true]);
    host.open = new Set(["inv", "end"]);
    handle.update();
    expect([panel?.hidden, modal?.hidden]).toEqual([false, false]);
    expect(panel?.textContent).toContain("Keys: 1");
    expect(modal?.textContent).toContain("Score 9");
  });

  it("places widgets in position slots, defaulting to top-left", () => {
    const host = makeHost([
      { widget: "text", text: "a", pos: "bottom" },
      { widget: "text", text: "b", pos: "bottom" },
      { widget: "text", text: "c", pos: "nowhere" },
    ]);
    const { root: r } = mount(host);
    expect(r.querySelector(".rf-pos-bottom")?.children).toHaveLength(2);
    expect(r.querySelector(".rf-pos-top-left")?.children).toHaveLength(1);
  });

  it("rebuilds only when the widgets array changes and removes itself on destroy", () => {
    const host = makeHost([{ widget: "button", id: "x", label: "X" }]);
    const { handle, root: r } = mount(host);
    const first = r.querySelector("button");
    handle.update();
    expect(r.querySelector("button")).toBe(first);
    host.widgets = [{ widget: "button", id: "y", label: "Y" }];
    handle.update();
    expect(r.querySelector("button")).not.toBe(first);
    handle.destroy();
    expect(r.querySelector(".rf-ui")).toBeNull();
  });

  it("ignores unknown widget names without throwing", () => {
    const host = makeHost([{ widget: "teleporter" }, { widget: "text", text: "ok" }]);
    const { root: r } = mount(host);
    expect(r.querySelectorAll(".rf-text")).toHaveLength(1);
  });
});

describe("widgetDefs", () => {
  it("describes every widget with scene and a unique name", () => {
    const names = widgetDefs.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(["text", "bar", "button", "panel", "modal", "list", "log", "table"]);
    for (const def of widgetDefs) {
      expect(def.params.some((p) => p.name === "scene" && p.type === "scene")).toBe(true);
    }
  });
});
