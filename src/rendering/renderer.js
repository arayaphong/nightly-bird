import { effects } from '../game/state.js';
import { cx } from '../platform/canvas.js';
import { drawBird } from './bird.js';
import {
  drawBubbles,
  drawFeathers,
  drawLabels,
  drawReturnCountdown,
  drawRipples,
  drawSparks,
  drawSplash,
} from './effects.js';
import {
  drawClouds,
  drawDanger,
  drawSky,
  drawSkyDanger,
  drawWater,
  drawWaterVeil,
  drawWind,
} from './environment.js';
import { drawFish } from './fish.js';
import { drawHawk } from './hawk.js';
import { drawBoostTrail, drawBullets, drawFlies, drawGifts, drawMagnetField } from './items.js';
export function renderGame() {
  const shk =
    effects.shake > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches
      ? effects.shake * 16
      : 0; // brief jolt when the hawk strikes
  cx.save();
  if (shk) cx.translate((Math.random() - 0.5) * shk, (Math.random() - 0.5) * shk);
  drawSky();
  drawSkyDanger();
  drawDanger();
  drawWater();
  drawRipples();
  drawWind();
  drawClouds();
  drawGifts();
  drawFlies();
  drawMagnetField();
  drawBoostTrail();
  drawBird();
  drawWaterVeil();
  drawFish();
  drawHawk();
  drawSparks();
  drawBullets();
  drawFeathers();
  drawLabels();
  drawReturnCountdown();
  drawBubbles();
  drawSplash();
  cx.restore();
}
