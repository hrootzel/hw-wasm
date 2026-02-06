// Local game setup page
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { Dropdown, Checkbox, TextInput } from '../ui/widgets-adv.js';
import { storage } from '../data/storage.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';
import { Node } from '../ui/scene.js';
import { buildConfig, buildArgs } from '../data/config-builder.js';

const MAP_TYPES = ['Random', 'Maze', 'Drawn'];
const THEMES = [
  'Art', 'Bamboo', 'Bath', 'Beach', 'Blox', 'Brick', 'Cake', 'Castle', 'Cave',
  'Cheese', 'Christmas', 'City', 'Compost', 'CrazyMission', 'Deepspace', 'Desert',
  'Digital', 'EarthRise', 'Eyes', 'Freeway', 'Fruit', 'Golf', 'Halloween', 'Hell',
  'Hoggywood', 'Island', 'Jungle', 'Nature', 'Olympics', 'Planes', 'Sheep', 'Snow',
  'Stage', 'Underwater'
];

// Team selector widget
class TeamSelector extends Node {
  constructor(onTeamsChange) {
    super();
    this.width = 300;
    this.height = 500;
    this.teams = storage.getTeams();
    this.selectedTeams = [];
    this.onTeamsChange = onTeamsChange;
  }

  draw(ctx) {
    // Background
    ctx.fillStyle = 'rgba(40,50,70,0.85)';
    ctx.strokeStyle = '#88AADD';
    ctx.lineWidth = 2;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Title
    ctx.fillStyle = '#FFDD44';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Teams', this.x + this.width / 2, this.y + 15);

    // Available teams
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let y = this.y + 50;
    
    for (let i = 0; i < Math.min(this.teams.length, 8); i++) {
      const team = this.teams[i];
      const selected = this.selectedTeams.includes(team);
      
      if (selected) {
        ctx.fillStyle = 'rgba(80,110,160,0.5)';
        ctx.fillRect(this.x + 10, y, this.width - 20, 28);
      }
      
      ctx.fillStyle = selected ? '#FFDD44' : '#fff';
      ctx.fillText(team.name, this.x + 20, y + 14);
      y += 30;
    }

    // Instructions
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click to add/remove teams', this.x + this.width / 2, this.y + this.height - 15);
  }

  hitTest(gx, gy) {
    const local = this.globalToLocal(gx, gy);
    return local.x >= 0 && local.x < this.width && local.y >= 0 && local.y < this.height;
  }

  onMouseDown(e) {
    const local = this.globalToLocal(e.x, e.y);
    const idx = Math.floor((local.y - 50) / 30);
    
    if (idx >= 0 && idx < this.teams.length) {
      const team = this.teams[idx];
      const index = this.selectedTeams.indexOf(team);
      
      if (index >= 0) {
        this.selectedTeams.splice(index, 1);
      } else if (this.selectedTeams.length < 6) {
        this.selectedTeams.push(team);
      }
      
      audio.playClick();
      if (this.onTeamsChange) this.onTeamsChange(this.selectedTeams);
    }
  }
}

export class LocalGamePage extends BasePage {
  constructor() {
    super('Local Game');
    this.schemes = storage.getSchemes();
    this.weaponSets = storage.getWeaponSets();
    this.selectedTeams = [];
    this._buildUI();
  }

  _buildUI() {
    this.addTitle('Local Game');

    const leftX = 30;
    let y = 100;

    // Map section
    this._addLabel('Map', leftX, y);
    y += 35;

    this._addLabel('Type:', leftX, y);
    this.mapTypeDropdown = new Dropdown(MAP_TYPES, 0, () => {});
    this.mapTypeDropdown.x = leftX + 80;
    this.mapTypeDropdown.y = y;
    this.mapTypeDropdown.width = 150;
    this.addChild(this.mapTypeDropdown);
    y += 45;

    this._addLabel('Theme:', leftX, y);
    this.themeDropdown = new Dropdown(THEMES, THEMES.indexOf('Nature'), () => {});
    this.themeDropdown.x = leftX + 80;
    this.themeDropdown.y = y;
    this.themeDropdown.width = 150;
    this.addChild(this.themeDropdown);
    y += 45;

    this._addLabel('Seed:', leftX, y);
    this.seedInput = new TextInput('', (v) => {});
    this.seedInput.x = leftX + 80;
    this.seedInput.y = y;
    this.seedInput.width = 150;
    this.seedInput.placeholder = 'Random';
    this.addChild(this.seedInput);
    
    const randomBtn = new Button('Random', () => {
      this.seedInput.text = '';
      this.seedInput.cursorPos = 0;
    });
    randomBtn.x = leftX + 240;
    randomBtn.y = y;
    randomBtn.width = 90;
    randomBtn.height = 30;
    randomBtn.fontSize = 14;
    this.addChild(randomBtn);
    y += 60;

    // Game settings
    this._addLabel('Game Settings', leftX, y);
    y += 35;

    this._addLabel('Scheme:', leftX, y);
    this.schemeDropdown = new Dropdown(this.schemes.map(s => s.name), 0, () => {});
    this.schemeDropdown.x = leftX + 80;
    this.schemeDropdown.y = y;
    this.schemeDropdown.width = 200;
    this.addChild(this.schemeDropdown);
    y += 45;

    this._addLabel('Weapons:', leftX, y);
    this.weaponDropdown = new Dropdown(this.weaponSets.map(w => w.name), 0, () => {});
    this.weaponDropdown.x = leftX + 80;
    this.weaponDropdown.y = y;
    this.weaponDropdown.width = 200;
    this.addChild(this.weaponDropdown);

    // Team selector (right side)
    this.teamSelector = new TeamSelector((teams) => {
      this.selectedTeams = teams;
    });
    this.teamSelector.x = 400;
    this.teamSelector.y = 100;
    this.teamSelector.interactive = true;
    this.addChild(this.teamSelector);

    // Start button
    const startBtn = new Button('Start Game', () => this._startGame());
    startBtn.x = this.width - startBtn.width - 30;
    startBtn.y = this.height - startBtn.height - 18;
    this.addChild(startBtn);

    this.addBackButton(() => core.popPage());
  }

  _addLabel(text, x, y) {
    const l = new Label(text, 'body');
    l.x = x;
    l.y = y;
    l.width = 200;
    l.height = 30;
    this.addChild(l);
  }

  onKeyDown(e) {
    if (this.seedInput.focused) {
      this.seedInput.handleKey(e);
      e.original?.preventDefault();
      return;
    }
    super.onKeyDown(e);
  }

  _startGame() {
    if (this.selectedTeams.length < 2) {
      console.log('Need at least 2 teams');
      return;
    }

    const mapType = MAP_TYPES[this.mapTypeDropdown.selectedIndex];
    const theme = THEMES[this.themeDropdown.selectedIndex];
    const seed = this.seedInput.text || '';
    const scheme = this.schemes[this.schemeDropdown.selectedIndex];
    const weaponSet = this.weaponSets[this.weaponDropdown.selectedIndex];

    const cfgText = buildConfig({
      mapType, theme, seed, scheme, weaponSet,
      teams: this.selectedTeams
    });

    console.log('[local-game] config:\n' + cfgText);

    const args = buildArgs(cfgText);
    console.log('[local-game] args:', args);

    // Launch engine
    localStorage.setItem('hw-wasm-webcfg64', btoa(cfgText));

    // Navigate to engine page (works in both dev and build layouts)
    const base = window.location.pathname.replace(/\/web-frontend\/.*/, '');
    const engineUrl = base + '/hwengine.html';
    console.log('[local-game] Navigating to engine:', engineUrl);
    window.location.href = engineUrl;

    audio.playClick();
  }
}
