import type { BehaviorKind, BehaviorMeta, Json, Param } from "../types";
import type { DefByKind } from "../rules/types";

export interface ManifestEntry {
  name: string;
  label: string;
  params: Param[];
  help?: string;
}

export interface Manifest {
  engineVersion: string;
  events: ManifestEntry[];
  conditions: ManifestEntry[];
  actions: ManifestEntry[];
  components: ManifestEntry[];
  widgets: ManifestEntry[];
}

const PLURAL = {
  event: "events",
  condition: "conditions",
  action: "actions",
  component: "components",
  widget: "widgets",
} as const;

/** The single source of truth for behaviors. The manifest, schema docs and editor forms derive from it. */
export class Registry {
  private defs: { [K in BehaviorKind]: Map<string, DefByKind[K]> } = {
    event: new Map(),
    condition: new Map(),
    action: new Map(),
    component: new Map(),
    widget: new Map(),
  };

  private add<K extends BehaviorKind>(kind: K, def: DefByKind[K]): void {
    const map = this.defs[kind] as Map<string, DefByKind[K]>;
    if (map.has(def.name)) throw new Error(`Duplicate ${kind} "${def.name}"`);
    map.set(def.name, def);
  }

  registerEvent(def: DefByKind["event"]): void {
    this.add("event", def);
  }
  registerCondition(def: DefByKind["condition"]): void {
    this.add("condition", def);
  }
  registerAction(def: DefByKind["action"]): void {
    this.add("action", def);
  }
  registerComponent(def: DefByKind["component"]): void {
    this.add("component", def);
  }
  registerWidget(def: DefByKind["widget"]): void {
    this.add("widget", def);
  }

  get<K extends BehaviorKind>(kind: K, name: string): DefByKind[K] | undefined {
    return (this.defs[kind] as Map<string, DefByKind[K]>).get(name);
  }

  list<K extends BehaviorKind>(kind: K): DefByKind[K][] {
    return [...(this.defs[kind] as Map<string, DefByKind[K]>).values()].sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
  }

  /** CONTRACT §7. Entries are sorted by name so output is stable. */
  toManifest(engineVersion: string): Manifest {
    const entries = (kind: BehaviorKind): ManifestEntry[] =>
      this.list(kind).map((d: BehaviorMeta) => {
        const entry: ManifestEntry = { name: d.name, label: d.label, params: d.params };
        if (d.help !== undefined) entry.help = d.help;
        return entry;
      });
    return {
      engineVersion,
      events: entries("event"),
      conditions: entries("condition"),
      actions: entries("action"),
      components: entries("component"),
      widgets: entries("widget"),
    };
  }

  /** Defaults declared by a component's params, for filling gaps at spawn time. */
  componentDefaults(name: string): Record<string, Json> {
    const def = this.get("component", name);
    const out: Record<string, Json> = {};
    for (const p of def?.params ?? []) if (p.default !== undefined) out[p.name] = p.default;
    return out;
  }
}

export { PLURAL };
