import { buyItem, initializeGame, resumeRun, revive, startRun } from './game/lifecycle.js';
import { startLoop } from './game/loop.js';
import { initCanvas } from './platform/canvas.js';
import { bindInput } from './platform/input.js';
import { resize } from './platform/viewport.js';
import { renderHud } from './ui/hud.js';
import { bindPanels, renderPanels } from './ui/panels.js';
import { loadArt } from './platform/svg-art.js';

const startPanel = document.getElementById('start');
const status = startPanel.querySelector('.go');
async function boot() {
  startPanel.setAttribute('aria-busy', 'true');
  status.textContent = 'กำลังโหลดภาพ…';
  try {
    await loadArt();
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
    startPanel.setAttribute('aria-busy', 'false');
    status.textContent = 'แตะเพื่อเริ่ม';
  } catch (error) {
    console.error(error);
    startPanel.setAttribute('aria-busy', 'false');
    status.textContent = 'โหลดภาพไม่สำเร็จ ';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'revive';
    retry.textContent = 'ลองอีกครั้ง';
    retry.addEventListener('click', boot, { once: true });
    status.append(retry);
  }
}
boot();
