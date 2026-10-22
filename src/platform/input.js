import { controls, session } from '../game/state.js';
export function bindInput({ onStart }) {
  function press(event) {
    event.preventDefault();
    if (session.phase === 'shop') return;
    controls.holding = true;
    if (session.phase === 'ready') onStart();
    else if (session.phase === 'dead' && session.overShown) {
      if (event.target?.closest?.('#revive')) {
        controls.holding = false;
        return;
      }
      onStart();
    }
  }
  function release() {
    controls.holding = false;
  }
  addEventListener('pointerdown', press, {
    passive: false,
  });
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  addEventListener('keydown', (event) => {
    if ((event.code === 'Space' || event.code === 'ArrowUp') && !event.repeat) press(event);
  });
  addEventListener('keyup', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') release();
  });
}
