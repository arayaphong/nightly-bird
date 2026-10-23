import { PlatformObject } from '../core/object.js';
import { SOUND_VOLUMES } from '../config/audio.js';

/** Optional sound output. Simulation emits events and never waits for audio playback. */
export class AudioSystem extends PlatformObject {
  constructor({
    host = null,
    sounds = {},
    events = {},
    contextFactory = () => {
      const Context = host?.AudioContext ?? host?.webkitAudioContext;
      return Context ? new Context({ latencyHint: 'interactive' }) : null;
    },
    fetcher = (url) => fetch(url),
    volume = 0.6,
    maxVoices = 4,
    volumes = SOUND_VOLUMES,
  } = {}) {
    super({ id: 'audio' });
    Object.assign(this, { host, sounds, events, contextFactory, fetcher, volume, maxVoices });
    this.volumes = volumes;
    this.soundOutputs = new Map();
    this.repeatRequests = new Set();
    this.buffers = new Map();
    this.voices = new Set();
    this.loops = new Map();
    this.rainbowPlayback = null;
    this.onVisibilityChange = () => {
      if (this.host?.document?.hidden) {
        this.finishRepeats();
        this.stopRainbow(false);
      }
    };
    this.errors = [];
    this.disposed = false;
    this.unlock = () => {
      if (!this.context || this.context.state === 'closed' || this.context.state === 'running')
        return;
      // Called directly inside a trusted pointer/keyboard gesture for mobile autoplay policies.
      try {
        this.context.resume().catch(() => {});
      } catch {
        /* Audio is optional. */
      }
    };
  }

  async load() {
    try {
      this.context ??= this.contextFactory();
      if (!this.context) return;
      if (!this.output) {
        this.output = this.context.createGain();
        this.output.gain.value = this.volume;
        this.output.connect(this.context.destination);
      }
      await Promise.all(
        Object.entries(this.sounds).map(async ([name, url]) => {
          if (this.buffers.has(name)) return;
          try {
            const response = await this.fetcher(url);
            if (!response.ok)
              throw new Error(`Sound load failed (${response.status}): ${name}`);
            const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
            if (!this.disposed) this.buffers.set(name, buffer);
          } catch (error) {
            this.errors.push({ name, error });
          }
        }),
      );
    } catch (error) {
      this.errors.push({ error });
    }
  }

  attach(platform) {
    super.attach(platform);
    if (!this.context) return;
    this.host?.addEventListener('pointerdown', this.unlock, true);
    this.host?.addEventListener('keydown', this.unlock, true);
    this.host?.document?.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  event(event) {
    if (event.type === 'bird-died') this.stopRainbow();
    const sound = this.events[event.type];
    if (sound) this.play(sound);
  }

  play(name) {
    const buffer = this.buffers.get(name);
    if (this.disposed || !buffer || this.context?.state !== 'running') return false;
    let source;
    try {
      // Separate sources allow nearby pickups to sound without seeking/reloading a shared element.
      if (this.voices.size >= this.maxVoices)
        this.stopVoice(this.voices.values().next().value);
      source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputFor(name));
      source.onended = () => {
        this.voices.delete(source);
        source.disconnect();
      };
      this.voices.add(source);
      source.start();
      return true;
    } catch {
      if (source) this.stopVoice(source);
      return false;
    }
  }

  outputFor(name) {
    if (this.volumes[name] === undefined) return this.output;
    if (!this.soundOutputs.has(name)) {
      const output = this.context.createGain();
      output.gain.value = this.volumes[name];
      output.connect(this.output);
      this.soundOutputs.set(name, output);
    }
    return this.soundOutputs.get(name);
  }

  wingRequested() {
    const bird = this.platform?.find('player');
    return !!(
      bird?.alive &&
      bird.animation.wingSoundRequested &&
      !this.platform.clock.paused &&
      !this.host?.document?.hidden
    );
  }

  afterFrame() {
    this.setLoop('wingFlap', this.wingRequested());
    this.syncRainbow();
  }

  syncRainbow() {
    const bird = this.platform?.find('player');
    if (!bird?.alive || !bird.status.has('boost')) {
      this.stopRainbow();
      return;
    }
    if (
      this.platform.clock.paused ||
      this.host?.document?.hidden ||
      this.context?.state !== 'running'
    ) {
      this.stopRainbow(false);
      return;
    }
    const buffer = this.buffers.get('rainbow');
    if (this.disposed || !buffer || this.rainbowPlayback?.source) return;
    const playback = (this.rainbowPlayback ??= { offset: 0, source: null, startedAt: 0 });
    let source;
    try {
      source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.outputFor('rainbow'));
      playback.source = source;
      playback.startedAt = this.context.currentTime ?? 0;
      source.start(0, playback.offset % buffer.duration);
    } catch {
      if (source) this.stopVoice(source);
      playback.source = null;
    }
  }

  stopRainbow(reset = true) {
    const playback = this.rainbowPlayback;
    if (playback?.source) {
      const duration = playback.source.buffer.duration;
      playback.offset =
        (playback.offset + Math.max(0, (this.context.currentTime ?? 0) - playback.startedAt)) %
        duration;
      this.stopVoice(playback.source);
      playback.source = null;
    }
    if (reset) this.rainbowPlayback = null;
  }

  setLoop(name, active) {
    if (active && !this.disposed && this.context?.state === 'running')
      this.repeatRequests.add(name);
    else this.repeatRequests.delete(name);
    // An in-flight recording always finishes naturally. Renewed requests reuse it.
    if (this.loops.has(name)) return true;
    if (!this.repeatRequests.has(name)) return false;
    return this.startRound(name);
  }

  startRound(name) {
    const buffer = this.buffers.get(name);
    if (this.disposed || !buffer || this.context?.state !== 'running') return false;
    let source;
    try {
      source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = false;
      source.connect(this.outputFor(name));
      source.onended = () => {
        source.onended = null;
        source.disconnect();
        if (this.loops.get(name) !== source) return;
        this.loops.delete(name);
        // Recheck live state: a hidden tab or paused game must not start a new round.
        if (this.repeatRequests.has(name) && (name !== 'wingFlap' || this.wingRequested()))
          this.startRound(name);
      };
      this.loops.set(name, source);
      source.start();
      return true;
    } catch {
      if (source) {
        if (this.loops.get(name) === source) this.loops.delete(name);
        this.stopVoice(source);
      }
      return false;
    }
  }

  finishRepeats() {
    this.repeatRequests.clear();
  }

  onStop() {
    this.finishRepeats();
    this.stopRainbow(false);
  }

  stopVoice(source) {
    source.onended = null;
    try {
      source.stop();
    } catch {
      /* Already ended. */
    }
    source.disconnect();
    this.voices.delete(source);
  }

  stop() {
    this.stopRainbow();
    for (const source of this.voices) this.stopVoice(source);
    this.finishRepeats();
    for (const [name, source] of this.loops) {
      this.loops.delete(name);
      this.stopVoice(source);
    }
  }

  detach() {
    this.host?.removeEventListener('pointerdown', this.unlock, true);
    this.host?.removeEventListener('keydown', this.unlock, true);
    this.host?.document?.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.stop();
    super.detach();
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.buffers.clear();
    for (const output of this.soundOutputs.values()) output.disconnect();
    this.soundOutputs.clear();
    this.output?.disconnect();
    try {
      this.context?.close().catch(() => {});
    } catch {
      /* Already closed. */
    }
  }
}
