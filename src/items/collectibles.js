import { BALLOON_COLS } from '../../assets/art/items.js';
import { CHEW_TIME } from '../config/animation.js';
import {
  AGI_MAX,
  AGI_STEP,
  BOOST_MULT,
  BOOST_TIME,
  DISTANCE_SCALE,
  MAGNET_TIME,
  RAINBOW_CHANCE,
  STAGE_CLOUD_M,
  SUIT_LEAD_M,
} from '../config/game.js';
import { bird, effects, enemies, items, session, uiState, viewport } from '../game/state.js';
import { magnetPull } from './magnet.js';
function addWorm(x, y, txt, n = 8) {
  bird.worms = (bird.worms || 0) + 1;
  effects.labels.push({
    x: bird.x,
    y: bird.y - bird.r * 2,
    txt,
    col: '#ffc6d2',
    life: 1.1,
  });
  for (let i = 0; i < n; i++)
    effects.feathers.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 120,
      vy: (Math.random() - 0.6) * 120,
      life: 0.6,
      rot: 0,
      c: i % 2 ? '#ff9fb4' : '#e2708a',
    });
}
// the last 150 m before the rain clouds: every gift is a lightning suit until one is caught
function spawnGift(suit) {
  const lo = viewport.highY + viewport.height * 0.06,
    hi = viewport.dangerY - viewport.height * 0.14;
  items.gifts.push({
    suit: !!suit,
    x: viewport.width + 40,
    y: lo + Math.random() * Math.max(1, hi - lo),
    ph: Math.random() * 6,
    col: BALLOON_COLS[(Math.random() * 4) | 0],
    popped: false,
  });
}
export function giftParts(g) {
  const br = bird.r * 1.25;
  return {
    bx: g.x,
    by: g.y - br * 1.6,
    br,
    cx: g.x + Math.sin(session.time * 2 + g.ph) * 3,
    cy: g.y + br * 1.3,
    cs: bird.r * 1.3,
  };
}
export function updateGifts(dt) {
  const play = session.phase === 'play';
  if (play) {
    const suitPhase =
      !items.suitGranted && session.distance / DISTANCE_SCALE >= STAGE_CLOUD_M - SUIT_LEAD_M;
    if (suitPhase) {
      if (items.gifts.some((g) => g.suit && !g.popped))
        items.giftTimer = Math.max(items.giftTimer, 0.5); // one suit balloon at a time; the next follows soon after a miss
      else items.giftTimer = Math.min(items.giftTimer, 1.5);
    }
    items.giftTimer -= dt;
    if (items.giftTimer <= 0) {
      spawnGift(suitPhase);
      items.giftTimer = 9 + Math.random() * 7;
    }
    if (bird.inv > 0) bird.inv -= dt;
    if (bird.zinv > 0) bird.zinv -= dt;
  }
  for (const g of items.gifts) {
    if (play) g.x -= session.speed * 0.75 * dt;
    g.y -= 6 * dt;
    magnetPull(g, bird.x, bird.y, dt);
    if (!g.popped && play && bird.alive) {
      const p = giftParts(g);
      if (
        Math.hypot(bird.x - p.bx, bird.y - p.by) < bird.r + p.br ||
        Math.hypot(bird.x - p.cx, bird.y - p.cy) < bird.r + p.cs * 0.7
      ) {
        g.popped = true;
        // what the box can hold depends on which hazards are already in play
        // gifts never contain worms: the magnet is always possible; helmet+gun once fish/hawk are out; suit once clouds are out
        const pool = [['magnet', '+ แม่เหล็ก 10 วิ', '#ffb0b0']];
        if (!enemies.fish.locked || !enemies.hawk.locked)
          pool.push(['helmet', '+ หมวกนิรภัย', '#ffe08a'], ['gun', '+ ปืน', '#ffc2b0']);
        if (session.distance / DISTANCE_SCALE >= STAGE_CLOUD_M)
          pool.push(['suit', '+ ชุดกันฟ้าผ่า', '#bfe3ff']);
        let ITEMS = pool.length ? pool[(Math.random() * pool.length) | 0] : null;
        if (g.suit) {
          ITEMS = ['suit', '+ ชุดกันฟ้าผ่า', '#bfe3ff'];
          items.suitGranted = true;
        } // caught: gifts go back to the normal random pool
        if (ITEMS[0] === 'magnet' ? items.magnetTime > 0 : bird[ITEMS[0]])
          addWorm(bird.x, bird.y, 'มีอยู่แล้ว → +1 หนอน'); // already have it: becomes a worm
        else if (ITEMS[0] === 'magnet') {
          items.magnetTime = MAGNET_TIME;
          effects.labels.push({
            x: bird.x,
            y: bird.y - bird.r * 2,
            txt: ITEMS[1],
            col: ITEMS[2],
            life: 1,
          });
        } else {
          bird[ITEMS[0]] = true;
          effects.labels.push({
            x: bird.x,
            y: bird.y - bird.r * 2,
            txt: ITEMS[1],
            col: ITEMS[2],
            life: 1,
          });
        }
        for (let i = 0; i < 16; i++)
          effects.feathers.push({
            x: p.bx,
            y: p.by,
            vx: (Math.random() - 0.5) * 260,
            vy: (Math.random() - 0.6) * 220,
            life: 1,
            rot: Math.random() * 6,
            c: i % 2 ? g.col : '#ffe27a',
          });
        for (let i = 0; i < 10; i++)
          effects.feathers.push({
            x: p.cx,
            y: p.cy,
            vx: (Math.random() - 0.5) * 160,
            vy: -Math.random() * 200,
            life: 1,
            rot: Math.random() * 6,
            c: ['#ffffff', '#ffe27a', '#9ff0ff'][i % 3],
          });
      }
    }
  }
  items.gifts = items.gifts.filter((g) => !g.popped && g.x > -60);
}
export function updateFlies(dt) {
  const play = session.phase === 'play';
  if (play) {
    items.fireflyTimer -= dt;
    if (items.fireflyTimer <= 0) {
      const n = 1 + ((Math.random() * 3) | 0),
        y0 = viewport.height * 0.12 + Math.random() * (viewport.waterY - viewport.height * 0.2);
      for (let i = 0; i < n; i++)
        items.fireflies.push({
          x: viewport.width + 20 + i * 28,
          y: y0 + (Math.random() - 0.5) * 50,
          ph: Math.random() * 6,
          bl: Math.random() * 6,
          rainbow: Math.random() < RAINBOW_CHANCE,
        });
      items.fireflyTimer = 2 + Math.random() * 3;
    }
  }
  for (const f of items.fireflies) {
    if (play) f.x -= session.speed * 0.8 * dt;
    f.x += Math.sin(session.time * 2.3 + f.ph) * 22 * dt;
    f.y += Math.cos(session.time * 1.9 + f.ph * 1.3) * 26 * dt;
    magnetPull(f, bird.x + bird.r * 1.6, bird.y, dt);
    (f.tr || (f.tr = [])).push([f.x, f.y]);
    if (f.tr.length > 10) f.tr.shift();
    if (
      play &&
      bird.alive &&
      !f.eaten &&
      Math.hypot(f.x - (bird.x + bird.r * 1.6), f.y - bird.y) < bird.r * 1.3 + 4
    ) {
      // beak end snaps it up
      f.eaten = true;
      bird.chewT = CHEW_TIME; // munch munch
      if (f.rainbow) {
        // rainbow firefly: BOOST_MULT times flight speed for a while (eating another refreshes the timer)
        items.boostTime = BOOST_TIME;
        effects.labels.push({
          x: bird.x,
          y: bird.y - bird.r * 2,
          txt: 'ความเร็ว ×' + BOOST_MULT + '!',
          col: '#fff',
          life: 1.1,
        });
        const h0 = Math.random() * 360;
        for (let i = 0; i < 4; i++)
          effects.feathers.push({
            x: f.x,
            y: f.y,
            vx: (Math.random() - 0.5) * 180,
            vy: (Math.random() - 0.5) * 180,
            life: 0.8,
            rot: 0,
            c: `hsl(${h0 + i * 90},100%,65%)`,
          });
        continue;
      } // 4 sparks, rainbow hues
      const full = bird.agi >= AGI_MAX - 1e-9;
      if (full)
        addWorm(f.x, f.y, 'AGI เต็ม → +1 หนอน', 2); // full AGI: the firefly turns into a worm (2 pink sparks + 2 green below = 4)
      else {
        bird.agi = Math.min(AGI_MAX, +(bird.agi + AGI_STEP).toFixed(2));
        uiState.agiBump = true;
        effects.labels.push({
          x: bird.x,
          y: bird.y - bird.r * 2,
          txt: '+' + AGI_STEP.toFixed(2) + ' AGI',
          col: '#9dff2e',
          life: 0.9,
        });
      }
      for (let i = 0; i < (full ? 2 : 4); i++)
        effects.feathers.push({
          x: f.x,
          y: f.y,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120,
          life: 0.6,
          rot: 0,
          c: '#9dff2e',
        }); // 4 sparks per firefly
    }
  }
  items.fireflies = items.fireflies.filter((f) => !f.eaten && f.x > -30);
}
