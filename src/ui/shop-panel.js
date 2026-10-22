import { PlatformObject } from '../core/object.js';

export class ShopPanel extends PlatformObject {
  constructor({ document }) {
    super({ id: 'shop-panel' });
    this.document = document;
    this.listeners = [];
    this.previous = '';
  }
  attach(platform) {
    super.attach(platform);
    for (const button of this.document.querySelectorAll('.shop-btn')) {
      const click = () => platform.command('buy', { key: button.dataset.item });
      button.addEventListener('click', click);
      this.listeners.push(() => button.removeEventListener('click', click));
    }
    const button = this.document.getElementById('shopGo'),
      click = () => platform.command('resume');
    button.addEventListener('click', click);
    this.listeners.push(() => button.removeEventListener('click', click));
  }
  renderUI() {
    const d = this.document,
      s = this.platform.get('session'),
      bird = this.platform.find('player');
    const key = JSON.stringify([s.phase, s.worms, bird.helmet, bird.suit, bird.gun]);
    if (key === this.previous) return;
    this.previous = key;
    d.getElementById('shop').hidden = s.phase !== 'shop';
    if (s.phase !== 'shop') return;
    d.getElementById('shopWorms').textContent = s.worms;
    for (const button of d.querySelectorAll('.shop-btn')) {
      const own = bird.equipment.has(button.dataset.item);
      button.disabled = own || s.worms < 1;
      button.querySelector('em').textContent = own ? 'มีแล้ว' : '1 หนอน';
    }
  }
  detach() {
    this.listeners.splice(0).forEach((remove) => remove());
    super.detach();
  }
}
