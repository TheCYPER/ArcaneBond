export const BOSSES = Object.freeze({
  lich: {
    id: "lich",
    name: "裂隙大巫妖",
    texture: "lich",
    hp: 650,
    phaseAt: 0.52,
    color: "#b46cff",
    intro: "两枚小小的灵魂，也想合上我的裂隙？",
    defeat: "水晶熄灭了，图书馆重新听见了自己的钟声。",
    pattern: "rift"
  },
  thorn: {
    id: "thorn",
    name: "荆棘母树",
    texture: "thorn",
    hp: 720,
    phaseAt: 0.55,
    color: "#74d36f",
    intro: "每一道根须，都记得裂隙许下的坏愿望。",
    defeat: "焦黑的枝条间，一枚干净的新芽探出了头。",
    pattern: "roots"
  },
  mirrorboss: {
    id: "mirrorboss",
    name: "镜月巨像",
    texture: "mirrorboss",
    hp: 700,
    phaseAt: 0.5,
    color: "#63d9ff",
    intro: "镜子不会创造力量，只会问你们是否真的一起。",
    defeat: "月镜碎成两半，却映出了同一束光。",
    pattern: "mirror"
  }
});
