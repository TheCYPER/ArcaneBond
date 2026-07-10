import { PALETTE } from "../constants.js";
import { audio } from "../systems/audio.js";
import { UI } from "../systems/ui.js";

export class RewardScene extends Phaser.Scene {
  constructor() {
    super("RewardScene");
  }

  init(data) {
    this.runSceneKey = data.runSceneKey;
    this.choices = data.choices;
    this.kind = data.kind;
    this.progress = 0;
    this.activeIndex = -1;
  }

  create() {
    this.runScene = this.scene.get(this.runSceneKey);
    this.altars = [88, 160, 232].map((x, index) => {
      const color = index === 0 ? PALETTE.star : index === 1 ? PALETTE.thunder : PALETTE.ember;
      const ring = this.add.rectangle(x, 93, 28, 28, 0x100d18, 0.76).setStrokeStyle(2, color, 0.9).setDepth(30);
      const rune = this.add.text(x, 93, String(index + 1), {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f2e6c9"
      }).setOrigin(0.5).setDepth(31);
      return { x, y: 93, ring, rune };
    });
    this.progressGraphic = this.add.graphics().setDepth(32);
    UI.showReward(this.choices);
  }

  update(_time, deltaMs) {
    if (!this.runScene?.playerModels) return;
    const [support, damage] = this.runScene.playerModels;
    const sameIndex = this.altars.findIndex((altar) => {
      const supportNear = Phaser.Math.Distance.Between(support.sprite.x, support.sprite.y, altar.x, altar.y) <= 18;
      const damageNear = Phaser.Math.Distance.Between(damage.sprite.x, damage.sprite.y, altar.x, altar.y) <= 18;
      return supportNear && damageNear;
    });
    const confirming = sameIndex >= 0 && this.runScene.isInteractHeld("support") && this.runScene.isInteractHeld("damage");
    if (sameIndex !== this.activeIndex) {
      this.activeIndex = sameIndex;
      this.progress = 0;
      UI.setRewardActive(sameIndex);
    }
    if (confirming) this.progress = Math.min(1, this.progress + deltaMs / 900);
    else this.progress = Math.max(0, this.progress - deltaMs / 500);
    this.drawProgress();
    if (this.progress >= 1) this.choose(this.activeIndex);
  }

  drawProgress() {
    this.progressGraphic.clear();
    if (this.activeIndex < 0 || this.progress <= 0) return;
    const altar = this.altars[this.activeIndex];
    this.progressGraphic.lineStyle(2, PALETTE.bone, 1);
    this.progressGraphic.beginPath();
    this.progressGraphic.arc(altar.x, altar.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.progress, false);
    this.progressGraphic.strokePath();
  }

  choose(index) {
    if (index < 0 || !this.choices[index]) return;
    const choice = this.choices[index];
    audio.sfx(this, "bond", 0.4);
    this.runScene.applyReward(choice, this.kind);
    UI.hideReward();
    this.scene.stop();
    this.runScene.finishReward();
  }

  shutdown() {
    UI.hideReward();
  }
}
