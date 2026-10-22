import { HK, HK_COV, HK_PRIM, HK_SEC, HK_TAIL } from '../../assets/art/hawk.js';
import { hawkSize } from '../enemies/model.js';
import { bird, enemies, session, viewport } from '../game/state.js';
import { cx } from '../platform/canvas.js';
function hkFeather(g, x, y, ang, len, w, fill) {
  // rounded flat feather, base at (x,y) pointing along ang
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(0, -w * 0.18);
  g.bezierCurveTo(len * 0.3, -w * 0.62, len * 0.82, -w * 0.5, len, -w * 0.08);
  g.quadraticCurveTo(len * 1.02, w * 0.12, len * 0.9, w * 0.24);
  g.bezierCurveTo(len * 0.65, w * 0.5, len * 0.25, w * 0.42, 0, w * 0.18);
  g.closePath();
  g.fill();
  g.restore();
}
const HD = (a) => (a * Math.PI) / 180;
function hkWing(g, px, py, rot, spread, lenK, back) {
  // spread: 1 open, <1 folded
  const C = HK.col;
  const layer = (fan, fill, lk, inset) =>
    fan.forEach(([a, l, w]) => {
      const aa = HD(-170 + (a + 170) * spread) + rot;
      hkFeather(
        g,
        px + Math.cos(aa) * inset,
        py + Math.sin(aa) * inset,
        aa,
        l * lk * lenK,
        w,
        fill,
      );
    });
  if (back) {
    layer(HK_PRIM, C.navy, 0.92, 0);
    layer(HK_SEC, C.navy2, 0.9, 0);
    return;
  }
  layer(HK_PRIM, C.navy, 1, 0);
  layer(HK_SEC, C.slate, 1, 10);
  layer(HK_COV, C.slate2, 1, 20);
  // pale edge highlights on the coverts
  HK_COV.slice(0, 3).forEach(([a, l, w]) => {
    const aa = HD(-170 + (a + 170) * spread) + rot;
    hkFeather(
      g,
      px + Math.cos(aa) * 60,
      py + Math.sin(aa) * 60,
      aa,
      l * 0.55 * lenK,
      w * 0.55,
      C.pale,
    );
  });
}
function hkTalons(g, x, y, ext) {
  // ext 0 tucked under the belly .. 1 thrust forward with claws spread (stoop)
  const C = HK.col,
    sc = 1 + 0.45 * ext;
  g.save();
  g.translate(x, y);
  g.rotate(HD(-10 - 84 * ext));
  g.scale(sc, sc);
  for (const [ox, oy] of [
    [0, 0],
    [52, 26],
  ]) {
    g.save();
    g.translate(ox, oy);
    g.fillStyle = C.foot;
    g.beginPath();
    g.roundRect(-15, -40, 30, 58 + 70 * ext, 13);
    g.fill(); // leg
    const fy = 18 + 70 * ext,
      spr = 1 + 0.6 * ext;
    g.lineCap = 'round';
    for (const a of [90 - 38 * spr, 90, 90 + 38 * spr]) {
      const tl = 44 + 22 * ext,
        tx = Math.cos(HD(a)) * tl,
        ty = fy + Math.sin(HD(a)) * tl * 0.8;
      g.strokeStyle = C.foot;
      g.lineWidth = 18;
      g.beginPath();
      g.moveTo(0, fy);
      g.lineTo(tx, ty);
      g.stroke(); // toe
      const cl = 16 + 14 * ext,
        ca = HD(a);
      g.strokeStyle = C.claw;
      g.lineWidth = 9 + 3 * ext;
      g.beginPath();
      g.moveTo(tx, ty); // hooked claw, curling inward
      g.quadraticCurveTo(
        tx + Math.cos(ca) * cl,
        ty + Math.sin(ca) * cl,
        tx + Math.cos(ca + HD(100)) * cl * 1.1,
        ty + Math.sin(ca + HD(100)) * cl * 1.1,
      );
      g.stroke();
    }
    g.restore();
  }
  g.restore();
}

/* pose: {flap:-1..1 (−1 wings high, +1 wings low), dive:0..1, glow:0..1, dark:bool} */
/* pose: {flap:-1..1 (−1 wings high, +1 wings low), dive:0..1, glow:0..1, dark:bool} */
function drawHawkArt(g, pose) {
  const C = HK.col,
    [ox, oy] = HK.O;
  g.save();
  g.translate(-ox, -oy);
  const dv = pose.dive || 0,
    fl = pose.flap * (1 - dv);
  const rot = HD(fl * -48) + HD(dv * 20),
    spread = 1 - 0.5 * dv,
    lenK = 1 + 0.06 * dv; // stoop: wings raised and swept back, fan closed
  // back wing (far side), a little higher and darker
  hkWing(g, 900, 585, rot + HD(-14 + dv * 10), spread, lenK, true);
  // tail fan
  HK_TAIL.forEach(([a, l, w], i) =>
    hkFeather(
      g,
      575,
      800,
      HD(178 + (a - 178) * (1 - 0.55 * dv) - 6 * dv),
      l * (1 + 0.08 * dv),
      w * (1 - 0.15 * dv),
      i % 2 ? C.slate : C.navy,
    ),
  );
  HK_TAIL.slice(1, 4).forEach(([a, l, w]) =>
    hkFeather(
      g,
      600,
      805,
      HD(178 + (a - 178) * (1 - 0.55 * dv) - 6 * dv),
      l * 0.55,
      w * 0.6,
      C.pale,
    ),
  );
  // body
  g.fillStyle = C.slate;
  g.beginPath();
  g.moveTo(545, 770);
  g.bezierCurveTo(640, 650, 840, 560, 1000, 560);
  g.bezierCurveTo(1085, 600, 1135, 700, 1122, 785);
  g.bezierCurveTo(1095, 905, 955, 955, 800, 948);
  g.bezierCurveTo(675, 942, 590, 885, 545, 770);
  g.fill();
  g.fillStyle = C.navy2;
  g.beginPath();
  g.moveTo(560, 760);
  g.bezierCurveTo(660, 660, 840, 590, 990, 585);
  g.bezierCurveTo(900, 640, 760, 720, 620, 800);
  g.closePath();
  g.fill();
  // belly
  g.fillStyle = C.belly2;
  g.beginPath();
  g.moveTo(620, 860);
  g.bezierCurveTo(740, 780, 940, 735, 1124, 712);
  g.bezierCurveTo(1130, 820, 1070, 915, 935, 940);
  g.bezierCurveTo(810, 960, 690, 925, 620, 860);
  g.fill();
  g.fillStyle = C.belly;
  g.beginPath();
  g.moveTo(690, 850);
  g.bezierCurveTo(800, 790, 960, 750, 1118, 735);
  g.bezierCurveTo(1110, 830, 1050, 890, 930, 905);
  g.bezierCurveTo(830, 915, 740, 895, 690, 850);
  g.fill();
  // talons (tucked under the belly, reach forward on a dive)
  if (dv > 0.05) {
    g.globalAlpha = Math.min(1, dv * 1.5);
    g.fillStyle = C.belly2;
    g.beginPath();
    g.ellipse(930 + dv * 40, 870, 95 * dv + 20, 62, HD(-35), 0, 7);
    g.fill(); // feathered thighs
    g.fillStyle = C.belly;
    g.beginPath();
    g.ellipse(950 + dv * 40, 858, 70 * dv + 14, 44, HD(-35), 0, 7);
    g.fill();
    g.globalAlpha = 1;
  }
  hkTalons(g, 560 + dv * 430, 895 + dv * 10, dv);
  // front wing
  hkWing(g, 875, 615, rot, spread, lenK, false);
  // head
  g.fillStyle = C.head;
  g.beginPath();
  g.moveTo(955, 575);
  g.bezierCurveTo(990, 505, 1100, 495, 1165, 555);
  g.bezierCurveTo(1205, 600, 1205, 672, 1160, 715);
  g.bezierCurveTo(1110, 760, 1035, 748, 985, 712);
  g.closePath();
  g.fill();
  // crest feathers swept back
  hkFeather(g, 1010, 540, HD(-160), 120, 46, C.navy2);
  hkFeather(g, 1000, 560, HD(-172), 130, 44, C.navy);
  hkFeather(g, 1030, 525, HD(-150), 95, 40, C.slate);
  // cheek / throat
  g.fillStyle = C.belly;
  g.beginPath();
  g.moveTo(985, 712);
  g.bezierCurveTo(1040, 690, 1110, 690, 1158, 712);
  g.bezierCurveTo(1150, 760, 1080, 800, 1000, 770);
  g.closePath();
  g.fill();
  // eye mask + eye with an angry lid
  g.fillStyle = C.mask;
  g.beginPath();
  g.moveTo(1000, 640);
  g.bezierCurveTo(1050, 612, 1125, 615, 1150, 648);
  g.bezierCurveTo(1135, 692, 1070, 705, 1030, 690);
  g.bezierCurveTo(1015, 675, 1004, 660, 1000, 640);
  g.fill();
  if (pose.glow) {
    g.shadowColor = '#ffb03a';
    g.shadowBlur = (8 + 30 * pose.glow) * (pose.px || 1);
  }
  g.fillStyle = pose.glow
    ? `rgb(255,${(192 - 60 * pose.glow) | 0},${(74 - 30 * pose.glow) | 0})`
    : C.eye;
  g.beginPath();
  g.ellipse(1098, 668, 36, 31, HD(8), 0, 7);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = C.pupil;
  g.beginPath();
  g.arc(1108, 673, 13, 0, 7);
  g.fill();
  g.fillStyle = C.mask;
  g.beginPath();
  g.moveTo(1052, 628);
  g.lineTo(1150, 646);
  g.lineTo(1146, 662);
  g.lineTo(1056, 650);
  g.closePath();
  g.fill(); // scowl
  // hooked beak
  g.fillStyle = C.beak;
  g.beginPath();
  g.moveTo(1128, 650);
  g.bezierCurveTo(1185, 632, 1232, 668, 1236, 722);
  g.bezierCurveTo(1238, 748, 1226, 768, 1214, 778);
  g.bezierCurveTo(1212, 750, 1196, 730, 1170, 724);
  g.bezierCurveTo(1148, 720, 1130, 722, 1118, 708);
  g.closePath();
  g.fill();
  g.fillStyle = C.beak2;
  g.beginPath();
  g.moveTo(1214, 778);
  g.bezierCurveTo(1212, 750, 1196, 730, 1170, 724);
  g.lineTo(1184, 742);
  g.bezierCurveTo(1202, 752, 1210, 762, 1214, 778);
  g.fill();
  g.fillStyle = C.beak2;
  g.beginPath();
  g.moveTo(1118, 708);
  g.bezierCurveTo(1140, 716, 1160, 716, 1172, 724);
  g.lineTo(1150, 734);
  g.bezierCurveTo(1135, 730, 1124, 722, 1118, 708);
  g.fill();
  g.restore();
}
/* Stoop pose (attack dive) — wings folded flat into one long teardrop, after the designer's reference.
   Same scale as drawHawkArt; origin at (700,650), facing right, head leading. */
/* Stoop pose (attack dive) — wings folded flat into one long teardrop, after the designer's reference.
   Same scale as drawHawkArt; origin at (700,650), facing right, head leading. */
function hkBlade(g, bx, by, tx, ty, w, fill) {
  // pointed feather blade from a rounded base (bx,by) to a sharp tip (tx,ty)
  const a = Math.atan2(ty - by, tx - bx),
    l = Math.hypot(tx - bx, ty - by);
  g.save();
  g.translate(bx, by);
  g.rotate(a);
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(0, -w * 0.5);
  g.bezierCurveTo(l * 0.35, -w * 0.55, l * 0.75, -w * 0.3, l, 0);
  g.bezierCurveTo(l * 0.75, w * 0.22, l * 0.35, w * 0.45, 0, w * 0.5);
  g.quadraticCurveTo(-w * 0.35, 0, 0, -w * 0.5);
  g.fill();
  g.restore();
}
function drawHawkStoop(g, pose) {
  const C = HK.col,
    fl = Math.sin((pose.t || 0) * 45) * 5; // wingtips buzz in the airstream
  g.save();
  g.translate(-700, -650);
  // silhouette
  g.fillStyle = C.navy2;
  g.beginPath();
  g.moveTo(40, 505);
  g.bezierCurveTo(300, 478, 700, 500, 1000, 540);
  g.bezierCurveTo(1120, 560, 1182, 622, 1182, 700);
  g.bezierCurveTo(1172, 762, 1100, 802, 1000, 812);
  g.bezierCurveTo(800, 832, 600, 792, 450, 742);
  g.bezierCurveTo(300, 690, 150, 630, 40, 505);
  g.fill();
  // belly
  g.fillStyle = C.belly2;
  g.beginPath();
  g.moveTo(430, 708);
  g.bezierCurveTo(600, 780, 820, 826, 1010, 808);
  g.bezierCurveTo(1080, 800, 1120, 775, 1140, 742);
  g.lineTo(990, 712);
  g.bezierCurveTo(820, 738, 620, 735, 430, 708);
  g.fill();
  g.fillStyle = C.belly;
  g.beginPath();
  g.moveTo(560, 722);
  g.bezierCurveTo(700, 770, 860, 790, 1000, 778);
  g.bezierCurveTo(1060, 770, 1100, 752, 1120, 738);
  g.lineTo(990, 712);
  g.bezierCurveTo(850, 730, 700, 734, 560, 722);
  g.fill();
  // folded wing: layered blades swept back to sharp tips
  const B = (bx, by, tx, ty, w, c) => hkBlade(g, bx, by, tx, ty + fl * (1 - tx / 1000), w, c);
  B(700, 600, 35, 552, 72, C.navy);
  B(700, 560, 30, 505, 74, C.navy2);
  B(760, 640, 150, 628, 62, C.navy);
  B(820, 545, 132, 490, 72, C.slate);
  B(720, 600, 118, 560, 52, C.pale);
  B(780, 642, 205, 622, 48, '#b9bccb');
  B(910, 530, 345, 470, 74, C.navy2);
  B(960, 560, 470, 520, 82, C.slate);
  B(890, 612, 470, 562, 50, C.pale);
  B(910, 652, 545, 612, 44, '#c4c6d0');
  B(990, 600, 560, 556, 90, C.slate2);
  B(1010, 640, 620, 646, 70, C.navy);
  B(1000, 585, 690, 535, 60, '#6f7aa0');
  // head
  g.fillStyle = C.head;
  g.beginPath();
  g.moveTo(950, 560);
  g.bezierCurveTo(1030, 528, 1140, 560, 1186, 640);
  g.bezierCurveTo(1202, 690, 1182, 732, 1150, 746);
  g.bezierCurveTo(1080, 762, 1000, 742, 960, 702);
  g.closePath();
  g.fill();
  hkBlade(g, 960, 566, 815, 512, 40, C.navy);
  hkBlade(g, 990, 560, 875, 520, 32, C.navy2);
  g.fillStyle = C.belly;
  g.beginPath();
  g.moveTo(962, 692);
  g.bezierCurveTo(1022, 680, 1100, 690, 1162, 722);
  g.bezierCurveTo(1122, 772, 1040, 782, 962, 760);
  g.fill();
  g.fillStyle = C.mask;
  g.beginPath();
  g.moveTo(1018, 652);
  g.bezierCurveTo(1060, 630, 1122, 640, 1152, 672);
  g.bezierCurveTo(1132, 706, 1070, 714, 1030, 692);
  g.fill();
  if (pose.glow) {
    g.shadowColor = '#ff7a2a';
    g.shadowBlur = (10 + 34 * pose.glow) * (pose.px || 1);
  }
  g.fillStyle = pose.glow
    ? `rgb(255,${(170 - 80 * pose.glow) | 0},${(60 - 30 * pose.glow) | 0})`
    : C.eye;
  g.beginPath();
  g.ellipse(1100, 680, 30, 23, HD(8), 0, 7);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = C.pupil;
  g.beginPath();
  g.arc(1110, 686, 10, 0, 7);
  g.fill();
  g.fillStyle = C.mask;
  g.beginPath();
  g.moveTo(1048, 650);
  g.lineTo(1152, 664);
  g.lineTo(1148, 678);
  g.lineTo(1052, 665);
  g.closePath();
  g.fill(); // scowl
  // beak
  g.fillStyle = C.beak;
  g.beginPath();
  g.moveTo(1140, 672);
  g.bezierCurveTo(1190, 664, 1232, 700, 1236, 746);
  g.bezierCurveTo(1238, 772, 1226, 792, 1214, 800);
  g.bezierCurveTo(1212, 772, 1198, 750, 1172, 744);
  g.bezierCurveTo(1150, 740, 1134, 736, 1124, 720);
  g.closePath();
  g.fill();
  g.fillStyle = C.beak2;
  g.beginPath();
  g.moveTo(1214, 800);
  g.bezierCurveTo(1212, 772, 1198, 750, 1172, 744);
  g.lineTo(1186, 762);
  g.bezierCurveTo(1202, 772, 1210, 784, 1214, 800);
  g.fill();
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
