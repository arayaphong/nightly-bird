export function createEffectsPainter(view, cx, assets) {
  const { effects, enemies, session, viewport } = view;
  function drawSparks() {
    cx.save();
    cx.globalCompositeOperation = 'lighter';
    cx.lineCap = 'round';
    for (const p of effects.sparks) {
      const a = Math.max(0, p.life / p.max);
      if (p.ring) {
        const r = 10 + (1 - a) * 46;
        cx.strokeStyle = `rgba(255,230,150,${a * 0.8})`;
        cx.lineWidth = 3 * a + 1;
        cx.beginPath();
        cx.arc(p.x, p.y, r, 0, 7);
        cx.stroke();
        const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(255,255,220,${a})`);
        g.addColorStop(1, 'rgba(255,180,60,0)');
        cx.fillStyle = g;
        cx.beginPath();
        cx.arc(p.x, p.y, r, 0, 7);
        cx.fill();
        continue;
      }
      cx.strokeStyle = p.hot
        ? `rgba(255,255,230,${a})`
        : `rgba(255,${(170 + 70 * a) | 0},60,${a})`;
      cx.lineWidth = p.hot ? 3 : 2.2;
      cx.beginPath();
      cx.moveTo(p.x, p.y);
      cx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
      cx.stroke();
    }
    cx.restore();
  }
  function drawFeathers() {
    for (const f of effects.feathers) {
      cx.save();
      cx.globalAlpha = f.life;
      cx.translate(f.x, f.y);
      cx.rotate(f.rot);
      cx.fillStyle = f.c || '#ff6a55';
      cx.beginPath();
      cx.ellipse(0, 0, 5, 1.8, 0, 0, 7);
      cx.fill();
      if (f.smoke) {
        cx.globalAlpha = f.life * 0.35;
        cx.fillStyle = '#8a8580';
        cx.beginPath();
        cx.arc(-4, -3, 3 + (1 - f.life) * 5, 0, 7);
        cx.fill();
      } // a wisp of smoke trailing scorched feathers
      cx.restore();
    }
  }
  function drawRipples() {
    cx.lineWidth = 1.5;
    for (const r of effects.ripples) {
      cx.globalAlpha = Math.max(0, r.life) * 0.6;
      cx.strokeStyle = '#cfe8ff';
      cx.beginPath();
      cx.ellipse(r.x, viewport.waterY + 2, r.r * 1.6, r.r * 0.3, 0, 0, 7);
      cx.stroke();
    }
    cx.globalAlpha = 1;
  }
  function drawBubbles() {
    cx.strokeStyle = '#bfe3ff';
    cx.lineWidth = 1;
    for (const b of effects.bubbles) {
      cx.globalAlpha = b.life * 0.7;
      cx.beginPath();
      cx.arc(b.x, b.y, 1.5 + (1 - b.life) * 2, 0, 7);
      cx.stroke();
    }
    cx.globalAlpha = 1;
  }
  function drawSplash() {
    cx.fillStyle = '#cfe8ff';
    for (const p of effects.splashes) {
      cx.globalAlpha = Math.max(0, p.life);
      cx.beginPath();
      cx.arc(p.x, p.y, 2.2, 0, 7);
      cx.fill();
    }
    cx.globalAlpha = 1;
  }
  function drawLabels() {
    cx.font = '600 14px Mitr, system-ui, sans-serif';
    cx.textAlign = 'center';
    for (const l of effects.labels) {
      cx.font = l.big
        ? '600 22px Mitr, system-ui, sans-serif'
        : '600 14px Mitr, system-ui, sans-serif';
      cx.globalAlpha = Math.min(1, l.life * 1.5);
      cx.fillStyle = 'rgba(5,7,26,.6)';
      cx.fillText(l.txt, l.x + 1, l.y + 1);
      cx.fillStyle = l.col;
      cx.fillText(l.txt, l.x, l.y);
    }
    cx.globalAlpha = 1;
    cx.textAlign = 'start';
  }
  function drawReturnCountdown() {
    if (session.phase !== 'play') return;
    const items = [
      [
        enemies.hawk,
        'เหยี่ยว',
        Math.max(16, viewport.width * 0.06) + 14,
        viewport.height * 0.14,
        '#d9c2ff',
      ],
      [
        enemies.fish,
        'ปลา',
        viewport.width - Math.max(16, viewport.width * 0.06) - 14,
        viewport.waterY + (viewport.height - viewport.waterY) * 0.45,
        '#bfe9ee',
      ],
    ];
    for (const [o, name, x, y, col] of items) {
      if (!(o.gone > 0 && o.gone <= 5)) continue;
      const n = Math.ceil(o.gone),
        frac = o.gone - Math.floor(o.gone) || 1,
        sc = 1 + 0.35 * Math.max(0, frac - 0.75) * 4;
      cx.save();
      cx.translate(x, y);
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillStyle = 'rgba(5,7,26,.55)';
      cx.beginPath();
      cx.arc(0, 0, 22, 0, 7);
      cx.fill();
      cx.strokeStyle = col;
      cx.lineWidth = 2.5;
      cx.beginPath();
      cx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (o.gone / 5));
      cx.stroke();
      cx.scale(sc, sc);
      cx.fillStyle = n <= 2 ? '#ff8a7a' : col;
      cx.font = '600 22px Mitr, system-ui, sans-serif';
      cx.fillText(n, 0, 1);
      cx.setTransform(viewport.pixelRatio, 0, 0, viewport.pixelRatio, 0, 0);
      cx.font = '400 11px Mitr, system-ui, sans-serif';
      cx.fillStyle = col;
      cx.textAlign = 'center';
      cx.fillText(
        name + 'กำลังกลับมา',
        Math.min(viewport.width - 50, Math.max(50, x)),
        y + 36,
      );
      cx.restore();
    }
  }
  return {
    drawSparks,
    drawFeathers,
    drawRipples,
    drawBubbles,
    drawSplash,
    drawLabels,
    drawReturnCountdown,
  };
}
