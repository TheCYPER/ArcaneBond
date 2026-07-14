import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRAME_SIZE = 24;
const FRAME_COUNT = 2;
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

function circle(target, centerX, centerY, radius, color) {
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= radius * radius) pixel(target, centerX + x, centerY + y, color);
    }
  }
}

function blit(target, source, offsetX) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const offset = (y * source.width + x) * 4;
      pixel(target, offsetX + x, y, source.pixels.slice(offset, offset + 4));
    }
  }
}

function drawStrawFrame(phase) {
  const target = image(FRAME_SIZE, FRAME_SIZE);
  const outline = rgba("#100d18");
  const wood = rgba("#765032");
  const woodLight = rgba("#b87b46");
  const straw = rgba("#d9ad46");
  const strawLight = rgba("#ffe58a");
  const cloth = rgba("#8f3c55");
  const clothLight = rgba("#d56368");
  const sway = phase === 0 ? 0 : 1;

  rect(target, 4, 21, 16, 2, outline);
  rect(target, 6, 20, 12, 1, wood);
  rect(target, 11, 7, 3, 14, outline);
  rect(target, 12, 8, 1, 12, woodLight);
  rect(target, 3, 9 + sway, 18, 3, outline);
  rect(target, 4, 10 + sway, 16, 1, wood);
  rect(target, 2, 8 + sway, 4, 5, straw);
  rect(target, 18, 8 + sway, 4, 5, straw);
  pixel(target, 2, 8 + sway, strawLight);
  pixel(target, 21, 11 + sway, strawLight);
  rect(target, 7, 3, 10, 7, outline);
  rect(target, 8, 4, 8, 5, straw);
  rect(target, 9, 4, 5, 1, strawLight);
  pixel(target, 10, 6, outline);
  pixel(target, 14, 6, outline);
  rect(target, 10, 8, 5, 1, outline);
  rect(target, 6, 2, 12, 2, outline);
  rect(target, 8, 1, 8, 2, cloth);
  rect(target, 9, 1, 5, 1, clothLight);
  rect(target, 8, 12, 9, 6, outline);
  rect(target, 9, 12, 7, 5, cloth);
  rect(target, 10 + phase, 13, 2, 3, clothLight);
  return target;
}

function drawMovingTargetFrame(phase) {
  const target = image(FRAME_SIZE, FRAME_SIZE);
  const outline = rgba("#100d18");
  const wood = rgba("#765032");
  const woodLight = rgba("#b87b46");
  const bone = rgba("#f2e6c9");
  const blue = rgba("#4b9ec4");
  const red = rgba("#d94f60");
  const yellow = rgba("#ffd34e");
  const offsetY = phase;

  rect(target, 5, 21, 14, 2, outline);
  rect(target, 7, 20, 10, 1, wood);
  rect(target, 8, 14, 2, 7, outline);
  rect(target, 14, 14, 2, 7, outline);
  rect(target, 9, 15, 1, 5, woodLight);
  rect(target, 14, 15, 1, 5, woodLight);
  circle(target, 12, 9 + offsetY, 9, outline);
  circle(target, 12, 9 + offsetY, 8, bone);
  circle(target, 12, 9 + offsetY, 6, blue);
  circle(target, 12, 9 + offsetY, 4, red);
  circle(target, 12, 9 + offsetY, 2, yellow);
  pixel(target, 12, 9 + offsetY, outline);
  pixel(target, 9, 4 + offsetY, rgba("#ffffff"));
  return target;
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

function makeSheet(drawFrame) {
  const sheet = image(FRAME_SIZE * FRAME_COUNT, FRAME_SIZE);
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) blit(sheet, drawFrame(frame), frame * FRAME_SIZE);
  return encodePng(sheet);
}

function makeCheerWav() {
  const rate = 11025;
  const duration = 0.52;
  const notes = [659.25, 783.99, 1046.5, 1318.51];
  const noteLength = duration / notes.length;
  const sampleCount = Math.floor(rate * duration);
  const data = Buffer.alloc(sampleCount * 2);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / rate;
    const noteIndex = Math.min(notes.length - 1, Math.floor(time / noteLength));
    const localTime = time - noteIndex * noteLength;
    const progress = localTime / noteLength;
    const attack = Math.min(1, progress * 18);
    const release = Math.max(0, 1 - progress ** 1.7);
    const phase = 2 * Math.PI * notes[noteIndex] * localTime;
    const square = Math.sin(phase) >= 0 ? 1 : -1;
    const overtone = Math.sin(phase * 2) >= 0 ? 1 : -1;
    const sample = (square * 0.72 + overtone * 0.18) * attack * release;
    data.writeInt16LE(Math.round(sample * 24500), index * 2);
  }

  const output = Buffer.alloc(44 + data.length);
  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(36 + data.length, 4);
  output.write("WAVE", 8, "ascii");
  output.write("fmt ", 12, "ascii");
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(rate, 24);
  output.writeUInt32LE(rate * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36, "ascii");
  output.writeUInt32LE(data.length, 40);
  data.copy(output, 44);
  return output;
}

async function main() {
  const trainingDirectory = resolve(ROOT, "assets", "training");
  const audioDirectory = resolve(ROOT, "assets", "audio", "sfx");
  await mkdir(trainingDirectory, { recursive: true });
  await mkdir(audioDirectory, { recursive: true });
  await writeFile(resolve(trainingDirectory, "straw-dummy.png"), makeSheet(drawStrawFrame));
  await writeFile(resolve(trainingDirectory, "moving-target.png"), makeSheet(drawMovingTargetFrame));
  await writeFile(resolve(audioDirectory, "training-cheer.wav"), makeCheerWav());
  console.log("Generated training-room sprites and encouragement sound.");
}

await main();
