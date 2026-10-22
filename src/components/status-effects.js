export class StatusEffects {
  constructor() {
    this.timers = new Map();
  }
  remaining(name) {
    return this.timers.get(name) ?? 0;
  }
  has(name) {
    return this.remaining(name) > 0;
  }
  apply(name, seconds) {
    this.timers.set(name, Math.max(0, seconds));
  }
  update(dt) {
    for (const [name, time] of this.timers) {
      const remaining = Math.max(0, time - dt);
      if (remaining) this.timers.set(name, remaining);
      else this.timers.delete(name);
    }
  }
  clear() {
    this.timers.clear();
  }
}
