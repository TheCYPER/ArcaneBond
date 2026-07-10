import { BOSSES } from "../content/bosses.js";
import { ENCOUNTERS } from "../content/encounters.js";
import { eligibleBlessings } from "../content/blessings.js";
import { DEFAULT_LOADOUT, progressionUnlocks } from "../content/progression.js";
import { getBondRecipe } from "../content/wizards.js";
import { SeededRng, createRunSeed } from "./rng.js";

export class RunSession {
  constructor({
    supportId = "star",
    damageId = "ember",
    seed = createRunSeed(),
    save,
    variantId = DEFAULT_LOADOUT.variantId,
    bossAffixId = DEFAULT_LOADOUT.bossAffixId,
    difficultyId = DEFAULT_LOADOUT.difficultyId,
    cosmeticId = DEFAULT_LOADOUT.cosmeticId
  }) {
    this.supportId = supportId;
    this.damageId = damageId;
    this.variantId = variantId;
    this.bossAffixId = bossAffixId;
    this.difficultyId = difficultyId;
    this.cosmeticId = cosmeticId;
    this.seed = seed;
    this.rng = new SeededRng(seed);
    this.recipe = getBondRecipe(supportId, damageId);
    this.blessings = [];
    this.roomIndex = 0;
    this.startedAt = performance.now();
    this.encounters = this.rng.shuffle(ENCOUNTERS).slice(0, 6);
    this.bossId = this.chooseBoss(save);
    this.eventResolved = false;
    this.stats = { bonds: 0, revives: 0, damageTaken: 0 };
  }

  chooseBoss(save) {
    const clears = save?.clearedRuns || 0;
    if (clears === 0) return "lich";
    if (clears === 1 && !save?.defeatedBosses?.includes("thorn")) return "thorn";
    return this.rng.pick(Object.keys(BOSSES));
  }

  currentEncounter() {
    return this.encounters[this.roomIndex] || null;
  }

  nextEncounter() {
    this.roomIndex += 1;
    return this.currentEncounter();
  }

  drawBlessings(count = 3) {
    const pool = eligibleBlessings(this.recipe.id, this.blessings);
    return this.rng.shuffle(pool).slice(0, count);
  }

  addBlessing(id) {
    if (!this.blessings.includes(id)) this.blessings.push(id);
  }

  hasBlessing(id) {
    return this.blessings.includes(id);
  }

  elapsedSeconds() {
    return Math.floor((performance.now() - this.startedAt) / 1000);
  }
}

export function applyWinUnlocks(saveStore, session) {
  const data = saveStore.data;
  const unlocked = new Set(data.unlockedWizards);
  const defeated = new Set(data.defeatedBosses);
  defeated.add(session.bossId);
  if ((data.clearedRuns || 0) === 0) unlocked.add("verdant");
  if (session.bossId === "thorn") unlocked.add("thunder");
  const clearedRuns = (data.clearedRuns || 0) + 1;
  const progression = progressionUnlocks(clearedRuns);
  const seconds = session.elapsedSeconds();
  const best = data.bestRunSeconds == null ? seconds : Math.min(data.bestRunSeconds, seconds);
  return saveStore.commit({
    clearedRuns,
    defeatedBosses: [...defeated],
    unlockedWizards: [...unlocked],
    unlockedBlessings: [...new Set([...data.unlockedBlessings, ...session.blessings])],
    unlockedSpellVariants: [...new Set([...(data.unlockedSpellVariants || []), ...progression.spellVariants])],
    unlockedBossAffixes: [...new Set([...(data.unlockedBossAffixes || []), ...progression.bossAffixes])],
    unlockedDifficulties: [...new Set([...(data.unlockedDifficulties || []), ...progression.difficulties])],
    unlockedCosmetics: [...new Set([...(data.unlockedCosmetics || []), ...progression.cosmetics])],
    bestRunSeconds: best,
    lastSeed: session.seed
  });
}
