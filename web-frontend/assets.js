// Asset loader
class AssetManager {
  constructor() {
    this.images = new Map();
    this.pending = 0;
    this.loaded = 0;
    this.basePath = '../share/hedgewars/Data/';
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
// Row 4: ExtraDamage, Invulnerable, ExtraTime, LaserSight, Vampiric, SniperRifle, Jetpack, Molotov
// Row 5: Birdy, PortalGun, Piano, GasBomb, SineGun, Flamethrower, SMine, Hammer
// Row 6: Resurrector, DrillStrike, (empty slots...)
export const WEAPON_ICON_MAP = {
  'grenade': [0, 0], 'cluster': [1, 0], 'bazooka': [2, 0], 'bee': [3, 0],
  'shotgun': [4, 0], 'pickhammer': [5, 0], 'skip': [6, 0], 'rope': [7, 0],
  'mine': [0, 1], 'deagle': [1, 1], 'dynamite': [2, 1], 'firepunch': [3, 1],
  'whip': [4, 1], 'baseball': [5, 1], 'parachute': [6, 1], 'airstrike': [7, 1],
  'minestrike': [0, 2], 'blowtorch': [1, 2], 'girder': [2, 2], 'teleport': [3, 2],
  'switch': [4, 2], 'mortar': [5, 2], 'kamikaze': [6, 2], 'cake': [7, 2],
  'seduction': [0, 3], 'watermelon': [1, 3], 'hellish': [2, 3], 'napalm': [3, 3],
  'drill': [4, 3], 'ballgun': [5, 3], 'rcplane': [6, 3], 'lowgravity': [7, 3],
  'extradamage': [0, 4], 'invulnerable': [1, 4], 'extratime': [2, 4], 'lasersight': [3, 4],
  'vampiric': [4, 4], 'sniper': [5, 4], 'jetpack': [6, 4], 'molotov': [7, 4],
  'birdy': [0, 5], 'portal': [1, 5], 'piano': [2, 5], 'gasbomb': [3, 5],
  'sinegun': [4, 5], 'flamethrower': [5, 5], 'smine': [6, 5], 'hammer': [7, 5],
  'resurrector': [0, 6], 'drillstrike': [1, 6], 'snowball': [2, 6], 'tardis': [3, 6],
  'landgun': [4, 6], 'freezer': [5, 6], 'knife': [6, 6], 'rubber': [7, 6],
  'airmine': [0, 7], 'duck': [1, 7], 'minigun': [2, 7],
};

// Draw weapon icon from sprite sheet
export function drawWeaponIcon(ctx, weaponId, x, y, size = 32) {
  const icons = assets.get('ammo-icons');
  if (!icons) return;
  const pos = WEAPON_ICON_MAP[weaponId];
  if (!pos) return;
  ctx.drawImage(icons, pos[0] * 32, pos[1] * 32, 32, 32, x, y, size, size);
}

// Hat/Flag/Grave path helpers
export const getHatPath = (name) => `Graphics/Hats/${name}.png`;
export const getFlagPath = (name) => `Graphics/Flags/${name}.png`;
export const getGravePath = (name) => `Graphics/Graves/${name}.png`;
