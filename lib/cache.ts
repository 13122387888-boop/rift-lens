import type { Query } from './model';
// Best-effort per-process cache; bounded and deliberately not persistent.
export class TtlCache<T> {
  private values = new Map<string, { value: T; expires: number }>();
  constructor(
    private max: number,
    private ttl: number,
    private now = Date.now,
  ) {}
  get(key: string): T | undefined {
    const entry = this.values.get(key);
    if (!entry) return;
    if (entry.expires <= this.now()) {
      this.values.delete(key);
      return;
    }
    return structuredClone(entry.value);
  }
  set(key: string, value: T, ttl = this.ttl) {
    const now = this.now();
    for (const [k, v] of this.values)
      if (v.expires <= now) this.values.delete(k);
    this.values.delete(key);
    while (this.values.size >= this.max)
      this.values.delete(this.values.keys().next().value!);
    this.values.set(key, { value: structuredClone(value), expires: now + ttl });
  }
  delete(key: string) {
    this.values.delete(key);
  }
}
export const queryKey = (q: Query) =>
  JSON.stringify([q.player, q.area, q.mode, q.count]);
