import { GONE_TIME } from '../config/game.js';
import { burstSparks } from '../effects/particles.js';
import { fishSize, hawkSize } from '../enemies/model.js';
import { bird, effects, enemies, items, viewport } from '../game/state.js';
export function fireGun(who) {
  bird.gun = false;
  const tg = who === 'hawk' ? enemies.hawk : enemies.fish,
    a = Math.atan2(tg.y - bird.y, tg.x - bird.x),
    v = Math.max(900, viewport.height * 1.6);
  items.bullets.push({
    x: bird.x + bird.r,
    y: bird.y,
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    who,
    life: 1.5,
    trail: [],
  });
  for (let i = 0; i < 6; i++)
    effects.feathers.push({
      x: bird.x + bird.r * 1.2,
      y: bird.y,
      vx: Math.cos(a) * 120 + (Math.random() - 0.5) * 80,
      vy: Math.sin(a) * 120 + (Math.random() - 0.5) * 80,
      life: 0.5,
      rot: 0,
      c: '#ffd27a',
    });
}
export function updateBullets(dt) {
  for (const b of items.bullets) {
    const tg = b.who === 'hawk' ? enemies.hawk : enemies.fish,
      sz = b.who === 'hawk' ? hawkSize() : fishSize();
    if (!(tg.gone > 0)) {
      const sp = Math.hypot(b.vx, b.vy),
        a = Math.atan2(tg.y - b.y, tg.x - b.x);
      b.vx = Math.cos(a) * sp;
      b.vy = Math.sin(a) * sp;
    }
    b.trail.push([b.x, b.y]);
    if (b.trail.length > 6) b.trail.shift();
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (!(tg.gone > 0) && Math.hypot(tg.x - b.x, tg.y - b.y) < sz * 0.6) {
      b.life = 0;
      tg.ate = false;
      effects.flash = Math.max(effects.flash, 0.3);
      if (b.who === 'fish') {
        // sparks on impact, then the fish rolls belly-up and sinks to the bottom
        burstSparks(b.x, b.y, Math.atan2(b.vy, b.vx));
        effects.fishCorpse = {
          x: tg.x,
          y: tg.y,
          vx: (tg.vx || 0) * 0.2 + b.vx * 0.04,
          vy: tg.y > viewport.waterY ? -viewport.height * 0.04 : Math.min(tg.vy || 0, 0) * 0.35,
          // knocked up a little by the hit
          dir: Math.cos(tg.ang) >= 0 ? 1 : -1,
          tilt: 0,
          roll: 1,
          sw: tg.sw || 0,
          wet: tg.y > viewport.waterY,
          twitch: 0.9,
        };
      } else {
        const cols = ['#5a4a72', '#3a2f4f', '#ffd27a'];
        for (let i = 0; i < 16; i++)
          effects.feathers.push({
            x: tg.x,
            y: tg.y,
            vx: (Math.random() - 0.5) * 240,
            vy: (Math.random() - 0.6) * 220,
            life: 1,
            rot: Math.random() * 6,
            c: cols[i % 3],
          });
      }
      tg.gone = GONE_TIME;
      effects.labels.push({
        x: tg.x,
        y: Math.min(tg.y, viewport.waterY - 20) - 20,
        txt: (b.who === 'hawk' ? 'เหยี่ยว' : 'ปลา') + ' หายไป 10 วิ',
        col: '#ffc2b0',
        life: 1.2,
      });
    }
  }
  items.bullets = items.bullets.filter((b) => b.life > 0);
}
