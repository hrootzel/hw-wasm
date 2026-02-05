// Input event normalization
class InputManager {
  constructor() {
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.keysDown = new Set();
    this.listeners = { mousedown: [], mouseup: [], mousemove: [], keydown: [], keyup: [] };
  }

  init(canvas, scaleFunc) {
    this.canvas = canvas;
    this.scaleFunc = scaleFunc; // (clientX, clientY) => {x, y} in game coords

    canvas.addEventListener('mousedown', (e) => this._onMouse('mousedown', e));
    canvas.addEventListener('mouseup', (e) => this._onMouse('mouseup', e));
    canvas.addEventListener('mousemove', (e) => this._onMouse('mousemove', e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => this._onKey('keydown', e));
    window.addEventListener('keyup', (e) => this._onKey('keyup', e));
  }

  _onMouse(type, e) {
    const pos = this.scaleFunc(e.clientX, e.clientY);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    if (type === 'mousedown') this.mouseDown = true;
    if (type === 'mouseup') this.mouseDown = false;

    const evt = { x: pos.x, y: pos.y, button: e.button, original: e };
    for (const fn of this.listeners[type]) fn(evt);
  }

  _onKey(type, e) {
    if (type === 'keydown') this.keysDown.add(e.code);
    if (type === 'keyup') this.keysDown.delete(e.code);

    const evt = { code: e.code, key: e.key, original: e };
    for (const fn of this.listeners[type]) fn(evt);
  }

  on(type, fn) { this.listeners[type]?.push(fn); }
  off(type, fn) {
    const arr = this.listeners[type];
    if (arr) {
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    }
  }
}

export const input = new InputManager();
