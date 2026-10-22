import {
  BLINK_DUR,
  CHEW_BITES,
  CHEW_TIME,
  TAU,
  WING_LAZY_OMEGA,
  WING_OMEGA,
  WING_REST,
} from '../config/animation.js';
import { bird, controls, session, viewport } from '../game/state.js';
function updateWing(dt) {
  const b = bird;
  if (b.th == null) {
    b.th = WING_REST;
    b.wstop = WING_REST;
    b.wspin = 0;
    b.lazyT = 1.5;
  }
  const flapping = b.alive && controls.holding && session.phase === 'play';
  if (flapping) {
    b.th += WING_OMEGA * dt;
    b.wspin = WING_OMEGA;
    b.wstop = null;
    b.lazyT = 1.4 + Math.random() * 1.2;
  } else {
    if (b.wstop == null)
      b.wstop = WING_REST + TAU * Math.ceil((b.th - WING_REST) / TAU - 1e-9); // next 90° ahead of the wing
    if (b.th < b.wstop) {
      b.th = Math.min(b.wstop, b.th + (b.wspin || WING_OMEGA) * dt);
    } // keep turning forward, stop exactly at 90°
    else if (b.alive && (session.phase === 'play' || session.phase === 'ready')) {
      b.lazyT -= dt; // resting: an occasional lazy full turn
      if (b.lazyT <= 0) {
        b.wstop = b.th + TAU;
        b.wspin = WING_LAZY_OMEGA;
        b.lazyT = 1.6 + Math.random() * 1.2;
      }
    }
  }
  if (b.th > TAU * 50) {
    b.th -= TAU * 48;
    if (b.wstop != null) b.wstop -= TAU * 48;
  } // keep the number small, same angle
  b.wing = -Math.cos(b.th);
}
// body centre and tail-to-beak span of the red-bird art
export function blinkOpen() {
  // 1 = open, ~0.08 = shut
  if (!bird.blink) return 1;
  const p = 1 - bird.blink / BLINK_DUR;
  return 1 - 0.92 * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
}
/* Wing rig = one phase angle θ on a circle that only ever turns forward (never backwards, never jumps).
   Rest/glide pose is θ = 90°. Holding: θ turns continuously (flapping). Released: θ keeps turning the same way
   until it reaches the next 90°, then stops there. Pressing again: θ simply carries on from where it is.
   Wing pose shown = −cos θ  (0 at 90° = level glide, +1 = wing low, −1 = wing high). */
export function chewAmount() {
  // 3 quick chomps after eating, each one a little smaller
  const c = bird.chewT || 0;
  if (c <= 0) return 0;
  const p = 1 - c / CHEW_TIME;
  return Math.abs(Math.sin(p * Math.PI * CHEW_BITES)) * (1 - p * 0.45);
}
export function birdWing() {
  return bird.wing ?? 0;
}
export function birdAng() {
  return bird.alive
    ? Math.max(-0.6, Math.min(0.8, bird.vy / (viewport.height * 1.4)))
    : Math.PI * 0.15 + bird.rot;
}
export function updateBirdAnimation(dt) {
  updateWing(dt);
  if (bird.chewT > 0) bird.chewT = Math.max(0, bird.chewT - dt);
  // blinking: a quick blink every 1.5–4.5 s, sometimes a double blink
  if (bird.blink > 0) {
    bird.blink = Math.max(0, bird.blink - dt);
    if (!bird.blink && bird.dbl) {
      bird.dbl = false;
      bird.blinkNext = 0.12;
    }
  } else if (bird.alive !== false) {
    bird.blinkNext = (bird.blinkNext ?? 2) - dt;
    if (bird.blinkNext <= 0) {
      bird.blink = BLINK_DUR;
      bird.dbl = Math.random() < 0.25;
      bird.blinkNext = 1.5 + Math.random() * 3;
    }
  }
}
