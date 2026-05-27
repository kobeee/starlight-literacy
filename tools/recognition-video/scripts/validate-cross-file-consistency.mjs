#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const args = process.argv.slice(2);

if (args.length < 1) {
  console.error(
    "Usage: node tools/recognition-video/scripts/validate-cross-file-consistency.mjs <brief.json> [<brief.json>...]",
  );
  console.error(
    "Walks brief.tailSpecRef, brief.narrationSpecRef, brief.pacingRequirements and cross-checks structural fields against the linked specs + mizige-anchors. Catches v8-class spec contradictions that pass single-file validators.",
  );
  process.exit(2);
}

const errors = [];
const warnings = [];

for (const briefPath of args) {
  const brief = readJson(briefPath, errors);
  if (!brief) continue;
  validateBrief({ brief, briefPath, errors, warnings });
}

if (warnings.length > 0) {
  console.error("Cross-file consistency warnings:");
  for (const w of warnings) console.error(`- ${w}`);
}

if (errors.length > 0) {
  console.error("Cross-file consistency failed:");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`Cross-file consistency ok: ${args.length} brief(s).`);

function validateBrief({ brief, briefPath, errors, warnings }) {
  const label = brief.characterId || basename(briefPath);
  const briefDir = dirname(resolve(briefPath));

  const tailSpec = resolveRef({
    ref: brief.tailSpecRef,
    briefDir,
    expectedSchema: "recognition-video-tail-spec/v1",
    label,
    refName: "tailSpecRef",
    errors,
  });

  const narrationSpec = resolveRef({
    ref: brief.narrationSpecRef,
    briefDir,
    expectedSchema: "recognition-video-narration-spec/v1",
    label,
    refName: "narrationSpecRef",
    errors,
  });

  if (tailSpec) {
    const tailSpecDir = dirname(resolve(briefDir, brief.tailSpecRef.path));
    const anchors = resolveAnchorsForTail({ tailSpec, tailSpecDir, label, errors });
    validateBriefVsTailSpec({ brief, tailSpec, anchors, label, errors, warnings });
    validateAnchorsVsTailSpec({ tailSpec, anchors, label, errors });
  }

  if (narrationSpec) {
    validateBriefVsNarrationSpec({ brief, narrationSpec, label, errors });
  }

  validateShotPlanVsPacing({ brief, label, errors, warnings });
}

function validateBriefVsTailSpec({ brief, tailSpec, anchors, label, errors, warnings }) {
  const tailFinal = tailSpec.finalFrame || {};
  const briefFinal = brief.finalFrame || {};
  const guide = briefFinal.guideObject;

  if (!guide) {
    errors.push(
      `${label}: brief.tailSpecRef is set but brief.finalFrame.guideObject is missing — when a tail spec is linked, the brief MUST declare guideObject.form/anchor/entryDirection so cross-file alignment can be checked. Self-contradictions in brief.finalFrame.description-only text are how v8 shipped a brush/hand mismatch.`,
    );
  } else {
    if (typeof tailFinal.pointerForm === "string" && tailFinal.pointerForm !== guide.form) {
      errors.push(
        `${label}: brief.finalFrame.guideObject.form="${guide.form}" disagrees with tail-spec.finalFrame.pointerForm="${tailFinal.pointerForm}". This is the v8-class spec contradiction — pick ONE form for the poster.`,
      );
    }
    if (anchors) {
      const allowed = anchors.hand?.allowedPointerForms || [];
      if (allowed.length > 0 && !allowed.includes(guide.form)) {
        errors.push(
          `${label}: brief.finalFrame.guideObject.form="${guide.form}" is not in mizige-anchors.hand.allowedPointerForms [${allowed.join(", ")}]. Edit anchors first if extending the brand pointer policy.`,
        );
      }
      const expectedDir = `${anchors.hand?.entryEdge || ""}-${anchors.hand?.entryAngleDeg ?? ""}deg`;
      if (guide.entryDirection !== expectedDir) {
        errors.push(
          `${label}: brief.finalFrame.guideObject.entryDirection="${guide.entryDirection}" disagrees with mizige-anchors.hand entry (entryEdge="${anchors.hand?.entryEdge}", entryAngleDeg=${anchors.hand?.entryAngleDeg}). Expected "${expectedDir}".`,
        );
      }
    }
  }

  const minHold = brief.pacingRequirements?.minimumFinalHoldSeconds;
  const declaredHold = briefFinal.posterHoldSeconds;
  if (typeof minHold === "number" && typeof declaredHold === "number") {
    if (declaredHold + 0.0001 < minHold) {
      errors.push(
        `${label}: brief.finalFrame.posterHoldSeconds=${declaredHold} < brief.pacingRequirements.minimumFinalHoldSeconds=${minHold}. These two MUST agree; otherwise either the pacing requirement is unmet or the brief's own promise is wrong.`,
      );
    }
  }
  if (typeof minHold === "number" && anchors) {
    const tailFinalHold = anchors.timing?.finalHoldSeconds ?? 0;
    const tailDwell = computeTailFinalDwell({ tailSpec, anchors });
    const totalAvailableDwell = Math.max(tailFinalHold, tailDwell);
    const tailShot = pickStrokeOrderTailShot({ brief });
    let extraDwellOutsideTail = 0;
    if (tailShot && typeof tailShot.duration === "number") {
      extraDwellOutsideTail = Math.max(0, tailShot.duration - (anchors.timing?.totalDurationSeconds ?? totalAvailableDwell));
    }
    const reachable = totalAvailableDwell + extraDwellOutsideTail;
    if (reachable + 0.0001 < minHold) {
      errors.push(
        `${label}: pacingRequirements.minimumFinalHoldSeconds=${minHold} is unreachable — tail-spec strokeOrder leaves only ~${totalAvailableDwell.toFixed(2)}s dwell (anchors.timing.finalHoldSeconds=${tailFinalHold} or measured ${tailDwell.toFixed(2)}s) and shotPlan adds only ${extraDwellOutsideTail.toFixed(2)}s outside the tail window. Either extend the tail/shot, shorten earlier phases, or relax the requirement.`,
      );
    }
  }

  const tailRefShot = pickStrokeOrderTailShot({ brief });
  if (tailRefShot && anchors?.timing?.totalDurationSeconds) {
    const tailTotal = anchors.timing.totalDurationSeconds;
    if (typeof tailRefShot.duration === "number" && tailRefShot.duration + 0.0001 < tailTotal) {
      errors.push(
        `${label}: brief.shotPlan.stroke-order-tail duration=${tailRefShot.duration}s is shorter than anchors.timing.totalDurationSeconds=${tailTotal}s — the tail cannot finish writing + holding in less than its anchored budget.`,
      );
    }
  }

  if (brief.duration && tailSpec.strokeOrder) {
    const tailEnd = Math.max(
      0,
      ...tailSpec.strokeOrder.map((s) => (typeof s.phaseEndSeconds === "number" ? s.phaseEndSeconds : 0)),
    );
    if (anchors?.timing?.finalHoldSeconds && tailEnd + anchors.timing.finalHoldSeconds > (anchors.timing.totalDurationSeconds ?? Infinity) + 0.001) {
      warnings.push(
        `${label}: tail strokeOrder ends at ${tailEnd.toFixed(2)}s + finalHold ${anchors.timing.finalHoldSeconds}s exceeds tail total ${anchors.timing.totalDurationSeconds}s — tail timeline is overflowing.`,
      );
    }
  }
}

function pickStrokeOrderTailShot({ brief }) {
  const shotPlan = Array.isArray(brief.shotPlan) ? brief.shotPlan : [];
  return shotPlan.find((s) => s.id === "stroke-order-tail") || null;
}

function computeTailFinalDwell({ tailSpec, anchors }) {
  const tailTotal = anchors?.timing?.totalDurationSeconds ?? 0;
  const lastEnd = Math.max(
    0,
    ...(Array.isArray(tailSpec.strokeOrder)
      ? tailSpec.strokeOrder.map((s) => (typeof s.phaseEndSeconds === "number" ? s.phaseEndSeconds : 0))
      : []),
  );
  return Math.max(0, tailTotal - lastEnd);
}

function validateAnchorsVsTailSpec({ tailSpec, anchors, label, errors }) {
  if (!anchors) return;
  const tailFinal = tailSpec.finalFrame || {};
  const allowed = anchors.hand?.allowedPointerForms || [];
  if (allowed.length > 0 && typeof tailFinal.pointerForm === "string" && !allowed.includes(tailFinal.pointerForm)) {
    errors.push(
      `${label}: tail-spec.finalFrame.pointerForm="${tailFinal.pointerForm}" is not in mizige-anchors.hand.allowedPointerForms [${allowed.join(", ")}]. tail-spec validator catches this too but cross-file check is the canonical fence.`,
    );
  }
}

function validateBriefVsNarrationSpec({ brief, narrationSpec, label, errors }) {
  const briefScript = brief.narration?.script;
  const specScript = narrationSpec.script;
  if (typeof briefScript === "string" && typeof specScript === "string") {
    const a = briefScript.replace(/\s+/g, "");
    const b = specScript.replace(/\s+/g, "");
    if (a !== b) {
      errors.push(
        `${label}: brief.narration.script disagrees with narration-spec.script. brief="${briefScript}" / spec="${specScript}". Spec is authoritative — update brief or spec.`,
      );
    }
  }
  const briefChar = brief.character;
  const specChar = narrationSpec.targetCharacter;
  if (typeof briefChar === "string" && typeof specChar === "string" && briefChar !== specChar) {
    errors.push(
      `${label}: brief.character="${briefChar}" disagrees with narration-spec.targetCharacter="${specChar}".`,
    );
  }
}

function validateShotPlanVsPacing({ brief, label, errors, warnings }) {
  const shotPlan = Array.isArray(brief.shotPlan) ? brief.shotPlan : [];
  const minCueHold = brief.pacingRequirements?.minimumCueHoldSeconds;
  if (typeof minCueHold !== "number") return;
  for (const shot of shotPlan) {
    if (typeof shot.duration === "number" && shot.duration + 0.0001 < minCueHold && shot.id !== "stroke-order-tail") {
      warnings.push(
        `${label}: shotPlan "${shot.id}" duration=${shot.duration}s is below minimumCueHoldSeconds=${minCueHold}s — child cannot consolidate the cue.`,
      );
    }
  }
}

function resolveRef({ ref, briefDir, expectedSchema, label, refName, errors }) {
  if (!ref) return null;
  if (typeof ref.path !== "string") {
    errors.push(`${label}: ${refName}.path is required when ${refName} is present.`);
    return null;
  }
  const filePath = resolve(briefDir, ref.path);
  if (!existsSync(filePath)) {
    errors.push(`${label}: ${refName}.path "${ref.path}" does not resolve to an existing file (${filePath}).`);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (err) {
    errors.push(`${label}: cannot parse JSON at ${filePath} (${err.message}).`);
    return null;
  }
  if (ref.schemaVersion && parsed.schemaVersion !== ref.schemaVersion) {
    errors.push(
      `${label}: ${refName}.schemaVersion="${ref.schemaVersion}" disagrees with file schemaVersion="${parsed.schemaVersion}".`,
    );
  }
  if (expectedSchema && parsed.schemaVersion !== expectedSchema) {
    errors.push(
      `${label}: ${refName} file schemaVersion="${parsed.schemaVersion}" is not the expected "${expectedSchema}".`,
    );
  }
  return parsed;
}

function resolveAnchorsForTail({ tailSpec, tailSpecDir, label, errors }) {
  const ref = tailSpec.anchorsRef;
  if (!ref || typeof ref.path !== "string") {
    errors.push(`${label}: tail-spec.anchorsRef.path is required.`);
    return null;
  }
  const filePath = resolve(tailSpecDir, ref.path);
  if (!existsSync(filePath)) {
    errors.push(`${label}: tail-spec.anchorsRef.path "${ref.path}" does not resolve (${filePath}).`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (err) {
    errors.push(`${label}: cannot parse anchors JSON at ${filePath} (${err.message}).`);
    return null;
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
