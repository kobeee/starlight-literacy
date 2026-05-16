#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";

const outputDir = new URL("../examples/sprites/yi/rabbit-hop/", import.meta.url);
const frameNames = ["frame-000.png", "frame-001.png", "frame-002.png", "frame-003.png"];

mkdirSync(outputDir, { recursive: true });

frameNames.forEach((frameName, index) => {
  const width = 64;
  const height = 64;
  const pixels = Buffer.alloc(width * height * 4);
  const bodyCenterX = 31 + index;
  const bodyCenterY = 39 - (index === 1 || index === 2 ? 5 : 0);
  const earTilt = index === 2 ? 2 : 0;

  drawEllipse(pixels, width, height, bodyCenterX, bodyCenterY, 15, 11, [238, 221, 196, 255]);
  drawEllipse(pixels, width, height, bodyCenterX + 8, bodyCenterY - 12, 9, 8, [244, 230, 207, 255]);
  drawEllipse(pixels, width, height, bodyCenterX + 4 + earTilt, bodyCenterY - 23, 3, 9, [238, 221, 196, 255]);
  drawEllipse(pixels, width, height, bodyCenterX + 11 + earTilt, bodyCenterY - 22, 3, 8, [238, 221, 196, 255]);
  drawEllipse(pixels, width, height, bodyCenterX - 14, bodyCenterY - 1, 4, 5, [250, 243, 230, 255]);
  drawEllipse(pixels, width, height, bodyCenterX + 11, bodyCenterY - 13, 1, 1, [83, 56, 42, 255]);
  drawEllipse(pixels, width, height, bodyCenterX + 16, bodyCenterY - 10, 2, 1, [205, 122, 100, 255]);
  drawEllipse(pixels, width, height, bodyCenterX - 7, bodyCenterY + 10, 5, 3, [221, 190, 158, 255]);
  drawEllipse(pixels, width, height, bodyCenterX + 8, bodyCenterY + 10, 6, 3, [221, 190, 158, 255]);

  const png = encodeRgbaPng(width, height, pixels);
  writeFileSync(join(outputDir.pathname, frameName), png);
});

console.log(`Wrote ${frameNames.length} example sprite frames to ${dirname(outputDir.pathname)}/rabbit-hop`);

function drawEllipse(pixels, width, height, centerX, centerY, radiusX, radiusY, color) {
  for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y += 1) {
    if (y < 0 || y >= height) continue;
    for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x += 1) {
      if (x < 0 || x >= width) continue;
      const dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
      if (dx * dx + dy * dy > 1) continue;

      const offset = (y * width + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
}

function encodeRgbaPng(width, height, pixels) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * (1 + width * 4);
    raw[rawOffset] = 0;
    pixels.copy(raw, rawOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", createIhdr(width, height)),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function createIhdr(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return ihdr;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
