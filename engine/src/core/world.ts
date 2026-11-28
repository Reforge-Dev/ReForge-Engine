import type { Entity, EntityState, JsonObject } from "../types";

export interface NewEntity {
  id?: string;
  type: string;
  tags?: Iterable<string>;
  x: number;
  y: number;
  props?: JsonObject;
  components?: Record<string, JsonObject>;
}

/**
 * Entity store. Adds are visible immediately; removals are deferred to flush() (end of tick).
 * A pending-removal entity can still be fetched by id but never appears in queries.
 */
export class World {
  private map = new Map<string, Entity>();
  private pending = new Set<string>();
  private counter = 0;
  /** Every id handed out this run, so a generated id never repeats one that was removed. */
  private issued = new Set<string>();

  add(spec: NewEntity): Entity {
    let id = spec.id && spec.id.length > 0 ? spec.id : "";
    if (id === "" || this.map.has(id)) {
      const stem = id === "" ? spec.type : id;
      do {
        this.counter += 1;
        id = `${stem}-${this.counter}`;
      } while (this.map.has(id) || this.issued.has(id));
    }
    const entity: Entity = {
      id,
      type: spec.type,
      tags: new Set(spec.tags ?? []),
      x: spec.x,
      y: spec.y,
      props: spec.props ?? {},
      components: spec.components ?? {},
    };
    this.issued.add(id);
    this.map.set(id, entity);
    return entity;
  }

  remove(id: string): void {
    if (this.map.has(id)) this.pending.add(id);
  }

  isRemoved(id: string): boolean {
    return this.pending.has(id);
  }

  getById(id: string): Entity | undefined {
    return this.map.get(id);
  }

  /** Live entities in insertion order (snapshot array). */
  all(): Entity[] {
    const out: Entity[] = [];
    for (const [id, e] of this.map) if (!this.pending.has(id)) out.push(e);
    return out;
  }

  queryByTag(tag: string): Entity[] {
    return this.all().filter((e) => e.tags.has(tag));
  }

  queryByType(type: string): Entity[] {
    return this.all().filter((e) => e.type === type);
  }

  queryByComponent(name: string): Entity[] {
    return this.all().filter((e) => Object.hasOwn(e.components, name));
  }

  count(): number {
    return this.map.size - this.pending.size;
  }

  /** Apply deferred removals. Returns the removed ids. */
  flush(): string[] {
    const removed = [...this.pending];
    for (const id of removed) this.map.delete(id);
    this.pending.clear();
    return removed;
  }

  /** Drop everything. Ids are never reused within a run, so the counter survives. */
  clear(): void {
    this.map.clear();
    this.pending.clear();
  }

  /** Only for a full restart. */
  resetIds(): void {
    this.counter = 0;
    this.issued.clear();
  }

  toJSON(): EntityState[] {
    return this.all().map((e) => ({
      id: e.id,
      type: e.type,
      tags: [...e.tags].sort(),
      x: e.x,
      y: e.y,
      props: structuredClone(e.props),
      components: structuredClone(e.components),
    }));
  }
}
