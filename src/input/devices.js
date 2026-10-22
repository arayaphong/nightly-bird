import { PlatformObject } from '../core/object.js';

class InputDevice extends PlatformObject {
  constructor(options) {
    super(options);
    this.listeners = [];
  }
  listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    this.listeners.push(() => target.removeEventListener(type, callback, options));
  }
  attach(platform) {
    super.attach(platform);
    this.router = platform.get('input');
  }
  detach() {
    this.listeners.splice(0).forEach((remove) => remove());
    this.router?.clear();
    super.detach();
  }
}
export class HIDTap extends InputDevice {
  constructor({ target, host = globalThis, document: doc = globalThis.document } = {}) {
    super({ id: 'tap' });
    this.target = target;
    this.host = host;
    this.document = doc;
  }
  attach(platform) {
    super.attach(platform);
    this.listen(
      this.target,
      'pointerdown',
      (event) => {
        if (
          event.button !== 0 ||
          event.target?.closest?.('button,a,input,select,textarea,[role="button"]')
        )
          return;
        event.preventDefault();
        this.router.set(`pointer-${event.pointerId}`, 'flap', true);
      },
      { passive: false },
    );
    for (const type of ['pointerup', 'pointercancel'])
      this.listen(this.host, type, (event) =>
        this.router.releaseSource(`pointer-${event.pointerId}`),
      );
    this.listen(this.host, 'blur', () => this.router.clear());
    if (this.document)
      this.listen(this.document, 'visibilitychange', () => {
        if (this.document.hidden) this.router.clear();
      });
  }
}
export class HIDKeyboard extends InputDevice {
  constructor({ target = globalThis, document: doc = globalThis.document } = {}) {
    super({ id: 'keyboard' });
    this.target = target;
    this.document = doc;
  }
  attach(platform) {
    super.attach(platform);
    this.listen(this.target, 'keydown', (event) => {
      if (
        event.repeat ||
        event.target?.closest?.('button,a,input,select,textarea,[contenteditable="true"]')
      )
        return;
      if (['Space', 'ArrowUp'].includes(event.code)) {
        event.preventDefault();
        this.router.set(`key-${event.code}`, 'flap', true);
      } else if (['Escape', 'KeyP'].includes(event.code)) platform.command('pause');
    });
    this.listen(this.target, 'keyup', (event) =>
      this.router.releaseSource(`key-${event.code}`),
    );
    this.listen(this.target, 'blur', () => this.router.clear());
    if (this.document)
      this.listen(this.document, 'visibilitychange', () => {
        if (this.document.hidden) this.router.clear();
      });
  }
}
/** Optional adapter: inject poller for tests or register when gamepad controls are wanted. */
export class HIDGamepad extends InputDevice {
  constructor({ poller = () => navigator.getGamepads?.() ?? [] } = {}) {
    super({ id: 'gamepad' });
    this.poller = poller;
    this.connected = new Set();
  }
  poll() {
    const seen = new Set();
    for (const pad of this.poller())
      if (pad?.connected) {
        const source = `gamepad-${pad.index}`;
        seen.add(source);
        this.router.set(source, 'flap', !!pad.buttons[0]?.pressed);
        this.router.set(source, 'pause', !!pad.buttons[9]?.pressed);
      }
    for (const source of this.connected)
      if (!seen.has(source)) this.router.releaseSource(source);
    this.connected = seen;
  }
}
