// Scheme editor page
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { TextInput, ScrollList, Slider, Checkbox, Dropdown } from '../ui/widgets-adv.js';
import { storage } from '../data/storage.js';
import { DEFAULT_SCHEMES, SCHEME_SETTINGS, SCHEME_FLAGS, createDefaultScheme } from '../data/schemes.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';

export class SchemeEditorPage extends BasePage {
  constructor() {
    super('Edit Schemes');
    this.schemes = storage.getSchemes();
    if (this.schemes.length === 0) {
      this.schemes = JSON.parse(JSON.stringify(DEFAULT_SCHEMES));
      storage.saveSchemes(this.schemes);
    }
    this.selectedScheme = null;
    this.dirty = false;
    this.scrollY = 0;
    this.valueEditInput = null;
    this.valueEditContext = null;
    this._buildUI();
    if (this.schemes.length > 0) {
      this._selectScheme(0);
    }
  }

  _buildUI() {
    this.addTitle('Edit Schemes');

    // Center the editor layout for widescreen.
    const contentW = 1100;
    const contentX = Math.round((this.width - contentW) / 2);

    // Scheme list (left side)
    this.schemeList = new ScrollList(
      this.schemes.map(s => s.name),
      (idx) => this._selectScheme(idx)
    );
    this.schemeList.x = contentX;
    this.schemeList.y = 100;
    this.schemeList.width = 200;
    this.schemeList.height = 480;
    this.addChild(this.schemeList);

    // New/Delete buttons
    const newBtn = new Button('New', () => this._newScheme());
    newBtn.x = contentX;
    newBtn.y = 600;
    newBtn.width = 95;
    this.addChild(newBtn);

    const delBtn = new Button('Delete', () => this._deleteScheme());
    delBtn.x = contentX + 105;
    delBtn.y = 600;
    delBtn.width = 95;
    this.addChild(delBtn);

    // Edit panel (right side) - we'll create controls dynamically
    this.editControls = [];
    this._buildEditPanel(contentX);

    // Inline numeric editor for slider values (click the number).
    this.valueEditInput = new TextInput('', (v) => {
      if (!this.valueEditContext) return;
      const { slider } = this.valueEditContext;
      const n = Number.parseInt(v, 10);
      if (!Number.isFinite(n)) return;
      slider.value = Math.max(slider.min, Math.min(slider.max, n));
      if (slider.onChange) slider.onChange(slider.value);
      this.dirty = true;
    });
    this.valueEditInput.visible = false;
    this.valueEditInput.width = 70;
    this.valueEditInput.height = 30;
    this.valueEditInput.maxLength = 4;
    this.addChild(this.valueEditInput);

    // Save button
    const saveBtn = new Button('Save', () => this._saveScheme());
    saveBtn.x = contentX + contentW - saveBtn.width;
    saveBtn.y = this.height - saveBtn.height - 18;
    this.addChild(saveBtn);

    const backBtn = this.addBackButton(() => {
      if (this.dirty) this._saveScheme();
      core.popPage();
    });
    backBtn.x = contentX;
  }

  _buildEditPanel(contentX = 0) {
    const editX = contentX + 230;
    let y = 100;
    const spacing = 38;

    // Name input
    const nameLabel = new Label('Name', 'small');
    nameLabel.x = editX;
    nameLabel.y = y;
    nameLabel.width = 100;
    nameLabel.height = 24;
    this.addChild(nameLabel);

    this.nameInput = new TextInput('', (v) => {
      if (this.selectedScheme) {
        this.selectedScheme.name = v;
        this.dirty = true;
        this._updateList();
      }
    });
    this.nameInput.x = editX + 110;
    this.nameInput.y = y;
    this.nameInput.width = 200;
    this.nameInput.height = 30;
    this.addChild(this.nameInput);

    y += 45;

    // Settings (first 8)
    const visibleSettings = SCHEME_SETTINGS.slice(0, 8);
    for (const setting of visibleSettings) {
      const label = new Label(setting.label, 'small');
      label.x = editX;
      label.y = y;
      label.width = 180;
      label.height = 24;
      this.addChild(label);

      if (setting.options) {
        const dropdown = new Dropdown(setting.options, 0, (idx) => {
          if (this.selectedScheme) {
            this.selectedScheme[setting.key] = idx;
            this.dirty = true;
          }
        });
        dropdown.x = editX + 190;
        dropdown.y = y;
        dropdown.width = 150;
        dropdown.height = 30;
        this.addChild(dropdown);
        this.editControls.push({ key: setting.key, control: dropdown, type: 'dropdown' });
      } else {
        const slider = new Slider(setting.min, setting.max, setting.default, (v) => {
          if (this.selectedScheme) {
            this.selectedScheme[setting.key] = v;
            this.dirty = true;
          }
        });
        slider.x = editX + 190;
        slider.y = y;
        slider.width = 180;
        this.addChild(slider);

        const valLabel = new Label('', 'small');
        valLabel.x = editX + 380;
        valLabel.y = y;
        valLabel.width = 50;
        valLabel.height = 24;
        valLabel.interactive = true;
        valLabel.onMouseUp = () => {
          if (!this.selectedScheme) return;
          this.valueEditContext = { slider, valueLabel: valLabel };
          this.valueEditInput.x = valLabel.x - 10;
          this.valueEditInput.y = valLabel.y - 3;
          this.valueEditInput.text = String(slider.value);
          this.valueEditInput.cursorPos = this.valueEditInput.text.length;
          this.valueEditInput.visible = true;
          this.valueEditInput.focused = true;
          this.valueEditInput.cursorBlink = 0;
          this.setFocusedInput(this.valueEditInput);
        };
        this.addChild(valLabel);

        this.editControls.push({ key: setting.key, control: slider, valueLabel: valLabel, type: 'slider' });
      }

      y += spacing;
    }

    // Flags (checkboxes) - show first 8
    y += 10;
    const flagLabel = new Label('Game Modifiers', 'body');
    flagLabel.x = editX;
    flagLabel.y = y;
    flagLabel.width = 200;
    flagLabel.height = 24;
    this.addChild(flagLabel);

    y += 30;
    const visibleFlags = SCHEME_FLAGS.slice(0, 8);
    for (let i = 0; i < visibleFlags.length; i++) {
      const flag = visibleFlags[i];
      const checkbox = new Checkbox(flag.label, false, (v) => {
        if (this.selectedScheme) {
          this.selectedScheme.flags[flag.key] = v;
          this.dirty = true;
        }
      });
      checkbox.x = editX + (i % 2) * 250;
      checkbox.y = y + Math.floor(i / 2) * 32;
      checkbox.width = 240;
      this.addChild(checkbox);
      this.editControls.push({ key: flag.key, control: checkbox, type: 'flag' });
    }
  }

  _selectScheme(idx) {
    if (this.dirty) this._saveScheme();
    
    this.schemeList.selectedIndex = idx;
    this.selectedScheme = this.schemes[idx];
    
    if (this.selectedScheme) {
      this.nameInput.text = this.selectedScheme.name;
      this.nameInput.cursorPos = this.selectedScheme.name.length;
      
      for (const ec of this.editControls) {
        if (ec.type === 'slider') {
          ec.control.value = this.selectedScheme[ec.key] ?? ec.control.min;
          if (ec.valueLabel) ec.valueLabel.text = String(ec.control.value);
        } else if (ec.type === 'dropdown') {
          ec.control.selectedIndex = this.selectedScheme[ec.key] ?? 0;
        } else if (ec.type === 'flag') {
          ec.control.checked = this.selectedScheme.flags?.[ec.key] ?? false;
        }
      }
    }
    
    this.dirty = false;
  }

  _updateList() {
    this.schemeList.items = this.schemes.map(s => s.name);
  }

  _newScheme() {
    const name = `Scheme ${this.schemes.length + 1}`;
    const scheme = createDefaultScheme(name);
    this.schemes.push(scheme);
    this._updateList();
    this._selectScheme(this.schemes.length - 1);
    storage.saveSchemes(this.schemes);
    audio.playClick();
  }

  _deleteScheme() {
    if (!this.selectedScheme || this.schemes.length <= 1) return;
    
    const idx = this.schemes.indexOf(this.selectedScheme);
    this.schemes.splice(idx, 1);
    this._updateList();
    this._selectScheme(Math.min(idx, this.schemes.length - 1));
    storage.saveSchemes(this.schemes);
    this.dirty = false;
    audio.playClick();
  }

  _saveScheme() {
    if (!this.dirty) return;
    storage.saveSchemes(this.schemes);
    this.dirty = false;
  }

  update(dt) {
    super.update(dt);
    // Update value labels
    for (const ec of this.editControls) {
      if (ec.type === 'slider' && ec.valueLabel) {
        ec.valueLabel.text = String(ec.control.value);
      }
    }
  }

  onKeyDown(e) {
    if (this.valueEditInput && this.valueEditInput.focused) {
      this.valueEditInput.handleKey(e);
      if (!this.valueEditInput.focused) {
        this.valueEditInput.visible = false;
        this.valueEditContext = null;
      }
      e.original?.preventDefault();
      return;
    }
    if (this.nameInput.focused) {
      this.nameInput.handleKey(e);
      e.original?.preventDefault();
      return;
    }
    super.onKeyDown(e);
  }

  onExit() {
    if (this.dirty) this._saveScheme();
  }
}
