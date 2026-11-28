/** mulberry32. All simulation randomness comes from one instance; its state is a single uint32. */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = Rng.coerce(seed);
  }

  static coerce(seed: number): number {
    return Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  pick<T>(items: readonly T[]): T | undefined {
    return items.length === 0 ? undefined : items[Math.floor(this.next() * items.length)];
  }

  getState(): number {
    return this.s;
  }

  setState(state: number): void {
    this.s = Rng.coerce(state);
  }
}
