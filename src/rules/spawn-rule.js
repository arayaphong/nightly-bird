import { Rule } from '../core/rule.js';
import { Firefly } from '../objects/firefly.js';
import { BalloonGift } from '../objects/balloon-gift.js';
import { StormCloud } from '../objects/storm-cloud.js';
import { DISTANCE_SCALE, STAGE_CLOUD_M, SUIT_LEAD_M, RAINBOW_CHANCE } from '../config/game.js';
import { BALLOON_COLS } from '../config/art.js';

export class SpawnRule extends Rule {
  constructor() {
    super();
    this.assetKeys = ['firefly', 'balloon', 'gift'];
  }
  attach(platform) {
    super.attach(platform);
    this.reset();
  }
  reset() {
    this.fireflyTimer = 1.5;
    this.giftTimer = 5 + this.platform.random() * 4;
    this.cloudTimer = 2 + this.platform.random() * 2;
  }
  spawnFireflies() {
    const p = this.platform,
      v = p.get('viewport'),
      random = p.random;
    const count = 1 + Math.floor(random() * 3),
      y = v.height * 0.12 + random() * (v.waterY - v.height * 0.2);
    for (let i = 0; i < count; i++)
      p.add(
        new Firefly({
          x: v.width + 20 + i * 28,
          y: y + (random() - 0.5) * 50,
          ph: random() * 6,
          bl: random() * 6,
          rainbow: random() < RAINBOW_CHANCE,
        }),
      );
  }
  spawnGift(suit = false) {
    const p = this.platform,
      v = p.get('viewport'),
      random = p.random,
      lo = v.highY + v.height * 0.06,
      hi = v.dangerY - v.height * 0.14;
    return p.add(
      new BalloonGift({
        suit,
        x: v.width + 40,
        y: lo + random() * Math.max(1, hi - lo),
        ph: random() * 6,
        col: BALLOON_COLS[Math.floor(random() * BALLOON_COLS.length)],
      }),
    );
  }
  spawnCloud() {
    const p = this.platform,
      v = p.get('viewport'),
      random = p.random,
      width = Math.max(110, v.width * 0.3),
      height = width * 0.38;
    const lo = v.highY + height * 0.6,
      hi = v.dangerY - v.height * 0.16 - height * 0.5;
    const puffs = Array.from({ length: 6 }, (_, i) => ({
      dx: (i / 5 - 0.5) * width * 0.8 + (random() - 0.5) * 10,
      dy: (random() - 0.5) * height * 0.25,
      r: height * (0.38 + random() * 0.22),
    }));
    return p.add(
      new StormCloud({
        x: v.width + width,
        y: lo + random() * Math.max(1, hi - lo),
        width,
        ph: random() * 6,
        puffs,
      }),
    );
  }
  onEvent(event) {
    if (event.type === 'storms-unlocked') {
      this.cloudTimer = 0.5;
      return true;
    }
    return false;
  }
  beforeStep(dt) {
    const p = this.platform,
      s = p.get('session');
    for (const enemy of p.list('enemy'))
      if (enemy.gone > 0) {
        enemy.gone = Math.max(0, enemy.gone - dt);
        if (!enemy.gone) enemy.respawn();
      }
    if (s.phase !== 'play') return;
    this.fireflyTimer -= dt;
    if (this.fireflyTimer <= 0) {
      this.spawnFireflies();
      this.fireflyTimer = 2 + p.random() * 3;
    }
    const suitPhase =
      !s.suitGranted && s.distance / DISTANCE_SCALE >= STAGE_CLOUD_M - SUIT_LEAD_M;
    if (suitPhase) {
      const waiting = [...p.list('gift'), ...p.pending].some(
        (g) => g.tags.has('gift') && g.suit && !g.popped && !g.removing,
      );
      this.giftTimer = waiting ? Math.max(this.giftTimer, 0.5) : Math.min(this.giftTimer, 1.5);
    }
    this.giftTimer -= dt;
    if (this.giftTimer <= 0) {
      this.spawnGift(suitPhase);
      this.giftTimer = 9 + p.random() * 7;
    }
    if (s.distance / DISTANCE_SCALE >= STAGE_CLOUD_M) {
      this.cloudTimer -= dt;
      if (this.cloudTimer <= 0) {
        this.spawnCloud();
        this.cloudTimer = 3.5 + p.random() * 4;
      }
    }
  }
}
