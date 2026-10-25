import { PlatformObject } from '../core/object.js';

export class GameViewport extends PlatformObject {
  constructor({ width = 480, height = 800, pixelRatio = 1, canvas = null, host = null } = {}) {
    super({ id: 'viewport' });
    Object.assign(this, { canvas, host });
    this.resize(width, height, pixelRatio);
  }
  resize(width, height, pixelRatio = 1) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.pixelRatio = Math.min(2, Math.max(1, pixelRatio));
    this.waterY = this.height * 0.8;
    this.highY = this.height * 0.3;
    this.dangerY = this.waterY - Math.max(46, this.height * 0.085);
    if (this.canvas) {
      this.canvas.width = this.width * this.pixelRatio;
      this.canvas.height = this.height * this.pixelRatio;
      this.canvas.getContext('2d').setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }
    if (this.platform)
      for (const object of this.platform.list()) if (object !== this) object.resize?.(this);
  }
  attach(platform) {
    super.attach(platform);
    if (this.host) {
      this.onResize = () =>
        this.resize(this.host.innerWidth, this.host.innerHeight, this.host.devicePixelRatio);
      this.host.addEventListener('resize', this.onResize);
    }
  }
  detach() {
    this.host?.removeEventListener('resize', this.onResize);
    super.detach();
  }
}
