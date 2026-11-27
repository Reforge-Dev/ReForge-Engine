import type { Entity, Json, JsonObject } from "../types";
import type { ActionDef } from "../rules/types";
import { clone, isArr, isObj, num, str } from "../core/json";
import { param } from "./util";

const TARGET_HELP = "self, other, selected, an id, an entity type or a tag.";
const target = (def = "self") =>
  param("target", "Who", "target", { default: def, help: TARGET_HELP });

/** Set a (possibly dotted) path on an entity: `hp` -> props.hp, `health.hp` -> components.health.hp. */
function setField(e: Entity, path: string, value: Json): void {
  const [head, ...rest] = path.split(".");
  if (head === undefined || head === "") return;
  const comp = e.components[head];
  let holder: JsonObject;
  let keys: string[];
  if (comp && rest.length > 0) {
    holder = comp;
    keys = rest;
  } else {
    holder = e.props;
    keys = [head, ...rest];
  }
  for (const key of keys.slice(0, -1)) {
    const next = holder[key];
    if (isObj(next)) {
      holder = next;
    } else {
      const fresh: JsonObject = {};
      holder[key] = fresh;
      holder = fresh;
    }
  }
  const last = keys.at(-1);
  if (last !== undefined) holder[last] = value;
}

function inventory(e: Entity): JsonObject {
  const inv = e.components["inventory"] ?? (e.components["inventory"] = {});
  const items = inv["items"];
  if (isObj(items)) return items;
  const fresh: JsonObject = {};
  inv["items"] = fresh;
  return fresh;
}

/** Weighted pick from table rows (`weight` defaults to 1). */
function pickRow(rows: JsonObject[], next: () => number): JsonObject | undefined {
  const total = rows.reduce((sum, r) => sum + Math.max(0, num(r["weight"], 1)), 0);
  if (total <= 0) return rows[0];
  let roll = next() * total;
  for (const r of rows) {
    roll -= Math.max(0, num(r["weight"], 1));
    if (roll < 0) return r;
  }
  return rows.at(-1);
}

export const actions: ActionDef[] = [
  {
    name: "setVar",
    label: "Set variable",
    params: [
      param("var", "Variable", "variable", { required: true }),
      param("value", "Value", "string", {
        required: true,
        help: "A number, text, true/false, or a $reference.",
      }),
    ],
    run: (sim, p) => sim.setVar(str(p["var"]), p["value"] ?? null),
  },
  {
    name: "addVar",
    label: "Add to variable",
    params: [
      param("var", "Variable", "variable", { required: true }),
      param("by", "Amount", "number", {
        required: true,
        default: 1,
        help: "Negative to subtract.",
      }),
      param("min", "Keep at least", "number"),
      param("max", "Keep at most", "number"),
    ],
    run: (sim, p) => {
      const name = str(p["var"]);
      let v = num(sim.getVar(name), 0) + num(p["by"], 0);
      if (typeof p["min"] === "number") v = Math.max(p["min"], v);
      if (typeof p["max"] === "number") v = Math.min(p["max"], v);
      sim.setVar(name, v);
    },
  },
  {
    name: "spawn",
    label: "Create an entity",
    params: [
      param("type", "Entity type", "entityType", { required: true }),
      param("x", "X", "number", { default: 0 }),
      param("y", "Y", "number", { default: 0 }),
      param("at", "Place at", "target", {
        help: "Put it where this entity is (then X and Y are offsets).",
      }),
    ],
    run: (sim, p, scope) => {
      const anchor = typeof p["at"] === "string" ? sim.targets(p["at"], scope)[0] : undefined;
      sim.spawn(
        str(p["type"]),
        (anchor?.x ?? 0) + num(p["x"], 0),
        (anchor?.y ?? 0) + num(p["y"], 0),
      );
    },
  },
  {
    name: "spawnFromTable",
    label: "Place a table row on a free host",
    help: "Picks a row from a table (by id, or weighted random), finds a free host entity from the row's host list, marks it, and stores the row on it as `row`. Fires a `spawned` custom signal on the host.",
    params: [
      param("table", "Table", "string", { required: true }),
      param("id", "Row id", "string", { help: "Leave empty for a weighted random row." }),
      param("host", "Host entity id", "string", {
        help: "Leave empty to choose from the row's host list.",
      }),
      param("hostsField", "Host list field", "string", { default: "hosts" }),
      param("markTag", "Mark host with tag", "tag", { default: "occupied" }),
      param("status", "Set host status", "string"),
      param("maxActive", "At most this many marked", "number", { min: 0 }),
      param("countVar", "Count in variable", "variable"),
    ],
    run: (sim, p, scope) => {
      const rows = sim.tables[str(p["table"])];
      if (!rows || rows.length === 0) {
        sim.error("unknown-table", `There is no table "${str(p["table"])}".`);
        return;
      }
      const mark = str(p["markTag"], "occupied");
      if (typeof p["maxActive"] === "number" && sim.world.queryByTag(mark).length >= p["maxActive"])
        return;
      const row =
        typeof p["id"] === "string" && p["id"] !== ""
          ? rows.find((r) => r["id"] === p["id"])
          : pickRow(rows, () => sim.rng.next());
      if (!row) return;
      const names: string[] =
        typeof p["host"] === "string" && p["host"] !== ""
          ? [p["host"]]
          : (isArr(row[str(p["hostsField"], "hosts")])
              ? (row[str(p["hostsField"], "hosts")] as Json[])
              : []
            ).filter((h): h is string => typeof h === "string");
      const free = names
        .map((n) => sim.world.getById(n))
        .filter((e): e is Entity => e !== undefined && !e.tags.has(mark));
      const host = sim.rng.pick(free);
      if (!host) return;
      host.tags.add(mark);
      host.props["row"] = clone(row);
      if (typeof p["status"] === "string") host.props["status"] = p["status"];
      if (typeof p["countVar"] === "string")
        sim.setVar(p["countVar"], num(sim.getVar(p["countVar"]), 0) + 1);
      sim.emit("custom", { name: "spawned" }, { ...scope, self: host });
    },
  },
  {
    name: "destroy",
    label: "Remove entity",
    params: [target()],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"] ?? "self", scope)) sim.destroy(e);
    },
  },
  {
    name: "damage",
    label: "Hurt",
    params: [target(), param("amount", "Amount", "number", { required: true, default: 1, min: 0 })],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"] ?? "self", scope)) sim.damage(e, num(p["amount"], 1));
    },
  },
  {
    name: "heal",
    label: "Heal",
    params: [target(), param("amount", "Amount", "number", { required: true, default: 1, min: 0 })],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"] ?? "self", scope))
        sim.damage(e, -num(p["amount"], 1));
    },
  },
  {
    name: "giveItem",
    label: "Give item",
    params: [
      param("item", "Item", "string", { required: true }),
      param("count", "Count", "number", { default: 1 }),
      target(),
    ],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"] ?? "self", scope)) {
        const items = inventory(e);
        const name = str(p["item"]);
        items[name] = num(items[name], 0) + num(p["count"], 1);
      }
    },
  },
  {
    name: "takeItem",
    label: "Take item",
    params: [
      param("item", "Item", "string", { required: true }),
      param("count", "Count", "number", { default: 1 }),
      target(),
    ],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"] ?? "self", scope)) {
        const items = inventory(e);
        const name = str(p["item"]);
        items[name] = Math.max(0, num(items[name], 0) - num(p["count"], 1));
      }
    },
  },
  {
    name: "move",
    label: "Move entity",
    params: [
      target(),
      param("dx", "Move right by", "number", { default: 0 }),
      param("dy", "Move down by", "number", { default: 0 }),
      param("x", "Go to X", "number"),
      param("y", "Go to Y", "number"),
    ],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"] ?? "self", scope)) {
        e.x = (typeof p["x"] === "number" ? p["x"] : e.x) + num(p["dx"], 0);
        e.y = (typeof p["y"] === "number" ? p["y"] : e.y) + num(p["dy"], 0);
      }
    },
  },
  {
    name: "setProp",
    label: "Set property",
    help: "Sets a value on an entity. `status` sets props.status; `health.hp` sets a component field.",
    params: [
      target(),
      param("prop", "Property", "string", { required: true }),
      param("value", "Value", "string", { required: true }),
    ],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"] ?? "self", scope)) {
        setField(e, str(p["prop"]), clone(p["value"] ?? null));
      }
    },
  },
  {
    name: "addTag",
    label: "Add tag",
    params: [target(), param("tag", "Tag", "tag", { required: true })],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"] ?? "self", scope)) e.tags.add(str(p["tag"]));
    },
  },
  {
    name: "removeTag",
    label: "Remove tag",
    params: [target(), param("tag", "Tag", "tag", { required: true })],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"] ?? "self", scope)) e.tags.delete(str(p["tag"]));
    },
  },
  {
    name: "selectEntity",
    label: "Select entity",
    help: "Marks one entity as selected (tag `selected`). Later actions can target `selected`.",
    params: [target()],
    run: (sim, p, scope) => sim.select(sim.targets(p["target"] ?? "self", scope)[0]),
  },
  {
    name: "clearSelection",
    label: "Clear selection",
    params: [],
    run: (sim) => sim.select(undefined),
  },
  {
    name: "forEach",
    label: "For each matching entity",
    help: "Runs the nested actions once per matching entity, with self set to that entity. Optional conditions filter.",
    params: [param("target", "Which", "string", { required: true, help: TARGET_HELP })],
    run: (sim, p, scope) => {
      for (const e of sim.targets(p["target"], scope)) {
        const inner = { ...scope, self: e };
        if (scope.self) inner.other = scope.self;
        if (sim.conditionsPass(p["if"], inner)) sim.runActions(p["then"], inner);
      }
    },
  },
  {
    name: "showText",
    label: "Show a message",
    params: [param("text", "Text", "string", { required: true })],
    run: (sim, p, scope) => {
      const text = sim.text(str(p["text"]), scope);
      sim.appendLog("messages", text);
      sim.hostEmit("text", { text });
    },
  },
  {
    name: "log",
    label: "Add to log",
    help: "Appends a line to a log/list widget. With `lines` (a list, or a list of lists with `pick`), appends each line.",
    params: [
      param("text", "Text", "string"),
      param("lines", "Lines", "string", { help: "A $reference to a list of lines." }),
      param("pick", "Pick one variant at random", "boolean", { default: false }),
      param("to", "Log id", "string", { default: "log" }),
    ],
    run: (sim, p, scope) => {
      const to = str(p["to"], "log");
      if (typeof p["text"] === "string" && p["text"] !== "")
        sim.appendLog(to, sim.text(p["text"], scope));
      let lines = p["lines"];
      if (isArr(lines) && p["pick"] === true) {
        const choice = sim.rng.pick(lines);
        lines = choice === undefined ? [] : choice;
      }
      if (isArr(lines)) {
        for (const l of lines) if (typeof l === "string") sim.appendLog(to, sim.text(l, scope));
      }
    },
  },
  {
    name: "openPanel",
    label: "Open panel",
    params: [param("id", "Panel id", "string", { required: true })],
    run: (sim, p) => sim.setOpen(str(p["id"]), true),
  },
  {
    name: "closePanel",
    label: "Close panel",
    params: [param("id", "Panel id", "string", { required: true })],
    run: (sim, p) => sim.setOpen(str(p["id"]), false),
  },
  {
    name: "playSound",
    label: "Play sound",
    help: "Emits a `sound` event for the page to play. The engine ships no audio.",
    params: [param("sound", "Sound", "asset", { required: true })],
    run: (sim, p) => sim.hostEmit("sound", { sound: str(p["sound"]) }),
  },
  {
    name: "changeScene",
    label: "Go to scene",
    params: [param("scene", "Scene", "scene", { required: true })],
    run: (sim, p) => {
      sim.loadScene(str(p["scene"]));
    },
  },
  {
    name: "startTimer",
    label: "Start a timer",
    help: "When it runs out, a `timer` event with this id fires. Give it a target to attach it to one entity.",
    params: [
      param("id", "Timer id", "string", { required: true }),
      param("seconds", "Seconds", "number", { required: true, default: 1, min: 0.02 }),
      param("target", "Attach to", "target", { help: "Leave empty for a global timer." }),
      param("repeat", "Repeat", "boolean", { default: false }),
      param("data", "Data", "string", {
        help: "Optional values handed to the rule as $timer.name.",
      }),
    ],
    run: (sim, p, scope) => {
      const owner =
        typeof p["target"] === "string" ? sim.targets(p["target"], scope)[0] : undefined;
      if (typeof p["target"] === "string" && p["target"] !== "" && !owner) return;
      const opts: { target?: Entity; repeat?: boolean; data?: JsonObject } = {
        repeat: p["repeat"] === true,
      };
      if (owner) opts.target = owner;
      if (isObj(p["data"])) opts.data = sim.resolveObject(p["data"], scope);
      sim.startTimer(str(p["id"]), num(p["seconds"], 1), opts);
    },
  },
  {
    name: "stopTimer",
    label: "Stop a timer",
    params: [
      param("id", "Timer id", "string", { required: true }),
      param("target", "Attached to", "target"),
    ],
    run: (sim, p, scope) => {
      const id = str(p["id"]);
      if (typeof p["target"] === "string" && p["target"] !== "") {
        for (const e of sim.targets(p["target"], scope)) sim.stopTimer(id, e);
      } else {
        sim.stopTimer(id);
      }
    },
  },
  {
    name: "emit",
    label: "Send a custom signal",
    params: [param("name", "Signal name", "string", { required: true })],
    run: (sim, p, scope) => sim.emit("custom", { name: str(p["name"]) }, scope),
  },
  { name: "win", label: "Win the game", params: [], run: (sim) => sim.finish("win") },
  { name: "lose", label: "Lose the game", params: [], run: (sim) => sim.finish("lose") },
];
