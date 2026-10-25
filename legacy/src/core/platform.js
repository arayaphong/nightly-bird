import { PhysicsSystem } from './physics.js';
import { CollisionSystem } from './collision.js';
import { randomStream } from '../math/random.js';

export class Platform {
  constructor({
    assets,
    renderer = null,
    maxDelta = 0.033,
    random = randomStream(),
    cosmeticRandom = randomStream(),
  } = {}) {
    this.assets = assets;
    this.renderer = renderer;
    this.maxDelta = maxDelta;
    this.random = random;
    this.cosmeticRandom = cosmeticRandom;
    this.objects = new Map();
    this.pending = new Set();
    this.additions = [];
    this.removals = new Set();
    this.events = [];
    this.commands = [];
    this.physics = new PhysicsSystem();
    this.collisions = new CollisionSystem();
    this.clock = { simulation: 0, ui: 0, paused: false };
    this.nextId = 1;
    this.disposed = false;
    this.running = false;
    this.stepping = false;
    this.loadErrors = [];
  }
  get(id) {
    return this.objects.get(id);
  }
  find(tag) {
    return this.list(tag)[0];
  }
  list(tag) {
    return [...this.objects.values()].filter((o) => !o.removing && (!tag || o.tags.has(tag)));
  }
  ordered() {
    return this.list().sort((a, b) => a.order - b.order);
  }
  add(object) {
    if (this.disposed) throw new Error('Platform is disposed');
    if (object.platform || object.registration) throw new Error('Object already has an owner');
    object.id ??= `object-${this.nextId++}`;
    if (this.get(object.id) || [...this.pending].some((o) => o.id === object.id))
      throw new Error(`Duplicate object id: ${object.id}`);
    object.removing = false;
    const registration = { platform: this };
    object.registration = registration;
    this.pending.add(object);
    // A cached asset set permits spawning at the next explicit frame boundary.
    const finish = () => {
      if (this.disposed || object.registration !== registration || !this.pending.has(object))
        return;
      object.ready = true;
      this.additions.push(object);
    };
    let loading;
    try {
      loading = object.load(this.assets);
    } catch (error) {
      loading = Promise.reject(error);
    }
    if (!loading?.then) finish();
    object.loading = Promise.resolve(loading)
      .then(() => {
        if (loading?.then) finish();
      })
      .catch((error) => {
        if (object.registration === registration) {
          this.pending.delete(object);
          object.registration = null;
          object.ready = false;
        }
        this.loadErrors.push({ object, error });
        throw error;
      });
    // Dynamic loads are observable via loadErrors even when callers use fire-and-forget add().
    object.loading.catch(() => {});
    return object;
  }
  addAll(objects) {
    objects.forEach((object) => this.add(object));
    return this;
  }
  async load() {
    while (this.pending.size) {
      await Promise.all([...this.pending].map((object) => object.loading));
      this.flush();
    }
  }
  flush() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.removals.size) {
        const object = this.removals.values().next().value;
        this.removals.delete(object);
        for (const child of this.list())
          if (child.body?.attachment?.parent === object) this.physics.detach(child);
        this.objects.delete(object.id);
        this.pending.delete(object);
        if (object.platform === this) object.detach();
        object.registration = null;
        if (object.destroyOnRemoval) object.dispose();
        object.ready = false;
      }
      const attached = [];
      for (const object of this.additions.splice(0)) {
        if (this.disposed) continue;
        if (!this.pending.delete(object) || object.removing) continue;
        this.objects.set(object.id, object);
        attached.push(object);
      }
      for (const object of attached) object.attach(this);
    } finally {
      this.flushing = false;
    }
  }
  remove(object, { dispose = true } = {}) {
    if (!object || object.registration?.platform !== this) return;
    object.removing = true;
    object.destroyOnRemoval = dispose;
    this.removals.add(object);
    if (!this.stepping) this.flush();
  }
  clearScope(scope) {
    for (const object of [...this.list(), ...this.pending])
      if (object.scope === scope) this.remove(object);
  }
  emit(type, detail = {}) {
    this.events.push({ type, ...detail });
  }
  command(type, detail = {}) {
    this.commands.push({ type, ...detail });
  }
  dispatchEvents() {
    let count = 0;
    while (this.events.length) {
      if (++count > 1000) throw new Error('Unbounded game event loop');
      const event = this.events.shift();
      for (const object of this.ordered()) object.event?.(event);
    }
  }
  step(elapsed) {
    if (this.disposed) return;
    this.flush();
    const dt = Math.min(this.maxDelta, Math.max(0, elapsed));
    this.clock.ui += Math.max(0, elapsed);
    this.stepping = true;
    try {
      for (const object of this.ordered()) object.poll?.();
      while (this.commands.length) {
        const command = this.commands.shift();
        for (const object of this.ordered()) if (object.command?.(command) === true) break;
      }
      this.dispatchEvents();
      if (!this.clock.paused) {
        this.clock.simulation += dt;
        let objects = this.ordered();
        this.physics.begin(objects);
        for (const object of objects) object.beforeStep?.(dt);
        for (const object of objects) if (!object.removing) object.plan?.(dt);
        this.dispatchEvents();
        this.flush();
        objects = this.ordered();
        for (const object of objects) if (!object.removing) object.beforePhysics?.(dt);
        this.physics.integrate(objects, dt);
        this.physics.syncAttachments(objects);
        // World-object reactions (e.g. water landing) precede game rules.
        for (const object of objects.filter((o) => o.body))
          if (!object.removing) object.afterPhysics?.(dt);
        this.physics.syncAttachments(objects);
        for (const object of objects.filter((o) => !o.body))
          if (!object.removing) object.afterPhysics?.(dt);
        this.flush();
        objects = this.ordered();
        for (const contact of this.collisions.detect(objects))
          for (const object of objects) object.contact?.(contact);
        this.dispatchEvents();
        for (const object of objects) if (!object.removing) object.afterStep?.(dt);
        this.dispatchEvents();
        this.physics.syncAttachments(objects);
        for (const object of objects) if (!object.removing) object.animate?.(dt);
        // Attachments to animated anchors must use the pose rendered in this frame.
        this.physics.syncAttachments(objects);
      }
      // Output systems observe the final frame, including transitions into pause.
      for (const object of this.ordered()) object.afterFrame?.();
    } finally {
      this.stepping = false;
      this.flush();
    }
  }
  render() {
    this.renderer?.render(this.ordered());
  }
  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    let previous = performance.now();
    const frame = (now) => {
      if (!this.running) return;
      this.step((now - previous) / 1000);
      previous = now;
      this.render();
      this.frameId = requestAnimationFrame(frame);
    };
    this.frameId = requestAnimationFrame(frame);
  }
  stop() {
    this.running = false;
    for (const object of this.ordered()) object.onStop?.();
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
  }
  dispose() {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    this.additions.length = 0;
    for (const object of [...this.list(), ...this.pending]) this.remove(object);
    this.events.length = this.commands.length = 0;
    this.collisions.reset();
    this.assets?.dispose?.();
    this.renderer?.dispose?.();
  }
}
