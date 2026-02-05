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
    return new Promise((resolve, reject) => {
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

  progress() {
    return this.pending === 0 ? 1 : this.loaded / this.pending;
  }
}

export const assets = new AssetManager();

// Core assets to preload
export const CORE_ASSETS = {
  // Background sky (from themes - we'll use Clouds as fallback)
  'clouds': 'Graphics/Clouds.png',
  // Hedgehog sprites
  'hedgehog': 'Graphics/Hedgehog.png',
  // Ammo menu icons
  'ammo-icons': 'Graphics/AmmoMenu/Ammos_base.png',
  'ammo-slot': 'Graphics/AmmoMenu/Slot.png',
  // Misc UI
  'star': 'Graphics/star.png',
  'thinking': 'Graphics/thinking.png',
};
