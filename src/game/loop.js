import { MAX_FRAME_DELTA } from '../config/game.js';
import { session } from './state.js';
import { updateGame } from './update.js';
import { renderGame } from '../rendering/renderer.js';
import { renderHud } from '../ui/hud.js';
import { renderPanels } from '../ui/panels.js';
export function startLoop() {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(MAX_FRAME_DELTA, (now - last) / 1000);
    last = now;
    if (session.phase !== 'shop') updateGame(dt);
    renderGame();
    renderHud();
    renderPanels();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
