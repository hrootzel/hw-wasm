// Controls page - key binding configuration
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { ScrollList } from '../ui/widgets-adv.js';
import { storage } from '../data/storage.js';
import { DEFAULT_BINDINGS, BINDING_LABELS } from '../data/defaults.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';

export class ControlsPage extends BasePage {
  constructor() {
    super('Controls');
    this.bindings = { ...DEFAULT_BINDINGS, ...storage.getBindings() };
    this.waitingForKey = null;
    this._buildUI();
  }

  _buildUI() {
    this.addTitle('Key Bindings');

    // Instructions
    const instr = new Label('Click a binding to change it, then press a key', 'body');
    instr.x = this.width / 2;
    instr.y = 90;
    instr.width = 600;
    instr.height = 30;
    instr.align = 'center';
    instr.color = 'rgba(255,255,255,0.7)';
    this.addChild(instr);

    // Binding list
    this.bindingItems = [];
    const actions = Object.keys(BINDING_LABELS);
    
    let y = 130;
    const leftX = 150;
    const rightX = 550;
    const spacing = 36;

    for (const action of actions) {
      if (y > 650) break; // Limit visible items
      
      const label = new Label(BINDING_LABELS[action], 'body');
      label.x = leftX;
      label.y = y;
      label.width = 350;
      label.height = 30;
      this.addChild(label);

      const keyBtn = new Button(this._formatKey(this.bindings[action]), () => {
        this._startBinding(action, keyBtn);
      });
      keyBtn.x = rightX;
      keyBtn.y = y;
      keyBtn.width = 200;
      keyBtn.height = 32;
      this.addChild(keyBtn);

      this.bindingItems.push({ action, label, keyBtn });
      y += spacing;
    }

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
    resetBtn.x = this.width - resetBtn.width - 30;
    resetBtn.y = this.height - resetBtn.height - 18;
    this.addChild(resetBtn);

    // Back button
    this.addBackButton(() => {
      storage.saveBindings(this.bindings);
      core.popPage();
    });
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

  onExit() {
    storage.saveBindings(this.bindings);
  }
}
