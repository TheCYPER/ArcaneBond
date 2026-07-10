import { saveStore } from "../systems/save-store.js";
import { UI } from "../systems/ui.js";

const byId = (id) => document.getElementById(id);

export class ArchiveScene extends Phaser.Scene {
  constructor() {
    super("ArchiveScene");
  }

  create() {
    UI.showScreen("archiveScreen");
    UI.renderArchive(saveStore.data);
    const content = byId("archiveContent");
    const cue = byId("archiveScrollCue");
    content.scrollTop = 0;
    const syncCue = () => {
      cue.hidden = content.scrollTop + content.clientHeight >= content.scrollHeight - 2;
    };
    content.onscroll = syncCue;
    requestAnimationFrame(syncCue);
    this.events.once("shutdown", () => {
      content.onscroll = null;
    });
    byId("archiveBackButton").onclick = () => this.scene.start("MenuScene");
  }
}
