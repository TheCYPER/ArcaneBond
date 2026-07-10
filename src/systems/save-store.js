import { SAVE_KEY, SAVE_VERSION } from "../constants.js";
import {
  BOSS_AFFIXES,
  COSMETICS,
  DEFAULT_LOADOUT,
  DIFFICULTIES,
  progressionUnlocks,
  SPELL_VARIANTS
} from "../content/progression.js";

function validIds(value, definitions, required = []) {
  const ids = Array.isArray(value) ? value.filter((id) => definitions[id]) : [];
  return [...new Set([...required, ...ids])];
}

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    tutorialCompleted: false,
    unlockedWizards: ["star", "ember"],
    unlockedBlessings: [],
    defeatedBosses: [],
    unlockedSpellVariants: ["classic"],
    unlockedBossAffixes: ["none"],
    unlockedDifficulties: ["keeper"],
    unlockedCosmetics: ["classic"],
    loadout: { ...DEFAULT_LOADOUT },
    clearedRuns: 0,
    bestRunSeconds: null,
    lastSeed: null,
    settings: {
      music: true,
      sfx: true,
      screenshake: true,
      flashes: true
    }
  };
}

export function normalizeSave(candidate) {
  const defaults = createDefaultSave();
  if (!candidate || typeof candidate !== "object") return defaults;
  const clearedRuns = Number.isInteger(candidate.clearedRuns) && candidate.clearedRuns >= 0 ? candidate.clearedRuns : 0;
  const progression = progressionUnlocks(clearedRuns);
  const unlockedWizards = Array.isArray(candidate.unlockedWizards)
    ? candidate.unlockedWizards.filter((id) => ["star", "ember", "verdant", "thunder"].includes(id))
    : defaults.unlockedWizards;
  for (const required of defaults.unlockedWizards) {
    if (!unlockedWizards.includes(required)) unlockedWizards.push(required);
  }
  const unlockedSpellVariants = validIds(candidate.unlockedSpellVariants, SPELL_VARIANTS, progression.spellVariants);
  const unlockedBossAffixes = validIds(candidate.unlockedBossAffixes, BOSS_AFFIXES, progression.bossAffixes);
  const unlockedDifficulties = validIds(candidate.unlockedDifficulties, DIFFICULTIES, progression.difficulties);
  const unlockedCosmetics = validIds(candidate.unlockedCosmetics, COSMETICS, progression.cosmetics);
  const candidateLoadout = candidate.loadout && typeof candidate.loadout === "object" ? candidate.loadout : {};
  const loadout = {
    variantId: unlockedSpellVariants.includes(candidateLoadout.variantId) ? candidateLoadout.variantId : DEFAULT_LOADOUT.variantId,
    bossAffixId: unlockedBossAffixes.includes(candidateLoadout.bossAffixId) ? candidateLoadout.bossAffixId : DEFAULT_LOADOUT.bossAffixId,
    difficultyId: unlockedDifficulties.includes(candidateLoadout.difficultyId) ? candidateLoadout.difficultyId : DEFAULT_LOADOUT.difficultyId,
    cosmeticId: unlockedCosmetics.includes(candidateLoadout.cosmeticId) ? candidateLoadout.cosmeticId : DEFAULT_LOADOUT.cosmeticId
  };
  const candidateSettings = candidate.settings && typeof candidate.settings === "object" ? candidate.settings : {};
  return {
    version: SAVE_VERSION,
    tutorialCompleted: Boolean(candidate.tutorialCompleted),
    unlockedWizards,
    unlockedBlessings: Array.isArray(candidate.unlockedBlessings) ? candidate.unlockedBlessings : [],
    defeatedBosses: Array.isArray(candidate.defeatedBosses) ? candidate.defeatedBosses : [],
    unlockedSpellVariants,
    unlockedBossAffixes,
    unlockedDifficulties,
    unlockedCosmetics,
    loadout,
    clearedRuns,
    bestRunSeconds: Number.isFinite(candidate.bestRunSeconds) && candidate.bestRunSeconds >= 0 ? candidate.bestRunSeconds : null,
    lastSeed: typeof candidate.lastSeed === "string" ? candidate.lastSeed : null,
    settings: {
      music: typeof candidateSettings.music === "boolean" ? candidateSettings.music : defaults.settings.music,
      sfx: typeof candidateSettings.sfx === "boolean" ? candidateSettings.sfx : defaults.settings.sfx,
      screenshake: typeof candidateSettings.screenshake === "boolean" ? candidateSettings.screenshake : defaults.settings.screenshake,
      flashes: typeof candidateSettings.flashes === "boolean" ? candidateSettings.flashes : defaults.settings.flashes
    }
  };
}

function defaultStorage() {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;
  return storage && typeof storage.getItem === "function" ? storage : null;
}

export class SaveStore {
  constructor(storage = defaultStorage(), logger = console) {
    this.storage = storage;
    this.logger = logger;
    this.data = this.load();
  }

  load() {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      return normalizeSave(raw ? JSON.parse(raw) : null);
    } catch (error) {
      this.logger.warn("存档读取失败，已使用默认存档。", error);
      return createDefaultSave();
    }
  }

  commit(patch = {}) {
    this.data = normalizeSave({ ...this.data, ...patch });
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (error) {
      this.logger.warn("存档写入失败，本局仍可继续。", error);
    }
    return this.data;
  }

  unlockWizard(id) {
    const unlocked = new Set(this.data.unlockedWizards);
    unlocked.add(id);
    this.commit({ unlockedWizards: [...unlocked] });
  }

  markBossDefeated(id) {
    const defeated = new Set(this.data.defeatedBosses);
    defeated.add(id);
    this.commit({ defeatedBosses: [...defeated] });
  }

  reset() {
    this.data = createDefaultSave();
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (error) {
      this.logger.warn("无法重置存档。", error);
    }
    return this.data;
  }
}

export const saveStore = new SaveStore();
