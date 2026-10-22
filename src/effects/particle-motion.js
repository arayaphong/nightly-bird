export function createParticleMotion(view, physics, random) {
  const { effects, session, viewport } = view;
  function splash(x, n, pow) {
    for (let i = 0; i < n; i++)
      effects.splashes.push({
        x,
        y: viewport.waterY,
        vx: (random() - 0.5) * pow * 1.4,
        vy: -random() * pow - pow * 0.3,
        life: 1,
      });
  }
  function burstSparks(x, y, dir) {
    for (let i = 0; i < 34; i++) {
      const a = dir + Math.PI + (random() - 0.5) * 3.2,
        sp = 200 + random() * 380;
      effects.sparks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + random() * 0.35,
        max: 0.7,
        hot: random() < 0.4,
      });
    }
    effects.sparks.push({
      x,
      y,
      ring: true,
      life: 0.35,
      max: 0.35,
    });
  }
  function updateSparks(dt) {
    for (const p of effects.sparks) {
      if (!p.ring) {
        p.vy += 420 * dt;
        p.vx *= 1 - dt * 2.5;
        p.vy *= 1 - dt * 1.5;
        physics.place(p, p.x + p.vx * dt, p.y);
        physics.place(p, p.x, p.y + p.vy * dt);
      }
      p.life -= dt;
    }
    effects.sparks = effects.sparks.filter((p) => p.life > 0);
  }
  function updateParticles(dt) {
    effects.feathers.forEach((f) => {
      f.vy += 60 * dt;
      physics.place(f, f.x + f.vx * dt, f.y);
      physics.place(f, f.x, f.y + f.vy * dt);
      f.vx *= 1 - dt * 1.5;
      f.rot += dt * 4;
      f.life -= dt * 0.6;
    });
    effects.feathers = effects.feathers.filter((f) => f.life > 0);
    effects.splashes.forEach((p) => {
      p.vy += viewport.height * 1.6 * dt;
      physics.place(
        p,
        p.x + (p.vx * dt - (session.phase === 'play' ? session.speed : 0) * dt),
        p.y,
      );
      physics.place(p, p.x, p.y + p.vy * dt);
      p.life -= dt * 1.4;
    });
    effects.ripples.forEach((r) => {
      r.r += 60 * dt;
      r.life -= dt * 1.6;
      physics.place(r, r.x - (session.phase === 'play' ? session.speed : 0) * dt, r.y);
    });
    effects.ripples = effects.ripples.filter((r) => r.life > 0);
    effects.splashes = effects.splashes.filter(
      (p) => p.life > 0 && p.y < viewport.waterY + 10,
    );
    effects.bubbles.forEach((b) => {
      if (b.vx) {
        physics.place(b, b.x + b.vx * dt, b.y);
        physics.place(b, b.x, b.y + b.vy * dt);
        const d = Math.max(0, 1 - dt * 3);
        b.vx *= d;
        b.vy *= d;
      }
      physics.place(b, b.x, b.y - viewport.height * 0.12 * dt);
      physics.place(
        b,
        b.x +
          (Math.sin(session.time * 8 + b.y * 0.1) * 0.4 -
            (session.phase === 'play' ? session.speed * 0.15 : 0) * dt),
        b.y,
      );
      b.life -= dt * 0.9;
    });
    effects.bubbles = effects.bubbles.filter((b) => b.life > 0 && b.y > viewport.waterY + 2);
  }
  function updateLabels(dt) {
    effects.labels.forEach((l) => {
      if (!l.big) physics.place(l, l.x, l.y - 40 * dt);
      l.life -= dt * 0.8;
    });
    effects.labels = effects.labels.filter((l) => l.life > 0);
    // centre messages never overlap: stack them one per line, the block centred on the message line
    const big = effects.labels.filter((l) => l.big),
      LH = 32,
      top = viewport.height * 0.36 - ((big.length - 1) * LH) / 2;
    big.forEach((l, i) => {
      const ty = top + i * LH;
      if (l.placed) physics.place(l, l.x, l.y + (ty - l.y) * Math.min(1, dt * 10));
      else {
        physics.place(l, l.x, ty);
        l.placed = true;
      }
    });
  }
  return {
    splash,
    burstSparks,
    updateSparks,
    updateParticles,
    updateLabels,
  };
}
