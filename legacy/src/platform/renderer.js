export class Renderer {
  constructor({
    canvas,
    viewFor,
    reducedMotion = () =>
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    if (!this.context) throw new Error('Canvas 2D is not available');
    this.viewFor = viewFor;
    this.reducedMotion = reducedMotion;
  }
  render(objects) {
    const context = this.context,
      platform = objects[0]?.platform;
    if (!platform) return;
    const viewport = platform.get('viewport'),
      effects = platform.get('effects');
    context.setTransform(viewport.pixelRatio, 0, 0, viewport.pixelRatio, 0, 0);
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.save();
    if (effects.shake > 0 && !this.reducedMotion()) {
      const amount = effects.shake * 16;
      context.translate(
        (platform.cosmeticRandom() - 0.5) * amount,
        (platform.cosmeticRandom() - 0.5) * amount,
      );
    }
    const entries = objects
      .flatMap((object) => object.renderEntries?.() ?? [])
      .sort((a, b) => a.layer - b.layer);
    for (const entry of entries) {
      context.save();
      entry.draw();
      context.restore();
    }
    context.restore();
    for (const object of objects) object.renderUI?.();
  }
}
