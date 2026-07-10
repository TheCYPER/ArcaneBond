import { UI } from "../systems/ui.js";
import { preloadAudio } from "../systems/audio.js";

const wizardSheets = ["star", "ember", "verdant", "thunder"];
const enemySheets = ["imp", "wolf", "guard", "ghost", "archer", "priest", "mirror", "spore"];
const bossSheets = ["lich", "thorn", "mirrorboss"];
const effectSheets = ["star-shot", "ember-shot", "seed-shot", "thunder-shot", "burst", "curse", "shield", "warning"];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.on("progress", (value) => UI.setLoading(value));
    this.load.on("loaderror", (file) => UI.setLoading(0, `资源读取失败：${file.key}`));
    for (const key of wizardSheets) {
      this.load.spritesheet(key, `assets/sprites/${key}.png`, { frameWidth: 16, frameHeight: 20 });
    }
    for (const key of enemySheets) {
      this.load.spritesheet(key, `assets/sprites/${key}.png`, { frameWidth: 20, frameHeight: 20 });
    }
    for (const key of bossSheets) {
      this.load.spritesheet(key, `assets/sprites/${key}.png`, { frameWidth: 34, frameHeight: 34 });
    }
    for (const key of effectSheets) {
      this.load.spritesheet(key, `assets/effects/${key}.png`, { frameWidth: 12, frameHeight: 12 });
    }
    this.load.spritesheet("library-tiles", "assets/tiles/library.png", { frameWidth: 16, frameHeight: 16 });
    preloadAudio(this);
  }

  create() {
    this.createAnimations();
    UI.setLoading(1);
    this.time.delayedCall(180, () => this.scene.start("MenuScene"));
  }

  createAnimations() {
    for (const key of [...wizardSheets, ...enemySheets, ...bossSheets]) {
      const prefix = `${key}-`;
      this.anims.create({ key: `${prefix}idle`, frames: this.anims.generateFrameNumbers(key, { frames: [0, 1] }), frameRate: 3, repeat: -1 });
      this.anims.create({ key: `${prefix}walk`, frames: this.anims.generateFrameNumbers(key, { frames: [1, 2, 3, 2] }), frameRate: 8, repeat: -1 });
      this.anims.create({ key: `${prefix}cast`, frames: this.anims.generateFrameNumbers(key, { frames: [4, 0] }), frameRate: 10, repeat: 0 });
      this.anims.create({ key: `${prefix}hurt`, frames: this.anims.generateFrameNumbers(key, { frames: [4, 0] }), frameRate: 12, repeat: 0 });
      this.anims.create({ key: `${prefix}down`, frames: this.anims.generateFrameNumbers(key, { frames: [5] }), frameRate: 1, repeat: 0 });
    }
    for (const key of effectSheets) {
      this.anims.create({ key: `${key}-pulse`, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }), frameRate: 14, repeat: -1 });
    }
  }
}
