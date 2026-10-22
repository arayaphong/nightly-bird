import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from '../src/core/platform.js';
import { PlatformObject, WorldObject } from '../src/core/object.js';
import { PhysicsSystem } from '../src/core/physics.js';
import { CollisionSystem, circle } from '../src/core/collision.js';
import { AssetStore } from '../src/platform/asset-store.js';
import { InputRouter } from '../src/input/input-router.js';
import { HIDTap, HIDKeyboard, HIDGamepad } from '../src/input/devices.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
test('an asynchronous object is invisible until loaded; failed loads can retry', async () => {
  const gate = deferred();
  let attempts = 0;
  const assets = new AssetStore({
    loader: () => (++attempts === 1 ? gate.promise : Promise.resolve([])),
  });
  const p = new Platform({ assets }),
    o = new WorldObject({ id: 'async' });
  o.assetKeys = ['bird'];
  p.add(o);
  p.step(0.01);
  assert.equal(p.get('async'), undefined);
  assert.equal(o.ready, false);
  gate.reject(new Error('unavailable'));
  await assert.rejects(o.loading, /unavailable/);
  assert.equal(p.loadErrors.length, 1);
  assert.equal(p.get('async'), undefined);
  p.add(o);
  await p.load();
  assert.equal(o.ready, true);
  assert.equal(p.get('async'), o);
  p.dispose();
});
test('shared artwork loads once but separate instances own separate bodies', async () => {
  let loads = 0;
  const p = new Platform({
    assets: new AssetStore({
      loader: async () => {
        loads++;
        return [];
      },
    }),
  });
  const a = new WorldObject(),
    b = new WorldObject();
  a.assetKeys = b.assetKeys = ['bird'];
  p.addAll([a, b]);
  await p.load();
  assert.equal(loads, 1);
  a.vx = 20;
  p.step(0.02);
  assert.equal(a.x, 0.4);
  assert.equal(b.x, 0);
  p.dispose();
});
test('removing an object while loading prevents a late attach', async () => {
  const gate = deferred(),
    p = new Platform(),
    o = new PlatformObject();
  o.load = () => gate.promise;
  let attached = 0;
  o.attach = () => attached++;
  p.add(o);
  p.remove(o);
  gate.resolve();
  await o.loading;
  p.flush();
  assert.equal(attached, 0);
  assert.equal(o.ready, false);
  assert.equal(p.list().length, 0);
  p.dispose();
});
test('platform disposal prevents pending loads from resurrecting objects', async () => {
  const gate = deferred(),
    p = new Platform(),
    o = new PlatformObject();
  o.load = () => gate.promise;
  p.add(o);
  p.dispose();
  gate.resolve();
  await o.loading;
  assert.equal(p.list().length, 0);
  assert.equal(o.ready, false);
});
test('structural removals are deferred and removed objects do not continue updating', async () => {
  const p = new Platform(),
    a = new PlatformObject({ order: 0 }),
    b = new PlatformObject({ order: 1 });
  let plans = 0,
    detaches = 0;
  a.plan = () => p.remove(b);
  b.plan = () => plans++;
  b.detach = () => detaches++;
  p.addAll([a, b]);
  await p.load();
  p.step(0.01);
  assert.equal(plans, 0);
  assert.equal(detaches, 1);
  assert.equal(p.list().length, 1);
  p.dispose();
});
test('attachments follow parents once; cycles are rejected and removal releases children', async () => {
  const p = new Platform(),
    parent = new WorldObject(),
    child = new WorldObject();
  p.addAll([parent, child]);
  await p.load();
  parent.vx = 100;
  p.physics.attach(child, parent, (o) => ({ x: o.x + 5, y: o.y + 2 }));
  child.vx = 999;
  p.step(0.02);
  assert.equal(parent.x, 2);
  assert.equal(child.x, 7);
  assert.equal(child.y, 2);
  assert.throws(() => p.physics.attach(parent, child, (o) => o.transform), /cycle/);
  p.remove(parent);
  assert.equal(child.body.mode, 'dynamic');
  p.dispose();
});
test('collision masks, relative swept motion, and enter/stay/exit are independent of drawing order', () => {
  const a = new WorldObject({ id: 'a', x: 0, y: 0 }),
    b = new WorldObject({ id: 'b', x: 20, y: 0 });
  a.ready = b.ready = true;
  a.getColliders = () => [circle(a, 'body', 'a', ['b'], 2, { swept: true })];
  b.getColliders = () => [circle(b, 'body', 'b', ['a'], 2)];
  const physics = new PhysicsSystem(),
    collisions = new CollisionSystem();
  physics.begin([a, b]);
  physics.move(a, 30, 0);
  physics.move(b, -10, 0);
  assert.equal(collisions.detect([a, b])[0].phase, 'enter');
  physics.place(a, 10, 0);
  physics.place(b, 10, 0);
  assert.equal(collisions.detect([b, a])[0].phase, 'stay');
  physics.place(a, 100, 0);
  assert.equal(collisions.detect([a, b])[0].phase, 'exit');
  assert.equal(collisions.detect([a, b]).length, 0);
});
test('tap and keyboard combine held input; releasing one does not release the other', async () => {
  const p = new Platform(),
    router = new InputRouter();
  p.add(router);
  await p.load();
  router.set('pointer-1', 'flap', true);
  router.set('key-Space', 'flap', true);
  router.releaseSource('pointer-1');
  assert.equal(router.held('flap'), true);
  router.releaseSource('key-Space');
  assert.equal(router.held('flap'), false);
  p.dispose();
});
test('UI buttons do not leak taps, focus loss clears input, device detach removes listeners', async () => {
  const host = new EventTarget(),
    p = new Platform(),
    router = new InputRouter();
  p.addAll([
    router,
    new HIDTap({ target: host, host, document: null }),
    new HIDKeyboard({ target: host, document: null }),
  ]);
  await p.load();
  const send = (type, props = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, props);
    host.dispatchEvent(event);
  };
  const press = new Event('pointerdown', { cancelable: true });
  Object.defineProperty(press, 'target', { value: { closest: () => ({}) } });
  Object.assign(press, { button: 0, pointerId: 1 });
  host.dispatchEvent(press);
  assert.equal(router.held('flap'), false);
  send('pointerdown', { button: 0, pointerId: 1 });
  send('keydown', { code: 'Space', repeat: false });
  send('pointerup', { pointerId: 1 });
  assert.equal(router.held('flap'), true);
  send('blur');
  assert.equal(router.held('flap'), false);
  p.remove(p.get('keyboard'));
  send('keydown', { code: 'Space', repeat: false });
  assert.equal(router.held('flap'), false);
  p.dispose();
});
test('optional gamepad adapter clears held buttons on disconnect', async () => {
  let pads = [{ index: 0, connected: true, buttons: [{ pressed: true }] }];
  const p = new Platform(),
    router = new InputRouter();
  p.addAll([router, new HIDGamepad({ poller: () => pads })]);
  await p.load();
  p.step(0);
  assert.equal(router.held('flap'), true);
  pads = [];
  p.step(0);
  assert.equal(router.held('flap'), false);
  p.dispose();
});

test('pending objects cannot be registered to two platforms', async () => {
  const gate = deferred(),
    a = new Platform(),
    b = new Platform(),
    object = new PlatformObject();
  object.load = () => gate.promise;
  a.add(object);
  assert.throws(() => b.add(object), /owner/);
  gate.resolve();
  await a.load();
  a.dispose();
  b.dispose();
});
test('a cancelled load cannot activate a newer registration prematurely', async () => {
  const first = deferred(),
    second = deferred(),
    p = new Platform(),
    object = new PlatformObject();
  let count = 0;
  object.load = () => (++count === 1 ? first.promise : second.promise);
  p.add(object);
  const oldLoading = object.loading;
  p.remove(object, { dispose: false });
  p.add(object);
  first.resolve();
  await oldLoading;
  p.flush();
  assert.equal(p.get(object.id), undefined);
  second.resolve();
  await p.load();
  assert.equal(p.get(object.id), object);
  p.dispose();
});

test('failed startup disposal never attaches a partially loaded scene', async () => {
  const p = new Platform();
  let attached = 0;
  const ready = new PlatformObject();
  ready.attach = () => {
    attached++;
    throw Error('missing scene dependencies');
  };
  const failure = new PlatformObject();
  failure.load = () => Promise.reject(new Error('SVG failed'));
  p.addAll([ready, failure]);
  await assert.rejects(p.load(), /SVG failed/);
  assert.doesNotThrow(() => p.dispose());
  assert.equal(attached, 0);
  assert.equal(p.list().length, 0);
});
