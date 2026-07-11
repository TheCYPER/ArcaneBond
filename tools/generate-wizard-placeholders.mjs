import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRAME_WIDTH = 16;
const FRAME_HEIGHT = 16;
const FRAME_COUNT = 17;
const SPACING = 1;
const SHEET_WIDTH = FRAME_WIDTH * FRAME_COUNT + SPACING * (FRAME_COUNT - 1);

const FRAME_ORDER = [
  ["move_up", "up", "move", 0],
  ["move_up", "up", "move", 1],
  ["move_down", "down", "move", 0],
  ["move_down", "down", "move", 1],
  ["move_left", "left", "move", 0],
  ["move_left", "left", "move", 1],
  ["move_right", "right", "move", 0],
  ["move_right", "right", "move", 1],
  ["cast_up", "up", "cast", 0],
  ["cast_up", "up", "cast", 1],
  ["cast_down", "down", "cast", 0],
  ["cast_down", "down", "cast", 1],
  ["cast_left", "left", "cast", 0],
  ["cast_left", "left", "cast", 1],
  ["cast_right", "right", "cast", 0],
  ["cast_right", "right", "cast", 1]
];

const WIZARDS = {
  star: { primary: "#49bfe8", light: "#bff4ff", dark: "#174b78", accent: "#ffffff", skin: "#f1d8b2" },
  ember: { primary: "#e84d2f", light: "#ff9a3d", dark: "#6e1d32", accent: "#ffe266", skin: "#e8c29f" },
  verdant: { primary: "#54b85a", light: "#a8e86e", dark: "#20563d", accent: "#e4ff9a", skin: "#dfc79d" },
  thunder: { primary: "#e5b938", light: "#fff17a", dark: "#70502d", accent: "#d8f4ff", skin: "#e5c79b" }
};

const OUTLINE = rgba("#100d18");
const BLACK = rgba("#000000");
const TRANSPARENT = [0, 0, 0, 0];

function rgba(hex, alpha = 255) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}

function image(width, height, color = TRANSPARENT) {
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) pixels.set(color, index * 4);
  return { width, height, pixels };
}

function pixel(target, x, y, color) {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height) return;
  target.pixels.set(color, (y * target.width + x) * 4);
}

function rect(target, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) pixel(target, px, py, color);
  }
}

function mirror(source) {
  const target = image(source.width, source.height);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const offset = (y * source.width + x) * 4;
      pixel(target, source.width - x - 1, y, source.pixels.slice(offset, offset + 4));
    }
  }
  return target;
}

function drawHat(target, palette, facing) {
  const primary = rgba(palette.primary);
  const light = rgba(palette.light);
  const dark = rgba(palette.dark);
  rect(target, 7, 0, 2, 1, OUTLINE);
  rect(target, 6, 1, 4, 1, OUTLINE);
  rect(target, 5, 2, 6, 1, OUTLINE);
  rect(target, 4, 3, 8, 2, OUTLINE);
  rect(target, 5, 1, 4, 1, dark);
  rect(target, 6, 2, 4, 1, primary);
  rect(target, 5, 3, 6, 1, primary);
  rect(target, 4, 4, 8, 1, dark);
  pixel(target, facing === "up" ? 6 : 9, 2, light);
}

function drawFront(target, id, palette, step, casting) {
  const primary = rgba(palette.primary);
  const light = rgba(palette.light);
  const dark = rgba(palette.dark);
  const skin = rgba(palette.skin);
  drawHat(target, palette, "down");
  rect(target, 5, 5, 6, 3, OUTLINE);
  rect(target, 6, 5, 4, 2, skin);
  pixel(target, 6, 6, dark);
  pixel(target, 9, 6, dark);
  rect(target, 5, 8, 6, 1, OUTLINE);
  rect(target, 4, 9, 8, 4, OUTLINE);
  rect(target, 3, 12, 10, 2, OUTLINE);
  rect(target, 5, 9, 6, 4, primary);
  rect(target, 4, 12, 8, 1, dark);
  rect(target, 5, 10, 2, 2, light);
  if (!casting && step === 0) {
    rect(target, 4, 14, 2, 1, dark);
    rect(target, 10, 14, 2, 1, dark);
  }
  if (casting) {
    rect(target, 2, 9, 3, 2, OUTLINE);
    rect(target, 11, 9, 3, 2, OUTLINE);
    pixel(target, 2, 9, primary);
    pixel(target, 13, 9, primary);
  }
  drawIdentity(target, id, palette, "down");
}

function drawBack(target, id, palette, step, casting) {
  const primary = rgba(palette.primary);
  const light = rgba(palette.light);
  const dark = rgba(palette.dark);
  drawHat(target, palette, "up");
  rect(target, 5, 5, 6, 3, OUTLINE);
  rect(target, 6, 5, 4, 2, dark);
  rect(target, 5, 8, 6, 1, OUTLINE);
  rect(target, 4, 9, 8, 4, OUTLINE);
  rect(target, 3, 12, 10, 2, OUTLINE);
  rect(target, 5, 9, 6, 4, primary);
  rect(target, 7, 9, 2, 4, dark);
  pixel(target, 7, 10, light);
  if (!casting && step === 0) {
    rect(target, 4, 14, 2, 1, dark);
    rect(target, 10, 14, 2, 1, dark);
  }
  if (casting) {
    rect(target, 2, 8, 3, 2, OUTLINE);
    rect(target, 11, 8, 3, 2, OUTLINE);
    pixel(target, 2, 8, primary);
    pixel(target, 13, 8, primary);
  }
  drawIdentity(target, id, palette, "up");
}

function drawLeft(target, id, palette, step, casting) {
  const primary = rgba(palette.primary);
  const light = rgba(palette.light);
  const dark = rgba(palette.dark);
  const skin = rgba(palette.skin);
  rect(target, 7, 0, 2, 1, OUTLINE);
  rect(target, 6, 1, 4, 1, OUTLINE);
  rect(target, 5, 2, 6, 1, OUTLINE);
  rect(target, 4, 3, 8, 2, OUTLINE);
  rect(target, 5, 1, 4, 1, dark);
  rect(target, 5, 2, 5, 2, primary);
  rect(target, 4, 4, 8, 1, dark);
  rect(target, 5, 5, 6, 3, OUTLINE);
  rect(target, 5, 5, 4, 2, skin);
  pixel(target, 5, 6, dark);
  pixel(target, 4, 6, skin);
  rect(target, 5, 8, 6, 1, OUTLINE);
  rect(target, 4, 9, 8, 4, OUTLINE);
  rect(target, 3, 12, 9, 2, OUTLINE);
  rect(target, 5, 9, 5, 4, primary);
  rect(target, 7, 9, 2, 3, light);
  if (!casting && step === 0) rect(target, 4, 14, 3, 1, dark);
  if (casting) {
    rect(target, 2, 9, 4, 2, OUTLINE);
    rect(target, 2, 9, 3, 1, primary);
  }
  drawIdentity(target, id, palette, "left");
}

function drawIdentity(target, id, palette, facing) {
  const accent = rgba(palette.accent);
  const light = rgba(palette.light);
  if (id === "star") {
    pixel(target, 8, 2, accent);
    pixel(target, 7, 3, accent);
    pixel(target, 9, 3, accent);
  } else if (id === "ember") {
    pixel(target, 9, 0, light);
    pixel(target, 10, 1, accent);
    pixel(target, 8, 2, accent);
  } else if (id === "verdant") {
    pixel(target, 4, 1, light);
    pixel(target, 5, 0, accent);
    pixel(target, 10, 1, accent);
  } else if (id === "thunder") {
    pixel(target, 9, 1, accent);
    pixel(target, 8, 2, accent);
    pixel(target, 9, 3, accent);
  }
  if (facing === "up") pixel(target, 8, 11, accent);
  else if (facing === "left") pixel(target, 7, 11, accent);
  else pixel(target, 8, 11, accent);
}

function drawCastSpark(target, direction, phase, palette) {
  const accent = rgba(palette.accent);
  const light = rgba(palette.light);
  const points = {
    up: [8, 0],
    down: [8, 15],
    left: [0, 9],
    right: [15, 9]
  };
  const [x, y] = points[direction];
  pixel(target, x, y, accent);
  if (phase === 0) return;
  pixel(target, x - 1, y, light);
  pixel(target, x + 1, y, light);
  pixel(target, x, y - 1, light);
  pixel(target, x, y + 1, light);
}

function drawFrame(id, palette, direction, action, phase) {
  let target = image(FRAME_WIDTH, FRAME_HEIGHT);
  if (direction === "down") drawFront(target, id, palette, phase, action === "cast");
  else if (direction === "up") drawBack(target, id, palette, phase, action === "cast");
  else {
    drawLeft(target, id, palette, phase, action === "cast");
    if (direction === "right") target = mirror(target);
  }
  if (action === "cast") drawCastSpark(target, direction, phase, palette);
  return target;
}

function drawDowned(id, palette) {
  const target = image(FRAME_WIDTH, FRAME_HEIGHT);
  const primary = rgba(palette.primary);
  const dark = rgba(palette.dark);
  const light = rgba(palette.light);
  const skin = rgba(palette.skin);
  rect(target, 2, 8, 12, 5, OUTLINE);
  rect(target, 3, 9, 4, 3, primary);
  rect(target, 7, 9, 5, 3, dark);
  rect(target, 1, 9, 3, 3, OUTLINE);
  rect(target, 2, 9, 2, 2, skin);
  pixel(target, 2, 10, dark);
  rect(target, 12, 10, 3, 2, OUTLINE);
  pixel(target, 12, 10, light);
  pixel(target, 8, 10, rgba(palette.accent));
  return target;
}

function blit(target, source, offsetX, offsetY = 0) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const offset = (y * source.width + x) * 4;
      pixel(target, offsetX + x, offsetY + y, source.pixels.slice(offset, offset + 4));
    }
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const body = Buffer.concat([name, data]);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  body.copy(output, 4);
  output.writeUInt32BE(crc32(body), data.length + 8);
  return output;
}

function encodePng(target) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(target.width, 0);
  header.writeUInt32BE(target.height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc((target.width * 4 + 1) * target.height);
  for (let y = 0; y < target.height; y += 1) {
    const row = y * (target.width * 4 + 1);
    scanlines[row] = 0;
    Buffer.from(target.pixels.buffer, target.pixels.byteOffset + y * target.width * 4, target.width * 4).copy(scanlines, row + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

async function generateWizard(id, palette) {
  const frames = FRAME_ORDER.map(([, direction, action, phase]) => drawFrame(id, palette, direction, action, phase));
  frames.push(drawDowned(id, palette));
  const sheet = image(SHEET_WIDTH, FRAME_HEIGHT);
  for (let index = 0; index < frames.length; index += 1) {
    const offsetX = index * (FRAME_WIDTH + SPACING);
    blit(sheet, frames[index], offsetX);
    if (index < frames.length - 1) rect(sheet, offsetX + FRAME_WIDTH, 0, SPACING, FRAME_HEIGHT, BLACK);
  }

  const directory = resolve(ROOT, "assets", "wizards", id);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, "sheet.png"), encodePng(sheet));
  await writeFile(resolve(directory, "portrait.png"), encodePng(frames[2]));
  await writeFile(resolve(directory, "frames.json"), `${JSON.stringify({
    wizard: id,
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    spacing: SPACING,
    frameCount: FRAME_COUNT,
    sheetWidth: SHEET_WIDTH,
    frames: [
      ...FRAME_ORDER.map(([tag, direction, action, phase], index) => ({
        index,
        x: index * (FRAME_WIDTH + SPACING),
        tag,
        direction,
        action,
        phase
      })),
      { index: 16, x: 16 * (FRAME_WIDTH + SPACING), tag: "downed", direction: null, action: "downed", phase: 0 }
    ]
  }, null, 2)}\n`);
}

for (const [id, palette] of Object.entries(WIZARDS)) await generateWizard(id, palette);
console.log(`Generated ${Object.keys(WIZARDS).length} wizard sheets (${SHEET_WIDTH}x${FRAME_HEIGHT}, ${FRAME_COUNT} frames).`);
