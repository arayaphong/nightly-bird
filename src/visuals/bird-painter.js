import { BIRD_ANCHOR, BIRD_SPAN } from '../config/art.js';
export function createBirdPainter(view, cx, assets) {
  const { bird, items, session, viewport } = view;
  const art = (name) => assets.art(name);
  const sprite = (name, id) => assets.sprite(name, id);
  const birdWing = () => bird.animation.wing();
  const birdAng = () => bird.angle;
  const blinkOpen = () => bird.animation.blinkOpen();
  const chewAmount = () => bird.animation.chewAmount();
  function drawBirdArt() {
    const wing = birdWing();
    const rotation = (-wing * 58 * Math.PI) / 180;
    const deadEyes = !bird.alive && ['storm', 'drown', 'hawk'].includes(session.deathBy);
    const open = deadEyes ? 1 : blinkOpen();
    const chew = bird.alive ? chewAmount() : 0;
    const scorched = !!bird.zapped;
    const draw = (id, options = {}) =>
      sprite('bird', id).draw(cx, {
        scorched,
        ...options,
      });
    draw('wing-back', {
      angle: rotation * 0.9,
    });
    draw('body');
    if (bird.suit && bird.alive) sprite('suit', 'coat').draw(cx);
    for (const part of art('bird').filter((part) => part.role === 'wing-front')) {
      cx.save();
      cx.translate(part.pivotX, part.pivotY);
      cx.rotate(rotation);
      part.draw(cx, {
        x: part.x - part.pivotX,
        y: part.y - part.pivotY,
        scaleX: 1 - Math.max(0, wing) * 0.18,
        scorched,
      });
      cx.restore();
    }
    draw('crest');
    draw('cheek', {
      y: 282 + chew * 3,
      scaleX: 1 + chew * 0.05,
      scaleY: 1 + chew * 0.05,
    });
    if (bird.suit && bird.alive) sprite('suit', 'hood').draw(cx);
    for (const eye of ['eye-left', 'eye-right']) {
      draw(eye + (deadEyes ? '-dead' : open > 0.4 ? '' : '-white'), {
        scaleY: Math.max(0.06, open),
      });
      if (open < 0.4) draw(eye + '-lid');
    }
    draw('eyebrows');
    const up = (-14 * chew * Math.PI) / 180,
      down = (20 * chew * Math.PI) / 180;
    if (chew > 0.05) {
      // Stretch a loaded triangular mouth layer between the moving jaw tips.
      cx.save();
      cx.transform(
        (4 + 70 * Math.cos(up)) / 100,
        (-8 + 70 * Math.sin(up)) / 100,
        (4 + 66 * Math.cos(down)) / 100,
        (6 + 66 * Math.sin(down)) / 100,
        420,
        326,
      );
      draw('mouth');
      cx.restore();
    }
    draw('beak-upper', {
      angle: up,
    });
    draw('beak-lower', {
      angle: down,
    });
  }
  function drawBird() {
    if (!bird.visible) return;
    const r = bird.r,
      angle = birdAng();
    cx.save();
    if (bird.y > viewport.waterY) cx.globalAlpha = 0.65;
    cx.translate(bird.x, bird.y);
    cx.rotate(angle);
    cx.save();
    const scale = (r * 4.2) / BIRD_SPAN;
    cx.scale(scale, scale);
    cx.translate(-BIRD_ANCHOR[0], -BIRD_ANCHOR[1]);
    drawBirdArt();
    cx.restore();
    if (
      items.magnetTime > 0 &&
      bird.alive &&
      !(items.magnetTime < 2 && Math.sin(session.time * 22) < 0)
    ) {
      sprite('magnet', 'magnet').draw(cx, {
        x: -r * 0.62,
        y: r * 1.2,
        angle: -angle * 0.6,
        scaleX: r / 100,
        scaleY: r / 100,
      });
    }
    for (const key of ['gun', 'helmet'])
      if (bird[key] && bird.alive)
        sprite(key, key).draw(cx, {
          scaleX: r / 100,
          scaleY: r / 100,
        });
    cx.restore();
  }
  function drawBeakForeground() {
    if (!bird.visible || !bird.mouthfuls.size) return;
    const chew = bird.animation.chewAmount(),
      scale = (bird.r * 4.2) / BIRD_SPAN;
    cx.save();
    if (bird.y > viewport.waterY) cx.globalAlpha = 0.65;
    cx.translate(bird.x, bird.y);
    cx.rotate(bird.angle);
    cx.scale(scale, scale);
    cx.translate(-BIRD_ANCHOR[0], -BIRD_ANCHOR[1]);
    sprite('bird', 'beak-upper').draw(cx, { angle: (-14 * chew * Math.PI) / 180 });
    sprite('bird', 'beak-lower').draw(cx, { angle: (20 * chew * Math.PI) / 180 });
    cx.restore();
  }
  return {
    drawBird,
    drawBeakForeground,
  };
}
