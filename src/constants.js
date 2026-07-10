export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;
export const ARENA = Object.freeze({ left: 10, right: 310, top: 30, bottom: 170 });
export const MAX_PAIR_DISTANCE = 146;

export const SLOT_CONTROLS = Object.freeze({
  support: {
    up: "W",
    down: "S",
    left: "A",
    right: "D",
    shot: "F",
    skill1: "G",
    skill2: "H",
    ult: "T",
    interact: "E"
  },
  damage: {
    up: "UP",
    down: "DOWN",
    left: "LEFT",
    right: "RIGHT",
    shot: "J",
    skill1: "K",
    skill2: "L",
    ult: "O",
    interact: "P"
  }
});

export const PALETTE = Object.freeze({
  ink: 0x100d18,
  void: 0x25163a,
  bone: 0xf2e6c9,
  star: 0x63d9ff,
  ember: 0xff6b3d,
  verdant: 0x74d36f,
  thunder: 0xffd34e,
  curse: 0xb46cff,
  danger: 0xff4f70
});

export const SAVE_KEY = "arcaneBond.save.v1";
export const SAVE_VERSION = 1;
