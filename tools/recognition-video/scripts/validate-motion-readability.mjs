#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { basename } from "node:path";

const MIN_KEN_BURNS_SCALE_DELTA_PERCENT = 5;
const MIN_KEN_BURNS_TRANSLATE_PX = 24;
const MIN_GSAP_SCALE_DELTA_PERCENT = 5;
const MIN_GSAP_TRANSLATE_PX = 24;

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/validate-motion-readability.mjs <brief.json> [<brief.json>...]",
  );
  console.error(
    "Enforces visual-motion lower bounds and writing-implement visibility — addresses v8 blockers 'Ken Burns 14px = no motion' and 'mask reveal = wipe, not writing'.",
  );
  process.exit(2);
}

const errors = [];

for (const briefPath of args) {
  const brief = readJson(briefPath, errors);
  if (!brief) continue;
  validateBrief({ brief, briefPath, errors });
}

if (errors.length > 0) {
  console.error("Motion-readability check failed:");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`Motion-readability ok: ${args.length} brief(s).`);

function validateBrief({ brief, briefPath, errors }) {
  const label = brief.characterId || basename(briefPath);
  const shotPlan = Array.isArray(brief.shotPlan) ? brief.shotPlan : [];
  const animReq = brief.animationRequirements || {};
  const shotMotion = Array.isArray(animReq.shotMotion) ? animReq.shotMotion : [];
  const writingImplements = Array.isArray(animReq.writingImplements) ? animReq.writingImplements : [];

  const shotById = new Map(shotPlan.map((s) => [s.id, s]));
  const motionById = new Map(shotMotion.map((m) => [m.shotId, m]));
  const implementsByShotId = new Map(writingImplements.map((w) => [w.shotId, w]));

  for (const motion of shotMotion) {
    if (!shotById.has(motion.shotId)) {
      errors.push(
        `${label}: animationRequirements.shotMotion references shotId="${motion.shotId}" which is not in shotPlan.`,
      );
    }
  }

  for (const shot of shotPlan) {
    if (shot.id === "stroke-order-tail") continue;
    const motion = motionById.get(shot.id);
    if (!motion) {
      errors.push(
        `${label}: shot "${shot.id}" has no animationRequirements.shotMotion entry — declare animationDriver + effective delta so 'invisible Ken Burns' regressions cannot pass.`,
      );
      continue;
    }
    enforceMotionDelta({ label, shot, motion, errors });
  }

  for (const shot of shotPlan) {
    const description = `${shot.purpose || ""} ${shot.description || ""}`.toLowerCase();
    const writesGlyph = /渗墨|writing|stroke|笔顺|横笔|mask reveal|ink-glyph|glyph-write/.test(description);
    if (!writesGlyph) continue;
    if (shot.id === "stroke-order-tail") continue;
    const impl = implementsByShotId.get(shot.id);
    if (!impl) {
      errors.push(
        `${label}: shot "${shot.id}" appears to animate a stroke (description matches writing keywords) but has no animationRequirements.writingImplements entry. Declare ink-front-bloom or *-sprite that tracks the mask front, or rename the shot if no writing happens (root cause: v8 'mask reveal = wipe, not writing').`,
      );
    } else if (impl.tracksMaskFront !== true) {
      errors.push(
        `${label}: writingImplements entry for "${shot.id}" must set tracksMaskFront=true; a static prop in the corner does not count.`,
      );
    }
  }
}

function enforceMotionDelta({ label, shot, motion, errors }) {
  const driver = motion.animationDriver;
  if (driver === "sprite-only") return;
  if (driver === "static-with-overlay") {
    if (!motion.diegeticOverlayId) {
      errors.push(
        `${label}: shot "${shot.id}" animationDriver=static-with-overlay requires diegeticOverlayId.`,
      );
    }
    return;
  }
  if (driver === "css-mask-reveal") {
    return;
  }

  const scale = motion.effectiveScaleDeltaPercent;
  const translate = motion.effectiveTranslatePx;
  const hasOverlay = typeof motion.diegeticOverlayId === "string" && motion.diegeticOverlayId.length > 0;

  const minScale = driver === "ken-burns" ? MIN_KEN_BURNS_SCALE_DELTA_PERCENT : MIN_GSAP_SCALE_DELTA_PERCENT;
  const minTranslate = driver === "ken-burns" ? MIN_KEN_BURNS_TRANSLATE_PX : MIN_GSAP_TRANSLATE_PX;

  const scaleOk = typeof scale === "number" && scale >= minScale;
  const translateOk = typeof translate === "number" && translate >= minTranslate;

  if (!scaleOk && !translateOk && !hasOverlay) {
    errors.push(
      `${label}: shot "${shot.id}" animationDriver="${driver}" declares effectiveScaleDeltaPercent=${scale ?? "(missing)"} and effectiveTranslatePx=${translate ?? "(missing)"} — neither meets the perceptibility floor (scale ≥ ${minScale}% OR translate ≥ ${minTranslate}px) and no diegeticOverlayId is present. Children at child viewport will read this as a still photograph (v8 blocker root cause).`,
    );
  }
}

function readJson(filePath, targetErrors) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    targetErrors.push(`${filePath}: cannot read JSON (${error.message})`);
    return null;
  }
}
