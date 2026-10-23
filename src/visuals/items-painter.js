import { JET_BANDS, JET_LIFE } from '../config/animation.js';
import { hslRgb } from '../math/color.js';
export function createItemsPainter(view, cx, assets) {
  const { bird, effects, items, session } = view;
  const art = (name) => assets.art(name);
  const sprite = (name, id) => assets.sprite(name, id);
  const giftParts = (g) => g.parts();
  const magnetR = () => bird.magnet.radius;
  function drawGifts() {
    for (const g of items.gifts) {
      const p = giftParts(g),
        sway = Math.sin(session.time * 2 + g.ph) * 3;
      cx.strokeStyle = 'rgba(230,230,240,.7)';
      cx.lineWidth = 1;
      cx.beginPath();
      cx.moveTo(p.bx, p.by + p.br);
      cx.quadraticCurveTo(p.bx - 6 + sway, (p.by + p.cy) / 2, p.cx, p.cy - p.cs / 2);
      cx.stroke();
      const balloon = art('balloon').find((part) => part.color === g.col) || art('balloon')[0];
      balloon.draw(cx, {
        x: p.bx,
        y: p.by,
        scaleX: p.br,
        scaleY: p.br,
      });
      sprite('gift', 'gift').draw(cx, {
        x: p.cx,
        y: p.cy,
        angle: sway * 0.02,
        scaleX: p.cs / 24,
        scaleY: p.cs / 24,
      });
    }
  }
  function drawFlies() {
    // glow shifts back and forth between lime green and yellow; dark body + light trail so they never read as stars
    const mix = (a, b, m) => a.map((v, k) => Math.round(v + (b[k] - v) * m)).join(',');
    for (const f of items.fireflies) {
      if (f.eaten) continue;
      cx.save();
      const pulse = 0.6 + 0.4 * Math.sin(session.time * 5 + f.bl),
        R = 16 + 8 * pulse,
        m = 0.5 + 0.5 * Math.sin(session.time * 1.8 + f.ph);
      let core = mix([190, 255, 90], [255, 245, 120], m),
        mid = mix([110, 255, 30], [255, 220, 20], m),
        edge = mix([60, 220, 0], [240, 190, 0], m),
        lamp = mix([200, 255, 60], [255, 236, 60], m);
      const hue = session.time * 220 + f.ph * 60;
      if (f.rainbow) {
        core = hslRgb(hue, 1, 0.85);
        mid = hslRgb(hue, 1, 0.6);
        edge = hslRgb(hue + 120, 1, 0.55);
        lamp = hslRgb(hue, 1, 0.7);
      }
      if (f.tr)
        for (let k = 0; k < f.tr.length; k++) {
          const q = f.tr[k],
            a = k / f.tr.length;
          cx.fillStyle = `rgba(${f.rainbow ? hslRgb(hue - k * 36, 1, 0.6) : mid},${(f.rainbow ? 0.45 : 0.28) * a})`;
          cx.beginPath();
          cx.arc(q[0], q[1], (1 + 2.2 * a) * (f.rainbow ? 1.4 : 1), 0, 7);
          cx.fill();
        }
      const g = cx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
      g.addColorStop(0, `rgba(${core},${0.95 * pulse})`);
      g.addColorStop(0.3, `rgba(${mid},${0.55 * pulse})`);
      g.addColorStop(1, `rgba(${edge},0)`);
      cx.fillStyle = g;
      cx.beginPath();
      cx.arc(f.x, f.y, R, 0, 7);
      cx.fill();
      cx.strokeStyle = `rgba(${mid},${0.35 * pulse})`;
      cx.lineWidth = 1.2;
      cx.beginPath();
      cx.arc(f.x, f.y, R * 0.75, 0, 7);
      cx.stroke();
      const w = Math.sin(session.time * 40 + f.ph);
      sprite('firefly', 'wing-left').draw(cx, {
        x: f.x - 1,
        y: f.y - 4,
        scaleY: (1.6 + w) / 1.6,
      });
      sprite('firefly', 'wing-right').draw(cx, {
        x: f.x + 3,
        y: f.y - 4,
        scaleY: (1.6 - w) / 1.6,
      });
      sprite('firefly', 'head').draw(cx, {
        x: f.x,
        y: f.y,
      });
      const color =
        'rgb(' +
        lamp
          .split(',')
          .map((channel) => Math.min(255, Math.round(Number(channel) / 16) * 16))
          .join(',') +
        ')';
      cx.shadowColor = `rgb(${mid})`;
      cx.shadowBlur = 10 * pulse;
      sprite('firefly', 'lamp').draw(cx, {
        x: f.x,
        y: f.y,
        color,
      });
      cx.shadowBlur = 0;
      cx.restore();
    }
  }
  function drawMagnetField() {
    // faint pulsing rings showing the pull radius + pull lines to captured things
    if (!(items.magnetTime > 0) || !bird.alive || session.phase !== 'play') return;
    const R = magnetR(),
      fade = Math.min(1, items.magnetTime / 1.5);
    cx.save();
    for (let i = 0; i < 3; i++) {
      const ph = (session.time * 0.7 + i / 3) % 1,
        rr = R * (1 - ph);
      cx.strokeStyle = `rgba(255,120,120,${0.22 * ph * fade})`;
      cx.lineWidth = 2;
      cx.beginPath();
      cx.arc(bird.x, bird.y, rr, 0, 7);
      cx.stroke();
    }
    cx.setLineDash([3, 6]);
    cx.strokeStyle = `rgba(255,170,170,${0.45 * fade})`;
    cx.lineWidth = 1.2;
    for (const o of [...items.fireflies, ...items.gifts])
      if (o.pulled) {
        cx.beginPath();
        cx.moveTo(bird.x, bird.y);
        cx.lineTo(o.x, o.y);
        cx.stroke();
      }
    cx.restore();
  }
  function drawBoostTrail() {
    // rainbow ribbon that follows the bird's flight path, tapering and fading behind it
    const n = effects.jet.length;
    if (n < 2) return;
    const hw0 = bird.r * 0.5;
    const pts = effects.jet.map((q, j) => {
      const a = effects.jet[Math.max(0, j - 1)],
        b = effects.jet[Math.min(n - 1, j + 1)];
      let dx = b.x - a.x,
        dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = 1 - q.age / JET_LIFE;
      return {
        x: q.x,
        y: q.y,
        nx: -dy / d,
        ny: dx / d,
        hw: hw0 * (0.25 + 0.75 * k),
        al: k * q.f,
      };
    });
    cx.save();
    cx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < n - 1; j++) {
      const A = pts[j],
        B = pts[j + 1],
        al = (A.al + B.al) / 2;
      if (al <= 0.01) continue;
      for (let s = 0; s < JET_BANDS; s++) {
        const u0 = -1 + (2 * s) / JET_BANDS,
          u1 = -1 + (2 * (s + 1)) / JET_BANDS;
        cx.fillStyle = `rgba(${hslRgb(s * 55 + session.time * 200, 1, 0.6)},${0.8 * al})`;
        cx.beginPath();
        cx.moveTo(A.x + A.nx * A.hw * u0, A.y + A.ny * A.hw * u0);
        cx.lineTo(B.x + B.nx * B.hw * u0, B.y + B.ny * B.hw * u0);
        cx.lineTo(B.x + B.nx * B.hw * u1, B.y + B.ny * B.hw * u1);
        cx.lineTo(A.x + A.nx * A.hw * u1, A.y + A.ny * A.hw * u1);
        cx.closePath();
        cx.fill();
      }
    }
    cx.restore();
  }
  function drawBullets() {
    for (const b of items.bullets) {
      cx.strokeStyle = 'rgba(255,210,120,.5)';
      cx.lineWidth = 2;
      cx.beginPath();
      b.trail.forEach((q, i) => (i ? cx.lineTo(q[0], q[1]) : cx.moveTo(q[0], q[1])));
      cx.lineTo(b.x, b.y);
      cx.stroke();
      cx.fillStyle = '#fff3c4';
      cx.beginPath();
      cx.arc(b.x, b.y, 3, 0, 7);
      cx.fill();
    }
  }
  return {
    drawGifts,
    drawFlies,
    drawMagnetField,
    drawBoostTrail,
    drawBullets,
  };
}
