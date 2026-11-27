import type { BehaviorKind, BehaviorMeta, Entity, Json, JsonObject } from "../types";
import type { Simulation } from "../core/sim";

/** Who an action or condition is talking about. */
export interface Scope {
  /** The entity the event is about (collider A, clicked entity, timer owner, ...). */
  self?: Entity;
  /** The second party of the event (collider B). */
  other?: Entity;
  /** Data attached to the timer that fired (startTimer `data`). */
  timer?: JsonObject;
}

export interface GameEvent {
  name: string;
  self?: Entity;
  other?: Entity;
  data: JsonObject;
}

export interface EventDef extends BehaviorMeta {
  /** Return the scope to run the rule in, or null when this rule's `when` does not match. */
  matches(when: JsonObject, ev: GameEvent, sim: Simulation): Scope | null;
}

export interface ConditionDef extends BehaviorMeta {
  test(sim: Simulation, p: JsonObject, scope: Scope): boolean;
}

export interface ActionDef extends BehaviorMeta {
  run(sim: Simulation, p: JsonObject, scope: Scope): void;
}

/** Components are data; their runtime systems live in core/. The def supplies defaults and editor metadata. */
export type ComponentDef = BehaviorMeta;
export type WidgetDef = BehaviorMeta;

export interface DefByKind {
  event: EventDef;
  condition: ConditionDef;
  action: ActionDef;
  component: ComponentDef;
  widget: WidgetDef;
}

export type { BehaviorKind, Json };
