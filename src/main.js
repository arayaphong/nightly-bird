import { buyItem, initializeGame, resumeRun, revive, startRun } from './game/lifecycle.js';
import { startLoop } from './game/loop.js';
import { initCanvas } from './platform/canvas.js';
import { bindInput } from './platform/input.js';
import { resize } from './platform/viewport.js';
import { renderHud } from './ui/hud.js';
import { bindPanels, renderPanels } from './ui/panels.js';
initCanvas(document.getElementById('c'));
initializeGame();
addEventListener('resize', resize);
bindInput({
  onStart: startRun,
});
bindPanels({
  onRevive: revive,
  onBuy: buyItem,
  onResume: resumeRun,
});
renderHud();
renderPanels();
startLoop();
