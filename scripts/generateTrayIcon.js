const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 32;
const CHANNELS = 4;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BIT_DEPTH = 8;
const COLOR_TYPE_RGBA = 6;
const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'trayIcon.png');

const TRANSPARENT = [0, 0, 0, 0];
const FRAME_COLOR = [60, 60, 67, 255];
const PAGE_COLOR = [255, 255, 255, 255];
const HEADER_COLOR = [255, 59, 48, 255];
const MARK_COLOR = [60, 60, 67, 255];

const BODY_LEFT = 3;
const BODY_RIGHT = 28;
const BODY_TOP = 5;
const BODY_BOTTOM = 28;
const HEADER_BOTTOM = 12;
const CORNER_RADIUS = 3;
const RING_TOP = 2;
const RING_BOTTOM = 6;
const FIRST_RING_LEFT = 8;
const SECOND_RING_LEFT = 20;
const RING_WIDTH = 3;
const MARK_TOP = 16;
const MARK_BOTTOM = 24;
const MARK_LEFT = 9;
const MARK_RIGHT = 22;
const MARK_ROW_HEIGHT = 3;
const MARK_GAP = 5;

function createPixels() {
  const pixels = [];
  for (let y = 0; y < SIZE; y += 1) {
    pixels.push(new Array(SIZE).fill(TRANSPARENT));
  }
  return pixels;
}

function isOutsideRoundedCorner(x, y) {
  const nearLeft = x < BODY_LEFT + CORNER_RADIUS;
  const nearRight = x > BODY_RIGHT - 1 - CORNER_RADIUS;
  const nearTop = y < BODY_TOP + CORNER_RADIUS;
  const nearBottom = y > BODY_BOTTOM - 1 - CORNER_RADIUS;
  if (!((nearLeft || nearRight) && (nearTop || nearBottom))) return false;
  const cornerX = nearLeft ? BODY_LEFT + CORNER_RADIUS : BODY_RIGHT - 1 - CORNER_RADIUS;
  const cornerY = nearTop ? BODY_TOP + CORNER_RADIUS : BODY_BOTTOM - 1 - CORNER_RADIUS;
  const dx = x - cornerX;
  const dy = y - cornerY;
  return dx * dx + dy * dy > CORNER_RADIUS * CORNER_RADIUS;
}

function isInsideBody(x, y) {
  if (x < BODY_LEFT || x >= BODY_RIGHT || y < BODY_TOP || y >= BODY_BOTTOM) return false;
  return !isOutsideRoundedCorner(x, y);
}

function isFrame(x, y) {
  return !isInsideBody(x - 1, y) || !isInsideBody(x + 1, y)
    || !isInsideBody(x, y - 1) || !isInsideBody(x, y + 1);
}

function fillBody(pixels) {
  for (let y = BODY_TOP; y < BODY_BOTTOM; y += 1) {
    for (let x = BODY_LEFT; x < BODY_RIGHT; x += 1) {
      if (isOutsideRoundedCorner(x, y)) continue;
      if (y < HEADER_BOTTOM) {
        pixels[y][x] = HEADER_COLOR;
        continue;
      }
      pixels[y][x] = isFrame(x, y) ? FRAME_COLOR : PAGE_COLOR;
    }
  }
}

function fillRings(pixels) {
  const lefts = [FIRST_RING_LEFT, SECOND_RING_LEFT];
  for (const left of lefts) {
    for (let y = RING_TOP; y < RING_BOTTOM; y += 1) {
      for (let x = left; x < left + RING_WIDTH; x += 1) {
        pixels[y][x] = FRAME_COLOR;
      }
    }
  }
}

function fillMarks(pixels) {
  for (let y = MARK_TOP; y < MARK_BOTTOM; y += MARK_GAP) {
    for (let row = y; row < y + MARK_ROW_HEIGHT; row += 1) {
      for (let x = MARK_LEFT; x < MARK_RIGHT; x += 1) {
        pixels[row][x] = MARK_COLOR;
      }
    }
  }
}

function toRawScanlines(pixels) {
  const stride = SIZE * CHANNELS + 1;
  const raw = Buffer.alloc(SIZE * stride);
  for (let y = 0; y < SIZE; y += 1) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    for (let x = 0; x < SIZE; x += 1) {
      const offset = rowStart + 1 + x * CHANNELS;
      const [r, g, b, a] = pixels[y][x];
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }
  return raw;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(typeAndData) >>> 0, 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function createHeaderChunk() {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(SIZE, 0);
  data.writeUInt32BE(SIZE, 4);
  data[8] = BIT_DEPTH;
  data[9] = COLOR_TYPE_RGBA;
  return createChunk('IHDR', data);
}

function buildPng() {
  const pixels = createPixels();
  fillBody(pixels);
  fillRings(pixels);
  fillMarks(pixels);
  const compressed = zlib.deflateSync(toRawScanlines(pixels), { level: 9 });
  return Buffer.concat([
    PNG_SIGNATURE,
    createHeaderChunk(),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0))
  ]);
}

fs.writeFileSync(OUTPUT_PATH, buildPng());
process.stdout.write(`tray icon written: ${OUTPUT_PATH}\n`);
