export class ScoreStore {
  constructor({ storage = () => globalThis.localStorage, key = 'rbn-best' } = {}) {
    this.storage = storage;
    this.key = key;
  }
  load() {
    try {
      const value = Number(this.storage()?.getItem(this.key));
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    } catch {
      return 0;
    }
  }
  save(value) {
    try {
      this.storage()?.setItem(this.key, String(value));
    } catch {
      /* Storage is optional. */
    }
  }
}
