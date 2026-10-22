import { WorldObject } from '../core/object.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createFishPainter } from '../visuals/fish-painter.js';

export class SharkCorpse extends WorldObject {
  constructor(shark, projectile) {
    super({ x: shark.x, y: shark.y, tags: ['corpse'], scope: 'run', order: 90 });
    this.size = shark.size;
    this.dir = Math.cos(shark.ang) >= 0 ? 1 : -1;
    this.tilt = 0;
    this.sw = shark.sw;
    this.twitch = 0.9;
    this.wet = shark.y > shark.viewport.waterY;
    this.vx = shark.vx * 0.2 + projectile.vx * 0.04;
    this.vy = this.wet ? -shark.viewport.height * 0.04 : Math.min(shark.vy, 0) * 0.35;
    this.assetKeys = ['fish'];
    this.visual = new SvgVisual(this, createFishPainter, [[125, 'drawCorpse']]);
  }
  attach(platform) {
    super.attach(platform);
    this.visual.attach(platform);
  }
  plan(dt) {
    const viewport = this.platform.get('viewport');
    if (this.wet) {
      this.vy += (viewport.height * 0.1 - this.vy) * Math.min(1, dt * 2.5);
      this.vx *= Math.max(0, 1 - dt * 2);
    } else this.vy += viewport.height * 2.2 * dt;
    this.twitch = Math.max(0, this.twitch - dt);
    this.sw += dt * (10 + this.twitch * 20);
    this.tilt += ((this.dir > 0 ? 0.18 : -0.18) - this.tilt) * Math.min(1, dt * 1.5);
  }
  afterPhysics() {
    const viewport = this.platform.get('viewport'),
      effects = this.platform.get('effects');
    if (!this.wet && this.y > viewport.waterY) {
      this.wet = true;
      this.vy *= 0.25;
      this.vx *= 0.4;
      effects.splash(this.x, 12, viewport.height * 0.25);
    }
    if (this.y - this.size > viewport.height) this.platform.remove(this);
  }
  renderEntries() {
    return this.visual.entries();
  }
  detach() {
    this.visual.dispose();
    super.detach();
  }
}
