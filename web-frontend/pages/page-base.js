// Base page with common functionality
import { Page } from '../ui/scene.js';
import { Button, Label } from '../ui/widgets.js';
import { theme } from '../ui/theme.js';
import { core } from '../ui/core.js';

export class BasePage extends Page {
  constructor(title = '') {
    super();
    this.title = title;
    this.focusedInput = null;
  }

  addTitle(text, y = 30) {
    const label = new Label(text, 'title');
    label.x = 512;
    label.y = y;
    label.width = 600;
    label.height = 50;
    label.align = 'center';
    label.color = '#FFDD44';
    this.addChild(label);
    return label;
  }

  addBackButton(onClick = null) {
    const btn = new Button('Back', onClick || (() => core.popPage()));
    btn.x = 30;
    btn.y = 700;
    this.addChild(btn);
    return btn;
  }

  drawBackground(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#1a3a5c');
    grad.addColorStop(0.4, '#2d5a7b');
    grad.addColorStop(0.7, '#4a7a9a');
    grad.addColorStop(1, '#2d5a7b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawSelf(ctx) {
    this.drawBackground(ctx);
  }

  onKeyDown(e) {
    // Route to focused input if any
    if (this.focusedInput && this.focusedInput.handleKey) {
      if (this.focusedInput.handleKey(e)) {
        e.original?.preventDefault();
        return;
      }
    }
    
    // Escape to go back
    if (e.code === 'Escape') {
      core.popPage();
    }
  }

  setFocusedInput(input) {
    if (this.focusedInput && this.focusedInput !== input) {
      this.focusedInput.blur?.();
    }
    this.focusedInput = input;
  }
}
