import { BOOST_MULT } from '../config/game.js';
import {
  updateCorpse,
  updateJet,
  updateLabels,
  updateParticles,
  updateSparks,
} from '../effects/particles.js';
import { updateFish } from '../enemies/fish.js';
import { updateHawk } from '../enemies/hawk.js';
import { fishSize } from '../enemies/model.js';
import { showOver } from './lifecycle.js';
import { bird, effects, enemies, items, session, viewport, world } from './state.js';
import { updateFlies, updateGifts } from '../items/collectibles.js';
import { clearMagnetTargets } from '../items/magnet.js';
import { updateBullets } from '../items/weapons.js';
import { updateBirdAnimation } from '../player/animation.js';
import { updateFallingBird, updateFlight } from '../player/flight.js';
import { updateStages } from '../world/progression.js';
import { updateClouds } from '../world/storms.js';
import { updateWind } from '../world/wind.js';
export function updateGame(dt) {
  session.time += dt;
  effects.shake = Math.max(0, effects.shake - dt);
  updateBirdAnimation(dt);
  const scroll = session.phase === 'play' ? session.speed : 60;
  world.stars.forEach((star) => {
    star.x -= scroll * star.s * dt;
    if (star.x < -4) star.x += viewport.width + 8;
  });
  if (session.phase === 'play') {
    if (items.boostTime > 0) {
      items.boostTime -= dt;
      if (items.boostTime <= 0) items.boostTime = 0;
    }
    if (items.magnetTime > 0) {
      items.magnetTime = Math.max(0, items.magnetTime - dt);
    }
    session.speed +=
      (session.baseSpeed * (items.boostTime > 0 ? BOOST_MULT : 1) - session.speed) *
      Math.min(1, dt * 3); // eases to ×BOOST_MULT while boosted, back to base after
    updateJet(dt);
    session.distance += session.speed * dt; // base scroll speed is constant; wind provides the rising difficulty
    updateFlight(dt);
  } else if (session.phase === 'dead') {
    updateJet(dt);
    updateFallingBird(dt);
    const under =
      session.deathBy === 'fish'
        ? enemies.fish.y > viewport.waterY + fishSize() * 0.5
        : bird.y - bird.r > viewport.waterY;
    if (under) session.underwaterTime += dt;
    // card only after the body has sunk past the bottom edge (fish: after it drags the bird out of view)
    const gone =
      session.deathBy === 'fish'
        ? enemies.fish.y - fishSize() > viewport.height
        : bird.y - bird.r * 2 > viewport.height;
    if (
      !session.overShown &&
      ((gone && session.underwaterTime > 0.3) || session.time - session.deadAt > 9)
    )
      showOver();
  } else if (session.phase === 'ready') {
    bird.y = viewport.height * 0.42 + Math.sin(session.time * 2) * 10;
    bird.flap += dt * 10;
  }
  updateStages();
  updateWind(dt);
  updateFish(dt);
  updateHawk(dt);
  clearMagnetTargets();
  updateFlies(dt);
  updateClouds(dt);
  updateGifts(dt);
  updateLabels(dt);
  updateBullets(dt);
  updateSparks(dt);
  updateCorpse(dt);
  updateParticles(dt);
}
