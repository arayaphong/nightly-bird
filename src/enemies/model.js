import { bird, enemies, viewport } from '../game/state.js';
export function newFish() {
  enemies.fish = {
    x: viewport.width * 0.75,
    y: viewport.waterY + (viewport.height - viewport.waterY) * 0.5,
    vx: -1,
    vy: 0,
    dir: -1,
    mode: 'patrol',
    ate: false,
    ang: Math.PI,
    bob: Math.random() * 6,
  };
}
// exactly 3 surface bounces; the 4th touch drowns the bird
export function newHawk() {
  enemies.hawk = {
    x: viewport.width * 0.35,
    y: viewport.height * 0.14,
    vx: 60,
    vy: 0,
    dir: 1,
    mode: 'patrol',
    rest: 0,
    ate: false,
    ang: 0,
    flap: 0,
  };
}
export function fishSize() {
  return bird.r * 2.4;
}
/* Rain clouds drift past with the scenery at random heights in the middle band.
   Bird comes within range -> cloud charges (flickers) and locks onto where the bird is,
   then the bolt strikes that spot. Move away during the charge and it misses. */
export function hawkSize() {
  return bird.r * 2.2;
}
/* Night hawk at moon height. patrol: glides left-right.
   Bird crosses above highY -> immediate dive: steers its own velocity at the bird (no teleport).
   Bird drops below the line -> hawk pulls up toward its patrol height, but can dive again at any moment. */
export function respawn(who) {
  // comes back in from off-screen, never pops into view
  if (who === 'hawk') {
    newHawk();
    enemies.hawk.x = -hawkSize() * 2;
    enemies.hawk.dir = 1;
    enemies.hawk.vx = 80;
  } else {
    newFish();
    enemies.fish.x = viewport.width + fishSize() * 2;
    enemies.fish.dir = -1;
    enemies.fish.vx = -80;
  }
}
