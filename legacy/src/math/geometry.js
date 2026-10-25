export function segDist(px, py, a, b) {
  const vx = b[0] - a[0],
    vy = b[1] - a[1],
    l = vx * vx + vy * vy || 1,
    k = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / l));
  return Math.hypot(px - a[0] - vx * k, py - a[1] - vy * k);
}
