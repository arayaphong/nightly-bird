import { Rule } from '../core/rule.js';
import { SHOP_ITEMS } from '../config/game.js';

export class ShopRule extends Rule {
  ready() {
    const s = this.platform.get('session');
    return s.phase === 'shop' && this.platform.clock.ui - s.shopOpenedAt > 0.4;
  }
  buy(key) {
    const s = this.platform.get('session'),
      bird = this.platform.find('player');
    if (!this.ready() || !SHOP_ITEMS.includes(key) || s.worms < 1 || bird.equipment.has(key))
      return false;
    if (!bird.equip(key)) return false;
    s.worms--;
    return true;
  }
  onCommand(command) {
    if (command.type === 'buy') {
      this.buy(command.key);
      return true;
    }
    if (command.type === 'resume') {
      if (this.ready()) {
        this.platform.get('input').clear();
        this.platform.get('session').setPhase('play');
      }
      return true;
    }
    return false;
  }
}
