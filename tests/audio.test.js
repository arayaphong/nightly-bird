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
        connect() {},
        start(when, offset) {
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
    assert.equal(sources.at(-1).offset, SOUND_EFFECTS.crunch.offset);
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

test('configured crunch starts within 15 ms of its audible bite instead of after chewing ends', async () => {
  const bytes = await readFile(SOUND_EFFECTS.crunch.url);
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
  const firstFrame = Math.floor(SOUND_EFFECTS.crunch.offset * rate);
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
