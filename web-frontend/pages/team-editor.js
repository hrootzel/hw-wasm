// Team editor page with graphics
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { TextInput, ScrollList, Dropdown } from '../ui/widgets-adv.js';
import { storage } from '../data/storage.js';
import { DEFAULT_TEAMS, createDefaultTeam } from '../data/defaults.js';
import { assets, getHatPath, getFlagPath, getGravePath } from '../assets.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';
import { Node } from '../ui/scene.js';

const DIFFICULTIES = ['Human', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
const COMMON_HATS = ['NoHat', 'cap_blue', 'cap_red', 'crown', 'chef', 'constructor', 'dwarf', 'Elvis', 'knight', 'lambda', 'pirate_hat', 'Santa', 'Skull', 'Viking', 'WizardHat'];
const COMMON_FLAGS = ['hedgewars', 'cm_balls', 'cm_binary', 'cm_birdy', 'cm_earth', 'cm_hw', 'united_states', 'united_kingdom', 'germany', 'france', 'spain', 'italy', 'japan', 'china', 'brazil', 'canada'];
const COMMON_GRAVES = ['Grave', 'Bone', 'coffin', 'Flower', 'Rip', 'skull', 'Simple', 'cross', 'heart'];

// Image preview widget that loads on demand
class ImagePreview extends Node {
  constructor(getPath, size = 32) {
    super();
    this.getPath = getPath;
    this.size = size;
    this.width = size;
    this.height = size;
    this.currentId = null;
    this.image = null;
  }

  setItem(id) {
    if (id === this.currentId) return;
    this.currentId = id;
    this.image = null;
    if (id) {
      assets.loadOnDemand(`preview_${id}`, this.getPath(id)).then(img => {
        if (this.currentId === id) this.image = img;
      });
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#222';
    ctx.fillRect(this.x, this.y, this.size, this.size);
    if (this.image) {
      ctx.drawImage(this.image, 0, 0, this.image.width, Math.min(this.image.height, this.image.width),
        this.x, this.y, this.size, this.size);
    }
  }
}

export class TeamEditorPage extends BasePage {
  constructor() {
    super('Edit Teams');
    this.teams = storage.getTeams();
    if (this.teams.length === 0) {
      this.teams = JSON.parse(JSON.stringify(DEFAULT_TEAMS));
      storage.saveTeams(this.teams);
    }
    this.selectedTeam = null;
    this.dirty = false;
    this._buildUI();
    if (this.teams.length > 0) this._selectTeam(0);
  }

  _buildUI() {
    this.addTitle('Edit Teams');

    // Team list
    this.teamList = new ScrollList(this.teams.map(t => t.name), (i) => this._selectTeam(i));
    this.teamList.x = 30; this.teamList.y = 100;
    this.teamList.width = 180; this.teamList.height = 480;
    this.addChild(this.teamList);

    // New/Delete
    const newBtn = new Button('New', () => this._newTeam());
    newBtn.x = 30; newBtn.y = 600; newBtn.width = 85;
    this.addChild(newBtn);
    const delBtn = new Button('Delete', () => this._deleteTeam());
    delBtn.x = 125; delBtn.y = 600; delBtn.width = 85;
    this.addChild(delBtn);

    const ex = 240;
    let y = 100;

    // Team name
    this._addLabel('Team Name', ex, y);
    this.nameInput = new TextInput('', (v) => {
      if (this.selectedTeam) { this.selectedTeam.name = v; this.dirty = true; this._updateList(); }
    });
    this.nameInput.x = ex + 120; this.nameInput.y = y; this.nameInput.width = 200;
    this.addChild(this.nameInput);
    y += 45;

    // Difficulty
    this._addLabel('Difficulty', ex, y);
    this.diffDropdown = new Dropdown(DIFFICULTIES, 0, (i) => {
      if (this.selectedTeam) { this.selectedTeam.difficulty = i; this.dirty = true; }
    });
    this.diffDropdown.x = ex + 120; this.diffDropdown.y = y; this.diffDropdown.width = 140;
    this.addChild(this.diffDropdown);
    y += 50;

    // Hat
    this._addLabel('Hat', ex, y);
    this.hatPreview = new ImagePreview(getHatPath, 40);
    this.hatPreview.x = ex + 120; this.hatPreview.y = y;
    this.addChild(this.hatPreview);
    this.hatDropdown = new Dropdown(COMMON_HATS, 0, (i) => {
      if (this.selectedTeam) {
        this.selectedTeam.hat = COMMON_HATS[i];
        this.hatPreview.setItem(COMMON_HATS[i]);
        this.dirty = true;
      }
    });
    this.hatDropdown.x = ex + 170; this.hatDropdown.y = y + 5; this.hatDropdown.width = 150;
    this.addChild(this.hatDropdown);
    y += 50;

    // Flag
    this._addLabel('Flag', ex, y);
    this.flagPreview = new ImagePreview(getFlagPath, 40);
    this.flagPreview.x = ex + 120; this.flagPreview.y = y;
    this.addChild(this.flagPreview);
    this.flagDropdown = new Dropdown(COMMON_FLAGS, 0, (i) => {
      if (this.selectedTeam) {
        this.selectedTeam.flag = COMMON_FLAGS[i];
        this.flagPreview.setItem(COMMON_FLAGS[i]);
        this.dirty = true;
      }
    });
    this.flagDropdown.x = ex + 170; this.flagDropdown.y = y + 5; this.flagDropdown.width = 150;
    this.addChild(this.flagDropdown);
    y += 50;

    // Grave
    this._addLabel('Grave', ex, y);
    this.gravePreview = new ImagePreview(getGravePath, 40);
    this.gravePreview.x = ex + 120; this.gravePreview.y = y;
    this.addChild(this.gravePreview);
    this.graveDropdown = new Dropdown(COMMON_GRAVES, 0, (i) => {
      if (this.selectedTeam) {
        this.selectedTeam.grave = COMMON_GRAVES[i];
        this.gravePreview.setItem(COMMON_GRAVES[i]);
        this.dirty = true;
      }
    });
    this.graveDropdown.x = ex + 170; this.graveDropdown.y = y + 5; this.graveDropdown.width = 150;
    this.addChild(this.graveDropdown);
    y += 55;

    // Hedgehog names
    this._addLabel('Hedgehogs', ex, y);
    
    // Hedgehog count controls
    const minusBtn = new Button('-', () => this._adjustHogCount(-1));
    minusBtn.x = ex + 120; minusBtn.y = y; minusBtn.width = 30; minusBtn.height = 30;
    this.addChild(minusBtn);
    
    this.hogCountLabel = new Label('8', 'body');
    this.hogCountLabel.x = ex + 155; this.hogCountLabel.y = y;
    this.hogCountLabel.width = 30; this.hogCountLabel.height = 30;
    this.hogCountLabel.align = 'center';
    this.addChild(this.hogCountLabel);
    
    const plusBtn = new Button('+', () => this._adjustHogCount(1));
    plusBtn.x = ex + 190; plusBtn.y = y; plusBtn.width = 30; plusBtn.height = 30;
    this.addChild(plusBtn);
    
    y += 40;
    this.hogInputs = [];
    for (let i = 0; i < 8; i++) {
      const input = new TextInput(`Hog ${i + 1}`, (v) => {
        if (this.selectedTeam) { this.selectedTeam.hedgehogs[i].name = v; this.dirty = true; }
      });
      input.x = ex + (i % 2) * 200;
      input.y = y + Math.floor(i / 2) * 40;
      input.width = 180;
      input.maxLength = 20;
      this.addChild(input);
      this.hogInputs.push(input);
    }

    // Save
    const saveBtn = new Button('Save', () => this._saveTeam());
    saveBtn.x = 734; saveBtn.y = 700;
    this.addChild(saveBtn);

    this.addBackButton(() => { if (this.dirty) this._saveTeam(); core.popPage(); });
  }

  _addLabel(text, x, y) {
    const l = new Label(text, 'body');
    l.x = x; l.y = y; l.width = 110; l.height = 30;
    this.addChild(l);
  }

  _selectTeam(idx) {
    if (this.dirty) this._saveTeam();
    this.teamList.selectedIndex = idx;
    this.selectedTeam = this.teams[idx];
    if (this.selectedTeam) {
      // Ensure hedgehogs array exists and has hogCount property
      if (!this.selectedTeam.hedgehogs) this.selectedTeam.hedgehogs = [];
      if (!this.selectedTeam.hogCount) this.selectedTeam.hogCount = this.selectedTeam.hedgehogs.length || 8;
      
      this.nameInput.text = this.selectedTeam.name;
      this.nameInput.cursorPos = this.selectedTeam.name.length;
      this.diffDropdown.selectedIndex = this.selectedTeam.difficulty || 0;
      
      // Hat/Flag/Grave
      const hatIdx = COMMON_HATS.indexOf(this.selectedTeam.hat);
      this.hatDropdown.selectedIndex = hatIdx >= 0 ? hatIdx : 0;
      this.hatPreview.setItem(this.selectedTeam.hat || COMMON_HATS[0]);
      
      const flagIdx = COMMON_FLAGS.indexOf(this.selectedTeam.flag);
      this.flagDropdown.selectedIndex = flagIdx >= 0 ? flagIdx : 0;
      this.flagPreview.setItem(this.selectedTeam.flag || COMMON_FLAGS[0]);
      
      const graveIdx = COMMON_GRAVES.indexOf(this.selectedTeam.grave);
      this.graveDropdown.selectedIndex = graveIdx >= 0 ? graveIdx : 0;
      this.gravePreview.setItem(this.selectedTeam.grave || COMMON_GRAVES[0]);
      
      this.hogCountLabel.text = String(this.selectedTeam.hogCount);
      
      for (let i = 0; i < 8; i++) {
        const visible = i < this.selectedTeam.hogCount;
        this.hogInputs[i].visible = visible;
        if (visible) {
          this.hogInputs[i].text = this.selectedTeam.hedgehogs[i]?.name || '';
          this.hogInputs[i].cursorPos = this.hogInputs[i].text.length;
        }
      }
    }
    this.dirty = false;
  }

  _adjustHogCount(delta) {
    if (!this.selectedTeam) return;
    const newCount = Math.max(1, Math.min(8, (this.selectedTeam.hogCount || 8) + delta));
    if (newCount === this.selectedTeam.hogCount) return;
    
    this.selectedTeam.hogCount = newCount;
    
    // Ensure hedgehogs array has enough entries
    while (this.selectedTeam.hedgehogs.length < newCount) {
      this.selectedTeam.hedgehogs.push({ name: `Hedgehog ${this.selectedTeam.hedgehogs.length + 1}` });
    }
    
    this.hogCountLabel.text = String(newCount);
    for (let i = 0; i < 8; i++) {
      this.hogInputs[i].visible = i < newCount;
    }
    
    this.dirty = true;
    audio.playClick();
  }

  _updateList() { this.teamList.items = this.teams.map(t => t.name); }

  _newTeam() {
    const team = createDefaultTeam(`Team ${this.teams.length + 1}`);
    this.teams.push(team);
    this._updateList();
    this._selectTeam(this.teams.length - 1);
    storage.saveTeams(this.teams);
    audio.playClick();
  }

  _deleteTeam() {
    if (!this.selectedTeam || this.teams.length <= 1) return;
    const idx = this.teams.indexOf(this.selectedTeam);
    this.teams.splice(idx, 1);
    this._updateList();
    this._selectTeam(Math.min(idx, this.teams.length - 1));
    storage.saveTeams(this.teams);
    this.dirty = false;
    audio.playClick();
  }

  _saveTeam() {
    if (!this.dirty) return;
    storage.saveTeams(this.teams);
    this.dirty = false;
  }

  onKeyDown(e) {
    const inputs = [this.nameInput, ...this.hogInputs];
    for (const input of inputs) {
      if (input.focused) { input.handleKey(e); e.original?.preventDefault(); return; }
    }
    super.onKeyDown(e);
  }

  onExit() { if (this.dirty) this._saveTeam(); }
}
