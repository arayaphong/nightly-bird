import { PlatformObject } from '../core/object.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createEnvironmentPainter } from '../visuals/environment-painter.js';

export class NightSky extends PlatformObject {
  constructor() {
    super({ id: 'sky', order: -50 });
    this.stars = [];
    this.visual = new SvgVisual(this, createEnvironmentPainter, [
      [0, 'drawSky'],
      [10, 'drawSkyDanger'],
      [20, 'drawDanger'],
    ]);
  }
  attach(platform) {
    super.attach(platform);
    this.resize(platform.get('viewport'));
    this.visual.attach(platform);
  }
  resize(viewport) {
    const random = this.platform.cosmeticRandom;
    this.stars = [];
    [
      { n: 90, s: 0.06, r: [0.4, 1] },
      { n: 45, s: 0.16, r: [0.8, 1.5] },
      { n: 18, s: 0.34, r: [1.3, 2.2] },
    ].forEach((layer, index) => {
      for (let i = 0; i < layer.n * (viewport.width / 500 + 0.4); i++)
        this.stars.push({
          x: random() * viewport.width,
          y: random() * (viewport.waterY - 20),
          r: layer.r[0] + random() * (layer.r[1] - layer.r[0]),
          s: layer.s,
          ph: random() * 6.28,
          tw: 1 + random() * 3,
          l: index,
          hue: random() < 0.15 ? (random() < 0.5 ? '#ffd9a8' : '#bcd4ff') : '#fff',
        });
    });
  }
  beforeStep(dt) {
    const session = this.platform.get('session'),
      viewport = this.platform.get('viewport'),
      scroll = session.phase === 'play' ? session.speed : 60;
    for (const star of this.stars) {
      this.platform.physics.move(star, -scroll * star.s * dt, 0);
      if (star.x < -4) this.platform.physics.move(star, viewport.width + 8, 0);
    }
  }
  renderEntries() {
    return this.visual.entries();
  }
  detach() {
    this.visual.dispose();
    super.detach();
  }
}
export class WaterSurface extends PlatformObject {
  constructor() {
    super({ id: 'water' });
    this.visual = new SvgVisual(this, createEnvironmentPainter, [
      [30, 'drawWater'],
      [110, 'drawWaterVeil'],
    ]);
  }
  attach(platform) {
    super.attach(platform);
    this.visual.attach(platform);
  }
  splash(x, count, power) {
    this.platform.get('effects').splash(x, count, power);
  }
  ripple(x, count = 4) {
    for (let i = 0; i < count; i++)
      this.platform.get('effects').ripples.push({ x, r: 4, life: 1 });
  }
  renderEntries() {
    return this.visual.entries();
  }
  detach() {
    this.visual.dispose();
    super.detach();
  }
}
