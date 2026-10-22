import { PlatformObject } from '../core/object.js';
import { BOOST_MULT, DISTANCE_SCALE } from '../config/game.js';

export class GameSession extends PlatformObject {
  constructor({ scoreStore } = {}) {
    super({ id: 'session', order: -80 });
    this.scoreStore = scoreStore;
    this.phase = 'ready';
    this.distance = 0;
    this.speed = 0;
    this.baseSpeed = 0;
    this.best = scoreStore?.load() ?? 0;
    this.worms = 0;
    this.overShown = false;
    this.deathBy = '';
    this.deadAt = 0;
    this.underwaterTime = 0;
    this.newBest = false;
    this.stageShown = 0;
    this.suitGranted = false;
    this.shopOpenedAt = 0;
  }
  get time() {
    return this.platform?.clock.simulation ?? 0;
  }
  get score() {
    return Math.round(this.distance / DISTANCE_SCALE);
  }
  setPhase(phase) {
    this.phase = phase;
    this.platform.clock.paused = ['shop', 'paused'].includes(phase);
  }
  beforeStep(dt) {
    if (this.phase !== 'play') return;
    const boost = this.platform.find('player').status.has('boost');
    this.speed +=
      (this.baseSpeed * (boost ? BOOST_MULT : 1) - this.speed) * Math.min(1, dt * 3);
    this.distance += this.speed * dt;
  }
  showOver() {
    if (this.overShown) return;
    this.overShown = true;
    this.newBest = this.score > this.best;
    if (this.newBest) {
      this.best = this.score;
      this.scoreStore?.save(this.best);
    }
  }
}
