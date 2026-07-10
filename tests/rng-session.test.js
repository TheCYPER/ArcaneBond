import test from "node:test";
import assert from "node:assert/strict";

import { SeededRng, hashSeed } from "../src/systems/rng.js";
import { applyWinUnlocks, RunSession } from "../src/systems/session.js";

const save = {
  clearedRuns: 3,
  defeatedBosses: ["lich", "thorn"],
  unlockedWizards: ["star", "ember", "verdant", "thunder"]
};

test("seed hashing and random sequence are deterministic", () => {
  assert.equal(hashSeed("MOON-42"), hashSeed("MOON-42"));
  const first = new SeededRng("MOON-42");
  const second = new SeededRng("MOON-42");
  assert.deepEqual(
    Array.from({ length: 8 }, () => first.next()),
    Array.from({ length: 8 }, () => second.next())
  );
});

test("same run seed reproduces encounters, boss, and blessing draft", () => {
  const first = new RunSession({ supportId: "verdant", damageId: "thunder", seed: "BOND-2026", save });
  const second = new RunSession({ supportId: "verdant", damageId: "thunder", seed: "BOND-2026", save });
  assert.deepEqual(first.encounters.map((item) => item.id), second.encounters.map((item) => item.id));
  assert.equal(first.bossId, second.bossId);
  assert.deepEqual(first.drawBlessings().map((item) => item.id), second.drawBlessings().map((item) => item.id));
});

test("fresh saves meet the intended first and second boss sequence", () => {
  const first = new RunSession({ seed: "FIRST", save: { clearedRuns: 0, defeatedBosses: [] } });
  const second = new RunSession({ seed: "SECOND", save: { clearedRuns: 1, defeatedBosses: ["lich"] } });
  assert.equal(first.bossId, "lich");
  assert.equal(second.bossId, "thorn");
});

test("wins unlock wizards horizontally without combat stat growth", () => {
  const store = {
    data: {
      clearedRuns: 0,
      defeatedBosses: [],
      unlockedWizards: ["star", "ember"],
      unlockedBlessings: [],
      unlockedSpellVariants: ["classic"],
      unlockedBossAffixes: ["none"],
      unlockedDifficulties: ["keeper"],
      unlockedCosmetics: ["classic"],
      bestRunSeconds: null
    },
    commit(patch) {
      this.data = { ...this.data, ...patch };
      return this.data;
    }
  };
  const session = new RunSession({ supportId: "star", damageId: "ember", seed: "UNLOCK", save: store.data });
  session.elapsedSeconds = () => 500;
  session.bossId = "thorn";
  applyWinUnlocks(store, session);
  assert.ok(store.data.unlockedWizards.includes("verdant"));
  assert.ok(store.data.unlockedWizards.includes("thunder"));
  session.bossId = "lich";
  applyWinUnlocks(store, session);
  assert.ok(store.data.unlockedSpellVariants.includes("quickened"));
  assert.ok(store.data.unlockedCosmetics.includes("moonlit"));
  assert.equal("damageBonus" in store.data, false);
});
