import { WorldObject } from '../core/object.js';
import { circle } from '../core/collision.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createItemsPainter } from '../visuals/items-painter.js';

export class Projectile extends WorldObject {
  constructor({ shooter, target } = {}) {
    super({
      x: shooter.x + shooter.r,
      y: shooter.y,
      tags: ['projectile'],
      scope: 'run',
      order: 60,
    });
    this.targetId = target.id;
    this.targetObject = target;
    this.targetGeneration = target.generation;
    this.ownerId = shooter.id;
    this.life = 1.5;
    this.trail = [];
    this.speed = Math.max(900, shooter.viewport.height * 1.6);
    this.seek(target);
    this.visual = new SvgVisual(this, createItemsPainter, [[150, 'drawBullets']]);
  }
  attach(platform) {
    super.attach(platform);
    this.visual.attach(platform);
  }
  get target() {
    const target = this.platform.get(this.targetId);
    return target === this.targetObject &&
      target?.generation === this.targetGeneration &&
      !target.removing
      ? target
      : null;
  }
  seek(target) {
    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }
  plan(dt) {
    const target = this.target;
    if (!target || target.gone > 0) {
      this.expire();
      return;
    }
    this.seek(target);
    this.trail.push([this.x, this.y]);
    if (this.trail.length > 6) this.trail.shift();
    this.life -= dt;
    if (this.life <= 0) this.expire();
  }
  impact() {
    if (this.removing) return false;
    this.expire();
    return true;
  }
  expire() {
    this.life = 0;
    this.platform.remove(this);
  }
  getColliders() {
    return this.life > 0
      ? [circle(this, 'round', 'projectile', ['enemy'], 0, { priority: 60, swept: true })]
      : [];
  }
  renderEntries() {
    return this.visual.entries();
  }
  detach() {
    this.visual.dispose();
    super.detach();
  }
}
