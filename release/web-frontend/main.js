// Main entry point
import { core } from './ui/core.js';
import { assets, CORE_ASSETS } from './assets.js';
import { audio } from './util/audio.js';
import { storage } from './data/storage.js';
import { DEFAULT_SCHEMES } from './data/schemes.js';
import { DEFAULT_WEAPON_SETS } from './data/weapons.js';
import { DEFAULT_TEAMS, DEFAULT_BINDINGS } from './data/defaults.js';
import { MainMenuPage } from './pages/main-menu.js';

async function init() {
  const loadingEl = document.getElementById('loading');
  const canvas = document.getElementById('game-canvas');

  // Initialize core systems
  core.init(canvas);
  await audio.init();

  // Load settings and apply audio volumes (convert from 0-100 to 0-1)
  const settings = storage.getSettings();
  audio.setMusicVolume(settings.musicVolume / 100);
  audio.setSfxVolume(settings.sfxVolume / 100);

  // Ensure first-run defaults exist (Local Game assumes these are present).
  if (!storage.getTeams().length) storage.saveTeams(JSON.parse(JSON.stringify(DEFAULT_TEAMS)));
  if (!storage.getSchemes().length) storage.saveSchemes(JSON.parse(JSON.stringify(DEFAULT_SCHEMES)));
  if (!storage.getWeaponSets().length) storage.saveWeaponSets(JSON.parse(JSON.stringify(DEFAULT_WEAPON_SETS)));
  const bindings = storage.getBindings();
  if (!bindings || !Object.keys(bindings).length) storage.saveBindings({ ...DEFAULT_BINDINGS });

  // Load core assets
  loadingEl.textContent = 'Loading assets...';
  await assets.loadImages(CORE_ASSETS);

  // Load UI sounds (optional - won't fail if missing)
  try {
    await audio.loadSound('click', assets.basePath + 'Sounds/roperelease.ogg');
    await audio.loadSound('hover', assets.basePath + 'Sounds/steps.ogg');
    await audio.loadSound('main_theme', assets.basePath + 'Music/main_theme.ogg');
  } catch (e) {
    console.warn('UI sounds not loaded:', e);
  }

  // Hide loading, show main menu
  loadingEl.style.display = 'none';

  const mainMenu = new MainMenuPage();
  core.pushPage(mainMenu);
  core.start();
  
  // Start music on first user interaction (required by browsers)
  const startMusic = async () => {
    await audio.resume();
    audio.playMusic('main_theme', 1.0);
    document.removeEventListener('click', startMusic);
    document.removeEventListener('keydown', startMusic);
  };
  document.addEventListener('click', startMusic);
  document.addEventListener('keydown', startMusic);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
