import { WorldObject } from '../core/object.js';
import { circle } from '../core/collision.js';
import { AGI_START } from '../config/game.js';
import { EquipmentRack, Magnet } from '../components/equipment.js';
import { StatusEffects } from '../components/status-effects.js';
import { BirdAnimation } from '../visuals/bird-animation.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createBirdPainter } from '../visuals/bird-painter.js';
import { createItemsPainter } from '../visuals/items-painter.js';
import { RainbowTrail } from '../components/rainbow-trail.js';
import { BIRD_ANCHOR, BIRD_MOUTH, BIRD_SPAN } from '../config/art.js';

export class Redbird extends WorldObject {
  constructor({ id = 'player', ...options } = {}) {
    super({ ...options, id, tags: ['player'], order: -90 });
    this.assetKeys = ['bird', 'birdEating', 'helmet', 'suit', 'gun', 'magnet'];
    this.equipment = new EquipmentRack(this);
    this.status = new StatusEffects();
    this.magnet = new Magnet(this);
    this.rainbow = new RainbowTrail(this);
    this.mouthfuls = new Set();
    this.visual = new SvgVisual(this, createBirdPainter, [[100, 'drawBird']]);
    this.itemVisual = new SvgVisual(this, createItemsPainter, [
      [80, 'drawMagnetField'],
      [90, 'drawBoostTrail'],
    ]);
    this.lifeState = 'alive';
    this.agi = AGI_START;
    this.r = 14;
    this.skips = 3;
    this.rot = 0;
    this.zapped = false;
    this.flapping = false;
  }
  attach(platform) {
    super.attach(platform);
    this.viewport = platform.get('viewport');
    this.session = platform.get('session');
    this.animation = new BirdAnimation(this, this.session, platform.cosmeticRandom);
    this.reset();
    this.visual.attach(platform);
    this.itemVisual.attach(platform);
  }
  get alive() {
    return this.lifeState === 'alive';
  }
  get visible() {
    return !(
      this.alive &&
      (this.inv > 0 || this.zinv > 0) &&
      Math.sin(this.session.time * 40) > 0.3
    );
  }
  get helmet() {
    return this.equipment.has('helmet');
  }
  get suit() {
    return this.equipment.has('suit');
  }
  get gun() {
    return this.equipment.has('gun');
  }
  get inv() {
    return this.status.remaining('predatorProtection');
  }
  get zinv() {
    return this.status.remaining('lightningProtection');
  }
  get angle() {
    return this.alive
      ? Math.max(-0.6, Math.min(0.8, this.vy / (this.viewport.height * 1.4)))
      : Math.PI * 0.15 + this.rot;
  }
  resize(viewport) {
    this.r = Math.max(12, Math.min(viewport.width, viewport.height) * 0.032);
    if (this.platform)
      this.platform.physics.clamp(this, { left: this.r, right: viewport.width - this.r });
  }
  reset() {
    this.clearMouth();
    this.platform.physics.detach(this);
    this.body.enabled = true;
    this.resize(this.viewport);
    this.platform.physics.place(
      this,
      Math.min(this.viewport.width * 0.3, 180),
      this.viewport.height * 0.42,
    );
    this.vx = this.vy = 0;
    this.lifeState = 'alive';
    this.agi = AGI_START;
    this.skips = 3;
    this.rot = 0;
    this.zapped = false;
    this.flapping = false;
    this.equipment.clear();
    this.status.clear();
    this.rainbow.clear();
    this.animation.reset();
  }
  flap() {
    this.flapping = true;
  }
  glide() {
    this.flapping = false;
  }
  blink() {
    this.animation.blink();
  }
  chew() {
    if (this.alive) this.animation.chew();
  }
  eat(food) {
    if (!this.alive || !food.collect(this)) return false;
    this.mouthfuls.add(food);
    this.chew();
    return true;
  }
  mouthAnchor(food) {
    const scale = (this.r * 4.2) / BIRD_SPAN;
    const index = Math.max(0, [...this.mouthfuls].indexOf(food));
    const spread = index ? (index % 2 ? -1 : 1) * Math.ceil(index / 2) * 1.25 : 0;
    const x = (BIRD_MOUTH[0] - BIRD_ANCHOR[0]) * scale;
    const y =
      (BIRD_MOUTH[1] - BIRD_ANCHOR[1] + this.animation.chewAmount() * 3) * scale + spread;
    const angle = this.angle;
    return {
      x: this.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: this.y + x * Math.sin(angle) + y * Math.cos(angle),
    };
  }
  clearMouth() {
    for (const food of this.mouthfuls) this.platform.remove(food);
    this.mouthfuls.clear();
  }
  emitRainbow(seconds) {
    this.status.apply('boost', seconds);
  }
  equip(key) {
    return this.equipment.equip(key);
  }
  die(cause) {
    if (!this.alive) return false;
    this.lifeState = 'dead';
    this.clearMouth();
    this.rot = 0;
    this.glide();
    this.platform.emit('bird-died', { bird: this, cause });
    return true;
  }
  revive() {
    this.clearMouth();
    this.platform.physics.detach(this);
    this.lifeState = 'alive';
    this.zapped = false;
    this.rot = 0;
    this.platform.physics.place(
      this,
      Math.min(this.viewport.width * 0.3, 180),
      this.viewport.height * 0.42,
    );
    this.vx = 0;
    this.vy = -this.viewport.height * 0.2;
    this.skips = 3;
    this.status.apply('predatorProtection', 2.5);
    this.status.apply('lightningProtection', 2.5);
  }
  beforeStep(dt) {
    if (this.session.phase === 'play') this.status.update(dt);
  }
  plan(dt) {
    const { height, width, waterY } = this.viewport;
    const wet = this.y > waterY;
    if (this.body.mode === 'attached') return;
    this.body.mode = 'dynamic';
    if (this.session.phase === 'ready') {
      this.body.mode = 'kinematic';
      this.vx = 0;
      this.vy = dt ? (height * 0.42 + Math.sin(this.session.time * 2) * 10 - this.y) / dt : 0;
      return;
    }
    if (!this.alive) {
      if (wet) {
        this.vy += (height * 0.09 - this.vy) * Math.min(1, dt * 4);
        this.vx = Math.sin(this.session.time * 2.2) * 12;
      } else {
        this.vy += height * 1.5 * dt;
        this.vx = 0;
      }
      return;
    }
    const wind = this.platform.get('wind').sampleAt(this.x, this.y);
    const up = wet ? height * 1.7 : height * 2.7 * this.agi;
    const gravity = wet ? height * 0.45 : height * 1.5 * this.agi;
    const max = wet ? height * 0.45 : height * 0.95;
    if (wet) this.vy *= 1 - Math.min(1, dt * 3.5);
    this.vy += ((this.flapping ? -up : gravity) + (wet ? 0 : wind.y)) * dt;
    this.vy = Math.max(-max, Math.min(max, this.vy));
    this.vx += ((wet ? 0 : wind.x) - this.vx) * Math.min(1, dt * 1.2);
    this.flightBounds = {
      left: Math.max(this.r * 3, width * 0.1),
      right: width * 0.62,
      top: this.r + 8,
      bottom: height - this.r - 4,
    };
  }
  animate(dt) {
    this.animation.update(dt);
  }
  afterStep(dt) {
    this.rainbow.update(dt);
  }
  getColliders() {
    if (!this.alive || this.session.phase !== 'play') return [];
    return [
      circle(this, 'body', 'player', ['predator', 'gift', 'lightning'], this.r),
      circle(this, 'beak', 'beak', ['firefly'], this.r * 1.3, { dx: this.r * 1.6 }),
    ];
  }
  renderEntries() {
    return [...this.visual.entries(), ...this.itemVisual.entries()];
  }
  detach() {
    this.clearMouth();
    this.visual.dispose();
    this.itemVisual.dispose();
    super.detach();
  }
}
