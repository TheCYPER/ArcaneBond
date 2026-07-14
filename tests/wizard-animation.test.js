import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  WIZARD_DIRECTIONS,
  WIZARD_DOWN_FRAME,
  WIZARD_FRAME_LAYOUT,
  WIZARD_SHEET
} from "../src/content/wizard-animations.js";
import { cardinalDirection } from "../src/systems/direction.js";
import { decodeRgbaPng, rgbaAt } from "./png-test-helpers.js";

const WIZARDS = ["star", "ember", "verdant", "thunder"];

test("cardinal animation direction follows the dominant movement axis", () => {
  assert.equal(cardinalDirection({ x: 0, y: -1 }), "up");
  assert.equal(cardinalDirection({ x: 0, y: 1 }), "down");
  assert.equal(cardinalDirection({ x: -1, y: 0 }), "left");
  assert.equal(cardinalDirection({ x: 1, y: 0 }), "right");
  assert.equal(cardinalDirection({ x: 0.9, y: 0.2 }), "right");
  assert.equal(cardinalDirection({ x: 0, y: 0 }, "left"), "left");
});

test("wizard animation registry covers sixteen directional frames plus downed", () => {
  assert.deepEqual(WIZARD_DIRECTIONS, ["up", "down", "left", "right"]);
  const used = [];
  for (const direction of WIZARD_DIRECTIONS) {
    const layout = WIZARD_FRAME_LAYOUT[direction];
    assert.equal(layout.walk.length, 2);
    assert.equal(layout.cast.length, 2);
    used.push(...layout.walk, ...layout.cast);
  }
  assert.deepEqual([...new Set(used)].sort((a, b) => a - b), [...Array(16).keys()]);
  assert.equal(WIZARD_DOWN_FRAME, 16);
  assert.equal(WIZARD_SHEET.frameCount, 17);
  assert.equal(WIZARD_SHEET.width, 288);
});

test("wizard packages contain exact sheets, portraits, metadata, and black separators", async () => {
  const hashes = new Set();
  for (const wizard of WIZARDS) {
    const root = new URL(`../assets/wizards/${wizard}/`, import.meta.url);
    const [sheetBuffer, portraitBuffer, metadata, legacyBuffer] = await Promise.all([
      readFile(new URL("sheet.png", root)),
      readFile(new URL("portrait.png", root)),
      readFile(new URL("frames.json", root), "utf8").then(JSON.parse),
      readFile(new URL("legacy.png", root))
    ]);
    const sheet = decodeRgbaPng(sheetBuffer);
    const portrait = decodeRgbaPng(portraitBuffer);
    assert.equal(sheet.width, 288);
    assert.equal(sheet.height, 16);
    assert.equal(portrait.width, 16);
    assert.equal(portrait.height, 16);
    assert.equal(metadata.frameCount, 17);
    assert.equal(metadata.frames.length, 17);
    assert.ok(legacyBuffer.length > 0);
    for (let separator = 0; separator < 16; separator += 1) {
      const x = 16 + separator * 17;
      for (let y = 0; y < 16; y += 1) assert.deepEqual(rgbaAt(sheet, x, y), [0, 0, 0, 255]);
    }
    hashes.add(createHash("sha256").update(sheetBuffer).digest("hex"));
  }
  assert.equal(hashes.size, 4, "each wizard should have a distinct placeholder sheet");
});
