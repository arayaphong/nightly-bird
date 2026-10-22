import { createGame } from './game/create-game.js';

const startPanel = document.getElementById('start');
const status = startPanel.querySelector('.go');
let platform;
export function getPlatform() {
  return platform;
}

async function boot() {
  startPanel.setAttribute('aria-busy', 'true');
  status.textContent = 'กำลังโหลดภาพ…';
  try {
    platform = createGame({
      canvas: document.getElementById('c'),
      document,
      host: window,
      width: innerWidth,
      height: innerHeight,
      pixelRatio: devicePixelRatio,
    });
    await platform.load();
    startPanel.setAttribute('aria-busy', 'false');
    status.textContent = 'แตะเพื่อเริ่ม';
    platform.render();
    platform.start();
  } catch (error) {
    platform?.dispose();
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
