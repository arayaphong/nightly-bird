import { Rule } from '../core/rule.js';
import {
  AGI_MAX,
  AGI_STEP,
  BOOST_MULT,
  BOOST_TIME,
  MAGNET_TIME,
  DISTANCE_SCALE,
  STAGE_CLOUD_M,
} from '../config/game.js';

export class PickupRule extends Rule {
  reward(bird, key) {
    const p = this.platform,
      s = p.get('session'),
      effects = p.get('effects');
    let message,
      color = '#ffc6d2';
    const duplicate = key === 'magnet' ? bird.status.has('magnet') : bird.equipment.has(key);
    if (duplicate) {
      s.worms++;
      message = 'มีอยู่แล้ว → +1 หนอน';
    } else if (key === 'magnet') {
      bird.status.apply('magnet', MAGNET_TIME);
      message = '+ แม่เหล็ก 10 วิ';
      color = '#ffb0b0';
    } else {
      bird.equip(key);
      [message, color] = {
        helmet: ['+ หมวกนิรภัย', '#ffe08a'],
        gun: ['+ ปืน', '#ffc2b0'],
        suit: ['+ ชุดกันฟ้าผ่า', '#bfe3ff'],
      }[key];
    }
    effects.label(message, color, {
      x: bird.x,
      y: bird.y - bird.r * 2,
      life: 1.1,
      big: false,
    });
  }
  onContact(contact) {
    if (contact.phase === 'exit') return false;
    const parts = [contact.a, contact.b],
      pickup = parts.find((c) => ['firefly', 'gift'].includes(c.group));
    const player = parts.find((c) => ['beak', 'player'].includes(c.group));
    if (!pickup || !player) return false;
    const object = pickup.owner,
      bird = player.owner,
      p = this.platform,
      s = p.get('session'),
      effects = p.get('effects');
    if (s.phase !== 'play' || !bird.alive || object.removing) return true;
    if (pickup.group === 'firefly') {
      if (!object.collect()) return true;
      bird.chew();
      p.emit('firefly-eaten', { bird, firefly: object });
      if (object.rainbow) {
        bird.emitRainbow(BOOST_TIME);
        effects.label(`ความเร็ว ×${BOOST_MULT}!`, '#fff', {
          x: bird.x,
          y: bird.y - bird.r * 2,
          life: 1.1,
          big: false,
        });
      } else if (bird.agi >= AGI_MAX - 1e-9) {
        s.worms++;
        effects.label('AGI เต็ม → +1 หนอน', '#ffc6d2', {
          x: bird.x,
          y: bird.y - bird.r * 2,
          life: 1.1,
          big: false,
        });
      } else {
        bird.agi = Math.min(AGI_MAX, +(bird.agi + AGI_STEP).toFixed(2));
        p.emit('agi-changed', { bird });
        effects.label(`+${AGI_STEP.toFixed(2)} AGI`, '#9dff2e', {
          x: bird.x,
          y: bird.y - bird.r * 2,
          life: 0.9,
          big: false,
        });
      }
      effects.feathersAt(object.x, object.y, {
        count: 4,
        colors: object.rainbow ? ['#ff6a55', '#ffe27a', '#9ff0ff'] : ['#9dff2e'],
        power: 160,
      });
    } else {
      const parts = object.parts();
      if (!object.pop()) return true;
      const pool = ['magnet'];
      if (p.list('enemy').some((enemy) => !enemy.locked)) pool.push('helmet', 'gun');
      if (s.distance / DISTANCE_SCALE >= STAGE_CLOUD_M) pool.push('suit');
      const key = object.suit ? 'suit' : pool[Math.floor(p.random() * pool.length)];
      if (object.suit) s.suitGranted = true;
      object.reveal(key);
      this.reward(bird, key);
      effects.feathersAt(parts.bx, parts.by, { count: 16, colors: [object.col, '#ffe27a'] });
      effects.feathersAt(parts.cx, parts.cy, {
        count: 10,
        colors: ['#fff', '#ffe27a', '#9ff0ff'],
        power: 180,
      });
    }
    return true;
  }
}
