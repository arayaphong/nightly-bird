/** Sole writer of world positions, including attached objects and effect particles. */
export class PhysicsSystem {
  place(object, x, y, { resetPrevious = true } = {}) {
    const position = object.transform ?? object;
    position.x = x;
    position.y = y;
    if (resetPrevious && object.body) object.body.previous = { x, y };
  }
  move(object, dx, dy) {
    const position = object.transform ?? object;
    this.place(object, position.x + dx, position.y + dy, { resetPrevious: false });
  }
  begin(objects) {
    for (const object of objects)
      if (object.body) {
        object.body.previous = { ...object.transform };
        object.body.ax = object.body.ay = 0;
      }
  }
  integrate(objects, dt) {
    for (const object of objects) {
      const body = object.body;
      if (!body?.enabled || object.removing || !['dynamic', 'kinematic'].includes(body.mode))
        continue;
      if (body.mode === 'dynamic') {
        body.vx += body.ax * dt;
        body.vy += body.ay * dt;
      }
      this.move(object, body.vx * dt, body.vy * dt);
    }
  }
  attach(child, parent, anchor) {
    for (let ancestor = parent; ancestor; ancestor = ancestor.body?.attachment?.parent)
      if (ancestor === child) throw new Error('Attachment cycle');
    child.body.attachment = { parent, anchor };
    child.body.mode = 'attached';
    child.vx = child.vy = 0;
    this.syncAttachments([child]);
    child.body.previous = { ...child.transform };
  }
  detach(child) {
    child.body.attachment = null;
    child.body.mode = 'dynamic';
  }
  syncAttachments(objects) {
    const done = new Set();
    const visit = (object) => {
      if (done.has(object)) return;
      done.add(object);
      const attachment = object.body?.attachment;
      if (!attachment) return;
      if (attachment.parent.removing || !attachment.parent.platform) {
        this.detach(object);
        return;
      }
      visit(attachment.parent);
      const point = attachment.anchor(attachment.parent);
      this.place(object, point.x, point.y, { resetPrevious: false });
    };
    objects.forEach(visit);
  }
  clamp(object, { left = -Infinity, right = Infinity, top = -Infinity, bottom = Infinity }) {
    const x = Math.max(left, Math.min(right, object.x));
    const y = Math.max(top, Math.min(bottom, object.y));
    if (x !== object.x)
      object.vx = x === left ? Math.max(0, object.vx) : Math.min(0, object.vx);
    if (y !== object.y)
      object.vy = y === top ? Math.max(0, object.vy) : Math.min(0, object.vy);
    this.place(object, x, y, { resetPrevious: false });
  }
}
