// Team editor page with graphics
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { TextInput, ScrollList, Dropdown } from '../ui/widgets-adv.js';
import { storage } from '../data/storage.js';
import { DEFAULT_TEAMS, createDefaultTeam } from '../data/defaults.js';
import { assets, getHatPath, getFlagPath, getGravePath, getFortPath } from '../assets.js';
import { audio } from '../util/audio.js';
import { core } from '../ui/core.js';
import { Node } from '../ui/scene.js';
import { IconPicker } from '../ui/icon-picker.js';
import { randomHogNamesSync } from '../util/namegen.js';

const DIFFICULTIES = ['Human', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
const TEAM_COLORS = [
  { name: 'Red', value: 0xffd12b42 },
  { name: 'Blue', value: 0xff4980c1 },
  { name: 'Green', value: 0xff6ab530 },
  { name: 'Purple', value: 0xffbc64c4 },
  { name: 'Orange', value: 0xffe76d14 },
  { name: 'Cyan', value: 0xff3fb6e6 },
  { name: 'Yellow', value: 0xffe3e90c },
  { name: 'Mint', value: 0xff61d4ac },
  { name: 'Pink', value: 0xfff1c3e1 }
];
const ALL_HATS = ['NoHat', '4gsuif', 'AkuAku', 'Bandit', 'Coonskin3', 'Cowboy', 'Dan', 'Dauber', 'DayAndNight', 'Disguise', 'Dragon', 'Einstein', 'Elvis', 'Eva_00b', 'Eva_00y', 'Evil', 'Gasmask', 'Glasses', 'HogInTheHat', 'IndianChief', 'InfernalHorns', 'Jason', 'Joker', 'Laminaria', 'MegaHogX', 'Meteorhelmet', 'Moustache', 'Moustache_glasses', 'Mummy', 'NinjaFull', 'NinjaStraight', 'NinjaTriangle', 'OldMan', 'Pantsu', 'Plunger', 'RSR', 'Rain', 'Rambo', 'RamboClean', 'RobinHood', 'Samurai', 'Santa', 'ShaggyYeti', 'ShortHair_Black', 'ShortHair_Brown', 'ShortHair_Grey', 'ShortHair_Red', 'ShortHair_Yellow', 'Skull', 'Sleepwalker', 'Sniper', 'SparkleSuperFun', 'StrawHat', 'StrawHatEyes', 'StrawHatFacial', 'SunWukong', 'Sunglasses', 'TeamHeadband', 'TeamSoldier', 'TeamTophat', 'TeamWheatley', 'Terminator_Glasses', 'Viking', 'WhySoSerious', 'WizardHat', 'Zombi', 'android', 'angel', 'anzac', 'barrelhider', 'bb_bob', 'bb_bub', 'bb_cororon', 'bb_kululun', 'beefeater', 'beefeaterhat', 'bishop', 'bobby', 'bobby2v', 'bubble', 'bushhider', 'cap_blue', 'cap_green', 'cap_junior', 'cap_red', 'cap_team', 'cap_thinking', 'cap_yellow', 'car', 'chef', 'chuckl', 'clown', 'clown-copper', 'clown-crossed', 'constructor', 'cratehider', 'crown', 'cyborg1', 'cyborg2', 'cyclops'];
const ALL_FLAGS = ['hedgewars', 'cm_balls', 'cm_binary', 'cm_birdy', 'cm_earth', 'cm_hw', 'afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'argentina', 'armenia', 'australia', 'austria', 'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize', 'benin', 'bhutan', 'bolivia', 'bosnia_and_herzegovina', 'botswana', 'brazil', 'brunei', 'bulgaria', 'burkina_faso', 'burundi', 'cambodia', 'cameroon', 'canada', 'cape_verde', 'central_african_republic', 'chad', 'chile', 'china', 'colombia', 'comoros', 'congo', 'costa_rica', 'croatia', 'cuba', 'cyprus', 'czech_republic', 'denmark', 'djibouti', 'dominica', 'dominican_republic', 'ecuador', 'egypt', 'el_salvador', 'equatorial_guinea', 'eritrea', 'estonia', 'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia', 'germany', 'ghana', 'greece', 'grenada', 'guatemala', 'guinea', 'guinea_bissau', 'guyana', 'haiti', 'honduras', 'hungary', 'iceland', 'india', 'indonesia', 'iran', 'iraq', 'ireland', 'israel', 'italy', 'jamaica', 'japan', 'jordan', 'kazakhstan', 'kenya', 'kiribati', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho', 'liberia', 'libya', 'liechtenstein', 'lithuania', 'luxembourg', 'macedonia', 'madagascar', 'malawi', 'malaysia', 'maldives', 'mali', 'malta', 'mauritania', 'mauritius', 'mexico', 'moldova', 'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar', 'namibia', 'nepal', 'netherlands', 'new_zealand', 'nicaragua', 'niger', 'nigeria', 'norway', 'oman', 'pakistan', 'palau', 'palestine', 'panama', 'papua_new_guinea', 'paraguay', 'peru', 'philippines', 'poland', 'portugal', 'qatar', 'romania', 'russia', 'rwanda', 'samoa', 'san_marino', 'saudi_arabia', 'senegal', 'serbia', 'seychelles', 'sierra_leone', 'singapore', 'slovakia', 'slovenia', 'somalia', 'south_africa', 'south_korea', 'south_sudan', 'spain', 'sri_lanka', 'sudan', 'suriname', 'swaziland', 'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan', 'tanzania', 'thailand', 'togo', 'tonga', 'trinidad_and_tobago', 'tunisia', 'turkey', 'turkmenistan', 'tuvalu', 'uganda', 'ukraine', 'united_kingdom', 'united_states', 'uruguay', 'uzbekistan', 'vanuatu', 'vatican_city', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe'];
const ALL_GRAVES = ['Grave', 'Badger', 'Bone', 'Cherry', 'Clover', 'Duck2', 'Earth', 'Egg', 'Flower', 'Ghost', 'Mushroom', 'Old_Apple', 'Plinko', 'Rip', 'Rubberduck', 'Simple', 'Simple_reversed', 'Statue', 'TV', 'Teapot', 'Whisky', 'Yin_and_Yang', 'bp2', 'bubble', 'chest', 'coffin', 'deadhog', 'dragonball', 'eyecross', 'heart', 'money', 'mouton1', 'octopus', 'pi', 'plant2', 'plant3', 'pokeball', 'pyramid', 'ring', 'skull', 'star'];
const ALL_FORTS = ['Castle', 'Cake', 'Earth', 'EvilChicken', 'Flowerhog', 'Hydrant', 'Lego', 'Lonely_Island', 'Octopus', 'OlympicL', 'Plane', 'Snail', 'Statue', 'SteelTower', 'Tank', 'UFO', 'Wood'];
const VOICES = ['Default', 'British', 'Classic', 'Default_es', 'Default_pl', 'Default_ru', 'Default_uk', 'HillBilly', 'Mobster', 'Pirate', 'Robot', 'Russian', 'Russian_pl', 'Singer', 'Surfer'];

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

    // Team Color
    this._addLabel('Color', ex, y);
    this.colorDropdown = new Dropdown(TEAM_COLORS.map(c => c.name), 0, (i) => {
      if (this.selectedTeam) { this.selectedTeam.color = i; this.dirty = true; }
    });
    this.colorDropdown.x = ex + 120; this.colorDropdown.y = y; this.colorDropdown.width = 140;
    this.addChild(this.colorDropdown);
    y += 50;

    // Hat
    this._addLabel('Hat', ex, y);
    this.hatPreview = new ImagePreview(getHatPath, 32);
    this.hatPreview.x = ex + 120; this.hatPreview.y = y;
    this.addChild(this.hatPreview);
    
    this.hatLabel = new Label('', 'small');
    this.hatLabel.x = ex + 160; this.hatLabel.y = y; this.hatLabel.width = 150; this.hatLabel.height = 30;
    this.addChild(this.hatLabel);
    
    const hatBtn = new Button('Select...', () => this._showHatPicker());
    hatBtn.x = ex + 320; hatBtn.y = y; hatBtn.width = 100; hatBtn.height = 30;
    hatBtn.fontSize = 14;
    this.addChild(hatBtn);
    y += 50;

    // Flag
    this._addLabel('Flag', ex, y);
    this.flagPreview = new ImagePreview(getFlagPath, 32);
    this.flagPreview.x = ex + 120; this.flagPreview.y = y;
    this.addChild(this.flagPreview);
    
    this.flagLabel = new Label('', 'small');
    this.flagLabel.x = ex + 160; this.flagLabel.y = y; this.flagLabel.width = 150; this.flagLabel.height = 30;
    this.addChild(this.flagLabel);
    
    const flagBtn = new Button('Select...', () => this._showFlagPicker());
    flagBtn.x = ex + 320; flagBtn.y = y; flagBtn.width = 100; flagBtn.height = 30;
    flagBtn.fontSize = 14;
    this.addChild(flagBtn);
    y += 50;

    // Grave
    this._addLabel('Grave', ex, y);
    this.gravePreview = new ImagePreview(getGravePath, 32);
    this.gravePreview.x = ex + 120; this.gravePreview.y = y;
    this.addChild(this.gravePreview);
    
    this.graveLabel = new Label('', 'small');
    this.graveLabel.x = ex + 160; this.graveLabel.y = y; this.graveLabel.width = 150; this.graveLabel.height = 30;
    this.addChild(this.graveLabel);
    
    const graveBtn = new Button('Select...', () => this._showGravePicker());
    graveBtn.x = ex + 320; graveBtn.y = y; graveBtn.width = 100; graveBtn.height = 30;
    graveBtn.fontSize = 14;
    this.addChild(graveBtn);
    y += 50;

    // Fort
    this._addLabel('Fort', ex, y);
    this.fortPreview = new ImagePreview(getFortPath, 32);
    this.fortPreview.x = ex + 120; this.fortPreview.y = y;
    this.addChild(this.fortPreview);
    
    this.fortLabel = new Label('', 'small');
    this.fortLabel.x = ex + 160; this.fortLabel.y = y; this.fortLabel.width = 150; this.fortLabel.height = 30;
    this.addChild(this.fortLabel);
    
    const fortBtn = new Button('Select...', () => this._showFortPicker());
    fortBtn.x = ex + 320; fortBtn.y = y; fortBtn.width = 100; fortBtn.height = 30;
    fortBtn.fontSize = 14;
    this.addChild(fortBtn);
    y += 50;

    // Voice
    this._addLabel('Voice', ex, y);
    this.voiceLabel = new Label('', 'small');
    this.voiceLabel.x = ex + 120; this.voiceLabel.y = y; this.voiceLabel.width = 180; this.voiceLabel.height = 30;
    this.addChild(this.voiceLabel);
    
    const voiceBtn = new Button('Select...', () => this._showVoicePicker());
    voiceBtn.x = ex + 320; voiceBtn.y = y; voiceBtn.width = 100; voiceBtn.height = 30;
    voiceBtn.fontSize = 14;
    this.addChild(voiceBtn);
    y += 50;

    // Hedgehog names
    this._addLabel('Hedgehogs', ex, y);
    
    // Random names button
    const randomBtn = new Button('Random', () => this._randomHogNames());
    randomBtn.x = ex + 120; randomBtn.y = y; randomBtn.width = 80; randomBtn.height = 30;
    randomBtn.fontSize = 14;
    this.addChild(randomBtn);
    
    // Hedgehog count controls
    const minusBtn = new Button('-', () => this._adjustHogCount(-1));
    minusBtn.x = ex + 210; minusBtn.y = y; minusBtn.width = 30; minusBtn.height = 30;
    this.addChild(minusBtn);
    
    this.hogCountLabel = new Label('8', 'body');
    this.hogCountLabel.x = ex + 245; this.hogCountLabel.y = y;
    this.hogCountLabel.width = 30; this.hogCountLabel.height = 30;
    this.hogCountLabel.align = 'center';
    this.addChild(this.hogCountLabel);
    
    const plusBtn = new Button('+', () => this._adjustHogCount(1));
    plusBtn.x = ex + 280; plusBtn.y = y; plusBtn.width = 30; plusBtn.height = 30;
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

  _showHatPicker() {
    if (!this.selectedTeam) return;
    
    const picker = new IconPicker(ALL_HATS, getHatPath, null, 32, 32);
    picker.setSelected(this.selectedTeam.hat || 'NoHat');
    
    const pickerPage = new BasePage('Select Hat');
    pickerPage.addTitle('Select Hat');
    picker.x = 362; picker.y = 100;
    pickerPage.addChild(picker);
    
    const okBtn = new Button('OK', () => {
      const hat = ALL_HATS[picker.selectedIndex];
      this.selectedTeam.hat = hat;
      this.hatPreview.setItem(hat);
      this.hatLabel.text = hat;
      this.dirty = true;
      core.popPage();
      audio.playClick();
    });
    okBtn.x = 362; okBtn.y = 520; okBtn.width = 120; okBtn.height = 40;
    pickerPage.addChild(okBtn);
    pickerPage.addBackButton(() => core.popPage());
    
    pickerPage.onMouseWheel = (e) => {
      if (picker.hitTest(e.x, e.y)) picker.onMouseWheel(e);
    };
    
    core.pushPage(pickerPage);
    audio.playClick();
  }

  _showFlagPicker() {
    if (!this.selectedTeam) return;
    
    const picker = new IconPicker(ALL_FLAGS, getFlagPath, null);
    picker.setSelected(this.selectedTeam.flag || 'hedgewars');
    
    // Create a simple page to hold the picker
    const pickerPage = new BasePage('Select Flag');
    pickerPage.addTitle('Select Flag');
    picker.x = 362; // Center
    picker.y = 100;
    pickerPage.addChild(picker);
    
    // OK button
    const okBtn = new Button('OK', () => {
      const flag = ALL_FLAGS[picker.selectedIndex];
      this.selectedTeam.flag = flag;
      this.flagPreview.setItem(flag);
      this.flagLabel.text = flag;
      this.dirty = true;
      core.popPage();
      audio.playClick();
    });
    okBtn.x = 362; okBtn.y = 520; okBtn.width = 120; okBtn.height = 40;
    pickerPage.addChild(okBtn);
    
    pickerPage.addBackButton(() => core.popPage());
    
    // Route wheel events to picker
    pickerPage.onMouseWheel = (e) => {
      if (picker.hitTest(e.x, e.y)) {
        picker.onMouseWheel(e);
      }
    };
    
    core.pushPage(pickerPage);
    audio.playClick();
  }

  _showGravePicker() {
    if (!this.selectedTeam) return;
    
    const picker = new IconPicker(ALL_GRAVES, getGravePath, null);
    picker.setSelected(this.selectedTeam.grave || 'Grave');
    
    const pickerPage = new BasePage('Select Grave');
    pickerPage.addTitle('Select Grave');
    picker.x = 362; picker.y = 100;
    pickerPage.addChild(picker);
    
    const okBtn = new Button('OK', () => {
      const grave = ALL_GRAVES[picker.selectedIndex];
      this.selectedTeam.grave = grave;
      this.gravePreview.setItem(grave);
      this.graveLabel.text = grave;
      this.dirty = true;
      core.popPage();
      audio.playClick();
    });
    okBtn.x = 362; okBtn.y = 520; okBtn.width = 120; okBtn.height = 40;
    pickerPage.addChild(okBtn);
    pickerPage.addBackButton(() => core.popPage());
    
    pickerPage.onMouseWheel = (e) => {
      if (picker.hitTest(e.x, e.y)) picker.onMouseWheel(e);
    };
    
    core.pushPage(pickerPage);
    audio.playClick();
  }

  _showFortPicker() {
    if (!this.selectedTeam) return;
    
    const picker = new IconPicker(ALL_FORTS, getFortPath, null);
    picker.setSelected(this.selectedTeam.fort || 'Castle');
    
    const pickerPage = new BasePage('Select Fort');
    pickerPage.addTitle('Select Fort');
    picker.x = 362; picker.y = 100;
    pickerPage.addChild(picker);
    
    const okBtn = new Button('OK', () => {
      const fort = ALL_FORTS[picker.selectedIndex];
      this.selectedTeam.fort = fort;
      this.fortPreview.setItem(fort);
      this.fortLabel.text = fort;
      this.dirty = true;
      core.popPage();
      audio.playClick();
    });
    okBtn.x = 362; okBtn.y = 520; okBtn.width = 120; okBtn.height = 40;
    pickerPage.addChild(okBtn);
    pickerPage.addBackButton(() => core.popPage());
    
    pickerPage.onMouseWheel = (e) => {
      if (picker.hitTest(e.x, e.y)) picker.onMouseWheel(e);
    };
    
    core.pushPage(pickerPage);
    audio.playClick();
  }

  _showVoicePicker() {
    if (!this.selectedTeam) return;
    
    // Text-only picker (no icons for voices)
    const picker = new IconPicker(VOICES, () => null, null, 32, 0);
    picker.setSelected(this.selectedTeam.voice || 'Default');
    
    const pickerPage = new BasePage('Select Voice');
    pickerPage.addTitle('Select Voice');
    picker.x = 362; picker.y = 100;
    pickerPage.addChild(picker);
    
    const okBtn = new Button('OK', () => {
      const voice = VOICES[picker.selectedIndex];
      this.selectedTeam.voice = voice;
      this.voiceLabel.text = voice;
      this.dirty = true;
      core.popPage();
      audio.playClick();
    });
    okBtn.x = 362; okBtn.y = 520; okBtn.width = 120; okBtn.height = 40;
    pickerPage.addChild(okBtn);
    pickerPage.addBackButton(() => core.popPage());
    
    pickerPage.onMouseWheel = (e) => {
      if (picker.hitTest(e.x, e.y)) picker.onMouseWheel(e);
    };
    
    core.pushPage(pickerPage);
    audio.playClick();
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
      this.colorDropdown.selectedIndex = this.selectedTeam.color || 0;
      
      // Hat
      this.hatPreview.setItem(this.selectedTeam.hat || 'NoHat');
      this.hatLabel.text = this.selectedTeam.hat || 'NoHat';
      
      // Flag
      this.flagPreview.setItem(this.selectedTeam.flag || 'hedgewars');
      this.flagLabel.text = this.selectedTeam.flag || 'hedgewars';
      
      // Grave
      this.gravePreview.setItem(this.selectedTeam.grave || 'Grave');
      this.graveLabel.text = this.selectedTeam.grave || 'Grave';
      this.flagLabel.text = this.selectedTeam.flag || 'hedgewars';
      
      // Grave
      this.gravePreview.setItem(this.selectedTeam.grave || 'Grave');
      this.graveLabel.text = this.selectedTeam.grave || 'Grave';
      
      // Fort
      this.fortPreview.setItem(this.selectedTeam.fort || 'Castle');
      this.fortLabel.text = this.selectedTeam.fort || 'Castle';
      
      // Voice
      this.voiceLabel.text = this.selectedTeam.voice || 'Default';
      
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

  _randomHogNames() {
    if (!this.selectedTeam) return;
    randomHogNamesSync(this.selectedTeam);
    for (let i = 0; i < this.selectedTeam.hogCount; i++) {
      this.hogInputs[i].text = this.selectedTeam.hedgehogs[i].name;
      this.hogInputs[i].cursorPos = this.selectedTeam.hedgehogs[i].name.length;
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
