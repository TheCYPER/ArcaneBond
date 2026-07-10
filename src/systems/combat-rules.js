function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function calculateEnemyDamage(amount, { shielded = false, dispel = false, priestProtected = false } = {}) {
  let damage = Math.max(0, amount);
  if (shielded && !dispel) damage *= 0.24;
  if (priestProtected) damage *= 0.78;
  return damage;
}

export function calculatePlayerDamage(amount, { shieldZone = false, curse = false, healingZone = false } = {}) {
  let damage = Math.max(0, amount);
  if (shieldZone) damage *= 0.42;
  if (curse && healingZone) damage *= 0.35;
  return damage;
}

export function calculateBossDamage(amount, { shielded = false, dispel = false, phase = 1, resonanceOpen = false, combo = false } = {}) {
  let damage = Math.max(0, amount);
  if (shielded && !dispel) damage *= 0.22;
  if (phase === 2 && !resonanceOpen && !combo) damage *= 0.18;
  return damage;
}

export function advanceCurseStatus(remaining, tickTimer, dt) {
  const nextRemaining = Math.max(0, remaining - dt);
  const nextTimer = tickTimer - dt;
  if (nextTimer <= 0) return { remaining: nextRemaining, tickTimer: 1, triggered: true };
  return { remaining: nextRemaining, tickTimer: nextTimer, triggered: false };
}

export function advanceReviveProgress(progress, dt, eligible) {
  return clamp01(progress + (eligible ? dt / 2 : -dt * 0.45));
}

export function shouldEnterBossPhaseTwo({ phase, hp, maxHp, phaseAt }) {
  return phase === 1 && hp <= maxHp * phaseAt;
}
