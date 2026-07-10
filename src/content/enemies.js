export const ENEMIES = Object.freeze({
  imp: { id: "imp", name: "腐化小魔", texture: "imp", hp: 38, speed: 29, radius: 6, damage: 7, ai: "chaser", threat: 1 },
  wolf: { id: "wolf", name: "影爪兽", texture: "wolf", hp: 48, speed: 44, radius: 7, damage: 9, ai: "hunter", threat: 2 },
  guard: { id: "guard", name: "咒甲守卫", texture: "guard", hp: 112, speed: 20, radius: 8, damage: 12, ai: "chaser", shielded: true, threat: 3 },
  ghost: { id: "ghost", name: "噬魔幽魂", texture: "ghost", hp: 62, speed: 24, radius: 7, damage: 5, ai: "curser", threat: 2 },
  archer: { id: "archer", name: "裂隙射手", texture: "archer", hp: 54, speed: 22, radius: 7, damage: 10, ai: "archer", threat: 2 },
  priest: { id: "priest", name: "提灯祭司", texture: "priest", hp: 70, speed: 18, radius: 7, damage: 5, ai: "priest", threat: 3 },
  mirror: { id: "mirror", name: "镜壳兽", texture: "mirror", hp: 96, speed: 25, radius: 8, damage: 10, ai: "mirror", frontalGuard: true, threat: 3 },
  spore: { id: "spore", name: "地穴孢子", texture: "spore", hp: 44, speed: 16, radius: 7, damage: 8, ai: "spore", threat: 2 }
});
