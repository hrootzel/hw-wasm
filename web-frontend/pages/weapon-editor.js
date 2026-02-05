// Weapon editor page
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { TextInput, ScrollList, Slider } from '../ui/widgets-adv.js';
import { storage } from '../data/storage.js';
import { DEFAULT_WEAPON_SETS, WEAPONS, createDefaultWeaponSet } from '../data/weapons.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';

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
    this.weaponScrollY = 0;
    this.weaponControls = [];
    this._buildUI();
    if (this.weaponSets.length > 0) {
      this._selectSet(0);
    }
  }

  _buildUI() {
    this.addTitle('Edit Weapon Sets');

    // Weapon set list (left side)
    this.setList = new ScrollList(
      this.weaponSets.map(w => w.name),
      (idx) => this._selectSet(idx)
    );
    this.setList.x = 30;
    this.setList.y = 100;
    this.setList.width = 180;
    this.setList.height = 480;
    this.addChild(this.setList);

    // New/Delete buttons
    const newBtn = new Button('New', () => this._newSet());
    newBtn.x = 30;
    newBtn.y = 600;
    newBtn.width = 85;
    this.addChild(newBtn);

    const delBtn = new Button('Delete', () => this._deleteSet());
    delBtn.x = 125;
    delBtn.y = 600;
    delBtn.width = 85;
    this.addChild(delBtn);

    // Name input
    const nameLabel = new Label('Name', 'small');
    nameLabel.x = 230;
    nameLabel.y = 100;
    nameLabel.width = 60;
    nameLabel.height = 24;
    this.addChild(nameLabel);

    this.nameInput = new TextInput('', (v) => {
      if (this.selectedSet) {
        this.selectedSet.name = v;
        this.dirty = true;
        this._updateList();
      }
    });
    this.nameInput.x = 300;
    this.nameInput.y = 100;
    this.nameInput.width = 200;
    this.nameInput.height = 30;
    this.addChild(this.nameInput);

    // Column headers
    const headers = ['Weapon', 'Ammo', 'Delay'];
    const headerX = [230, 450, 550];
    for (let i = 0; i < headers.length; i++) {
      const h = new Label(headers[i], 'small');
      h.x = headerX[i];
      h.y = 145;
      h.width = 100;
      h.height = 20;
      h.color = 'rgba(255,255,255,0.7)';
      this.addChild(h);
    }

    // Weapon rows (show first 15)
    const visibleWeapons = WEAPONS.slice(0, 15);
    let y = 170;
    const rowH = 32;

    for (const weapon of visibleWeapons) {
      // Weapon name
      const nameL = new Label(weapon.name, 'small');
      nameL.x = 230;
      nameL.y = y;
      nameL.width = 200;
      nameL.height = rowH;
      this.addChild(nameL);

      // Ammo slider (0-9, 9=infinite)
      const ammoSlider = new Slider(0, 9, 2, (v) => {
        if (this.selectedSet) {
          this.selectedSet.ammo[weapon.id] = v;
          this.dirty = true;
        }
      });
      ammoSlider.x = 430;
      ammoSlider.y = y + 4;
      ammoSlider.width = 100;
      ammoSlider.height = 24;
      this.addChild(ammoSlider);

      const ammoVal = new Label('2', 'small');
      ammoVal.x = 540;
      ammoVal.y = y;
      ammoVal.width = 30;
      ammoVal.height = rowH;
      this.addChild(ammoVal);

      // Delay slider (0-8)
      const delaySlider = new Slider(0, 8, 0, (v) => {
        if (this.selectedSet) {
          this.selectedSet.delay[weapon.id] = v;
          this.dirty = true;
        }
      });
      delaySlider.x = 580;
      delaySlider.y = y + 4;
      delaySlider.width = 80;
      delaySlider.height = 24;
      this.addChild(delaySlider);

      const delayVal = new Label('0', 'small');
      delayVal.x = 670;
      delayVal.y = y;
      delayVal.width = 30;
      delayVal.height = rowH;
      this.addChild(delayVal);

      this.weaponControls.push({
        id: weapon.id,
        ammoSlider,
        ammoVal,
        delaySlider,
        delayVal
      });

      y += rowH;
    }

    // Save button
    const saveBtn = new Button('Save', () => this._saveSet());
    saveBtn.x = 734;
    saveBtn.y = 700;
    this.addChild(saveBtn);

    this.addBackButton(() => {
      if (this.dirty) this._saveSet();
      core.popPage();
    });
  }

  _selectSet(idx) {
    if (this.dirty) this._saveSet();
    
    this.setList.selectedIndex = idx;
    this.selectedSet = this.weaponSets[idx];
    
    if (this.selectedSet) {
      this.nameInput.text = this.selectedSet.name;
      this.nameInput.cursorPos = this.selectedSet.name.length;
      
      for (const wc of this.weaponControls) {
        wc.ammoSlider.value = this.selectedSet.ammo[wc.id] ?? 0;
        wc.delaySlider.value = this.selectedSet.delay[wc.id] ?? 0;
      }
    }
    
    this.dirty = false;
  }

  _updateList() {
    this.setList.items = this.weaponSets.map(w => w.name);
  }

  _newSet() {
    const name = `Weapons ${this.weaponSets.length + 1}`;
    const set = createDefaultWeaponSet(name);
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

  update(dt) {
    super.update(dt);
    // Update value labels
    for (const wc of this.weaponControls) {
      const ammo = wc.ammoSlider.value;
      wc.ammoVal.text = ammo === 9 ? '∞' : String(ammo);
      wc.delayVal.text = String(wc.delaySlider.value);
    }
  }

  onKeyDown(e) {
    if (this.nameInput.focused) {
      this.nameInput.handleKey(e);
      e.original?.preventDefault();
      return;
    }
    super.onKeyDown(e);
  }

  onExit() {
    if (this.dirty) this._saveSet();
  }
}
