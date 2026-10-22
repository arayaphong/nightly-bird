import { splash } from '../effects/particles.js';
import { catchBird } from '../game/combat.js';
import { bird, controls, effects, enemies, session, viewport, world } from '../game/state.js';
export function rollSkips() {
  return 3;
} // exactly 3 surface bounces; the 4th touch drowns the bird
export function updateFlight(dt) {
  const wet = bird.y > viewport.waterY; // underwater: heavy drag, weak flaps, slow sinking
  const AGILITY = bird.agi; // flight responsiveness in the air (1 = original); starts at AGI_START, fireflies raise it
  const up = wet ? viewport.height * 1.7 : viewport.height * 2.7 * AGILITY,
    g = wet ? viewport.height * 0.45 : viewport.height * 1.5 * AGILITY,
    max = wet ? viewport.height * 0.45 : viewport.height * 0.95;
  if (wet) bird.vy *= 1 - Math.min(1, dt * 3.5);
  bird.vy += ((controls.holding ? -up : g) + (wet ? 0 : world.wind.y)) * dt;
  bird.vy = Math.max(-max, Math.min(max, bird.vy));
  // sideways wind drifts the bird along the screen within a band
  bird.vx += ((wet ? 0 : world.wind.x) - bird.vx) * Math.min(1, dt * 1.2);
  bird.x += bird.vx * dt;
  const xl = Math.max(bird.r * 3, viewport.width * 0.1),
    xr = viewport.width * 0.62;
  if (bird.x < xl) {
    bird.x = xl;
    bird.vx = Math.max(0, bird.vx);
  }
  if (bird.x > xr) {
    bird.x = xr;
    bird.vx = Math.min(0, bird.vx);
  }
  const before = bird.y;
  bird.y += bird.vy * dt;
  // skip off the surface like a stone, each bounce lower: 1st peaks with the red dashed line through the
  // middle of the body, 2nd reaches half that height, 3rd half of the 2nd. The 4th touch: the bird drowns.
  const foot = bird.r * 0.55;
  if (!wet && bird.vy > 0 && bird.y + foot > viewport.waterY && before + foot <= viewport.waterY) {
    if (bird.skips > 0) {
      const n = 3 - bird.skips,
        h1 = viewport.waterY - foot - viewport.dangerY,
        hgt = h1 * Math.pow(0.5, n),
        gFall = viewport.height * 1.5 * AGILITY;
      bird.y = viewport.waterY - foot;
      bird.vy = -Math.sqrt(2 * gFall * hgt);
      bird.skips--; // launch speed that peaks exactly at hgt
      splash(bird.x, 10, viewport.height * 0.24);
      for (let i = 0; i < 4; i++)
        effects.ripples.push({
          x: bird.x,
          r: 4,
          life: 1,
        });
    } else {
      splash(bird.x, 16, viewport.height * 0.3);
      for (let i = 0; i < 4; i++)
        effects.ripples.push({
          x: bird.x,
          r: 4,
          life: 1,
        });
      catchBird('drown');
    }
  }
  if (bird.y + bird.r < viewport.dangerY - viewport.height * 0.06 && bird.skips < 3)
    bird.skips = rollSkips(); // flew clear: bounces refill
  if ((enemies.fish.gone > 0 || enemies.fish.locked) && bird.y - bird.r > viewport.waterY)
    catchBird('drown'); // no fish around: going under means drowning
  if (before <= viewport.waterY !== bird.y <= viewport.waterY)
    splash(bird.x, wet ? 8 : 12, viewport.height * (wet ? 0.22 : 0.3)); // entering or leaving the water
  if (bird.y > viewport.height - bird.r - 4) {
    bird.y = viewport.height - bird.r - 4;
    bird.vy = Math.min(0, bird.vy);
  }
  if (wet && Math.random() < dt * 14)
    effects.bubbles.push({
      x: bird.x + (Math.random() - 0.5) * bird.r,
      y: bird.y - bird.r * 0.5,
      life: 1,
    });
  if (bird.y < bird.r + 8) {
    bird.y = bird.r + 8;
    bird.vy = Math.max(0, bird.vy);
  }
  bird.flap += dt * (controls.holding ? 26 : 9);
}
export function updateFallingBird(dt) {
  if (session.deathBy !== 'fish') {
    const wet = bird.y > viewport.waterY,
      before = bird.y;
    if (wet) {
      bird.vy += (viewport.height * 0.09 - bird.vy) * Math.min(1, dt * 4);
      bird.x += Math.sin(session.time * 2.2) * 12 * dt;
    } // limp, slow sink with a gentle drift
    else bird.vy += viewport.height * 1.5 * dt; // tumble down
    bird.y += bird.vy * dt; // no sea floor: the body keeps sinking out of view.
    if (before <= viewport.waterY && bird.y > viewport.waterY) {
      splash(bird.x, 14, viewport.height * 0.28);
      for (let i = 0; i < 4; i++)
        effects.ripples.push({
          x: bird.x,
          r: 4,
          life: 1,
        });
      bird.vy *= 0.3;
    }
    if (wet && Math.random() < dt * 10)
      effects.bubbles.push({
        x: bird.x + (Math.random() - 0.5) * bird.r,
        y: bird.y - bird.r * 0.5,
        life: 1,
      });
  }
}
