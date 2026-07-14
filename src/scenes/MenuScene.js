import { audio } from "../systems/audio.js";
import { saveStore } from "../systems/save-store.js";
import { UI } from "../systems/ui.js";

const byId = (id) => document.getElementById(id);

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    UI.showScreen("menuScreen");
    UI.hideTutorial();
    UI.hideReward();
    UI.updateMenuMeta(saveStore.data);
    audio.music(this, "library");
    byId("startButton").onclick = () => {
      audio.sfx(this, "ui-select");
      this.scene.start("StoryScene", { forceTutorial: false });
    };
    byId("trainingButton").onclick = () => {
      audio.sfx(this, "ui-select");
      this.scene.start("TrainingSelectScene");
    };
    byId("tutorialButton").onclick = () => {
      audio.sfx(this, "ui-select");
      this.scene.start("CharacterSelectScene", { forceTutorial: true });
    };
    byId("archiveButton").onclick = () => this.scene.start("ArchiveScene");
    byId("settingsButton").onclick = () => {
      UI.refs.settings.hidden = false;
      UI.syncSettings(saveStore.data);
      audio.sfx(this, "ui-select");
    };
  }
}
