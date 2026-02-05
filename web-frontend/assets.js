// Asset loader
class AssetManager {
  constructor() {
    this.images = new Map();
    this.pending = 0;
    this.loaded = 0;
    // Auto-detect: build layout has Data/ as sibling, dev has ../share/hedgewars/Data/
    this.basePath = this._detectBasePath();
  }

  _detectBasePath() {
    // In build output: /web-frontend/ sits next to /Data/
    // In dev mode: /web-frontend/ sits next to /share/hedgewars/Data/
    const path = window.location.pathname;
    if (path.includes('/web-frontend/')) {
      const base = path.replace(/\/web-frontend\/.*/, '');
      // Try build layout first (check synchronously via XHR)
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', base + '/Data/misc/hedgewars.png', false);
        xhr.send();
        if (xhr.status === 200) return base + '/Data/';
      } catch (e) {}
    }
    return '../share/hedgewars/Data/';
  }

  setBasePath(path) { this.basePath = path; }

  async loadImage(id, path) {
    this.pending++;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(id, img);
        this.loaded++;
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${path}`);
        this.loaded++;
        resolve(null);
      };
      img.src = this.basePath + path;
    });
  }

  async loadImages(manifest) {
    const promises = Object.entries(manifest).map(([id, path]) => this.loadImage(id, path));
    return Promise.all(promises);
  }

  get(id) { return this.images.get(id); }
  
  // Load asset on demand if not already loaded
  async loadOnDemand(id, path) {
    if (this.images.has(id)) return this.images.get(id);
    return this.loadImage(id, path);
  }

  progress() {
    return this.pending === 0 ? 1 : this.loaded / this.pending;
  }
}

export const assets = new AssetManager();

// Core assets to preload
export const CORE_ASSETS = {
  'clouds': 'Graphics/Clouds.png',
  'hedgehog': 'Graphics/Hedgehog.png',
  'ammo-icons': 'Graphics/AmmoMenu/Ammos_base.png',
  'ammo-icons-bw': 'Graphics/AmmoMenu/Ammos_bw_base.png',
  'ammo-slot': 'Graphics/AmmoMenu/Slot.png',
  'botlevels': 'Graphics/botlevels.png',
  'star': 'Graphics/star.png',
  'logo': 'misc/hedgewars.png',
};

// Weapon icon positions in Ammos_base.png (32x32 each, 8 per row)
// Row 0: Grenade, Cluster, Bazooka, Bee, Shotgun, PickHammer, Skip, Rope
// Row 1: Mine, DEagle, Dynamite, FirePunch, Whip, Baseball, Parachute, AirAttack
// Row 2: MineStrike, BlowTorch, Girder, Teleport, Switch, Mortar, Kamikaze, Cake
// Row 3: Seduction, Watermelon, HellishBomb, Napalm, Drill, Ballgun, RCPlane, LowGravity
// Weapon icon sprite sheet mapping  
// The sprite sheet is in HW_AMMOMENU_ARRAY order (the UI display order from Qt)
// Position i in sprite = ICON_GRID_ORDER[i] = ammo type
const ICON_GRID_ORDER = [
  3,  4,  22, 29, 51, 55, 1,  2,  26, 27, 40, 44, 5,  10, 38,
  45, 54, 59, 12, 13, 14, 23, 25, 48, 9,  11, 24, 30, 31, 47,
  16, 17, 28, 43, 50, 57, 6,  18, 19, 46, 53, 56, 8,  15, 20,
  39, 41, 42, 34, 36, 37, 49, 52, 58, 7,  21, 32, 33, 35, 60
];

// Weapon ID to icon name mapping (TAmmoType order 1-60)
const WEAPON_ID_TO_ICON = [
  'grenade', 'cluster', 'bazooka', 'bee', 'shotgun', 'pickhammer',
  'skip', 'rope', 'mine', 'deagle', 'dynamite', 'firepunch', 'whip',
  'baseball', 'parachute', 'airstrike', 'minestrike', 'blowtorch',
  'girder', 'teleport', 'switch', 'mortar', 'kamikaze', 'cake',
  'seduction', 'watermelon', 'hellish', 'napalm', 'drill', 'ballgun',
  'rcplane', 'lowgravity', 'extradamage', 'invulnerable', 'extratime',
  'lasersight', 'vampiric', 'sniper', 'jetpack', 'molotov', 'birdy',
  'portal', 'piano', 'gasbomb', 'sinegun', 'flamethrower', 'smine',
  'hammer', 'resurrector', 'drillstrike', 'snowball', 'tardis',
  'landgun', 'freezer', 'knife', 'rubber', 'airmine', 'creeper',
  'minigun', 'sentry'
];

// Build icon map using Qt's column-major calculation
// Qt code: x = num / (height/32), y = (num % (height/32)) * 32
// With height=512: x = num / 16, y = (num % 16) * 32
// So position num maps to column (num/16), row (num%16)
export const WEAPON_ICON_MAP = {};
const ROWS = 16; // 512px / 32px
for (let i = 0; i < WEAPON_ID_TO_ICON.length; i++) {
  const iconName = WEAPON_ID_TO_ICON[i];
  const col = Math.floor(i / ROWS);
  const row = i % ROWS;
  WEAPON_ICON_MAP[iconName] = [col, row];
}

// Draw weapon icon from sprite sheet
export function drawWeaponIcon(ctx, weaponId, x, y, size = 32) {
  const icons = assets.get('ammo-icons');
  if (!icons) {
    console.warn('ammo-icons not loaded');
    return;
  }
  const pos = WEAPON_ICON_MAP[weaponId];
  if (!pos) return;
  
  ctx.drawImage(icons, pos[0] * 32, pos[1] * 32, 32, 32, x, y, size, size);
}

// Hat/Flag/Grave path helpers
export const getHatPath = (name) => `Graphics/Hats/${name}.png`;
export const getFlagPath = (name) => `Graphics/Flags/${name}.png`;
export const getGravePath = (name) => `Graphics/Graves/${name}.png`;
export const getFortPath = (name) => `Forts/${name}-icon.png`;
