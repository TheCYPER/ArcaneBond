import { UI } from "../systems/ui.js";
import { preloadAudio } from "../systems/audio.js";
import { ENEMY_FRAME_LAYOUT, ENEMY_SHEET, ENEMY_SPRITE_IDS } from "../content/enemy-animations.js";
import { WIZARD_DIRECTIONS, WIZARD_DOWN_FRAME, WIZARD_FRAME_LAYOUT, WIZARD_SHEET } from "../content/wizard-animations.js";

const wizardSheets = ["star", "ember", "verdant", "thunder"];
const enemySheets = ENEMY_SPRITE_IDS;
const bossSheets = ["lich", "thorn", "mirrorboss"];
const effectSheets = ["star-shot", "ember-shot", "seed-shot", "thunder-shot", "burst", "curse", "shield", "warning"];
const trainingSheets = ["training-straw", "training-target"];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.on("progress", (value) => UI.setLoading(value));
    this.load.on("loaderror", (file) => UI.setLoading(0, `资源读取失败：${file.key}`));
    for (const key of wizardSheets) {
      this.load.spritesheet(key, `assets/wizards/${key}/sheet.png`, WIZARD_SHEET);
    }
    for (const key of enemySheets) {
      this.load.spritesheet(key, `assets/sprites/${key}.png`, ENEMY_SHEET);
    }
    for (const key of bossSheets) {
      this.load.spritesheet(key, `assets/sprites/${key}.png`, { frameWidth: 34, frameHeight: 34 });
    }
    for (const key of effectSheets) {
      this.load.spritesheet(key, `assets/effects/${key}.png`, { frameWidth: 12, frameHeight: 12 });
    }
    this.load.spritesheet("training-straw", "assets/training/straw-dummy.png", { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet("training-target", "assets/training/moving-target.png", { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet("library-tiles", "assets/tiles/library.png", { frameWidth: 16, frameHeight: 16 });
    preloadAudio(this);
  }

  create() {
    this.createAnimations();
    UI.setLoading(1);
    this.time.delayedCall(180, () => this.scene.start("MenuScene"));
  }

  createAnimations() {
    for (const key of wizardSheets) {
      for (const direction of WIZARD_DIRECTIONS) {
        const frames = WIZARD_FRAME_LAYOUT[direction];
        this.anims.create({
          key: `${key}-idle-${direction}`,
          frames: this.anims.generateFrameNumbers(key, { frames: [frames.idle] }),
          frameRate: 1,
          repeat: -1
        });
        this.anims.create({
          key: `${key}-walk-${direction}`,
          frames: this.anims.generateFrameNumbers(key, { frames: frames.walk }),
          frameRate: 6,
          repeat: -1
        });
        this.anims.create({
          key: `${key}-cast-${direction}`,
          frames: this.anims.generateFrameNumbers(key, { frames: frames.cast }),
          frameRate: 10,
          repeat: 0
        });
      }
      this.anims.create({
        key: `${key}-down`,
        frames: this.anims.generateFrameNumbers(key, { frames: [WIZARD_DOWN_FRAME] }),
        frameRate: 1,
        repeat: 0
      });
    }
    for (const key of [...enemySheets, ...bossSheets]) {
      const prefix = `${key}-`;
      this.anims.create({ key: `${prefix}idle`, frames: this.anims.generateFrameNumbers(key, { frames: ENEMY_FRAME_LAYOUT.idle }), frameRate: 3, repeat: -1 });
      this.anims.create({ key: `${prefix}walk`, frames: this.anims.generateFrameNumbers(key, { frames: ENEMY_FRAME_LAYOUT.walk }), frameRate: 8, repeat: -1 });
      this.anims.create({ key: `${prefix}cast`, frames: this.anims.generateFrameNumbers(key, { frames: ENEMY_FRAME_LAYOUT.cast }), frameRate: 10, repeat: 0 });
      this.anims.create({ key: `${prefix}hurt`, frames: this.anims.generateFrameNumbers(key, { frames: ENEMY_FRAME_LAYOUT.hurt }), frameRate: 12, repeat: 0 });
      this.anims.create({ key: `${prefix}down`, frames: this.anims.generateFrameNumbers(key, { frames: ENEMY_FRAME_LAYOUT.down }), frameRate: 1, repeat: 0 });
    }
    for (const key of effectSheets) {
      this.anims.create({ key: `${key}-pulse`, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }), frameRate: 14, repeat: -1 });
    }
    for (const key of trainingSheets) {
      this.anims.create({ key: `${key}-idle`, frames: this.anims.generateFrameNumbers(key, { frames: [0, 1] }), frameRate: 3, repeat: -1 });
    }
  }
}
