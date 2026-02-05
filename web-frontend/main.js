// Main entry point
import { core } from './ui/core.js';
import { assets, CORE_ASSETS } from './assets.js';
import { audio } from './util/audio.js';
import { MainMenuPage } from './pages/main-menu.js';

async function init() {
  const loadingEl = document.getElementById('loading');
  const canvas = document.getElementById('game-canvas');

  // Initialize core systems
  core.init(canvas);
  await audio.init();

  // Load core assets
  loadingEl.textContent = 'Loading assets...';
  await assets.loadImages(CORE_ASSETS);

  // Load UI sounds (optional - won't fail if missing)
  try {
    await audio.loadSound('click', assets.basePath + 'Sounds/UI/sndClick.ogg');
    await audio.loadSound('hover', assets.basePath + 'Sounds/UI/sndHover.ogg');
  } catch (e) {
    console.warn('UI sounds not loaded:', e);
  }

  // Hide loading, show main menu
  loadingEl.style.display = 'none';

  const mainMenu = new MainMenuPage();
  core.pushPage(mainMenu);
  core.start();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
