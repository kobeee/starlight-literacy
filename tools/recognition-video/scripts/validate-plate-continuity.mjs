#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { basename } from "node:path";

const HUE_DRIFT_DEG_MAX = 30;

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/validate-plate-continuity.mjs [--strict] <brief.json> [<brief.json>...]",
  );
  console.error(
    "Catches plate-to-plate hard cuts that share no subject / no palette / no transition (v8 'mountain→ray' blocker).",
  );
  process.exit(2);
}

const strict = args.includes("--strict");
const briefPaths = args.filter((a) => a !== "--strict");
const errors = [];
const warnings = [];

for (const briefPath of briefPaths) {
  const brief = readJson(briefPath, errors);
  if (!brief) continue;
  validateBrief({ brief, briefPath, errors, warnings });
}

if (warnings.length > 0) {
  console.error("Plate-continuity warnings:");
  for (const w of warnings) console.error(`- ${w}`);
}

if (errors.length > 0) {
  console.error("Plate-continuity check failed:");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`Plate-continuity ok: ${briefPaths.length} brief(s).`);

function validateBrief({ brief, briefPath, errors, warnings }) {
  const label = brief.characterId || basename(briefPath);
  const shotPlan = Array.isArray(brief.shotPlan) ? brief.shotPlan : [];

  for (let i = 1; i < shotPlan.length; i += 1) {
    const prev = shotPlan[i - 1];
    const cur = shotPlan[i];
    if (cur.id === "stroke-order-tail") continue;
    const cont = cur.continuityWithPrev;
    if (!cont) {
      const message = `${label}: shot "${cur.id}" (after "${prev.id}") has no continuityWithPrev — declare sharedSubjectIds / sharedPaletteHueRange / transitionalElementId so plate-to-plate cuts cannot ship as orphaned stills (v8 mountain→ray blocker).`;
      if (strict) errors.push(message);
      else warnings.push(message);
      continue;
    }
    const hasSubject = Array.isArray(cont.sharedSubjectIds) && cont.sharedSubjectIds.length > 0;
    const hasPalette = cont.sharedPaletteHueRange && typeof cont.sharedPaletteHueRange.hueDegMin === "number" && typeof cont.sharedPaletteHueRange.hueDegMax === "number";
    const hasTransitional = typeof cont.transitionalElementId === "string" && cont.transitionalElementId.length > 0;
    const allowsHardCut = cont.transitionType === "hard-cut" && hasSubject;

    if (!hasSubject && !hasPalette && !hasTransitional && !allowsHardCut) {
      errors.push(
        `${label}: shot "${cur.id}" continuityWithPrev declares none of sharedSubjectIds / sharedPaletteHueRange / transitionalElementId. Pure hard-cut between adjacent shots is forbidden.`,
      );
      continue;
    }

    if (hasPalette) {
      const prevPalette = prev.continuityWithPrev?.sharedPaletteHueRange;
      if (prevPalette) {
        const drift = computeHueDrift(prevPalette, cont.sharedPaletteHueRange);
        if (drift > HUE_DRIFT_DEG_MAX) {
          warnings.push(
            `${label}: shot "${cur.id}" hue range drifts ${drift.toFixed(1)}° from previous declared palette — exceeds ${HUE_DRIFT_DEG_MAX}° comfort window for child viewers.`,
          );
        }
      }
    }
  }
}

function computeHueDrift(a, b) {
  const aMid = ((a.hueDegMin + a.hueDegMax) / 2 + 360) % 360;
  const bMid = ((b.hueDegMin + b.hueDegMax) / 2 + 360) % 360;
  const diff = Math.abs(aMid - bMid);
  return diff > 180 ? 360 - diff : diff;
}

function readJson(filePath, targetErrors) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    targetErrors.push(`${filePath}: cannot read JSON (${error.message})`);
    return null;
  }
}
