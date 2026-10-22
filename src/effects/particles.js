import { JET_LIFE } from '../config/animation.js';
import { fishSize } from '../enemies/model.js';
import { bird, effects, enemies, items, session, viewport } from '../game/state.js';
import { birdAng } from '../player/animation.js';
export function splash(x, n, pow) {
  for (let i = 0; i < n; i++)
    effects.splashes.push({
      x,
      y: viewport.waterY,
      vx: (Math.random() - 0.5) * pow * 1.4,
      vy: -Math.random() * pow - pow * 0.3,
      life: 1,
    });
}
/* Impact sparks: bright streaks that fly out from the hit point, fall a little and fade. */
export function burstSparks(x, y, dir) {
  for (let i = 0; i < 34; i++) {
    const a = dir + Math.PI + (Math.random() - 0.5) * 3.2,
      sp = 200 + Math.random() * 380;
    effects.sparks.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.35,
      max: 0.7,
      hot: Math.random() < 0.4,
    });
  }
  effects.sparks.push({
    x,
    y,
    ring: true,
    life: 0.35,
    max: 0.35,
  });
}
export function updateSparks(dt) {
  for (const p of effects.sparks) {
    if (!p.ring) {
      p.vy += 420 * dt;
      p.vx *= 1 - dt * 2.5;
      p.vy *= 1 - dt * 1.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    p.life -= dt;
  }
  effects.sparks = effects.sparks.filter((p) => p.life > 0);
}
/* Shot fish: twitches, rolls belly-up over ~0.8 s and sinks slowly until it drops out past the bottom. */
export function updateCorpse(dt) {
  const c = effects.fishCorpse;
  if (!c) return;
  const s = fishSize();
  if (!c.wet) {
    c.vy += viewport.height * 2.2 * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (c.y > viewport.waterY) {
      c.wet = true;
      c.vy *= 0.25;
      c.vx *= 0.4;
      splash(c.x, 12, viewport.height * 0.25);
      for (let i = 0; i < 4; i++)
        effects.ripples.push({
          x: c.x,
          r: 4,
          life: 1,
        });
    }
  } else {
    c.vy += (viewport.height * 0.1 - c.vy) * Math.min(1, dt * 2.5);
    c.vx *= Math.max(0, 1 - dt * 2);
    c.x += c.vx * dt - (session.phase === 'play' ? session.speed * 0.06 : 0) * dt;
    c.y += c.vy * dt;
    if (Math.random() < dt * 2.5)
      effects.bubbles.push({
        x: c.x + (Math.random() - 0.5) * s * 0.6,
        y: c.y - s * 0.3,
        life: 1,
      });
  }
  c.twitch = Math.max(0, c.twitch - dt);
  c.sw += dt * (10 + c.twitch * 20);
  c.tilt += ((c.dir > 0 ? 0.18 : -0.18) - c.tilt) * Math.min(1, dt * 1.5); // drifts nose-down a little as it sinks
  if (c.y - s > viewport.height) effects.fishCorpse = null;
}
// rainbow jet-tail: points dropped at the tail, carried back with the scrolling world
export function updateJet(dt) {
  const sc = session.phase === 'play' ? session.speed : 0; // the world only scrolls while playing
  for (const q of effects.jet) {
    q.x -= sc * dt;
    q.age += dt;
  }
  effects.jet = effects.jet.filter((q) => q.age < JET_LIFE && q.x > -bird.r * 4);
  // keeps pouring out while flying, and also while a fish drags the bird away in its jaws
  const on =
    items.boostTime > 0 &&
    (bird.alive ? session.phase === 'play' : session.deathBy === 'fish' && enemies.fish.ate);
  if (on) {
    const r = bird.r,
      ang = birdAng(),
      tx = -0.8 * r,
      ty = 0.12 * r; // tail root in the bird's frame
    effects.jet.push({
      x: bird.x + tx * Math.cos(ang) - ty * Math.sin(ang),
      y: bird.y + tx * Math.sin(ang) + ty * Math.cos(ang),
      age: 0,
      f: Math.min(1, items.boostTime),
    });
  }
}
export function updateParticles(dt) {
  effects.feathers.forEach((f) => {
    f.vy += 60 * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vx *= 1 - dt * 1.5;
    f.rot += dt * 4;
    f.life -= dt * 0.6;
  });
  effects.feathers = effects.feathers.filter((f) => f.life > 0);
  effects.splashes.forEach((p) => {
    p.vy += viewport.height * 1.6 * dt;
    p.x += p.vx * dt - (session.phase === 'play' ? session.speed : 0) * dt;
    p.y += p.vy * dt;
    p.life -= dt * 1.4;
  });
  effects.ripples.forEach((r) => {
    r.r += 60 * dt;
    r.life -= dt * 1.6;
    r.x -= (session.phase === 'play' ? session.speed : 0) * dt;
  });
  effects.ripples = effects.ripples.filter((r) => r.life > 0);
  effects.splashes = effects.splashes.filter((p) => p.life > 0 && p.y < viewport.waterY + 10);
  effects.bubbles.forEach((b) => {
    if (b.vx) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const d = Math.max(0, 1 - dt * 3);
      b.vx *= d;
      b.vy *= d;
    }
    b.y -= viewport.height * 0.12 * dt;
    b.x +=
      Math.sin(session.time * 8 + b.y * 0.1) * 0.4 -
      (session.phase === 'play' ? session.speed * 0.15 : 0) * dt;
    b.life -= dt * 0.9;
  });
  effects.bubbles = effects.bubbles.filter((b) => b.life > 0 && b.y > viewport.waterY + 2);
}
export function updateLabels(dt) {
  effects.labels.forEach((l) => {
    if (!l.big) l.y -= 40 * dt;
    l.life -= dt * 0.8;
  });
  effects.labels = effects.labels.filter((l) => l.life > 0);
  // centre messages never overlap: stack them one per line, the block centred on the message line
  const big = effects.labels.filter((l) => l.big),
    LH = 32,
    top = viewport.height * 0.36 - ((big.length - 1) * LH) / 2;
  big.forEach((l, i) => {
    const ty = top + i * LH;
    if (l.placed) l.y += (ty - l.y) * Math.min(1, dt * 10);
    else {
      l.y = ty;
      l.placed = true;
    }
  });
}
