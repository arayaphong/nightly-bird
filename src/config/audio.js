export const SOUND_EFFECTS = {
  rainbow: new URL('../../assets/audio/rainbow.wav', import.meta.url),
  hurt: new URL('../../assets/audio/bird-hurt.wav', import.meta.url),
  wingFlap: new URL('../../assets/audio/wing-flap.wav?v=2c87ebec', import.meta.url),
  // Identify the trimmed asset so cached copies of the old recording are not reused.
  crunch: new URL('../../assets/audio/crunch.wav?v=7caaaa09', import.meta.url),
};

// Relative to the existing master volume; crunch remains unchanged.
export const SOUND_VOLUMES = { wingFlap: 0.3 };

export const SOUND_EVENTS = {
  'firefly-eaten': 'crunch',
  'bird-armor-hit': 'hurt',
};
