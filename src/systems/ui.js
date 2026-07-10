import { BLESSINGS } from "../content/blessings.js";
import { BOSSES } from "../content/bosses.js";
import { ENEMIES } from "../content/enemies.js";
import { BOSS_AFFIXES, COSMETICS, DIFFICULTIES, SPELL_VARIANTS } from "../content/progression.js";
import { BOND_RECIPES, WIZARDS } from "../content/wizards.js";

const byId = (id) => document.getElementById(id);

const refs = {
  stage: byId("stage"),
  hud: byId("hud"),
  menu: byId("menuScreen"),
  story: byId("storyScreen"),
  select: byId("selectScreen"),
  archive: byId("archiveScreen"),
  result: byId("resultScreen"),
  loading: byId("loadingOverlay"),
  loadingText: byId("loadingText"),
  settings: byId("settingsPanel"),
  supportName: byId("supportName"),
  damageName: byId("damageName"),
  supportPortrait: byId("supportPortrait"),
  damagePortrait: byId("damagePortrait"),
  supportHp: byId("supportHp"),
  damageHp: byId("damageHp"),
  supportAbilities: byId("supportAbilities"),
  damageAbilities: byId("damageAbilities"),
  roomLabel: byId("roomLabel"),
  objective: byId("objectiveText"),
  seed: byId("seedLabel"),
  bossHud: byId("bossHud"),
  bossName: byId("bossName"),
  bossPhase: byId("bossPhase"),
  bossHp: byId("bossHp"),
  bossHint: byId("bossHint"),
  dialogue: byId("dialogueBox"),
  dialogueSpeaker: byId("dialogueSpeaker"),
  dialogueText: byId("dialogueText"),
  tutorial: byId("tutorialPanel"),
  tutorialStep: byId("tutorialStep"),
  tutorialTitle: byId("tutorialTitle"),
  tutorialText: byId("tutorialText"),
  reward: byId("rewardPanel"),
  rewardChoices: byId("rewardChoices"),
  continueMeta: byId("continueMeta")
};

const screenRefs = [refs.menu, refs.story, refs.select, refs.archive, refs.result];

function abilityChips(wizard, slot) {
  const keys = slot === "support" ? ["F", "G", "H", "T"] : ["J", "K", "L", "O"];
  return ["shot", "skill1", "skill2", "ult"]
    .map((id, index) => `<span class="ability-chip" data-ability="${id}" title="${wizard.abilities[id].name}">${keys[index]} ${wizard.abilities[id].name}</span>`)
    .join("");
}

export const UI = {
  refs,

  showScreen(id) {
    for (const screen of screenRefs) screen.hidden = screen.id !== id;
    refs.hud.hidden = true;
  },

  hideScreens() {
    for (const screen of screenRefs) screen.hidden = true;
  },

  showHud(team, seed) {
    this.hideScreens();
    refs.hud.hidden = false;
    refs.supportName.textContent = team.support.name;
    refs.damageName.textContent = team.damage.name;
    refs.supportPortrait.style.backgroundImage = `url("assets/sprites/${team.support.texture}.png")`;
    refs.damagePortrait.style.backgroundImage = `url("assets/sprites/${team.damage.texture}.png")`;
    refs.supportAbilities.innerHTML = abilityChips(team.support, "support");
    refs.damageAbilities.innerHTML = abilityChips(team.damage, "damage");
    refs.seed.textContent = `SEED ${seed}`;
  },

  setLoading(progress, text = "正在翻开魔典…") {
    refs.loading.hidden = progress >= 1;
    refs.loadingText.textContent = progress >= 1 ? "裂隙已就绪" : `${text} ${Math.round(progress * 100)}%`;
  },

  updateRun({ room, objective, players, cooldowns }) {
    refs.roomLabel.textContent = room;
    refs.objective.textContent = objective;
    refs.supportHp.style.width = `${Math.max(0, players[0].hp / players[0].maxHp) * 100}%`;
    refs.damageHp.style.width = `${Math.max(0, players[1].hp / players[1].maxHp) * 100}%`;
    this.updateCooldowns(refs.supportAbilities, cooldowns[0]);
    this.updateCooldowns(refs.damageAbilities, cooldowns[1]);
  },

  updateCooldowns(container, values) {
    for (const chip of container.querySelectorAll("[data-ability]")) {
      const value = values[chip.dataset.ability] || 0;
      chip.classList.toggle("cooling", value > 0);
      const base = chip.title;
      const key = chip.textContent.trim().split(" ")[0];
      chip.textContent = value > 0 ? `${key} ${Math.ceil(value)}` : `${key} ${base}`;
    }
  },

  setBoss(boss, model) {
    refs.bossHud.hidden = !boss;
    if (!boss) return;
    refs.bossName.textContent = model.affix?.id && model.affix.id !== "none" ? `${boss.name} · ${model.affix.name}` : boss.name;
    refs.bossPhase.textContent = model.phase === 1 ? "I" : "II";
    refs.bossHp.style.width = `${Math.max(0, model.hp / model.maxHp) * 100}%`;
    const combatHint = model.phase === 2
      ? model.resonanceOpen > 0
        ? "共鸣已开启，输出位释放终极技能"
        : `裂隙能量 ${Math.floor(model.riftEnergy)}% · 辅助位释放终极技能`
      : model.shield > 0
        ? "黑暗护盾存在，输出位使用破盾技能"
        : "观察预警，积攒双生共鸣";
    const setupHint = model.starMark > 0 ? "星印已附着" : model.sprout > 0 ? "孢芽已附着" : "";
    refs.bossHint.textContent = setupHint ? `${setupHint} · ${combatHint}` : combatHint;
  },

  say(speaker, text, seconds = 3.5) {
    refs.dialogue.hidden = false;
    refs.dialogueSpeaker.textContent = speaker;
    refs.dialogueText.textContent = text;
    clearTimeout(this.dialogueTimer);
    this.dialogueTimer = setTimeout(() => {
      refs.dialogue.hidden = true;
    }, seconds * 1000);
  },

  showTutorial(step, title, text) {
    refs.tutorial.hidden = false;
    refs.tutorialStep.textContent = `${step} / 4`;
    refs.tutorialTitle.textContent = title;
    refs.tutorialText.textContent = text;
  },

  hideTutorial() {
    refs.tutorial.hidden = true;
  },

  showReward(choices) {
    refs.reward.hidden = false;
    refs.rewardChoices.innerHTML = choices
      .map((choice, index) => `<div class="reward-choice" data-index="${index}"><strong>${index + 1} · ${choice.name}</strong><span>${choice.description}</span></div>`)
      .join("");
  },

  setRewardActive(index) {
    for (const choice of refs.rewardChoices.children) {
      choice.classList.toggle("active", Number(choice.dataset.index) === index);
    }
  },

  hideReward() {
    refs.reward.hidden = true;
    refs.rewardChoices.innerHTML = "";
  },

  updateMenuMeta(save) {
    refs.continueMeta.textContent = save.clearedRuns
      ? `已完成 ${save.clearedRuns} 次封印 · 最快 ${formatTime(save.bestRunSeconds)}`
      : "尚未留下裂隙记录";
  },

  renderArchive(save) {
    const entries = [];
    for (const wizard of Object.values(WIZARDS)) {
      const unlocked = save.unlockedWizards.includes(wizard.id);
      entries.push(`<article class="archive-entry ${unlocked ? "" : "locked"}" style="--entry-color:${wizard.color}"><strong>${unlocked ? wizard.name : "未解锁巫师"}</strong><span>${unlocked ? wizard.role : wizard.id === "verdant" ? "完成第一次封印" : "击败荆棘母树"}</span></article>`);
    }
    for (const boss of Object.values(BOSSES)) {
      const seen = save.defeatedBosses.includes(boss.id);
      entries.push(`<article class="archive-entry ${seen ? "" : "locked"}" style="--entry-color:${boss.color}"><strong>${seen ? boss.name : "未知裂隙主宰"}</strong><span>${seen ? boss.defeat : "在裂隙深处找到它"}</span></article>`);
    }
    for (const enemy of Object.values(ENEMIES)) {
      entries.push(`<article class="archive-entry"><strong>${enemy.name}</strong><span>${enemy.ai === "chaser" ? "追踪最近的巫师" : enemy.ai === "hunter" ? "优先扑向输出位" : enemy.ai === "curser" ? "从远处施加诅咒" : "拥有独特的裂隙行动"}</span></article>`);
    }
    const progressionGroups = [
      [SPELL_VARIANTS, save.unlockedSpellVariants, "未解锁笔法", "#63d9ff"],
      [BOSS_AFFIXES, save.unlockedBossAffixes, "未解锁词缀", "#ff4f70"],
      [DIFFICULTIES, save.unlockedDifficulties, "未解锁难度", "#ffd34e"],
      [COSMETICS, save.unlockedCosmetics, "未解锁外观", "#74d36f"]
    ];
    for (const [definitions, unlockedIds, lockedName, color] of progressionGroups) {
      for (const definition of Object.values(definitions)) {
        const unlocked = unlockedIds.includes(definition.id);
        entries.push(`<article class="archive-entry ${unlocked ? "" : "locked"}" style="--entry-color:${color}"><strong>${unlocked ? definition.name : lockedName}</strong><span>${unlocked ? definition.description : "继续完成封印记录"}</span></article>`);
      }
    }
    byId("archiveContent").innerHTML = entries.join("");
  },

  renderWizardChoices(slot, selectedId, save, onSelect) {
    const container = slot === "support" ? byId("supportChoices") : byId("damageChoices");
    container.innerHTML = "";
    for (const wizard of Object.values(WIZARDS).filter((item) => item.slot === slot)) {
      const unlocked = save.unlockedWizards.includes(wizard.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `wizard-card ${wizard.id === selectedId ? "selected" : ""} ${unlocked ? "" : "locked"}`;
      button.style.setProperty("--wizard-color", wizard.color);
      button.disabled = !unlocked;
      button.innerHTML = `<span class="wizard-sprite" style="background-image:url('assets/sprites/${wizard.texture}.png')"></span><strong>${wizard.name}</strong><span>${unlocked ? wizard.role : wizard.id === "verdant" ? "首次封印后解锁" : "击败荆棘母树解锁"}</span>`;
      button.addEventListener("click", () => onSelect(wizard.id));
      container.appendChild(button);
    }
  },

  setBond(recipe) {
    byId("bondName").textContent = recipe.name;
    byId("bondDescription").textContent = recipe.description;
  },

  showResult({ win, title, body, session, unlockText }) {
    this.showScreen("resultScreen");
    byId("resultRune").textContent = win ? "✦" : "×";
    byId("resultKicker").textContent = win ? "裂隙已封印" : "魔力暂时耗尽";
    byId("resultTitle").textContent = title;
    byId("resultBody").textContent = body;
    const difficulty = DIFFICULTIES[session.difficultyId] || DIFFICULTIES.keeper;
    const variant = SPELL_VARIANTS[session.variantId] || SPELL_VARIANTS.classic;
    const affix = BOSS_AFFIXES[session.bossAffixId] || BOSS_AFFIXES.none;
    const cosmetic = COSMETICS[session.cosmeticId] || COSMETICS.classic;
    byId("resultStats").innerHTML = `<span>用时 ${formatTime(session.elapsedSeconds())}</span><span>共鸣 ${session.stats.bonds}</span><span>唤醒 ${session.stats.revives}</span><span>${difficulty.name}</span><span>${variant.name}</span><span>${affix.name}</span><span>${cosmetic.name}</span><span>种子 ${session.seed}</span>`;
    const unlock = byId("unlockNotice");
    unlock.hidden = !unlockText;
    unlock.textContent = unlockText || "";
  },

  syncSettings(save) {
    byId("musicToggle").checked = save.settings.music;
    byId("sfxToggle").checked = save.settings.sfx;
    byId("shakeToggle").checked = save.settings.screenshake;
    byId("flashToggle").checked = save.settings.flashes;
  }
};

export function formatTime(seconds) {
  if (seconds == null) return "--:--";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function blessingById(id) {
  return BLESSINGS.find((item) => item.id === id);
}

export function recipeById(id) {
  return Object.values(BOND_RECIPES).find((item) => item.id === id);
}
