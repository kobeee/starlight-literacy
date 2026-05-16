#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { spawnSync } from "node:child_process";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BYTES_PER_OUTPUT_PIXEL = 4;
const DEFAULT_FRAME_SIZE = 256;
const DEFAULT_PADDING = 24;
const DEFAULT_TRANSPARENT_DISTANCE = 42;
const DEFAULT_OPAQUE_DISTANCE = 150;
const DEFAULT_ALPHA_THRESHOLD = 8;
const DEFAULT_REVIEW_COLUMNS = 5;
const CRC_TABLE = buildCrcTable();

const options = parseArgs(process.argv.slice(2));

if (options.help || options.h) {
  printUsage();
  process.exit(0);
}

const inputPath = requiredPathOption(options, "input");
const outputDir = requiredPathOption(options, "output");
const characterId = requiredStringOption(options, "character-id");
const actor = requiredStringOption(options, "actor");
const action = requiredStringOption(options, "action");
const rows = requiredIntegerOption(options, "rows", { min: 1 });
const cols = requiredIntegerOption(options, "cols", { min: 1 });
const frameWidth = integerOption(options, "frame-width", DEFAULT_FRAME_SIZE, { min: 8 });
const frameHeight = integerOption(options, "frame-height", DEFAULT_FRAME_SIZE, { min: 8 });
const fps = integerOption(options, "fps", 12, { min: 8, max: 24 });
const padding = integerOption(options, "padding", DEFAULT_PADDING, { min: 0 });
const cropPadding = integerOption(options, "crop-padding", 4, { min: 0 });
const transparentDistance = integerOption(options, "transparent-distance", DEFAULT_TRANSPARENT_DISTANCE, { min: 0 });
const opaqueDistance = integerOption(options, "opaque-distance", DEFAULT_OPAQUE_DISTANCE, { min: transparentDistance + 1 });
const alphaThreshold = integerOption(options, "alpha-threshold", DEFAULT_ALPHA_THRESHOLD, { min: 0, max: 255 });
const reviewColumns = integerOption(options, "review-columns", DEFAULT_REVIEW_COLUMNS, { min: 1 });
const verticalAlign = stringOption(options, "vertical-align", "center", ["center", "bottom"]);
const horizontalAlign = stringOption(options, "horizontal-align", "center", ["center"]);
const chromaKeyOption = stringOption(options, "chroma-key", "auto");
const motionCheck = stringOption(options, "motion-check", "auto", ["auto", "none"]);
const validate = options.validate !== false && options["skip-validate"] !== true;
const requiredMotionParts = listOption(options, "required-motion-parts", [actor]);
const id = slugOption(options, "id", `${characterId}-${actor}-${action}`);
const pivot = parsePivot(stringOption(options, "pivot", "0.5,0.5"));
const requestedMode = stringOption(options, "mode", "auto", ["auto", "transparent", "chroma-key"]);
const allowIdenticalFrames = options["allow-identical-frames"] === true;

const absoluteInputPath = normalize(isAbsolute(inputPath) ? inputPath : join(process.cwd(), inputPath));
const absoluteOutputDir = normalize(isAbsolute(outputDir) ? outputDir : join(process.cwd(), outputDir));

if (!existsSync(absoluteInputPath)) {
  fail(`Input file does not exist: ${inputPath}`);
}

if (padding * 2 >= frameWidth || padding * 2 >= frameHeight) {
  fail("--padding leaves no drawable area inside the requested frame size.");
}

const sheet = decodePng(absoluteInputPath);
const transparencyReport = analyzeTransparency(sheet);
const selectedMode = resolveMode(requestedMode, transparencyReport);
const sheetKey = selectedMode === "chroma-key"
  ? (chromaKeyOption === "auto" ? estimateBorderColor(sheet) : parseHexColor(chromaKeyOption))
  : { r: 0, g: 0, b: 0 };
const frameCount = rows * cols;
const cells = [];
const boxes = [];

for (let index = 0; index < frameCount; index += 1) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const cell = extractCell(sheet, row, col, rows, cols);
  let processed;
  if (selectedMode === "transparent") {
    processed = cell;
  } else {
    const cellKey = chromaKeyOption === "auto" ? estimateBorderColor(cell) : sheetKey;
    processed = applyChromaKey(cell, cellKey, {
      transparentDistance,
      opaqueDistance,
      alphaThreshold,
    });
  }
  const box = padBox(findOpaqueBounds(processed, alphaThreshold), processed, cropPadding);

  if (!box) {
    const reason = selectedMode === "transparent"
      ? "transparent mode found an empty cell — the cell has no opaque pixels."
      : "chroma-key removal left an empty cell.";
    fail(`Cell ${index} has no visible content: ${reason}`);
  }

  cells.push(processed);
  boxes.push(box);
}

const duplicateReport = detectIdenticalCells(cells);
if (duplicateReport.identicalPairs.length > 0) {
  const summary = duplicateReport.identicalPairs
    .map((pair) => `${pair[0]}<->${pair[1]}`)
    .join(", ");
  const message = [
    `Detected ${duplicateReport.identicalPairs.length} identical frame pair(s): ${summary}.`,
    `This usually means the spritesheet was assembled by copy-paste or a script instead of image generation.`,
    `Reject this spritesheet and regenerate. If duplicates are intentional, rerun with --allow-identical-frames.`,
  ].join("\n");
  if (allowIdenticalFrames) {
    console.warn(`prepare-spritesheet-sprite: ${message}`);
  } else {
    fail(message);
  }
}

const maxBoxWidth = Math.max(...boxes.map((box) => box.width));
const maxBoxHeight = Math.max(...boxes.map((box) => box.height));
const scale = Math.min(
  (frameWidth - padding * 2) / maxBoxWidth,
  (frameHeight - padding * 2) / maxBoxHeight,
);

if (!Number.isFinite(scale) || scale <= 0) {
  fail("Could not compute a valid normalization scale.");
}

mkdirSync(absoluteOutputDir, { recursive: true });

const frames = cells.map((cell, index) => {
  const normalized = normalizeFrame({
    source: cell,
    box: boxes[index],
    scale,
    frameWidth,
    frameHeight,
    verticalAlign,
    horizontalAlign,
    padding,
  });
  const frameName = `frame-${String(index).padStart(3, "0")}.png`;
  writePng(join(absoluteOutputDir, frameName), normalized);
  return frameName;
});

const sourceCopyPath = join(absoluteOutputDir, "source-spritesheet.png");
if (normalize(sourceCopyPath) !== absoluteInputPath) {
  copyFileSync(absoluteInputPath, sourceCopyPath);
}

const reviewSheet = buildReviewSheet({
  frames: frames.map((frameName) => decodePng(join(absoluteOutputDir, frameName))),
  columns: Math.min(reviewColumns, frameCount),
  cellSize: 160,
});
writePng(join(absoluteOutputDir, "review-sheet.png"), reviewSheet);

const manifest = buildManifest({
  id,
  characterId,
  actor,
  action,
  fps,
  frameWidth,
  frameHeight,
  pivot,
  chromaKey: sheetKey,
  frameNames: frames,
  requiredMotionParts,
  motionCheck,
  generationMode: selectedMode,
  transparencyReport,
});
const manifestPath = join(absoluteOutputDir, "manifest.json");
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (validate) {
  const validatorPath = join(dirname(fileURLToPath(import.meta.url)), "validate-sprite-assets.mjs");
  const result = spawnSync(process.execPath, [validatorPath, manifestPath], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`Prepared spritesheet sprite: ${frameCount} frame(s).`);
console.log(`- mode: ${selectedMode}`);
console.log(`- manifest: ${manifestPath}`);
console.log(`- review sheet: ${join(absoluteOutputDir, "review-sheet.png")}`);
console.log(`- source copy: ${sourceCopyPath}`);

function printUsage() {
  console.log(`Usage:
node tools/recognition-video/scripts/prepare-spritesheet-sprite.mjs \\
  --input <spritesheet.png> \\
  --output <sprite-dir> \\
  --character-id <char-id> \\
  --actor <actor> \\
  --action <action> \\
  --rows <n> \\
  --cols <n> \\
  [--mode auto|transparent|chroma-key] \\
  [--chroma-key auto|#00ff00] \\
  [--required-motion-parts part-a,part-b] \\
  [--allow-identical-frames] \\
  [--frame-width 256 --frame-height 256 --fps 12]

The script slices an image-generation spritesheet into standard transparent
PNG frames, normalizes scale and padding, writes manifest.json and
review-sheet.png, then runs validate-sprite-assets.mjs by default.

Mode policy:
- auto (default): if the input already has a usable alpha channel, treat as
  RGBA and skip chroma-key; otherwise fall back to chroma-key removal.
- transparent: require a real alpha channel; fail fast if not present. Do not
  retry — regenerate the spritesheet with an explicit transparent-PNG prompt.
- chroma-key: legacy path. Use only when the model cannot deliver transparency.

The script also rejects spritesheets whose adjacent cells are pixel-identical,
since this almost always means the sheet was assembled by a copy-paste script
rather than image generation. Pass --allow-identical-frames to override.`);
}

function buildManifest({
  id,
  characterId,
  actor,
  action,
  fps,
  frameWidth,
  frameHeight,
  pivot,
  chromaKey,
  frameNames,
  requiredMotionParts,
  motionCheck,
  generationMode,
  transparencyReport,
}) {
  const manifest = {
    schemaVersion: "recognition-video-sprite/v1",
    id,
    characterId,
    actor,
    action,
    fps,
    frameSize: {
      width: frameWidth,
      height: frameHeight,
    },
    pivot,
    playback: {
      loop: false,
      holdLastFrame: true,
    },
    alphaRequired: true,
    generationMode,
    sourceTransparency: {
      transparentPixelRatio: Number(transparencyReport.transparentPixelRatio.toFixed(4)),
      edgeTransparentRatio: Number(transparencyReport.edgeTransparentRatio.toFixed(4)),
      hasUsableAlpha: transparencyReport.hasUsableAlpha,
    },
    chromaKey: {
      enabled: generationMode === "chroma-key",
      color: colorToHex(chromaKey),
    },
    minFrames: frameNames.length,
    frames: frameNames,
    poseContract: {
      requiredMotionParts,
      frames: frameNames.map((_, index) => ({
        frame: index,
        pose: `${actor} ${action} spritesheet pose ${index + 1}`,
        contact: "transparent frame normalized from generated spritesheet",
      })),
    },
    notes: "Generated by prepare-spritesheet-sprite.mjs from one image-generation spritesheet. Review action readability before official use.",
  };

  if (motionCheck === "auto") {
    manifest.motionChecks = [
      {
        id: "auto-frame-diff",
        label: "frame-to-frame sprite change",
        region: {
          x: 0,
          y: 0,
          width: frameWidth,
          height: frameHeight,
        },
        minChangedFramePairs: Math.max(1, Math.floor((frameNames.length - 1) / 3)),
        minChangedPixels: Math.max(24, Math.round(frameWidth * frameHeight * 0.0015)),
        minMeanDelta: 0.15,
        notes: "Coarse guardrail against a static spritesheet. Product review still owns semantic action readability.",
      },
    ];
  }

  return manifest;
}

function analyzeTransparency(image) {
  const totalPixels = image.width * image.height;
  if (totalPixels === 0) {
    return { transparentPixelRatio: 0, edgeTransparentRatio: 0, hasUsableAlpha: false };
  }
  const edgeWidth = Math.max(2, Math.floor(Math.min(image.width, image.height) * 0.02));
  let transparentPixels = 0;
  let edgeTransparentPixels = 0;
  let edgeSampleCount = 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * BYTES_PER_OUTPUT_PIXEL + 3];
      const isEdge = x < edgeWidth || y < edgeWidth ||
                     x >= image.width - edgeWidth || y >= image.height - edgeWidth;
      if (isEdge) edgeSampleCount += 1;
      if (alpha < 16) {
        transparentPixels += 1;
        if (isEdge) edgeTransparentPixels += 1;
      }
    }
  }

  const transparentPixelRatio = transparentPixels / totalPixels;
  const edgeTransparentRatio = edgeSampleCount > 0 ? edgeTransparentPixels / edgeSampleCount : 0;
  const hasUsableAlpha = transparentPixelRatio > 0.05 && edgeTransparentRatio > 0.5;

  return { transparentPixelRatio, edgeTransparentRatio, hasUsableAlpha };
}

function resolveMode(requested, transparencyReport) {
  if (requested === "transparent") {
    if (!transparencyReport.hasUsableAlpha) {
      fail([
        `--mode transparent requires a usable alpha channel, but the input shows`,
        `  transparentPixelRatio=${transparencyReport.transparentPixelRatio.toFixed(3)}`,
        `  edgeTransparentRatio=${transparencyReport.edgeTransparentRatio.toFixed(3)}`,
        ``,
        `Do NOT retry the script. Regenerate the spritesheet with an explicit prompt`,
        `that asks for "transparent PNG with alpha channel (RGBA)" and no background.`,
      ].join("\n"));
    }
    return "transparent";
  }
  if (requested === "chroma-key") return "chroma-key";

  if (transparencyReport.hasUsableAlpha) {
    console.log(
      `prepare-spritesheet-sprite: auto-detected transparent alpha ` +
      `(transparentPixelRatio=${transparencyReport.transparentPixelRatio.toFixed(3)}, ` +
      `edgeTransparentRatio=${transparencyReport.edgeTransparentRatio.toFixed(3)}). ` +
      `Using transparent mode, skipping chroma-key removal.`,
    );
    return "transparent";
  }
  console.log(
    `prepare-spritesheet-sprite: no usable alpha detected ` +
    `(transparentPixelRatio=${transparencyReport.transparentPixelRatio.toFixed(3)}). ` +
    `Falling back to chroma-key mode.`,
  );
  return "chroma-key";
}

function detectIdenticalCells(cells) {
  const identicalPairs = [];
  for (let index = 1; index < cells.length; index += 1) {
    if (imagesAreIdentical(cells[index - 1], cells[index])) {
      identicalPairs.push([index - 1, index]);
    }
  }
  return { identicalPairs };
}

function imagesAreIdentical(a, b) {
  if (a.width !== b.width || a.height !== b.height) return false;
  if (a.data.length !== b.data.length) return false;
  return a.data.equals(b.data);
}

function normalizeFrame({
  source,
  box,
  scale,
  frameWidth,
  frameHeight,
  verticalAlign,
  horizontalAlign,
  padding,
}) {
  const output = makeImage(frameWidth, frameHeight, [0, 0, 0, 0]);
  const targetWidth = Math.max(1, Math.round(box.width * scale));
  const targetHeight = Math.max(1, Math.round(box.height * scale));
  const targetX = horizontalAlign === "center" ? Math.round((frameWidth - targetWidth) / 2) : padding;
  const targetY = verticalAlign === "bottom"
    ? frameHeight - padding - targetHeight
    : Math.round((frameHeight - targetHeight) / 2);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = box.x + (x + 0.5) / scale - 0.5;
      const sourceY = box.y + (y + 0.5) / scale - 0.5;
      const sample = sampleBilinear(source, sourceX, sourceY);
      setPixel(output, targetX + x, targetY + y, sample);
    }
  }

  return output;
}

function buildReviewSheet({ frames, columns, cellSize }) {
  const rows = Math.ceil(frames.length / columns);
  const gap = 12;
  const margin = 12;
  const output = makeImage(
    columns * cellSize + (columns - 1) * gap + margin * 2,
    rows * cellSize + (rows - 1) * gap + margin * 2,
    [255, 255, 255, 255],
  );

  frames.forEach((frame, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + col * (cellSize + gap);
    const y = margin + row * (cellSize + gap);
    paintChecker(output, x, y, cellSize, cellSize);
    drawImageScaled(output, frame, x, y, cellSize, cellSize);
  });

  return output;
}

function drawImageScaled(target, source, x, y, width, height) {
  const scale = Math.min(width / source.width, height / source.height);
  const drawWidth = Math.round(source.width * scale);
  const drawHeight = Math.round(source.height * scale);
  const offsetX = x + Math.round((width - drawWidth) / 2);
  const offsetY = y + Math.round((height - drawHeight) / 2);

  for (let targetY = 0; targetY < drawHeight; targetY += 1) {
    for (let targetX = 0; targetX < drawWidth; targetX += 1) {
      const sample = sampleBilinear(
        source,
        (targetX + 0.5) / scale - 0.5,
        (targetY + 0.5) / scale - 0.5,
      );
      blendPixel(target, offsetX + targetX, offsetY + targetY, sample);
    }
  }
}

function paintChecker(image, x, y, width, height) {
  const tile = 10;
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      const light = (Math.floor((xx - x) / tile) + Math.floor((yy - y) / tile)) % 2 === 0;
      setPixel(image, xx, yy, light ? [248, 246, 238, 255] : [238, 234, 222, 255]);
    }
  }
}

function applyChromaKey(image, key, { transparentDistance, opaqueDistance, alphaThreshold }) {
  const output = makeImage(image.width, image.height, [0, 0, 0, 0]);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * BYTES_PER_OUTPUT_PIXEL;
      const r = image.data[offset];
      const g = image.data[offset + 1];
      const b = image.data[offset + 2];
      const sourceAlpha = image.data[offset + 3];
      const distance = colorDistance({ r, g, b }, key);
      let alphaScale;

      if (distance <= transparentDistance) {
        alphaScale = 0;
      } else if (distance >= opaqueDistance) {
        alphaScale = 1;
      } else {
        const t = (distance - transparentDistance) / (opaqueDistance - transparentDistance);
        alphaScale = t * t * (3 - 2 * t);
      }

      const alpha = Math.round(sourceAlpha * alphaScale);
      if (alpha <= alphaThreshold) {
        continue;
      }

      const despilled = despill({ r, g, b }, key, alphaScale);
      output.data[offset] = despilled.r;
      output.data[offset + 1] = despilled.g;
      output.data[offset + 2] = despilled.b;
      output.data[offset + 3] = alpha;
    }
  }

  return output;
}

function despill(color, key, alphaScale) {
  if (alphaScale > 0.98) return color;

  const dominant = dominantChannel(key);
  const output = { ...color };
  const otherMax = dominant === "r"
    ? Math.max(color.g, color.b)
    : dominant === "g"
      ? Math.max(color.r, color.b)
      : Math.max(color.r, color.g);
  const channelValue = color[dominant];
  const spillLimit = otherMax + 24;

  if (channelValue > spillLimit) {
    output[dominant] = Math.round(spillLimit + (channelValue - spillLimit) * alphaScale);
  }

  return output;
}

function dominantChannel(color) {
  if (color.r >= color.g && color.r >= color.b) return "r";
  if (color.g >= color.r && color.g >= color.b) return "g";
  return "b";
}

function extractCell(sheet, row, col, rows, cols) {
  const x0 = Math.round((col * sheet.width) / cols);
  const x1 = Math.round(((col + 1) * sheet.width) / cols);
  const y0 = Math.round((row * sheet.height) / rows);
  const y1 = Math.round(((row + 1) * sheet.height) / rows);
  const width = x1 - x0;
  const height = y1 - y0;
  const output = makeImage(width, height, [0, 0, 0, 0]);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setPixel(output, x, y, getPixel(sheet, x0 + x, y0 + y));
    }
  }

  return output;
}

function findOpaqueBounds(image, alphaThreshold) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * BYTES_PER_OUTPUT_PIXEL + 3];
      if (alpha > alphaThreshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < 0 || maxY < 0) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function padBox(box, image, padding) {
  if (!box) return null;
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const maxX = Math.min(image.width, box.x + box.width + padding);
  const maxY = Math.min(image.height, box.y + box.height + padding);
  return {
    x,
    y,
    width: maxX - x,
    height: maxY - y,
  };
}

function estimateBorderColor(image) {
  const buckets = new Map();

  for (let y = 0; y < image.height; y += 1) {
    for (const x of [0, image.width - 1]) {
      addColorBucket(buckets, getPixel(image, x, y));
    }
  }
  for (let x = 0; x < image.width; x += 1) {
    for (const y of [0, image.height - 1]) {
      addColorBucket(buckets, getPixel(image, x, y));
    }
  }

  let best = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }

  if (!best) fail("Could not estimate chroma-key color from spritesheet border.");
  return {
    r: Math.round(best.r / best.count),
    g: Math.round(best.g / best.count),
    b: Math.round(best.b / best.count),
  };
}

function addColorBucket(buckets, color) {
  if (color[3] <= 8) return;
  const key = `${color[0] >> 4},${color[1] >> 4},${color[2] >> 4}`;
  const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
  bucket.count += 1;
  bucket.r += color[0];
  bucket.g += color[1];
  bucket.b += color[2];
  buckets.set(key, bucket);
}

function decodePng(filePath) {
  const file = readFileSync(filePath);
  if (!file.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`bad PNG signature: ${filePath}`);
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = file.subarray(dataStart, dataEnd);
    offset = dataEnd + 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`only 8-bit RGB/RGBA PNGs are supported, got bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const sourceBytesPerPixel = colorType === 6 ? 4 : 3;
  const sourceStride = width * sourceBytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const rgba = Buffer.alloc(width * height * BYTES_PER_OUTPUT_PIXEL);
  let sourceOffset = 0;
  let previousRow = Buffer.alloc(sourceStride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rawRow = inflated.subarray(sourceOffset, sourceOffset + sourceStride);
    sourceOffset += sourceStride;
    const decodedRow = unfilterRow(rawRow, previousRow, filter, sourceBytesPerPixel);
    previousRow = decodedRow;

    for (let x = 0; x < width; x += 1) {
      const sourceIndex = x * sourceBytesPerPixel;
      const targetIndex = (y * width + x) * BYTES_PER_OUTPUT_PIXEL;
      rgba[targetIndex] = decodedRow[sourceIndex];
      rgba[targetIndex + 1] = decodedRow[sourceIndex + 1];
      rgba[targetIndex + 2] = decodedRow[sourceIndex + 2];
      rgba[targetIndex + 3] = colorType === 6 ? decodedRow[sourceIndex + 3] : 255;
    }
  }

  return { width, height, data: rgba };
}

function unfilterRow(row, previousRow, filter, bytesPerPixel) {
  const output = Buffer.alloc(row.length);

  for (let i = 0; i < row.length; i += 1) {
    const left = i >= bytesPerPixel ? output[i - bytesPerPixel] : 0;
    const up = previousRow[i] || 0;
    const upLeft = i >= bytesPerPixel ? previousRow[i - bytesPerPixel] || 0 : 0;

    if (filter === 0) {
      output[i] = row[i];
    } else if (filter === 1) {
      output[i] = (row[i] + left) & 255;
    } else if (filter === 2) {
      output[i] = (row[i] + up) & 255;
    } else if (filter === 3) {
      output[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
    } else if (filter === 4) {
      output[i] = (row[i] + paethPredictor(left, up, upLeft)) & 255;
    } else {
      throw new Error(`unsupported PNG filter ${filter}`);
    }
  }

  return output;
}

function writePng(filePath, image) {
  const rawRows = [];
  const stride = image.width * BYTES_PER_OUTPUT_PIXEL;

  for (let y = 0; y < image.height; y += 1) {
    rawRows.push(Buffer.from([0]));
    rawRows.push(image.data.subarray(y * stride, (y + 1) * stride));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(Buffer.concat(rawRows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);

  writeFileSync(filePath, png);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);

  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  if (distanceUp <= distanceUpLeft) return up;
  return upLeft;
}

function sampleBilinear(image, x, y) {
  const x0 = clamp(Math.floor(x), 0, image.width - 1);
  const y0 = clamp(Math.floor(y), 0, image.height - 1);
  const x1 = clamp(x0 + 1, 0, image.width - 1);
  const y1 = clamp(y0 + 1, 0, image.height - 1);
  const tx = clamp(x - x0, 0, 1);
  const ty = clamp(y - y0, 0, 1);
  const c00 = getPixel(image, x0, y0);
  const c10 = getPixel(image, x1, y0);
  const c01 = getPixel(image, x0, y1);
  const c11 = getPixel(image, x1, y1);
  const top = lerpColor(c00, c10, tx);
  const bottom = lerpColor(c01, c11, tx);
  return lerpColor(top, bottom, ty);
}

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

function getPixel(image, x, y) {
  const offset = (y * image.width + x) * BYTES_PER_OUTPUT_PIXEL;
  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
    image.data[offset + 3],
  ];
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * BYTES_PER_OUTPUT_PIXEL;
  image.data[offset] = color[0];
  image.data[offset + 1] = color[1];
  image.data[offset + 2] = color[2];
  image.data[offset + 3] = color[3];
}

function blendPixel(image, x, y, source) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const target = getPixel(image, x, y);
  const sourceAlpha = source[3] / 255;
  const targetAlpha = target[3] / 255;
  const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outAlpha <= 0) {
    setPixel(image, x, y, [0, 0, 0, 0]);
    return;
  }

  setPixel(image, x, y, [
    Math.round((source[0] * sourceAlpha + target[0] * targetAlpha * (1 - sourceAlpha)) / outAlpha),
    Math.round((source[1] * sourceAlpha + target[1] * targetAlpha * (1 - sourceAlpha)) / outAlpha),
    Math.round((source[2] * sourceAlpha + target[2] * targetAlpha * (1 - sourceAlpha)) / outAlpha),
    Math.round(outAlpha * 255),
  ]);
}

function makeImage(width, height, color) {
  const data = Buffer.alloc(width * height * BYTES_PER_OUTPUT_PIXEL);
  for (let index = 0; index < width * height; index += 1) {
    data[index * BYTES_PER_OUTPUT_PIXEL] = color[0];
    data[index * BYTES_PER_OUTPUT_PIXEL + 1] = color[1];
    data[index * BYTES_PER_OUTPUT_PIXEL + 2] = color[2];
    data[index * BYTES_PER_OUTPUT_PIXEL + 3] = color[3];
  }
  return { width, height, data };
}

function colorDistance(a, b) {
  return Math.sqrt(
    (a.r - b.r) ** 2 +
    (a.g - b.g) ** 2 +
    (a.b - b.b) ** 2,
  );
}

function parseHexColor(value) {
  const match = String(value).match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) fail(`Expected chroma key as #rrggbb or auto, got ${value}`);
  const number = Number.parseInt(match[1], 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function colorToHex(color) {
  return `#${[color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function parsePivot(value) {
  const [x, y] = value.split(",").map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    fail("--pivot must be two 0-1 numbers, for example 0.5,0.8");
  }
  return { x, y };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      fail(`Unexpected positional argument: ${arg}`);
    }
    const withoutPrefix = arg.slice(2);
    if (withoutPrefix.startsWith("no-")) {
      parsed[withoutPrefix.slice(3)] = false;
      continue;
    }
    const equalsIndex = withoutPrefix.indexOf("=");
    if (equalsIndex >= 0) {
      parsed[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[withoutPrefix] = true;
      continue;
    }
    parsed[withoutPrefix] = next;
    index += 1;
  }
  return parsed;
}

function requiredPathOption(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.length === 0) fail(`Missing --${key}`);
  return value;
}

function requiredStringOption(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.length === 0) fail(`Missing --${key}`);
  return value;
}

function requiredIntegerOption(options, key, constraints) {
  if (options[key] === undefined) fail(`Missing --${key}`);
  return integerOption(options, key, undefined, constraints);
}

function integerOption(options, key, fallback, { min = -Infinity, max = Infinity } = {}) {
  const raw = options[key] ?? fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`--${key} must be an integer from ${min} to ${max}, got ${raw}`);
  }
  return value;
}

function stringOption(options, key, fallback, allowed = null) {
  const value = options[key] === undefined ? fallback : String(options[key]);
  if (allowed && !allowed.includes(value)) {
    fail(`--${key} must be one of ${allowed.join(", ")}, got ${value}`);
  }
  return value;
}

function listOption(options, key, fallback) {
  const value = options[key];
  if (value === undefined || value === true || value === "") return fallback;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugOption(options, key, fallback) {
  const value = String(options[key] ?? fallback);
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) fail(`--${key} must include at least one ascii letter or number`);
  return slug;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fail(message) {
  console.error(`prepare-spritesheet-sprite: ${message}`);
  process.exit(1);
}
