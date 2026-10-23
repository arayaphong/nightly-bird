import { WorldObject } from '../core/object.js';
import { circle } from '../core/collision.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createItemsPainter } from '../visuals/items-painter.js';

export class Firefly extends WorldObject {
  constructor({ x = 0, y = 0, rainbow = false, ph = 0, bl = 0, id } = {}) {
    super({ id, x, y, tags: ['firefly', 'pickup'], scope: 'run', order: 30 });
    Object.assign(this, { rainbow, ph, bl });
    this.eaten = false;
    this.eater = null;
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
    if (this.eaten) return;
    this.flutter(dt);
  }
  afterPhysics() {
    if (this.eaten) return;
    this.tr.push([this.x, this.y]);
    if (this.tr.length > 10) this.tr.shift();
    if (this.x < -30) this.platform.remove(this);
  }
  collect(eater) {
    if (this.eaten || this.removing || !eater?.alive || eater.platform !== this.platform)
      return false;
    this.eaten = true;
    this.eater = eater;
    this.tags.delete('pickup');
    this.pulled = false;
    this.tr = [];
    this.platform.physics.attach(this, eater, (bird) => bird.mouthAnchor(this));
    return true;
  }
  animate() {
    if (
      this.eaten &&
      (!this.eater?.alive || this.eater.removing || this.eater.animation.chewTime <= 0)
    )
      this.platform.remove(this);
  }
  getColliders() {
    return this.eaten ? [] : [circle(this, 'body', 'firefly', ['beak'], 4, { priority: 30 })];
  }
  renderEntries() {
    if (this.eaten && !this.eater?.visible) return [];
    return this.visual
      .entries()
      .map((entry) => (this.eaten ? { ...entry, layer: 101 } : entry));
  }
  detach() {
    this.eater?.mouthfuls.delete(this);
    this.eater = null;
    this.platform.physics.detach(this);
    this.visual.dispose();
    super.detach();
  }
}
