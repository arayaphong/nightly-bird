export function hslRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  const f = (n) => {
    const k = (n + h * 12) % 12,
      a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return f(0) + ',' + f(8) + ',' + f(4);
}
export const darken = (hex, a) => {
  const n = parseInt(hex.slice(1), 16),
    m = (c, d) => Math.round(c + (d - c) * a);
  return `rgb(${m(n >> 16, 18)},${m((n >> 8) & 255, 13)},${m(n & 255, 10)})`;
};
