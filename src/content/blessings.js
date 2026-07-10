export const BLESSINGS = Object.freeze([
  { id: "crossfire", name: "交叉弹道", group: "universal", description: "两人的普通攻击在一秒内命中同一目标，会生成追踪共鸣弹。", hook: "sameTarget" },
  { id: "revive-glow", name: "救援余辉", group: "universal", description: "唤醒同伴时释放击退冲击波，并短暂无敌。", hook: "revive" },
  { id: "bond-thread", name: "牵绊之线", group: "universal", description: "两人之间形成伤害敌人的魔力丝线。", hook: "tether" },
  { id: "alternating", name: "轮转施法", group: "universal", description: "两人交替施法时，会缩短搭档当前最长冷却。", hook: "alternate" },
  { id: "second-wake", name: "双生回声", group: "universal", description: "每个房间第一次两人同时倒地时，自动恢复少量魔力。", hook: "secondWake" },
  { id: "shared-ward", name: "共享结界", group: "universal", description: "辅助法阵内的输出法术获得穿透。", hook: "sharedWard" },
  { id: "echo-cast", name: "第五咏唱", group: "universal", description: "连续交替施放五次技能后，重复最后一次普通攻击。", hook: "echoCast" },
  { id: "rift-compass", name: "裂隙罗盘", group: "universal", description: "精英怪出现前显示方向，并掉落一次治疗脉冲。", hook: "compass" },

  { id: "mark-spread", name: "星印传染", group: "supernova", description: "超新星爆炸会把星印传给附近两个敌人。", hook: "markSpread" },
  { id: "pillar-pull", name: "火柱牵引", group: "supernova", description: "火柱升起前会把带星印的敌人拉向中心。", hook: "pillarPull" },
  { id: "shield-furnace", name: "护盾熔炉", group: "supernova", description: "影焰穿过守护结界时变宽并留下余火。", hook: "shieldFurnace" },
  { id: "ring-resonance", name: "环火共振", group: "supernova", description: "火柱在星环中爆发时会追加一次较小脉冲。", hook: "ringResonance" },

  { id: "constellation-chain", name: "星座跃迁", group: "constellation", description: "星座链会优先跳向另一个带星印的敌人。", hook: "constellationChain" },
  { id: "orbit-spark", name: "环轨电花", group: "constellation", description: "星环边缘周期性释放向内的电弧。", hook: "orbitSpark" },
  { id: "prism-storm", name: "棱镜雷暴", group: "constellation", description: "雷电穿过护盾后分裂成三道短弧。", hook: "prismStorm" },
  { id: "star-conductor", name: "群星导体", group: "constellation", description: "被星穹封锁的敌人会互相传递雷击。", hook: "starConductor" },

  { id: "wildfire", name: "奔跑野火", group: "wildfire", description: "燃烧藤蔓会缓慢追逐最近的敌人。", hook: "wildfire" },
  { id: "ember-seeds", name: "余烬种子", group: "wildfire", description: "影焰击败敌人时会在原地种下孢芽。", hook: "emberSeeds" },
  { id: "ash-bloom", name: "灰烬开花", group: "wildfire", description: "野火结束时生成一次小型治疗林地。", hook: "ashBloom" },
  { id: "hearth-grove", name: "炉心林地", group: "wildfire", description: "影焰站在治疗林地中时，普通攻击会点燃两侧目标。", hook: "hearthGrove" },

  { id: "storm-garden", name: "雷暴花园", group: "stormgarden", description: "孢芽导电后留下持续落雷区域。", hook: "stormGarden" },
  { id: "charged-roots", name: "带电根须", group: "stormgarden", description: "藤蔓禁锢会把雷击传给区域内所有敌人。", hook: "chargedRoots" },
  { id: "rain-heal", name: "雨后回春", group: "stormgarden", description: "连锁电弧每跳跃三次，为两人恢复少量魔力。", hook: "rainHeal" },
  { id: "thunder-bloom", name: "惊雷开花", group: "stormgarden", description: "延迟落雷会立刻催熟范围内所有孢芽。", hook: "thunderBloom" }
]);

export function eligibleBlessings(recipeId, owned = []) {
  const ownedSet = new Set(owned);
  return BLESSINGS.filter(
    (blessing) => !ownedSet.has(blessing.id) && (blessing.group === "universal" || blessing.group === recipeId)
  );
}
