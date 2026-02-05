// Basic widgets - Button, Label
import { Node } from './scene.js';
import { theme, applyFont, drawTextShadow } from './theme.js';
import { audio } from '../util/audio.js';

export class Label extends Node {
  constructor(text = '', fontKey = 'body') {
    super();
    this.text = text;
    this.fontKey = fontKey;
    this.color = theme.colors.text;
    this.align = 'left'; // left, center, right
    this.baseline = 'top'; // top, middle, bottom
    this.shadow = true;
    this.shadowOffset = 2;
  }

  drawSelf(ctx) {
    if (!this.text) return;
    applyFont(ctx, theme.fonts[this.fontKey]);
    ctx.textAlign = this.align;
    ctx.textBaseline = this.baseline;

    let x = 0;
    if (this.align === 'center') x = this.width / 2;
    else if (this.align === 'right') x = this.width;

    let y = 0;
    if (this.baseline === 'middle') y = this.height / 2;
    else if (this.baseline === 'bottom') y = this.height;

    if (this.shadow) {
      drawTextShadow(ctx, this.text, x, y, this.shadowOffset);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, x, y);
    }
  }
}

export class Button extends Node {
  constructor(text = '', onClick = null) {
    super();
    this.text = text;
    this.onClick = onClick;
    this.width = theme.button.width;
    this.height = theme.button.height;
    this.interactive = true;

    this.state = 'normal'; // normal, hover, active, disabled
    this._wasHovered = false;
  }

  setDisabled(disabled) {
    this.state = disabled ? 'disabled' : 'normal';
  }

  drawSelf(ctx) {
    const b = theme.button;

    // Background
    let bgColor = b.bgColor;
    if (this.state === 'hover') bgColor = b.bgHover;
    else if (this.state === 'active') bgColor = b.bgActive;
    else if (this.state === 'disabled') bgColor = 'rgba(40, 40, 40, 0.7)';

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = b.borderColor;
    ctx.lineWidth = b.borderWidth;

    // Rounded rect
    this._roundRect(ctx, 0, 0, this.width, this.height, b.cornerRadius);
    ctx.fill();
    ctx.stroke();

    // Text
    applyFont(ctx, theme.fonts.button);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textColor = this.state === 'disabled' ? theme.colors.disabled :
                      this.state === 'hover' ? theme.colors.buttonHover :
                      theme.colors.buttonText;

    ctx.fillStyle = theme.colors.textShadow;
    ctx.fillText(this.text, this.width / 2 + 2, this.height / 2 + 2);
    ctx.fillStyle = textColor;
    ctx.fillText(this.text, this.width / 2, this.height / 2);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  onMouseEnter(e) {
    if (this.state === 'disabled') return;
    this.state = 'hover';
    audio.playHover();
  }

  onMouseLeave(e) {
    if (this.state === 'disabled') return;
    this.state = 'normal';
  }

  onMouseDown(e) {
    if (this.state === 'disabled') return;
    this.state = 'active';
  }

  onMouseUp(e) {
    if (this.state === 'disabled') return;
    if (this.state === 'active' && this.hitTest(e.x, e.y)) {
      audio.playClick();
      if (this.onClick) this.onClick();
    }
    this.state = this.hitTest(e.x, e.y) ? 'hover' : 'normal';
  }
}

export class Image extends Node {
  constructor(imageId = null) {
    super();
    this.imageId = imageId;
    this.image = null; // Set after assets load
    this.srcX = 0;
    this.srcY = 0;
    this.srcW = null; // null = full image
    this.srcH = null;
  }

  setImage(img) {
    this.image = img;
    if (img && !this.width) this.width = img.width;
    if (img && !this.height) this.height = img.height;
  }

  drawSelf(ctx) {
    if (!this.image) return;
    const sw = this.srcW ?? this.image.width;
    const sh = this.srcH ?? this.image.height;
    ctx.drawImage(this.image, this.srcX, this.srcY, sw, sh, 0, 0, this.width, this.height);
  }
}
