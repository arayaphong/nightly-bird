import { FISH_AX, FISH_AY, FISH_SPAN } from '../config/art.js';
import { fishSize } from './model.js';
import { enemies } from '../game/state.js';
export // scorched tint (shot fish)
function fishToWorld(sx, sy) {
  // fish-art (SVG) coords → screen, matching drawFish's transform
  const k = (fishSize() * 2.1) / FISH_SPAN;
  let lx = -(sx - FISH_AX) * k,
    ly = (sy - FISH_AY) * k;
  if (Math.cos(enemies.fish.ang) < 0) ly = -ly;
  const c = Math.cos(enemies.fish.ang),
    n = Math.sin(enemies.fish.ang);
  return {
    x: enemies.fish.x + lx * c - ly * n,
    y: enemies.fish.y + lx * n + ly * c,
  };
}
