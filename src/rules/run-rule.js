import { Rule } from '../core/rule.js';
import { WORMS_TO_REVIVE } from '../config/game.js';
import { TEST_HAWK_FROM_START, TEST_START_WITH_GUN } from '../config/debug.js';

export class RunRule extends Rule {
  start({ preserveInput = false } = {}) {
    const p = this.platform,
      s = p.get('session'),
      v = p.get('viewport');
    p.clearScope('run');
    p.collisions.reset();
    p.events.length = 0;
    s.distance = 0;
    s.speed = s.baseSpeed = v.width * 0.32 + 120;
    s.worms = 0;
    s.stageShown = 0;
    s.suitGranted = false;
    s.deathBy = '';
    s.deadAt = 0;
    s.overShown = false;
    s.underwaterTime = 0;
    s.newBest = false;
    p.get('effects').reset();
    p.get('wind').reset();
    p.get('rules').dispatch('reset');
    for (const bird of p.list('player')) {
      bird.reset();
      if (TEST_START_WITH_GUN) bird.equip('gun');
    }
    for (const enemy of p.list('enemy')) {
      enemy.reset();
      if (TEST_HAWK_FROM_START && enemy.tags.has('hawk')) enemy.respawn();
    }
    if (!preserveInput) p.get('input').clear();
    s.setPhase('play');
  }
  revive() {
    const p = this.platform,
      s = p.get('session'),
      bird = p.find('player');
    if (s.phase !== 'dead' || !s.overShown || s.worms < WORMS_TO_REVIVE) return false;
    s.worms -= WORMS_TO_REVIVE;
    for (const enemy of p.list('enemy'))
      if (enemy.ate) {
        if (enemy.tags.has('shark')) {
          enemy.release();
          p.physics.place(
            enemy,
            enemy.x,
            Math.min(enemy.y, p.get('viewport').height + enemy.size * 2),
          );
        } else {
          enemy.ate = false;
          enemy.stun(1.5);
        }
      }
    bird.revive();
    p.get('input').clear();
    p.collisions.reset();
    s.deathBy = '';
    s.overShown = false;
    s.underwaterTime = 0;
    s.shopOpenedAt = p.clock.ui;
    s.setPhase(s.worms > 0 ? 'shop' : 'play');
    const effects = p.get('effects');
    effects.flash = 0.5;
    effects.label('ชุบชีวิต!', '#ffc6d2');
    effects.feathersAt(bird.x, bird.y, { count: 20 });
    return true;
  }
  onCommand(command) {
    const s = this.platform.get('session');
    switch (command.type) {
      case 'flap':
        if (s.phase === 'ready' || (s.phase === 'dead' && s.overShown))
          this.start({ preserveInput: true });
        if (s.phase === 'play') this.platform.find('player').flap();
        return true;
      case 'release':
        if (command.action === 'flap') this.platform.find('player').glide();
        return true;
      case 'restart':
        this.start();
        return true;
      case 'revive':
        this.revive();
        return true;
      case 'pause':
        if (s.phase === 'play') {
          s.setPhase('paused');
          this.platform.get('input').clear();
        } else if (s.phase === 'paused') s.setPhase('play');
        return true;
      default:
        return false;
    }
  }
  onEvent(event) {
    if (event.type !== 'bird-died') return false;
    const s = this.platform.get('session');
    if (s.phase === 'dead') return true;
    s.setPhase('dead');
    s.deadAt = s.time;
    s.deathBy = event.cause;
    s.underwaterTime = 0;
    s.overShown = false;
    this.platform.get('input').clear();
    return true;
  }
  afterStep(dt) {
    const s = this.platform.get('session');
    if (s.phase !== 'dead') return;
    const bird = this.platform.find('player'),
      v = this.platform.get('viewport');
    if (bird.y - bird.r > v.waterY) s.underwaterTime += dt;
    if ((bird.y - bird.r * 2 > v.height && s.underwaterTime > 0.3) || s.time - s.deadAt > 9)
      s.showOver();
  }
}
