// Base page with common functionality
import { Page } from '../ui/scene.js';
import { Button, Label } from '../ui/widgets.js';
import { theme } from '../ui/theme.js';
import { core } from '../ui/core.js';
import { assets } from '../assets.js';

export class BasePage extends Page {
  constructor(title = '') {
    super();
    this.title = title;
    this.focusedInput = null;
  }

  addTitle(text, y = 30) {
    const label = new Label(text, 'title');
    // Node coordinates are top-left; center the label's box, then center the text within it.
    label.width = Math.max(320, Math.min(900, this.width - 60));
    label.x = Math.floor((this.width - label.width) / 2);
    label.y = y;
    label.height = 50;
    label.align = 'center';
    label.color = '#FFDD44';
    this.addChild(label);
    return label;
  }

  addBackButton(onClick = null) {
    const btn = new Button('Back', onClick || (() => core.popPage()));
    btn.x = 30;
    btn.y = this.height - btn.height - 18;
    this.addChild(btn);
    return btn;
  }

  drawBackground(ctx) {
    const now = new Date();
    const month = now.getMonth() + 1;
    let bg = assets.get('qt-bg-default');
    if (month === 12) bg = assets.get('qt-bg-christmas') || bg;
    else if (month === 4) bg = assets.get('qt-bg-easter') || bg;
    else if (month === 9) bg = assets.get('qt-bg-birthday') || bg;

    if (bg) {
      ctx.drawImage(bg, 0, 0, this.width, this.height);
      ctx.fillStyle = 'rgba(13, 20, 36, 0.22)';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#1a3a5c');
    grad.addColorStop(0.4, '#2d5a7b');
    grad.addColorStop(0.7, '#4a7a9a');
    grad.addColorStop(1, '#2d5a7b');
    ctx.fillStyle = bg ? 'rgba(26,58,92,0.25)' : grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle Qt icon watermark in the lower-right corner.
    const teamIcon = assets.get('qt-teamicon');
    if (teamIcon) {
      const size = 110;
      ctx.globalAlpha = 0.1;
      ctx.drawImage(teamIcon, this.width - size - 16, this.height - size - 10, size, size);
      ctx.globalAlpha = 1;
    }
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
