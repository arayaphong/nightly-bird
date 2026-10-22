import { PlatformObject } from '../core/object.js';

export class InputRouter extends PlatformObject {
  constructor() {
    super({ id: 'input', order: -200 });
    this.sources = new Map();
  }
  set(source, action, pressed) {
    const key = `${source}:${action}`;
    const wasHeld = this.held(action);
    if (pressed) this.sources.set(key, action);
    else this.sources.delete(key);
    if (!wasHeld && this.held(action)) this.platform?.command(action);
    if (wasHeld && !this.held(action)) this.platform?.command('release', { action });
  }
  held(action) {
    return [...this.sources.values()].includes(action);
  }
  releaseSource(source) {
    const actions = new Set(this.sources.values());
    for (const key of this.sources.keys())
      if (key.startsWith(`${source}:`)) this.sources.delete(key);
    for (const action of actions)
      if (!this.held(action)) this.platform?.command('release', { action });
  }
  clear() {
    const actions = new Set(this.sources.values());
    this.sources.clear();
    for (const action of actions) this.platform?.command('release', { action });
  }
  detach() {
    this.clear();
    super.detach();
  }
}
