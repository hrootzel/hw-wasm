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
    if (typeof this.settings.engineVolume !== 'number') this.settings.engineVolume = 100;
    if (typeof this.settings.engineSoundEnabled !== 'boolean') this.settings.engineSoundEnabled = true;
    if (typeof this.settings.engineMusicEnabled !== 'boolean') this.settings.engineMusicEnabled = true;
    if (typeof this.settings.startInFullscreen !== 'boolean') this.settings.startInFullscreen = false;
    this._buildUI();
  }

  _buildUI() {
    this.addTitle('Settings');

    // Center the settings panel on widescreen.
    const contentW = 820;
    const contentX = Math.round((this.width - contentW) / 2);

    let y = 120;
    const leftX = contentX;
    const rightX = contentX + 260;
    const spacing = 60;

    // Engine master volume (Qt parity)
    const engineLabel = new Label('Game Volume', 'body');
    engineLabel.x = leftX;
    engineLabel.y = y;
    engineLabel.width = 200;
    engineLabel.height = 30;
    this.addChild(engineLabel);

    this.engineSlider = new Slider(0, 100, this.settings.engineVolume, (v) => {
      this.settings.engineVolume = v;
    });
    this.engineSlider.x = rightX;
    this.engineSlider.y = y;
    this.engineSlider.width = 300;
    this.addChild(this.engineSlider);

    this.engineValue = new Label(this.settings.engineVolume + '%', 'body');
    this.engineValue.x = rightX + 320;
    this.engineValue.y = y;
    this.engineValue.width = 60;
    this.engineValue.height = 30;
    this.addChild(this.engineValue);

    y += spacing;

    this.engineSoundCheck = new Checkbox('In-Game Sound', this.settings.engineSoundEnabled, (v) => {
      this.settings.engineSoundEnabled = v;
    });
    this.engineSoundCheck.x = leftX;
    this.engineSoundCheck.y = y;
    this.engineSoundCheck.width = 220;
    this.addChild(this.engineSoundCheck);

    this.engineMusicCheck = new Checkbox('In-Game Music', this.settings.engineMusicEnabled, (v) => {
      this.settings.engineMusicEnabled = v;
    });
    this.engineMusicCheck.x = rightX;
    this.engineMusicCheck.y = y;
    this.engineMusicCheck.width = 220;
    this.addChild(this.engineMusicCheck);

    y += spacing;

    // Frontend music volume
    const musicLabel = new Label('Frontend Music', 'body');
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

    // Frontend SFX volume
    const sfxLabel = new Label('Frontend Sound', 'body');
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
    controlsBtn.x = (this.width - controlsBtn.width) / 2;
    controlsBtn.y = y;
    this.addChild(controlsBtn);

    y += 80;

    // Fullscreen is a user-gesture-driven browser feature, so present it as a button.
    this.fullscreenStatus = new Label('', 'small');
    this.fullscreenStatus.x = contentX;
    this.fullscreenStatus.y = y + 8;
    this.fullscreenStatus.width = 260;
    this.fullscreenStatus.height = 24;
    this.fullscreenStatus.color = 'rgba(255,255,255,0.7)';
    this.addChild(this.fullscreenStatus);

    this.startInFullscreenCheck = new Checkbox('Start game in fullscreen', this.settings.startInFullscreen, (v) => {
      this.settings.startInFullscreen = v;
    });
    this.startInFullscreenCheck.x = contentX;
    this.startInFullscreenCheck.y = y + 34;
    this.startInFullscreenCheck.width = 260;
    this.addChild(this.startInFullscreenCheck);

    this.fullscreenBtn = new Button('Enter Fullscreen', () => this._toggleFullscreen());
    this.fullscreenBtn.x = contentX + contentW - this.fullscreenBtn.width;
    this.fullscreenBtn.y = y;
    this.addChild(this.fullscreenBtn);

    this._onFullscreenChange = () => {
      const enabled = !!document.fullscreenElement;
      this.settings.fullscreen = enabled;
      this._syncFullscreenUi();
    };
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    this._syncFullscreenUi();

    // Back button
    const backBtn = this.addBackButton(() => {
      storage.saveSettings(this.settings);
      core.popPage();
    });
    backBtn.x = contentX;
  }

  _syncFullscreenUi() {
    const enabled = !!document.fullscreenElement;
    this.fullscreenBtn.text = enabled ? 'Exit Fullscreen' : 'Enter Fullscreen';
    this.fullscreenStatus.text = enabled ? 'Fullscreen enabled' : 'Fullscreen disabled';
  }

  _toggleFullscreen() {
    const enable = !document.fullscreenElement;
    if (enable) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  update(dt) {
    super.update(dt);
    this.engineValue.text = this.settings.engineVolume + '%';
    this.musicValue.text = this.settings.musicVolume + '%';
    this.sfxValue.text = this.settings.sfxVolume + '%';
  }

  onExit() {
    storage.saveSettings(this.settings);
    if (this._onFullscreenChange) {
      document.removeEventListener('fullscreenchange', this._onFullscreenChange);
      this._onFullscreenChange = null;
    }
  }
}
