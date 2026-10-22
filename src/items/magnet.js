import { bird, items, session, viewport } from '../game/state.js';
export function magnetR() {
  return Math.min(viewport.width, viewport.height) * 0.2;
} // pull radius: 20% of the screen
export function magnetPull(o, tx, ty, dt) {
  // drag an object toward (tx,ty); stronger the closer it gets
  if (!(items.magnetTime > 0) || !bird.alive || session.phase !== 'play') return false;
  const dx = tx - o.x,
    dy = ty - o.y,
    d = Math.hypot(dx, dy),
    R = magnetR();
  if (d > R || d < 1) return false;
  const v = (220 + 520 * (1 - d / R)) * dt,
    k = Math.min(1, v / d);
  o.x += dx * k;
  o.y += dy * k;
  o.pulled = true;
  return true;
}
export function clearMagnetTargets() {
  for (const item of [...items.fireflies, ...items.gifts]) item.pulled = false;
}
