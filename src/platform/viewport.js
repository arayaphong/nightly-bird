import { bird, session, viewport, world } from '../game/state.js';
import { cv, cx } from './canvas.js';
export function resize() {
  viewport.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  viewport.width = innerWidth;
  viewport.height = innerHeight;
  cv.width = viewport.width * viewport.pixelRatio;
  cv.height = viewport.height * viewport.pixelRatio;
  cx.setTransform(viewport.pixelRatio, 0, 0, viewport.pixelRatio, 0, 0);
  viewport.waterY = viewport.height * 0.8;
  viewport.highY = viewport.height * 0.3;
  viewport.dangerY = viewport.waterY - Math.max(46, viewport.height * 0.085);
  bird.x = Math.min(viewport.width * 0.3, 180);
  bird.r = Math.max(12, Math.min(viewport.width, viewport.height) * 0.032);
  world.stars = [];
  const layers = [
    {
      n: 90,
      s: 0.06,
      r: [0.4, 1],
    },
    {
      n: 45,
      s: 0.16,
      r: [0.8, 1.5],
    },
    {
      n: 18,
      s: 0.34,
      r: [1.3, 2.2],
    },
  ];
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n * (viewport.width / 500 + 0.4); i++)
      world.stars.push({
        x: Math.random() * viewport.width,
        y: Math.random() * (viewport.waterY - 20),
        r: L.r[0] + Math.random() * (L.r[1] - L.r[0]),
        s: L.s,
        ph: Math.random() * 6.28,
        tw: 1 + Math.random() * 3,
        l: li,
        hue: Math.random() < 0.15 ? (Math.random() < 0.5 ? '#ffd9a8' : '#bcd4ff') : '#fff',
      });
  });
  if (session.phase !== 'play') bird.y = viewport.height * 0.42;
}
