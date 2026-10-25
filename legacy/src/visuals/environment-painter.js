import { ZAP_CHARGE } from '../config/game.js';
export function createEnvironmentPainter(view, cx, assets) {
  const { bird, enemies, session, viewport, world } = view;
  const cloudDist = (c, x, y) => c.distanceTo(x, y);
  const cloudReach = (c) => c.reach;
  /* ---------- drawing ---------- */
  function drawSky() {
    const g = cx.createLinearGradient(0, 0, 0, viewport.waterY);
    g.addColorStop(0, '#05071a');
    g.addColorStop(0.7, '#0d1440');
    g.addColorStop(1, '#1d2a5c');
    cx.fillStyle = g;
    cx.fillRect(0, 0, viewport.width, viewport.waterY + 2);
    // moon
    const mx = viewport.width * 0.8,
      my = viewport.height * 0.14,
      mr = Math.max(18, viewport.height * 0.035);
    const glow = cx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5);
    glow.addColorStop(0, 'rgba(255,240,205,.22)');
    glow.addColorStop(1, 'rgba(255,240,205,0)');
    cx.fillStyle = glow;
    cx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    cx.fillStyle = '#fff3d6';
    cx.beginPath();
    cx.arc(mx, my, mr, 0, 7);
    cx.fill();
    cx.fillStyle = '#0b1236';
    cx.beginPath();
    cx.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.9, 0, 7);
    cx.fill();
    for (const s of world.stars) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(session.time * s.tw + s.ph));
      cx.globalAlpha = a;
      cx.fillStyle = s.hue;
      cx.beginPath();
      cx.arc(s.x, s.y, s.r, 0, 7);
      cx.fill();
      if (s.l === 2 && a > 0.85) {
        cx.globalAlpha = (a - 0.85) * 4;
        cx.fillRect(s.x - s.r * 3, s.y - 0.4, s.r * 6, 0.8);
        cx.fillRect(s.x - 0.4, s.y - s.r * 3, 0.8, s.r * 6);
      }
    }
    cx.globalAlpha = 1;
  }
  function drawWater() {
    const g = cx.createLinearGradient(0, viewport.waterY, 0, viewport.height);
    g.addColorStop(0, '#123a5c');
    g.addColorStop(1, '#030914');
    cx.fillStyle = g;
    cx.fillRect(0, viewport.waterY, viewport.width, viewport.height - viewport.waterY);
    // star + moon reflections
    cx.save();
    cx.beginPath();
    cx.rect(0, viewport.waterY, viewport.width, viewport.height - viewport.waterY);
    cx.clip();
    for (const s of world.stars) {
      if (s.y < viewport.waterY * 0.35) continue;
      const ry = viewport.waterY + (viewport.waterY - s.y) * 0.35;
      if (ry > viewport.height) continue;
      const a =
        (0.15 + 0.25 * (0.5 + 0.5 * Math.sin(session.time * s.tw + s.ph))) *
        (1 - (ry - viewport.waterY) / (viewport.height - viewport.waterY));
      cx.globalAlpha = a;
      cx.fillStyle = s.hue;
      cx.fillRect(s.x + Math.sin(session.time * 3 + ry * 0.2) * 2, ry, s.r * 2.2, s.r * 0.7);
    }
    const mx = viewport.width * 0.8;
    for (let i = 0; i < 14; i++) {
      const y = viewport.waterY + 8 + (i * (viewport.height - viewport.waterY)) / 14;
      cx.globalAlpha = 0.28 * (1 - i / 14);
      cx.fillStyle = '#ffeec8';
      const w = 18 + Math.sin(session.time * 2 + i) * 8 + i * 1.5;
      cx.fillRect(mx - w / 2 + Math.sin(session.time * 1.7 + i * 1.3) * 6, y, w, 2);
    }
    cx.restore();
    cx.globalAlpha = 1;
    // surface line
    cx.strokeStyle = 'rgba(170,215,255,.55)';
    cx.lineWidth = 2;
    cx.beginPath();
    for (let x = 0; x <= viewport.width; x += 8) {
      const y =
        viewport.waterY +
        Math.sin(x * 0.03 + session.time * 2.4) * 2.2 +
        Math.sin(x * 0.011 - session.time * 1.3) * 1.5;
      x ? cx.lineTo(x, y) : cx.moveTo(x, y);
    }
    cx.stroke();
  }
  function drawDanger() {
    if (session.phase !== 'play') return;
    const near = Math.max(
      0,
      Math.min(
        1,
        (bird.y + bird.r - (viewport.dangerY - viewport.height * 0.12)) /
          (viewport.height * 0.12),
      ),
    );
    if (near <= 0) return;
    const g = cx.createLinearGradient(0, viewport.dangerY - 30, 0, viewport.waterY);
    g.addColorStop(0, 'rgba(255,90,74,0)');
    g.addColorStop(1, `rgba(255,90,74,${0.28 * near})`);
    cx.fillStyle = g;
    cx.fillRect(
      0,
      viewport.dangerY - 30,
      viewport.width,
      viewport.waterY - viewport.dangerY + 30,
    );
    cx.setLineDash([6, 8]);
    cx.strokeStyle = `rgba(255,120,100,${0.6 * near})`;
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(0, viewport.dangerY);
    cx.lineTo(viewport.width, viewport.dangerY);
    cx.stroke();
    cx.setLineDash([]);
  }
  function drawSkyDanger() {
    if (enemies.hawk.gone > 0 || enemies.hawk.locked) return;
    if (session.phase !== 'play') return;
    const k = bird.y < viewport.highY ? 1 : 0,
      near = Math.max(
        k,
        Math.max(
          0,
          Math.min(
            1,
            (viewport.highY + viewport.height * 0.1 - (bird.y - bird.r)) /
              (viewport.height * 0.1),
          ),
        ) * 0.35,
      );
    if (near <= 0) return;
    const g = cx.createLinearGradient(0, 0, 0, viewport.highY + 30);
    g.addColorStop(0, `rgba(190,120,255,${0.3 * near})`);
    g.addColorStop(1, 'rgba(190,120,255,0)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, viewport.width, viewport.highY + 30);
    cx.setLineDash([6, 8]);
    cx.strokeStyle = `rgba(205,160,255,${0.25 + 0.5 * near})`;
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(0, viewport.highY);
    cx.lineTo(viewport.width, viewport.highY);
    cx.stroke();
    cx.setLineDash([]);
  }
  function drawWind() {
    const dx = Math.cos(world.wind.ang),
      dy = Math.sin(world.wind.ang);
    cx.lineWidth = 1;
    cx.lineCap = 'round';
    for (const p of world.windParticles) {
      cx.strokeStyle = `rgba(200,220,255,${0.22 * Math.sin(p.life * Math.PI)})`;
      cx.beginPath();
      cx.moveTo(p.x, p.y);
      cx.lineTo(p.x - dx * p.len, p.y - dy * p.len);
      cx.stroke();
    }
  }
  function drawClouds() {
    for (const c of world.clouds) {
      cx.strokeStyle = 'rgba(150,175,220,.35)';
      cx.lineWidth = 1;
      cx.beginPath();
      for (const d of c.drops) {
        cx.moveTo(d.x, d.y);
        cx.lineTo(d.x - 3, d.y + 9);
      }
      cx.stroke();
      const ch = c.charge > 0 ? c.charge / ZAP_CHARGE : 0,
        flick = ch > 0 && Math.sin(session.time * 60) > 0 ? ch : 0;
      // danger halo when the bird is close
      if (session.phase === 'play' && bird.alive) {
        const dd = cloudDist(c, bird.x, bird.y) - bird.r,
          R = cloudReach(c);
        if (dd < R * 1.8) {
          cx.globalAlpha = Math.min(1, (R * 1.8 - dd) / R) * 0.35;
          cx.setLineDash([4, 6]);
          cx.strokeStyle = '#ffe27a';
          cx.lineWidth = 1.2;
          cx.beginPath();
          cx.ellipse(c.x, c.y, c.w / 2 + R, c.h / 2 + R, 0, 0, 7);
          cx.stroke();
          cx.setLineDash([]);
          cx.globalAlpha = 1;
        }
      }
      for (const p of c.puffs) {
        const g = cx.createRadialGradient(
          c.x + p.dx,
          c.y + p.dy - p.r * 0.3,
          p.r * 0.1,
          c.x + p.dx,
          c.y + p.dy,
          p.r,
        );
        g.addColorStop(0, flick ? '#d9dcff' : '#5b6181');
        g.addColorStop(1, flick ? '#7d82b8' : '#2b2f47');
        cx.fillStyle = g;
        cx.beginPath();
        cx.arc(
          c.x + p.dx,
          c.y + p.dy + Math.sin(session.time * 1.5 + c.ph + p.dx) * 1.5,
          p.r,
          0,
          7,
        );
        cx.fill();
      }
      if (ch > 0) {
        cx.globalAlpha = 0.25 + 0.4 * ch;
        cx.strokeStyle = '#fff6b0';
        cx.lineWidth = 1;
        cx.beginPath();
        cx.moveTo(c.x + c.w * 0.1, c.y);
        cx.lineTo(c.tx, c.ty);
        cx.setLineDash([2, 10]);
        cx.stroke();
        cx.setLineDash([]);
        cx.globalAlpha = 1;
      }
      if (c.bolt) {
        const a = c.boltT / 0.28;
        for (const [w, col] of [
          [7, 'rgba(180,200,255,' + 0.35 * a + ')'],
          [2.5, 'rgba(255,255,230,' + a + ')'],
        ]) {
          cx.strokeStyle = col;
          cx.lineWidth = w;
          cx.lineJoin = 'round';
          cx.beginPath();
          c.bolt.forEach((q, i) => (i ? cx.lineTo(q[0], q[1]) : cx.moveTo(q[0], q[1])));
          cx.stroke();
        }
      }
    }
  }
  function drawWaterVeil() {
    // tint whatever is under the surface (the bird when it sinks)
    if (bird.y + bird.r < viewport.waterY) return;
    cx.fillStyle = 'rgba(18,58,92,.3)';
    cx.fillRect(0, viewport.waterY + 2, viewport.width, viewport.height - viewport.waterY);
  }
  return {
    drawSky,
    drawWater,
    drawDanger,
    drawSkyDanger,
    drawWind,
    drawClouds,
    drawWaterVeil,
  };
}
