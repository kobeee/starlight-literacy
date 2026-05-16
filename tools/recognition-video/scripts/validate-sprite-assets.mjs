#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize } from "node:path";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BYTES_PER_PIXEL = 4;
const DEFAULT_MIN_PADDING = 2;
const DEFAULT_CHROMA_TOLERANCE = 12;
const DEFAULT_MOTION_PIXEL_DELTA = 42;

const manifestPaths = process.argv.slice(2);

if (manifestPaths.length === 0) {
  console.error("Usage: node tools/recognition-video/scripts/validate-sprite-assets.mjs <manifest.json> [...]");
  process.exit(1);
}

const failures = [];

for (const manifestPath of manifestPaths) {
  validateManifest(manifestPath, failures);
}

if (failures.length > 0) {
  console.error("Recognition sprite validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Recognition sprite validation ok: ${manifestPaths.length} manifest${manifestPaths.length === 1 ? "" : "s"}.`);

function validateManifest(manifestPath, errors) {
  const absoluteManifestPath = normalize(isAbsolute(manifestPath) ? manifestPath : join(process.cwd(), manifestPath));
  let manifest;

  try {
    manifest = JSON.parse(readFileSync(absoluteManifestPath, "utf8"));
  } catch (error) {
    errors.push(`${manifestPath}: cannot read valid JSON (${error.message})`);
    return;
  }

  const label = `${manifest.characterId || "unknown"}/${manifest.actor || "unknown"}/${manifest.action || "unknown"}`;
  const manifestDir = dirname(absoluteManifestPath);
  const frameSize = manifest.frameSize || {};
  const expectedWidth = Number(frameSize.width);
  const expectedHeight = Number(frameSize.height);
  const minFrames = Number(manifest.minFrames || 0);
  const frames = Array.isArray(manifest.frames) ? manifest.frames : [];
  const decodedFrames = [];

  if (manifest.schemaVersion !== "recognition-video-sprite/v1") {
    errors.push(`${label}: schemaVersion must be recognition-video-sprite/v1`);
  }

  if (!Number.isInteger(expectedWidth) || !Number.isInteger(expectedHeight)) {
    errors.push(`${label}: frameSize.width and frameSize.height must be integers`);
  }

  if (!Number.isInteger(minFrames) || minFrames < 4) {
    errors.push(`${label}: minFrames must be at least 4`);
  }

  if (frames.length < Math.max(4, minFrames || 0)) {
    errors.push(`${label}: expected at least ${Math.max(4, minFrames || 0)} frames, got ${frames.length}`);
  }

  const chromaKey = parseHexColor(manifest.chromaKey?.enabled ? manifest.chromaKey.color : null);

  frames.forEach((framePath, index) => {
    const absoluteFramePath = normalize(isAbsolute(framePath) ? framePath : join(manifestDir, framePath));
    let png;

    try {
      png = decodePng(absoluteFramePath);
    } catch (error) {
      errors.push(`${label}: frame ${index} ${framePath} is not a supported PNG (${error.message})`);
      return;
    }
    decodedFrames[index] = png;

    if (png.width !== expectedWidth || png.height !== expectedHeight) {
      errors.push(`${label}: frame ${index} ${framePath} has ${png.width}x${png.height}, expected ${expectedWidth}x${expectedHeight}`);
    }

    if (!png.hasAlpha) {
      errors.push(`${label}: frame ${index} ${framePath} must contain transparent pixels`);
    }

    const contentBox = findOpaqueBounds(png);
    if (!contentBox) {
      errors.push(`${label}: frame ${index} ${framePath} has no visible non-transparent pixels`);
      return;
    }

    const touchesEdge = (
      contentBox.minX < DEFAULT_MIN_PADDING ||
      contentBox.minY < DEFAULT_MIN_PADDING ||
      png.width - 1 - contentBox.maxX < DEFAULT_MIN_PADDING ||
      png.height - 1 - contentBox.maxY < DEFAULT_MIN_PADDING
    );

    if (touchesEdge) {
      errors.push(`${label}: frame ${index} ${framePath} visible content is too close to an edge; add padding to avoid crop risk`);
    }

    if (chromaKey && containsChromaResidue(png, chromaKey, DEFAULT_CHROMA_TOLERANCE)) {
      errors.push(`${label}: frame ${index} ${framePath} still contains chroma-key residue (${manifest.chromaKey.color})`);
    }
  });

  validatePoseContract(manifest, frames.length, label, errors);
  validateMotionChecks(manifest.motionChecks, decodedFrames, label, errors);
}

function decodePng(filePath) {
  const file = readFileSync(filePath);
  if (!file.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("bad PNG signature");
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

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`only 8-bit RGBA PNGs are supported, got bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const stride = width * BYTES_PER_PIXEL;
  const rgba = Buffer.alloc(height * stride);
  let sourceOffset = 0;
  let previousRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rawRow = inflated.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    const decodedRow = unfilterRow(rawRow, previousRow, filter, BYTES_PER_PIXEL);
    decodedRow.copy(rgba, y * stride);
    previousRow = decodedRow;
  }

  return {
    width,
    height,
    data: rgba,
    hasAlpha: hasTransparentPixels(rgba)
  };
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

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);

  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  if (distanceUp <= distanceUpLeft) return up;
  return upLeft;
}

function hasTransparentPixels(data) {
  for (let index = 3; index < data.length; index += BYTES_PER_PIXEL) {
    if (data[index] < 255) return true;
  }
  return false;
}

function findOpaqueBounds(png) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[(y * png.width + x) * BYTES_PER_PIXEL + 3];
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
}

function parseHexColor(color) {
  if (!color) return null;
  const match = color.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function containsChromaResidue(png, color, tolerance) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * BYTES_PER_PIXEL;
      const alpha = png.data[offset + 3];
      if (alpha <= 8) continue;

      const distance = Math.abs(png.data[offset] - color.r) +
        Math.abs(png.data[offset + 1] - color.g) +
        Math.abs(png.data[offset + 2] - color.b);

      if (distance <= tolerance) return true;
    }
  }

  return false;
}

function validatePoseContract(manifest, frameCount, label, errors) {
  const poseContract = manifest.poseContract;
  if (!poseContract) return;

  const requiredParts = Array.isArray(poseContract.requiredMotionParts) ? poseContract.requiredMotionParts : [];
  const poseFrames = Array.isArray(poseContract.frames) ? poseContract.frames : [];

  if (requiredParts.length === 0) {
    errors.push(`${label}: poseContract.requiredMotionParts must name the moving body parts`);
  }

  if (poseFrames.length < Math.max(4, Number(manifest.minFrames || 0))) {
    errors.push(`${label}: poseContract must describe at least ${Math.max(4, Number(manifest.minFrames || 0))} frames`);
  }

  const describedFrames = new Set();
  poseFrames.forEach((poseFrame) => {
    if (!Number.isInteger(poseFrame.frame) || poseFrame.frame < 0 || poseFrame.frame >= frameCount) {
      errors.push(`${label}: poseContract frame ${poseFrame.frame} is outside the sprite frame range 0-${frameCount - 1}`);
      return;
    }
    describedFrames.add(poseFrame.frame);
  });

  if (describedFrames.size < frameCount) {
    errors.push(`${label}: poseContract describes ${describedFrames.size}/${frameCount} frames; every frame needs a semantic pose`);
  }
}

function validateMotionChecks(checks, decodedFrames, label, errors) {
  if (!Array.isArray(checks) || checks.length === 0) return;
  const validFrames = decodedFrames.filter(Boolean);

  if (validFrames.length < 2) {
    errors.push(`${label}: motionChecks require at least two decoded frames`);
    return;
  }

  checks.forEach((check) => {
    const region = normalizeRegion(check.region, validFrames[0]);
    if (!region) {
      errors.push(`${label}: motion check ${check.id || "unknown"} has an invalid region`);
      return;
    }

    const minChangedPixels = Number(check.minChangedPixels);
    const minMeanDelta = Number(check.minMeanDelta);
    const minChangedFramePairs = Number(check.minChangedFramePairs);
    let changedPairs = 0;
    let maxChangedPixels = 0;
    let maxMeanDelta = 0;

    for (let index = 1; index < validFrames.length; index += 1) {
      const diff = diffRegion(validFrames[index - 1], validFrames[index], region);
      maxChangedPixels = Math.max(maxChangedPixels, diff.changedPixels);
      maxMeanDelta = Math.max(maxMeanDelta, diff.meanDelta);

      if (diff.changedPixels >= minChangedPixels && diff.meanDelta >= minMeanDelta) {
        changedPairs += 1;
      }
    }

    if (changedPairs < minChangedFramePairs) {
      errors.push(
        `${label}: motion check ${check.id || check.label || "unknown"} failed; ` +
        `expected ${minChangedFramePairs} changed frame pairs in ${check.label || "region"}, ` +
        `got ${changedPairs} (max changedPixels=${maxChangedPixels}, max meanDelta=${maxMeanDelta.toFixed(2)})`
      );
    }
  });
}

function normalizeRegion(region, png) {
  if (!region || !Number.isInteger(region.x) || !Number.isInteger(region.y) ||
      !Number.isInteger(region.width) || !Number.isInteger(region.height)) {
    return null;
  }

  const x = Math.max(0, region.x);
  const y = Math.max(0, region.y);
  const width = Math.min(region.width, png.width - x);
  const height = Math.min(region.height, png.height - y);

  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function diffRegion(previous, current, region) {
  let changedPixels = 0;
  let totalDelta = 0;
  const pixelCount = region.width * region.height;

  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const offset = (y * previous.width + x) * BYTES_PER_PIXEL;
      const delta = Math.abs(previous.data[offset] - current.data[offset]) +
        Math.abs(previous.data[offset + 1] - current.data[offset + 1]) +
        Math.abs(previous.data[offset + 2] - current.data[offset + 2]) +
        Math.abs(previous.data[offset + 3] - current.data[offset + 3]);

      totalDelta += delta;
      if (delta >= DEFAULT_MOTION_PIXEL_DELTA) changedPixels += 1;
    }
  }

  return {
    changedPixels,
    meanDelta: pixelCount > 0 ? totalDelta / pixelCount : 0
  };
}
