import { audio } from "../systems/audio.js";
import { saveStore } from "../systems/save-store.js";
import { UI } from "../systems/ui.js";

const byId = (id) => document.getElementById(id);

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  init(data) {
    this.result = data;
  }

  create() {
    UI.showResult(this.result);
    audio.music(this, "library");
    if (this.result.win) audio.sfx(this, "victory", 0.42);
    byId("retryButton").onclick = () => this.scene.start("CharacterSelectScene", { forceTutorial: false });
    byId("resultMenuButton").onclick = () => this.scene.start("MenuScene");
    UI.updateMenuMeta(saveStore.data);
  }
}
