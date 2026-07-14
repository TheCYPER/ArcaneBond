import { saveStore } from "./save-store.js";

const SFX_KEYS = [
  "ui-select",
  "star-cast",
  "ember-cast",
  "verdant-cast",
  "thunder-cast",
  "hit",
  "hurt",
  "bond",
  "shield-break",
  "revive",
  "boss-warning",
  "training-cheer",
  "victory"
];

export function preloadAudio(scene) {
  scene.load.audio("music-library", "assets/audio/music/library.wav");
  scene.load.audio("music-battle", "assets/audio/music/battle.wav");
  for (const key of SFX_KEYS) scene.load.audio(`sfx-${key}`, `assets/audio/sfx/${key}.wav`);
}

function userHasActivatedAudio() {
  return navigator.userActivation?.hasBeenActive ?? true;
}

export const audio = {
  currentMusic: null,
  currentKey: null,
  unlockBound: false,

  music(scene, key) {
    if (!saveStore.data.settings.music) {
      this.stopMusic();
      return;
    }
    if (!userHasActivatedAudio() || scene.sound.locked) {
      this.pendingMusic = { scene, key };
      if (!this.unlockBound) {
        this.unlockBound = true;
        const resume = () => {
          window.removeEventListener("pointerdown", resume);
          window.removeEventListener("keydown", resume);
          this.unlockBound = false;
          const pending = this.pendingMusic;
          this.pendingMusic = null;
          setTimeout(() => pending?.scene?.sys?.isActive() && this.music(pending.scene, pending.key), 0);
        };
        window.addEventListener("pointerdown", resume, { once: true });
        window.addEventListener("keydown", resume, { once: true });
      }
      return;
    }
    const assetKey = `music-${key}`;
    if (this.currentKey === assetKey && this.currentMusic?.isPlaying) return;
    this.stopMusic();
    if (!scene.cache.audio.exists(assetKey)) return;
    this.currentMusic = scene.sound.add(assetKey, { loop: true, volume: key === "battle" ? 0.18 : 0.14 });
    this.currentKey = assetKey;
    this.currentMusic.play();
  },

  sfx(scene, key, volume = 0.34) {
    if (!saveStore.data.settings.sfx || !userHasActivatedAudio() || scene.sound.locked) return;
    const assetKey = `sfx-${key}`;
    if (scene.cache.audio.exists(assetKey)) scene.sound.play(assetKey, { volume });
  },

  stopMusic() {
    this.currentMusic?.stop();
    this.currentMusic?.destroy();
    this.currentMusic = null;
    this.currentKey = null;
  },

  refresh(scene) {
    if (!saveStore.data.settings.music) this.stopMusic();
    else if (scene?.scene?.key === "MenuScene") this.music(scene, "library");
  }
};
