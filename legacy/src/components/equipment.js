export class Helmet {
  constructor() {
    this.key = 'helmet';
    this.asset = 'helmet';
    this.spent = false;
  }
  absorbs(kind) {
    return !this.spent && ['fish', 'hawk'].includes(kind);
  }
  consume() {
    this.spent = true;
  }
}
export class LightningSuit {
  constructor() {
    this.key = 'suit';
    this.asset = 'suit';
    this.spent = false;
  }
  absorbs(kind) {
    return !this.spent && kind === 'storm';
  }
  consume() {
    this.spent = true;
  }
}
export class Gun {
  constructor() {
    this.key = 'gun';
    this.asset = 'gun';
    this.spent = false;
  }
  shoot(owner, target) {
    if (this.spent || !owner.alive || target.removing || target.gone > 0) return false;
    this.spent = true;
    owner.platform.emit('shot-requested', { shooter: owner, target });
    return true;
  }
}
const constructors = { helmet: Helmet, suit: LightningSuit, gun: Gun };
export class EquipmentRack {
  constructor(owner) {
    this.owner = owner;
    this.slots = new Map();
  }
  get(key) {
    const item = this.slots.get(key);
    return item && !item.spent ? item : null;
  }
  has(key) {
    return !!this.get(key);
  }
  equip(key) {
    if (!constructors[key] || this.has(key)) return false;
    this.slots.set(key, new constructors[key]());
    return true;
  }
  remove(key) {
    this.slots.delete(key);
  }
  absorb(kind) {
    for (const item of this.slots.values())
      if (item.absorbs?.(kind)) {
        item.consume();
        this.remove(item.key);
        return item.key;
      }
    return null;
  }
  clear() {
    this.slots.clear();
  }
}
export class Magnet {
  constructor(owner) {
    this.owner = owner;
  }
  get radius() {
    const viewport = this.owner.platform.get('viewport');
    return Math.min(viewport.width, viewport.height) * 0.2;
  }
  pull(object, dt, offset = 0) {
    const owner = this.owner;
    if (
      !owner.alive ||
      !owner.status.has('magnet') ||
      owner.platform.get('session').phase !== 'play'
    )
      return false;
    const dx = owner.x + offset - object.x,
      dy = owner.y - object.y;
    const distance = Math.hypot(dx, dy),
      radius = this.radius;
    if (distance < 1 || distance > radius || dt <= 0) return false;
    const speed = Math.min(220 + 520 * (1 - distance / radius), distance / dt);
    object.vx += (dx / distance) * speed;
    object.vy += (dy / distance) * speed;
    object.pulled = true;
    return true;
  }
}
