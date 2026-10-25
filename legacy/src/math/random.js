/** An injectable stream; visual draws never consume the gameplay stream. */
export function randomStream(seed = Math.floor(Math.random() * 0x100000000)) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}
