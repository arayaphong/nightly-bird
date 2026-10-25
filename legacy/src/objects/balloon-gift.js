import { WorldObject } from '../core/object.js';
import { circle } from '../core/collision.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createItemsPainter } from '../visuals/items-painter.js';

export class BalloonGift extends WorldObject {
  constructor({ id, x = 0, y = 0, suit = false, ph = 0, col = '#ff6a55' } = {}) {
    super({ id, x, y, tags: ['gift', 'pickup'], scope: 'run', order: 50 });
    Object.assign(this, { suit, ph, col });
    this.popped = false;
    this.pulled = false;
    this.assetKeys = ['balloon', 'gift'];
    this.visual = new SvgVisual(this, createItemsPainter, [[60, 'drawGifts']]);
  }
  attach(platform) {
    super.attach(platform);
    this.visual.attach(platform);
  }
  parts() {
    const bird = this.platform.find('player'),
      session = this.platform.get('session'),
      br = bird.r * 1.25;
    return {
      bx: this.x,
      by: this.y - br * 1.6,
      br,
      cx: this.x + Math.sin(session.time * 2 + this.ph) * 3,
      cy: this.y + br * 1.3,
      cs: bird.r * 1.3,
    };
  }
  sway(dt) {
    const session = this.platform.get('session');
    this.vx = session.phase === 'play' ? -session.speed * 0.75 : 0;
    this.vy = -6;
    this.pulled = false;
    this.platform.find('player')?.magnet.pull(this, dt);
  }
  plan(dt) {
    this.sway(dt);
  }
  afterPhysics() {
    if (this.x < -60) this.platform.remove(this);
  }
  pop() {
    if (this.popped || this.removing) return false;
    this.popped = true;
    this.platform.emit('balloon-popped', { balloon: this });
    this.platform.remove(this);
    return true;
  }
  reveal(reward) {
    this.reward = reward;
  }
  getColliders() {
    if (this.popped) return [];
    const p = this.parts();
    return [
      circle(this, 'balloon', 'gift', ['player'], p.br, { dy: p.by - this.y, priority: 50 }),
      circle(this, 'box', 'gift', ['player'], p.cs * 0.7, {
        dx: p.cx - this.x,
        dy: p.cy - this.y,
        priority: 50,
      }),
    ];
  }
  renderEntries() {
    return this.visual.entries();
  }
  detach() {
    this.visual.dispose();
    super.detach();
  }
}
