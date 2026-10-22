import { WorldObject } from '../core/object.js';
import { ZAP_CHARGE, ZAP_COOL } from '../config/game.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createEnvironmentPainter } from '../visuals/environment-painter.js';

export class LightningBolt extends WorldObject {
  constructor({ points, cloud }) {
    super({ tags: ['lightning'], scope: 'run', order: 45 });
    this.body.mode = 'static';
    this.points = points;
    this.cloud = cloud;
    this.life = 0.28;
    this.armed = true;
  }
  activate() {
    this.armed = true;
  }
  afterStep(dt) {
    this.armed = false;
    this.life = Math.max(0, this.life - dt);
    if (!this.life) this.platform.remove(this);
  }
  getColliders() {
    return this.armed
      ? [
          {
            shape: 'polyline',
            name: 'strike',
            group: 'lightning',
            mask: ['player'],
            points: this.points,
            radius: 7,
            priority: 40,
          },
        ]
      : [];
  }
}

export class StormCloud extends WorldObject {
  constructor({ id, x = 0, y = 0, width = 150, ph = 0, puffs = [] } = {}) {
    super({ id, x, y, tags: ['cloud'], scope: 'run', order: 40 });
    this.w = width;
    this.h = width * 0.38;
    this.ph = ph;
    this.puffs = puffs;
    this.drops = [];
    this.chargeTime = 0;
    this.cool = 0;
    this.tx = 0;
    this.ty = 0;
    this.lightning = null;
    this.visual = new SvgVisual(this, createEnvironmentPainter, [[55, 'drawClouds']]);
  }
  attach(platform) {
    super.attach(platform);
    this.visual.attach(platform);
  }
  get charge() {
    return this.chargeTime;
  }
  get bolt() {
    return this.lightning?.life > 0 ? this.lightning.points : null;
  }
  get boltT() {
    return this.lightning?.life ?? 0;
  }
  get reach() {
    return Math.max(46, this.platform.get('viewport').width * 0.12);
  }
  distanceTo(x, y) {
    return Math.hypot(
      Math.max(0, Math.abs(x - this.x) - this.w / 2),
      Math.max(0, Math.abs(y - this.y) - this.h / 2),
    );
  }
  lockTarget(target) {
    this.tx = target.x;
    this.ty = target.y;
  }
  beginCharge(target) {
    this.lockTarget(target);
    this.chargeTime = 0.0001;
  }
  coolDown() {
    this.chargeTime = 0;
    this.cool = ZAP_COOL;
  }
  strike() {
    const sx = Math.max(this.x - this.w * 0.35, Math.min(this.x + this.w * 0.35, this.tx));
    const sy = this.y + (this.ty > this.y ? this.h * 0.3 : -this.h * 0.3),
      angle = Math.atan2(this.ty - sy, this.tx - sx);
    const ex = this.tx + Math.cos(angle) * 40,
      ey = this.ty + Math.sin(angle) * 40,
      points = [[sx, sy]];
    // The same geometry is used for drawing and hit testing.
    for (let i = 1; i < 9; i++) {
      const k = i / 9;
      points.push([
        sx + (ex - sx) * k + (this.platform.random() - 0.5) * 22,
        sy + (ey - sy) * k,
      ]);
    }
    points.push([ex, ey]);
    this.lightning = this.platform.add(new LightningBolt({ points, cloud: this }));
    this.coolDown();
    this.platform.get('effects').flash = 1;
  }
  plan(dt) {
    const session = this.platform.get('session');
    this.vx = session.phase === 'play' ? -session.speed * 0.75 : 0;
    this.vy = 0;
    this.cool = Math.max(0, this.cool - dt);
    if (this.chargeTime > 0) {
      this.chargeTime += dt;
      if (this.chargeTime >= ZAP_CHARGE) this.strike();
    } else {
      const bird = this.platform.find('player');
      if (
        session.phase === 'play' &&
        bird.alive &&
        this.cool <= 0 &&
        this.distanceTo(bird.x, bird.y) < bird.r + this.reach
      )
        this.beginCharge(bird);
    }
  }
  afterPhysics(dt) {
    const viewport = this.platform.get('viewport'),
      session = this.platform.get('session'),
      random = this.platform.cosmeticRandom;
    if (random() < dt * 40)
      this.drops.push({
        x: this.x + (random() - 0.5) * this.w * 0.8,
        y: this.y + this.h * 0.3,
      });
    for (const drop of this.drops)
      this.platform.physics.move(
        drop,
        -((session.phase === 'play' ? session.speed * 0.75 : 0) + 40) * dt,
        viewport.height * 0.9 * dt,
      );
    this.drops = this.drops.filter((drop) => drop.y < viewport.waterY);
    if (this.x < -this.w * 1.2) this.platform.remove(this);
  }
  renderEntries() {
    return this.visual.entries();
  }
  detach() {
    if (this.lightning?.platform) this.platform.remove(this.lightning);
    this.visual.dispose();
    super.detach();
  }
}
