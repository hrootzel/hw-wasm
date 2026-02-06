// Utility functions
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }

export class Point {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  clone() { return new Point(this.x, this.y); }
}

export class Rect {
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x; this.y = y; this.width = w; this.height = h;
  }
  contains(px, py) {
    return px >= this.x && px < this.x + this.width &&
           py >= this.y && py < this.y + this.height;
  }
  clone() { return new Rect(this.x, this.y, this.width, this.height); }
}
