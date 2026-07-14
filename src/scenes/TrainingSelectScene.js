import { audio } from "../systems/audio.js";
import { UI } from "../systems/ui.js";

const byId = (id) => document.getElementById(id);

export class TrainingSelectScene extends Phaser.Scene {
  constructor() {
    super("TrainingSelectScene");
  }

  create() {
    UI.showScreen("trainingSelectScreen");
    audio.music(this, "library");

    const startTraining = (mode) => {
      audio.sfx(this, "ui-select");
      this.scene.start("TrainingScene", { mode });
    };

    byId("trainingSpawnButton").onclick = () => startTraining("spawn");
    byId("trainingMoveButton").onclick = () => startTraining("moving");
    byId("trainingBackButton").onclick = () => {
      audio.sfx(this, "ui-select");
      this.scene.start("MenuScene");
    };
    this.input.keyboard.once("keydown-ESC", () => this.scene.start("MenuScene"));
  }
}
