import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game/create-game.js';
import { AssetStore } from '../src/platform/asset-store.js';
import { ScoreStore } from '../src/platform/score-store.js';
import { Firefly } from '../src/objects/firefly.js';
import { BalloonGift } from '../src/objects/balloon-gift.js';
import { Hawk } from '../src/objects/hawk.js';
import { Projectile } from '../src/objects/projectile.js';
import { LightningBolt, StormCloud } from '../src/objects/storm-cloud.js';
import { CombatRule } from '../src/rules/combat-rule.js';
import { SpawnRule } from '../src/rules/spawn-rule.js';
import { windCap } from '../src/objects/wind-field.js';
import {
  AGI_START,
  AGI_MAX,
  AGI_STEP,
  BOOST_TIME,
  DISTANCE_SCALE,
  GONE_TIME,
} from '../src/config/game.js';

function random(seed = 1234) {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
async function makeGame() {
  const saved = new Map();
  const scoreStore = new ScoreStore({
    storage: () => ({
      getItem: (key) => saved.get(key),
      setItem: (key, value) => saved.set(key, value),
    }),
  });
  const platform = createGame({
    assets: new AssetStore({ loader: async () => [] }),
    scoreStore,
    random: random(),
    cosmeticRandom: random(9),
  });
  await platform.load();
  platform.command('restart');
  platform.step(0);
  return { platform, saved };
}
let p, bird, session, viewport, shark, hawk, combat, spawn, saved;
beforeEach(async () => {
  ({ platform: p, saved } = await makeGame());
  bird = p.get('player');
  session = p.get('session');
  viewport = p.get('viewport');
  shark = p.get('shark');
  hawk = p.get('hawk');
  combat = p.get('rules').rules.find((r) => r instanceof CombatRule);
  spawn = p.get('rules').rules.find((r) => r instanceof SpawnRule);
});
afterEach(() => p.dispose());
function place(object, x, y) {
  p.physics.place(object, x, y);
}
function add(object) {
  p.add(object);
  p.flush();
  return object;
}
function fly(options = {}) {
  return add(new Firefly({ x: bird.x + bird.r * 1.6, y: bird.y, ...options }));
}
function over() {
  combat.hit(bird, 'drown');
  p.dispatchEvents();
  session.showOver();
}

test('a new run resets gameplay, equipment, animation and transient objects', () => {
  session.distance = 5000;
  session.worms = 3;
  bird.equip('gun');
  bird.emitRainbow(8);
  bird.chew();
  fly();
  p.command('restart');
  p.step(0);
  assert.equal(session.phase, 'play');
  assert.equal(session.distance, 0);
  assert.equal(session.worms, 0);
  assert.equal(bird.agi, AGI_START);
  assert.equal(bird.gun, false);
  assert.equal(bird.status.has('boost'), false);
  assert.equal(bird.animation.chewTime, 0);
  assert.equal(p.list('firefly').length, 0);
  assert.equal(shark.locked, true);
});
test('holding lifts the bird and releasing accelerates downward', () => {
  p.get('input').set('test', 'flap', true);
  p.step(1 / 60);
  assert.ok(bird.vy < 0);
  bird.vy = 0;
  p.get('input').set('test', 'flap', false);
  p.step(1 / 60);
  assert.ok(bird.vy > 0);
});
test('the flight equation preserves the original airborne acceleration', () => {
  const y = bird.y;
  p.get('input').set('test', 'flap', true);
  p.step(1 / 60);
  assert.equal(bird.vy, (-viewport.height * 2.7 * AGI_START) / 60);
  assert.equal(bird.y, y + bird.vy / 60);
});
test('three surface bounces then drowning, with no shark attachment', () => {
  for (let contact = 1; contact <= 4; contact++) {
    place(bird, 144, viewport.waterY - bird.r * 0.55 - 0.1);
    bird.vy = 50;
    p.step(1 / 60);
    if (contact < 4) {
      assert.equal(bird.alive, true);
      assert.equal(bird.skips, 3 - contact);
      assert.ok(bird.vy < 0);
    }
  }
  assert.equal(session.deathBy, 'drown');
  assert.equal(bird.alive, false);
  assert.equal(shark.ate, false);
  assert.equal(bird.body.attachment, null);
});
test('drowning with an active shark still falls independently', () => {
  shark.respawn();
  place(shark, 400, 700);
  over();
  const y = bird.y;
  p.step(1 / 60);
  assert.ok(bird.y > y);
  assert.equal(shark.ate, false);
  assert.equal(bird.body.mode, 'dynamic');
});
test('hazards unlock at 100, 600, and 1100 meters', () => {
  session.distance = 99 * DISTANCE_SCALE;
  p.step(0);
  assert.equal(shark.locked, true);
  session.distance = 100 * DISTANCE_SCALE;
  p.step(0);
  assert.equal(shark.locked, false);
  assert.equal(hawk.locked, true);
  session.distance = 600 * DISTANCE_SCALE;
  p.step(0);
  assert.equal(hawk.locked, false);
  session.distance = 1100 * DISTANCE_SCALE;
  p.step(0);
  assert.equal(spawn.cloudTimer, 0.5);
  assert.equal(session.stageShown, 3);
  assert.equal(windCap(500), 1);
  assert.equal(windCap(1000), 2);
  assert.equal(windCap(10000), 5);
});
test('helmet blocks predators once and protection applies immediately to a second hit', () => {
  bird.equip('helmet');
  combat.hit(bird, 'hawk', hawk);
  combat.hit(bird, 'fish', shark);
  assert.equal(bird.alive, true);
  assert.equal(bird.helmet, false);
  assert.ok(bird.inv > 0);
  bird.status.apply('predatorProtection', 0);
  combat.hit(bird, 'hawk', hawk);
  p.dispatchEvents();
  assert.equal(session.deathBy, 'hawk');
  assert.equal(bird.alive, false);
});
test('lightning suit absorbs one strike; helmet never absorbs lightning', () => {
  bird.equip('suit');
  bird.equip('helmet');
  combat.hit(bird, 'storm');
  assert.equal(bird.suit, false);
  assert.equal(bird.helmet, true);
  assert.equal(bird.alive, true);
  bird.status.apply('lightningProtection', 0);
  combat.hit(bird, 'storm');
  p.dispatchEvents();
  assert.equal(session.deathBy, 'storm');
  assert.equal(bird.zapped, true);
});
test('normal fireflies raise AGI and become worms at maximum AGI', () => {
  fly();
  p.step(0);
  assert.equal(bird.agi, AGI_START + AGI_STEP);
  assert.equal(p.list('firefly').length, 1);
  assert.equal(bird.mouthfuls.size, 1);
  assert.equal(p.list('pickup').length, 0);
  assert.ok(bird.animation.chewTime > 0);
  bird.agi = AGI_MAX;
  fly();
  p.step(0);
  assert.equal(bird.agi, AGI_MAX);
  assert.equal(session.worms, 1);
});
test('rainbow fireflies refresh the boost duration', () => {
  bird.emitRainbow(1);
  fly({ rainbow: true });
  p.step(0);
  assert.equal(bird.status.remaining('boost'), BOOST_TIME);
});
test('touching both gift colliders grants one reward, including duplicate conversion', () => {
  bird.equip('suit');
  // Enlarged player body overlaps balloon and box simultaneously.
  bird.r = 60;
  const gift = add(new BalloonGift({ x: bird.x, y: bird.y, suit: true }));
  gift.getColliders = () => [
    {
      shape: 'circle',
      name: 'balloon',
      group: 'gift',
      mask: ['player'],
      radius: 20,
      x: bird.x,
      y: bird.y,
      priority: 50,
    },
    {
      shape: 'circle',
      name: 'box',
      group: 'gift',
      mask: ['player'],
      radius: 20,
      x: bird.x,
      y: bird.y,
      priority: 50,
    },
  ];
  p.step(0);
  assert.equal(session.worms, 1);
  assert.equal(session.suitGranted, true);
  assert.equal(p.list('gift').length, 0);
});
test('magnet adds a pull to pickup motion without moving during planning', () => {
  bird.status.apply('magnet', 10);
  const item = fly({ x: bird.x + 80 });
  item.vx = item.vy = 0;
  const x = item.x;
  assert.equal(bird.magnet.pull(item, 1 / 60), true);
  assert.equal(item.x, x);
  assert.ok(item.vx < 0);
  p.step(1 / 60);
  assert.ok(item.x < x);
  const far = fly({ x: bird.x + 2000 });
  assert.equal(bird.magnet.pull(far, 1 / 60), false);
});
test('gun fires before physics in the same attack frame and is consumed once', () => {
  hawk.respawn();
  place(hawk, 400, 100);
  place(bird, 100, 180);
  bird.equip('gun');
  p.step(1 / 60);
  assert.equal(hawk.mode, 'dive');
  assert.equal(bird.gun, false);
  const shots = p.list('projectile');
  assert.equal(shots.length, 1);
  assert.ok(shots[0].x > bird.x + bird.r);
  p.step(1 / 60);
  assert.equal(p.list('projectile').length, 1);
});
test('a shot removes only its selected enemy and creates an independent corpse', () => {
  shark.respawn();
  const shot = add(new Projectile({ shooter: bird, target: shark }));
  place(shot, shark.x, shark.y);
  p.step(0);
  assert.equal(shark.gone, GONE_TIME);
  assert.equal(hawk.gone, 0);
  assert.equal(p.list('projectile').length, 0);
  assert.equal(p.list('corpse').length, 1);
});
test('a projectile crossing a target between frames still hits', () => {
  shark.respawn();
  place(shark, 300, 700);
  shark.plan = () => {
    shark.vx = shark.vy = 0;
  };
  const shot = add(new Projectile({ shooter: bird, target: shark }));
  place(shot, 200, 700);
  shot.speed = 10000;
  p.step(0.025);
  assert.equal(shark.gone, GONE_TIME);
});
test('a projectile cannot retarget a respawned instance with the same id', () => {
  shark.respawn();
  const shot = add(new Projectile({ shooter: bird, target: shark }));
  const generation = shark.generation;
  shark.respawn();
  assert.notEqual(shark.generation, generation);
  p.step(0);
  assert.equal(shot.removing, true);
  assert.equal(shark.gone, 0);
});
test('shark capture has one position owner and revive detaches safely', () => {
  shark.respawn();
  place(shark, 300, 620);
  combat.hit(bird, 'fish', shark);
  p.dispatchEvents();
  assert.equal(bird.body.mode, 'attached');
  p.step(1 / 60);
  assert.ok(Math.abs(bird.x - (shark.x + Math.cos(shark.ang) * shark.size * 0.95)) < 1e-9);
  session.worms = 1;
  session.showOver();
  p.command('revive');
  p.step(0);
  assert.equal(bird.alive, true);
  assert.equal(bird.body.attachment, null);
  assert.equal(shark.ate, false);
  assert.equal(session.phase, 'play');
  assert.equal(session.worms, 0);
  assert.ok(bird.inv > 0 && bird.zinv > 0);
});
test('remaining worms open a paused shop; UI clock enables purchase and resume', () => {
  over();
  session.worms = 3;
  p.command('revive');
  p.step(0);
  assert.equal(session.phase, 'shop');
  const time = p.clock.simulation,
    status = bird.inv,
    y = bird.y;
  p.command('buy', { key: 'helmet' });
  p.step(0.1);
  assert.equal(bird.helmet, false);
  p.step(0.4);
  assert.equal(p.clock.simulation, time);
  assert.equal(bird.inv, status);
  assert.equal(bird.y, y);
  p.command('buy', { key: 'helmet' });
  p.command('buy', { key: 'helmet' });
  p.command('buy', { key: 'unknown' });
  p.step(0);
  assert.equal(bird.helmet, true);
  assert.equal(session.worms, 1);
  p.get('input').set('test', 'flap', true);
  p.command('resume');
  p.step(0);
  assert.equal(session.phase, 'play');
  assert.equal(p.get('input').held('flap'), false);
});
test('pause freezes simulation and timers but commands can resume it', () => {
  bird.emitRainbow(8);
  p.command('pause');
  p.step(0.5);
  const time = p.clock.simulation;
  p.step(1);
  assert.equal(p.clock.simulation, time);
  assert.equal(bird.status.remaining('boost'), 8);
  p.command('pause');
  p.step(0.02);
  assert.equal(session.phase, 'play');
  assert.ok(bird.status.remaining('boost') < 8);
});
test('death animation continues, game over is delayed and score persists', () => {
  session.distance = 123 * DISTANCE_SCALE;
  combat.hit(bird, 'drown');
  p.dispatchEvents();
  assert.equal(session.overShown, false);
  const y = bird.y;
  for (let i = 0; i < 400; i++) p.step(0.03);
  assert.ok(bird.y > y);
  assert.equal(session.overShown, true);
  assert.equal(saved.get('rbn-best'), '123');
});
test('lightning damages once even while the bolt remains visible', () => {
  bird.equip('suit');
  const bolt = add(
    new LightningBolt({
      points: [
        [bird.x - 20, bird.y],
        [bird.x + 20, bird.y],
      ],
      cloud: null,
    }),
  );
  p.step(0);
  assert.equal(bird.suit, false);
  assert.equal(bird.alive, true);
  assert.equal(bolt.armed, false);
  bird.status.apply('lightningProtection', 0);
  p.step(0);
  assert.equal(bird.alive, true);
  assert.ok(bolt.life > 0);
});
test('cloud charges at a fixed point, strike stays at that point', () => {
  const cloud = add(new StormCloud({ x: bird.x, y: bird.y - 40 }));
  cloud.beginCharge(bird);
  const point = { x: cloud.tx, y: cloud.ty };
  place(bird, bird.x + 100, bird.y);
  cloud.strike();
  p.flush();
  assert.deepEqual({ x: cloud.tx, y: cloud.ty }, point);
  assert.ok(cloud.lightning.points.length > 2);
  p.remove(cloud);
  assert.equal(p.list('lightning').length, 0);
});
test('multiple hawks have independent motion, targets and animation state', () => {
  const other = add(new Hawk({ id: 'hawk-2' }));
  hawk.respawn();
  other.respawn();
  place(hawk, 400, 100);
  place(other, 300, 90);
  hawk.lockTarget(bird);
  other.lockTarget({ x: 250, y: 250 });
  hawk.stun(1);
  assert.equal(other.stunTime, 0);
  assert.notDeepEqual(hawk.lock, other.lock);
  other.flap = 9;
  assert.notEqual(hawk.flap, other.flap);
});
test('two platforms never share inventory, timers, registry or score', async () => {
  const { platform: other } = await makeGame();
  try {
    bird.equip('gun');
    bird.emitRainbow(8);
    session.worms = 5;
    fly();
    assert.equal(other.find('player').gun, false);
    assert.equal(other.find('player').status.has('boost'), false);
    assert.equal(other.get('session').worms, 0);
    assert.equal(other.list('firefly').length, 0);
    other.step(1 / 60);
    assert.equal(session.distance, 0);
  } finally {
    other.dispose();
  }
});
test('blocked storage does not stop game startup or scoring', () => {
  const store = new ScoreStore({
    storage: () => {
      throw new Error('blocked');
    },
  });
  assert.equal(store.load(), 0);
  assert.doesNotThrow(() => store.save(10));
});
test('full simulation runs without a DOM and clamps tab-resume delta', () => {
  assert.equal(typeof document, 'undefined');
  p.step(60);
  assert.equal(p.clock.simulation, 0.033);
  assert.equal(p.clock.ui, 60);
  assert.ok(session.distance > 0);
});

test('public bird actions work independently and keep animation channels separate', () => {
  bird.flap();
  p.step(1 / 60);
  assert.ok(bird.vy < 0);
  bird.blink();
  bird.chew();
  p.step(0.03);
  assert.ok(bird.animation.blinkOpen() < 1);
  assert.ok(bird.animation.chewAmount() > 0);
  assert.equal(typeof bird.blink, 'function');
  bird.blink();
  const angle = bird.animation.wingAngle;
  bird.glide();
  p.step(0.02);
  assert.ok(bird.animation.wingAngle >= angle);
  assert.equal(bird.flapping, false);
});

test('predator contact wins before pickups in the same frame', () => {
  shark.respawn();
  place(bird, 144, viewport.dangerY + 10);
  place(shark, bird.x, bird.y);
  const item = fly();
  const gift = add(
    new BalloonGift({ x: bird.x, y: bird.y - bird.r * 1.25 * 1.3, suit: true }),
  );
  p.step(0);
  assert.equal(bird.alive, false);
  assert.equal(item.eaten, false);
  assert.equal(gift.popped, false);
  assert.equal(bird.agi, AGI_START);
  assert.equal(bird.suit, false);
});
test('removing a target and reusing its id cannot transfer an old projectile', () => {
  hawk.respawn();
  const projectile = add(new Projectile({ shooter: bird, target: hawk }));
  p.remove(hawk);
  const replacement = add(new Hawk({ id: 'hawk' }));
  replacement.respawn();
  place(projectile, replacement.x, replacement.y);
  p.step(0);
  assert.equal(projectile.removing, true);
  assert.equal(replacement.gone, 0);
});
test('bird instances own their animation channels and rainbow trail', async () => {
  const { Redbird } = await import('../src/objects/redbird.js');
  const other = add(new Redbird({ id: 'bird-2' }));
  bird.emitRainbow(8);
  bird.blink();
  bird.flap();
  p.step(0.02);
  assert.ok(bird.rainbow.points.length > 0);
  assert.equal(other.rainbow.points.length, 0);
  assert.equal(other.animation.blinkTime, 0);
  assert.notEqual(bird.animation.wingAngle, other.animation.wingAngle);
});

function advance(seconds) {
  for (let left = seconds; left > 1e-9; left -= 0.01) p.step(Math.min(0.01, left));
}

test('eaten firefly stays at the rotated mouth, cannot be collected twice, and disappears when chewing ends', () => {
  const food = fly();
  p.step(0);
  assert.equal(food.eaten, true);
  assert.equal(food.eater, bird);
  assert.equal(food.body.mode, 'attached');
  assert.deepEqual(food.getColliders(), []);
  const dx = food.x - bird.x,
    dy = food.y - bird.y,
    agi = bird.agi;
  place(bird, 210, 380);
  bird.vy = viewport.height * 0.7;
  p.step(0);
  assert.ok(
    Math.abs(food.x - bird.x - (dx * Math.cos(bird.angle) - dy * Math.sin(bird.angle))) < 1e-9,
  );
  assert.ok(
    Math.abs(food.y - bird.y - (dx * Math.sin(bird.angle) + dy * Math.cos(bird.angle))) < 1e-9,
  );
  assert.equal(bird.eat(food), false);
  assert.equal(bird.agi, agi);
  bird.vy = 0;
  advance(0.5);
  assert.equal(p.get(food.id), food);
  assert.ok(bird.animation.chewTime > 0);
  advance(0.06);
  assert.equal(bird.animation.chewTime, 0);
  assert.equal(p.get(food.id), undefined);
  assert.equal(bird.mouthfuls.size, 0);
});

test('food follows the current jaw pose after animation updates and remains while paused', () => {
  const food = fly({ rainbow: true });
  p.step(0.02);
  const expected = bird.mouthAnchor(food);
  assert.equal(food.x, expected.x);
  assert.equal(food.y, expected.y);
  const time = bird.animation.chewTime,
    position = { x: food.x, y: food.y };
  p.command('pause');
  p.step(0);
  p.step(2);
  assert.equal(bird.animation.chewTime, time);
  assert.deepEqual({ x: food.x, y: food.y }, position);
  assert.equal(p.get(food.id), food);
  p.command('pause');
  p.step(0);
  advance(0.6);
  assert.equal(p.get(food.id), undefined);
});

test('rapid pickups remain held through the newest chew and each reward is granted once', () => {
  const first = fly();
  p.step(0);
  advance(0.3);
  const second = fly({ rainbow: true });
  p.step(0);
  assert.equal(bird.mouthfuls.size, 2);
  advance(0.3);
  assert.equal(p.get(first.id), first);
  assert.equal(p.get(second.id), second);
  assert.equal(bird.agi, AGI_START + AGI_STEP);
  advance(0.26);
  assert.equal(bird.mouthfuls.size, 0);
  assert.equal(p.get(first.id), undefined);
  assert.equal(p.get(second.id), undefined);
});

test('death, restart and removal clear food attachments without carrying them into a revive', () => {
  const first = fly();
  p.step(0);
  bird.die('drown');
  p.dispatchEvents();
  p.step(0);
  assert.equal(p.get(first.id), undefined);
  assert.equal(bird.mouthfuls.size, 0);
  session.worms = 1;
  session.showOver();
  p.command('revive');
  p.step(0);
  const second = fly();
  p.step(0);
  assert.equal(bird.mouthfuls.size, 1);
  p.command('restart');
  p.step(0);
  assert.equal(p.get(second.id), undefined);
  assert.equal(bird.mouthfuls.size, 0);
  const third = fly();
  p.step(0);
  p.remove(bird);
  assert.equal(p.get(third.id), undefined);
});
