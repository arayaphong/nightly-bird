import { DISTANCE_SCALE, STAGE_CLOUD_M, STAGE_FISH_M, STAGE_HAWK_M } from '../config/game.js';
import { respawn } from '../enemies/model.js';
import { effects, enemies, session, viewport, world } from '../game/state.js';
export function updateStages() {
  if (session.phase !== 'play') return;
  const m = session.distance / DISTANCE_SCALE;
  const stages = [
    [
      STAGE_FISH_M,
      () => {
        respawn('fish');
      },
      'ระวัง! ปลามาแล้ว',
      '#bfe9ee',
    ],
    [
      STAGE_HAWK_M,
      () => {
        if (!enemies.hawk.locked) return false;
        respawn('hawk');
      },
      'ระวัง! เหยี่ยวราตรีมาแล้ว',
      '#d9c2ff',
    ],
    [
      STAGE_CLOUD_M,
      () => {
        world.cloudTimer = 0.5;
      },
      'ระวัง! เมฆฝนเริ่มก่อตัว',
      '#ffe27a',
    ],
  ];
  while (world.stageShown < stages.length && m >= stages[world.stageShown][0]) {
    const [, go, txt, col] = stages[world.stageShown];
    if (go() !== false)
      effects.labels.push({
        x: viewport.width / 2,
        y: viewport.height * 0.36,
        txt,
        col,
        life: 2.2,
        big: true,
      });
    world.stageShown++;
  }
}
