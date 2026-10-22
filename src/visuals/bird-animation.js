import {
  BLINK_DUR,
  CHEW_BITES,
  CHEW_TIME,
  TAU,
  WING_LAZY_OMEGA,
  WING_OMEGA,
  WING_REST,
} from '../config/animation.js';

/** Independent channels: blinking, chewing and wing motion can play together. */
export class BirdAnimation {
  constructor(bird, session, random) {
    this.bird = bird;
    this.session = session;
    this.random = random;
    this.reset();
  }
  reset() {
    this.wingAngle = WING_REST;
    this.stopAngle = WING_REST;
    this.spin = 0;
    this.lazyTime = 1.5;
    this.blinkTime = 0;
    this.blinkNext = 2;
    this.doubleBlink = false;
    this.chewTime = 0;
  }
  blink() {
    this.blinkTime = BLINK_DUR;
  }
  chew() {
    this.chewTime = CHEW_TIME;
  }
  wing() {
    return -Math.cos(this.wingAngle);
  }
  blinkOpen() {
    if (this.blinkTime <= 0) return 1;
    const progress = 1 - this.blinkTime / BLINK_DUR;
    return 1 - 0.92 * Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
  }
  chewAmount() {
    if (this.chewTime <= 0) return 0;
    const progress = 1 - this.chewTime / CHEW_TIME;
    return Math.abs(Math.sin(progress * Math.PI * CHEW_BITES)) * (1 - progress * 0.45);
  }
  update(dt) {
    const flapping = this.bird.alive && this.bird.flapping && this.session.phase === 'play';
    if (flapping) {
      this.wingAngle += WING_OMEGA * dt;
      this.spin = WING_OMEGA;
      this.stopAngle = null;
      this.lazyTime = 1.4 + this.random() * 1.2;
    } else {
      if (this.stopAngle === null)
        this.stopAngle =
          WING_REST + TAU * Math.ceil((this.wingAngle - WING_REST) / TAU - 1e-9);
      if (this.wingAngle < this.stopAngle)
        this.wingAngle = Math.min(
          this.stopAngle,
          this.wingAngle + (this.spin || WING_OMEGA) * dt,
        );
      else if (this.bird.alive && ['play', 'ready'].includes(this.session.phase)) {
        this.lazyTime -= dt;
        if (this.lazyTime <= 0) {
          this.stopAngle = this.wingAngle + TAU;
          this.spin = WING_LAZY_OMEGA;
          this.lazyTime = 1.6 + this.random() * 1.2;
        }
      }
    }
    if (this.wingAngle > TAU * 50) {
      this.wingAngle -= TAU * 48;
      if (this.stopAngle !== null) this.stopAngle -= TAU * 48;
    }
    this.chewTime = Math.max(0, this.chewTime - dt);
    if (this.blinkTime > 0) {
      this.blinkTime = Math.max(0, this.blinkTime - dt);
      if (this.blinkTime === 0 && this.doubleBlink) {
        this.doubleBlink = false;
        this.blinkNext = 0.12;
      }
    } else if (this.bird.alive) {
      this.blinkNext -= dt;
      if (this.blinkNext <= 0) {
        this.blink();
        this.doubleBlink = this.random() < 0.25;
        this.blinkNext = 1.5 + this.random() * 3;
      }
    }
  }
}
