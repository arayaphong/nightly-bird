// SVG files are the source of truth for shapes, paint, and animation pivots.
// Decode each layer once; the render loop only draws cached images.
const files = {
  bird: ['characters/bird.svg', true],
  birdEating: ['characters/bird-eating.svg'],
  fish: ['characters/fish.svg', true],
  hawk: ['characters/hawk.svg'],
  hawkDive: ['characters/hawk-dive.svg'],
  suit: ['items/suit.svg'],
  helmet: ['items/helmet.svg'],
  gun: ['items/gun.svg'],
  magnet: ['items/magnet.svg'],
  gift: ['items/gift.svg'],
  balloon: ['items/balloon.svg'],
  firefly: ['items/firefly.svg'],
};

const namespace = 'http://www.w3.org/2000/svg';

async function decodeLayer(root, group, bounds, scorched) {
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('xmlns', namespace);
  svg.setAttribute('viewBox', bounds.join(' '));
  // Enough pixels for the supported game sizes, with bounded startup memory.
  const resolution = Math.min(3, 768 / Math.max(bounds[2], bounds[3]));
  svg.setAttribute('width', Math.max(1, Math.ceil(bounds[2] * resolution)));
  svg.setAttribute('height', Math.max(1, Math.ceil(bounds[3] * resolution)));
  const definitions = root.querySelector('defs');
  if (definitions) svg.append(definitions.cloneNode(true));
  const layer = group.cloneNode(true);
  layer.removeAttribute('transform');
  layer.removeAttribute('display');
  if (scorched) {
    for (const node of layer.querySelectorAll(
      '[data-scorched-fill], [data-scorched-stroke]',
    )) {
      for (const paint of ['fill', 'stroke']) {
        const value = node.getAttribute(`data-scorched-${paint}`);
        if (value) node.setAttribute(paint, value);
      }
    }
  }
  svg.append(layer);
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], {
      type: 'image/svg+xml',
    }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

class Sprite {
  constructor(group, bounds, image, scorched) {
    this.id = group.id;
    this.bounds = bounds;
    this.image = image;
    this.scorched = scorched;
    this.tints = new Map();
    for (const [key, value] of Object.entries(group.dataset)) {
      if (key !== 'sprite')
        this[key] = value !== '' && Number.isFinite(Number(value)) ? Number(value) : value;
    }
    const matrix = group.transform.baseVal.consolidate()?.matrix;
    this.x = matrix?.e || 0;
    this.y = matrix?.f || 0;
    this.angle = matrix ? Math.atan2(matrix.b, matrix.a) : 0;
  }

  tinted(color) {
    if (!this.tints.has(color)) {
      const canvas = document.createElement('canvas');
      canvas.width = this.image.width;
      canvas.height = this.image.height;
      const context = canvas.getContext('2d');
      context.drawImage(this.image, 0, 0);
      context.globalCompositeOperation = 'source-in';
      context.fillStyle = color;
      context.fillRect(0, 0, canvas.width, canvas.height);
      // Animated light colors use a small palette; also cap the cache on edits.
      if (this.tints.size >= 64) this.tints.delete(this.tints.keys().next().value);
      this.tints.set(color, canvas);
    }
    return this.tints.get(color);
  }

  draw(
    context,
    {
      x = this.x || 0,
      y = this.y || 0,
      angle = this.angle,
      scaleX = 1,
      scaleY = 1,
      scorched = false,
      color,
    } = {},
  ) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.scale(scaleX, scaleY);
    context.drawImage(
      color ? this.tinted(color) : scorched ? this.scorched : this.image,
      ...this.bounds,
    );
    context.restore();
  }
}

async function loadFile(file, hasScorched) {
  const url = new URL(`../../assets/svg/${file}`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`SVG load failed (${response.status}): ${file}`);
  const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg')
    throw new Error(`Invalid SVG: ${file}`);
  const root = document.importNode(doc.documentElement, true);
  const groups = [...root.querySelectorAll('[data-sprite]')];
  if (!groups.length) throw new Error(`No animation layers in SVG: ${file}`);
  for (const group of groups) group.removeAttribute('display');
  root.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none';
  root.setAttribute('aria-hidden', 'true');
  document.body.append(root);
  try {
    return await Promise.all(
      groups.map(async (group) => {
        const box = group.getBBox();
        const stroke = Math.max(
          0,
          ...[...group.querySelectorAll('[stroke-width]')].map((el) =>
            Number(el.getAttribute('stroke-width')),
          ),
        );
        const padding = Math.max(1, stroke / 2 + 1);
        const bounds = [
          box.x - padding,
          box.y - padding,
          box.width + padding * 2,
          box.height + padding * 2,
        ];
        const image = await decodeLayer(root, group, bounds, false);
        const scorched = hasScorched ? await decodeLayer(root, group, bounds, true) : image;
        return new Sprite(group, bounds, image, scorched);
      }),
    );
  } finally {
    root.remove();
  }
}

export class AssetStore {
  constructor({ loader = (name) => loadFile(...files[name]) } = {}) {
    this.loader = loader;
    this.cache = new Map();
    this.pending = new Map();
    this.disposed = false;
  }
  has(name) {
    return this.cache.has(name);
  }
  load(name) {
    if (this.disposed) return Promise.reject(new Error('AssetStore is disposed'));
    if (this.has(name)) return Promise.resolve(this.cache.get(name));
    if (!files[name]) return Promise.reject(new Error('Unknown asset: ' + name));
    if (!this.pending.has(name))
      this.pending.set(
        name,
        Promise.resolve()
          .then(() => this.loader(name))
          .then((value) => {
            if (!this.disposed) this.cache.set(name, value);
            return value;
          })
          .finally(() => this.pending.delete(name)),
      );
    return this.pending.get(name);
  }
  loadAll(names) {
    return Promise.all(names.map((name) => this.load(name)));
  }
  art(name) {
    if (!this.has(name)) throw new Error('SVG artwork is not loaded: ' + name);
    return this.cache.get(name);
  }
  sprite(name, id) {
    const part = this.art(name).find((p) => p.id === id);
    if (!part) throw new Error('Missing SVG layer: ' + name + '/' + id);
    return part;
  }
  dispose() {
    this.disposed = true;
    this.cache.clear();
  }
}
