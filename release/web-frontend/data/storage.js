// localStorage wrapper for game data
const STORAGE_PREFIX = 'hw.';

class Storage {
  constructor() {
    this.cache = {};
  }

  _key(name) {
    return STORAGE_PREFIX + name;
  }

  get(name, defaultValue = null) {
    if (this.cache[name] !== undefined) return this.cache[name];
    
    try {
      const raw = localStorage.getItem(this._key(name));
      if (raw === null) return defaultValue;
      const value = JSON.parse(raw);
      this.cache[name] = value;
      return value;
    } catch (e) {
      console.warn(`Storage.get(${name}) failed:`, e);
      return defaultValue;
    }
  }

  set(name, value) {
    try {
      this.cache[name] = value;
      localStorage.setItem(this._key(name), JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`Storage.set(${name}) failed:`, e);
      return false;
    }
  }

  remove(name) {
    delete this.cache[name];
    localStorage.removeItem(this._key(name));
  }

  // Teams
  getTeams() {
    return this.get('teams', []);
  }

  saveTeams(teams) {
    return this.set('teams', teams);
  }

  saveTeam(team) {
    const teams = this.getTeams();
    const idx = teams.findIndex(t => t.name === team.name);
    if (idx >= 0) {
      teams[idx] = team;
    } else {
      teams.push(team);
    }
    return this.saveTeams(teams);
  }

  deleteTeam(name) {
    const teams = this.getTeams().filter(t => t.name !== name);
    return this.saveTeams(teams);
  }

  // Schemes
  getSchemes() {
    return this.get('schemes', []);
  }

  saveSchemes(schemes) {
    return this.set('schemes', schemes);
  }

  saveScheme(scheme) {
    const schemes = this.getSchemes();
    const idx = schemes.findIndex(s => s.name === scheme.name);
    if (idx >= 0) {
      schemes[idx] = scheme;
    } else {
      schemes.push(scheme);
    }
    return this.saveSchemes(schemes);
  }

  deleteScheme(name) {
    const schemes = this.getSchemes().filter(s => s.name !== name);
    return this.saveSchemes(schemes);
  }

  // Weapon sets
  getWeaponSets() {
    return this.get('weapons', []);
  }

  saveWeaponSets(weapons) {
    return this.set('weapons', weapons);
  }

  saveWeaponSet(weaponSet) {
    const weapons = this.getWeaponSets();
    const idx = weapons.findIndex(w => w.name === weaponSet.name);
    if (idx >= 0) {
      weapons[idx] = weaponSet;
    } else {
      weapons.push(weaponSet);
    }
    return this.saveWeaponSets(weapons);
  }

  deleteWeaponSet(name) {
    const weapons = this.getWeaponSets().filter(w => w.name !== name);
    return this.saveWeaponSets(weapons);
  }

  // Key bindings
  getBindings() {
    return this.get('bindings', {});
  }

  saveBindings(bindings) {
    return this.set('bindings', bindings);
  }

  // Settings
  getSettings() {
    return this.get('settings', {
      engineVolume: 100,
      engineSoundEnabled: true,
      engineMusicEnabled: true,
      musicVolume: 70,
      sfxVolume: 80,
      language: 'en',
      fullscreen: false,
      startInFullscreen: false,
    });
  }

  saveSettings(settings) {
    return this.set('settings', settings);
  }
}

export const storage = new Storage();
