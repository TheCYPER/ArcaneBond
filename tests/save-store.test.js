import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultSave, normalizeSave, SaveStore } from "../src/systems/save-store.js";

class MemoryStorage {
  constructor(value = null) {
    this.value = value;
  }

  getItem() {
    return this.value;
  }

  setItem(_key, value) {
    this.value = value;
  }
}

test("default save contains no permanent combat stat upgrades", () => {
  const save = createDefaultSave();
  assert.deepEqual(save.unlockedWizards, ["star", "ember"]);
  assert.deepEqual(save.unlockedSpellVariants, ["classic"]);
  assert.deepEqual(save.unlockedBossAffixes, ["none"]);
  assert.deepEqual(save.unlockedDifficulties, ["keeper"]);
  assert.deepEqual(save.unlockedCosmetics, ["classic"]);
  assert.deepEqual(save.loadout, { variantId: "classic", bossAffixId: "none", difficultyId: "keeper", cosmeticId: "classic" });
  assert.equal(save.tutorialCompleted, false);
  assert.equal("damageBonus" in save, false);
  assert.equal("healthBonus" in save, false);
});

test("invalid and old save shapes migrate to a safe v1 value", () => {
  const save = normalizeSave({
    version: 0,
    clearedRuns: 5,
    unlockedWizards: ["verdant", "bad-id"],
    loadout: { variantId: "missing", difficultyId: "abyss", bossAffixId: "ravenous", cosmeticId: "emberglass" },
    settings: { music: false },
    damageBonus: 999
  });
  assert.equal(save.version, 1);
  assert.deepEqual(new Set(save.unlockedWizards), new Set(["star", "ember", "verdant"]));
  assert.deepEqual(new Set(save.unlockedSpellVariants), new Set(["classic", "quickened", "ritual"]));
  assert.equal(save.loadout.variantId, "classic");
  assert.equal(save.loadout.difficultyId, "abyss");
  assert.equal(save.loadout.bossAffixId, "ravenous");
  assert.equal(save.loadout.cosmeticId, "emberglass");
  assert.equal("damageBonus" in save, false);
  assert.equal(save.settings.music, false);
  assert.equal(save.settings.sfx, true);
});

test("corrupted storage falls back without throwing", () => {
  const store = new SaveStore(new MemoryStorage("{bad json"), { warn() {} });
  assert.deepEqual(store.data.unlockedWizards, ["star", "ember"]);
  store.unlockWizard("verdant");
  assert.ok(store.data.unlockedWizards.includes("verdant"));
});
