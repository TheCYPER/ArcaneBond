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

export function resolveRadialBarrier(entity, barrier) {
  const dx = entity.x - barrier.x;
  const dy = entity.y - barrier.y;
  const gap = Math.hypot(dx, dy);
  if (gap > barrier.radius) return { ...entity, blocked: false };

  const velocityLength = Math.hypot(entity.velocityX, entity.velocityY);
  const normalX = gap > 0 ? dx / gap : velocityLength > 0 ? -entity.velocityX / velocityLength : 1;
  const normalY = gap > 0 ? dy / gap : velocityLength > 0 ? -entity.velocityY / velocityLength : 0;
  const inwardSpeed = entity.velocityX * normalX + entity.velocityY * normalY;
  return {
    x: barrier.x + normalX * barrier.radius,
    y: barrier.y + normalY * barrier.radius,
    velocityX: inwardSpeed < 0 ? entity.velocityX - normalX * inwardSpeed : entity.velocityX,
    velocityY: inwardSpeed < 0 ? entity.velocityY - normalY * inwardSpeed : entity.velocityY,
    blocked: true
  };
}

export function shouldEnterBossPhaseTwo({ phase, hp, maxHp, phaseAt }) {
  return phase === 1 && hp <= maxHp * phaseAt;
}
