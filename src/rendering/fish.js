import {
  FISH_AX,
  FISH_AY,
  FISH_PART,
  FISH_PIVOT,
  FISH_SPAN,
  FISH_SVG,
  FISH_TAIL_CUT,
} from '../../assets/art/fish.js';
import { fishSize } from '../enemies/model.js';
import { effects, enemies, session, viewport } from '../game/state.js';
import { darken } from '../math/color.js';
import { cx } from '../platform/canvas.js';
const fishVec = [];
FISH_SVG.forEach(([fill, tx, ty, d], i) => {
  const path = new Path2D(d);
  if (i === 0) {
    fishVec.push(
      {
        fill,
        tx,
        ty,
        path,
        part: 'body',
        clip: [0, FISH_TAIL_CUT + 8],
      },
      {
        fill,
        tx,
        ty,
        path,
        part: 'tail',
        clip: [FISH_TAIL_CUT - 14, 1536],
      },
    );
    return;
  }
  fishVec.push({
    fill,
    tx,
    ty,
    path,
    part: FISH_PART[i] || 'body',
  });
});
function drawFishBody(x, y, ang, belly, alpha, pose, burnt) {
  // burnt: scorched colours for a shot fish // belly: 1 = upright, -1 = upside down (values between = mid-roll)
  const s = fishSize();
  cx.save();
  cx.translate(x, y);
  cx.rotate(ang);
  if (Math.cos(ang) < 0) cx.scale(1, -1); // keep the belly down when swimming left
  cx.scale(1, belly);
  cx.globalAlpha = alpha;
  const k = (s * 2.1) / FISH_SPAN;
  cx.scale(-k, k);
  cx.translate(-FISH_AX, -FISH_AY); // art faces left: mirror so the mouth leads
  for (const q of fishVec) {
    cx.save();
    if (q.part !== 'body') {
      const [px, py] = FISH_PIVOT[q.part];
      cx.translate(px, py);
      if (q.part === 'gill') cx.scale(pose.gill, 1 + (pose.gill - 1) * 0.35);
      else cx.rotate(pose[q.part]);
      cx.translate(-px, -py);
    }
    if (q.clip) {
      cx.beginPath();
      cx.rect(q.clip[0], -50, q.clip[1] - q.clip[0], 1124);
      cx.clip();
    }
    cx.translate(q.tx, q.ty);
    cx.fillStyle = burnt ? q.burnt || (q.burnt = darken(q.fill, 0.6)) : q.fill;
    cx.fill(q.path);
    cx.restore();
  }
  cx.restore();
  cx.globalAlpha = 1;
}
export function drawFish() {
  drawCorpse();
  if (!enemies.fish || !enemies.fish.y || enemies.fish.gone > 0 || enemies.fish.locked) return;
  const s = fishSize(),
    under = enemies.fish.y > viewport.waterY + s * 0.2;
  const sw = enemies.fish.sw || 0,
    hard =
      enemies.fish.mode === 'chase' ||
      enemies.fish.mode === 'leap' ||
      enemies.fish.mode === 'charge';
  const pose = {
    tail: Math.sin(sw) * (hard ? 0.32 : 0.2),
    fin: Math.sin(sw * 0.8 + 1.2) * (hard ? 0.35 : 0.22),
    gill: 1 + 0.28 * Math.max(0, Math.sin(session.time * 2.6 + (enemies.fish.bob || 0))),
  };
  if (enemies.fish.mode === 'leap' && enemies.fish.trail)
    enemies.fish.trail.forEach((p, i) => drawFishBody(p[0], p[1], p[2], 1, 0.06 + 0.05 * i, pose)); // afterimages
  drawFishBody(
    enemies.fish.x,
    enemies.fish.y,
    enemies.fish.ang + Math.sin(sw) * 0.035,
    1,
    under ? (hard ? 0.85 : 0.55) : 1,
    pose,
  );
}
/* Shot fish: twitches, rolls belly-up over ~0.8 s and sinks slowly until it drops out past the bottom. */
function drawCorpse() {
  const c = effects.fishCorpse;
  if (!c) return;
  const s = fishSize();
  const ang = (c.dir > 0 ? 0 : Math.PI) + c.tilt,
    belly = -1; // shown belly-up
  const tw = c.twitch / 0.9,
    pose = {
      tail: Math.sin(c.sw) * 0.35 * tw,
      fin: Math.sin(c.sw * 0.8) * 0.3 * tw,
      gill: 1,
    };
  drawFishBody(c.x, c.y, ang, belly, c.y > viewport.waterY + s * 0.2 ? 0.75 : 1, pose, true);
}
/* Impact sparks: bright streaks that fly out from the hit point, fall a little and fade. */
