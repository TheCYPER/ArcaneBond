const abilities = {
  star: {
    shot: { name: "星光弹", cooldown: 0.34, kind: "projectile", damage: 12, effect: "star-shot", applies: "starMark" },
    skill1: { name: "星环禁锢", cooldown: 5.2, kind: "controlZone", radius: 25, duration: 3.2 },
    skill2: { name: "守护结界", cooldown: 8, kind: "shieldZone", radius: 29, duration: 5.2 },
    ult: { name: "星穹封锁", cooldown: 14, kind: "supportUltimate", duration: 5 }
  },
  ember: {
    shot: { name: "影焰箭", cooldown: 0.34, kind: "projectile", damage: 16, effect: "ember-shot", triggers: ["starMark", "sprout"] },
    skill1: { name: "裂魂火柱", cooldown: 4.3, kind: "delayedBurst", damage: 27, radius: 22, delay: 0.68 },
    skill2: { name: "破咒烈焰", cooldown: 3.2, kind: "dispelCone", damage: 14, range: 45 },
    ult: { name: "深红审判", cooldown: 14, kind: "damageUltimate", damage: 88 }
  },
  verdant: {
    shot: { name: "孢芽弹", cooldown: 0.38, kind: "projectile", damage: 11, effect: "seed-shot", applies: "sprout" },
    skill1: { name: "藤蔓禁锢", cooldown: 5.6, kind: "controlZone", radius: 27, duration: 3.8 },
    skill2: { name: "治疗林地", cooldown: 8.5, kind: "healingZone", radius: 28, duration: 5.5 },
    ult: { name: "世界根须", cooldown: 14, kind: "supportUltimate", duration: 5 }
  },
  thunder: {
    shot: { name: "连锁电弧", cooldown: 0.4, kind: "projectile", damage: 15, effect: "thunder-shot", triggers: ["starMark", "sprout"], chains: 2 },
    skill1: { name: "延迟落雷", cooldown: 4.5, kind: "delayedBurst", damage: 25, radius: 20, delay: 0.55 },
    skill2: { name: "破盾净雷", cooldown: 3.4, kind: "dispelCone", damage: 13, range: 48 },
    ult: { name: "天穹雷审", cooldown: 14, kind: "damageUltimate", damage: 84 }
  }
};

export const WIZARDS = Object.freeze({
  star: {
    id: "star",
    name: "星辉巫师",
    slot: "support",
    role: "标记 · 控场 · 保护",
    color: "#63d9ff",
    texture: "star",
    hp: 115,
    speed: 62,
    setupTag: "starMark",
    abilities: abilities.star
  },
  ember: {
    id: "ember",
    name: "影焰巫师",
    slot: "damage",
    role: "引爆 · 破盾 · 终结",
    color: "#ff6b3d",
    texture: "ember",
    hp: 100,
    speed: 66,
    triggerTag: "fire",
    abilities: abilities.ember
  },
  verdant: {
    id: "verdant",
    name: "森语巫师",
    slot: "support",
    role: "孢芽 · 藤蔓 · 治疗",
    color: "#74d36f",
    texture: "verdant",
    hp: 110,
    speed: 61,
    setupTag: "sprout",
    abilities: abilities.verdant
  },
  thunder: {
    id: "thunder",
    name: "雷鸣巫师",
    slot: "damage",
    role: "连锁 · 净雷 · 爆发",
    color: "#ffd34e",
    texture: "thunder",
    hp: 98,
    speed: 68,
    triggerTag: "lightning",
    abilities: abilities.thunder
  }
});

export const BOND_RECIPES = Object.freeze({
  "star:ember": {
    id: "supernova",
    name: "超新星",
    setup: "starMark",
    result: "explosion",
    description: "星印被影焰点燃，产生范围爆炸。"
  },
  "star:thunder": {
    id: "constellation",
    name: "星座链",
    setup: "starMark",
    result: "chain",
    description: "雷电沿星印连接附近目标。"
  },
  "verdant:ember": {
    id: "wildfire",
    name: "野火花园",
    setup: "sprout",
    result: "wildfire",
    description: "孢芽燃烧并生长成移动火圈。"
  },
  "verdant:thunder": {
    id: "stormgarden",
    name: "雷暴花园",
    setup: "sprout",
    result: "stormgarden",
    description: "孢芽导电，伤敌并为搭档回复魔力。"
  }
});

export function getBondRecipe(supportId, damageId) {
  return BOND_RECIPES[`${supportId}:${damageId}`];
}
