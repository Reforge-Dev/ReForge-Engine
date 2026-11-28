import type { EventDef } from "../rules/types";
import { str } from "../core/json";
import { param } from "./util";

/** Normalise key names so "Space", "space", "KeyE" and "e" all compare equal. */
function keyName(k: string): string {
  return k
    .toLowerCase()
    .replace(/^key/, "")
    .replace(/^digit/, "");
}

export const events: EventDef[] = [
  {
    name: "start",
    label: "Game starts",
    help: "Fires once, right after the first scene loads (and again after a restart).",
    params: [],
    matches: (_w, ev) => (ev.name === "start" ? {} : null),
  },
  {
    name: "tick",
    label: "Every tick",
    help: "Fires 60 times a second. Use sparingly; timers are usually better.",
    params: [],
    matches: () => ({}),
  },
  {
    name: "key",
    label: "Key is pressed",
    help: "A keyboard key, by name (Space, Enter, KeyE, ArrowUp, ...).",
    params: [
      param("key", "Key", "string", { required: true, default: "Space" }),
      param("mode", "When", "select", {
        default: "pressed",
        options: ["pressed", "down", "released"],
        help: "pressed = the moment it goes down, down = every tick while held.",
      }),
    ],
    matches: (w, ev) =>
      keyName(str(ev.data["key"])) === keyName(str(w["key"])) &&
      str(ev.data["mode"], "pressed") === str(w["mode"], "pressed")
        ? {}
        : null,
  },
  {
    name: "click",
    label: "Something is clicked",
    help: "A UI button (by its id) or an entity in the world (by id, type or tag). With no target, any world click.",
    params: [
      param("target", "Target", "string", {
        help: "A button id, entity id, entity type or tag. Leave empty for any world click.",
      }),
    ],
    matches: (w, ev) => {
      const target =
        typeof w["target"] === "string" && w["target"] !== "" ? w["target"] : undefined;
      const uiId = typeof ev.data["ui"] === "string" ? ev.data["ui"] : undefined;
      const scope = ev.self ? { self: ev.self } : {};
      if (target === undefined) return uiId === undefined ? scope : null;
      if (uiId !== undefined) return uiId === target ? {} : null;
      if (!ev.self) return null;
      return ev.self.id === target || ev.self.type === target || ev.self.tags.has(target)
        ? scope
        : null;
    },
  },
  {
    name: "collide",
    label: "Two things touch",
    help: "Fires once when A and B start touching. In the rule, self is A and other is B.",
    params: [
      param("a", "First", "string", { required: true, help: "Entity type, id or tag." }),
      param("b", "Second", "string", { required: true, help: "Entity type, id or tag." }),
    ],
    matches: (w, ev, sim) => {
      const { self, other } = ev;
      if (!self || !other) return null;
      if (sim.matches(self, w["a"]) && sim.matches(other, w["b"])) return { self, other };
      if (sim.matches(other, w["a"]) && sim.matches(self, w["b"]))
        return { self: other, other: self };
      return null;
    },
  },
  {
    name: "enterScene",
    label: "A scene loads",
    params: [param("scene", "Scene", "scene", { help: "Leave empty for any scene." })],
    matches: (w, ev) => (!w["scene"] || w["scene"] === ev.data["scene"] ? {} : null),
  },
  {
    name: "timer",
    label: "A timer finishes",
    help: "Fires when a timer started with the startTimer action runs out.",
    params: [param("id", "Timer id", "string", { required: true })],
    matches: (w, ev) => {
      if (w["id"] !== ev.data["id"]) return null;
      const data = ev.data["data"];
      const scope: { self?: NonNullable<typeof ev.self>; timer?: Record<string, never> } = {};
      if (ev.self) scope.self = ev.self;
      return typeof data === "object" && data !== null && !Array.isArray(data)
        ? { ...scope, timer: data }
        : scope;
    },
  },
  {
    name: "varChanged",
    label: "A variable changes",
    params: [param("var", "Variable", "variable", { required: true })],
    matches: (w, ev) => (w["var"] === ev.data["var"] ? {} : null),
  },
  {
    name: "died",
    label: "Something runs out of health",
    params: [
      param("target", "Who", "string", { help: "Entity type, id or tag. Empty = anything." }),
    ],
    matches: (w, ev, sim) =>
      ev.self && (!w["target"] || sim.matches(ev.self, w["target"])) ? { self: ev.self } : null,
  },
  {
    name: "custom",
    label: "A custom signal",
    help: "Fires when an `emit` action sends this name.",
    params: [param("name", "Signal name", "string", { required: true })],
    matches: (w, ev) => {
      if (w["name"] !== ev.data["name"]) return null;
      return ev.self ? { self: ev.self } : {};
    },
  },
];
