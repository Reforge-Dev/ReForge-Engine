// TypeScript mirror of CONTRACT §1 (game.json). Additive fields are marked.
import type { Json, JsonObject } from "../types";

export interface MetaJson {
  title: string;
  version?: number;
  startScene: string;
  theme?: string;
  /** Additive: camera follow tag and the visible window size when following. */
  camera?: { follow?: string; view?: [number, number] };
  /** Additive: default background color. */
  background?: string;
}

export interface EntityTypeJson {
  tags?: string[];
  components?: Record<string, JsonObject>;
}

/** One placed entity. Keys other than the named ones become entity props. */
export interface InstanceJson {
  type: string;
  x: number;
  y: number;
  id?: string;
  tags?: string[];
  components?: Record<string, JsonObject>;
  [extra: string]: Json | undefined;
}

export interface SceneJson {
  id: string;
  size: [number, number];
  background?: string;
  entities: InstanceJson[];
}

export interface WhenJson {
  event: string;
  [param: string]: Json | undefined;
}

export interface ConditionJson {
  cond: string;
  [param: string]: Json | undefined;
}

export interface ActionJson {
  do: string;
  [param: string]: Json | undefined;
}

export interface RuleJson {
  id?: string;
  enabled?: boolean;
  when: WhenJson;
  if?: ConditionJson[];
  then: ActionJson[];
}

export interface GameJson {
  meta: MetaJson;
  variables?: Record<string, Json>;
  /** Additive: named tables of rows (weighted spawn tables, response lists, ...). */
  tables?: Record<string, JsonObject[]>;
  entityTypes: Record<string, EntityTypeJson>;
  scenes: SceneJson[];
  rules?: RuleJson[];
  ui?: JsonObject[];
}
