import { hawkSize, respawn } from './model.js';
import { catchBird } from '../game/combat.js';
import { bird, effects, enemies, session, viewport } from '../game/state.js';
import { fireGun } from '../items/weapons.js';
export /* Night hawk at moon height. patrol: glides left-right.
   Bird crosses above highY -> immediate dive: steers its own velocity at the bird (no teleport).
   Bird drops below the line -> hawk pulls up toward its patrol height, but can dive again at any moment. */
function updateHawk(dt) {
  if (enemies.hawk.locked) return;
  if (enemies.hawk.gone > 0) {
    enemies.hawk.gone -= dt;
    if (enemies.hawk.gone <= 0) respawn('hawk');
    return;
  }
  const h = enemies.hawk,
    hs = hawkSize(),
    home = viewport.height * 0.14,
    ATK = 1.5;
  const cruise = Math.max(60, viewport.width * 0.14),
    sprint = Math.max(360, viewport.width * 0.95) * ATK,
    accel = sprint * 2.2,
    STOOP = 1.7; // STOOP: extra dive-speed multiplier
  const play = session.phase === 'play' && bird.alive;
  const steer2 = (tx, ty, spd, acc) => {
    let dx = tx - h.x,
      dy = ty - h.y,
      d = Math.hypot(dx, dy) || 1;
    const wx = (dx / d) * Math.min(spd, d * 6),
      wy = (dy / d) * Math.min(spd, d * 6);
    let ax = wx - h.vx,
      ay = wy - h.vy,
      a = Math.hypot(ax, ay),
      m = acc * dt;
    if (a > m) {
      ax *= m / a;
      ay *= m / a;
    }
    h.vx += ax;
    h.vy += ay;
  };
  if (h.ate) {
    steer2(h.x + h.dir * 200, -hs * 4, cruise * 2.5, accel * 0.5);
  } // strikes, lets the bird drop, flies off
  else if (h.mode === 'dive') {
    // locked-on dash: dead straight at the point locked when the dive began, no steering
    h.lspd = Math.min(sprint * STOOP, h.lspd + accel * STOOP * 2.2 * dt);
    h.vx = h.ldx * h.lspd;
    h.vy = h.ldy * h.lspd;
    h.ltrav += h.lspd * dt;
    (h.trail || (h.trail = [])).push([h.x, h.y, h.ang]);
    if (h.trail.length > 5) h.trail.shift();
    if (
      play &&
      bird.y <= viewport.highY &&
      Math.hypot(h.x - bird.x, h.y - bird.y) < bird.r + hs * 0.5
    )
      catchBird('hawk'); // only connects while the bird is inside the zone
    // overshoot the locked point, then break off (also before reaching the water or leaving the screen)
    if (
      h.ltrav > h.ldist + viewport.height * 0.3 ||
      h.y > viewport.waterY - hs * 2.5 ||
      h.x < -hs ||
      h.x > viewport.width + hs
    ) {
      h.mode = 'return';
      h.trail = [];
      h.vx *= 0.3;
      h.vy *= 0.3;
    } // air-brake as it pulls out
  } else if (h.mode === 'return') {
    // pull out of the dash and climb back to patrol height before it can strike again
    const tx = Math.max(
      hs * 2,
      Math.min(
        viewport.width - hs * 2,
        h.x + (h.x < viewport.width * 0.5 ? 1 : -1) * viewport.width * 0.25,
      ),
    );
    steer2(tx, home, cruise * 4.5, accel * 1.2);
    if (h.y < home + viewport.height * 0.06) h.mode = 'patrol';
  } else {
    if (h.stun > 0) h.stun -= dt;
    if (h.mode === 'patrol' && play && bird.y < viewport.highY && !(h.stun > 0)) {
      h.mode = 'dive';
      h.trail = [];
      const dx = bird.x - h.x,
        dy = bird.y - h.y,
        d = Math.hypot(dx, dy) || 1; // lock the target point now
      h.ldx = dx / d;
      h.ldy = dy / d;
      h.ldist = d;
      h.ltrav = 0;
      h.lspd = Math.max(0, h.vx * h.ldx + h.vy * h.ldy) * 0.3;
      h.dir = dx >= 0 ? 1 : -1;
      h.ang = Math.atan2(dy, Math.abs(dx));
      effects.flash = Math.max(effects.flash, 0.25);
      effects.shake = 0.35;
      effects.labels.push({
        x: h.x + (h.dir > 0 ? 40 : -40),
        y: h.y - hs * 0.9,
        txt: '!',
        col: '#ff6a4a',
        life: 0.6,
      });
      if (bird.gun) fireGun('hawk');
    } // strikes the moment the bird enters its airspace
    if (h.mode !== 'dive') {
      if (h.x < hs * 1.2) h.dir = 1;
      else if (h.x > viewport.width - hs * 1.2) h.dir = -1;
      steer2(
        h.x + h.dir * 120,
        home + Math.sin(session.time * 1.1) * viewport.height * 0.025,
        cruise * 1.6,
        accel * 0.25,
      );
    }
  }
  h.x += h.vx * dt;
  h.y += h.vy * dt;
  if (h.mode === 'dive' && !h.ate) {
    // head stays pointed along the locked line
  } else {
    if (Math.abs(h.vx) > 8) h.dir = Math.sign(h.vx);
    const want = Math.atan2(h.vy, Math.abs(h.vx) + 1) * 0.9;
    h.ang += (want - h.ang) * Math.min(1, dt * 8);
  }
  h.flap += dt * (h.mode === 'dive' ? 2 : h.ate ? 14 : 5);
}

/* ---------- drawing ---------- */
