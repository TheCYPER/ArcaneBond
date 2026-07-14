import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ENEMY_FRAME_LAYOUT, ENEMY_SHEET, ENEMY_SPRITE_IDS } from "../src/content/enemy-animations.js";
import { decodeRgbaPng, rgbaAt } from "./png-test-helpers.js";

test("small-enemy animation metadata keeps six editable frames", () => {
  assert.equal(ENEMY_SPRITE_IDS.length, 8);
  assert.deepEqual(ENEMY_FRAME_LAYOUT.idle, [0, 1]);
  assert.deepEqual(ENEMY_FRAME_LAYOUT.walk, [1, 2, 3, 2]);
  assert.deepEqual(ENEMY_FRAME_LAYOUT.cast, [4, 0]);
  assert.deepEqual(ENEMY_FRAME_LAYOUT.down, [5]);
  assert.deepEqual(ENEMY_SHEET, {
    frameWidth: 20,
    frameHeight: 20,
    frameCount: 6,
    spacing: 1,
    width: 125,
    height: 20
  });
});

test("every small-enemy sheet has opaque black one-pixel frame guides", async () => {
  for (const enemy of ENEMY_SPRITE_IDS) {
    const buffer = await readFile(new URL(`../assets/sprites/${enemy}.png`, import.meta.url));
    const sheet = decodeRgbaPng(buffer);
    assert.equal(sheet.width, ENEMY_SHEET.width, `${enemy} width`);
    assert.equal(sheet.height, ENEMY_SHEET.height, `${enemy} height`);
    for (let separator = 0; separator < ENEMY_SHEET.frameCount - 1; separator += 1) {
      const x = ENEMY_SHEET.frameWidth + separator * (ENEMY_SHEET.frameWidth + ENEMY_SHEET.spacing);
      for (let y = 0; y < ENEMY_SHEET.frameHeight; y += 1) {
        assert.deepEqual(rgbaAt(sheet, x, y), [0, 0, 0, 255], `${enemy} guide at ${x},${y}`);
      }
    }
  }
});
