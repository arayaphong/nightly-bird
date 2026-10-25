import { WorldObject } from '../core/object.js';
import { circle } from '../core/collision.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createHawkPainter } from '../visuals/hawk-painter.js';

export class Hawk extends WorldObject {
  constructor({ id = 'hawk', targetId = 'player' } = {}) {
    super({ id, tags: ['enemy', 'hawk'], order: 20 });
    this.targetId = targetId;
    this.assetKeys = ['hawk', 'hawkDive'];
    this.visual = new SvgVisual(this, createHawkPainter, [[130, 'drawHawk']]);
    this.generation = 0;
  }
  attach(platform) {
    super.attach(platform);
    this.viewport = platform.get('viewport');
    this.session = platform.get('session');
    this.reset();
    this.visual.attach(platform);
  }
  get target() {
    return this.platform.get(this.targetId);
  }
  get size() {
    return (this.target?.r ?? 14) * 2.2;
  }
  reset() {
    this.generation++;
    this.locked = true;
    this.gone = 0;
    this.ate = false;
    this.mode = 'patrol';
    this.dir = 1;
    this.ang = 0;
    this.flap = 0;
    this.stunTime = 0;
    this.trail = [];
    this.vx = 60;
    this.vy = 0;
    this.body.enabled = false;
    this.platform.physics.place(this, this.viewport.width * 0.35, this.viewport.height * 0.14);
  }
  respawn() {
    this.reset();
    this.locked = false;
    this.body.enabled = true;
    this.vx = 80;
    this.platform.physics.place(this, -this.size * 2, this.viewport.height * 0.14);
  }
  lockTarget(target) {
    const dx = target.x - this.x,
      dy = target.y - this.y,
      d = Math.hypot(dx, dy) || 1;
    this.lock = { x: target.x, y: target.y, dx: dx / d, dy: dy / d, distance: d };
    this.dir = dx >= 0 ? 1 : -1;
    this.ang = Math.atan2(dy, Math.abs(dx));
  }
  attack(target = this.target) {
    if (!target || this.locked || this.gone > 0 || this.mode !== 'patrol' || this.stunTime > 0)
      return false;
    this.lockTarget(target);
    this.mode = 'dive';
    this.trail = [];
    this.travel = 0;
    this.attackSpeed = Math.max(0, this.vx * this.lock.dx + this.vy * this.lock.dy) * 0.3;
    this.platform.emit('attack-started', { attacker: this, target });
    this.platform.emit('hawk-strike', { attacker: this, target });
    return true;
  }
  stun(seconds) {
    this.stunTime = seconds;
    this.returnToPatrol();
  }
  returnToPatrol() {
    this.mode = 'patrol';
    this.trail = [];
  }
  steer(tx, ty, speed, acceleration, dt) {
    const dx = tx - this.x,
      dy = ty - this.y,
      d = Math.hypot(dx, dy) || 1;
    let ax = (dx / d) * Math.min(speed, d * 6) - this.vx,
      ay = (dy / d) * Math.min(speed, d * 6) - this.vy;
    const a = Math.hypot(ax, ay),
      limit = acceleration * dt;
    if (a > limit) {
      ax *= limit / a;
      ay *= limit / a;
    }
    this.vx += ax;
    this.vy += ay;
  }
  plan(dt) {
    if (this.locked || this.gone > 0) {
      this.body.enabled = false;
      return;
    }
    this.body.enabled = true;
    const { width, height, waterY } = this.viewport,
      home = height * 0.14,
      s = this.size;
    const cruise = Math.max(60, width * 0.14),
      sprint = Math.max(360, width * 0.95) * 1.5,
      accel = sprint * 2.2;
    const bird = this.target,
      play = this.session.phase === 'play' && bird?.alive;
    if (this.ate) this.steer(this.x + this.dir * 200, -s * 4, cruise * 2.5, accel * 0.5, dt);
    else if (this.mode === 'dive') {
      this.attackSpeed = Math.min(sprint * 1.7, this.attackSpeed + accel * 1.7 * 2.2 * dt);
      this.vx = this.lock.dx * this.attackSpeed;
      this.vy = this.lock.dy * this.attackSpeed;
      this.travel += this.attackSpeed * dt;
      this.trail.push([this.x, this.y, this.ang]);
      if (this.trail.length > 5) this.trail.shift();
      if (
        this.travel > this.lock.distance + height * 0.3 ||
        this.y > waterY - s * 2.5 ||
        this.x < -s ||
        this.x > width + s
      ) {
        this.mode = 'return';
        this.trail = [];
        this.vx *= 0.3;
        this.vy *= 0.3;
      }
    } else if (this.mode === 'return') {
      const tx = Math.max(
        s * 2,
        Math.min(width - s * 2, this.x + (this.x < width * 0.5 ? 1 : -1) * width * 0.25),
      );
      this.steer(tx, home, cruise * 4.5, accel * 1.2, dt);
      if (this.y < home + height * 0.06) this.returnToPatrol();
    } else {
      this.stunTime = Math.max(0, this.stunTime - dt);
      if (play && this.attackAllowed && this.stunTime === 0) this.attack(bird);
      if (this.mode !== 'dive') {
        if (this.x < s * 1.2) this.dir = 1;
        else if (this.x > width - s * 1.2) this.dir = -1;
        this.steer(
          this.x + this.dir * 120,
          home + Math.sin(this.session.time * 1.1) * height * 0.025,
          cruise * 1.6,
          accel * 0.25,
          dt,
        );
      }
    }
  }
  afterPhysics(dt) {
    if (!this.body.enabled) return;
    if (this.mode !== 'dive' || this.ate) {
      if (Math.abs(this.vx) > 8) this.dir = Math.sign(this.vx);
      const want = Math.atan2(this.vy, Math.abs(this.vx) + 1) * 0.9;
      this.ang += (want - this.ang) * Math.min(1, dt * 8);
    }
    this.flap += dt * (this.mode === 'dive' ? 2 : this.ate ? 14 : 5);
  }
  getColliders() {
    if (this.locked || this.gone > 0) return [];
    const parts = [
      circle(this, 'projectile-target', 'enemy', ['projectile'], this.size * 0.6),
    ];
    if (this.mode === 'dive' && !this.ate)
      parts.push(
        circle(this, 'attack', 'predator', ['player'], this.size * 0.5, {
          priority: 20,
          swept: true,
        }),
      );
    return parts;
  }
  renderEntries() {
    return this.visual.entries();
  }
  detach() {
    this.visual.dispose();
    super.detach();
  }
}
