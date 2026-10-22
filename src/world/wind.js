import {
  DISTANCE_SCALE,
  WIND_CAP_EVERY_M,
  WIND_EVERY_M,
  WIND_MAX_LVL,
  WIND_START_M,
} from '../config/game.js';
import { effects, session, viewport, world } from '../game/state.js';
// strongest possible level rises by 1 every 500 m after the wind starts, up to 5
export function windCap(m) {
  return Math.max(1, Math.min(WIND_MAX_LVL, 1 + Math.floor((m - WIND_START_M) / WIND_CAP_EVERY_M)));
}
export function updateWind(dt) {
  if (session.phase !== 'play') return;
  const m = session.distance / DISTANCE_SCALE;
  if (m >= world.wind.next) {
    const first = world.wind.lvl === 0;
    let ang;
    do {
      ang = (((Math.random() * 8) | 0) * Math.PI) / 4;
    } while (
      !first &&
      Math.abs(Math.atan2(Math.sin(ang - world.wind.ang), Math.cos(ang - world.wind.ang))) < 0.1
    );
    world.wind.ang = ang;
    world.wind.lvl = 1 + ((Math.random() * windCap(m)) | 0); // random 1..cap, so calm-ish winds still turn up
    const S = [0, 0.6, 1.1, 1.6, 2.1, 2.6][world.wind.lvl];
    world.wind.tx = Math.cos(ang) * S * viewport.width * 0.06;
    world.wind.ty = Math.sin(ang) * S * viewport.height * 0.12;
    world.wind.next = (first ? WIND_START_M : world.wind.next) + WIND_EVERY_M;
    effects.labels.push({
      x: viewport.width / 2,
      y: viewport.height * 0.36,
      txt: first ? 'ลมเริ่มพัด!' : 'ลมเปลี่ยนทิศ!',
      col: '#cfe0ff',
      life: 2,
      big: true,
    });
  }
  world.wind.x += (world.wind.tx - world.wind.x) * Math.min(1, dt * 1.5);
  world.wind.y += (world.wind.ty - world.wind.y) * Math.min(1, dt * 1.5); // ease into the new wind
  const str = Math.hypot(
    world.wind.x / (viewport.width * 0.06),
    world.wind.y / (viewport.height * 0.12),
  );
  if (Math.random() < dt * str * 14)
    world.windParticles.push({
      x: Math.random() * viewport.width,
      y: Math.random() * (viewport.waterY - 10),
      life: 1,
      len: 12 + str * 10,
    });
  const dirx = Math.cos(world.wind.ang),
    diry = Math.sin(world.wind.ang);
  for (const p of world.windParticles) {
    p.x += (dirx * (160 + 60 * str) - session.speed * 0.5) * dt;
    p.y += diry * (160 + 60 * str) * dt;
    p.life -= dt * 1.3;
  }
  world.windParticles = world.windParticles.filter((p) => p.life > 0);
}
