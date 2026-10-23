import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Platform } from '../src/core/platform.js';
import { AudioSystem } from '../src/platform/audio-system.js';
import { AssetStore } from '../src/platform/asset-store.js';
import { createGame } from '../src/game/create-game.js';
import { Firefly } from '../src/objects/firefly.js';
import { BalloonGift } from '../src/objects/balloon-gift.js';
import { SOUND_EFFECTS } from '../src/config/audio.js';

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
    events: { 'firefly-eaten': 'crunch' },
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
  for (const rainbow of [false, true]) {
    add(new Firefly({ x: bird.x + bird.r * 1.6, y: bird.y, rainbow }));
    p.step(0);
    assert.ok(bird.animation.chewTime > 0);
    assert.equal(sources.at(-1).when, 0);
    assert.equal(sources.at(-1).offset, 0);
    p.step(0);
  }
  assert.equal(sources.length, 2);
  add(new BalloonGift({ x: bird.x, y: bird.y - bird.r * 1.25 * 1.3, suit: true }));
  p.step(0);
  assert.equal(sources.length, 2);
  bird.die('drown');
  p.dispatchEvents();
  add(new Firefly({ x: bird.x + bird.r * 1.6, y: bird.y }));
  p.step(0);
  assert.equal(sources.length, 2);
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
    const count = sources.length;
    action();
    assert.equal(source.stopped, false);
    assert.equal(audio.loops.get('wingFlap'), source);
    source.end();
    assert.equal(audio.loops.size, 0);
    assert.equal(sources.length, count);
    host.document.hidden = false;
  }
  const source = start();
  p.dispose();
  assert.equal(source.stopped, true, 'Disposal releases audio resources');
  assert.equal(audio.loops.size, 0);
});

test('flight is 40 percent quieter without affecting crunch, unlock or voice limits', async () => {
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
  assert.equal(wing.output.gain.value, 0.6, 'Flight gain is 60 percent of the previous level');
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
