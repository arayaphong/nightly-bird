/** Common lifecycle only. UI, rules and input devices do not need a physics body. */
export class PlatformObject {
  constructor({ id, tags = [], order = 0, scope = 'platform' } = {}) {
    this.id = id;
    this.tags = new Set(tags);
    this.order = order;
    this.scope = scope;
    this.platform = null;
    this.ready = false;
    this.removing = false;
  }
  load(assets) {
    const keys = this.assetKeys ?? [];
    if (keys.some((key) => !assets.has(key))) return assets.loadAll(keys);
  }
  attach(platform) {
    this.platform = platform;
  }
  detach() {
    this.platform = null;
  }
  dispose() {}
}

export class WorldObject extends PlatformObject {
  constructor(options = {}) {
    super(options);
    this.transform = { x: options.x ?? 0, y: options.y ?? 0 };
    this.body = {
      mode: 'dynamic',
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      previous: { ...this.transform },
      attachment: null,
      enabled: true,
    };
  }
  get x() {
    return this.transform.x;
  }
  get y() {
    return this.transform.y;
  }
  get vx() {
    return this.body.vx;
  }
  set vx(value) {
    this.body.vx = value;
  }
  get vy() {
    return this.body.vy;
  }
  set vy(value) {
    this.body.vy = value;
  }
  getColliders() {
    return [];
  }
}
