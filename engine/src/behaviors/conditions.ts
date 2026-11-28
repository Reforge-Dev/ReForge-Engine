import type { Json } from "../types";
import type { ConditionDef } from "../rules/types";
import { isObj, num, str } from "../core/json";
import { param } from "./util";

function same(a: Json | undefined, b: Json | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function compareValues(left: Json | undefined, op: string, right: Json | undefined): boolean {
  if (op === "==") return same(left, right);
  if (op === "!=") return !same(left, right);
  if (typeof left !== "number" || typeof right !== "number") return false;
  switch (op) {
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    default:
      return false;
  }
}

export const conditions: ConditionDef[] = [
  {
    name: "varEq",
    label: "Variable equals",
    params: [
      param("var", "Variable", "variable", { required: true }),
      param("value", "Value", "string", { required: true }),
    ],
    test: (sim, p) => same(sim.getVar(str(p["var"])), p["value"]),
  },
  {
    name: "varLt",
    label: "Variable is less than",
    params: [
      param("var", "Variable", "variable", { required: true }),
      param("value", "Value", "number", { required: true, default: 0 }),
    ],
    test: (sim, p) => compareValues(sim.getVar(str(p["var"])), "<", p["value"]),
  },
  {
    name: "varGt",
    label: "Variable is greater than",
    params: [
      param("var", "Variable", "variable", { required: true }),
      param("value", "Value", "number", { required: true, default: 0 }),
    ],
    test: (sim, p) => compareValues(sim.getVar(str(p["var"])), ">", p["value"]),
  },
  {
    name: "compare",
    label: "Compare two values",
    help: "Either side can be a number, text, or a $reference such as $var.hp, $self.row.correct or $timer.answer.",
    params: [
      param("left", "Left", "string", { required: true }),
      param("op", "Is", "select", {
        required: true,
        default: "==",
        options: ["==", "!=", "<", "<=", ">", ">="],
      }),
      param("right", "Right", "string", { required: true }),
    ],
    test: (_sim, p) => compareValues(p["left"], str(p["op"], "=="), p["right"]),
  },
  {
    name: "hasItem",
    label: "Has item",
    help: "True when the target's inventory holds at least `count` of the item.",
    params: [
      param("item", "Item", "string", { required: true }),
      param("count", "At least", "number", { default: 1, min: 1 }),
      param("target", "Who", "target", {
        default: "self",
        help: "self, other, selected, an id, type or tag.",
      }),
    ],
    test: (sim, p, scope) => {
      const need = num(p["count"], 1);
      return sim.targets(p["target"] ?? "self", scope).some((e) => {
        const items = e.components["inventory"]?.["items"];
        return isObj(items) && num(items[str(p["item"])], 0) >= need;
      });
    },
  },
  {
    name: "hasTag",
    label: "Has tag",
    params: [
      param("target", "Who", "target", { default: "self" }),
      param("tag", "Tag", "tag", { required: true }),
    ],
    test: (sim, p, scope) =>
      sim.targets(p["target"] ?? "self", scope).some((e) => e.tags.has(str(p["tag"]))),
  },
  {
    name: "hasSelection",
    label: "Something is selected",
    params: [],
    test: (sim) => sim.selected !== undefined,
  },
  {
    name: "tagNear",
    label: "A tagged entity is nearby",
    params: [
      param("tag", "Tag", "tag", { required: true }),
      param("distance", "Within (px)", "number", { required: true, default: 32, min: 0 }),
      param("of", "Of", "target", { default: "self" }),
    ],
    test: (sim, p, scope) => {
      const max = num(p["distance"], 32);
      const anchors = sim.targets(p["of"] ?? "self", scope);
      const near = sim.world.queryByTag(str(p["tag"]));
      return anchors.some((a) =>
        near.some((e) => e !== a && Math.hypot(e.x - a.x, e.y - a.y) <= max),
      );
    },
  },
  {
    name: "random",
    label: "Random chance",
    params: [
      param("chance", "Chance (0 to 1)", "number", {
        required: true,
        default: 0.5,
        min: 0,
        max: 1,
      }),
    ],
    test: (sim, p) => sim.rng.next() < num(p["chance"], 0.5),
  },
  {
    name: "inScene",
    label: "Current scene is",
    params: [param("scene", "Scene", "scene", { required: true })],
    test: (sim, p) => sim.sceneId === p["scene"],
  },
  {
    name: "entityCount",
    label: "Number of entities",
    params: [
      param("match", "Which", "string", { required: true, help: "Entity type, id or tag." }),
      param("min", "At least", "number", { min: 0 }),
      param("max", "At most", "number", { min: 0 }),
    ],
    test: (sim, p) => {
      const n = sim.targets(p["match"], {}).length;
      const lo = typeof p["min"] === "number" ? p["min"] : -Infinity;
      const hi = typeof p["max"] === "number" ? p["max"] : Infinity;
      return n >= lo && n <= hi;
    },
  },
  {
    name: "timerRunning",
    label: "A timer is running",
    params: [
      param("id", "Timer id", "string", { required: true }),
      param("target", "On", "target", { help: "Leave empty for any owner." }),
    ],
    test: (sim, p, scope) => {
      const id = str(p["id"]);
      if (typeof p["target"] !== "string" || p["target"] === "") return sim.timerRunning(id);
      return sim.targets(p["target"], scope).some((e) => sim.timerRunning(id, e));
    },
  },
];
