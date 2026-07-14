export const TRAINING_MODES = Object.freeze({
  spawn: Object.freeze({
    id: "spawn",
    name: "随机生成",
    targetTexture: "training-straw",
    objective: "一击换位"
  }),
  moving: Object.freeze({
    id: "moving",
    name: "随机移动",
    targetTexture: "training-target",
    objective: "追踪移动靶"
  })
});

export function trainingMode(id) {
  return TRAINING_MODES[id] || TRAINING_MODES.spawn;
}

export function createTrainingStats() {
  return { shots: 0, hits: 0, streak: 0, bestStreak: 0, cheers: 0 };
}

export function recordTrainingAttempt(stats, hit, milestoneEvery = 3) {
  const streak = hit ? stats.streak + 1 : 0;
  const milestone = hit && streak > 0 && streak % milestoneEvery === 0;
  return {
    stats: {
      shots: stats.shots + 1,
      hits: stats.hits + (hit ? 1 : 0),
      streak,
      bestStreak: Math.max(stats.bestStreak, streak),
      cheers: stats.cheers + (milestone ? 1 : 0)
    },
    milestone
  };
}

export function trainingProjectileFromOverlap(first, second) {
  if (first?.getData?.("shot")) return first;
  if (second?.getData?.("shot")) return second;
  return null;
}

export function pickTrainingSpawn(rng, bounds, avoidPoints = [], options = {}) {
  const padding = options.padding ?? 12;
  const minDistance = options.minDistance ?? 34;
  const attempts = options.attempts ?? 24;
  const left = bounds.left + padding;
  const right = bounds.right - padding;
  const top = bounds.top + padding;
  const bottom = bounds.bottom - padding;
  let candidate = { x: (left + right) / 2, y: (top + bottom) / 2 };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    candidate = {
      x: left + rng.next() * (right - left),
      y: top + rng.next() * (bottom - top)
    };
    const clear = avoidPoints.every((point) => Math.hypot(candidate.x - point.x, candidate.y - point.y) >= minDistance);
    if (clear) return candidate;
  }
  return candidate;
}

const MOVING_DIRECTIONS = Object.freeze([
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: -0.707, y: -0.707 }),
  Object.freeze({ x: 0.707, y: -0.707 }),
  Object.freeze({ x: -0.707, y: 0.707 }),
  Object.freeze({ x: 0.707, y: 0.707 })
]);

export function pickTrainingVelocity(rng, minSpeed = 27, maxSpeed = 45) {
  const direction = MOVING_DIRECTIONS[Math.floor(rng.next() * MOVING_DIRECTIONS.length)];
  const speed = minSpeed + rng.next() * (maxSpeed - minSpeed);
  return { x: direction.x * speed, y: direction.y * speed };
}
