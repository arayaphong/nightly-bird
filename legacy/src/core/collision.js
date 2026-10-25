import { segDist } from '../math/geometry.js';

function circleHit(a, b) {
  const radius = a.radius + b.radius;
  if (Math.hypot(a.x - b.x, a.y - b.y) <= radius) return true;
  if (!a.swept && !b.swept) return false;
  // Relative motion catches two moving circles crossing between frames.
  return (
    segDist(
      0,
      0,
      [
        (a.previous?.x ?? a.x) - (b.previous?.x ?? b.x),
        (a.previous?.y ?? a.y) - (b.previous?.y ?? b.y),
      ],
      [a.x - b.x, a.y - b.y],
    ) <= radius
  );
}
function intersects(a, b) {
  if (a.shape === 'circle' && b.shape === 'circle') return circleHit(a, b);
  if (a.shape === 'polyline') [a, b] = [b, a];
  if (a.shape === 'circle' && b.shape === 'polyline')
    return b.points.some(
      (point, index) =>
        index > 0 &&
        segDist(a.x, a.y, b.points[index - 1], point) <= a.radius + (b.radius ?? 0),
    );
  return false;
}

export class CollisionSystem {
  constructor() {
    this.previous = new Map();
  }
  reset() {
    this.previous.clear();
  }
  detect(objects) {
    const parts = objects
      .filter((o) => o.ready && !o.removing)
      .flatMap((owner) => (owner.getColliders?.() ?? []).map((part) => ({ ...part, owner })));
    const current = new Map();
    const contacts = [];
    for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i],
          b = parts[j];
        if (a.owner === b.owner || !a.mask.includes(b.group) || !b.mask.includes(a.group))
          continue;
        if (!intersects(a, b)) continue;
        const key = [`${a.owner.id}:${a.name}`, `${b.owner.id}:${b.name}`].sort().join('|');
        const contact = { a, b, phase: this.previous.has(key) ? 'stay' : 'enter', key };
        current.set(key, contact);
        contacts.push(contact);
      }
    for (const [key, contact] of this.previous)
      if (!current.has(key)) contacts.push({ ...contact, phase: 'exit' });
    this.previous = current;
    return contacts.sort(
      (a, b) =>
        Math.max(a.a.priority ?? 0, a.b.priority ?? 0) -
          Math.max(b.a.priority ?? 0, b.b.priority ?? 0) || a.key.localeCompare(b.key),
    );
  }
}

export function circle(owner, name, group, mask, radius, { dx = 0, dy = 0, ...options } = {}) {
  return {
    shape: 'circle',
    name,
    group,
    mask,
    radius,
    x: owner.x + dx,
    y: owner.y + dy,
    previous: { x: owner.body.previous.x + dx, y: owner.body.previous.y + dy },
    ...options,
  };
}
