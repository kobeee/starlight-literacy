#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const MIN_CUE_HOLD_SECONDS = 1.2;
const MIN_FINAL_HOLD_SECONDS = 2.0;
const MAX_SCENE_CHANGES_PER_SECOND = 0.75;
const MIN_SHOT_SECONDS = 1.0;
const MAX_ALLOWED_SHOT_OVERLAP_SECONDS = 0.25;
const MAX_ALLOWED_SHOT_GAP_SECONDS = 0.35;

const args = process.argv.slice(2);

if (args.length === 0 || args.length % 2 !== 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/validate-teaching-harness.mjs <brief.json> <asset-plan.json> [<brief.json> <asset-plan.json>...]",
  );
  process.exit(2);
}

const errors = [];

for (let index = 0; index < args.length; index += 2) {
  const briefPath = args[index];
  const assetPlanPath = args[index + 1];
  const brief = readJson(briefPath, errors);
  const assetPlan = readJson(assetPlanPath, errors);

  if (!brief || !assetPlan) {
    continue;
  }

  validatePair({ brief, briefPath, assetPlan, assetPlanPath, errors });
}

if (errors.length > 0) {
  console.error("Recognition teaching harness failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Recognition teaching harness ok: ${args.length / 2} pair(s).`);

function readJson(filePath, targetErrors) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    targetErrors.push(`${filePath}: cannot read JSON (${error.message})`);
    return null;
  }
}

function validatePair({ brief, briefPath, assetPlan, assetPlanPath, errors }) {
  const label = brief.characterId || basename(briefPath);

  check(
    brief.schemaVersion === "recognition-video-brief/v1",
    errors,
    label,
    "brief.schemaVersion must be recognition-video-brief/v1.",
  );
  check(
    assetPlan.schemaVersion === "recognition-video-asset-plan/v1",
    errors,
    label,
    "assetPlan.schemaVersion must be recognition-video-asset-plan/v1.",
  );
  check(
    brief.characterId === assetPlan.characterId,
    errors,
    label,
    `characterId mismatch between ${briefPath} and ${assetPlanPath}.`,
  );
  check(brief.fps === 24, errors, label, "brief.fps must stay at 24 for P03 recognition clips.");
  check(
    isNumber(brief.duration) && brief.duration >= 3 && brief.duration <= 8,
    errors,
    label,
    "brief.duration must be within the 3-8 second recognition-video window.",
  );

  validateNarration({ brief, assetPlan, errors, label });
  validateShotPlan({ brief, errors, label });
  validatePacing({ brief, errors, label });
  validateTeachingContract({ brief, errors, label });
  validateAssetPlan({ assetPlan, errors, label });
  validateAssetCoverage({ brief, assetPlan, errors, label });
  validateSpriteContracts({ brief, assetPlan, errors, label });
}

function validateNarration({ brief, assetPlan, errors, label }) {
  const script = brief.narration?.script;
  const cues = Array.isArray(brief.narration?.cues) ? brief.narration.cues : [];

  check(typeof script === "string" && script.trim().length >= 4, errors, label, "narration.script is required.");
  check(cues.length > 0, errors, label, "narration.cues must declare child-facing cue timing.");

  let previousAt = -Infinity;
  for (const cue of cues) {
    check(isNumber(cue.at), errors, label, `narration cue "${cue.text}" must have numeric at.`);
    if (isNumber(cue.at)) {
      check(cue.at >= 0 && cue.at <= brief.duration, errors, label, `narration cue "${cue.text}" is outside duration.`);
      check(cue.at >= previousAt, errors, label, `narration cue "${cue.text}" is out of order.`);
      if (previousAt >= 0) {
        const gap = cue.at - previousAt;
        check(
          gap >= brief.pacingRequirements?.minimumCueHoldSeconds,
          errors,
          label,
          `narration cues are too fast: "${cue.text}" starts ${gap.toFixed(2)}s after the previous cue.`,
        );
      }
      previousAt = cue.at;
    }
  }

  if (assetPlan.audio?.script) {
    check(
      normalizeText(assetPlan.audio.script) === normalizeText(script),
      errors,
      label,
      "assetPlan.audio.script must match brief.narration.script.",
    );
  }
}

function validateShotPlan({ brief, errors, label }) {
  const shots = Array.isArray(brief.shotPlan) ? brief.shotPlan : [];
  check(shots.length >= 3, errors, label, "shotPlan must contain at least 3 teaching beats.");

  const ids = new Set();
  for (const shot of shots) {
    check(typeof shot.id === "string" && shot.id.length > 0, errors, label, "each shot must have an id.");
    if (shot.id) {
      check(!ids.has(shot.id), errors, label, `duplicate shot id "${shot.id}".`);
      ids.add(shot.id);
    }
    check(isNumber(shot.start) && shot.start >= 0, errors, label, `shot "${shot.id}" must have non-negative start.`);
    check(isNumber(shot.duration) && shot.duration >= MIN_SHOT_SECONDS, errors, label, `shot "${shot.id}" is too short.`);
    if (isNumber(shot.start) && isNumber(shot.duration) && isNumber(brief.duration)) {
      check(
        shot.start + shot.duration <= brief.duration + MAX_ALLOWED_SHOT_OVERLAP_SECONDS,
        errors,
        label,
        `shot "${shot.id}" extends past clip duration.`,
      );
    }
  }

  const ordered = [...shots].sort((a, b) => a.start - b.start);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    const delta = current.start - (previous.start + previous.duration);

    check(
      delta >= -MAX_ALLOWED_SHOT_OVERLAP_SECONDS,
      errors,
      label,
      `shot "${current.id}" overlaps "${previous.id}" by more than ${MAX_ALLOWED_SHOT_OVERLAP_SECONDS}s.`,
    );
    check(
      delta <= MAX_ALLOWED_SHOT_GAP_SECONDS,
      errors,
      label,
      `shot "${current.id}" leaves a dead gap after "${previous.id}".`,
    );
  }

  const sceneChangesPerSecond = Math.max(0, shots.length - 1) / brief.duration;
  check(
    sceneChangesPerSecond <= (brief.pacingRequirements?.maximumSceneChangesPerSecond ?? MAX_SCENE_CHANGES_PER_SECOND),
    errors,
    label,
    `shotPlan changes scenes too quickly (${sceneChangesPerSecond.toFixed(2)}/s).`,
  );
}

function validatePacing({ brief, errors, label }) {
  const pacing = brief.pacingRequirements;
  check(Boolean(pacing), errors, label, "pacingRequirements is required; prompt-only timing is not enough.");
  if (!pacing) {
    return;
  }

  check(
    pacing.minimumCueHoldSeconds >= MIN_CUE_HOLD_SECONDS,
    errors,
    label,
    `minimumCueHoldSeconds must be at least ${MIN_CUE_HOLD_SECONDS}s for young children.`,
  );
  check(
    pacing.minimumFinalHoldSeconds >= MIN_FINAL_HOLD_SECONDS,
    errors,
    label,
    `minimumFinalHoldSeconds must be at least ${MIN_FINAL_HOLD_SECONDS}s so the glyph can be recognized.`,
  );
  check(
    pacing.maximumSceneChangesPerSecond <= MAX_SCENE_CHANGES_PER_SECOND,
    errors,
    label,
    `maximumSceneChangesPerSecond must be <= ${MAX_SCENE_CHANGES_PER_SECOND}.`,
  );
  check(
    /3|4|5|6|3-6/.test(String(pacing.audienceAgeRange)),
    errors,
    label,
    "audienceAgeRange must explicitly target young recognition learners.",
  );
  check(
    /P03|认字|recognition/i.test(String(pacing.productSurface)),
    errors,
    label,
    "productSurface must name the recognition-learning surface, not a generic demo.",
  );

  const finalShot = latestShot(brief.shotPlan);
  if (finalShot) {
    check(
      finalShot.duration >= pacing.minimumFinalHoldSeconds,
      errors,
      label,
      `final shot "${finalShot.id}" must hold for at least minimumFinalHoldSeconds.`,
    );
  }
}

function validateTeachingContract({ brief, errors, label }) {
  const contract = brief.teachingContract;
  check(Boolean(contract), errors, label, "teachingContract is required to enforce the Hongen-style learning structure.");
  if (!contract) {
    return;
  }

  check(
    contract.sourceModel === "hongen-micro-lesson/v1",
    errors,
    label,
    "teachingContract.sourceModel must be hongen-micro-lesson/v1.",
  );

  const shotsById = new Map((brief.shotPlan || []).map((shot) => [shot.id, shot]));
  const meaningShot = shotsById.get(contract.meaningAction?.shotId);
  const glyphBindingShot = shotsById.get(contract.glyphBinding?.shotId);
  const phraseShot = shotsById.get(contract.phraseBridge?.shotId);

  check(Boolean(meaningShot), errors, label, "teachingContract.meaningAction.shotId must exist in shotPlan.");
  check(Boolean(glyphBindingShot), errors, label, "teachingContract.glyphBinding.shotId must exist in shotPlan.");
  check(Boolean(phraseShot), errors, label, "teachingContract.phraseBridge.shotId must exist in shotPlan.");

  if (meaningShot && phraseShot) {
    check(
      meaningShot.start < phraseShot.start,
      errors,
      label,
      "meaningAction must happen before the phrase/glyph closure.",
    );
  }

  check(
    contract.meaningAction?.mustPrecedeGlyphClosure === true,
    errors,
    label,
    "meaningAction.mustPrecedeGlyphClosure must be true.",
  );
  check(
    Array.isArray(contract.glyphBinding?.boundElements) && contract.glyphBinding.boundElements.length >= 2,
    errors,
    label,
    "glyphBinding.boundElements must connect at least two semantic/shape elements.",
  );
  check(
    containsCharacter(contract.phraseBridge?.phrase, brief.character),
    errors,
    label,
    "phraseBridge.phrase must include the target character.",
  );
  check(
    includesText(brief.narration?.script, contract.phraseBridge?.phrase),
    errors,
    label,
    "phraseBridge.phrase must appear in narration.script.",
  );
  check(
    normalizeText(contract.sentenceBridge?.sentence) === normalizeText(brief.narration?.script),
    errors,
    label,
    "sentenceBridge.sentence must match narration.script.",
  );
  check(
    ["late", "late-or-omitted", "omitted"].includes(contract.writingPosition),
    errors,
    label,
    "writingPosition must keep writing late or omitted for short recognition clips.",
  );
  check(
    ["supporting", "none"].includes(contract.mascotRole),
    errors,
    label,
    "mascotRole must be supporting or none; mascots cannot become the lesson.",
  );
  check(
    typeof contract.practiceOrRepeat?.description === "string" &&
      contract.practiceOrRepeat.description.trim().length >= 4,
    errors,
    label,
    "practiceOrRepeat must explain how the learner sees the character again.",
  );

  const pauses = Array.isArray(contract.recognitionPauses) ? contract.recognitionPauses : [];
  check(pauses.length >= 2, errors, label, "recognitionPauses must include at least meaning and final-glyph pauses.");

  for (const pause of pauses) {
    check(shotsById.has(pause.shotId), errors, label, `recognition pause shot "${pause.shotId}" does not exist.`);
    check(
      pause.seconds >= brief.pacingRequirements?.minimumCueHoldSeconds,
      errors,
      label,
      `recognition pause "${pause.target}" is shorter than minimumCueHoldSeconds.`,
    );
  }

  const finalPause = pauses.find((pause) => pause.shotId === contract.phraseBridge?.shotId);
  check(Boolean(finalPause), errors, label, "recognitionPauses must include the phrase/glyph closure shot.");
  if (finalPause) {
    check(
      finalPause.seconds >= brief.pacingRequirements?.minimumFinalHoldSeconds,
      errors,
      label,
      "final recognition pause must satisfy minimumFinalHoldSeconds.",
    );
  }
}

function validateAssetPlan({ assetPlan, errors, label }) {
  check(
    assetPlan.textRendering?.rasterImagesMayContainText === false,
    errors,
    label,
    "textRendering.rasterImagesMayContainText must be false; Chinese/pinyin belongs in HTML/SVG/canvas.",
  );
  check(
    ["html-css", "svg", "canvas"].includes(assetPlan.textRendering?.renderer),
    errors,
    label,
    "textRendering.renderer must be html-css, svg, or canvas.",
  );

  for (const plate of assetPlan.plates || []) {
    if (plate.path) {
      checkPathExists(plate.path, errors, label, `plate "${plate.id}"`);
    }
  }

  if (assetPlan.audio?.path) {
    checkPathExists(assetPlan.audio.path, errors, label, "audio");
  }
  if (assetPlan.audio?.audioPlan) {
    checkPathExists(assetPlan.audio.audioPlan, errors, label, "audioPlan");
  }
}

function validateAssetCoverage({ brief, assetPlan, errors, label }) {
  const assetIds = new Set();
  for (const groupName of ["plates", "cutouts", "sprites"]) {
    for (const item of assetPlan[groupName] || []) {
      if (item.id) {
        assetIds.add(item.id);
      }
    }
  }

  for (const shot of brief.shotPlan || []) {
    for (const requiredAsset of shot.requiredAssets || []) {
      if (requiredAsset.startsWith("html-")) {
        check(
          ["html-css", "svg", "canvas"].includes(assetPlan.textRendering?.renderer),
          errors,
          label,
          `shot "${shot.id}" requires ${requiredAsset}, but no text renderer is declared.`,
        );
        continue;
      }
      check(assetIds.has(requiredAsset), errors, label, `shot "${shot.id}" requires missing asset "${requiredAsset}".`);
    }
  }
}

function validateSpriteContracts({ brief, assetPlan, errors, label }) {
  const requiredSprites = brief.animationRequirements?.spriteRequired || [];
  const plannedSprites = assetPlan.sprites || [];

  check(requiredSprites.length > 0, errors, label, "animationRequirements.spriteRequired cannot be empty.");

  for (const required of requiredSprites) {
    const spriteLabel = `${required.actor}/${required.action}`;
    const planned = plannedSprites.find(
      (sprite) => sprite.actor === required.actor && sprite.action === required.action,
    );

    check(
      Array.isArray(required.requiredMotionParts) && required.requiredMotionParts.length > 0,
      errors,
      label,
      `spriteRequired ${spriteLabel} must list requiredMotionParts.`,
    );
    check(
      Array.isArray(required.poseContract) && required.poseContract.length >= required.minFrames,
      errors,
      label,
      `spriteRequired ${spriteLabel} must include a poseContract for every required frame.`,
    );

    const poseFrames = new Set((required.poseContract || []).map((pose) => pose.frame));
    for (let frame = 0; frame < required.minFrames; frame += 1) {
      check(poseFrames.has(frame), errors, label, `spriteRequired ${spriteLabel} is missing pose frame ${frame}.`);
    }

    check(Boolean(planned), errors, label, `assetPlan.sprites is missing required action ${spriteLabel}.`);
    if (!planned) {
      continue;
    }

    check(
      planned.minFrames >= required.minFrames,
      errors,
      label,
      `assetPlan sprite ${planned.id} has fewer frames than the brief requires.`,
    );

    for (const part of required.requiredMotionParts || []) {
      check(
        planned.requiredMotionParts?.includes(part),
        errors,
        label,
        `assetPlan sprite ${planned.id} does not carry required motion part "${part}".`,
      );
    }

    check(Boolean(planned.manifest), errors, label, `assetPlan sprite ${planned.id} must point to a manifest.`);
    if (!planned.manifest) {
      continue;
    }

    checkPathExists(planned.manifest, errors, label, `sprite manifest "${planned.id}"`);
    if (existsSync(resolve(planned.manifest))) {
      validateSpriteManifest({ manifestPath: planned.manifest, required, planned, errors, label });
    }
  }
}

function validateSpriteManifest({ manifestPath, required, planned, errors, label }) {
  const manifest = readJson(manifestPath, errors);
  if (!manifest) {
    return;
  }

  const spriteLabel = `${required.actor}/${required.action}`;

  check(manifest.actor === required.actor, errors, label, `manifest ${manifestPath} actor mismatch for ${spriteLabel}.`);
  check(manifest.action === required.action, errors, label, `manifest ${manifestPath} action mismatch for ${spriteLabel}.`);
  check(manifest.id === planned.id, errors, label, `manifest ${manifestPath} id must match assetPlan sprite id.`);
  check(manifest.minFrames >= required.minFrames, errors, label, `manifest ${manifestPath} minFrames is too low.`);
  check(
    Array.isArray(manifest.frames) && manifest.frames.length >= required.minFrames,
    errors,
    label,
    `manifest ${manifestPath} has too few PNG frames.`,
  );
  check(Boolean(manifest.poseContract), errors, label, `manifest ${manifestPath} must include poseContract.`);
  check(
    Array.isArray(manifest.poseContract?.frames) && manifest.poseContract.frames.length >= required.minFrames,
    errors,
    label,
    `manifest ${manifestPath} poseContract.frames is incomplete.`,
  );
  check(
    Array.isArray(manifest.motionChecks) && manifest.motionChecks.length > 0,
    errors,
    label,
    `manifest ${manifestPath} must include motionChecks to catch static-part fake animation.`,
  );
}

function checkPathExists(path, errors, label, subject) {
  check(existsSync(resolve(path)), errors, label, `${subject} path does not exist: ${path}`);
}

function latestShot(shots) {
  if (!Array.isArray(shots) || shots.length === 0) {
    return null;
  }

  return [...shots].sort((a, b) => a.start + a.duration - (b.start + b.duration)).at(-1);
}

function containsCharacter(text, character) {
  return typeof text === "string" && typeof character === "string" && text.includes(character);
}

function includesText(text, expected) {
  return typeof text === "string" && typeof expected === "string" && normalizeText(text).includes(normalizeText(expected));
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, "");
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function check(condition, errors, label, message) {
  if (!condition) {
    errors.push(`${label}: ${message}`);
  }
}
