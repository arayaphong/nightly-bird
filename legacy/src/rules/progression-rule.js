import { Rule } from '../core/rule.js';
import { DISTANCE_SCALE, STAGE_FISH_M, STAGE_HAWK_M, STAGE_CLOUD_M } from '../config/game.js';

export class ProgressionRule extends Rule {
  beforeStep() {
    const p = this.platform,
      s = p.get('session');
    if (s.phase !== 'play') return;
    const stages = [
      [STAGE_FISH_M, 'shark', 'ระวัง! ปลาร้ายมาแล้ว', '#ffb5a0'],
      [STAGE_HAWK_M, 'hawk', 'ระวัง! เหยี่ยวราตรีมาแล้ว', '#d9c2ff'],
      [STAGE_CLOUD_M, null, 'ระวัง! เมฆฝนเริ่มก่อตัว', '#ffe27a'],
    ];
    while (
      s.stageShown < stages.length &&
      s.distance / DISTANCE_SCALE >= stages[s.stageShown][0]
    ) {
      const [, tag, message, color] = stages[s.stageShown++];
      if (tag) for (const enemy of p.list(tag)) if (enemy.locked) enemy.respawn();
      if (!tag) p.emit('storms-unlocked');
      p.get('effects').label(message, color);
    }
  }
}
