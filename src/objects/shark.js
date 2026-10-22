import { WorldObject } from '../core/object.js';
import { circle } from '../core/collision.js';
import { FISH_PIVOT, FISH_AX, FISH_AY, FISH_SPAN } from '../config/art.js';
import { SvgVisual } from '../visuals/svg-visual.js';
import { createFishPainter } from '../visuals/fish-painter.js';
export class Shark extends WorldObject {
  constructor({ id = 'shark', targetId = 'player' } = {}) {
    super({ id, tags: ['enemy', 'shark'], order: 10 });
    this.targetId = targetId;
    this.assetKeys = ['fish'];
    this.generation = 0;
    this.visual = new SvgVisual(this, createFishPainter, [[120, 'drawFish']]);
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
    return (this.target?.r ?? 14) * 2.4;
  }
  reset() {
    this.generation++;
    this.mode = 'patrol';
    this.locked = true;
    this.gone = 0;
    this.ate = false;
    this.ang = Math.PI;
    this.dir = -1;
    this.bob = this.platform.cosmeticRandom() * 6;
    this.sw = 0;
    this.rest = 0;
    this.trail = [];
    this.lock = null;
    this.vx = -1;
    this.vy = 0;
    this.body.enabled = false;
    this.platform.physics.place(
      this,
      this.viewport.width * 0.75,
      this.viewport.waterY + (this.viewport.height - this.viewport.waterY) * 0.5,
    );
  }
  respawn() {
    this.reset();
    this.locked = false;
    this.body.enabled = true;
    this.vx = -80;
    this.platform.physics.place(
      this,
      this.viewport.width + this.size * 2,
      this.viewport.waterY + (this.viewport.height - this.viewport.waterY) * 0.5,
    );
  }
  lockTarget(target) {
    this.lock = { x: target.x, y: target.y };
  }
  charge(target = this.target) {
    this.lockTarget(target);
    this.mode = 'charge';
    this.chargeT = 0;
  }
  leap(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    this.mode = 'leap';
    this.trail = [];
  }
  recover(seconds = 0.55) {
    this.mode = 'recover';
    this.rest = seconds;
    this.trail = [];
    this.lock = null;
  }
  capture(bird) {
    this.ate = true;
    this.platform.physics.attach(bird, this, (parent) => ({
      x: parent.x + Math.cos(parent.ang) * parent.size * 0.95,
      y: parent.y + Math.sin(parent.ang) * parent.size * 0.95,
    }));
  }
  release() {
    this.ate = false;
    this.recover(1.5);
    this.vy = 0;
  }
  toWorld(sx, sy) {
    const k = (this.size * 2.1) / FISH_SPAN;
    let lx = -(sx - FISH_AX) * k,
      ly = (sy - FISH_AY) * k;
    if (Math.cos(this.ang) < 0) ly = -ly;
    return {
      x: this.x + lx * Math.cos(this.ang) - ly * Math.sin(this.ang),
      y: this.y + lx * Math.sin(this.ang) + ly * Math.cos(this.ang),
    };
  }
  plan(dt) {
    if (this.locked || this.gone > 0) {
      this.body.enabled = false;
      return;
    }
    this.body.enabled = true;
    if (!this.target) {
      this.body.enabled = false;
      return;
    }
    const bird = this.target,
      viewport = this.viewport,
      session = this.session,
      effects = this.platform.get('effects');
    const splash = (...args) => effects.splash(...args),
      fishToWorld = (...args) => this.toWorld(...args);
    const f = this,
      s = this.size,
      depth = viewport.waterY + (viewport.height - viewport.waterY) * 0.5,
      surf = viewport.waterY + s * 0.5,
      G = viewport.height * 2.2;
    const swPrev = f.sw || 0;
    f.sw =
      swPrev +
      dt *
        (f.mode === 'chase' || f.mode === 'leap' || f.mode === 'charge'
          ? 20
          : f.mode === 'recover'
            ? 4
            : 7.5); // fin-beat phase
    // bubbles are churned off the tail fin at the end of each stroke (when the swing reverses)
    if (
      f.y > viewport.waterY + s * 0.35 &&
      !f.ate &&
      Math.sign(Math.cos(f.sw)) !== Math.sign(Math.cos(swPrev))
    ) {
      const hard = f.mode === 'chase' || f.mode === 'leap' || f.mode === 'charge',
        amp = hard ? 0.32 : 0.2,
        a = Math.sin(f.sw) * amp,
        [px, py] = FISH_PIVOT.tail;
      const tip = fishToWorld(px + Math.cos(a) * 210, py + Math.sin(a) * 210),
        side = fishToWorld(px + Math.cos(a) * 210, py + Math.sin(a) * 210 + Math.sign(a) * 60);
      const kick = Math.atan2(side.y - tip.y, side.x - tip.x),
        n = hard
          ? 3 + ((this.platform.cosmeticRandom() * 2) | 0)
          : 1 + ((this.platform.cosmeticRandom() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const sp = 30 + this.platform.cosmeticRandom() * 50;
        effects.bubbles.push({
          x: tip.x + (this.platform.cosmeticRandom() - 0.5) * 6,
          y: tip.y + (this.platform.cosmeticRandom() - 0.5) * 6,
          vx: Math.cos(kick) * sp,
          vy: Math.sin(kick) * sp,
          life: 1,
          r: 0.6 + this.platform.cosmeticRandom() * 0.7,
        });
      }
    }
    const inDanger = this.attackAllowed; // bird's centre decides, same as the hawk zone
    const cruise = Math.max(70, viewport.width * 0.16),
      ATK = 1.5,
      sprint = Math.max(380, viewport.width * 1.05) * ATK,
      accel = sprint * 2.6; // ATK: attack-speed multiplier (dash + leap)
    const steer = (want, cap) => {
      const d = want - f.vx,
        m = cap * dt;
      f.vx += Math.max(-m, Math.min(m, d));
    };
    const GL = viewport.height * 4.2; // gravity for the strike leap: a fast, flat, violent arc
    if (f.mode === 'leap') {
      // pure projectile: no steering once launched, flies through the locked point and beyond
      f.vy += GL * dt;
    } else {
      if (f.mode === 'recover') {
        f.rest -= dt;
        if (f.rest <= 0) f.mode = 'patrol';
      } else if (f.mode !== 'charge') {
        const was = f.mode;
        f.mode = inDanger ? 'chase' : 'patrol';
        if (f.mode === 'chase' && was !== 'chase') {
          this.platform.emit('attack-started', { attacker: this, target: bird });
          if (bird.y < viewport.waterY) {
            // bird above water: lock its position now and commit to a strike on that point
            this.charge(bird);
          }
        }
      }
      let ty, vyCap;
      if (f.mode === 'charge') {
        // rocket to the surface under the locked point, then launch
        const L = f.lock;
        f.chargeT += dt;
        const dx = L.x - f.x,
          STRIKE = 1.6;
        steer(
          Math.max(-sprint * STRIKE, Math.min(sprint * STRIKE, dx * 8)),
          accel * STRIKE * 2,
        );
        ty = surf;
        vyCap = viewport.height * 1.6;
        const reach = Math.max(s * 2.2, Math.abs(f.vx) * 0.12);
        if ((f.y < surf + s * 0.5 && Math.abs(dx) < reach) || f.chargeT > 1.1) {
          // solve the projectile so the arc passes through the locked point
          const dy = L.y - f.y,
            T = Math.max(0.16, Math.min(0.4, Math.sqrt((Math.abs(dy) * 2) / GL) * 0.85));
          this.leap(dx / T, (dy - 0.5 * GL * T * T) / T);
          splash(f.x, 18, viewport.height * 0.4);
          effects.shake = Math.max(effects.shake, 0.15);
        }
      } else if (f.mode === 'chase') {
        const dx = bird.x - f.x;
        steer(Math.max(-sprint, Math.min(sprint, dx * 5 * ATK)), accel);
        const birdWet = bird.y > viewport.waterY + s * 0.2;
        ty = birdWet ? bird.y : surf;
        vyCap = viewport.height * 0.9 * ATK; // bird in the water: swim straight at it
        // close enough and near the surface: jump at the bird's current position
        const h = f.y - (bird.y - bird.r * 0.3);
        if (!birdWet && f.y < surf + s * 0.4 && h > 0) {
          const Gs = G * ATK * ATK,
            vy = Math.sqrt(2 * Gs * h),
            T = vy / Gs,
            need = dx / T;
          if (Math.abs(need) < sprint * 0.9 && Math.abs(dx) < s * 3) {
            this.leap(need, -vy);
            splash(f.x, 14, viewport.height * 0.35);
          }
        }
      } else {
        if (f.x < s * 1.2) f.dir = 1;
        else if (f.x > viewport.width - s * 1.2) f.dir = -1;
        steer(f.dir * (f.mode === 'recover' ? cruise * 0.4 : cruise), accel * 0.3);
        ty =
          depth +
          Math.sin(session.time * 1.3 + f.bob) * (viewport.height - viewport.waterY) * 0.12;
        vyCap = viewport.height * (f.mode === 'recover' ? 0.25 : 0.2);
        if (f.ate) {
          ty = viewport.height + s * 4;
          vyCap = viewport.height * 0.3;
        } // carries its catch down into the deep
      }
      if (f.mode !== 'leap') {
        f.vy = Math.max(
          -vyCap,
          Math.min(
            vyCap,
            (ty - f.y) * (f.mode === 'chase' ? 4 * ATK : f.mode === 'charge' ? 12 : 4),
          ),
        );
        if (Math.abs(f.vx) > 5) f.dir = Math.sign(f.vx);
      }
    }
  }
  afterPhysics(dt) {
    if (!this.body.enabled) return;
    const viewport = this.viewport;
    if (this.mode === 'leap') {
      this.trail.push([this.x, this.y, this.ang]);
      if (this.trail.length > 5) this.trail.shift();
      if (this.vy > 0 && this.y > viewport.waterY + this.size * 0.3) {
        this.platform.get('effects').splash(this.x, 14, viewport.height * 0.3);
        this.vy *= 0.25;
        this.vx *= 0.4;
        this.recover();
      }
    }
    const f = this;
    const want =
      f.mode === 'leap'
        ? Math.atan2(f.vy, f.vx || f.dir)
        : Math.atan2(f.vy * 0.6, f.vx || f.dir);
    let d = want - f.ang;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    f.ang += d * Math.min(1, dt * (f.mode === 'leap' ? 14 : 8));
  }
  getColliders() {
    if (this.locked || this.gone > 0) return [];
    const parts = [
      circle(this, 'projectile-target', 'enemy', ['projectile'], this.size * 0.6),
    ];
    if (!this.ate)
      parts.push(
        circle(this, 'attack', 'predator', ['player'], this.size * 0.5, {
          priority: 10,
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
