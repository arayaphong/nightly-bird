import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initCanvas } from '../src/platform/canvas.js';
import { loadBest, saveBest } from '../src/platform/storage.js';
import {
  initializeGame,
  startRun,
  revive,
  buyItem,
  resumeRun,
  showOver,
} from '../src/game/lifecycle.js';
import {
  bird,
  controls,
  effects,
  enemies,
  items,
  session,
  viewport,
  world,
} from '../src/game/state.js';
import { catchBird } from '../src/game/combat.js';
import { updateGame } from '../src/game/update.js';
import { updateFlight } from '../src/player/flight.js';
import { updateStages } from '../src/world/progression.js';
import { windCap } from '../src/world/wind.js';
import { updateFlies, updateGifts } from '../src/items/collectibles.js';
import { fireGun, updateBullets } from '../src/items/weapons.js';
import { clearMagnetTargets, magnetPull } from '../src/items/magnet.js';
import {
  AGI_MAX,
  AGI_START,
  AGI_STEP,
  BOOST_TIME,
  DISTANCE_SCALE,
  GONE_TIME,
  WORMS_TO_REVIVE,
} from '../src/config/game.js';

// Simulation modules run without a DOM or Canvas implementation.
beforeEach(() => {
  const saved = new Map();
  globalThis.localStorage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, String(value)),
  };
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.innerWidth = 480;
  globalThis.innerHeight = 800;
  initCanvas({ getContext: () => ({ setTransform() {} }) });
  session.phase = 'ready';
  session.time = 0;
  session.best = 0;
  session.deathBy = '';
  controls.holding = false;
  effects.labels = [];
  initializeGame();
  startRun();
});

test('a new run resets distance, equipment, power-ups, and enemies', () => {
  session.distance = 5000;
  bird.gun = true;
  bird.worms = 3;
  items.boostTime = 8;
  startRun();
  assert.equal(session.phase, 'play');
  assert.equal(session.distance, 0);
  assert.equal(bird.agi, AGI_START);
  assert.equal(bird.worms, 0);
  assert.equal(bird.gun, false);
  assert.equal(items.boostTime, 0);
  assert.equal(enemies.fish.locked, true);
  assert.equal(enemies.hawk.locked, true);
});

test('holding lifts the bird; release accelerates it downward', () => {
  controls.holding = true;
  updateFlight(1 / 60);
  assert.ok(bird.vy < 0);
  bird.vy = 0;
  controls.holding = false;
  updateFlight(1 / 60);
  assert.ok(bird.vy > 0);
});

test('three surface bounces are followed by drowning on the fourth contact', () => {
  for (let contact = 1; contact <= 4; contact++) {
    bird.y = viewport.waterY - bird.r * 0.55 - 0.1;
    bird.vy = 50;
    updateFlight(1 / 60);
    if (contact < 4) {
      assert.equal(bird.alive, true);
      assert.equal(bird.skips, 3 - contact);
      assert.ok(bird.vy < 0);
    }
  }
  assert.equal(session.phase, 'dead');
  assert.equal(session.deathBy, 'drown');
});

test('hazards unlock at 100, 600, and 1100 meters', () => {
  session.distance = 99 * DISTANCE_SCALE;
  updateStages();
  assert.equal(enemies.fish.locked, true);
  session.distance = 100 * DISTANCE_SCALE;
  updateStages();
  assert.equal(enemies.fish.locked, undefined);
  assert.equal(enemies.hawk.locked, true);
  session.distance = 600 * DISTANCE_SCALE;
  updateStages();
  assert.equal(enemies.hawk.locked, undefined);
  session.distance = 1100 * DISTANCE_SCALE;
  updateStages();
  assert.equal(world.cloudTimer, 0.5);
  assert.equal(world.stageShown, 3);
});

test('wind strength cap increases with distance and stops at level five', () => {
  assert.equal(windCap(500), 1);
  assert.equal(windCap(1000), 2);
  assert.equal(windCap(10000), 5);
});

test('helmet absorbs one predator attack', () => {
  bird.helmet = true;
  catchBird('hawk');
  assert.equal(bird.alive, true);
  assert.equal(bird.helmet, false);
  assert.ok(bird.inv > 0);
  bird.inv = 0;
  catchBird('hawk');
  assert.equal(session.deathBy, 'hawk');
  assert.equal(bird.alive, false);
});

test('lightning suit absorbs one strike; helmet does not stop lightning', () => {
  bird.suit = true;
  bird.helmet = true;
  catchBird('storm');
  assert.equal(bird.suit, false);
  assert.equal(bird.alive, true);
  assert.equal(bird.helmet, true);
  bird.zinv = 0;
  catchBird('storm');
  assert.equal(session.deathBy, 'storm');
});

test('normal fireflies raise AGI; at maximum AGI they become worms', () => {
  const fly = () => ({ x: bird.x + bird.r * 1.6, y: bird.y, ph: 0, bl: 0, rainbow: false });
  items.fireflies = [fly()];
  updateFlies(0);
  assert.equal(bird.agi, AGI_START + AGI_STEP);
  bird.agi = AGI_MAX;
  items.fireflies = [fly()];
  updateFlies(0);
  assert.equal(bird.agi, AGI_MAX);
  assert.equal(bird.worms, 1);
});

test('rainbow fireflies refresh boost time', () => {
  items.boostTime = 1;
  items.fireflies = [{ x: bird.x + bird.r * 1.6, y: bird.y, ph: 0, bl: 0, rainbow: true }];
  updateFlies(0);
  assert.equal(items.boostTime, BOOST_TIME);
});

test('a duplicate guaranteed suit gift becomes one worm', () => {
  bird.suit = true;
  items.gifts = [
    { x: bird.x, y: bird.y - bird.r * 1.3, ph: 0, suit: true, popped: false, col: '#ffffff' },
  ];
  updateGifts(0);
  assert.equal(bird.worms, 1);
  assert.equal(items.gifts.length, 0);
});

test('magnet pulls nearby collectibles and clears visual targets during update', () => {
  items.magnetTime = 10;
  const fly = { x: bird.x + 40, y: bird.y };
  items.fireflies = [fly];
  assert.equal(magnetPull(fly, bird.x, bird.y, 1 / 60), true);
  assert.ok(fly.x < bird.x + 40);
  assert.equal(fly.pulled, true);
  clearMagnetTargets();
  assert.equal(fly.pulled, false);
  assert.equal(magnetPull({ x: bird.x + 2000, y: bird.y }, bird.x, bird.y, 1 / 60), false);
});

test('gun is consumed on firing and removes its target temporarily', () => {
  bird.gun = true;
  fireGun('fish');
  assert.equal(bird.gun, false);
  assert.equal(items.bullets.length, 1);
  items.bullets[0].x = enemies.fish.x;
  items.bullets[0].y = enemies.fish.y;
  updateBullets(0);
  assert.equal(enemies.fish.gone, GONE_TIME);
  assert.ok(effects.fishCorpse);
  assert.equal(items.bullets.length, 0);
});

test('reviving with only the required worms resumes play', () => {
  catchBird('drown');
  bird.worms = WORMS_TO_REVIVE;
  revive();
  assert.equal(bird.alive, true);
  assert.equal(session.phase, 'play');
  assert.equal(bird.worms, 0);
  assert.ok(bird.inv > 0);
  assert.ok(bird.zinv > 0);
});

test('remaining worms open the shop; early and duplicate purchases are rejected', () => {
  catchBird('drown');
  bird.worms = WORMS_TO_REVIVE + 2;
  revive();
  assert.equal(session.phase, 'shop');
  assert.equal(buyItem('helmet'), false);
  session.shopOpenedAt = performance.now() - 500;
  assert.equal(buyItem('unknown'), false);
  assert.equal(buyItem('helmet'), true);
  assert.equal(buyItem('helmet'), false);
  assert.equal(bird.worms, 1);
  controls.holding = true;
  resumeRun();
  assert.equal(session.phase, 'play');
  assert.equal(controls.holding, false);
});

test('game over saves a new best score using the existing storage key', () => {
  session.distance = 123 * DISTANCE_SCALE;
  showOver();
  assert.equal(session.best, 123);
  assert.equal(localStorage.getItem('rbn-best'), '123');
  assert.equal(loadBest(), 123);
});

test('unavailable localStorage does not stop the game', () => {
  globalThis.localStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  assert.equal(loadBest(), 0);
  assert.doesNotThrow(() => saveBest(10));
});

test('the complete simulation updates without DOM access', () => {
  assert.equal(typeof document, 'undefined');
  updateGame(1 / 60);
  assert.ok(session.distance > 0);
});
