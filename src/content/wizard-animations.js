export const WIZARD_DIRECTIONS = Object.freeze(["up", "down", "left", "right"]);

export const WIZARD_FRAME_LAYOUT = Object.freeze({
  up: Object.freeze({ idle: 0, walk: Object.freeze([0, 1]), cast: Object.freeze([8, 9]) }),
  down: Object.freeze({ idle: 2, walk: Object.freeze([2, 3]), cast: Object.freeze([10, 11]) }),
  left: Object.freeze({ idle: 4, walk: Object.freeze([4, 5]), cast: Object.freeze([12, 13]) }),
  right: Object.freeze({ idle: 6, walk: Object.freeze([6, 7]), cast: Object.freeze([14, 15]) })
});

export const WIZARD_DOWN_FRAME = 16;

export const WIZARD_SHEET = Object.freeze({
  frameWidth: 16,
  frameHeight: 16,
  spacing: 1,
  frameCount: 17,
  width: 288,
  height: 16
});

