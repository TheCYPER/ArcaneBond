import { audio } from "../systems/audio.js";
import { UI } from "../systems/ui.js";

const byId = (id) => document.getElementById(id);

const frames = [
  { speaker: "旧图书馆", text: "午夜的书页自己翻开了。紫色裂隙从星图中央睁开，像一只忘了眨眼的眼睛。" },
  { speaker: "星辉巫师", text: "裂隙每次都会改写房间。我们也得改写自己的配合。" },
  { speaker: "影焰巫师", text: "那就一个人写下魔法，另一个人把句子点燃。别松开。" }
];

export class StoryScene extends Phaser.Scene {
  constructor() {
    super("StoryScene");
  }

  init(data) {
    this.forceTutorial = Boolean(data.forceTutorial);
    this.index = 0;
  }

  create() {
    UI.showScreen("storyScreen");
    this.renderFrame();
    byId("storyNextButton").onclick = () => {
      audio.sfx(this, "ui-select");
      this.index += 1;
      if (this.index >= frames.length) this.finish();
      else this.renderFrame();
    };
    byId("storySkipButton").onclick = () => this.finish();
    this.input.keyboard.on("keydown-SPACE", () => byId("storyNextButton").click());
    this.input.keyboard.on("keydown-ENTER", () => byId("storyNextButton").click());
  }

  renderFrame() {
    const frame = frames[this.index];
    byId("storySpeaker").textContent = frame.speaker;
    byId("storyText").textContent = frame.text;
    byId("storyNextButton").textContent = this.index === frames.length - 1 ? "选择搭档" : "继续";
  }

  finish() {
    this.scene.start("CharacterSelectScene", { forceTutorial: this.forceTutorial });
  }
}
