import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Platform } from '../src/core/platform.js';
import { AudioSystem } from '../src/platform/audio-system.js';
import { AssetStore } from '../src/platform/asset-store.js';
import { createGame } from '../src/game/create-game.js';
import { Firefly } from '../src/objects/firefly.js';
import { Hawk } from '../src/objects/hawk.js';
import { WeaponRule } from '../src/rules/weapon-rule.js';
import { CombatRule } from '../src/rules/combat-rule.js';
import { LightningBolt, StormCloud } from '../src/objects/storm-cloud.js';
import { BalloonGift } from '../src/objects/balloon-gift.js';
import { SOUND_EFFECTS, SOUND_EVENTS } from '../src/config/audio.js';

const crunch = new URL('../assets/audio/crunch.wav', import.meta.url);
function mockAudio({
  state = 'running',
  host = null,
  fail = false,
  sounds = { crunch },
} = {}) {
  const sources = [];
  const context = {
    state,
    destination: {},
    currentTime: 0,
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    async decodeAudioData(bytes) {
      assert.ok(bytes.byteLength > 44);
      return { duration: 1 };
    },
    resume() {
      this.state = 'running';
      return Promise.resolve();
    },
    close() {
      this.state = 'closed';
      return Promise.resolve();
    },
    createBufferSource() {
      const source = {
        started: false,
        stopped: false,
        disconnected: false,
        connect(output) {
          this.output = output;
        },
        end() {
          this.ended = true;
          this.onended?.();
        },
        start(when = 0, offset = 0) {
          this.started = true;
          this.when = when;
          this.offset = offset;
        },
        stop() {
          this.stopped = true;
        },
        disconnect() {
          this.disconnected = true;
        },
      };
      sources.push(source);
      return source;
    },
  };
  const audio = new AudioSystem({
    host,
    contextFactory: () => context,
    sounds,
    events: SOUND_EVENTS,
    fetcher: async (url) => ({
      ok: !fail,
      status: fail ? 503 : 200,
      arrayBuffer: async () => {
        const bytes = await readFile(url);
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      },
    }),
  });
  return { audio, context, sources };
}

test('audio unlocks on input and never queues sounds heard before a gesture', async () => {
  const host = new EventTarget(),
    { audio, context, sources } = mockAudio({ host, state: 'suspended' });
  const p = new Platform();
  p.add(audio);
  await p.load();
  p.emit('firefly-eaten');
  p.dispatchEvents();
  assert.equal(sources.length, 0);
  host.dispatchEvent(new Event('pointerdown'));
  assert.equal(context.state, 'running');
  assert.equal(sources.length, 0);
  p.emit('firefly-eaten');
  p.dispatchEvents();
  assert.equal(sources.length, 1);
  assert.equal(sources[0].started, true);
  p.dispose();
  assert.equal(context.state, 'closed');
  assert.equal(sources[0].stopped, true);
  assert.equal(sources[0].disconnected, true);
});

test('rapid pickups overlap with bounded voices and release finished sources', async () => {
  const { audio, sources } = mockAudio();
  await audio.load();
  for (let i = 0; i < 8; i++) assert.equal(audio.play('crunch'), true);
  assert.equal(audio.voices.size, 4);
  assert.ok(sources.slice(0, 4).every((source) => source.stopped && source.disconnected));
  sources[7].onended();
  assert.equal(audio.voices.size, 3);
  assert.equal(sources[7].disconnected, true);
  audio.dispose();
  assert.equal(audio.voices.size, 0);
});

test('failed audio download and absent Web Audio never prevent game startup', async () => {
  const { audio } = mockAudio({ fail: true });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0.02);
  assert.equal(p.get('session').phase, 'play');
  assert.equal(audio.errors.length, 1);
  assert.equal(audio.play('crunch'), false);
  p.dispose();
  const unsupported = new AudioSystem();
  await unsupported.load();
  assert.equal(unsupported.play('crunch'), false);
  unsupported.dispose();
});

test('normal and rainbow fireflies each crunch once; gifts and dead birds do not', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  const bird = p.find('player');
  const add = (o) => {
    p.add(o);
    p.flush();
    return o;
  };
  const crunchCount = () =>
    sources.filter((source) => source.buffer === audio.buffers.get('crunch')).length;
  for (const rainbow of [false, true]) {
    add(new Firefly({ x: bird.x + bird.r * 1.6, y: bird.y, rainbow }));
    p.step(0);
    assert.ok(bird.animation.chewTime > 0);
    assert.equal(sources.at(-1).when, 0);
    assert.equal(sources.at(-1).offset, 0);
    p.step(0);
  }
  assert.equal(crunchCount(), 2);
  add(new BalloonGift({ x: bird.x, y: bird.y - bird.r * 1.25 * 1.3, suit: true }));
  p.step(0);
  assert.equal(crunchCount(), 2);
  bird.die('drown');
  p.dispatchEvents();
  add(new Firefly({ x: bird.x + bird.r * 1.6, y: bird.y }));
  p.step(0);
  assert.equal(crunchCount(), 2);
  p.dispose();
});

test('trimmed crunch stays compact and starts its audible bite within 15 ms', async () => {
  const bytes = await readFile(SOUND_EFFECTS.crunch);
  assert.ok(bytes.length < 70000, 'The quiet prefix must be removed from the deployed file');
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  let format, pcm;
  for (let pos = 12; pos + 8 <= bytes.length;) {
    const name = bytes.toString('ascii', pos, pos + 4),
      size = bytes.readUInt32LE(pos + 4);
    if (name === 'fmt ') format = bytes.subarray(pos + 8, pos + 8 + size);
    if (name === 'data') pcm = bytes.subarray(pos + 8, pos + 8 + size);
    pos += 8 + size + (size % 2);
  }
  assert.equal(format.readUInt16LE(0), 1); // PCM
  assert.equal(format.readUInt16LE(14), 16);
  const channels = format.readUInt16LE(2),
    rate = format.readUInt32LE(4);
  assert.ok(pcm.length / (channels * 2 * rate) < 0.4);
  const firstFrame = 0;
  let onset = Infinity;
  for (let frame = firstFrame; frame < pcm.length / (channels * 2); frame++) {
    for (let channel = 0; channel < channels; channel++) {
      if (Math.abs(pcm.readInt16LE((frame * channels + channel) * 2)) / 32768 >= 0.1) {
        onset = (frame - firstFrame) / rate;
        break;
      }
    }
    if (Number.isFinite(onset)) break;
  }
  assert.ok(onset >= 0 && onset <= 0.015, `Audible onset delayed ${onset * 1000} ms`);
});

test('flight rounds finish naturally, never overlap, and reuse the current round on re-press', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  const bird = p.find('player');
  const input = p.get('input');
  p.command('restart');
  p.step(0);
  bird.body.enabled = false;
  input.set('test', 'flap', true);
  p.step(0.02);
  const first = audio.loops.get('wingFlap');
  assert.equal(first.loop, false);
  for (let i = 0; i < 5; i++) p.step(0.02);
  assert.equal(sources.length, 1);
  first.end();
  const second = audio.loops.get('wingFlap');
  assert.notEqual(second, first);
  assert.equal(sources.length, 2);
  assert.equal(first.stopped, false);
  input.set('test', 'flap', false);
  p.step(0.01);
  assert.equal(
    bird.animation.wingMoving,
    true,
    'Wings can finish their rotation independently',
  );
  assert.equal(audio.repeatRequests.has('wingFlap'), false);
  assert.equal(second.stopped, false, 'Release must not cut the current recording');
  input.set('test', 'flap', true);
  p.step(0.01);
  assert.equal(audio.loops.get('wingFlap'), second);
  assert.equal(sources.length, 2, 'Re-press must reuse the source');
  second.end();
  const third = audio.loops.get('wingFlap');
  assert.notEqual(third, second);
  input.set('test', 'flap', false);
  p.step(0.01);
  third.end();
  assert.equal(audio.loops.size, 0);
  assert.equal(sources.length, 3);
  for (let i = 0; i < 40; i++) p.step(0.01);
  assert.equal(sources.length, 3, 'Coasting cannot request another sound round');
  assert.ok(sources.every((source) => !source.stopped));
  // Idle flaps still have sound and finish the current recording when they stop.
  bird.animation.lazyTime = 0;
  p.step(0.01);
  p.step(0.01);
  const idle = audio.loops.get('wingFlap');
  assert.ok(idle?.started);
  for (let i = 0; i < 80; i++) p.step(0.01);
  assert.equal(audio.repeatRequests.size, 0);
  assert.equal(idle.stopped, false);
  idle.end();
  assert.equal(audio.loops.size, 0);
  p.dispose();
});

test('pause, death, restart, hidden tabs and platform stop finish the current flight round', async () => {
  const host = new EventTarget();
  host.document = new EventTarget();
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS, host });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  const bird = p.find('player');
  const start = () => {
    p.command('restart');
    p.step(0);
    bird.body.enabled = false;
    p.get('input').set('test', 'flap', true);
    p.step(0.02);
    const source = audio.loops.get('wingFlap');
    assert.ok(source?.started);
    return source;
  };
  const actions = [
    () => {
      p.command('pause');
      p.step(0);
    },
    () => {
      bird.die('drown');
      p.step(0);
    },
    () => {
      p.command('restart');
      p.step(0);
    },
    () => {
      p.get('session').setPhase('shop');
      p.step(0);
    },
    () => {
      host.document.hidden = true;
      host.document.dispatchEvent(new Event('visibilitychange'));
    },
    () => p.stop(),
  ];
  for (const action of actions) {
    const source = start();
    const count = sources.filter((s) => s.buffer === audio.buffers.get('wingFlap')).length;
    action();
    assert.equal(source.stopped, false);
    assert.equal(audio.loops.get('wingFlap'), source);
    source.end();
    assert.equal(audio.loops.size, 0);
    assert.equal(
      sources.filter((s) => s.buffer === audio.buffers.get('wingFlap')).length,
      count,
    );
    host.document.hidden = false;
  }
  const source = start();
  p.dispose();
  assert.equal(source.stopped, true, 'Disposal releases audio resources');
  assert.equal(audio.loops.size, 0);
});

test('flight uses thirty percent volume without affecting other audio', async () => {
  const host = new EventTarget();
  const { audio, context, sources } = mockAudio({
    sounds: SOUND_EFFECTS,
    host,
    state: 'suspended',
  });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  p.find('player').body.enabled = false;
  p.command('flap');
  p.step(0.02);
  assert.equal(sources.length, 0);
  host.dispatchEvent(new Event('pointerdown'));
  p.step(0.02);
  const wing = audio.loops.get('wingFlap');
  assert.ok(wing.started);
  assert.equal(audio.output.gain.value, 0.6);
  assert.equal(
    wing.output.gain.value,
    0.3,
    'Flight gain is thirty percent of the initial level',
  );
  for (let i = 0; i < 8; i++) audio.play('crunch');
  assert.equal(sources.at(-1).output, audio.output, 'Crunch uses the unchanged master output');
  assert.equal(wing.stopped, false);
  assert.equal(audio.voices.size, 4);
  assert.equal(audio.loops.get('wingFlap'), wing);
  context.state = 'suspended';
  p.step(0.02);
  assert.equal(wing.stopped, false);
  assert.equal(audio.repeatRequests.size, 0);
  wing.end();
  assert.equal(audio.loops.size, 0);
  p.dispose();
});

test('a surviving helmet or lightning-suit impact squawks once; protected repeats are silent', async () => {
  for (const [cause, armor] of [
    ['hawk', 'helmet'],
    ['fish', 'helmet'],
    ['storm', 'suit'],
  ]) {
    const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
    const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
    await p.load();
    p.command('restart');
    p.step(0);
    const bird = p.find('player');
    const combat = p.get('rules').rules.find((rule) => rule instanceof CombatRule);
    bird.equip(armor);
    combat.hit(bird, cause);
    p.dispatchEvents();
    assert.equal(bird.alive, true);
    assert.equal(bird.equipment.has(armor), false);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].buffer, audio.buffers.get('hurt'));
    assert.equal(sources[0].loop, undefined);
    assert.equal(sources[0].offset, 0);
    combat.hit(bird, cause);
    p.dispatchEvents();
    assert.equal(sources.length, 1, 'Protection cannot produce a second squawk');
    p.dispose();
  }
});

test('predator and lightning misses never hurt-squawk; real armored contacts do', async () => {
  for (const tag of ['hawk', 'shark']) {
    const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
    const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
    await p.load();
    p.command('restart');
    p.step(0);
    const hurtCount = () =>
      sources.filter((source) => source.buffer === audio.buffers.get('hurt')).length;
    const bird = p.find('player'),
      enemy = p.find(tag),
      viewport = p.get('viewport');
    bird.equip('helmet');
    const y = tag === 'hawk' ? viewport.highY - 20 : viewport.dangerY + 20;
    p.physics.place(bird, 150, y);
    p.physics.place(enemy, 350, y);
    enemy.locked = false;
    if (tag === 'hawk') enemy.attack(bird);
    p.step(0);
    assert.equal(hurtCount(), 0);
    assert.equal(bird.helmet, true);
    p.physics.place(enemy, bird.x, bird.y);
    p.step(0);
    assert.equal(bird.alive, true);
    assert.equal(bird.helmet, false);
    assert.equal(hurtCount(), 1);
    assert.ok(sources.some((source) => source.buffer === audio.buffers.get('hurt')));
    p.step(0);
    assert.equal(hurtCount(), 1);
    p.dispose();
  }
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  const bird = p.find('player');
  bird.equip('suit');
  p.add(
    new LightningBolt({
      points: [
        [0, 0],
        [40, 0],
      ],
      cloud: null,
    }),
  );
  p.flush();
  p.step(0);
  assert.equal(sources.length, 0);
  assert.equal(bird.suit, true);
  p.add(
    new LightningBolt({
      points: [
        [bird.x - 20, bird.y],
        [bird.x + 20, bird.y],
      ],
      cloud: null,
    }),
  );
  p.flush();
  p.step(0);
  assert.equal(sources.length, 1);
  assert.equal(bird.alive, true);
  assert.equal(bird.suit, false);
  p.step(0);
  assert.equal(sources.length, 1);
  p.dispose();
});

test('lethal impacts, wrong armor and drowning do not play the surviving-hit sound', async () => {
  for (const [cause, armor] of [
    ['hawk', null],
    ['fish', 'suit'],
    ['storm', 'helmet'],
    ['drown', 'helmet'],
  ]) {
    const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
    const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
    await p.load();
    p.command('restart');
    p.step(0);
    const bird = p.find('player');
    if (armor) bird.equip(armor);
    const combat = p.get('rules').rules.find((rule) => rule instanceof CombatRule);
    combat.hit(bird, cause);
    p.dispatchEvents();
    assert.equal(bird.alive, false);
    assert.equal(sources.filter((s) => s.buffer === audio.buffers.get('hurt')).length, 0);
    p.dispose();
  }
});

test('rainbow mode starts one continuous source and refreshing boost never stacks or rewinds it', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  const bird = p.find('player');
  bird.body.enabled = false;
  const pick = () => {
    p.add(new Firefly({ x: bird.x + bird.r * 1.6, y: bird.y, rainbow: true }));
    p.flush();
    p.step(0);
  };
  assert.equal(audio.rainbowPlayback, null);
  pick();
  const first = audio.rainbowPlayback.source;
  assert.equal(first.buffer, audio.buffers.get('rainbow'));
  assert.equal(first.loop, true);
  assert.equal(first.offset, 0);
  bird.status.apply('boost', 1);
  pick();
  assert.equal(audio.rainbowPlayback.source, first);
  assert.ok(bird.status.remaining('boost') > 7.9);
  assert.equal(sources.filter((s) => s.buffer === audio.buffers.get('rainbow')).length, 1);
  for (let i = 0; i < 8; i++) audio.play('crunch');
  assert.equal(first.stopped, false, 'Pickup voice limit cannot stop the rainbow track');
  bird.status.apply('boost', 0.01);
  p.step(0.02);
  assert.equal(first.stopped, true);
  assert.equal(audio.rainbowPlayback, null);
  p.dispose();
});

test('rainbow pauses and resumes its position, then clears on death, restart and disposal', async () => {
  const host = new EventTarget();
  host.document = new EventTarget();
  const { audio, context } = mockAudio({ sounds: SOUND_EFFECTS, host });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  audio.buffers.get('rainbow').duration = 8;
  p.command('restart');
  p.step(0);
  const bird = p.find('player');
  bird.body.enabled = false;
  bird.emitRainbow(8);
  p.step(0);
  const first = audio.rainbowPlayback.source;
  context.currentTime = 2.25;
  p.command('pause');
  p.step(0);
  assert.equal(first.stopped, true);
  assert.equal(audio.rainbowPlayback.source, null);
  assert.equal(audio.rainbowPlayback.offset, 2.25);
  const remaining = bird.status.remaining('boost');
  p.step(10);
  assert.equal(bird.status.remaining('boost'), remaining);
  p.command('pause');
  p.step(0);
  const second = audio.rainbowPlayback.source;
  assert.equal(second.offset, 2.25);
  assert.notEqual(second, first);
  context.currentTime = 3;
  host.document.hidden = true;
  host.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(second.stopped, true);
  assert.equal(audio.rainbowPlayback.offset, 3);
  p.step(0);
  assert.equal(audio.rainbowPlayback.source, null);
  host.document.hidden = false;
  p.step(0);
  assert.equal(audio.rainbowPlayback.source.offset, 3);
  const third = audio.rainbowPlayback.source;
  bird.die('drown');
  p.dispatchEvents();
  assert.equal(third.stopped, true);
  assert.equal(audio.rainbowPlayback, null);
  p.command('restart');
  p.step(0);
  bird.emitRainbow(8);
  p.step(0);
  assert.equal(audio.rainbowPlayback.source.offset, 0);
  const fourth = audio.rainbowPlayback.source;
  p.command('restart');
  p.step(0);
  assert.equal(fourth.stopped, true);
  assert.equal(audio.rainbowPlayback, null);
  bird.emitRainbow(8);
  p.step(0);
  const fifth = audio.rainbowPlayback.source;
  p.stop();
  assert.equal(fifth.stopped, true);
  assert.equal(audio.rainbowPlayback.source, null);
  p.step(0);
  const sixth = audio.rainbowPlayback.source;
  p.dispose();
  assert.equal(sixth.stopped, true);
  assert.equal(audio.rainbowPlayback, null);
});

test('rainbow obeys gesture unlock and missing recordings never affect boost gameplay', async () => {
  const host = new EventTarget();
  const { audio } = mockAudio({ host, state: 'suspended', sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  p.find('player').emitRainbow(8);
  p.step(0);
  assert.equal(audio.rainbowPlayback, null);
  host.dispatchEvent(new Event('pointerdown'));
  p.step(0);
  assert.ok(audio.rainbowPlayback.source.started);
  audio.stopRainbow();
  audio.buffers.delete('rainbow');
  p.step(0.02);
  assert.equal(audio.rainbowPlayback, null);
  assert.ok(p.find('player').status.has('boost'));
  p.dispose();
});

test('hawk strike sounds once per dive, never for patrol, rejected attacks or shark attacks', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  const bird = p.find('player'),
    hawk = p.find('hawk'),
    shark = p.find('shark');
  const strikeCount = () =>
    sources.filter((source) => source.buffer === audio.buffers.get('hawkStrike')).length;
  assert.equal(hawk.attack(bird), false);
  p.dispatchEvents();
  assert.equal(strikeCount(), 0);
  hawk.respawn();
  p.physics.place(hawk, 350, 100);
  assert.equal(hawk.mode, 'patrol');
  assert.equal(strikeCount(), 0);
  assert.equal(hawk.attack(bird), true);
  p.dispatchEvents();
  assert.equal(strikeCount(), 1);
  assert.equal(hawk.mode, 'dive');
  assert.equal(sources.at(-1).offset, 0);
  assert.equal(hawk.attack(bird), false);
  p.dispatchEvents();
  p.step(0.01);
  p.step(0.01);
  assert.equal(strikeCount(), 1, 'Diving frames do not retrigger the sound');
  hawk.returnToPatrol();
  hawk.stunTime = 1;
  assert.equal(hawk.attack(bird), false);
  p.dispatchEvents();
  assert.equal(strikeCount(), 1);
  hawk.stunTime = 0;
  assert.equal(hawk.attack(bird), true);
  p.dispatchEvents();
  assert.equal(strikeCount(), 2);
  p.emit('attack-started', { attacker: shark, target: bird });
  p.dispatchEvents();
  assert.equal(strikeCount(), 2);
  p.dispose();
});

test('laser plays once per accepted shot at hawk or shark, never again on impact', async () => {
  for (const tag of ['hawk', 'shark']) {
    const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
    const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
    await p.load();
    p.command('restart');
    p.step(0);
    const bird = p.find('player'),
      target = p.find(tag);
    target.respawn();
    p.physics.place(target, 350, 100);
    bird.equip('gun');
    const gun = bird.equipment.get('gun');
    assert.equal(gun.shoot(bird, target), true);
    p.dispatchEvents();
    p.flush();
    const laserCount = () =>
      sources.filter((s) => s.buffer === audio.buffers.get('laser')).length;
    assert.equal(laserCount(), 1);
    assert.equal(p.list('projectile').length, 1);
    assert.equal(gun.shoot(bird, target), false);
    p.dispatchEvents();
    assert.equal(laserCount(), 1);
    const projectile = p.list('projectile')[0];
    const weapon = p.get('rules').rules.find((rule) => rule instanceof WeaponRule);
    weapon.onContact({
      phase: 'enter',
      a: { group: 'projectile', owner: projectile },
      b: { group: 'enemy', owner: target },
    });
    p.dispatchEvents();
    assert.ok(target.gone > 0);
    assert.equal(laserCount(), 1);
    p.dispose();
    assert.equal(audio.voiceInfo.size, 0);
  }
});

test('shooting one hawk cuts only its strike, while another hawk and rainbow keep playing', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  const bird = p.find('player'),
    target = p.find('hawk');
  target.respawn();
  const other = p.add(new Hawk({ id: 'other-hawk' }));
  p.flush();
  other.respawn();
  p.physics.place(target, 350, 100);
  p.physics.place(other, 350, 200);
  target.attack(bird);
  other.attack(bird);
  p.dispatchEvents();
  const strikeFor = (owner) =>
    [...audio.voices].find(
      (s) =>
        audio.voiceInfo.get(s)?.name === 'hawkStrike' &&
        audio.voiceInfo.get(s)?.owner === owner,
    );
  const first = strikeFor(target),
    second = strikeFor(other);
  assert.ok(first && second);
  bird.emitRainbow(8);
  audio.syncRainbow();
  const rainbow = audio.rainbowPlayback.source;
  bird.equip('gun');
  bird.equipment.get('gun').shoot(bird, target);
  p.dispatchEvents();
  assert.equal(first.stopped, true);
  assert.equal(audio.voiceInfo.has(first), false);
  assert.equal(second.stopped, false);
  assert.equal(rainbow.stopped, false);
  assert.equal(sources.filter((s) => s.buffer === audio.buffers.get('laser')).length, 1);
  const laser = [...audio.voices].find((s) => s.buffer === audio.buffers.get('laser'));
  laser.end();
  assert.equal(audio.voiceInfo.has(laser), false);
  p.dispose();
});

test('invalid shot requests stay silent and an automatic gun response leaves no hawk-strike playing', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  const bird = p.find('player'),
    hawk = p.find('hawk');
  hawk.respawn();
  p.physics.place(hawk, 350, 100);
  hawk.gone = 1;
  p.emit('shot-requested', { shooter: bird, target: hawk });
  p.dispatchEvents();
  assert.equal(sources.length, 0);
  hawk.gone = 0;
  bird.equip('gun');
  hawk.attack(bird);
  p.dispatchEvents();
  assert.equal(sources.filter((s) => s.buffer === audio.buffers.get('laser')).length, 1);
  assert.equal(
    [...audio.voices].filter((s) => s.buffer === audio.buffers.get('hawkStrike')).length,
    0,
  );
  p.dispose();
});

test('thunder plays once when the cloud strikes, whether the bolt hits or misses', async () => {
  for (const outcome of ['miss', 'armored', 'lethal']) {
    const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
    const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
    await p.load();
    p.command('restart');
    p.step(0);
    const bird = p.find('player');
    bird.body.enabled = false;
    const cloud = p.add(new StormCloud({ x: bird.x, y: bird.y - 100 }));
    p.flush();
    cloud.beginCharge(bird);
    p.dispatchEvents();
    assert.equal(sources.length, 0, 'Charging is silent');
    if (outcome === 'miss') p.physics.place(bird, bird.x + 250, bird.y);
    if (outcome === 'armored') bird.equip('suit');
    cloud.strike();
    p.dispatchEvents();
    p.flush();
    p.step(0);
    const count = (name) => sources.filter((s) => s.buffer === audio.buffers.get(name)).length;
    assert.equal(count('thunder'), 1);
    assert.equal(count('hurt'), outcome === 'armored' ? 1 : 0);
    assert.equal(bird.alive, outcome !== 'lethal');
    p.step(0.02);
    p.step(0.02);
    p.dispatchEvents();
    assert.equal(count('thunder'), 1, 'Visible bolt frames must not retrigger');
    p.dispose();
  }
});

test('fish strike plays once at the leap transition, never during patrol, charge or repeated leap frames', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  const bird = p.find('player'),
    fish = p.find('shark'),
    v = p.get('viewport');
  bird.body.enabled = false;
  fish.respawn();
  const count = () =>
    sources.filter((s) => s.buffer === audio.buffers.get('fishStrike')).length;
  p.step(0);
  assert.equal(count(), 0);
  p.physics.place(bird, 150, v.waterY - 60);
  fish.charge(bird);
  p.dispatchEvents();
  assert.equal(count(), 0);
  p.physics.place(fish, bird.x, v.waterY + fish.size * 0.25);
  p.step(0);
  assert.equal(fish.mode, 'leap');
  assert.equal(count(), 1);
  const first = sources.find((s) => s.buffer === audio.buffers.get('fishStrike'));
  assert.equal(first.offset, 0);
  fish.leap(fish.vx, fish.vy);
  p.dispatchEvents();
  p.step(0);
  p.step(0);
  assert.equal(count(), 1);
  fish.recover();
  p.dispatchEvents();
  assert.equal(count(), 1);
  fish.leap(200, -400);
  p.dispatchEvents();
  assert.equal(count(), 2, 'A new leap gets one new sound');
  p.dispose();
});

test('each successful water bounce splishes once, while drowning and underwater motion do not', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  const bird = p.find('player'),
    v = p.get('viewport');
  const count = () =>
    sources.filter((s) => s.buffer === audio.buffers.get('waterBounce')).length;
  for (let contact = 1; contact <= 4; contact++) {
    p.physics.place(bird, 144, v.waterY - bird.r * 0.55 - 0.1);
    bird.vy = 200;
    p.step(0.01);
    assert.equal(count(), Math.min(contact, 3));
    if (contact < 4) {
      assert.equal(bird.alive, true);
      assert.ok(bird.vy < 0);
      assert.equal(bird.skips, 3 - contact);
      p.step(0.01);
      assert.equal(count(), contact);
    }
  }
  assert.equal(bird.alive, false);
  p.step(0.02);
  assert.equal(count(), 3);
  p.dispose();
});

test('drowning plays the sinking recording once despite repeated drown events and underwater frames', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  p.command('restart');
  p.step(0);
  const bird = p.find('player'),
    v = p.get('viewport');
  const sinking = () => sources.filter((s) => s.buffer === audio.buffers.get('sinking'));
  bird.skips = 0;
  p.physics.place(bird, 144, v.waterY - bird.r * 0.55 - 0.1);
  bird.vy = 200;
  p.step(0.01);
  assert.equal(bird.alive, false);
  assert.equal(sinking().length, 1);
  p.emit('drown', { bird });
  p.emit('drown', { bird });
  p.step(0.02);
  p.physics.place(bird, 144, v.waterY + bird.r * 2);
  p.step(0.02);
  assert.equal(sinking().length, 1);
  const source = sinking()[0];
  assert.ok(!source.loop);
  source.end();
  assert.ok(source.disconnected);
  assert.ok(!audio.voices.has(source));
  p.command('restart');
  p.step(0);
  bird.die('hawk');
  p.step(0);
  assert.equal(sinking().length, 1, 'Other deaths do not play the sinking sound');
  p.dispose();
});

test('balloon and gift-box contacts pop once, including overlapping colliders; removal and dead birds stay silent', async () => {
  const { audio, sources } = mockAudio({ sounds: SOUND_EFFECTS });
  const p = createGame({ assets: new AssetStore({ loader: async () => [] }), audio });
  await p.load();
  const count = () =>
    sources.filter((s) => s.buffer === audio.buffers.get('balloonPop')).length;
  for (const part of ['balloon', 'box', 'both']) {
    p.command('restart');
    p.step(0);
    const bird = p.find('player');
    if (part === 'both') bird.r = 60;
    const y =
      part === 'balloon'
        ? bird.y + bird.r * 1.25 * 1.6
        : part === 'box'
          ? bird.y - bird.r * 1.25 * 1.3
          : bird.y;
    const gift = new BalloonGift({ x: bird.x, y, suit: true });
    p.add(gift);
    p.flush();
    const before = count();
    p.step(0);
    assert.equal(gift.popped, true, part);
    assert.equal(count(), before + 1, part);
    assert.equal(gift.pop(), false);
    p.step(0);
    assert.equal(count(), before + 1);
  }
  const before = count();
  p.command('restart');
  p.step(0);
  const bird = p.find('player');
  bird.die('hawk');
  p.dispatchEvents();
  p.add(new BalloonGift({ x: bird.x, y: bird.y }));
  p.add(new BalloonGift({ x: -100, y: bird.y }));
  p.flush();
  p.step(0);
  assert.equal(count(), before);
  const source = sources.find((s) => s.buffer === audio.buffers.get('balloonPop'));
  assert.ok(!source.loop);
  source.end();
  assert.ok(source.disconnected);
  assert.ok(!audio.voices.has(source));
  p.dispose();
});
