// Settings page - audio, video settings
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { Slider, Checkbox } from '../ui/widgets-adv.js';
import { storage } from '../data/storage.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';
import { ControlsPage } from './controls.js';

export class SettingsPage extends BasePage {
  constructor() {
    super('Settings');
    this.settings = storage.getSettings();
    this._buildUI();
  }

  _buildUI() {
    this.addTitle('Settings');
    
    let y = 120;
    const leftX = 200;
    const rightX = 450;
    const spacing = 60;

    // Music Volume
    const musicLabel = new Label('Music Volume', 'body');
    musicLabel.x = leftX;
    musicLabel.y = y;
    musicLabel.width = 200;
    musicLabel.height = 30;
    this.addChild(musicLabel);

    this.musicSlider = new Slider(0, 100, this.settings.musicVolume, (v) => {
      this.settings.musicVolume = v;
      audio.setMusicVolume(v / 100);
    });
    this.musicSlider.x = rightX;
    this.musicSlider.y = y;
    this.musicSlider.width = 300;
    this.addChild(this.musicSlider);

    this.musicValue = new Label(this.settings.musicVolume + '%', 'body');
    this.musicValue.x = rightX + 320;
    this.musicValue.y = y;
    this.musicValue.width = 60;
    this.musicValue.height = 30;
    this.addChild(this.musicValue);

    y += spacing;

    // SFX Volume
    const sfxLabel = new Label('Sound Effects', 'body');
    sfxLabel.x = leftX;
    sfxLabel.y = y;
    sfxLabel.width = 200;
    sfxLabel.height = 30;
    this.addChild(sfxLabel);

    this.sfxSlider = new Slider(0, 100, this.settings.sfxVolume, (v) => {
      this.settings.sfxVolume = v;
      audio.setSfxVolume(v / 100);
    });
    this.sfxSlider.x = rightX;
    this.sfxSlider.y = y;
    this.sfxSlider.width = 300;
    this.addChild(this.sfxSlider);

    this.sfxValue = new Label(this.settings.sfxVolume + '%', 'body');
    this.sfxValue.x = rightX + 320;
    this.sfxValue.y = y;
    this.sfxValue.width = 60;
    this.sfxValue.height = 30;
    this.addChild(this.sfxValue);

    y += spacing + 20;

    // Controls button
    const controlsBtn = new Button('Configure Controls', () => {
      core.pushPage(new ControlsPage());
    });
    controlsBtn.x = (1024 - 260) / 2;
    controlsBtn.y = y;
    this.addChild(controlsBtn);

    y += 80;

    // Fullscreen checkbox
    this.fullscreenCheck = new Checkbox('Fullscreen Mode', this.settings.fullscreen, (v) => {
      this.settings.fullscreen = v;
      this._toggleFullscreen(v);
    });
    this.fullscreenCheck.x = (1024 - 200) / 2;
    this.fullscreenCheck.y = y;
    this.addChild(this.fullscreenCheck);

    // Back button
    this.addBackButton(() => {
      storage.saveSettings(this.settings);
      core.popPage();
    });
  }

  _toggleFullscreen(enable) {
    if (enable) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  update(dt) {
    super.update(dt);
    this.musicValue.text = this.settings.musicVolume + '%';
    this.sfxValue.text = this.settings.sfxVolume + '%';
  }

  onExit() {
    storage.saveSettings(this.settings);
  }
}
