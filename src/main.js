import { GAME_HEIGHT, GAME_WIDTH } from "./constants.js";
import { ArchiveScene } from "./scenes/ArchiveScene.js";
import { BootScene } from "./scenes/BootScene.js";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { ResultScene } from "./scenes/ResultScene.js";
import { RewardScene } from "./scenes/RewardScene.js";
import { RunScene } from "./scenes/RunScene.js";
import { StoryScene } from "./scenes/StoryScene.js";
import { TutorialScene } from "./scenes/TutorialScene.js";
import { audio } from "./systems/audio.js";
import { saveStore } from "./systems/save-store.js";
import { UI } from "./systems/ui.js";

const byId = (id) => document.getElementById(id);

function resizeStage() {
  const availableWidth = Math.max(GAME_WIDTH * 2, window.innerWidth - 20);
  const availableHeight = Math.max(GAME_HEIGHT * 2, window.innerHeight - 20);
  const scale = Math.max(2, Math.min(4, Math.floor(Math.min(availableWidth / GAME_WIDTH, availableHeight / GAME_HEIGHT))));
  UI.refs.stage.style.setProperty("--stage-width", `${GAME_WIDTH * scale}px`);
  UI.refs.stage.style.setProperty("--stage-height", `${GAME_HEIGHT * scale}px`);
  UI.refs.stage.dataset.scale = String(scale);
}

resizeStage();
window.addEventListener("resize", resizeStage);

if (!window.Phaser) {
  UI.refs.loadingText.textContent = "Phaser 没有加载成功，请使用 play.command 启动游戏。";
  throw new Error("Phaser runtime is missing");
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "gameMount",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#100d18",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  audio: {
    disableWebAudio: true
  },
  scene: [
    BootScene,
    MenuScene,
    StoryScene,
    CharacterSelectScene,
    TutorialScene,
    RunScene,
    RewardScene,
    ArchiveScene,
    ResultScene
  ]
});

window.arcaneBondGame = game;

if (new URLSearchParams(window.location.search).has("qa")) {
  window.arcaneBondQA = {
    unlockAll() {
      return saveStore.commit({
        tutorialCompleted: true,
        unlockedWizards: ["star", "ember", "verdant", "thunder"],
        defeatedBosses: ["lich", "thorn", "mirrorboss"],
        clearedRuns: Math.max(5, saveStore.data.clearedRuns)
      });
    },
    activeScene() {
      return game.scene.getScenes(true)[0]?.scene.key || null;
    },
    startRun(supportId = "star", damageId = "ember", seed = "QA-BOND", options = {}) {
      const active = game.scene.getScenes(true)[0];
      active.scene.start("RunScene", { supportId, damageId, seed, ...saveStore.data.loadout, ...options });
    },
    clearRoom() {
      const run = game.scene.getScene("RunScene");
      for (const enemy of [...(run.enemies?.getChildren() || [])]) enemy.destroy();
      run.checkRoomState?.();
    },
    defeatBoss() {
      const run = game.scene.getScene("RunScene");
      if (run.bossModel) run.hitBoss(run.bossModel.maxHp * 2, { combo: true });
    }
  };
}

function updateSetting(key, value) {
  saveStore.commit({ settings: { ...saveStore.data.settings, [key]: value } });
  const active = game.scene.getScenes(true)[0];
  audio.refresh(active);
}

byId("settingsCloseButton").onclick = () => {
  UI.refs.settings.hidden = true;
};
byId("musicToggle").onchange = (event) => updateSetting("music", event.target.checked);
byId("sfxToggle").onchange = (event) => updateSetting("sfx", event.target.checked);
byId("shakeToggle").onchange = (event) => updateSetting("screenshake", event.target.checked);
byId("flashToggle").onchange = (event) => updateSetting("flashes", event.target.checked);
byId("resetSaveButton").onclick = () => {
  const confirmed = window.confirm("重置后会清除巫师、祝福与通关记录。确定继续吗？");
  if (!confirmed) return;
  saveStore.reset();
  UI.syncSettings(saveStore.data);
  UI.updateMenuMeta(saveStore.data);
  UI.refs.settings.hidden = true;
  const active = game.scene.getScenes(true)[0];
  if (active?.scene.key !== "MenuScene") active?.scene.start("MenuScene");
};

UI.syncSettings(saveStore.data);
