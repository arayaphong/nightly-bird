import { DISTANCE_SCALE, STAGE_CLOUD_M, ZAP_CHARGE, ZAP_COOL } from '../config/game.js';
import { catchBird } from '../game/combat.js';
import { bird, effects, session, viewport, world } from '../game/state.js';
import { segDist } from '../math/geometry.js';
function spawnCloud() {
  const w = Math.max(110, viewport.width * 0.3),
    h = w * 0.38,
    lo = viewport.highY + h * 0.6,
    hi = viewport.dangerY - viewport.height * 0.16 - h * 0.5;
  const puffs = [];
  for (let i = 0; i < 6; i++)
    puffs.push({
      dx: (i / 5 - 0.5) * w * 0.8 + (Math.random() - 0.5) * 10,
      dy: (Math.random() - 0.5) * h * 0.25,
      r: h * (0.38 + Math.random() * 0.22),
    });
  world.clouds.push({
    x: viewport.width + w,
    y: lo + Math.random() * Math.max(1, hi - lo),
    w,
    h,
    puffs,
    charge: 0,
    cool: 0,
    bolt: null,
    boltT: 0,
    tx: 0,
    ty: 0,
    ph: Math.random() * 6,
    drops: [],
  });
}
export function cloudReach(c) {
  return Math.max(46, viewport.width * 0.12);
}
export function cloudDist(c, x, y) {
  const dx = Math.max(0, Math.abs(x - c.x) - c.w / 2),
    dy = Math.max(0, Math.abs(y - c.y) - c.h / 2);
  return Math.hypot(dx, dy);
}
function makeBolt(x0, y0, x1, y1) {
  const pts = [[x0, y0]],
    n = 9;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    pts.push([x0 + (x1 - x0) * k + (Math.random() - 0.5) * 22, y0 + (y1 - y0) * k]);
  }
  pts.push([x1, y1]);
  return pts;
}
export function updateClouds(dt) {
  const play = session.phase === 'play';
  if (play && session.distance / DISTANCE_SCALE >= STAGE_CLOUD_M) {
    world.cloudTimer -= dt;
    if (world.cloudTimer <= 0) {
      spawnCloud();
      world.cloudTimer = 3.5 + Math.random() * 4;
    }
  }
  effects.flash = Math.max(0, effects.flash - dt * 3);
  for (const c of world.clouds) {
    if (play) c.x -= session.speed * 0.75 * dt;
    c.cool = Math.max(0, c.cool - dt);
    c.boltT = Math.max(0, c.boltT - dt);
    if (c.boltT <= 0) c.bolt = null;
    const near = play && bird.alive && cloudDist(c, bird.x, bird.y) < bird.r + cloudReach(c);
    if (c.charge > 0) {
      c.charge += dt;
      if (c.charge >= ZAP_CHARGE) {
        const sx = Math.max(c.x - c.w * 0.35, Math.min(c.x + c.w * 0.35, c.tx)),
          sy = c.y + (c.ty > c.y ? c.h * 0.3 : -c.h * 0.3);
        const dir = Math.atan2(c.ty - sy, c.tx - sx),
          ex = c.tx + Math.cos(dir) * 40,
          ey = c.ty + Math.sin(dir) * 40;
        c.bolt = makeBolt(sx, sy, ex, ey);
        c.boltT = 0.28;
        c.charge = 0;
        c.cool = ZAP_COOL;
        effects.flash = 1;
        if (play && bird.alive)
          for (let i = 1; i < c.bolt.length; i++)
            if (segDist(bird.x, bird.y, c.bolt[i - 1], c.bolt[i]) < bird.r + 7) {
              catchBird('storm');
              break;
            }
      }
    } else if (near && c.cool <= 0) {
      c.charge = 0.0001;
      c.tx = bird.x;
      c.ty = bird.y;
    }
    // rain
    if (Math.random() < dt * 40)
      c.drops.push({
        x: c.x + (Math.random() - 0.5) * c.w * 0.8,
        y: c.y + c.h * 0.3,
      });
    for (const d of c.drops) {
      d.y += viewport.height * 0.9 * dt;
      d.x -= (play ? session.speed * 0.75 : 0) * dt + 40 * dt;
    }
    c.drops = c.drops.filter((d) => d.y < viewport.waterY);
  }
  world.clouds = world.clouds.filter((c) => c.x > -c.w * 1.2);
}
/* Gift boxes tied to helium balloons drift past. Fly into one: the balloon pops and the bird gets a helmet
   that absorbs one hawk or fish attack (not lightning), knocking the attacker back. */
