import { HAWK_ANCHOR, HAWK_DIVE_ANCHOR } from '../config/art.js';
import { hawkSize } from '../enemies/model.js';
import { bird, enemies, session, viewport } from '../game/state.js';
import { cx } from '../platform/canvas.js';
import { art } from '../platform/svg-art.js';

function drawEye(part, pose, stoop) {
  cx.save();
  const glow = Math.round((pose.glow || 0) * 16) / 16;
  if (glow) {
    cx.shadowColor = stoop ? '#ff7a2a' : '#ffb03a';
    cx.shadowBlur = (stoop ? 10 + 34 * glow : 8 + 30 * glow) * (pose.px || 1);
  }
  const color = glow
    ? stoop
      ? `rgb(255,${(170 - 80 * glow) | 0},${(60 - 30 * glow) | 0})`
      : `rgb(255,${(192 - 60 * glow) | 0},${(74 - 30 * glow) | 0})`
    : undefined;
  part.draw(cx, { color });
  cx.restore();
}

function drawHawkArt(g, pose) {
  g.save();
  g.translate(-HAWK_ANCHOR[0], -HAWK_ANCHOR[1]);
  const rotation = (pose.flap * -48 * Math.PI) / 180;
  for (const part of art('hawk')) {
    if (part.role === 'wing-back' || part.role === 'wing-front') {
      const angle = part.angle + rotation;
      part.draw(g, {
        angle,
        x: part.pivotX + Math.cos(angle) * part.inset,
        y: part.pivotY + Math.sin(angle) * part.inset,
      });
    } else if (part.role === 'eye') drawEye(part, pose, false);
    else part.draw(g);
  }
  g.restore();
}

function drawHawkStoop(g, pose) {
  g.save();
  g.translate(-HAWK_DIVE_ANCHOR[0], -HAWK_DIVE_ANCHOR[1]);
  const flutter = Math.sin((pose.t || 0) * 45) * 5;
  for (const part of art('hawkDive')) {
    if (part.role === 'blade') {
      const dx = part.targetX - part.x;
      const dy = part.targetY + flutter * (1 - part.targetX / 1000) - part.y;
      part.draw(g, {
        angle: Math.atan2(dy, dx),
        scaleX: Math.hypot(dx, dy) / part.length,
      });
    } else if (part.role === 'eye') drawEye(part, pose, true);
    else part.draw(g);
  }
  g.restore();
}
export function drawHawk() {
  if (enemies.hawk.gone > 0 || enemies.hawk.locked) return;
  const h = enemies.hawk,
    s = hawkSize(),
    dive = h.mode === 'dive',
    k = dive
      ? 1
      : Math.max(
          0,
          Math.min(
            1,
            (viewport.highY + viewport.height * 0.12 - bird.y) / (viewport.height * 0.12),
          ),
        );
  h.dv = (h.dv || 0) + ((dive || h.ate ? 1 : 0) - (h.dv || 0)) * 0.25;
  const sc = (s * 2.4) / 1200,
    stoop = dive && !h.ate;
  if (stoop && h.trail)
    h.trail.forEach((p, i) => {
      // afterimages + speed streaks behind the dive
      cx.save();
      cx.translate(p[0], p[1]);
      if (h.dir < 0) cx.scale(-1, 1);
      cx.rotate(p[2]);
      cx.globalAlpha = 0.07 + 0.05 * i;
      cx.scale(sc, sc);
      drawHawkStoop(cx, {
        t: session.time,
      });
      cx.restore();
    });
  if (stoop) {
    cx.save();
    cx.translate(h.x, h.y);
    if (h.dir < 0) cx.scale(-1, 1);
    cx.rotate(h.ang);
    cx.strokeStyle = 'rgba(220,230,255,.35)';
    cx.lineWidth = 1.5;
    cx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const y = (i - 2) * s * 0.22,
        l = s * (1.6 + Math.sin(session.time * 30 + i * 1.7) * 0.4);
      cx.beginPath();
      cx.moveTo(-s * 1.3, y);
      cx.lineTo(-s * 1.3 - l, y);
      cx.stroke();
    }
    cx.restore();
  }
  cx.save();
  cx.translate(h.x, h.y);
  if (h.dir < 0) cx.scale(-1, 1);
  cx.rotate(h.ang);
  cx.scale(sc, sc);
  if (stoop)
    drawHawkStoop(cx, {
      t: session.time,
      glow: 1,
      px: 0.45,
    });
  else
    drawHawkArt(cx, {
      flap: Math.sin(h.flap),
      dive: 0,
      glow: k,
      px: 0.45,
    }); // only two poses: stoop (attack) or normal flight
  cx.restore();
}
