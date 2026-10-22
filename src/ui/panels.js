import { DISTANCE_SCALE, WORMS_TO_REVIVE } from '../config/game.js';
import { bird, session, uiState } from '../game/state.js';
let previousView = '';
function refreshShop() {
  document.getElementById('shopWorms').textContent = bird.worms;
  document.querySelectorAll('.shop-btn').forEach((b) => {
    const k = b.dataset.item,
      own = !!bird[k];
    b.disabled = own || bird.worms < 1;
    b.querySelector('em').textContent = own ? 'มีแล้ว' : '1 หนอน';
  });
}
export function renderPanels() {
  const view = JSON.stringify([
    session.phase,
    session.overShown,
    session.deathBy,
    session.best,
    Math.round(session.distance / DISTANCE_SCALE),
    uiState.newBest,
    bird.worms,
    bird.helmet,
    bird.suit,
    bird.gun,
  ]);
  if (view === previousView) return;
  previousView = view;
  document.getElementById('start').hidden = session.phase !== 'ready';
  document.getElementById('over').hidden = session.phase !== 'dead' || !session.overShown;
  document.getElementById('shop').hidden = session.phase !== 'shop';
  if (session.phase === 'shop') refreshShop();
  if (session.phase === 'dead' && session.overShown) {
    const by = session.deathBy,
      score = Math.round(session.distance / DISTANCE_SCALE);
    document.getElementById('overTitle').innerHTML =
      by === 'hawk'
        ? 'โดนเหยี่ยว<span>โฉบ</span>'
        : by === 'storm'
          ? 'โดนฟ้า<span>ผ่า</span>'
          : by === 'drown'
            ? 'จม<span>น้ำ</span>'
            : 'โดนปลา<span>งับ</span>';
    document.getElementById('overText').textContent = uiState.newBest
      ? 'บินได้ ' + score + ' เมตร สถิติใหม่!'
      : 'บินได้ ' + score + ' เมตร (สถิติ ' + session.best + ' ม.)';
    const button = document.getElementById('revive');
    button.hidden = bird.worms < WORMS_TO_REVIVE;
    document.getElementById('reviveSub').textContent = 'มีหนอน ' + bird.worms + ' ตัว';
    document.querySelector('#over .go').textContent = button.hidden
      ? 'แตะเพื่อเล่นอีกครั้ง'
      : 'แตะที่อื่นเพื่อเล่นใหม่';
  }
}
export function bindPanels({ onRevive, onBuy, onResume }) {
  document.getElementById('revive').addEventListener('click', () => {
    if (session.phase === 'dead' && session.overShown && bird.worms >= WORMS_TO_REVIVE) onRevive();
  });
  document
    .querySelectorAll('.shop-btn')
    .forEach((button) => button.addEventListener('click', () => onBuy(button.dataset.item)));
  document.getElementById('shopGo').addEventListener('click', onResume);
}
