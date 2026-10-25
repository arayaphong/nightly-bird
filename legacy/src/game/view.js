/** Read adapters for the existing artwork routines. Every value comes from its owning object. */
export function createGameView(platform, owner = null) {
  const bird = owner?.tags.has('player')
    ? owner
    : (owner?.eater ?? owner?.target ?? platform.find('player'));
  const effects = platform.get('effects');
  const enemies = {
    get fish() {
      return owner?.tags.has('shark') ? owner : platform.find('shark');
    },
    get hawk() {
      return owner?.tags.has('hawk') ? owner : platform.find('hawk');
    },
  };
  const items = {
    get fireflies() {
      return owner?.tags.has('firefly') ? [owner] : platform.list('firefly');
    },
    get gifts() {
      return owner?.tags.has('gift') ? [owner] : platform.list('gift');
    },
    get bullets() {
      return owner?.tags.has('projectile') ? [owner] : platform.list('projectile');
    },
    get magnetTime() {
      return bird.status.remaining('magnet');
    },
    get boostTime() {
      return bird.status.remaining('boost');
    },
  };
  const world = {
    get stars() {
      return platform.get('sky').stars;
    },
    get wind() {
      return platform.get('wind');
    },
    get windParticles() {
      return platform.get('wind').particles;
    },
    get clouds() {
      return owner?.tags.has('cloud') ? [owner] : platform.list('cloud');
    },
  };
  const effectView =
    owner?.tags.has('corpse') || owner?.tags.has('player') ? Object.create(effects) : effects;
  if (owner?.tags.has('corpse'))
    Object.defineProperty(effectView, 'fishCorpse', { value: owner });
  if (owner?.tags.has('player'))
    Object.defineProperty(effectView, 'jet', { get: () => owner.rainbow.points });
  return {
    bird,
    effects: effectView,
    enemies,
    items,
    world,
    session: platform.get('session'),
    viewport: platform.get('viewport'),
  };
}
