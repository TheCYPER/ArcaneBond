export const SPELL_VARIANTS = Object.freeze({
  classic: {
    id: "classic",
    name: "原典笔法",
    description: "标准弹速、威力与施法节奏。",
    shotCooldown: 1,
    projectileDamage: 1,
    projectileSpeed: 1
  },
  quickened: {
    id: "quickened",
    name: "疾书式",
    description: "普通攻击更快，但单发威力较低。",
    shotCooldown: 0.78,
    projectileDamage: 0.82,
    projectileSpeed: 1.1
  },
  ritual: {
    id: "ritual",
    name: "重墨式",
    description: "普通攻击更慢，但弹体更重。",
    shotCooldown: 1.24,
    projectileDamage: 1.34,
    projectileSpeed: 0.9
  }
});

export const BOSS_AFFIXES = Object.freeze({
  none: {
    id: "none",
    name: "无词缀",
    description: "Boss 使用原始法则。",
    repeatPatterns: false,
    riftRate: 1,
    extraAdds: 0
  },
  echoing: {
    id: "echoing",
    name: "回声",
    description: "Boss 的攻击会在预警后以较低威力重演。",
    repeatPatterns: true,
    riftRate: 1,
    extraAdds: 0
  },
  ravenous: {
    id: "ravenous",
    name: "饥渴",
    description: "裂隙能量增长更快，Boss 额外召唤一只随从。",
    repeatPatterns: false,
    riftRate: 1.3,
    extraAdds: 1
  }
});

export const DIFFICULTIES = Object.freeze({
  keeper: {
    id: "keeper",
    name: "守页人",
    description: "推荐的双人冒险强度。",
    enemyHp: 1,
    enemySpeed: 1,
    enemyDamage: 1,
    bossHp: 1,
    bossDamage: 1,
    riftRate: 1
  },
  deep: {
    id: "deep",
    name: "深层裂隙",
    description: "敌人与 Boss 更强，合作窗口更紧。",
    enemyHp: 1.12,
    enemySpeed: 1.08,
    enemyDamage: 1.12,
    bossHp: 1.1,
    bossDamage: 1.1,
    riftRate: 1.1
  },
  abyss: {
    id: "abyss",
    name: "无光页",
    description: "为熟练搭档准备的高压规则。",
    enemyHp: 1.26,
    enemySpeed: 1.15,
    enemyDamage: 1.22,
    bossHp: 1.2,
    bossDamage: 1.2,
    riftRate: 1.22
  }
});

export const COSMETICS = Object.freeze({
  classic: { id: "classic", name: "原色法袍", description: "四位巫师的原始色板。", tint: 0xffffff },
  moonlit: { id: "moonlit", name: "月辉法袍", description: "冷色月光覆盖角色与残影。", tint: 0xb9d8ff },
  emberglass: { id: "emberglass", name: "琥珀法袍", description: "温暖琥珀覆盖角色与残影。", tint: 0xffc58a }
});

export const DEFAULT_LOADOUT = Object.freeze({
  variantId: "classic",
  bossAffixId: "none",
  difficultyId: "keeper",
  cosmeticId: "classic"
});

export function progressionUnlocks(clearedRuns) {
  const unlocks = {
    spellVariants: ["classic"],
    bossAffixes: ["none"],
    difficulties: ["keeper"],
    cosmetics: ["classic"]
  };
  if (clearedRuns >= 2) {
    unlocks.spellVariants.push("quickened");
    unlocks.cosmetics.push("moonlit");
  }
  if (clearedRuns >= 3) {
    unlocks.bossAffixes.push("echoing");
    unlocks.difficulties.push("deep");
  }
  if (clearedRuns >= 4) {
    unlocks.spellVariants.push("ritual");
    unlocks.cosmetics.push("emberglass");
  }
  if (clearedRuns >= 5) {
    unlocks.bossAffixes.push("ravenous");
    unlocks.difficulties.push("abyss");
  }
  return unlocks;
}

export function describeUnlocks(before, after) {
  const groups = [
    ["unlockedSpellVariants", SPELL_VARIANTS],
    ["unlockedBossAffixes", BOSS_AFFIXES],
    ["unlockedDifficulties", DIFFICULTIES],
    ["unlockedCosmetics", COSMETICS]
  ];
  const names = [];
  for (const [key, definitions] of groups) {
    const previous = new Set(before[key] || []);
    for (const id of after[key] || []) {
      if (!previous.has(id) && definitions[id]) names.push(definitions[id].name);
    }
  }
  return names;
}
