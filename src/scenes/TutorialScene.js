import { RunScene } from "./RunScene.js";

export class TutorialScene extends RunScene {
  constructor() {
    super("TutorialScene");
  }

  init(data = {}) {
    super.init({ ...data, tutorialMode: true });
  }
}
