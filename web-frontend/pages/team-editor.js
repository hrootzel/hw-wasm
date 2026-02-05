// Team editor page
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { TextInput, ScrollList, Dropdown } from '../ui/widgets-adv.js';
import { storage } from '../data/storage.js';
import { DEFAULT_TEAMS, createDefaultTeam } from '../data/defaults.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';

const DIFFICULTIES = ['Human', 'Level 1 (Easy)', 'Level 2', 'Level 3', 'Level 4', 'Level 5 (Hard)'];

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
    if (this.teams.length > 0) {
      this._selectTeam(0);
    }
  }

  _buildUI() {
    this.addTitle('Edit Teams');

    // Team list (left side)
    const listLabel = new Label('Teams', 'body');
    listLabel.x = 30;
    listLabel.y = 100;
    listLabel.width = 200;
    listLabel.height = 30;
    this.addChild(listLabel);

    this.teamList = new ScrollList(
      this.teams.map(t => t.name),
      (idx) => this._selectTeam(idx)
    );
    this.teamList.x = 30;
    this.teamList.y = 130;
    this.teamList.width = 220;
    this.teamList.height = 450;
    this.addChild(this.teamList);

    // New/Delete buttons
    const newBtn = new Button('New Team', () => this._newTeam());
    newBtn.x = 30;
    newBtn.y = 600;
    newBtn.width = 105;
    this.addChild(newBtn);

    const delBtn = new Button('Delete', () => this._deleteTeam());
    delBtn.x = 145;
    delBtn.y = 600;
    delBtn.width = 105;
    this.addChild(delBtn);

    // Edit panel (right side)
    const editX = 280;
    let y = 100;

    // Team name
    const nameLabel = new Label('Team Name', 'body');
    nameLabel.x = editX;
    nameLabel.y = y;
    nameLabel.width = 150;
    nameLabel.height = 30;
    this.addChild(nameLabel);

    this.nameInput = new TextInput('', (v) => {
      if (this.selectedTeam) {
        this.selectedTeam.name = v;
        this.dirty = true;
        this._updateList();
      }
    });
    this.nameInput.x = editX + 160;
    this.nameInput.y = y;
    this.nameInput.width = 300;
    this.addChild(this.nameInput);

    y += 50;

    // Difficulty
    const diffLabel = new Label('Difficulty', 'body');
    diffLabel.x = editX;
    diffLabel.y = y;
    diffLabel.width = 150;
    diffLabel.height = 30;
    this.addChild(diffLabel);

    this.diffDropdown = new Dropdown(DIFFICULTIES, 0, (idx) => {
      if (this.selectedTeam) {
        this.selectedTeam.difficulty = idx;
        this.dirty = true;
      }
    });
    this.diffDropdown.x = editX + 160;
    this.diffDropdown.y = y;
    this.diffDropdown.width = 200;
    this.addChild(this.diffDropdown);

    y += 60;

    // Hedgehog names
    const hogLabel = new Label('Hedgehog Names', 'body');
    hogLabel.x = editX;
    hogLabel.y = y;
    hogLabel.width = 200;
    hogLabel.height = 30;
    this.addChild(hogLabel);

    y += 35;
    this.hogInputs = [];
    for (let i = 0; i < 8; i++) {
      const input = new TextInput(`Hedgehog ${i + 1}`, (v) => {
        if (this.selectedTeam) {
          this.selectedTeam.hedgehogs[i].name = v;
          this.dirty = true;
        }
      });
      input.x = editX + (i % 2) * 250;
      input.y = y + Math.floor(i / 2) * 45;
      input.width = 230;
      input.maxLength = 20;
      this.addChild(input);
      this.hogInputs.push(input);
    }

    // Save button
    const saveBtn = new Button('Save Changes', () => this._saveTeam());
    saveBtn.x = 734;
    saveBtn.y = 700;
    this.addChild(saveBtn);

    // Back button
    this.addBackButton(() => {
      if (this.dirty) this._saveTeam();
      core.popPage();
    });
  }

  _selectTeam(idx) {
    if (this.dirty) this._saveTeam();
    
    this.teamList.selectedIndex = idx;
    this.selectedTeam = this.teams[idx];
    
    if (this.selectedTeam) {
      this.nameInput.text = this.selectedTeam.name;
      this.nameInput.cursorPos = this.selectedTeam.name.length;
      this.diffDropdown.selectedIndex = this.selectedTeam.difficulty;
      
      for (let i = 0; i < 8; i++) {
        this.hogInputs[i].text = this.selectedTeam.hedgehogs[i]?.name || '';
        this.hogInputs[i].cursorPos = this.hogInputs[i].text.length;
      }
    }
    
    this.dirty = false;
  }

  _updateList() {
    this.teamList.items = this.teams.map(t => t.name);
  }

  _newTeam() {
    const name = `Team ${this.teams.length + 1}`;
    const team = createDefaultTeam(name);
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
    // Check if any input is focused
    const inputs = [this.nameInput, ...this.hogInputs];
    for (const input of inputs) {
      if (input.focused) {
        input.handleKey(e);
        e.original?.preventDefault();
        return;
      }
    }
    
    super.onKeyDown(e);
  }

  onExit() {
    if (this.dirty) this._saveTeam();
  }
}
