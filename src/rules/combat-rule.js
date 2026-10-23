import { Rule } from '../core/rule.js';

export class CombatRule extends Rule {
  beforeStep() {
    const session = this.platform.get('session'),
      viewport = this.platform.get('viewport');
    for (const enemy of this.platform.list('enemy')) {
      const bird = enemy.target;
      enemy.attackAllowed =
        session.phase === 'play' &&
        !!bird?.alive &&
        (enemy.tags.has('shark') ? bird.y > viewport.dangerY : bird.y < viewport.highY);
    }
  }
  hit(bird, cause, attacker = null) {
    const p = this.platform,
      s = p.get('session'),
      v = p.get('viewport'),
      effects = p.get('effects');
    if (!bird.alive || s.phase !== 'play') return false;
    const protection = cause === 'storm' ? 'lightningProtection' : 'predatorProtection';
    if (cause !== 'drown' && bird.status.has(protection)) return false;
    const armor = bird.equipment.absorb(cause);
    if (armor) {
      p.emit('bird-armor-hit', { bird, cause, armor, attacker });
      bird.status.apply(protection, 1);
      effects.flash = armor === 'suit' ? 0.6 : 0.4;
      effects.feathersAt(bird.x, bird.y, {
        colors: armor === 'suit' ? ['#bfe3ff', '#fff', '#6fb8ff'] : ['#f2c230', '#fff3b0'],
        count: armor === 'suit' ? 14 : 10,
      });
      if (cause === 'hawk') {
        bird.vy = v.height * 0.35;
        if (attacker) {
          attacker.vx = -attacker.vx * 0.7;
          attacker.vy = -Math.abs(attacker.vy) * 0.8 - v.height * 0.3;
          attacker.stun(1);
        }
      } else if (cause === 'fish') {
        bird.vy = -v.height * 0.55;
        if (attacker) {
          const away = Math.sign(attacker.x - bird.x) || 1;
          if (attacker.mode === 'leap') {
            attacker.vy = Math.abs(attacker.vy) * 0.4 + v.height * 0.3;
            attacker.vx = away * Math.abs(attacker.vx || 200) * 0.6;
          } else {
            attacker.vx = away * Math.max(380, v.width * 1.05) * 0.6;
            attacker.vy = v.height * 0.4;
            attacker.recover(1);
          }
        }
      }
      return false;
    }
    bird.die(cause);
    if (cause === 'fish' && attacker) {
      attacker.capture(bird);
      effects.splash(bird.x, 18, v.height * 0.4);
    } else if (cause === 'hawk') {
      if (attacker) attacker.ate = true;
      bird.vy = -v.height * 0.15;
      effects.feathersAt(bird.x, bird.y);
    } else if (cause === 'storm') {
      bird.zapped = true;
      bird.vy = 0;
      effects.feathersAt(bird.x, bird.y, {
        count: 18,
        colors: ['#1a1210', '#2b1a14', '#3d2219', '#4a1612', '#120d0a'],
        smoke: true,
      });
    }
    // Drowning leaves the body free: it must never set a predator's capture state.
    return true;
  }
  onContact(contact) {
    if (contact.phase === 'exit') return false;
    const parts = [contact.a, contact.b],
      body = parts.find((c) => c.group === 'player');
    const hazard = parts.find((c) => ['predator', 'lightning'].includes(c.group));
    if (!body || !hazard) return false;
    const bird = body.owner,
      source = hazard.owner;
    if (bird.removing || source.removing) return true;
    if (hazard.group === 'lightning') {
      this.hit(bird, 'storm', source);
      return true;
    }
    if (source.targetId !== bird.id || source.gone > 0) return true;
    const viewport = this.platform.get('viewport');
    if (source.tags.has('shark') && bird.y > viewport.dangerY) this.hit(bird, 'fish', source);
    if (source.tags.has('hawk') && bird.y <= viewport.highY) this.hit(bird, 'hawk', source);
    return true;
  }
  onEvent(event) {
    if (event.type === 'drown') {
      this.hit(event.bird, 'drown');
      return true;
    }
    return false;
  }
}
