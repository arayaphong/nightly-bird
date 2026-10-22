import { RB, SVG_AX, SVG_AY, SVG_SPAN } from '../../assets/art/bird.js';
import { bird, items, session, viewport } from '../game/state.js';
import { cx } from '../platform/canvas.js';
import { birdAng, birdFrame, birdWing, blinkOpen, chewAmount } from '../player/animation.js';
function rbLeaf(g, x, y, ang, len, w, fill) {
  // soft rounded feather
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(0, -w * 0.3);
  g.bezierCurveTo(len * 0.35, -w * 0.75, len * 0.95, -w * 0.55, len, 0);
  g.bezierCurveTo(len * 1.02, w * 0.4, len * 0.4, w * 0.62, 0, w * 0.3);
  g.closePath();
  g.fill();
  g.restore();
}
const RBD = (a) => (a * Math.PI) / 180;
const RB_BODY = new Path2D(
  'M95,330 C150,298 220,254 300,248 C362,243 422,252 452,292 C472,334 440,382 380,396 C300,414 210,410 165,396 C130,382 110,356 95,330Z',
);
function rbBolt(g, x, y, s, rot, fill) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s / 100, s / 100);
  g.beginPath();
  g.moveTo(8, -50);
  g.lineTo(-26, 6);
  g.lineTo(-2, 6);
  g.lineTo(-12, 50);
  g.lineTo(28, -10);
  g.lineTo(4, -10);
  g.lineTo(18, -50);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.restore();
}
function drawSuitCoat(g) {
  g.save();
  g.clip(RB_BODY);
  const gr = g.createLinearGradient(0, 250, 0, 410);
  gr.addColorStop(0, '#5fb3ff');
  gr.addColorStop(1, '#2f7fd8');
  g.fillStyle = gr;
  g.fill(RB_BODY);
  g.fillStyle = '#2468b8';
  g.beginPath();
  g.moveTo(90, 372);
  g.bezierCurveTo(200, 420, 330, 420, 470, 372);
  g.lineTo(470, 430);
  g.lineTo(90, 430);
  g.fill(); // hem
  g.fillStyle = 'rgba(255,255,255,.22)';
  g.beginPath();
  g.ellipse(250, 280, 110, 18, RBD(-8), 0, 7);
  g.fill(); // plastic sheen
  g.strokeStyle = 'rgba(20,60,130,.45)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(110, 346);
  g.bezierCurveTo(176, 352, 262, 344, 330, 326);
  g.stroke(); // sleeve crease
  g.restore();
  g.fillStyle = '#ffd23c';
  g.strokeStyle = '#1d4f96';
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(196, 350, 46, 42, 9);
  g.fill();
  g.stroke();
  rbBolt(g, 219, 371, 32, RBD(8), '#1d4f96');
  for (const [x, y] of [
    [290, 384],
    [330, 382],
    [370, 378],
  ]) {
    g.fillStyle = '#fff7d6';
    g.beginPath();
    g.roundRect(x - 11, y - 5, 22, 10, 5);
    g.fill();
    g.strokeStyle = '#1d4f96';
    g.lineWidth = 3;
    g.stroke();
  }
}
function drawSuitHood(g, C) {
  g.save();
  g.beginPath();
  g.moveTo(240, 150);
  g.lineTo(452, 150);
  g.lineTo(458, 214);
  g.lineTo(334, 360);
  g.lineTo(240, 360);
  g.closePath();
  g.clip();
  const hood = new Path2D();
  hood.ellipse(382, 280, 96, 88, 0, 0, 7);
  hood.ellipse(404, 292, 70, 64, 0, 0, 7);
  const gr = g.createLinearGradient(300, 190, 420, 330);
  gr.addColorStop(0, '#6fbcff');
  gr.addColorStop(1, '#2f7fd8');
  g.fillStyle = gr;
  g.fill(hood, 'evenodd');
  g.strokeStyle = '#1d4f96';
  g.lineWidth = 5;
  g.beginPath();
  g.ellipse(404, 292, 70, 64, 0, 0, 7);
  g.stroke();
  g.restore();
  rbLeaf(g, 352, 198, RBD(-112), 40, 26, C.red);
  rbLeaf(g, 372, 194, RBD(-80), 34, 22, C.red2);
} // crest poking out of the hood
/* w: wing position −1 (high) … +1 (low) · open: eye openness 0…1 · dark: scorched colours */
// crest poking out of the hood
/* w: wing position −1 (high) … +1 (low) · open: eye openness 0…1 · dark: scorched colours */
function drawRedBird(g, w, open, dark, xEyes, chew = 0, suit = false) {
  // chew 0…1: how far the beak is open while munching // xEyes: dead — eyes become crosses
  const C = dark ? RB_DARK : RB;
  const rot = RBD(-w * 58),
    lk = 1 - Math.max(0, w) * 0.18; // downstroke foreshortens the wing a little
  // back wing (far side)
  g.save();
  g.translate(272, 258);
  g.rotate(rot * 0.9);
  rbLeaf(g, 0, 0, RBD(-152), 232, 92, C.maroon);
  rbLeaf(g, 0, 8, RBD(-168), 190, 78, C.maroon2);
  rbLeaf(g, 8, -6, RBD(-92), 132, 62, C.maroon);
  g.restore();
  // tail
  rbLeaf(g, 128, 332, RBD(-160), 118, 56, C.maroon);
  rbLeaf(g, 128, 340, RBD(-178), 112, 52, C.maroon2);
  rbLeaf(g, 132, 348, RBD(166), 92, 44, C.maroon);
  // feet
  for (const [fx, fy] of [
    [188, 392],
    [214, 404],
  ]) {
    rbLeaf(g, fx, fy, RBD(150), 58, 22, C.foot);
    rbLeaf(g, fx, fy, RBD(178), 50, 20, C.foot2);
    rbLeaf(g, fx, fy, RBD(128), 46, 18, C.foot);
  }
  // body
  g.fillStyle = C.red;
  g.beginPath();
  g.moveTo(95, 330);
  g.bezierCurveTo(150, 298, 220, 254, 300, 248);
  g.bezierCurveTo(362, 243, 422, 252, 452, 292);
  g.bezierCurveTo(472, 334, 440, 382, 380, 396);
  g.bezierCurveTo(300, 414, 210, 410, 165, 396);
  g.bezierCurveTo(130, 382, 110, 356, 95, 330);
  g.fill();
  // belly
  g.fillStyle = C.pink2;
  g.beginPath();
  g.moveTo(160, 352);
  g.bezierCurveTo(240, 334, 330, 328, 425, 338);
  g.bezierCurveTo(414, 380, 372, 400, 300, 406);
  g.bezierCurveTo(236, 410, 186, 398, 160, 380);
  g.closePath();
  g.fill();
  g.fillStyle = C.pink;
  g.beginPath();
  g.moveTo(180, 352);
  g.bezierCurveTo(250, 336, 330, 332, 418, 340);
  g.bezierCurveTo(404, 370, 366, 386, 300, 390);
  g.bezierCurveTo(240, 393, 200, 384, 180, 370);
  g.closePath();
  g.fill();
  // wing root sweeping back over the body
  g.fillStyle = C.red2;
  g.beginPath();
  g.moveTo(96, 332);
  g.bezierCurveTo(165, 300, 262, 292, 332, 326);
  g.bezierCurveTo(262, 346, 176, 356, 118, 350);
  g.closePath();
  g.fill();
  if (suit) drawSuitCoat(g);
  // front wing
  g.save();
  g.translate(300, 268);
  g.rotate(rot);
  rbLeaf(g, 0, 0, RBD(-128), 236 * lk, 104, C.red2);
  rbLeaf(g, 0, 6, RBD(-142), 214 * lk, 96, C.red);
  rbLeaf(g, 4, -4, RBD(-112), 190 * lk, 86, C.red);
  rbLeaf(g, 0, 4, RBD(-150), 130 * lk, 70, C.red2);
  g.restore();
  // head + crest
  rbLeaf(g, 352, 226, RBD(-112), 46, 30, C.red);
  rbLeaf(g, 372, 222, RBD(-80), 40, 26, C.red2);
  rbLeaf(g, 340, 236, RBD(-140), 40, 26, C.red2);
  const puff = 1 + chew * 0.05;
  g.fillStyle = C.red;
  g.beginPath();
  g.ellipse(386, 282 + chew * 3, 82 * puff, 74 * puff, 0, 0, 7);
  g.fill(); // cheeks puff a little while chewing
  if (suit) drawSuitHood(g, C);
  // eyes (blink = squash vertically about each eye's centre)
  const eye = (cx, cy, rx, ry, px, py, pr) => {
    g.save();
    g.translate(cx, cy);
    g.scale(1, Math.max(0.06, open));
    g.translate(-cx, -cy);
    g.fillStyle = C.white;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, 7);
    g.fill();
    g.strokeStyle = C.outline;
    g.lineWidth = 3;
    g.stroke();
    if (xEyes) {
      const r = Math.min(rx, ry) * 0.62;
      g.strokeStyle = C.pupil;
      g.lineWidth = Math.max(4, rx * 0.22);
      g.lineCap = 'round';
      g.beginPath(); // ✕
      g.moveTo(cx - r, cy - r);
      g.lineTo(cx + r, cy + r);
      g.moveTo(cx + r, cy - r);
      g.lineTo(cx - r, cy + r);
      g.stroke();
    } else if (open > 0.4) {
      g.fillStyle = C.pupil;
      g.beginPath();
      g.arc(px, py, pr, 0, 7);
      g.fill();
    }
    g.restore();
    if (open < 0.4) {
      g.strokeStyle = C.maroon;
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - rx * 0.9, cy);
      g.quadraticCurveTo(cx, cy + ry * 0.35, cx + rx * 0.9, cy);
      g.stroke();
    }
  };
  eye(384, 292, 30, 33, 405, 283, 9.5);
  eye(438, 287, 14, 20, 445, 280, 6);
  // heavy lids give the sleepy-grumpy look
  g.fillStyle = C.red;
  g.beginPath();
  g.ellipse(382, 255, 34, 9, RBD(-8), 0, 7);
  g.fill();
  g.beginPath();
  g.ellipse(438, 264, 16, 6, RBD(-12), 0, 7);
  g.fill();
  // beak
  const hx = 424,
    hy = 326,
    up = RBD(-14 * chew),
    dn = RBD(20 * chew); // beak hinge; jaws open around it
  if (chew > 0.05) {
    g.fillStyle = C.outline;
    g.beginPath();
    g.moveTo(hx - 4, hy);
    g.lineTo(hx + 70 * Math.cos(up), hy - 8 + 70 * Math.sin(up));
    g.lineTo(hx + 66 * Math.cos(dn), hy + 6 + 66 * Math.sin(dn));
    g.closePath();
    g.fill();
  } // inside of the mouth
  g.save();
  g.translate(hx, hy);
  g.rotate(up);
  g.translate(-hx, -hy);
  g.fillStyle = C.beak;
  g.beginPath();
  g.moveTo(416, 300);
  g.lineTo(502, 318);
  g.lineTo(430, 332);
  g.closePath();
  g.fill();
  g.restore();
  g.save();
  g.translate(hx, hy);
  g.rotate(dn);
  g.translate(-hx, -hy);
  g.fillStyle = C.beak2;
  g.beginPath();
  g.moveTo(430, 332);
  g.lineTo(500, 320);
  g.lineTo(442, 350);
  g.closePath();
  g.fill();
  g.restore();
}
const RB_DARK = Object.fromEntries(
  Object.entries(RB).map(([k, v]) => {
    const n = parseInt(v.slice(1), 16),
      m = (c, d) => Math.round(c + (d - c) * 0.78);
    return [k, `rgb(${m(n >> 16, 18)},${m((n >> 8) & 255, 13)},${m(n & 255, 10)})`];
  }),
);
function drawBirdVector(fi, dark, k) {
  cx.save();
  cx.scale(k, k);
  cx.translate(-SVG_AX, -SVG_AY);
  const xe =
    !bird.alive &&
    (session.deathBy === 'storm' || session.deathBy === 'drown' || session.deathBy === 'hawk');
  drawRedBird(
    cx,
    birdWing(),
    xe ? 1 : blinkOpen(),
    dark,
    xe,
    bird.alive ? chewAmount() : 0,
    bird.suit && bird.alive,
  );
  cx.restore();
}
export function drawBird() {
  if (bird.alive && (bird.inv > 0 || bird.zinv > 0) && Math.sin(session.time * 40) > 0.3) return; // blink while protected after a block
  const r = bird.r,
    ang = birdAng();
  cx.save();
  if (bird.y > viewport.waterY) cx.globalAlpha = 0.65;
  cx.translate(bird.x, bird.y);
  cx.rotate(ang);
  drawBirdVector(birdFrame(), bird.zapped, (r * 4.2) / SVG_SPAN);
  if (
    items.magnetTime > 0 &&
    bird.alive &&
    !(items.magnetTime < 2 && Math.sin(session.time * 22) < 0)
  ) {
    // horseshoe magnet gripped in the feet (blinks in its last 2 s)
    const R1 = r * 0.42,
      th = r * 0.22,
      mx = -r * 0.62,
      my = r * 0.78 + R1;
    cx.save();
    cx.translate(mx, my);
    cx.rotate(-ang * 0.6); // hangs roughly upright
    cx.lineCap = 'butt';
    cx.strokeStyle = '#e8343f';
    cx.lineWidth = th;
    cx.beginPath();
    cx.moveTo(-R1, R1 * 0.55);
    cx.lineTo(-R1, 0);
    cx.arc(0, 0, R1, Math.PI, Math.PI * 2, false);
    cx.lineTo(R1, R1 * 0.55);
    cx.stroke(); // ∩ horseshoe
    cx.strokeStyle = '#d9dde6';
    cx.beginPath();
    cx.moveTo(-R1, R1 * 0.55);
    cx.lineTo(-R1, R1 * 0.95);
    cx.moveTo(R1, R1 * 0.55);
    cx.lineTo(R1, R1 * 0.95);
    cx.stroke(); // silver poles
    cx.strokeStyle = 'rgba(255,255,255,.45)';
    cx.lineWidth = th * 0.3;
    cx.beginPath();
    cx.arc(0, 0, R1, Math.PI * 1.2, Math.PI * 1.55, false);
    cx.stroke();
    cx.strokeStyle = '#e8a012';
    cx.lineWidth = r * 0.1;
    cx.lineCap = 'round'; // toes wrapped over the top of the horseshoe
    for (const dx of [-r * 0.2, 0, r * 0.2]) {
      const ty = -Math.sqrt(Math.max(0, R1 * R1 - dx * dx));
      cx.beginPath();
      cx.moveTo(dx - r * 0.04, ty - th * 0.9);
      cx.quadraticCurveTo(dx + r * 0.12, ty - th * 0.2, dx + r * 0.02, ty + th * 0.55);
      cx.stroke();
    }
    cx.restore();
  }
  if (bird.gun && bird.alive) {
    // small gun slung under the belly
    cx.fillStyle = '#5b6070';
    cx.fillRect(r * 0.05, r * 0.74, r * 1.1, r * 0.22);
    cx.fillRect(r * 0.1, r * 0.82, r * 0.22, r * 0.4);
    cx.fillStyle = '#c9ccd6';
    cx.fillRect(r * 0.1, r * 0.74, r * 1.05, r * 0.07);
  }
  if (bird.helmet && bird.alive) {
    // helmet over the head
    cx.fillStyle = '#f2c230';
    cx.beginPath();
    cx.arc(r * 0.92, -r * 0.56, r * 0.64, Math.PI * 1.02, Math.PI * 1.98);
    cx.closePath();
    cx.fill();
    cx.fillStyle = '#b8860b';
    cx.fillRect(r * 0.22, -r * 0.62, r * 1.4, r * 0.12);
    cx.fillStyle = 'rgba(255,255,255,.6)';
    cx.beginPath();
    cx.ellipse(r * 0.72, -r * 0.98, r * 0.2, r * 0.08, -0.4, 0, 7);
    cx.fill();
  }
  cx.restore();
}
/* Enemy fish: vector art from the designer's SVG (1536×1024 viewBox, mouth on the left), drawn as Path2D.
   Flipped so the mouth points along the fish's heading; anchor (830,500) is the body centre. */
