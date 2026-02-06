// Missions page - Training and Campaign missions
import { BasePage } from './page-base.js';
import { Button, Label } from '../ui/widgets.js';
import { ScrollList } from '../ui/widgets-adv.js';
import { core } from '../ui/core.js';
import { audio } from '../util/audio.js';
import { storage } from '../data/storage.js';
import { buildConfig } from '../data/config-builder.js';

const TRAINING_MISSIONS = [
  { name: 'Basic Movement', file: 'Basic_Training_-_Movement' },
  { name: 'Grenade', file: 'Basic_Training_-_Grenade' },
  { name: 'Bazooka', file: 'Basic_Training_-_Bazooka' },
  { name: 'Rope', file: 'Basic_Training_-_Rope' },
  { name: 'Flying Saucer', file: 'Basic_Training_-_Flying_Saucer' }
];

const CAMPAIGNS = {
  'A Classic Fairytale': [
    { name: '1. First Blood', file: 'A_Classic_Fairytale/first_blood' },
    { name: '2. Shadow', file: 'A_Classic_Fairytale/shadow' },
    { name: '3. Journey', file: 'A_Classic_Fairytale/journey' },
    { name: '4. United', file: 'A_Classic_Fairytale/united' },
    { name: '5. Backstab', file: 'A_Classic_Fairytale/backstab' },
    { name: '6. Dragon', file: 'A_Classic_Fairytale/dragon' },
    { name: '7. Family', file: 'A_Classic_Fairytale/family' },
    { name: '8. Queen', file: 'A_Classic_Fairytale/queen' },
    { name: '9. Enemy', file: 'A_Classic_Fairytale/enemy' },
    { name: '10. Epilogue', file: 'A_Classic_Fairytale/epil' }
  ],
  'A Space Adventure': [
    { name: '1. Cosmos', file: 'A_Space_Adventure/cosmos' },
    { name: '2. Moon 01', file: 'A_Space_Adventure/moon01' },
    { name: '3. Moon 02', file: 'A_Space_Adventure/moon02' },
    { name: '4. Ice 01', file: 'A_Space_Adventure/ice01' },
    { name: '5. Ice 02', file: 'A_Space_Adventure/ice02' },
    { name: '6. Desert 01', file: 'A_Space_Adventure/desert01' },
    { name: '7. Desert 02', file: 'A_Space_Adventure/desert02' },
    { name: '8. Desert 03', file: 'A_Space_Adventure/desert03' },
    { name: '9. Fruit 01', file: 'A_Space_Adventure/fruit01' },
    { name: '10. Fruit 02', file: 'A_Space_Adventure/fruit02' },
    { name: '11. Fruit 03', file: 'A_Space_Adventure/fruit03' },
    { name: '12. Death 01', file: 'A_Space_Adventure/death01' },
    { name: '13. Death 02', file: 'A_Space_Adventure/death02' },
    { name: '14. Final', file: 'A_Space_Adventure/final' }
  ]
};

export class MissionsPage extends BasePage {
  constructor() {
    super('Missions');
    this.selectedCampaign = null;
    this._buildUI();
  }

  _buildUI() {
    this.addTitle('Missions & Campaigns');

    // Center the two-column layout for better widescreen use.
    const contentW = 980;
    const contentX = Math.round((this.width - contentW) / 2);
    const colW = 440;
    const gap = 60;
    const leftX = contentX;
    const rightX = contentX + colW + gap;

    // Training section
    const trainingLabel = new Label('Training Missions', 'section');
    trainingLabel.x = leftX;
    trainingLabel.y = 120;
    trainingLabel.width = colW;
    trainingLabel.height = 34;
    trainingLabel.color = '#FFDD44';
    this.addChild(trainingLabel);

    this.trainingList = new ScrollList(
      TRAINING_MISSIONS.map(m => m.name),
      (i) => this._startTraining(i)
    );
    this.trainingList.x = leftX;
    this.trainingList.y = 160;
    this.trainingList.width = colW;
    this.trainingList.height = 400;
    this.addChild(this.trainingList);

    // Campaigns section
    const campaignLabel = new Label('Campaigns', 'section');
    campaignLabel.x = rightX;
    campaignLabel.y = 120;
    campaignLabel.width = colW;
    campaignLabel.height = 34;
    campaignLabel.color = '#FFDD44';
    this.addChild(campaignLabel);

    this.campaignList = new ScrollList(
      Object.keys(CAMPAIGNS),
      (i) => this._selectCampaign(Object.keys(CAMPAIGNS)[i])
    );
    this.campaignList.x = rightX;
    this.campaignList.y = 160;
    this.campaignList.width = colW;
    this.campaignList.height = 150;
    this.addChild(this.campaignList);

    // Campaign missions list (initially hidden)
    this.missionLabel = new Label('', 'body');
    this.missionLabel.x = rightX;
    this.missionLabel.y = 320;
    this.missionLabel.width = colW;
    this.addChild(this.missionLabel);

    this.missionList = new ScrollList([], () => {});
    this.missionList.x = rightX;
    this.missionList.y = 350;
    this.missionList.width = colW;
    this.missionList.height = 210;
    this.missionList.visible = false;
    this.addChild(this.missionList);

    // Info label
    const infoLabel = new Label('Training missions work. Campaigns are experimental.', 'small');
    infoLabel.x = contentX;
    infoLabel.y = 580;
    infoLabel.width = contentW;
    this.addChild(infoLabel);

    const backBtn = this.addBackButton(() => core.popPage());
    backBtn.x = contentX;
  }

  _selectCampaign(campaignName) {
    this.selectedCampaign = campaignName;
    const missions = CAMPAIGNS[campaignName];
    
    this.missionLabel.text = campaignName + ':';
    this.missionList.items = missions.map(m => m.name);
    this.missionList.onSelect = (i) => this._startCampaign(campaignName, i);
    this.missionList.visible = true;
    this.missionList.selectedIndex = -1;
    
    audio.playClick();
  }

  _startTraining(index) {
    const mission = TRAINING_MISSIONS[index];
    console.log('Starting training mission:', mission.name);
    
    // Build minimal config for training mission
    const teams = storage.getTeams();
    const schemes = storage.getSchemes();
    const weaponSets = storage.getWeaponSets();
    
    const config = buildConfig({
      scheme: schemes[0],
      weaponSet: weaponSets[0],
      teams: teams.slice(0, 1), // Single team for training
      mission: mission.file + '.lua',
      bindings: storage.getBindings()
    });
    
    // Store config and launch
    const configB64 = btoa(config);
    localStorage.setItem('hw-wasm-webcfg64', configB64);
    const base = window.location.pathname.replace(/\/web-frontend\/.*/, '');
    window.location.href = base + '/hwengine.html';
    
    audio.playClick();
  }

  _startCampaign(campaignName, missionIndex) {
    const mission = CAMPAIGNS[campaignName][missionIndex];
    
    console.log('Starting campaign mission:', campaignName, mission.name);
    
    // Build config for campaign mission
    const teams = storage.getTeams();
    const schemes = storage.getSchemes();
    const weaponSets = storage.getWeaponSets();
    
    const config = buildConfig({
      scheme: schemes[0],
      weaponSet: weaponSets[0],
      teams: teams.slice(0, 1),
      mission: mission.file + '.lua',
      bindings: storage.getBindings()
    });
    
    // Store config and launch
    const configB64 = btoa(config);
    localStorage.setItem('hw-wasm-webcfg64', configB64);
    const base = window.location.pathname.replace(/\/web-frontend\/.*/, '');
    window.location.href = base + '/hwengine.html';
    
    audio.playClick();
  }
}
