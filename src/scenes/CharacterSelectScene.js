import { audio } from "../systems/audio.js";
import { saveStore } from "../systems/save-store.js";
import { UI } from "../systems/ui.js";
import { BOSS_AFFIXES, COSMETICS, DIFFICULTIES, SPELL_VARIANTS } from "../content/progression.js";
import { getBondRecipe, WIZARDS } from "../content/wizards.js";

const byId = (id) => document.getElementById(id);

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super("CharacterSelectScene");
  }

  init(data = {}) {
    this.forceTutorial = Boolean(data.forceTutorial);
    this.supportId = saveStore.data.unlockedWizards.includes("verdant") && saveStore.data.clearedRuns % 2 === 1 ? "verdant" : "star";
    this.damageId = saveStore.data.unlockedWizards.includes("thunder") && saveStore.data.clearedRuns % 3 === 2 ? "thunder" : "ember";
    this.loadout = { ...saveStore.data.loadout };
  }

  create() {
    UI.showScreen("selectScreen");
    this.render();
    this.renderRunOptions();
    byId("selectBackButton").onclick = () => this.scene.start("MenuScene");
    byId("confirmTeamButton").onclick = () => {
      audio.sfx(this, "ui-select");
      const payload = { supportId: this.supportId, damageId: this.damageId, ...this.loadout };
      const needsTutorial = this.forceTutorial || !saveStore.data.tutorialCompleted;
      this.scene.start(needsTutorial ? "TutorialScene" : "RunScene", payload);
    };
  }

  render() {
    UI.renderWizardChoices("support", this.supportId, saveStore.data, (id) => {
      this.supportId = id;
      audio.sfx(this, "ui-select");
      this.render();
    });
    UI.renderWizardChoices("damage", this.damageId, saveStore.data, (id) => {
      this.damageId = id;
      audio.sfx(this, "ui-select");
      this.render();
    });
    UI.setBond(getBondRecipe(this.supportId, this.damageId));
    byId("confirmTeamButton").disabled = !WIZARDS[this.supportId] || !WIZARDS[this.damageId];
  }

  renderRunOptions() {
    const groups = [
      ["variantSelect", SPELL_VARIANTS, saveStore.data.unlockedSpellVariants, "variantId"],
      ["difficultySelect", DIFFICULTIES, saveStore.data.unlockedDifficulties, "difficultyId"],
      ["bossAffixSelect", BOSS_AFFIXES, saveStore.data.unlockedBossAffixes, "bossAffixId"],
      ["cosmeticSelect", COSMETICS, saveStore.data.unlockedCosmetics, "cosmeticId"]
    ];
    for (const [elementId, definitions, unlockedIds, field] of groups) {
      const select = byId(elementId);
      select.innerHTML = "";
      for (const definition of Object.values(definitions)) {
        const unlocked = unlockedIds.includes(definition.id);
        const option = document.createElement("option");
        option.value = definition.id;
        option.disabled = !unlocked;
        option.textContent = unlocked ? definition.name : `${definition.name} · 未解锁`;
        select.appendChild(option);
      }
      select.value = this.loadout[field];
      select.title = definitions[this.loadout[field]].description;
      select.onchange = (event) => {
        this.loadout[field] = event.target.value;
        event.target.title = definitions[event.target.value].description;
        saveStore.commit({ loadout: { ...this.loadout } });
        audio.sfx(this, "ui-select", 0.2);
      };
    }
  }
}
