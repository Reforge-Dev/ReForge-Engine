import {
  GAME_REQUIRED,
  INSTANCE_REQUIRED,
  MAX_ERRORS,
  META_REQUIRED,
  RULE_REQUIRED,
  SCENE_REQUIRED,
} from "./shared";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

type Rec = Record<string, unknown>;

const isObj = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const esc = (key: string): string => key.replace(/~/g, "~0").replace(/\//g, "~1");
const has = (o: Rec, key: string): boolean => Object.prototype.hasOwnProperty.call(o, key);
const isSize = (v: unknown): boolean =>
  Array.isArray(v) && v.length === 2 && v.every((n) => isNum(n) && n > 0);

class Errors {
  readonly list: ValidationError[] = [];
  add(path: string, message: string): void {
    this.list.push({ path, message });
  }
}

function requireKeys(o: Rec, keys: readonly string[], path: string, e: Errors): void {
  for (const key of keys) {
    if (!has(o, key) || o[key] === undefined)
      e.add(`${path}/${esc(key)}`, `Missing required field "${key}".`);
  }
}

function checkStringArray(v: unknown, path: string, e: Errors): void {
  if (!Array.isArray(v)) return e.add(path, "Expected a list of strings.");
  v.forEach((item, i) => {
    if (typeof item !== "string") e.add(`${path}/${i}`, "Expected a string.");
  });
}

function checkComponents(v: unknown, path: string, e: Errors): void {
  if (!isObj(v)) return e.add(path, "Expected an object of components.");
  for (const name of Object.keys(v)) {
    const comp = v[name];
    // `tags` may be a plain list of strings (it is registered as a component for the editor).
    if (name === "tags" && Array.isArray(comp)) checkStringArray(comp, `${path}/tags`, e);
    else if (!isObj(comp)) e.add(`${path}/${esc(name)}`, "Expected a component object.");
  }
}

function checkCamera(camera: unknown, e: Errors): void {
  if (!isObj(camera)) return e.add("/meta/camera", "Expected an object.");
  if (has(camera, "follow") && typeof camera.follow !== "string")
    e.add("/meta/camera/follow", "Expected a tag name.");
  if (camera.view !== undefined && !isSize(camera.view))
    e.add("/meta/camera/view", "Expected [width, height] with both greater than 0.");
}

function checkMeta(meta: unknown, game: Rec, e: Errors): void {
  if (!isObj(meta)) return e.add("/meta", "Expected an object.");
  requireKeys(meta, META_REQUIRED, "/meta", e);
  for (const key of ["title", "startScene", "theme", "background"]) {
    if (has(meta, key) && meta[key] !== undefined && typeof meta[key] !== "string")
      e.add(`/meta/${key}`, "Expected a string.");
  }
  if (meta.version !== undefined && !isNum(meta.version))
    e.add("/meta/version", "Expected a number.");
  if (meta.camera !== undefined) checkCamera(meta.camera, e);
  const scenes = game.scenes;
  if (typeof meta.startScene === "string" && Array.isArray(scenes)) {
    const found = scenes.some((s) => isObj(s) && s.id === meta.startScene);
    if (!found)
      e.add("/meta/startScene", `Start scene "${meta.startScene}" does not exist in scenes.`);
  }
}

function checkEntityTypes(types: unknown, e: Errors): void {
  if (!isObj(types)) return e.add("/entityTypes", "Expected an object.");
  for (const id of Object.keys(types)) {
    const t = types[id];
    const path = `/entityTypes/${esc(id)}`;
    if (!isObj(t)) {
      e.add(path, "Expected an object.");
      continue;
    }
    if (t.tags !== undefined) checkStringArray(t.tags, `${path}/tags`, e);
    if (t.components !== undefined) checkComponents(t.components, `${path}/components`, e);
  }
}

function checkInstance(
  inst: unknown,
  path: string,
  types: Rec | null,
  ids: Set<string>,
  e: Errors,
): void {
  if (!isObj(inst)) return e.add(path, "Expected an object.");
  requireKeys(inst, INSTANCE_REQUIRED, path, e);
  if (has(inst, "type") && inst.type !== undefined) {
    if (typeof inst.type !== "string") e.add(`${path}/type`, "Expected a string.");
    else if (types && !has(types, inst.type))
      e.add(`${path}/type`, `Unknown entity type "${inst.type}".`);
  }
  for (const axis of ["x", "y"]) {
    if (has(inst, axis) && inst[axis] !== undefined && !isNum(inst[axis]))
      e.add(`${path}/${axis}`, "Expected a finite number.");
  }
  if (inst.id !== undefined) {
    if (typeof inst.id !== "string" || inst.id === "")
      e.add(`${path}/id`, "Expected a non-empty string.");
    else if (ids.has(inst.id))
      e.add(`${path}/id`, `Duplicate entity id "${inst.id}" in this scene.`);
    else ids.add(inst.id);
  }
  if (inst.tags !== undefined) checkStringArray(inst.tags, `${path}/tags`, e);
  if (inst.components !== undefined) checkComponents(inst.components, `${path}/components`, e);
}

function checkScene(
  scene: unknown,
  path: string,
  types: Rec | null,
  seen: Set<string>,
  e: Errors,
): void {
  if (!isObj(scene)) return e.add(path, "Expected an object.");
  requireKeys(scene, SCENE_REQUIRED, path, e);
  if (scene.id !== undefined) {
    if (typeof scene.id !== "string" || scene.id === "")
      e.add(`${path}/id`, "Expected a non-empty string.");
    else if (seen.has(scene.id)) e.add(`${path}/id`, `Duplicate scene id "${scene.id}".`);
    else seen.add(scene.id);
  }
  if (scene.size !== undefined && !isSize(scene.size))
    e.add(`${path}/size`, "Expected [width, height] with both greater than 0.");
  if (scene.background !== undefined && typeof scene.background !== "string")
    e.add(`${path}/background`, "Expected a string.");
  const entities = scene.entities;
  if (entities === undefined) return;
  if (!Array.isArray(entities)) return e.add(`${path}/entities`, "Expected a list of entities.");
  const ids = new Set<string>();
  entities.forEach((inst, j) => checkInstance(inst, `${path}/entities/${j}`, types, ids, e));
}

function checkScenes(scenes: unknown, types: Rec | null, e: Errors): void {
  if (!Array.isArray(scenes)) return e.add("/scenes", "Expected a list of scenes.");
  if (scenes.length === 0) e.add("/scenes", "A game needs at least one scene.");
  const seen = new Set<string>();
  scenes.forEach((scene, i) => checkScene(scene, `/scenes/${i}`, types, seen, e));
}

function checkClauses(
  rule: Rec,
  key: "if" | "then",
  field: "cond" | "do",
  path: string,
  e: Errors,
): void {
  const list = rule[key];
  if (list === undefined) return;
  if (!Array.isArray(list)) return e.add(`${path}/${key}`, "Expected a list.");
  list.forEach((item, j) => {
    if (!isObj(item) || typeof item[field] !== "string")
      e.add(`${path}/${key}/${j}`, `Expected an object with a "${field}" name.`);
  });
}

function checkRules(rules: unknown, e: Errors): void {
  if (!Array.isArray(rules)) return e.add("/rules", "Expected a list of rules.");
  rules.forEach((rule, i) => {
    const path = `/rules/${i}`;
    if (!isObj(rule)) return e.add(path, "Expected an object.");
    requireKeys(rule, RULE_REQUIRED, path, e);
    if (rule.id !== undefined && typeof rule.id !== "string")
      e.add(`${path}/id`, "Expected a string.");
    if (rule.enabled !== undefined && typeof rule.enabled !== "boolean")
      e.add(`${path}/enabled`, "Expected true or false.");
    if (rule.when !== undefined) {
      if (!isObj(rule.when)) e.add(`${path}/when`, "Expected an object.");
      else if (typeof rule.when.event !== "string")
        e.add(`${path}/when/event`, 'Expected an event name in "event".');
    }
    checkClauses(rule, "if", "cond", path, e);
    checkClauses(rule, "then", "do", path, e);
  });
}

function checkVariables(vars: unknown, e: Errors): void {
  if (!isObj(vars)) return e.add("/variables", "Expected an object.");
  for (const name of Object.keys(vars)) {
    const v = vars[name];
    const ok =
      v === null ||
      typeof v === "string" ||
      typeof v === "boolean" ||
      isNum(v) ||
      Array.isArray(v) ||
      isObj(v);
    if (!ok)
      e.add(
        `/variables/${esc(name)}`,
        "Expected a JSON value (number, string, true/false, list or object).",
      );
  }
}

function checkTables(tables: unknown, e: Errors): void {
  if (!isObj(tables)) return e.add("/tables", "Expected an object of tables.");
  for (const name of Object.keys(tables)) {
    const rows = tables[name];
    if (!Array.isArray(rows)) {
      e.add(`/tables/${esc(name)}`, "Expected a list of rows.");
      continue;
    }
    rows.forEach((row, i) => {
      if (!isObj(row)) e.add(`/tables/${esc(name)}/${i}`, "Expected an object row.");
    });
  }
}

function checkUi(ui: unknown, e: Errors): void {
  if (!Array.isArray(ui)) return e.add("/ui", "Expected a list of widgets.");
  ui.forEach((w, i) => {
    if (!isObj(w) || typeof w.widget !== "string")
      e.add(`/ui/${i}`, 'Expected an object with a "widget" name.');
  });
}

const compare = (a: ValidationError, b: ValidationError): number => {
  if (a.path !== b.path) return a.path < b.path ? -1 : 1;
  return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
};

/** Structure-only validation of a game.json. Never throws; identical input gives identical output. */
export function validateGame(json: unknown): ValidationResult {
  const e = new Errors();
  try {
    if (!isObj(json)) {
      e.add("", "A game must be a JSON object.");
    } else {
      requireKeys(json, GAME_REQUIRED, "", e);
      if (json.meta !== undefined) checkMeta(json.meta, json, e);
      if (json.entityTypes !== undefined) checkEntityTypes(json.entityTypes, e);
      validateScenes(json, e);
      if (json.variables !== undefined) checkVariables(json.variables, e);
      if (json.tables !== undefined) checkTables(json.tables, e);
      if (json.rules !== undefined) checkRules(json.rules, e);
      if (json.ui !== undefined) checkUi(json.ui, e);
    }
  } catch {
    e.add("", "This file could not be read as a game.");
  }
  const errors = e.list.sort(compare).slice(0, MAX_ERRORS);
  return { ok: errors.length === 0, errors };
}

function validateScenes(game: Rec, e: Errors): void {
  if (game.scenes === undefined) return;
  checkScenes(game.scenes, isObj(game.entityTypes) ? game.entityTypes : null, e);
}
