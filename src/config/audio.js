export const SOUND_EFFECTS = {
  wingFlap: new URL('../../assets/audio/wing-flap.wav?v=2c87ebec', import.meta.url),
  // Identify the trimmed asset so cached copies of the old recording are not reused.
  crunch: new URL('../../assets/audio/crunch.wav?v=7caaaa09', import.meta.url),
};

// Relative to the existing master volume; crunch remains unchanged.
export const SOUND_VOLUMES = { wingFlap: 0.3 };
