export const ENEMY_SPRITE_IDS = Object.freeze([
  "imp",
  "wolf",
  "guard",
  "ghost",
  "archer",
  "priest",
  "mirror",
  "spore"
]);

export const ENEMY_SHEET = Object.freeze({
  frameWidth: 20,
  frameHeight: 20,
  frameCount: 6,
  spacing: 1,
  width: 125,
  height: 20
});

export const ENEMY_FRAME_LAYOUT = Object.freeze({
  idle: Object.freeze([0, 1]),
  walk: Object.freeze([1, 2, 3, 2]),
  cast: Object.freeze([4, 0]),
  hurt: Object.freeze([4, 0]),
  down: Object.freeze([5])
});
