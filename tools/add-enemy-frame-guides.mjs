import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENEMIES = ["imp", "wolf", "guard", "ghost", "archer", "priest", "mirror", "spore"];
const FRAME_WIDTH = 20;
const FRAME_HEIGHT = 20;
const FRAME_COUNT = 6;
const SPACING = 1;
const SOURCE_WIDTH = FRAME_WIDTH * FRAME_COUNT;
const GUIDED_WIDTH = SOURCE_WIDTH + SPACING * (FRAME_COUNT - 1);
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const diagonalDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= diagonalDistance) return left;
  if (upDistance <= diagonalDistance) return up;
  return upperLeft;
}

function decodePng(buffer, name) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${name}: invalid PNG signature`);
  const idat = [];
  let width = 0;
  let height = 0;
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error(`${name}: expected non-interlaced 8-bit RGBA PNG`);
      }
    }
    if (type === "IDAT") idat.push(data);
    offset += length + 12;
  }

  const packed = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = packed[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * stride;
    const previousOffset = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = packed[sourceOffset + x];
      const left = x >= 4 ? pixels[rowOffset + x - 4] : 0;
      const up = y > 0 ? pixels[previousOffset + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[previousOffset + x - 4] : 0;
      let value;
      if (filter === 0) value = raw;
      else if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paeth(left, up, upperLeft);
      else throw new Error(`${name}: unsupported PNG filter ${filter}`);
      pixels[rowOffset + x] = value & 255;
    }
    sourceOffset += stride;
  }
  return { width, height, pixels };
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

function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const outputOffset = y * (stride + 1);
    scanlines[outputOffset] = 0;
    pixels.copy(scanlines, outputOffset + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function pixelOffset(width, x, y) {
  return (y * width + x) * 4;
}

function addGuides(source, name) {
  if (source.height !== FRAME_HEIGHT || ![SOURCE_WIDTH, GUIDED_WIDTH].includes(source.width)) {
    throw new Error(
      `${name}: expected ${SOURCE_WIDTH}x${FRAME_HEIGHT} or ${GUIDED_WIDTH}x${FRAME_HEIGHT}, ` +
      `got ${source.width}x${source.height}`
    );
  }

  const guided = Buffer.alloc(GUIDED_WIDTH * FRAME_HEIGHT * 4);
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const sourceX = source.width === SOURCE_WIDTH ? frame * FRAME_WIDTH : frame * (FRAME_WIDTH + SPACING);
    const targetX = frame * (FRAME_WIDTH + SPACING);
    for (let y = 0; y < FRAME_HEIGHT; y += 1) {
      const sourceStart = pixelOffset(source.width, sourceX, y);
      const targetStart = pixelOffset(GUIDED_WIDTH, targetX, y);
      source.pixels.copy(guided, targetStart, sourceStart, sourceStart + FRAME_WIDTH * 4);
    }
  }

  for (let frame = 0; frame < FRAME_COUNT - 1; frame += 1) {
    const x = FRAME_WIDTH + frame * (FRAME_WIDTH + SPACING);
    for (let y = 0; y < FRAME_HEIGHT; y += 1) {
      const offset = pixelOffset(GUIDED_WIDTH, x, y);
      guided[offset + 3] = 255;
    }
  }
  return guided;
}

async function main() {
  for (const enemy of ENEMIES) {
    const path = resolve(ROOT, "assets", "sprites", `${enemy}.png`);
    const source = decodePng(await readFile(path), `${enemy}.png`);
    const guided = addGuides(source, `${enemy}.png`);
    await writeFile(path, encodePng(GUIDED_WIDTH, FRAME_HEIGHT, guided));
  }
  console.log(`Added frame guides to ${ENEMIES.length} small-enemy sheets.`);
}

await main();
