import { Rule } from '../core/rule.js';
import { Projectile } from '../objects/projectile.js';
import { SharkCorpse } from '../objects/shark-corpse.js';
import { GONE_TIME } from '../config/game.js';

export class WeaponRule extends Rule {
  onEvent(event) {
    const p = this.platform,
      effects = p.get('effects');
    if (event.type === 'attack-started') {
      const { attacker, target } = event;
      effects.shake = Math.max(effects.shake, attacker.tags.has('hawk') ? 0.35 : 0.22);
      effects.flash = Math.max(effects.flash, 0.2);
      effects.label('!', '#ff6a4a', {
        x: attacker.x,
        y: attacker.y - attacker.size,
        life: 0.6,
        big: false,
      });
      target.equipment.get('gun')?.shoot(target, attacker);
      return true;
    }
    if (event.type === 'shot-requested') {
      if (event.target.removing || event.target.gone > 0 || !event.shooter.alive) return true;
      p.add(new Projectile(event));
      effects.feathersAt(event.shooter.x, event.shooter.y, {
        count: 6,
        colors: ['#ffd27a'],
        power: 100,
      });
      return true;
    }
    return false;
  }
  onContact(contact) {
    if (contact.phase === 'exit') return false;
    const parts = [contact.a, contact.b],
      round = parts.find((c) => c.group === 'projectile'),
      hit = parts.find((c) => c.group === 'enemy');
    if (!round || !hit) return false;
    const projectile = round.owner,
      target = hit.owner,
      p = this.platform;
    if (
      projectile.removing ||
      target.removing ||
      target.gone > 0 ||
      projectile.target !== target
    )
      return true;
    if (!projectile.impact()) return true;
    target.gone = GONE_TIME;
    target.ate = false;
    target.body.enabled = false;
    for (const child of p.list())
      if (child.body?.attachment?.parent === target) p.physics.detach(child);
    const effects = p.get('effects');
    effects.flash = Math.max(effects.flash, 0.3);
    if (target.tags.has('shark')) {
      effects.burstSparks(
        projectile.x,
        projectile.y,
        Math.atan2(projectile.vy, projectile.vx),
      );
      p.add(new SharkCorpse(target, projectile));
    } else
      effects.feathersAt(target.x, target.y, {
        count: 16,
        colors: ['#5a4a72', '#3a2f4f', '#ffd27a'],
      });
    effects.label(`${target.tags.has('hawk') ? 'เหยี่ยว' : 'ปลา'} หายไป 10 วิ`, '#ffc2b0', {
      x: target.x,
      y: Math.min(target.y, p.get('viewport').waterY - 20) - 20,
      life: 1.2,
      big: false,
    });
    return true;
  }
}
