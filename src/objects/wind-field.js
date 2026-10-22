import {
  DISTANCE_SCALE,
  WIND_CAP_EVERY_M,
  WIND_EVERY_M,
  WIND_MAX_LVL,
  WIND_START_M,
} from '../config/game.js';

import { PlatformObject } from '../core/object.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createEnvironmentPainter } from '../visuals/environment-painter.js';
export function windCap(m) {
  return Math.max(
    1,
    Math.min(WIND_MAX_LVL, 1 + Math.floor((m - WIND_START_M) / WIND_CAP_EVERY_M)),
  );
}
export class WindField extends PlatformObject {
  constructor() {
    super({ id: 'wind', order: -60 });
    this.visual = new SvgVisual(this, createEnvironmentPainter, [[50, 'drawWind']]);
    this.reset();
  }
  reset() {
    Object.assign(this, {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      ang: 0,
      lvl: 0,
      next: WIND_START_M,
      particles: [],
    });
  }
  attach(platform) {
    super.attach(platform);
    this.visual.attach(platform);
  }
  sampleAt() {
    return { x: this.x, y: this.y };
  }
  changeDirection(angle) {
    this.ang = angle;
    this.setStrength(this.lvl);
  }
  setStrength(level) {
    this.lvl = Math.max(0, Math.min(WIND_MAX_LVL, level));
    const v = this.platform.get('viewport'),
      s = [0, 0.6, 1.1, 1.6, 2.1, 2.6][this.lvl];
    this.tx = Math.cos(this.ang) * s * v.width * 0.06;
    this.ty = Math.sin(this.ang) * s * v.height * 0.12;
  }
  beforeStep(dt) {
    const session = this.platform.get('session'),
      viewport = this.platform.get('viewport'),
      effects = this.platform.get('effects');
    if (session.phase !== 'play') return;
    const m = session.distance / DISTANCE_SCALE;
    if (m >= this.next) {
      const first = this.lvl === 0;
      const directions = Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4).filter(
        (angle) =>
          first ||
          Math.abs(Math.atan2(Math.sin(angle - this.ang), Math.cos(angle - this.ang))) >= 0.1,
      );
      const ang = directions[Math.floor(this.platform.random() * directions.length)];
      this.ang = ang;
      this.lvl = 1 + ((this.platform.random() * windCap(m)) | 0); // random 1..cap, so calm-ish winds still turn up
      const S = [0, 0.6, 1.1, 1.6, 2.1, 2.6][this.lvl];
      this.tx = Math.cos(ang) * S * viewport.width * 0.06;
      this.ty = Math.sin(ang) * S * viewport.height * 0.12;
      this.next = (first ? WIND_START_M : this.next) + WIND_EVERY_M;
      effects.labels.push({
        x: viewport.width / 2,
        y: viewport.height * 0.36,
        txt: first ? 'ลมเริ่มพัด!' : 'ลมเปลี่ยนทิศ!',
        col: '#cfe0ff',
        life: 2,
        big: true,
      });
    }
    this.x += (this.tx - this.x) * Math.min(1, dt * 1.5);
    this.y += (this.ty - this.y) * Math.min(1, dt * 1.5); // ease into the new wind
    const str = Math.hypot(
      this.x / (viewport.width * 0.06),
      this.y / (viewport.height * 0.12),
    );
    if (this.platform.cosmeticRandom() < dt * str * 14)
      this.particles.push({
        x: this.platform.cosmeticRandom() * viewport.width,
        y: this.platform.cosmeticRandom() * (viewport.waterY - 10),
        life: 1,
        len: 12 + str * 10,
      });
    const dirx = Math.cos(this.ang),
      diry = Math.sin(this.ang);
    for (const p of this.particles) {
      this.platform.physics.move(p, (dirx * (160 + 60 * str) - session.speed * 0.5) * dt, 0);
      this.platform.physics.move(p, 0, diry * (160 + 60 * str) * dt);
      p.life -= dt * 1.3;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
  renderEntries() {
    return this.visual.entries();
  }
  detach() {
    this.visual.dispose();
    super.detach();
  }
}
