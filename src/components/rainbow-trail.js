import { JET_LIFE } from '../config/animation.js';

export class RainbowTrail {
  constructor(owner) {
    this.owner = owner;
    this.points = [];
  }
  clear() {
    this.points = [];
  }
  update(dt) {
    const bird = this.owner,
      platform = bird.platform,
      session = platform.get('session');
    const scroll = session.phase === 'play' ? session.speed : 0;
    for (const point of this.points) {
      platform.physics.move(point, -scroll * dt, 0);
      point.age += dt;
    }
    this.points = this.points.filter((point) => point.age < JET_LIFE && point.x > -bird.r * 4);
    const boost = bird.status.remaining('boost');
    if (boost <= 0 || !(bird.alive ? session.phase === 'play' : bird.body.mode === 'attached'))
      return;
    const angle = bird.angle,
      x = -0.8 * bird.r,
      y = 0.12 * bird.r;
    this.points.push({
      x: bird.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: bird.y + x * Math.sin(angle) + y * Math.cos(angle),
      age: 0,
      f: Math.min(1, boost),
    });
  }
}
