import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { BLESSINGS, eligibleBlessings } from "../src/content/blessings.js";
import { BOSSES } from "../src/content/bosses.js";
import { calculateEncounterThreat, ENCOUNTERS } from "../src/content/encounters.js";
import { ENEMIES } from "../src/content/enemies.js";
import { BOND_RECIPES, getBondRecipe, WIZARDS } from "../src/content/wizards.js";

test("all planned content registries are present", () => {
  assert.equal(Object.keys(WIZARDS).length, 4);
  assert.equal(Object.keys(ENEMIES).length, 8);
  assert.equal(Object.keys(BOSSES).length, 3);
  assert.equal(ENCOUNTERS.length, 12);
  assert.equal(BLESSINGS.length, 24);
  assert.equal(Object.keys(BOND_RECIPES).length, 4);
});

test("every wizard pair resolves to a distinct bond recipe", () => {
  const ids = [
    getBondRecipe("star", "ember").id,
    getBondRecipe("star", "thunder").id,
    getBondRecipe("verdant", "ember").id,
    getBondRecipe("verdant", "thunder").id
  ];
  assert.equal(new Set(ids).size, 4);
});

test("blessing drafts contain universal and pair-specific rules only", () => {
  const pool = eligibleBlessings("stormgarden", ["crossfire"]);
  assert.ok(pool.length > 3);
  assert.ok(pool.every((item) => item.group === "universal" || item.group === "stormgarden"));
  assert.ok(!pool.some((item) => item.id === "crossfire"));
});

test("encounter threat can be recomputed from enemy definitions", () => {
  for (const encounter of ENCOUNTERS) {
    const threat = calculateEncounterThreat(encounter, ENEMIES);
    assert.ok(threat > 0, encounter.id);
    assert.ok(Object.keys(encounter.spawns).every((id) => ENEMIES[id]), encounter.id);
  }
});

test("every blessing has a runtime hook in the combat scene", async () => {
  const source = await readFile(new URL("../src/scenes/RunScene.js", import.meta.url), "utf8");
  for (const blessing of BLESSINGS) {
    assert.ok(source.includes(`\"${blessing.id}\"`), `missing runtime behavior for ${blessing.id}`);
  }
});
