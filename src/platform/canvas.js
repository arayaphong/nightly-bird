export let cv = null;
export let cx = null;
export function initCanvas(canvas) {
  cv = canvas;
  cx = canvas.getContext('2d');
  if (!cx) throw new Error('Canvas 2D is not available');
}
