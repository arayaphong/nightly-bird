import { WorldObject } from '../core/object.js';
import { circle } from '../core/collision.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createItemsPainter } from '../visuals/items-painter.js';

export class Firefly extends WorldObject {
  constructor({ x = 0, y = 0, rainbow = false, ph = 0, bl = 0, id } = {}) {
    super({ id, x, y, tags: ['firefly', 'pickup'], scope: 'run', order: 30 });
    Object.assign(this, { rainbow, ph, bl });
    this.eaten = false;
    this.pulled = false;
    this.tr = [];
    this.assetKeys = ['firefly'];
    this.visual = new SvgVisual(this, createItemsPainter, [[70, 'drawFlies']]);
  }
  attach(platform) {
    super.attach(platform);
    this.visual.attach(platform);
  }
  flutter(dt) {
    const session = this.platform.get('session');
    this.vx =
      (session.phase === 'play' ? -session.speed * 0.8 : 0) +
      Math.sin(session.time * 2.3 + this.ph) * 22;
    this.vy = Math.cos(session.time * 1.9 + this.ph * 1.3) * 26;
    this.pulled = false;
    const bird = this.platform.find('player');
    bird?.magnet.pull(this, dt, bird.r * 1.6);
  }
  plan(dt) {
    this.flutter(dt);
  }
  afterPhysics() {
    this.tr.push([this.x, this.y]);
    if (this.tr.length > 10) this.tr.shift();
    if (this.x < -30) this.platform.remove(this);
  }
  collect() {
    if (this.eaten || this.removing) return false;
    this.eaten = true;
    this.platform.remove(this);
    return true;
  }
  getColliders() {
    return this.eaten ? [] : [circle(this, 'body', 'firefly', ['beak'], 4, { priority: 30 })];
  }
  renderEntries() {
    return this.visual.entries();
  }
  detach() {
    this.visual.dispose();
    super.detach();
  }
}
