// Web Audio wrapper
class AudioManager {
  constructor() {
    this.ctx = null;
    this.sounds = new Map();
    this.musicVolume = 0.7;
    this.sfxVolume = 0.8;
    this.currentMusic = null;
    this.musicGain = null;
    this.masterGain = null;
    this.enabled = true;
  }

  async init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio not available:', e);
      this.enabled = false;
    }
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async loadSound(id, url) {
    if (!this.ctx) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.sounds.set(id, audioBuffer);
      return true;
    } catch (e) {
      console.warn(`Failed to load sound ${id}: ${url}`);
      return false;
    }
  }

  async loadSounds(manifest, basePath = '') {
    const promises = Object.entries(manifest).map(([id, path]) => 
      this.loadSound(id, basePath + path)
    );
    return Promise.all(promises);
  }

  play(id, volume = 1.0, loop = false) {
    if (!this.enabled || !this.ctx || !this.sounds.has(id)) return null;
    
    const buffer = this.sounds.get(id);
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.value = volume * this.sfxVolume;
    
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(0);
    
    return { source, gain, stop: () => source.stop() };
  }

  playMusic(id, fadeIn = 1.0) {
    if (!this.enabled || !this.ctx) return;
    
    // Stop current music
    this.stopMusic();
    
    const buffer = this.sounds.get(id);
    if (!buffer) return;
    
    const source = this.ctx.createBufferSource();
    this.musicGain = this.ctx.createGain();
    
    source.buffer = buffer;
    source.loop = true;
    this.musicGain.gain.value = 0;
    
    source.connect(this.musicGain);
    this.musicGain.connect(this.masterGain);
    source.start(0);
    
    // Fade in
    this.musicGain.gain.linearRampToValueAtTime(
      this.musicVolume, 
      this.ctx.currentTime + fadeIn
    );
    
    this.currentMusic = { source, gain: this.musicGain };
  }

  stopMusic(fadeOut = 0.5) {
    if (!this.currentMusic) return;
    
    const { source, gain } = this.currentMusic;
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeOut);
    setTimeout(() => {
      try { source.stop(); } catch (e) {}
    }, fadeOut * 1000);
    
    this.currentMusic = null;
  }

  playClick() { this.play('click', 0.6); }
  playHover() { this.play('hover', 0.3); }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? 1 : 0;
    }
  }
}

export const audio = new AudioManager();
