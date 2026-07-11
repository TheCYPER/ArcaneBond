import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceCurseStatus,
  advanceReviveProgress,
  calculateBossDamage,
  calculateEnemyDamage,
  calculatePlayerDamage,
  resolveRadialBarrier,
  shouldEnterBossPhaseTwo
} from "../src/systems/combat-rules.js";

test("enemy shields, dispels, and priest protection compose predictably", () => {
  assert.equal(calculateEnemyDamage(100, { shielded: true }), 24);
  assert.equal(calculateEnemyDamage(100, { shielded: true, dispel: true }), 100);
  assert.equal(calculateEnemyDamage(100, { priestProtected: true }), 78);
  assert.equal(calculateEnemyDamage(100, { shielded: true, priestProtected: true }), 18.72);
});

test("player protection reduces direct and curse damage without permanent stats", () => {
  assert.equal(calculatePlayerDamage(20), 20);
  assert.equal(calculatePlayerDamage(20, { shieldZone: true }), 8.4);
  assert.equal(calculatePlayerDamage(20, { curse: true, healingZone: true }), 7);
  assert.equal(calculatePlayerDamage(20, { shieldZone: true, curse: true, healingZone: true }), 2.94);
});

test("curse ticks once when its timer expires and keeps a bounded duration", () => {
  const waiting = advanceCurseStatus(6, 0.7, 0.1);
  assert.deepEqual(waiting, { remaining: 5.9, tickTimer: 0.6, triggered: false });

  const tick = advanceCurseStatus(0.02, 0.02, 0.033);
  assert.deepEqual(tick, { remaining: 0, tickTimer: 1, triggered: true });
});

test("rescue requires two seconds of continuous eligibility and decays when released", () => {
  let progress = 0;
  for (let frame = 0; frame < 120; frame += 1) progress = advanceReviveProgress(progress, 1 / 60, true);
  assert.ok(progress > 0.999999);
  assert.equal(advanceReviveProgress(0.5, 1, false), 0.04999999999999999);
  assert.equal(advanceReviveProgress(0.1, 1, false), 0);
});

test("guardian barriers push intruders out and remove inward velocity", () => {
  const blocked = resolveRadialBarrier(
    { x: 5, y: 0, velocityX: -4, velocityY: 3 },
    { x: 0, y: 0, radius: 10 }
  );
  assert.deepEqual(blocked, { x: 10, y: 0, velocityX: 0, velocityY: 3, blocked: true });

  const outside = resolveRadialBarrier(
    { x: 12, y: 0, velocityX: -4, velocityY: 0 },
    { x: 0, y: 0, radius: 10 }
  );
  assert.deepEqual(outside, { x: 12, y: 0, velocityX: -4, velocityY: 0, blocked: false });
});

test("Boss phase two resists ordinary damage and accepts a resonance finisher", () => {
  assert.equal(shouldEnterBossPhaseTwo({ phase: 1, hp: 350, maxHp: 700, phaseAt: 0.5 }), true);
  assert.equal(shouldEnterBossPhaseTwo({ phase: 2, hp: 100, maxHp: 700, phaseAt: 0.5 }), false);
  assert.equal(calculateBossDamage(100, { phase: 2 }), 18);
  assert.equal(calculateBossDamage(100, { phase: 2, resonanceOpen: true }), 100);
  assert.equal(calculateBossDamage(100, { phase: 2, combo: true }), 100);
  assert.equal(calculateBossDamage(100, { shielded: true }), 22);
  assert.equal(calculateBossDamage(100, { shielded: true, dispel: true }), 100);
});
