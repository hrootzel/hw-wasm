// Scrollable icon picker widget for hats/flags/graves
import { Node } from './scene.js';
import { assets } from '../assets.js';
import { getVerticalScrollMetrics, drawVerticalScrollbar, isPointInTrack, scrollFromPointerY } from './scrollbar.js';

export class IconPicker extends Node {
  constructor(items, getPath, onSelect, iconSize = 32, frameSize = null) {
    super();
    this.items = items; // Array of item names
    this.getPath = getPath; // Function to get asset path
    this.onSelect = onSelect; // Callback when item selected
    this.iconSize = iconSize;
    this.frameSize = frameSize; // Fixed frame size for sprite sheets (e.g., 32 for hats)
    this.width = 300;
    this.height = 400;
    this.rowHeight = iconSize + 8;
    this.scrollOffset = 0;
    this.selectedIndex = 0;
    this.interactive = true;
    this.images = new Map();
    this.draggingScrollbar = false;
    
    // Preload visible icons
    this._loadVisibleIcons();
  }

  _scrollMetrics() {
    const listY = 88; // Preview height + padding
    const listHeight = this.height - listY;
    return getVerticalScrollMetrics({
      scroll: this.scrollOffset,
      contentSize: this.items.length * this.rowHeight,
      viewSize: listHeight,
      trackX: this.width - 10,
      trackY: listY,
      trackW: 8,
      trackH: listHeight,
      minThumb: 20
    });
  }

  _loadVisibleIcons() {
    const startIdx = Math.floor(this.scrollOffset / this.rowHeight);
    const endIdx = Math.min(this.items.length, startIdx + Math.ceil(this.height / this.rowHeight) + 2);
    
    for (let i = startIdx; i < endIdx; i++) {
      const item = this.items[i];
      if (!this.images.has(item)) {
        assets.loadOnDemand(`picker_${item}`, this.getPath(item)).then(img => {
          this.images.set(item, img);
        });
      }
    }
  }

  draw(ctx) {
    // Background
    ctx.fillStyle = 'rgba(30,40,60,0.95)';
    ctx.strokeStyle = '#88AADD';
    ctx.lineWidth = 2;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Preview panel at top
    const previewHeight = 80;
    ctx.fillStyle = 'rgba(50,60,80,0.9)';
    ctx.fillRect(this.x + 4, this.y + 4, this.width - 18, previewHeight);
    
    const selectedItem = this.items[this.selectedIndex];
    const previewImg = this.images.get(selectedItem);
    if (previewImg && this.frameSize !== 0) {
      // Show first square frame
      const frameSize = this.frameSize || Math.min(previewImg.width, previewImg.height);
      const scale = Math.min(64 / frameSize, 64 / frameSize);
      const w = frameSize * scale;
      const h = frameSize * scale;
      ctx.drawImage(previewImg, 0, 0, frameSize, frameSize, this.x + 20, this.y + 12, w, h);
    }
    
    ctx.fillStyle = '#FFDD44';
    ctx.font = 'bold 16px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(selectedItem, this.x + this.width / 2, this.y + previewHeight / 2);
    ctx.textAlign = 'left';

    // Clip to list bounds
    const listY = this.y + previewHeight + 8;
    const listHeight = this.height - previewHeight - 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, listY, this.width - 10, listHeight);
    ctx.clip();

    // Draw items
    const startIdx = Math.floor(this.scrollOffset / this.rowHeight);
    const endIdx = Math.min(this.items.length, startIdx + Math.ceil(listHeight / this.rowHeight) + 1);

    for (let i = startIdx; i < endIdx; i++) {
      const item = this.items[i];
      const itemY = listY + i * this.rowHeight - this.scrollOffset;
      
      // Selection highlight
      if (i === this.selectedIndex) {
        ctx.fillStyle = 'rgba(80,110,160,0.6)';
        ctx.fillRect(this.x + 4, itemY + 2, this.width - 18, this.rowHeight - 4);
      }

      // Icon
      const img = this.images.get(item);
      if (img && this.frameSize !== 0) {
        // Show first square frame
        const frameSize = this.frameSize || Math.min(img.width, img.height);
        const scale = Math.min(this.iconSize / frameSize, this.iconSize / frameSize);
        const w = frameSize * scale;
        const h = frameSize * scale;
        ctx.drawImage(img, 0, 0, frameSize, frameSize, this.x + 8, itemY + 4, w, h);
      }

      // Name
      ctx.fillStyle = i === this.selectedIndex ? '#FFDD44' : '#fff';
      ctx.font = '14px sans-serif';
      ctx.textBaseline = 'middle';
      const textX = this.frameSize === 0 ? this.x + 12 : this.x + this.iconSize + 16;
      ctx.fillText(item, textX, itemY + this.rowHeight / 2);
    }

    ctx.restore();

    // Scrollbar
    const m = this._scrollMetrics();
    ctx.save();
    ctx.translate(this.x, this.y);
    drawVerticalScrollbar(ctx, m, {
      trackColor: 'rgba(255,255,255,0.12)',
      thumbColor: 'rgba(255,255,255,0.35)'
    });
    ctx.restore();
  }

  hitTest(gx, gy) {
    const local = this.globalToLocal(gx, gy);
    return local.x >= 0 && local.x < this.width && local.y >= 0 && local.y < this.height;
  }

  onMouseDown(e) {
    const local = this.globalToLocal(e.x, e.y);
    const listY = 88; // Preview height + padding
    const m = this._scrollMetrics();
    
    // Check if clicking scrollbar
    if (isPointInTrack(local.x, local.y, m)) {
      if (!m.enabled) return;
      this.draggingScrollbar = true;
      this.scrollOffset = scrollFromPointerY(local.y, m);
      this._loadVisibleIcons();
      return;
    }
    
    if (local.y < listY) return; // Clicked in preview area
    
    const idx = Math.floor((local.y - listY + this.scrollOffset) / this.rowHeight);
    if (idx >= 0 && idx < this.items.length) {
      this.selectedIndex = idx;
    }
  }

  onMouseMove(e) {
    if (!this.draggingScrollbar) return;
    
    const local = this.globalToLocal(e.x, e.y);
    const m = this._scrollMetrics();
    if (!m.enabled) return;
    this.scrollOffset = scrollFromPointerY(local.y, m);
    this._loadVisibleIcons();
  }

  onMouseUp(e) {
    this.draggingScrollbar = false;
  }

  onMouseWheel(e) {
    const listHeight = this.height - 88;
    const maxScroll = Math.max(0, this.items.length * this.rowHeight - listHeight);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + e.deltaY * 0.5));
    this._loadVisibleIcons();
    if (e.original) e.original.preventDefault();
  }

  setSelected(itemName) {
    const idx = this.items.indexOf(itemName);
    if (idx >= 0) {
      this.selectedIndex = idx;
      // Scroll to make it visible
      const itemY = idx * this.rowHeight;
      if (itemY < this.scrollOffset) {
        this.scrollOffset = itemY;
      } else if (itemY + this.rowHeight > this.scrollOffset + this.height) {
        this.scrollOffset = itemY + this.rowHeight - this.height;
      }
      this._loadVisibleIcons();
    }
  }
}
