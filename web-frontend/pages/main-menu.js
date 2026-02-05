// Main Menu Page
import { Page } from '../ui/scene.js';
import { Button, Label, Image } from '../ui/widgets.js';
import { theme } from '../ui/theme.js';
import { assets } from '../assets.js';
import { core } from '../ui/core.js';
import { SettingsPage } from './settings.js';
import { ControlsPage } from './controls.js';
import { TeamEditorPage } from './team-editor.js';
import { SchemeEditorPage } from './scheme-editor.js';
import { WeaponEditorPage } from './weapon-editor.js';

export class MainMenuPage extends Page {
  constructor() {
    super();
    this._buildUI();
  }

  _buildUI() {
    this.bgGradient = true;

    this.logo = new Label('HEDGEWARS', 'title');
    this.logo.x = 512;
    this.logo.y = 80;
    this.logo.width = 400;
    this.logo.height = 60;
    this.logo.align = 'center';
    this.logo.color = '#FFDD44';
    this.addChild(this.logo);

    this.subtitle = new Label('A turn-based strategy game', 'body');
    this.subtitle.x = 512;
    this.subtitle.y = 140;
    this.subtitle.width = 400;
    this.subtitle.height = 30;
    this.subtitle.align = 'center';
    this.addChild(this.subtitle);

    const buttonX = (1024 - theme.button.width) / 2;
    let y = 250;
    const sp = 60;

    const buttons = [
      ['Local Game', () => console.log('TODO: LocalGamePage')],
      ['Settings', () => core.pushPage(new SettingsPage())],
      ['Controls', () => core.pushPage(new ControlsPage())],
      ['Edit Teams', () => core.pushPage(new TeamEditorPage())],
      ['Edit Schemes', () => core.pushPage(new SchemeEditorPage())],
      ['Edit Weapons', () => core.pushPage(new WeaponEditorPage())]
    ];

    for (const [label, action] of buttons) {
      const btn = new Button(label, action);
      btn.x = buttonX;
      btn.y = y;
      this.addChild(btn);
      y += sp;
    }

    this.version = new Label('Web Frontend v0.1', 'small');
    this.version.x = 10;
    this.version.y = 748;
    this.version.width = 200;
    this.version.height = 20;
    this.version.shadow = false;
    this.version.color = 'rgba(255,255,255,0.5)';
    this.addChild(this.version);
  }

  drawSelf(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#1a3a5c');
    grad.addColorStop(0.4, '#2d5a7b');
    grad.addColorStop(0.7, '#4a7a9a');
    grad.addColorStop(1, '#2d5a7b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    const clouds = assets.get('clouds');
    if (clouds) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(clouds, 0, this.height - 200, this.width, 200);
      ctx.globalAlpha = 1;
    }
  }
}
