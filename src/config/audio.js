export const SOUND_EFFECTS = {
  crunch: {
    url: new URL('../../assets/audio/crunch.wav', import.meta.url),
    // The audible bite starts near 0.641 s; keep a short lead-in before that transient.
    offset: 0.635,
  },
};
