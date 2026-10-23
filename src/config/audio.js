export const SOUND_EFFECTS = {
  fishStrike: new URL('../../assets/audio/fish-strike.wav', import.meta.url),
  thunder: new URL('../../assets/audio/thunder.wav', import.meta.url),
  laser: new URL('../../assets/audio/laser-pew.wav', import.meta.url),
  hawkStrike: new URL('../../assets/audio/hawk-strike.wav', import.meta.url),
  rainbow: new URL('../../assets/audio/rainbow.wav', import.meta.url),
  hurt: new URL('../../assets/audio/bird-hurt.wav', import.meta.url),
  wingFlap: new URL('../../assets/audio/wing-flap.wav?v=2c87ebec', import.meta.url),
  // Identify the trimmed asset so cached copies of the old recording are not reused.
  crunch: new URL('../../assets/audio/crunch.wav?v=7caaaa09', import.meta.url),
};

// Relative to the existing master volume; crunch remains unchanged.
export const SOUND_VOLUMES = { wingFlap: 0.3 };

export const SOUND_EVENTS = {
  'fish-strike': 'fishStrike',
  'lightning-strike': 'thunder',
  'shot-fired': 'laser',
  'hawk-strike': 'hawkStrike',
  'firefly-eaten': 'crunch',
  'bird-armor-hit': 'hurt',
};
