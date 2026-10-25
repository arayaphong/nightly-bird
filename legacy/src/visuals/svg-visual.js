/** Artwork is cached by the platform; pose and painter closures belong to one object. */
export class SvgVisual {
  constructor(owner, factory, methods) {
    this.owner = owner;
    this.factory = factory;
    this.methods = methods;
  }
  attach(platform) {
    if (platform.renderer)
      this.painter = this.factory(
        platform.renderer.viewFor(this.owner),
        platform.renderer.context,
        platform.assets,
      );
  }
  entries() {
    return this.painter
      ? this.methods.map(([layer, name]) => ({ layer, draw: () => this.painter[name]() }))
      : [];
  }
  dispose() {
    this.painter = null;
  }
}
