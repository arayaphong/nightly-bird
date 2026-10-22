import { TEST_HAWK_FROM_START, TEST_START_WITH_GUN } from '../config/debug.js';
import {
  AGI_START,
  DISTANCE_SCALE,
  SHOP_ITEMS,
  WIND_START_M,
  WORMS_TO_REVIVE,
} from '../config/game.js';
import { fishSize, hawkSize, newFish, newHawk } from '../enemies/model.js';
import {
  bird,
  controls,
  effects,
  enemies,
  items,
  session,
  uiState,
  viewport,
  world,
} from './state.js';
import { loadBest, saveBest } from '../platform/storage.js';
import { resize } from '../platform/viewport.js';
import { rollSkips } from '../player/flight.js';
function reset() {
  newFish();
  items.magnetTime = 0;
  effects.sparks = [];
  effects.fishCorpse = null;
  bird.worms = 0;
  world.wind = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    ang: 0,
    lvl: 0,
    next: WIND_START_M,
  };
  bird.vx = 0;
  world.windParticles = [];
  enemies.fish.locked = true;
  world.stageShown = 0;
  items.fireflies = [];
  items.fireflyTimer = 1.5;
  bird.agi = AGI_START;
  uiState.agiBump = false;
  items.gifts = [];
  items.giftTimer = 5 + Math.random() * 4;
  bird.helmet = false;
  bird.inv = 0;
  bird.suit = false;
  bird.zinv = 0;
  bird.gun = TEST_START_WITH_GUN;
  items.bullets = [];
  world.clouds = [];
  world.cloudTimer = 2 + Math.random() * 2;
  effects.flash = 0;
  bird.zapped = false;
  bird.rot = 0;
  session.overShown = false;
  session.underwaterTime = 0;
  newHawk();
  enemies.hawk.locked = !TEST_HAWK_FROM_START;
  if (!enemies.hawk.locked) {
    enemies.hawk.x = -hawkSize() * 2;
    enemies.hawk.dir = 1;
    enemies.hawk.vx = 80;
  }
  bird.x = Math.min(viewport.width * 0.3, 180);
  session.distance = 0;
  session.speed = session.baseSpeed = viewport.width * 0.32 + 120;
  items.boostTime = 0;
  effects.jet = [];
  items.suitGranted = false;
  bird.y = viewport.height * 0.42;
  bird.vy = 0;
  bird.alive = true;
  bird.skips = rollSkips();
  effects.splashes = [];
  effects.bubbles = [];
  effects.ripples = [];
  effects.feathers = [];
}
export function revive() {
  bird.worms -= WORMS_TO_REVIVE;
  session.phase = bird.worms > 0 ? 'shop' : 'play';
  session.overShown = false;
  session.underwaterTime = 0;
  session.deathBy = '';
  if (session.phase === 'shop') openShop();
  bird.alive = true;
  bird.zapped = false;
  bird.rot = 0;
  bird.x = Math.min(viewport.width * 0.3, 180);
  bird.vx = 0;
  bird.y = viewport.height * 0.42;
  bird.vy = -viewport.height * 0.2;
  bird.skips = rollSkips();
  bird.inv = 2.5;
  bird.zinv = 2.5; // brief protection while getting back into the air
  if (enemies.fish.ate) {
    enemies.fish.ate = false;
    enemies.fish.mode = 'recover';
    enemies.fish.rest = 1.5;
    enemies.fish.y = Math.min(enemies.fish.y, viewport.height + fishSize() * 2);
    enemies.fish.vy = 0;
  }
  if (enemies.hawk.ate) {
    enemies.hawk.ate = false;
    enemies.hawk.mode = 'patrol';
    enemies.hawk.stun = 1.5;
  }
  effects.flash = 0.5;
  effects.labels.push({
    x: viewport.width / 2,
    y: viewport.height * 0.36,
    txt: 'ชุบชีวิต!',
    col: '#ffc6d2',
    life: 2,
    big: true,
  });
  for (let i = 0; i < 20; i++)
    effects.feathers.push({
      x: bird.x,
      y: bird.y,
      vx: (Math.random() - 0.5) * 260,
      vy: (Math.random() - 0.5) * 260,
      life: 1,
      rot: Math.random() * 6,
      c: ['#ffc6d2', '#fff3b0', '#ff6a55'][i % 3],
    });
}
/* Worm shop: opens after a revive while worms remain. Game is paused; 1 worm = 1 item not already worn. */
export function initializeGame() {
  bird.agi = AGI_START;
  resize();
  newFish();
  newHawk();
  session.best = loadBest();
}
export function startRun() {
  reset();
  session.phase = 'play';
}
export function showOver() {
  session.overShown = true;
  const score = Math.round(session.distance / DISTANCE_SCALE);
  uiState.newBest = score > session.best;
  if (uiState.newBest) {
    session.best = score;
    saveBest(session.best);
  }
}
function openShop() {
  session.shopOpenedAt = performance.now();
}
function shopReady() {
  return session.phase === 'shop' && performance.now() - session.shopOpenedAt > 400;
}
export function buyItem(key) {
  if (!shopReady() || !SHOP_ITEMS.includes(key) || bird[key] || bird.worms < 1) return false;
  bird.worms--;
  bird[key] = true;
  return true;
}
export function resumeRun() {
  if (!shopReady()) return;
  controls.holding = false;
  session.phase = 'play';
}
