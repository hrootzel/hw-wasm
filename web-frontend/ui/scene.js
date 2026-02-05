// Scene graph - Node, Container, Page
import { Rect } from '../util/math.js';

export class Node {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.visible = true;
    this.alpha = 1;
    this.parent = null;
    this.children = [];
    this.interactive = false;
  }

  get bounds() { return new Rect(this.x, this.y, this.width, this.height); }

  addChild(node) {
    if (node.parent) node.parent.removeChild(node);
    node.parent = this;
    this.children.push(node);
    return node;
  }

  removeChild(node) {
    const i = this.children.indexOf(node);
    if (i >= 0) {
      this.children.splice(i, 1);
      node.parent = null;
    }
    return node;
  }

  removeAllChildren() {
    for (const c of this.children) c.parent = null;
    this.children = [];
  }

  localToGlobal(lx, ly) {
    let gx = lx + this.x;
    let gy = ly + this.y;
    let p = this.parent;
    while (p) {
      gx += p.x;
      gy += p.y;
      p = p.parent;
    }
    return { x: gx, y: gy };
  }

  globalToLocal(gx, gy) {
    const origin = this.localToGlobal(0, 0);
    return { x: gx - origin.x, y: gy - origin.y };
  }

  hitTest(gx, gy) {
    if (!this.visible) return false;
    const local = this.globalToLocal(gx, gy);
    return local.x >= 0 && local.x < this.width &&
           local.y >= 0 && local.y < this.height;
  }

  // Override in subclasses
  draw(ctx) {
    if (!this.visible) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha *= this.alpha;
    this.drawSelf(ctx);
    for (const child of this.children) {
      child.draw(ctx);
    }
    ctx.restore();
  }

  drawSelf(ctx) {
    // Override in subclasses
  }

  update(dt) {
    for (const child of this.children) {
      child.update(dt);
    }
  }

  // Event handlers - override in subclasses
  onMouseDown(e) {}
  onMouseUp(e) {}
  onMouseMove(e) {}
  onMouseEnter(e) {}
  onMouseLeave(e) {}
}

export class Container extends Node {
  constructor() {
    super();
    this.clip = false;
  }

  drawSelf(ctx) {
    if (this.clip) {
      ctx.beginPath();
      ctx.rect(0, 0, this.width, this.height);
      ctx.clip();
    }
  }
}

export class Page extends Container {
  constructor() {
    super();
    this.width = 1024;
    this.height = 768;
  }

  draw(ctx) {
    super.draw(ctx);
    // Draw dropdown overlays on top
    this._drawOverlays(ctx, this);
  }

  _drawOverlays(ctx, node) {
    if (node.drawOverlay && node.visible) {
      node.drawOverlay(ctx);
    }
    for (const child of node.children) {
      this._drawOverlays(ctx, child);
    }
  }

  onEnter() {}
  onExit() {}
  onResize(w, h) {}
}
