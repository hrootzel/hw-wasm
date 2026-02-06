// Weapon editor page with icons
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { TextInput, ScrollList, Slider } from '../ui/widgets-adv.js';
import { storage } from '../data/storage.js';
import { DEFAULT_WEAPON_SETS, WEAPONS, createDefaultWeaponSet } from '../data/weapons.js';
import { assets, drawWeaponIcon } from '../assets.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';
import { Node } from '../ui/scene.js';
import { getVerticalScrollMetrics, drawVerticalScrollbar, isPointInTrack, scrollFromPointerY } from '../ui/scrollbar.js';

// Custom weapon row widget with icon
class WeaponRow extends Node {
  constructor(weapon, layout, onAmmoChange, onDelayChange) {
    super();
    this.weapon = weapon;
    this.layout = layout;
    this.onAmmoChange = onAmmoChange;
    this.onDelayChange = onDelayChange;
    this.width = layout.rowW;
    this.height = 36;
    this.ammo = 2;
    this.delay = 0;
    this.interactive = true;
    this.dragging = null;
  }

  draw(ctx) {
    const l = this.layout;

    // Background striping for readability.
    ctx.fillStyle = l.striped ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Icon
    drawWeaponIcon(ctx, this.weapon.icon, l.iconX, 2, l.iconSize);

    // Name
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.weapon.name, l.nameX, 18);

    // Ammo
    ctx.fillStyle = '#333';
    ctx.fillRect(l.ammoX, 14, l.ammoW, 8);
    const ammoPos = (this.ammo / 9) * l.ammoW;
    ctx.fillStyle = '#4a9';
    ctx.fillRect(l.ammoX + ammoPos - 4, 10, 8, 16);
    ctx.fillStyle = '#fff';
    ctx.fillText(this.ammo === 9 ? 'inf' : String(this.ammo), l.ammoX + l.ammoW + 10, 18);

    // Delay
    ctx.fillStyle = '#333';
    ctx.fillRect(l.delayX, 14, l.delayW, 8);
    const delayPos = (this.delay / 8) * l.delayW;
    ctx.fillStyle = '#a94';
    ctx.fillRect(l.delayX + delayPos - 4, 10, 8, 16);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(this.delay), l.delayX + l.delayW + 10, 18);
  }

  onMouseDown(e) {
    const lx = e.x;
    const l = this.layout;
    if (lx >= l.ammoX && lx < l.ammoX + l.ammoW + 36) this.dragging = 'ammo';
    else if (lx >= l.delayX && lx < l.delayX + l.delayW + 36) this.dragging = 'delay';
    if (this.dragging) this._updateFromMouse(e);
  }

  onMouseMove(e) {
    if (this.dragging) this._updateFromMouse(e);
  }

  onMouseUp() { this.dragging = null; }

  _updateFromMouse(e) {
    const lx = e.x;
    const l = this.layout;
    if (this.dragging === 'ammo') {
      const v = Math.round(Math.max(0, Math.min(9, ((lx - l.ammoX) / l.ammoW) * 9)));
      if (v !== this.ammo) { this.ammo = v; this.onAmmoChange(v); }
    } else if (this.dragging === 'delay') {
      const v = Math.round(Math.max(0, Math.min(8, ((lx - l.delayX) / l.delayW) * 8)));
      if (v !== this.delay) { this.delay = v; this.onDelayChange(v); }
    }
  }
}

export class WeaponEditorPage extends BasePage {
  constructor() {
    super('Edit Weapons');
    this.weaponSets = storage.getWeaponSets();
    if (this.weaponSets.length === 0) {
      this.weaponSets = JSON.parse(JSON.stringify(DEFAULT_WEAPON_SETS));
      storage.saveWeaponSets(this.weaponSets);
    }
    this.selectedSet = null;
    this.dirty = false;
    this.scrollY = 0;
    this.weaponRows = [];
    this.draggingScrollbar = false;
    this._buildUI();
    if (this.weaponSets.length > 0) this._selectSet(0);
  }

  _buildUI() {
    this.addTitle('Edit Weapon Sets');

    // Center the editor layout for widescreen.
    const contentW = 1120;
    const contentX = Math.round((this.width - contentW) / 2);

    // Set list
    this.setList = new ScrollList(this.weaponSets.map(w => w.name), (i) => this._selectSet(i));
    this.setList.x = contentX;
    this.setList.y = 100;
    this.setList.width = 160;
    this.setList.height = 500;
    this.addChild(this.setList);

    // New/Delete
    const newBtn = new Button('New', () => this._newSet());
    newBtn.x = contentX;
    newBtn.y = 620;
    newBtn.width = 75;
    this.addChild(newBtn);

    const delBtn = new Button('Delete', () => this._deleteSet());
    delBtn.x = contentX + 85;
    delBtn.y = 620;
    delBtn.width = 75;
    this.addChild(delBtn);

    const mainX = contentX + 190;

    // Name
    this.nameInput = new TextInput('', (v) => {
      if (this.selectedSet) { this.selectedSet.name = v; this.dirty = true; this._updateList(); }
    });
    this.nameInput.x = mainX;
    this.nameInput.y = 100;
    this.nameInput.width = 240;
    this.addChild(this.nameInput);

    // Scrollable container for weapon rows
    this.rowH = 36;
    this.weaponContainer = new Node();
    this.weaponContainer.x = mainX;
    this.weaponContainer.y = 165;
    this.weaponContainer.width = contentX + contentW - mainX;
    this.weaponContainer.height = 520;
    this.weaponContainer.interactive = true;

    this.scrollOffset = 0;
    this.draggingScrollbar = false;

    this.weaponRowLayout = {
      rowW: this.weaponContainer.width - 18,
      iconX: 8,
      iconSize: 32,
      nameX: 48,
      ammoX: 420,
      ammoW: 160,
      delayX: 650,
      delayW: 140
    };

    // Column headers
    const headers = [
      ['Weapon', mainX],
      ['Ammo', mainX + this.weaponRowLayout.ammoX],
      ['Delay', mainX + this.weaponRowLayout.delayX]
    ];
    for (const [t, hx] of headers) {
      const h = new Label(t, 'small');
      h.x = hx;
      h.y = 140;
      h.width = 110;
      h.height = 20;
      h.color = 'rgba(255,255,255,0.6)';
      this.addChild(h);
    }

    this.weaponContainer.hitTest = (gx, gy) => {
      const local = this.weaponContainer.globalToLocal(gx, gy);
      return local.x >= 0 && local.x < this.weaponContainer.width &&
             local.y >= 0 && local.y < this.weaponContainer.height;
    };

    this.weaponContainer.onMouseDown = (e) => {
      const local = this.weaponContainer.globalToLocal(e.x, e.y);
      const m = this._scrollMetrics();
      if (m.enabled && isPointInTrack(local.x, local.y, m)) {
        this.draggingScrollbar = true;
        this.scrollOffset = scrollFromPointerY(local.y, m);
        return;
      }

      const adjustedY = local.y + this.scrollOffset;
      const rowIdx = Math.floor(adjustedY / this.rowH);
      if (rowIdx >= 0 && rowIdx < this.weaponRows.length) {
        const row = this.weaponRows[rowIdx];
        row.onMouseDown({ x: local.x, y: adjustedY - rowIdx * this.rowH });
      }
    };

    this.weaponContainer.onMouseMove = (e) => {
      const local = this.weaponContainer.globalToLocal(e.x, e.y);

      if (this.draggingScrollbar) {
        const m = this._scrollMetrics();
        if (m.enabled) this.scrollOffset = scrollFromPointerY(local.y, m);
        return;
      }

      for (const row of this.weaponRows) {
        if (row.dragging) {
          row.onMouseMove({ x: local.x, y: 0 });
          return;
        }
      }
    };

    this.weaponContainer.onMouseUp = (e) => {
      this.draggingScrollbar = false;
      for (const row of this.weaponRows) {
        if (row.dragging) row.onMouseUp(e);
      }
    };

    // Draw container with clipping + scrollbar.
    this.weaponContainer.draw = (ctx) => {
      ctx.save();
      ctx.translate(this.weaponContainer.x, this.weaponContainer.y);

      // Panel background
      ctx.fillStyle = 'rgba(24, 36, 56, 0.78)';
      ctx.strokeStyle = '#88AADD';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(0, 0, this.weaponContainer.width, this.weaponContainer.height, 6);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.weaponContainer.width, this.weaponContainer.height);
      ctx.clip();

      for (const row of this.weaponRows) {
        const screenY = row.y - this.scrollOffset;
        if (screenY + this.rowH < 0 || screenY > this.weaponContainer.height) continue;
        ctx.save();
        ctx.translate(row.x, screenY);
        row.draw(ctx);
        ctx.restore();
      }

      ctx.restore();

      const m = this._scrollMetrics();
      drawVerticalScrollbar(ctx, m, {
        trackColor: 'rgba(40,56,84,0.9)',
        thumbColor: this.draggingScrollbar ? '#FFEE88' : '#FFDD44'
      });

      ctx.restore();
    };

    this.addChild(this.weaponContainer);

    // Create weapon rows
    this.weaponRows = [];
    let y = 0;
    for (let i = 0; i < WEAPONS.length; i++) {
      const w = WEAPONS[i];
      const layout = { ...this.weaponRowLayout, striped: (i % 2) === 1 };
      const row = new WeaponRow(w, layout,
        (v) => { if (this.selectedSet) { this.selectedSet.ammo[w.id] = v; this.dirty = true; } },
        (v) => { if (this.selectedSet) { this.selectedSet.delay[w.id] = v; this.dirty = true; } }
      );
      row.x = 0;
      row.y = y;
      this.weaponRows.push(row);
      y += this.rowH;
    }

    // Save
    const saveBtn = new Button('Save', () => this._saveSet());
    saveBtn.x = contentX + contentW - saveBtn.width;
    saveBtn.y = this.height - saveBtn.height - 18;
    this.addChild(saveBtn);

    const backBtn = this.addBackButton(() => { if (this.dirty) this._saveSet(); core.popPage(); });
    backBtn.x = contentX;
  }

  _scrollMetrics() {
    const trackW = 10;
    const trackPad = 4;
    return getVerticalScrollMetrics({
      scroll: this.scrollOffset,
      contentSize: this.weaponRows.length * this.rowH,
      viewSize: this.weaponContainer.height,
      trackX: this.weaponContainer.width - trackW - trackPad,
      trackY: trackPad,
      trackW,
      trackH: this.weaponContainer.height - trackPad * 2,
      minThumb: 40
    });
  }

  _selectSet(idx) {
    if (this.dirty) this._saveSet();
    this.setList.selectedIndex = idx;
    this.selectedSet = this.weaponSets[idx];
    if (this.selectedSet) {
      this.nameInput.text = this.selectedSet.name;
      this.nameInput.cursorPos = this.selectedSet.name.length;
      for (const row of this.weaponRows) {
        row.ammo = this.selectedSet.ammo[row.weapon.id] ?? 0;
        row.delay = this.selectedSet.delay[row.weapon.id] ?? 0;
      }
    }
    this.dirty = false;
  }

  _updateList() { this.setList.items = this.weaponSets.map(w => w.name); }

  _newSet() {
    const set = createDefaultWeaponSet(`Weapons ${this.weaponSets.length + 1}`);
    this.weaponSets.push(set);
    this._updateList();
    this._selectSet(this.weaponSets.length - 1);
    storage.saveWeaponSets(this.weaponSets);
    audio.playClick();
  }

  _deleteSet() {
    if (!this.selectedSet || this.weaponSets.length <= 1) return;
    const idx = this.weaponSets.indexOf(this.selectedSet);
    this.weaponSets.splice(idx, 1);
    this._updateList();
    this._selectSet(Math.min(idx, this.weaponSets.length - 1));
    storage.saveWeaponSets(this.weaponSets);
    this.dirty = false;
    audio.playClick();
  }

  _saveSet() {
    if (!this.dirty) return;
    storage.saveWeaponSets(this.weaponSets);
    this.dirty = false;
  }

  onMouseWheel(e) {
    const inContainer =
      e.x >= this.weaponContainer.x &&
      e.x <= this.weaponContainer.x + this.weaponContainer.width &&
      e.y >= this.weaponContainer.y &&
      e.y <= this.weaponContainer.y + this.weaponContainer.height;
    if (!inContainer) return;

    const delta = Math.max(-120, Math.min(120, e.deltaY || 0));
    const maxScroll = Math.max(0, this.weaponRows.length * this.rowH - this.weaponContainer.height);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + delta * 0.7));
    e.original?.preventDefault();
  }

  onKeyDown(e) {
    if (this.nameInput.focused) { this.nameInput.handleKey(e); e.original?.preventDefault(); return; }
    
    // Arrow keys for scrolling
    if (e.code === 'ArrowUp') {
      this.scrollOffset = Math.max(0, this.scrollOffset - 36);
    } else if (e.code === 'ArrowDown') {
      const maxScroll = Math.max(0, this.weaponRows.length * 36 - this.weaponContainer.height);
      this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 36);
    }
    
    super.onKeyDown(e);
  }

  onExit() { if (this.dirty) this._saveSet(); }
}
