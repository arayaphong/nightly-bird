import { PlatformObject } from '../core/object.js';

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
  } = {}) {
    super({ id: 'audio' });
    Object.assign(this, { host, sounds, events, contextFactory, fetcher, volume, maxVoices });
    this.buffers = new Map();
    this.voices = new Set();
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
  }

  event(event) {
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
      source.connect(this.output);
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
    for (const source of this.voices) this.stopVoice(source);
  }

  detach() {
    this.host?.removeEventListener('pointerdown', this.unlock, true);
    this.host?.removeEventListener('keydown', this.unlock, true);
    this.stop();
    super.detach();
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.buffers.clear();
    this.output?.disconnect();
    try {
      this.context?.close().catch(() => {});
    } catch {
      /* Already closed. */
    }
  }
}
