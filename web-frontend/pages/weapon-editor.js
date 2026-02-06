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

// Custom weapon row widget with icon
class WeaponRow extends Node {
  constructor(weapon, onAmmoChange, onDelayChange) {
    super();
    this.weapon = weapon;
    this.onAmmoChange = onAmmoChange;
    this.onDelayChange = onDelayChange;
    this.width = 500;
    this.height = 36;
    this.ammo = 2;
    this.delay = 0;
    this.interactive = true;
    this.dragging = null;
  }

  draw(ctx) {
    // Draw at origin since container already translates to our position
    // Icon
    drawWeaponIcon(ctx, this.weapon.icon, 0, 2, 32);
    
    // Name
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.weapon.name, 40, 18);
    
    // Ammo slider track
    const ammoX = 200, sliderW = 100;
    ctx.fillStyle = '#333';
    ctx.fillRect(ammoX, 14, sliderW, 8);
    // Ammo handle
    const ammoPos = (this.ammo / 9) * sliderW;
    ctx.fillStyle = '#4a9';
    ctx.fillRect(ammoX + ammoPos - 4, 10, 8, 16);
    // Ammo value
    ctx.fillStyle = '#fff';
    ctx.fillText(this.ammo === 9 ? '∞' : this.ammo, ammoX + sliderW + 10, 18);
    
    // Delay slider track
    const delayX = 350;
    ctx.fillStyle = '#333';
    ctx.fillRect(delayX, 14, 80, 8);
    // Delay handle
    const delayPos = (this.delay / 8) * 80;
    ctx.fillStyle = '#a94';
    ctx.fillRect(delayX + delayPos - 4, 10, 8, 16);
    // Delay value
    ctx.fillStyle = '#fff';
    ctx.fillText(String(this.delay), delayX + 90, 18);
  }

  onMouseDown(e) {
    const lx = e.x;
    console.log('[WeaponRow] mousedown at', lx, 'for', this.weapon.name);
    if (lx >= 200 && lx < 310) this.dragging = 'ammo';
    else if (lx >= 350 && lx < 440) this.dragging = 'delay';
    if (this.dragging) {
      console.log('[WeaponRow] started dragging', this.dragging);
      this._updateFromMouse(e);
    }
  }

  onMouseMove(e) {
    if (this.dragging) this._updateFromMouse(e);
  }

  onMouseUp() { this.dragging = null; }

  _updateFromMouse(e) {
    const lx = e.x;
    if (this.dragging === 'ammo') {
      const v = Math.round(Math.max(0, Math.min(9, ((lx - 200) / 100) * 9)));
      if (v !== this.ammo) { this.ammo = v; this.onAmmoChange(v); }
    } else if (this.dragging === 'delay') {
      const v = Math.round(Math.max(0, Math.min(8, ((lx - 350) / 80) * 8)));
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

    // Set list
    this.setList = new ScrollList(this.weaponSets.map(w => w.name), (i) => this._selectSet(i));
    this.setList.x = 30; this.setList.y = 100;
    this.setList.width = 160; this.setList.height = 500;
    this.addChild(this.setList);

    // New/Delete
    const newBtn = new Button('New', () => this._newSet());
    newBtn.x = 30; newBtn.y = 620; newBtn.width = 75;
    this.addChild(newBtn);
    const delBtn = new Button('Delete', () => this._deleteSet());
    delBtn.x = 115; delBtn.y = 620; delBtn.width = 75;
    this.addChild(delBtn);

    // Name
    this.nameInput = new TextInput('', (v) => {
      if (this.selectedSet) { this.selectedSet.name = v; this.dirty = true; this._updateList(); }
    });
    this.nameInput.x = 210; this.nameInput.y = 100; this.nameInput.width = 200;
    this.addChild(this.nameInput);

    // Column headers
    const headers = [['Weapon', 210], ['Ammo', 410], ['Delay', 560]];
    for (const [t, hx] of headers) {
      const h = new Label(t, 'small');
      h.x = hx; h.y = 140; h.width = 100; h.height = 20;
      h.color = 'rgba(255,255,255,0.6)';
      this.addChild(h);
    }

    // Scrollable container for weapon rows
    this.weaponContainer = new Node();
    this.weaponContainer.x = 210;
    this.weaponContainer.y = 165;
    this.weaponContainer.width = 550;
    this.weaponContainer.height = 520;
    this.weaponContainer.interactive = true;
    this.weaponContainer.hitTest = (gx, gy) => {
      const local = this.weaponContainer.globalToLocal(gx, gy);
      return local.x >= 0 && local.x < this.weaponContainer.width && 
             local.y >= 0 && local.y < this.weaponContainer.height;
    };
    this.weaponContainer.onMouseDown = (e) => {
      const local = this.weaponContainer.globalToLocal(e.x, e.y);
      
      // Check if clicking scrollbar
      if (local.x >= this.weaponContainer.width - 10) {
        const totalHeight = this.weaponRows.length * 36;
        if (totalHeight > this.weaponContainer.height) {
          this.draggingScrollbar = true;
          const maxScroll = totalHeight - this.weaponContainer.height;
          const clickRatio = local.y / this.weaponContainer.height;
          this.scrollOffset = Math.max(0, Math.min(maxScroll, clickRatio * maxScroll));
        }
        return;
      }
      
      const adjustedY = local.y + this.scrollOffset;
      const rowIdx = Math.floor(adjustedY / 36);
      if (rowIdx >= 0 && rowIdx < this.weaponRows.length) {
        const row = this.weaponRows[rowIdx];
        row.onMouseDown({ x: local.x, y: adjustedY - rowIdx * 36 });
      }
    };
    this.weaponContainer.onMouseMove = (e) => {
      // If dragging scrollbar
      if (this.draggingScrollbar) {
        const local = this.weaponContainer.globalToLocal(e.x, e.y);
        const totalHeight = this.weaponRows.length * 36;
        const maxScroll = totalHeight - this.weaponContainer.height;
        const clickRatio = local.y / this.weaponContainer.height;
        this.scrollOffset = Math.max(0, Math.min(maxScroll, clickRatio * maxScroll));
        return;
      }
      
      // If dragging slider, route to the dragging row
      for (const row of this.weaponRows) {
        if (row.dragging) {
          const local = this.weaponContainer.globalToLocal(e.x, e.y);
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
    this.scrollOffset = 0;
    
    // Override draw to clip and scroll
    this.weaponContainer.draw = (ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.weaponContainer.x, this.weaponContainer.y, this.weaponContainer.width, this.weaponContainer.height);
      ctx.clip();
      
      for (const row of this.weaponRows) {
        const screenY = this.weaponContainer.y + row.y - this.scrollOffset;
        if (screenY + 36 < this.weaponContainer.y || screenY > this.weaponContainer.y + this.weaponContainer.height) continue;
        
        ctx.save();
        ctx.translate(this.weaponContainer.x + row.x, screenY);
        row.draw(ctx);
        ctx.restore();
      }
      
      ctx.restore();
      
      // Scrollbar
      const totalHeight = this.weaponRows.length * 36;
      if (totalHeight > this.weaponContainer.height) {
        const barHeight = Math.max(20, (this.weaponContainer.height / totalHeight) * this.weaponContainer.height);
        const barY = (this.scrollOffset / (totalHeight - this.weaponContainer.height)) * (this.weaponContainer.height - barHeight);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(this.weaponContainer.x + this.weaponContainer.width - 8, this.weaponContainer.y + barY, 6, barHeight);
      }
    };
    
    this.addChild(this.weaponContainer);

    // Create weapon rows
    let y = 0;
    for (const w of WEAPONS) {
      const row = new WeaponRow(w,
        (v) => { if (this.selectedSet) { this.selectedSet.ammo[w.id] = v; this.dirty = true; } },
        (v) => { if (this.selectedSet) { this.selectedSet.delay[w.id] = v; this.dirty = true; } }
      );
      row.x = 0; // Relative to container
      row.y = y;
      this.weaponRows.push(row);
      y += 36;
    }

    // Save
    const saveBtn = new Button('Save', () => this._saveSet());
    saveBtn.x = this.width - saveBtn.width - 30;
    saveBtn.y = this.height - saveBtn.height - 18;
    this.addChild(saveBtn);

    this.addBackButton(() => { if (this.dirty) this._saveSet(); core.popPage(); });
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
    // Mouse wheel scrolling
    const delta = e.deltaY || 0;
    const maxScroll = Math.max(0, this.weaponRows.length * 36 - this.weaponContainer.height);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + delta * 0.5));
    if (e.original) e.original.preventDefault();
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
