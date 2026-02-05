// Advanced widgets - Checkbox, Slider, TextInput, Dropdown, ScrollList, TabPanel
import { Node } from './scene.js';
import { theme, applyFont } from './theme.js';
import { audio } from '../util/audio.js';

export class Checkbox extends Node {
  constructor(label = '', checked = false, onChange = null) {
    super();
    this.label = label;
    this.checked = checked;
    this.onChange = onChange;
    this.width = 200;
    this.height = 30;
    this.boxSize = 24;
    this.interactive = true;
    this.hovered = false;
  }

  drawSelf(ctx) {
    const bs = this.boxSize;
    
    // Box background
    ctx.fillStyle = this.hovered ? 'rgba(80,110,160,0.9)' : 'rgba(60,80,120,0.8)';
    ctx.strokeStyle = '#88AADD';
    ctx.lineWidth = 2;
    ctx.fillRect(0, (this.height - bs) / 2, bs, bs);
    ctx.strokeRect(0, (this.height - bs) / 2, bs, bs);
    
    // Checkmark
    if (this.checked) {
      ctx.strokeStyle = '#FFDD44';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(4, (this.height - bs) / 2 + bs / 2);
      ctx.lineTo(bs / 3, (this.height - bs) / 2 + bs - 4);
      ctx.lineTo(bs - 4, (this.height - bs) / 2 + 4);
      ctx.stroke();
    }
    
    // Label
    applyFont(ctx, theme.fonts.body);
    ctx.fillStyle = theme.colors.text;
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, bs + 10, this.height / 2);
  }

  onMouseEnter() { this.hovered = true; }
  onMouseLeave() { this.hovered = false; }
  
  onMouseUp(e) {
    if (this.hitTest(e.x, e.y)) {
      this.checked = !this.checked;
      audio.playClick();
      if (this.onChange) this.onChange(this.checked);
    }
  }
}

export class Slider extends Node {
  constructor(min = 0, max = 100, value = 50, onChange = null) {
    super();
    this.min = min;
    this.max = max;
    this.value = value;
    this.onChange = onChange;
    this.width = 200;
    this.height = 30;
    this.thumbWidth = 16;
    this.interactive = true;
    this.dragging = false;
  }

  get normalizedValue() {
    return (this.value - this.min) / (this.max - this.min);
  }

  drawSelf(ctx) {
    const trackY = this.height / 2;
    const trackH = 8;
    const thumbX = this.normalizedValue * (this.width - this.thumbWidth);
    
    // Track background
    ctx.fillStyle = 'rgba(40,50,70,0.8)';
    ctx.fillRect(0, trackY - trackH / 2, this.width, trackH);
    
    // Track fill
    ctx.fillStyle = '#4488CC';
    ctx.fillRect(0, trackY - trackH / 2, thumbX + this.thumbWidth / 2, trackH);
    
    // Thumb
    ctx.fillStyle = this.dragging ? '#FFEE88' : '#FFDD44';
    ctx.strokeStyle = '#88AADD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(thumbX, 4, this.thumbWidth, this.height - 8, 4);
    ctx.fill();
    ctx.stroke();
  }

  _updateValue(x) {
    const local = this.globalToLocal(x, 0);
    const norm = Math.max(0, Math.min(1, local.x / this.width));
    this.value = Math.round(this.min + norm * (this.max - this.min));
    if (this.onChange) this.onChange(this.value);
  }

  onMouseDown(e) {
    this.dragging = true;
    this._updateValue(e.x);
  }

  onMouseMove(e) {
    if (this.dragging) this._updateValue(e.x);
  }

  onMouseUp() {
    if (this.dragging) audio.playClick();
    this.dragging = false;
  }
}

export class TextInput extends Node {
  constructor(placeholder = '', onChange = null) {
    super();
    this.text = '';
    this.placeholder = placeholder;
    this.onChange = onChange;
    this.width = 200;
    this.height = 36;
    this.interactive = true;
    this.focused = false;
    this.cursorPos = 0;
    this.cursorBlink = 0;
    this.maxLength = 50;
  }

  drawSelf(ctx) {
    // Background
    ctx.fillStyle = this.focused ? 'rgba(50,70,100,0.95)' : 'rgba(40,50,70,0.85)';
    ctx.strokeStyle = this.focused ? '#FFDD44' : '#88AADD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, 4);
    ctx.fill();
    ctx.stroke();
    
    // Text or placeholder
    applyFont(ctx, theme.fonts.body);
    ctx.textBaseline = 'middle';
    const displayText = this.text || this.placeholder;
    ctx.fillStyle = this.text ? theme.colors.text : 'rgba(255,255,255,0.4)';
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(8, 0, this.width - 16, this.height);
    ctx.clip();
    ctx.fillText(displayText, 10, this.height / 2);
    ctx.restore();
    
    // Cursor
    if (this.focused && Math.floor(this.cursorBlink * 2) % 2 === 0) {
      const textWidth = ctx.measureText(this.text.substring(0, this.cursorPos)).width;
      ctx.fillStyle = '#FFDD44';
      ctx.fillRect(10 + textWidth, 6, 2, this.height - 12);
    }
  }

  update(dt) {
    if (this.focused) this.cursorBlink += dt;
    super.update(dt);
  }

  onMouseDown() {
    this.focused = true;
    this.cursorPos = this.text.length;
    this.cursorBlink = 0;
  }

  blur() {
    this.focused = false;
  }

  handleKey(e) {
    if (!this.focused) return false;
    
    if (e.key === 'Backspace') {
      if (this.cursorPos > 0) {
        this.text = this.text.slice(0, this.cursorPos - 1) + this.text.slice(this.cursorPos);
        this.cursorPos--;
        if (this.onChange) this.onChange(this.text);
      }
    } else if (e.key === 'Delete') {
      this.text = this.text.slice(0, this.cursorPos) + this.text.slice(this.cursorPos + 1);
      if (this.onChange) this.onChange(this.text);
    } else if (e.key === 'ArrowLeft') {
      this.cursorPos = Math.max(0, this.cursorPos - 1);
    } else if (e.key === 'ArrowRight') {
      this.cursorPos = Math.min(this.text.length, this.cursorPos + 1);
    } else if (e.key === 'Home') {
      this.cursorPos = 0;
    } else if (e.key === 'End') {
      this.cursorPos = this.text.length;
    } else if (e.key.length === 1 && this.text.length < this.maxLength) {
      this.text = this.text.slice(0, this.cursorPos) + e.key + this.text.slice(this.cursorPos);
      this.cursorPos++;
      if (this.onChange) this.onChange(this.text);
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      this.blur();
    }
    
    this.cursorBlink = 0;
    return true;
  }
}

export class Dropdown extends Node {
  constructor(options = [], selectedIndex = 0, onChange = null) {
    super();
    this.options = options;
    this.selectedIndex = selectedIndex;
    this.onChange = onChange;
    this.width = 200;
    this.height = 36;
    this.interactive = true;
    this.open = false;
    this.hoverIndex = -1;
    this.maxVisible = 6;
  }

  get selectedOption() {
    return this.options[this.selectedIndex];
  }

  drawSelf(ctx) {
    // Main button
    ctx.fillStyle = this.open ? 'rgba(70,100,140,0.95)' : 'rgba(60,80,120,0.85)';
    ctx.strokeStyle = '#88AADD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, 4);
    ctx.fill();
    ctx.stroke();
    
    // Selected text
    applyFont(ctx, theme.fonts.body);
    ctx.fillStyle = theme.colors.text;
    ctx.textBaseline = 'middle';
    ctx.fillText(this.selectedOption || '', 10, this.height / 2);
    
    // Arrow
    ctx.fillStyle = '#FFDD44';
    ctx.beginPath();
    const ax = this.width - 20;
    const ay = this.height / 2;
    if (this.open) {
      ctx.moveTo(ax - 6, ay + 3);
      ctx.lineTo(ax + 6, ay + 3);
      ctx.lineTo(ax, ay - 5);
    } else {
      ctx.moveTo(ax - 6, ay - 3);
      ctx.lineTo(ax + 6, ay - 3);
      ctx.lineTo(ax, ay + 5);
    }
    ctx.fill();
    
    // Dropdown list
    if (this.open) {
      const itemH = 32;
      const visibleCount = Math.min(this.options.length, this.maxVisible);
      const listH = visibleCount * itemH;
      
      ctx.fillStyle = 'rgba(40,50,70,0.98)';
      ctx.strokeStyle = '#88AADD';
      ctx.fillRect(0, this.height, this.width, listH);
      ctx.strokeRect(0, this.height, this.width, listH);
      
      for (let i = 0; i < visibleCount; i++) {
        const y = this.height + i * itemH;
        if (i === this.hoverIndex) {
          ctx.fillStyle = 'rgba(80,110,160,0.9)';
          ctx.fillRect(2, y + 2, this.width - 4, itemH - 4);
        }
        ctx.fillStyle = i === this.selectedIndex ? '#FFDD44' : theme.colors.text;
        ctx.fillText(this.options[i], 10, y + itemH / 2);
      }
    }
  }

  hitTest(gx, gy) {
    if (!this.visible) return false;
    const local = this.globalToLocal(gx, gy);
    const h = this.open ? this.height + Math.min(this.options.length, this.maxVisible) * 32 : this.height;
    return local.x >= 0 && local.x < this.width && local.y >= 0 && local.y < h;
  }

  onMouseMove(e) {
    if (this.open) {
      const local = this.globalToLocal(e.x, e.y);
      if (local.y > this.height) {
        this.hoverIndex = Math.floor((local.y - this.height) / 32);
      } else {
        this.hoverIndex = -1;
      }
    }
  }

  onMouseUp(e) {
    const local = this.globalToLocal(e.x, e.y);
    
    if (this.open && local.y > this.height) {
      const idx = Math.floor((local.y - this.height) / 32);
      if (idx >= 0 && idx < this.options.length) {
        this.selectedIndex = idx;
        audio.playClick();
        if (this.onChange) this.onChange(idx, this.options[idx]);
      }
      this.open = false;
    } else if (local.y <= this.height) {
      this.open = !this.open;
      audio.playClick();
    } else {
      this.open = false;
    }
  }

  onMouseLeave() {
    // Don't close on leave - let click outside handle it
    this.hoverIndex = -1;
  }

  close() {
    this.open = false;
  }
}

export class ScrollList extends Node {
  constructor(items = [], onSelect = null) {
    super();
    this.items = items;
    this.onSelect = onSelect;
    this.selectedIndex = -1;
    this.width = 200;
    this.height = 300;
    this.itemHeight = 36;
    this.scrollY = 0;
    this.interactive = true;
    this.hoverIndex = -1;
    this.scrollbarWidth = 14;
    this.draggingScroll = false;
  }

  get contentHeight() {
    return this.items.length * this.itemHeight;
  }

  get maxScroll() {
    return Math.max(0, this.contentHeight - this.height);
  }

  drawSelf(ctx) {
    // Background
    ctx.fillStyle = 'rgba(30,40,60,0.9)';
    ctx.strokeStyle = '#88AADD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, 4);
    ctx.fill();
    ctx.stroke();
    
    // Clip content
    ctx.save();
    ctx.beginPath();
    ctx.rect(2, 2, this.width - this.scrollbarWidth - 4, this.height - 4);
    ctx.clip();
    
    // Items
    const startIdx = Math.floor(this.scrollY / this.itemHeight);
    const endIdx = Math.min(this.items.length, startIdx + Math.ceil(this.height / this.itemHeight) + 1);
    
    applyFont(ctx, theme.fonts.body);
    ctx.textBaseline = 'middle';
    
    for (let i = startIdx; i < endIdx; i++) {
      const y = i * this.itemHeight - this.scrollY;
      
      if (i === this.selectedIndex) {
        ctx.fillStyle = 'rgba(80,110,160,0.9)';
        ctx.fillRect(4, y + 2, this.width - this.scrollbarWidth - 8, this.itemHeight - 4);
      } else if (i === this.hoverIndex) {
        ctx.fillStyle = 'rgba(60,80,120,0.7)';
        ctx.fillRect(4, y + 2, this.width - this.scrollbarWidth - 8, this.itemHeight - 4);
      }
      
      ctx.fillStyle = i === this.selectedIndex ? '#FFDD44' : theme.colors.text;
      const text = typeof this.items[i] === 'object' ? this.items[i].name : this.items[i];
      ctx.fillText(text, 10, y + this.itemHeight / 2);
    }
    
    ctx.restore();
    
    // Scrollbar
    if (this.contentHeight > this.height) {
      const sbX = this.width - this.scrollbarWidth;
      const sbH = Math.max(30, (this.height / this.contentHeight) * this.height);
      const sbY = (this.scrollY / this.maxScroll) * (this.height - sbH);
      
      ctx.fillStyle = 'rgba(50,60,80,0.8)';
      ctx.fillRect(sbX, 0, this.scrollbarWidth, this.height);
      
      ctx.fillStyle = this.draggingScroll ? '#FFDD44' : '#88AADD';
      ctx.beginPath();
      ctx.roundRect(sbX + 2, sbY + 2, this.scrollbarWidth - 4, sbH - 4, 4);
      ctx.fill();
    }
  }

  _getItemIndex(y) {
    const local = this.globalToLocal(0, y);
    return Math.floor((local.y + this.scrollY) / this.itemHeight);
  }

  onMouseMove(e) {
    const local = this.globalToLocal(e.x, e.y);
    
    if (this.draggingScroll) {
      const sbH = Math.max(30, (this.height / this.contentHeight) * this.height);
      const ratio = local.y / (this.height - sbH);
      this.scrollY = Math.max(0, Math.min(this.maxScroll, ratio * this.maxScroll));
    } else if (local.x < this.width - this.scrollbarWidth) {
      this.hoverIndex = this._getItemIndex(e.y);
      if (this.hoverIndex >= this.items.length) this.hoverIndex = -1;
    } else {
      this.hoverIndex = -1;
    }
  }

  onMouseDown(e) {
    const local = this.globalToLocal(e.x, e.y);
    if (local.x >= this.width - this.scrollbarWidth && this.contentHeight > this.height) {
      this.draggingScroll = true;
    }
  }

  onMouseUp(e) {
    if (this.draggingScroll) {
      this.draggingScroll = false;
      return;
    }
    
    const local = this.globalToLocal(e.x, e.y);
    if (local.x < this.width - this.scrollbarWidth) {
      const idx = this._getItemIndex(e.y);
      if (idx >= 0 && idx < this.items.length) {
        this.selectedIndex = idx;
        audio.playClick();
        if (this.onSelect) this.onSelect(idx, this.items[idx]);
      }
    }
  }

  onMouseLeave() {
    this.hoverIndex = -1;
    this.draggingScroll = false;
  }

  scroll(delta) {
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + delta));
  }

  setItems(items) {
    this.items = items;
    this.scrollY = 0;
    this.selectedIndex = -1;
  }
}

export class ItemGrid extends Node {
  constructor(items = [], columns = 4, onSelect = null) {
    super();
    this.items = items; // [{id, image, name}]
    this.columns = columns;
    this.onSelect = onSelect;
    this.selectedIndex = -1;
    this.cellSize = 64;
    this.padding = 4;
    this.width = columns * (this.cellSize + this.padding) + this.padding;
    this.height = 200;
    this.scrollY = 0;
    this.interactive = true;
    this.hoverIndex = -1;
  }

  get rows() { return Math.ceil(this.items.length / this.columns); }
  get contentHeight() { return this.rows * (this.cellSize + this.padding) + this.padding; }
  get maxScroll() { return Math.max(0, this.contentHeight - this.height); }

  drawSelf(ctx) {
    // Background
    ctx.fillStyle = 'rgba(30,40,60,0.9)';
    ctx.strokeStyle = '#88AADD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, 4);
    ctx.fill();
    ctx.stroke();
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();
    
    for (let i = 0; i < this.items.length; i++) {
      const col = i % this.columns;
      const row = Math.floor(i / this.columns);
      const x = this.padding + col * (this.cellSize + this.padding);
      const y = this.padding + row * (this.cellSize + this.padding) - this.scrollY;
      
      if (y + this.cellSize < 0 || y > this.height) continue;
      
      // Cell background
      if (i === this.selectedIndex) {
        ctx.fillStyle = 'rgba(100,140,200,0.9)';
      } else if (i === this.hoverIndex) {
        ctx.fillStyle = 'rgba(70,100,150,0.8)';
      } else {
        ctx.fillStyle = 'rgba(50,60,80,0.6)';
      }
      ctx.fillRect(x, y, this.cellSize, this.cellSize);
      
      // Image
      const item = this.items[i];
      if (item.image) {
        ctx.drawImage(item.image, x + 4, y + 4, this.cellSize - 8, this.cellSize - 8);
      }
      
      // Selection border
      if (i === this.selectedIndex) {
        ctx.strokeStyle = '#FFDD44';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, this.cellSize, this.cellSize);
      }
    }
    
    ctx.restore();
  }

  _getItemIndex(gx, gy) {
    const local = this.globalToLocal(gx, gy);
    const col = Math.floor((local.x - this.padding) / (this.cellSize + this.padding));
    const row = Math.floor((local.y + this.scrollY - this.padding) / (this.cellSize + this.padding));
    if (col < 0 || col >= this.columns) return -1;
    const idx = row * this.columns + col;
    return idx >= 0 && idx < this.items.length ? idx : -1;
  }

  onMouseMove(e) {
    this.hoverIndex = this._getItemIndex(e.x, e.y);
  }

  onMouseUp(e) {
    const idx = this._getItemIndex(e.x, e.y);
    if (idx >= 0) {
      this.selectedIndex = idx;
      audio.playClick();
      if (this.onSelect) this.onSelect(idx, this.items[idx]);
    }
  }

  onMouseLeave() {
    this.hoverIndex = -1;
  }

  scroll(delta) {
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + delta));
  }
}
