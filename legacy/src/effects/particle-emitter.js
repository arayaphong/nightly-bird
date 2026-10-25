import { PlatformObject } from '../core/object.js';
import { createParticleMotion } from './particle-motion.js';
import { createEffectsPainter } from '../visuals/effects-painter.js';
import { SvgVisual } from '../visuals/svg-visual.js';

export class ParticleEmitter extends PlatformObject {
  constructor() {
    super({ id: 'effects', order: 100 });
    this.reset();
    this.visual = new SvgVisual(this, createEffectsPainter, [
      [40, 'drawRipples'],
      [140, 'drawSparks'],
      [160, 'drawFeathers'],
      [170, 'drawLabels'],
      [180, 'drawReturnCountdown'],
      [190, 'drawBubbles'],
      [200, 'drawSplash'],
    ]);
  }
  attach(platform) {
    super.attach(platform);
    this.motion = createParticleMotion(this.view, platform.physics, platform.cosmeticRandom);
    this.visual.attach(platform);
  }
  reset() {
    for (const key of ['splashes', 'ripples', 'sparks', 'feathers', 'bubbles', 'labels'])
      this[key] = [];
    this.shake = this.flash = 0;
  }
  splash(...args) {
    this.motion.splash(...args);
  }
  burstSparks(...args) {
    this.motion.burstSparks(...args);
  }
  label(txt, col = '#fff', point = {}) {
    const viewport = this.platform.get('viewport');
    this.labels.push({
      x: viewport.width / 2,
      y: viewport.height * 0.36,
      txt,
      col,
      life: 2,
      big: true,
      ...point,
    });
  }
  feathersAt(
    x,
    y,
    {
      count = 14,
      colors = ['#ffc6d2', '#fff3b0', '#ff6a55'],
      power = 220,
      smoke = false,
    } = {},
  ) {
    const random = this.platform.cosmeticRandom;
    for (let i = 0; i < count; i++)
      this.feathers.push({
        x,
        y,
        vx: (random() - 0.5) * power,
        vy: (random() - 0.6) * power,
        life: 1,
        rot: random() * 6,
        c: colors[i % colors.length],
        smoke: smoke && i % 3 === 0,
      });
  }
  beforeStep(dt) {
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt * 3);
  }
  afterStep(dt) {
    this.motion.updateLabels(dt);
    this.motion.updateSparks(dt);
    this.motion.updateParticles(dt);
  }
  renderEntries() {
    return [
      ...this.visual.entries(),
      {
        layer: 59,
        draw: () => {
          if (this.flash > 0) {
            const renderer = this.platform.renderer,
              viewport = this.platform.get('viewport');
            renderer.context.fillStyle = `rgba(220,225,255,${this.flash * 0.18})`;
            renderer.context.fillRect(0, 0, viewport.width, viewport.height);
          }
        },
      },
    ];
  }
  detach() {
    this.visual.dispose();
    super.detach();
  }
}
