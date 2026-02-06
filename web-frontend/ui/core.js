// Core - canvas setup, render loop, page management, event routing
import { input } from '../util/input.js';

class Core {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 1366;
    this.height = 768;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.pageStack = [];
    this.running = false;
    this.lastTime = 0;

    this._hoveredNode = null;
    this._activeNode = null;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Initialize input with coordinate transform
    input.init(canvas, (cx, cy) => this._clientToGame(cx, cy));

    // Wire up input events
    input.on('mousedown', (e) => this._onMouseDown(e));
    input.on('mouseup', (e) => this._onMouseUp(e));
    input.on('mousemove', (e) => this._onMouseMove(e));
    input.on('keydown', (e) => this._onKeyDown(e));
    input.on('keyup', (e) => this._onKeyUp(e));
    
    // Mouse wheel
    canvas.addEventListener('wheel', (e) => {
      const pos = this._clientToGame(e.clientX, e.clientY);
      const page = this.currentPage;
      if (page && page.onMouseWheel) {
        page.onMouseWheel({ x: pos.x, y: pos.y, deltaY: e.deltaY, original: e });
      }
    }, { passive: false });
  }

  _resize() {
    const container = this.canvas.parentElement;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // Calculate scale to fit while maintaining aspect ratio
    const scaleX = cw / this.width;
    const scaleY = ch / this.height;
    this.scale = Math.min(scaleX, scaleY);

    const scaledW = Math.floor(this.width * this.scale);
    const scaledH = Math.floor(this.height * this.scale);

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = scaledW + 'px';
    this.canvas.style.height = scaledH + 'px';

    // Calculate offset for centering
    const rect = this.canvas.getBoundingClientRect();
    this.offsetX = rect.left;
    this.offsetY = rect.top;

    // Notify current page
    const page = this.currentPage;
    if (page) page.onResize(this.width, this.height);
  }

  _clientToGame(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.scale,
      y: (clientY - rect.top) / this.scale
    };
  }

  get currentPage() {
    return this.pageStack.length > 0 ? this.pageStack[this.pageStack.length - 1] : null;
  }

  pushPage(page) {
    const prev = this.currentPage;
    if (prev) prev.onExit();
    this.pageStack.push(page);
    page.onEnter();
    page.onResize(this.width, this.height);
  }

  popPage() {
    if (this.pageStack.length === 0) return null;
    const page = this.pageStack.pop();
    page.onExit();
    const next = this.currentPage;
    if (next) next.onEnter();
    return page;
  }

  replacePage(page) {
    this.popPage();
    this.pushPage(page);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
  }

  _loop() {
    if (!this.running) return;

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this._update(dt);
    this._render();

    requestAnimationFrame(() => this._loop());
  }

  _update(dt) {
    const page = this.currentPage;
    if (page) page.update(dt);
  }

  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const page = this.currentPage;
    if (page) page.draw(ctx);
  }

  // Event routing
  _findInteractiveNode(node, x, y) {
    if (!node.visible) return null;

    // Check children in reverse order (top to bottom)
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      const found = this._findInteractiveNode(child, x, y);
      if (found) return found;
    }

    // Check self
    if (node.interactive && node.hitTest(x, y)) {
      return node;
    }

    return null;
  }

  _findOpenDropdown(node, x, y) {
    // Check if this node is an open dropdown
    if (node.open && node.hitTest && node.hitTest(x, y)) {
      return node;
    }
    // Check children
    for (const child of node.children || []) {
      const found = this._findOpenDropdown(child, x, y);
      if (found) return found;
    }
    return null;
  }

  _onMouseMove(e) {
    const page = this.currentPage;
    if (!page) return;

    // Check open dropdowns first (they render on top)
    let node = this._findOpenDropdown(page, e.x, e.y);
    if (!node) {
      node = this._findInteractiveNode(page, e.x, e.y);
    }

    // Handle enter/leave
    if (node !== this._hoveredNode) {
      if (this._hoveredNode) this._hoveredNode.onMouseLeave(e);
      if (node) node.onMouseEnter(e);
      this._hoveredNode = node;
    }

    if (node) node.onMouseMove(e);
  }

  _onMouseDown(e) {
    const page = this.currentPage;
    if (!page) return;

    // Check open dropdowns first (they render on top)
    let node = this._findOpenDropdown(page, e.x, e.y);
    if (!node) {
      node = this._findInteractiveNode(page, e.x, e.y);
    }
    
    // Close all dropdowns EXCEPT the one being clicked
    this._closeAllDropdownsExcept(page, node);
    
    this._activeNode = node;
    if (node) node.onMouseDown(e);
  }

  _closeAllDropdownsExcept(node, exceptNode) {
    if (node !== exceptNode && node.close && typeof node.close === 'function') {
      node.close();
    }
    for (const child of node.children || []) {
      this._closeAllDropdownsExcept(child, exceptNode);
    }
  }

  _onMouseUp(e) {
    const node = this._activeNode;
    if (node) node.onMouseUp(e);
    this._activeNode = null;
  }

  _onKeyDown(e) {
    const page = this.currentPage;
    if (page && page.onKeyDown) page.onKeyDown(e);
  }

  _onKeyUp(e) {
    const page = this.currentPage;
    if (page && page.onKeyUp) page.onKeyUp(e);
  }
}

export const core = new Core();
