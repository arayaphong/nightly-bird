import { AGI_MAX, BOOST_MULT, DISTANCE_SCALE } from '../config/game.js';
import { PlatformObject } from '../core/object.js';
export class HUD extends PlatformObject {
  constructor({ document }) {
    super({ id: 'hud' });
    this.document = document;
    this.uiState = { agiBump: false };
  }
  attach(platform) {
    super.attach(platform);
    const { bird, items, session, world } = this.view;
    const document = this.document,
      uiState = this.uiState;
    const previous = new Map();
    function changed(key, value) {
      if (previous.has(key) && previous.get(key) === value) return false;
      previous.set(key, value);
      return true;
    }
    function setWorms() {
      const e = document.getElementById('worms');
      e.hidden = !session.worms;
      document.getElementById('wormN').textContent = 'หนอน ×' + session.worms;
    }
    /* Magnet: for MAGNET_TIME seconds, fireflies and gift balloons inside MAGNET_R are pulled to the bird. */
    // pull radius: 20% of the screen
    function setMagnet() {
      const e = document.getElementById('magnet');
      if (!e) return;
      e.hidden = !(items.magnetTime > 0);
      document.getElementById('magnetN').textContent =
        'แม่เหล็ก · ' + Math.ceil(items.magnetTime) + ' วิ';
    }
    function setItem() {
      document.getElementById('item').hidden = !bird.helmet;
      document.getElementById('suit').hidden = !bird.suit;
      document.getElementById('gun').hidden = !bird.gun;
    }
    function showAgi(bump) {
      const e = document.getElementById('agi');
      e.innerHTML =
        'AGI <b>' +
        bird.agi.toFixed(2) +
        '</b>' +
        (bird.agi >= AGI_MAX - 1e-9 ? ' สูงสุด' : '');
      if (bump) {
        e.classList.remove('up');
        void e.offsetWidth;
        e.classList.add('up');
      }
    }
    // rainbow firefly: ×4 flight speed for 8 s
    function setBoost() {
      const e = document.getElementById('boost');
      if (!e) return;
      e.hidden = !(items.boostTime > 0);
      document.getElementById('boostN').textContent =
        'เร็ว ×' + BOOST_MULT + ' · ' + Math.ceil(items.boostTime) + ' วิ';
    }
    function setWindHud() {
      const e = document.getElementById('wind');
      if (!e) return;
      e.className = 'wind' + (world.wind.lvl ? ' s' + world.wind.lvl : ' calm');
      document.getElementById('windArrow').style.transform = `rotate(${world.wind.ang}rad)`;
      document.getElementById('windLbl').textContent = world.wind.lvl
        ? ['', 'ลมอ่อน', 'ลมปานกลาง', 'ลมค่อนข้างแรง', 'ลมแรง', 'ลมแรงมาก'][world.wind.lvl]
        : 'ลมสงบ';
      [...document.getElementById('windBars').children].forEach((b, i) =>
        b.classList.toggle('on', i < world.wind.lvl),
      );
    }
    function renderHud() {
      const score = Math.round(session.distance / DISTANCE_SCALE);
      if (changed('score', score))
        document.getElementById('score').firstChild.nodeValue = score;
      if (changed('best', session.best))
        document.getElementById('best').textContent = 'สถิติ ' + session.best + ' ม.';
      if (changed('agi', bird.agi) || uiState.agiBump) showAgi(uiState.agiBump);
      uiState.agiBump = false;
      if (changed('worms', session.worms)) setWorms();
      if (changed('magnet', Math.ceil(items.magnetTime))) setMagnet();
      if (changed('equipment', `${!!bird.helmet}:${!!bird.suit}:${!!bird.gun}`)) setItem();
      if (changed('boost', Math.ceil(items.boostTime))) setBoost();
      if (changed('wind', `${world.wind.lvl}:${world.wind.ang}`)) setWindHud();
    }

    this.renderUI = renderHud;
  }
  event(event) {
    if (event.type === 'agi-changed') this.uiState.agiBump = true;
  }
  detach() {
    this.renderUI = null;
    super.detach();
  }
}
