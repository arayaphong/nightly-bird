import { AGI_MAX, BOOST_MULT, DISTANCE_SCALE } from '../config/game.js';
import { bird, items, session, uiState, world } from '../game/state.js';
const previous = new Map();
function changed(key, value) {
  if (previous.has(key) && previous.get(key) === value) return false;
  previous.set(key, value);
  return true;
}
function setWorms() {
  const e = document.getElementById('worms');
  e.hidden = !bird.worms;
  document.getElementById('wormN').textContent = 'หนอน ×' + bird.worms;
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
    'AGI <b>' + bird.agi.toFixed(2) + '</b>' + (bird.agi >= AGI_MAX - 1e-9 ? ' สูงสุด' : '');
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
export function renderHud() {
  const score = Math.round(session.distance / DISTANCE_SCALE);
  if (changed('score', score)) document.getElementById('score').firstChild.nodeValue = score;
  if (changed('best', session.best))
    document.getElementById('best').textContent = 'สถิติ ' + session.best + ' ม.';
  if (changed('agi', bird.agi) || uiState.agiBump) showAgi(uiState.agiBump);
  uiState.agiBump = false;
  if (changed('worms', bird.worms)) setWorms();
  if (changed('magnet', Math.ceil(items.magnetTime))) setMagnet();
  if (changed('equipment', `${!!bird.helmet}:${!!bird.suit}:${!!bird.gun}`)) setItem();
  if (changed('boost', Math.ceil(items.boostTime))) setBoost();
  if (changed('wind', `${world.wind.lvl}:${world.wind.ang}`)) setWindHud();
}
