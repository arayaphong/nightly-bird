import { splash } from '../effects/particles.js';
import { bird, controls, effects, enemies, session, viewport } from './state.js';
export function catchBird(by) {
  if (!bird.alive) return;
  if (by === 'storm') {
    // suit grounds one lightning strike
    if (bird.zinv > 0) return;
    if (bird.suit) {
      bird.suit = false;
      bird.zinv = 1.0;
      effects.flash = 0.6;
      for (let i = 0; i < 14; i++)
        effects.feathers.push({
          x: bird.x,
          y: bird.y,
          vx: (Math.random() - 0.5) * 260,
          vy: (Math.random() - 0.6) * 240,
          life: 1,
          rot: Math.random() * 6,
          c: ['#bfe3ff', '#ffffff', '#6fb8ff'][i % 3],
        });
      return;
    }
  }
  if (by !== 'storm' && by !== 'drown') {
    // helmet blocks one hawk or fish attack
    if (bird.inv > 0) return;
    if (bird.helmet) {
      blockHit(by || 'fish');
      return;
    }
  }
  bird.alive = false;
  session.phase = 'dead';
  session.deadAt = session.time;
  controls.holding = false;
  session.deathBy = by || 'fish';
  session.underwaterTime = 0;
  bird.rot = 0;
  if (by === 'hawk') {
    enemies.hawk.ate = true;
    bird.vy = -viewport.height * 0.15;
    for (let i = 0; i < 14; i++)
      effects.feathers.push({
        x: bird.x,
        y: bird.y,
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.7) * 120,
        life: 1,
        rot: Math.random() * 6,
      });
  } else if (by === 'storm') {
    bird.zapped = true;
    bird.vy = 0;
    const dark = ['#1a1210', '#2b1a14', '#3d2219', '#4a1612', '#120d0a'];
    for (let i = 0; i < 18; i++)
      effects.feathers.push({
        x: bird.x,
        y: bird.y,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.75) * 170,
        life: 1,
        rot: Math.random() * 6,
        c: dark[i % 5],
        smoke: i % 3 === 0,
      });
  } else {
    enemies.fish.ate = true;
    splash(bird.x, 18, viewport.height * 0.4);
  }
}
function blockHit(by) {
  bird.helmet = false;
  bird.inv = 1.0;
  bird.vy = by === 'hawk' ? viewport.height * 0.35 : -viewport.height * 0.55; // bonk away from the attacker
  for (let i = 0; i < 10; i++)
    effects.feathers.push({
      x: bird.x + bird.r,
      y: bird.y - bird.r * 0.5,
      vx: (Math.random() - 0.5) * 240,
      vy: (Math.random() - 0.8) * 200,
      life: 1,
      rot: Math.random() * 6,
      c: i % 2 ? '#f2c230' : '#fff3b0',
    });
  effects.flash = 0.4;
  if (by === 'hawk') {
    const h = enemies.hawk;
    h.vx = -h.vx * 0.7;
    h.vy = -Math.abs(h.vy) * 0.8 - viewport.height * 0.3;
    h.mode = 'patrol';
    h.stun = 1.0;
  } else {
    const f = enemies.fish,
      away = Math.sign(f.x - bird.x) || 1;
    if (f.mode === 'leap') {
      f.vy = Math.abs(f.vy) * 0.4 + viewport.height * 0.3;
      f.vx = away * Math.abs(f.vx || 200) * 0.6;
    } else {
      f.vx = away * Math.max(380, viewport.width * 1.05) * 0.6;
      f.vy = viewport.height * 0.4;
      f.mode = 'recover';
      f.rest = 1.0;
    }
  }
}
/* Gun: fires by itself the moment the hawk starts a dive or the fish starts a charge.
   The round homes in on the attacker; a hit removes it from the scene for 10 s. One shot, then the gun is gone. */
