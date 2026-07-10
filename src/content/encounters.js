export const ENCOUNTERS = Object.freeze([
  { id: "imp-circle", title: "紫影围炉", threat: 7, spawns: { imp: 7 } },
  { id: "wolf-cross", title: "影爪交叉", threat: 8, spawns: { imp: 4, wolf: 2 } },
  { id: "black-shields", title: "黑盾列阵", threat: 9, spawns: { guard: 2, imp: 3 } },
  { id: "curse-choir", title: "幽魂低唱", threat: 9, spawns: { ghost: 2, imp: 3, wolf: 1 } },
  { id: "arrow-rain", title: "裂弓雨", threat: 10, spawns: { archer: 3, imp: 4 } },
  { id: "lantern-watch", title: "提灯守夜", threat: 11, spawns: { priest: 1, guard: 1, imp: 5 } },
  { id: "mirror-hall", title: "错位镜厅", threat: 11, spawns: { mirror: 2, archer: 2 } },
  { id: "spore-bed", title: "孢子温床", threat: 10, spawns: { spore: 4, wolf: 2 } },
  { id: "hunted", title: "被影子盯上", threat: 12, spawns: { wolf: 4, ghost: 2 } },
  { id: "ritual", title: "裂隙仪式", threat: 13, spawns: { priest: 1, ghost: 2, archer: 2, imp: 2 } },
  { id: "stone-garden", title: "石甲花园", threat: 14, spawns: { guard: 2, spore: 3, mirror: 1 } },
  { id: "midnight-all", title: "午夜群像", threat: 15, spawns: { imp: 3, wolf: 1, guard: 1, ghost: 1, archer: 1, spore: 1 } }
]);

export function calculateEncounterThreat(encounter, enemyRegistry) {
  return Object.entries(encounter.spawns).reduce(
    (total, [id, count]) => total + (enemyRegistry[id]?.threat || 0) * count,
    0
  );
}
