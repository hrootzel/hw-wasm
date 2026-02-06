// Controls page - key binding configuration
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { storage } from '../data/storage.js';
import { DEFAULT_BINDINGS, BINDING_LABELS } from '../data/defaults.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';
import { Node } from '../ui/scene.js';
import { getVerticalScrollMetrics, drawVerticalScrollbar, isPointInTrack, scrollFromPointerY } from '../ui/scrollbar.js';

class BindingsViewport extends Node {
  constructor(page) {
    super();
    this.page = page;
    this.interactive = true;
    this.draggingScrollbar = false;
  }

  _scrollMetrics() {
    const trackW = 10;
    const trackPad = 4;
    return getVerticalScrollMetrics({
      scroll: this.page.scrollY,
      contentSize: this.page.bindingItems.length * this.page.rowSpacing,
      viewSize: this.page.listHeight,
      trackX: this.width - trackW - trackPad,
      trackY: trackPad,
      trackW,
      trackH: this.height - trackPad * 2,
      minThumb: 40
    });
  }

  drawSelf(ctx) {
    // Panel background
    ctx.fillStyle = 'rgba(24, 36, 56, 0.78)';
    ctx.strokeStyle = '#88AADD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, 6);
    ctx.fill();
    ctx.stroke();

    // Scrollbar
    const m = this._scrollMetrics();
    drawVerticalScrollbar(ctx, m, {
      trackColor: 'rgba(40,56,84,0.9)',
      thumbColor: '#FFDD44'
    });
  }

  onMouseDown(e) {
    const local = this.globalToLocal(e.x, e.y);
    const m = this._scrollMetrics();
    if (!m.enabled) return;
    if (!isPointInTrack(local.x, local.y, m)) return;

    this.draggingScrollbar = true;
    this.page._setScroll(scrollFromPointerY(local.y, m));
  }

  onMouseMove(e) {
    if (!this.draggingScrollbar) return;
    const local = this.globalToLocal(e.x, e.y);
    const m = this._scrollMetrics();
    if (!m.enabled) return;
    this.page._setScroll(scrollFromPointerY(local.y, m));
  }

  onMouseUp() {
    this.draggingScrollbar = false;
  }

  onMouseLeave() {
    this.draggingScrollbar = false;
  }
}

export class ControlsPage extends BasePage {
  constructor() {
    super('Controls');
    this.bindings = { ...DEFAULT_BINDINGS, ...storage.getBindings() };
    this.waitingForKey = null;
    this._buildUI();
  }

  _buildUI() {
    this.addTitle('Key Bindings');

    // Center the bindings panel for widescreen layouts.
    const contentW = 860;
    const contentX = Math.round((this.width - contentW) / 2);

    // Instructions
    const instr = new Label('Click a binding to change it, then press a key', 'body');
    instr.x = this.width / 2;
    instr.y = 90;
    instr.width = 600;
    instr.height = 30;
    instr.align = 'center';
    instr.color = 'rgba(255,255,255,0.7)';
    this.addChild(instr);

    // Binding list viewport
    this.listTop = 130;
    this.listHeight = 500;
    this.rowSpacing = 36;
    this.scrollY = 0;
    this.leftX = contentX + 30;
    this.rightX = contentX + 430;

    this.bindingsViewport = new BindingsViewport(this);
    this.bindingsViewport.x = contentX;
    this.bindingsViewport.y = this.listTop - 10;
    this.bindingsViewport.width = contentW;
    this.bindingsViewport.height = this.listHeight + 20;
    this.addChild(this.bindingsViewport);

    // Binding rows
    this.bindingItems = [];
    const actions = Object.keys(BINDING_LABELS);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const label = new Label(BINDING_LABELS[action], 'body');
      label.x = this.leftX;
      label.width = 350;
      label.height = 30;
      this.addChild(label);

      const keyBtn = new Button(this._formatKey(this.bindings[action]), () => {
        this._startBinding(action, keyBtn);
      });
      keyBtn.x = this.rightX;
      keyBtn.width = 200;
      keyBtn.height = 32;
      this.addChild(keyBtn);

      this.bindingItems.push({ action, label, keyBtn, baseY: this.listTop + i * this.rowSpacing });
    }
    this._layoutBindingRows();

    // Status label
    this.statusLabel = new Label('', 'body');
    this.statusLabel.x = this.width / 2;
    this.statusLabel.y = 660;
    this.statusLabel.width = 600;
    this.statusLabel.height = 30;
    this.statusLabel.align = 'center';
    this.statusLabel.color = '#FFDD44';
    this.addChild(this.statusLabel);

    // Reset button
    const resetBtn = new Button('Reset to Defaults', () => this._resetDefaults());
    resetBtn.x = contentX + contentW - resetBtn.width;
    resetBtn.y = this.height - resetBtn.height - 18;
    this.addChild(resetBtn);

    // Back button
    const backBtn = this.addBackButton(() => {
      storage.saveBindings(this.bindings);
      core.popPage();
    });
    backBtn.x = contentX;
  }

  _formatKey(code) {
    if (!code) return 'None';
    // Make key codes more readable
    return code
      .replace('Key', '')
      .replace('Digit', '')
      .replace('Arrow', '')
      .replace('Left', 'L-')
      .replace('Right', 'R-')
      .replace('Shift', 'Shift')
      .replace('Control', 'Ctrl')
      .replace('Backspace', 'Backsp');
  }

  _startBinding(action, btn) {
    this.waitingForKey = { action, btn };
    btn.text = '...';
    this.statusLabel.text = `Press a key for "${BINDING_LABELS[action]}"`;
  }

  _maxScroll() {
    return Math.max(0, this.bindingItems.length * this.rowSpacing - this.listHeight);
  }

  _layoutBindingRows() {
    const top = this.listTop;
    const bottom = this.listTop + this.listHeight;
    for (const item of this.bindingItems) {
      const y = item.baseY - this.scrollY;
      const visible = y + 32 >= top && y <= bottom;
      item.label.y = y;
      item.keyBtn.y = y;
      item.label.visible = visible;
      item.keyBtn.visible = visible;
    }
  }

  _setScroll(next) {
    const max = this._maxScroll();
    this.scrollY = Math.max(0, Math.min(max, next));
    this._layoutBindingRows();
  }

  _resetDefaults() {
    this.bindings = { ...DEFAULT_BINDINGS };
    for (const item of this.bindingItems) {
      item.keyBtn.text = this._formatKey(this.bindings[item.action]);
    }
    this.statusLabel.text = 'Reset to defaults';
    audio.playClick();
  }

  onKeyDown(e) {
    if (this.waitingForKey) {
      const { action, btn } = this.waitingForKey;
      
      // Check for conflicts
      const conflict = Object.entries(this.bindings).find(
        ([a, k]) => k === e.code && a !== action
      );
      
      if (conflict) {
        this.statusLabel.text = `Key already used for "${BINDING_LABELS[conflict[0]]}"`;
      } else {
        this.bindings[action] = e.code;
        btn.text = this._formatKey(e.code);
        this.statusLabel.text = '';
        audio.playClick();
      }
      
      this.waitingForKey = null;
      e.original?.preventDefault();
      return;
    }

    if (e.code === 'Escape') {
      storage.saveBindings(this.bindings);
      core.popPage();
    }
  }

  onMouseWheel(e) {
    const inViewport =
      e.x >= this.bindingsViewport.x &&
      e.x <= this.bindingsViewport.x + this.bindingsViewport.width &&
      e.y >= this.bindingsViewport.y &&
      e.y <= this.bindingsViewport.y + this.bindingsViewport.height;

    if (!inViewport) return;

    const max = this._maxScroll();
    if (max <= 0) return;

    // Support trackpads and mouse wheels consistently.
    const delta = Math.max(-120, Math.min(120, e.deltaY));
    this._setScroll(this.scrollY + delta * 0.6);
    e.original?.preventDefault();
  }

  onExit() {
    storage.saveBindings(this.bindings);
  }
}
