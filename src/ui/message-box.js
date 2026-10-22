import { PlatformObject } from '../core/object.js';
import { WORMS_TO_REVIVE } from '../config/game.js';

/** DOM owns focus, labels and buttons; actions are commands, never direct game mutations. */
export class MessageBox extends PlatformObject {
  constructor({ document }) {
    super({ id: 'messages' });
    this.document = document;
    this.listeners = [];
    this.previous = '';
  }
  attach(platform) {
    super.attach(platform);
    const d = this.document;
    this.listen(d.getElementById('revive'), 'click', () => platform.command('revive'));
    this.listen(d.getElementById('pauseGo'), 'click', () => platform.command('pause'));
  }
  listen(element, type, handler) {
    element.addEventListener(type, handler);
    this.listeners.push(() => element.removeEventListener(type, handler));
  }
  renderUI() {
    const d = this.document,
      s = this.platform.get('session');
    const key = JSON.stringify([
      s.phase,
      s.overShown,
      s.deathBy,
      s.best,
      s.score,
      s.newBest,
      s.worms,
    ]);
    if (key === this.previous) return;
    this.previous = key;
    d.getElementById('start').hidden = s.phase !== 'ready';
    d.getElementById('over').hidden = s.phase !== 'dead' || !s.overShown;
    d.getElementById('paused').hidden = s.phase !== 'paused';
    if (s.phase === 'dead' && s.overShown) {
      d.getElementById('overTitle').innerHTML =
        {
          hawk: 'โดนเหยี่ยว<span>โฉบ</span>',
          storm: 'โดนฟ้า<span>ผ่า</span>',
          drown: 'จม<span>น้ำ</span>',
          fish: 'โดนปลา<span>งับ</span>',
        }[s.deathBy] ?? 'จบเกม';
      d.getElementById('overText').textContent = s.newBest
        ? `บินได้ ${s.score} เมตร สถิติใหม่!`
        : `บินได้ ${s.score} เมตร (สถิติ ${s.best} ม.)`;
      const revive = d.getElementById('revive');
      revive.hidden = s.worms < WORMS_TO_REVIVE;
      d.getElementById('reviveSub').textContent = `มีหนอน ${s.worms} ตัว`;
      d.querySelector('#over .go').textContent = revive.hidden
        ? 'แตะเพื่อเล่นอีกครั้ง'
        : 'แตะที่อื่นเพื่อเล่นใหม่';
    }
  }
  detach() {
    this.listeners.splice(0).forEach((remove) => remove());
    super.detach();
  }
}
