import test from "node:test";
import assert from "node:assert/strict";

import {
  BOSS_AFFIXES,
  COSMETICS,
  DIFFICULTIES,
  progressionUnlocks,
  SPELL_VARIANTS
} from "../src/content/progression.js";

test("horizontal progression unlocks choices at clear milestones", () => {
  assert.deepEqual(progressionUnlocks(0), {
    spellVariants: ["classic"],
    bossAffixes: ["none"],
    difficulties: ["keeper"],
    cosmetics: ["classic"]
  });
  const complete = progressionUnlocks(5);
  assert.deepEqual(complete.spellVariants, ["classic", "quickened", "ritual"]);
  assert.deepEqual(complete.bossAffixes, ["none", "echoing", "ravenous"]);
  assert.deepEqual(complete.difficulties, ["keeper", "deep", "abyss"]);
  assert.deepEqual(complete.cosmetics, ["classic", "moonlit", "emberglass"]);
});

test("spell variants are explicit tradeoffs rather than permanent upgrades", () => {
  assert.ok(SPELL_VARIANTS.quickened.shotCooldown < 1);
  assert.ok(SPELL_VARIANTS.quickened.projectileDamage < 1);
  assert.ok(SPELL_VARIANTS.ritual.shotCooldown > 1);
  assert.ok(SPELL_VARIANTS.ritual.projectileDamage > 1);
  for (const variant of Object.values(SPELL_VARIANTS)) {
    assert.equal("playerHp" in variant, false);
    assert.equal("permanentDamage" in variant, false);
  }
});

test("difficulty, Boss affixes, and cosmetics affect separate rule surfaces", () => {
  assert.ok(DIFFICULTIES.deep.enemyHp > DIFFICULTIES.keeper.enemyHp);
  assert.ok(DIFFICULTIES.abyss.bossDamage > DIFFICULTIES.deep.bossDamage);
  assert.equal(BOSS_AFFIXES.echoing.repeatPatterns, true);
  assert.equal(BOSS_AFFIXES.ravenous.extraAdds, 1);
  assert.equal(COSMETICS.moonlit.tint, 0xb9d8ff);
  assert.equal("damage" in COSMETICS.emberglass, false);
});
