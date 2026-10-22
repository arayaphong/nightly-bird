import { FISH_PIVOT } from '../../assets/art/fish.js';
import { splash } from '../effects/particles.js';
import { fishToWorld } from './fish-geometry.js';
import { fishSize, respawn } from './model.js';
import { catchBird } from '../game/combat.js';
import { bird, effects, enemies, session, viewport } from '../game/state.js';
import { fireGun } from '../items/weapons.js';
export /* One fish, moved only by its own velocity (no teleports, no homing mid-air).
   patrol: cruises left-right at mid depth.
   chase: bird is below the danger line -> fish accelerates toward it and rises under the surface.
   leap: ballistic arc aimed at where the bird was at launch; the bird can climb out of reach.
   recover: after splashing back down the fish needs a moment before it can chase again. */
function updateFish(dt) {
  if (enemies.fish.locked) return;
  if (enemies.fish.gone > 0) {
    enemies.fish.gone -= dt;
    if (enemies.fish.gone <= 0) respawn('fish');
    return;
  }
  const f = enemies.fish,
    s = fishSize(),
    depth = viewport.waterY + (viewport.height - viewport.waterY) * 0.5,
    surf = viewport.waterY + s * 0.5,
    G = viewport.height * 2.2;
  const swPrev = f.sw || 0;
  f.sw =
    swPrev +
    dt *
      (f.mode === 'chase' || f.mode === 'leap' || f.mode === 'charge'
        ? 20
        : f.mode === 'recover'
          ? 4
          : 7.5); // fin-beat phase
  // bubbles are churned off the tail fin at the end of each stroke (when the swing reverses)
  if (
    f.y > viewport.waterY + s * 0.35 &&
    !f.ate &&
    Math.sign(Math.cos(f.sw)) !== Math.sign(Math.cos(swPrev))
  ) {
    const hard = f.mode === 'chase' || f.mode === 'leap' || f.mode === 'charge',
      amp = hard ? 0.32 : 0.2,
      a = Math.sin(f.sw) * amp,
      [px, py] = FISH_PIVOT.tail;
    const tip = fishToWorld(px + Math.cos(a) * 210, py + Math.sin(a) * 210),
      side = fishToWorld(px + Math.cos(a) * 210, py + Math.sin(a) * 210 + Math.sign(a) * 60);
    const kick = Math.atan2(side.y - tip.y, side.x - tip.x),
      n = hard ? 3 + ((Math.random() * 2) | 0) : 1 + ((Math.random() * 2) | 0);
    for (let i = 0; i < n; i++) {
      const sp = 30 + Math.random() * 50;
      effects.bubbles.push({
        x: tip.x + (Math.random() - 0.5) * 6,
        y: tip.y + (Math.random() - 0.5) * 6,
        vx: Math.cos(kick) * sp,
        vy: Math.sin(kick) * sp,
        life: 1,
        r: 0.6 + Math.random() * 0.7,
      });
    }
  }
  const inDanger = session.phase === 'play' && bird.alive && bird.y > viewport.dangerY; // bird's centre decides, same as the hawk zone
  const cruise = Math.max(70, viewport.width * 0.16),
    ATK = 1.5,
    sprint = Math.max(380, viewport.width * 1.05) * ATK,
    accel = sprint * 2.6; // ATK: attack-speed multiplier (dash + leap)
  const steer = (want, cap) => {
    const d = want - f.vx,
      m = cap * dt;
    f.vx += Math.max(-m, Math.min(m, d));
  };
  const GL = viewport.height * 4.2; // gravity for the strike leap: a fast, flat, violent arc
  if (f.mode === 'leap') {
    // pure projectile: no steering once launched, flies through the locked point and beyond
    f.vy += GL * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    (f.trail || (f.trail = [])).push([f.x, f.y, f.ang]);
    if (f.trail.length > 5) f.trail.shift();
    if (f.vy > 0 && f.y > viewport.waterY + s * 0.3) {
      splash(f.x, 14, viewport.height * 0.3);
      f.mode = 'recover';
      f.rest = 0.55;
      f.vy *= 0.25;
      f.vx *= 0.4;
      f.trail = [];
      f.lock = null;
    }
  } else {
    if (f.mode === 'recover') {
      f.rest -= dt;
      if (f.rest <= 0) f.mode = 'patrol';
    } else if (f.mode !== 'charge') {
      const was = f.mode;
      f.mode = inDanger ? 'chase' : 'patrol';
      if (f.mode === 'chase' && was !== 'chase') {
        if (bird.gun) fireGun('fish');
        if (bird.y < viewport.waterY) {
          // bird above water: lock its position now and commit to a strike on that point
          f.mode = 'charge';
          f.lock = {
            x: bird.x,
            y: bird.y,
          };
          f.chargeT = 0;
          effects.shake = Math.max(effects.shake, 0.22);
          effects.flash = Math.max(effects.flash, 0.15);
          effects.labels.push({
            x: f.x,
            y: viewport.waterY - s * 0.9,
            txt: '!',
            col: '#ff6a4a',
            life: 0.6,
          });
        }
      }
    }
    let ty, vyCap;
    if (f.mode === 'charge') {
      // rocket to the surface under the locked point, then launch
      const L = f.lock;
      f.chargeT += dt;
      const dx = L.x - f.x,
        STRIKE = 1.6;
      steer(Math.max(-sprint * STRIKE, Math.min(sprint * STRIKE, dx * 8)), accel * STRIKE * 2);
      ty = surf;
      vyCap = viewport.height * 1.6;
      const reach = Math.max(s * 2.2, Math.abs(f.vx) * 0.12);
      if ((f.y < surf + s * 0.5 && Math.abs(dx) < reach) || f.chargeT > 1.1) {
        // solve the projectile so the arc passes through the locked point
        const dy = L.y - f.y,
          T = Math.max(0.16, Math.min(0.4, Math.sqrt((Math.abs(dy) * 2) / GL) * 0.85));
        f.vx = dx / T;
        f.vy = (dy - 0.5 * GL * T * T) / T;
        f.mode = 'leap';
        f.trail = [];
        splash(f.x, 18, viewport.height * 0.4);
        effects.shake = Math.max(effects.shake, 0.15);
      }
    } else if (f.mode === 'chase') {
      const dx = bird.x - f.x;
      steer(Math.max(-sprint, Math.min(sprint, dx * 5 * ATK)), accel);
      const birdWet = bird.y > viewport.waterY + s * 0.2;
      ty = birdWet ? bird.y : surf;
      vyCap = viewport.height * 0.9 * ATK; // bird in the water: swim straight at it
      // close enough and near the surface: jump at the bird's current position
      const h = f.y - (bird.y - bird.r * 0.3);
      if (!birdWet && f.y < surf + s * 0.4 && h > 0) {
        const Gs = G * ATK * ATK,
          vy = Math.sqrt(2 * Gs * h),
          T = vy / Gs,
          need = dx / T;
        if (Math.abs(need) < sprint * 0.9 && Math.abs(dx) < s * 3) {
          f.mode = 'leap';
          f.vy = -vy;
          f.vx = need;
          splash(f.x, 14, viewport.height * 0.35);
        }
      }
    } else {
      if (f.x < s * 1.2) f.dir = 1;
      else if (f.x > viewport.width - s * 1.2) f.dir = -1;
      steer(f.dir * (f.mode === 'recover' ? cruise * 0.4 : cruise), accel * 0.3);
      ty =
        depth + Math.sin(session.time * 1.3 + f.bob) * (viewport.height - viewport.waterY) * 0.12;
      vyCap = viewport.height * (f.mode === 'recover' ? 0.25 : 0.2);
      if (f.ate) {
        ty = viewport.height + s * 4;
        vyCap = viewport.height * 0.3;
      } // carries its catch down into the deep
    }
    if (f.mode !== 'leap') {
      f.vy = Math.max(
        -vyCap,
        Math.min(vyCap, (ty - f.y) * (f.mode === 'chase' ? 4 * ATK : f.mode === 'charge' ? 12 : 4)),
      );
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (Math.abs(f.vx) > 5) f.dir = Math.sign(f.vx);
    }
  }
  if (
    session.phase === 'play' &&
    bird.alive &&
    bird.y > viewport.dangerY &&
    Math.hypot(f.x - bird.x, f.y - bird.y) < bird.r + s * 0.5
  )
    catchBird(); // like the hawk: only connects while the bird is inside the red-line zone
  if (f.ate) {
    bird.x = f.x + Math.cos(f.ang) * s * 0.95;
    bird.y = f.y + Math.sin(f.ang) * s * 0.95;
  } // held in the jaws
  const want =
    f.mode === 'leap' ? Math.atan2(f.vy, f.vx || f.dir) : Math.atan2(f.vy * 0.6, f.vx || f.dir);
  let d = want - f.ang;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  f.ang += d * Math.min(1, dt * (f.mode === 'leap' ? 14 : 8));
}
