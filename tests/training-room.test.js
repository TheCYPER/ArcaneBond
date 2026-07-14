import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ARENA } from "../src/constants.js";
import { SeededRng } from "../src/systems/rng.js";
import {
  createTrainingStats,
  pickTrainingSpawn,
  pickTrainingVelocity,
  recordTrainingAttempt,
  trainingMode,
  trainingProjectileFromOverlap
} from "../src/systems/training-rules.js";

test("training modes fall back to random spawn safely", () => {
  assert.equal(trainingMode("spawn").targetTexture, "training-straw");
  assert.equal(trainingMode("moving").targetTexture, "training-target");
  assert.equal(trainingMode("unknown").id, "spawn");
});

test("three consecutive hits trigger encouragement and a miss resets the chain", () => {
  let stats = createTrainingStats();
  let result;
  for (let index = 0; index < 3; index += 1) {
    result = recordTrainingAttempt(stats, true);
    stats = result.stats;
  }
  assert.equal(result.milestone, true);
  assert.deepEqual(stats, { shots: 3, hits: 3, streak: 3, bestStreak: 3, cheers: 1 });

  result = recordTrainingAttempt(stats, false);
  assert.equal(result.milestone, false);
  assert.equal(result.stats.streak, 0);
  assert.equal(result.stats.bestStreak, 3);
  assert.equal(result.stats.hits, 3);
});

test("overlap callbacks find the projectile regardless of Phaser object order", () => {
  const target = { getData: () => undefined };
  const projectile = { getData: (key) => key === "shot" ? { resolved: false } : undefined };
  assert.equal(trainingProjectileFromOverlap(projectile, target), projectile);
  assert.equal(trainingProjectileFromOverlap(target, projectile), projectile);
  assert.equal(trainingProjectileFromOverlap(target, target), null);
});

test("training spawns are seeded, inside the arena, and clear of players", () => {
  const avoid = [{ x: 112, y: 143 }, { x: 208, y: 143 }];
  const first = pickTrainingSpawn(new SeededRng("PRACTICE"), ARENA, avoid, { padding: 17, minDistance: 42 });
  const replay = pickTrainingSpawn(new SeededRng("PRACTICE"), ARENA, avoid, { padding: 17, minDistance: 42 });
  assert.deepEqual(first, replay);
  assert.ok(first.x >= ARENA.left + 17 && first.x <= ARENA.right - 17);
  assert.ok(first.y >= ARENA.top + 17 && first.y <= ARENA.bottom - 17);
  assert.ok(avoid.every((point) => Math.hypot(first.x - point.x, first.y - point.y) >= 42));
});

test("moving targets always receive a bounded non-zero velocity", () => {
  const rng = new SeededRng("MOVING-TARGET");
  for (let index = 0; index < 32; index += 1) {
    const velocity = pickTrainingVelocity(rng);
    const speed = Math.hypot(velocity.x, velocity.y);
    assert.ok(speed >= 26.9 && speed <= 45.1);
  }
});

test("training scene stays outside run progression and ships local assets", async () => {
  const scene = await readFile(new URL("../src/scenes/TrainingScene.js", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const straw = await readFile(new URL("../assets/training/straw-dummy.png", import.meta.url));
  const target = await readFile(new URL("../assets/training/moving-target.png", import.meta.url));
  const cheer = await readFile(new URL("../assets/audio/sfx/training-cheer.wav", import.meta.url));

  assert.ok(main.includes("TrainingSelectScene"));
  assert.ok(main.includes("TrainingScene"));
  assert.ok(!scene.includes("saveStore.commit"));
  assert.equal(straw.readUInt32BE(16), 48);
  assert.equal(straw.readUInt32BE(20), 24);
  assert.equal(target.readUInt32BE(16), 48);
  assert.equal(target.readUInt32BE(20), 24);
  assert.equal(cheer.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(cheer.subarray(8, 12).toString("ascii"), "WAVE");
});
