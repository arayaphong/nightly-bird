import { Rule } from '../core/rule.js';

export class WaterRule extends Rule {
  afterPhysics(dt) {
    const p = this.platform,
      v = p.get('viewport'),
      s = p.get('session'),
      water = p.get('water'),
      effects = p.get('effects');
    for (const bird of p.list('player')) {
      if (bird.body.mode === 'attached' || !['play', 'dead'].includes(s.phase)) continue;
      const before = bird.body.previous.y,
        wet = before > v.waterY;
      if (bird.alive) {
        const foot = bird.r * 0.55;
        if (!wet && bird.vy > 0 && bird.y + foot > v.waterY && before + foot <= v.waterY) {
          if (bird.skips > 0) {
            const height = (v.waterY - foot - v.dangerY) * Math.pow(0.5, 3 - bird.skips);
            p.physics.place(bird, bird.x, v.waterY - foot, { resetPrevious: false });
            bird.vy = -Math.sqrt(2 * v.height * 1.5 * bird.agi * height);
            bird.skips--;
            p.emit('water-bounce', { bird });
            water.splash(bird.x, 10, v.height * 0.24);
          } else {
            water.splash(bird.x, 16, v.height * 0.3);
            p.emit('drown', { bird });
          }
          water.ripple(bird.x);
        }
        if (bird.y + bird.r < v.dangerY - v.height * 0.06 && bird.skips < 3) bird.skips = 3;
        const shark = p
          .list('shark')
          .find((enemy) => enemy.targetId === bird.id && !enemy.locked && enemy.gone <= 0);
        if (!shark && bird.y - bird.r > v.waterY) p.emit('drown', { bird });
        if (before <= v.waterY !== bird.y <= v.waterY)
          water.splash(bird.x, wet ? 8 : 12, v.height * (wet ? 0.22 : 0.3));
        if (bird.flightBounds) p.physics.clamp(bird, bird.flightBounds);
      } else if (before <= v.waterY && bird.y > v.waterY) {
        p.emit('bird-sank', { bird });
        water.splash(bird.x, 14, v.height * 0.28);
        water.ripple(bird.x);
        bird.vy *= 0.3;
      }
      if (wet && p.cosmeticRandom() < dt * (bird.alive ? 14 : 10))
        effects.bubbles.push({
          x: bird.x + (p.cosmeticRandom() - 0.5) * bird.r,
          y: bird.y - bird.r * 0.5,
          life: 1,
        });
    }
    // Resolve deaths before contacts so a drowned bird cannot collect or block a hit.
    p.dispatchEvents();
  }
}
