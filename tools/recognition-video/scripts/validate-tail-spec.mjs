#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const ALLOWED_STROKE_CODES = new Set(["h", "v", "p", "n", "d", "hk", "z"]);
const MAX_TAIL_DURATION_SECONDS = 2.4;
const MIN_TAIL_DURATION_SECONDS = 1.4;

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/validate-tail-spec.mjs <tail-spec.json> [<tail-spec.json>...]",
  );
  process.exit(2);
}

const errors = [];

for (const specPath of args) {
  const spec = readJson(specPath, errors);
  if (!spec) continue;
  validateSpec({ spec, specPath, errors });
}

if (errors.length > 0) {
  console.error("Recognition stroke-order tail spec failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Recognition stroke-order tail spec ok: ${args.length} spec(s).`);

function validateSpec({ spec, specPath, errors }) {
  const label = spec.characterId || basename(specPath);
  const specDir = dirname(resolve(specPath));

  check(
    spec.schemaVersion === "recognition-video-tail-spec/v1",
    errors,
    label,
    "schemaVersion must be recognition-video-tail-spec/v1.",
  );

  if (typeof spec.targetCharacter !== "string" || spec.targetCharacter.length < 1) {
    errors.push(`${label}: targetCharacter is required.`);
    return;
  }

  const anchors = resolveAnchors({ spec, specDir, errors, label });
  validateGlyph({ spec, errors, label });
  validateStrokeOrder({ spec, errors, label });
  validateContainer({ spec, anchors, errors, label });
  validateNarrationPolicy({ spec, errors, label });
  validateTransition({ spec, anchors, errors, label });
  validateFinalFrame({ spec, anchors, errors, label });
  validateOutputs({ spec, errors, label });
}

function resolveAnchors({ spec, specDir, errors, label }) {
  const ref = spec.anchorsRef;
  if (!ref || typeof ref.path !== "string") {
    errors.push(`${label}: anchorsRef.path is required.`);
    return null;
  }
  const anchorsPath = resolve(specDir, ref.path);
  if (!existsSync(anchorsPath)) {
    errors.push(`${label}: anchorsRef.path "${ref.path}" does not resolve to an existing file (${anchorsPath}).`);
    return null;
  }
  let anchors;
  try {
    anchors = JSON.parse(readFileSync(anchorsPath, "utf8"));
  } catch (error) {
    errors.push(`${label}: cannot parse anchors JSON at ${anchorsPath} (${error.message}).`);
    return null;
  }
  if (anchors.schemaVersion !== ref.schemaVersion) {
    errors.push(
      `${label}: anchorsRef.schemaVersion "${ref.schemaVersion}" does not match anchors file schemaVersion "${anchors.schemaVersion}" — stale anchors copy in use.`,
    );
  }
  if (anchors.schemaVersion !== "recognition-video-mizige-anchors/v1") {
    errors.push(
      `${label}: anchors file schemaVersion "${anchors.schemaVersion}" is not recognition-video-mizige-anchors/v1.`,
    );
  }
  return anchors;
}

function validateGlyph({ spec, errors, label }) {
  const glyph = spec.glyph || {};
  if (glyph.source === "svg-path") {
    check(
      typeof glyph.svgPath === "string" && glyph.svgPath.length > 0,
      errors,
      label,
      "glyph.svgPath is required when glyph.source=svg-path.",
    );
  }
  if (glyph.source === "image") {
    check(
      typeof glyph.imageAsset === "string" && glyph.imageAsset.length > 0,
      errors,
      label,
      "glyph.imageAsset is required when glyph.source=image.",
    );
  }
  if (glyph.boxOverride?.allowed === true) {
    check(
      typeof glyph.boxOverride.centerXPx === "number" &&
        typeof glyph.boxOverride.centerYPx === "number" &&
        typeof glyph.boxOverride.sizePx === "number",
      errors,
      label,
      "glyph.boxOverride.allowed=true but centerXPx/centerYPx/sizePx not all provided — incomplete override would let the glyph drift.",
    );
  }
}

function validateStrokeOrder({ spec, errors, label }) {
  const strokes = Array.isArray(spec.strokeOrder) ? spec.strokeOrder : [];
  check(strokes.length >= 1, errors, label, "strokeOrder must contain at least 1 stroke.");

  const indices = new Set();
  let totalDuration = 0;
  let prevEnd = 0;
  for (const stroke of strokes) {
    check(
      typeof stroke.index === "number" && stroke.index >= 1,
      errors,
      label,
      `each stroke needs an index >= 1 (got ${stroke.index}).`,
    );
    if (typeof stroke.index === "number") {
      check(!indices.has(stroke.index), errors, label, `duplicate stroke index ${stroke.index}.`);
      indices.add(stroke.index);
    }
    check(
      ALLOWED_STROKE_CODES.has(stroke.directionCode),
      errors,
      label,
      `stroke index ${stroke.index}: directionCode "${stroke.directionCode}" is not one of ${[...ALLOWED_STROKE_CODES].join("/")}.`,
    );
    const span = stroke.phaseEndSeconds - stroke.phaseStartSeconds;
    check(
      typeof stroke.phaseStartSeconds === "number" &&
        typeof stroke.phaseEndSeconds === "number" &&
        stroke.phaseEndSeconds > stroke.phaseStartSeconds,
      errors,
      label,
      `stroke index ${stroke.index}: phaseEndSeconds must be greater than phaseStartSeconds.`,
    );
    if (typeof stroke.phaseStartSeconds === "number" && stroke.phaseStartSeconds + 0.001 < prevEnd) {
      errors.push(
        `${label}: stroke index ${stroke.index} starts at ${stroke.phaseStartSeconds}s which overlaps the previous stroke ending at ${prevEnd}s — strokes must be sequential.`,
      );
    }
    if (typeof stroke.phaseEndSeconds === "number") {
      prevEnd = stroke.phaseEndSeconds;
      totalDuration = Math.max(totalDuration, stroke.phaseEndSeconds);
    }
    if (Number.isFinite(span) && span < 0.2) {
      errors.push(
        `${label}: stroke index ${stroke.index} is only ${span.toFixed(3)}s — too fast for 3-6 yr olds to track the writing direction.`,
      );
    }
  }
  if (totalDuration > 0) {
    check(
      totalDuration <= MAX_TAIL_DURATION_SECONDS,
      errors,
      label,
      `strokeOrder spans ${totalDuration.toFixed(3)}s but tail must finish within ${MAX_TAIL_DURATION_SECONDS}s of its own timeline.`,
    );
    check(
      totalDuration >= MIN_TAIL_DURATION_SECONDS - 1.0,
      errors,
      label,
      `strokeOrder ends at ${totalDuration.toFixed(3)}s — too short to allow a poster hold after writing.`,
    );
  }
}

function validateContainer({ spec, anchors, errors, label }) {
  const container = spec.container || {};
  check(
    container.policy === "single-mizige-dual-state",
    errors,
    label,
    `container.policy must be "single-mizige-dual-state" (got "${container.policy}") — two-grid layouts are forbidden in production.`,
  );
  if (anchors) {
    const expected = anchors.mizige?.opacityStates || {};
    if (typeof expected.recognition === "number" && container.recognitionOpacity !== expected.recognition) {
      errors.push(
        `${label}: container.recognitionOpacity ${container.recognitionOpacity} must equal anchors.mizige.opacityStates.recognition ${expected.recognition}.`,
      );
    }
    if (typeof expected.writing === "number" && container.writingOpacity !== expected.writing) {
      errors.push(
        `${label}: container.writingOpacity ${container.writingOpacity} must equal anchors.mizige.opacityStates.writing ${expected.writing}.`,
      );
    }
  }
}

function validateNarrationPolicy({ spec, errors, label }) {
  check(
    spec.narrationPolicy === "silent",
    errors,
    label,
    `narrationPolicy must be "silent" (got "${spec.narrationPolicy}") — voice during writing demo competes with hand-tracing focus.`,
  );
}

function validateTransition({ spec, anchors, errors, label }) {
  const transition = spec.transition || {};
  const clearIds = Array.isArray(transition.clearLayerIds) ? transition.clearLayerIds : [];
  const protectedIds = Array.isArray(transition.protectedLayerIds) ? transition.protectedLayerIds : [];
  check(clearIds.length >= 1, errors, label, "transition.clearLayerIds must list at least one cinematic-body layer to clear.");
  if (anchors) {
    const required = anchors.clearingContract?.mustClearLayerIds || [];
    for (const id of required) {
      check(
        clearIds.includes(id),
        errors,
        label,
        `transition.clearLayerIds is missing "${id}" — anchors.clearingContract requires it. Failing this causes ghost-stroke bugs.`,
      );
    }
  }
  const overlap = clearIds.filter((id) => protectedIds.includes(id));
  if (overlap.length > 0) {
    errors.push(
      `${label}: transition.clearLayerIds AND transition.protectedLayerIds both list ${overlap.map((id) => `"${id}"`).join(", ")} — these layers are simultaneously marked for removal AND protection. Resolve the contradiction; persistent kaiti glyph must NOT be cleared at body→tail handoff (root cause of v8 appear→vanish→rewrite).`,
    );
  }
  if (typeof transition.durationSeconds === "number") {
    check(
      transition.durationSeconds <= 1.2,
      errors,
      label,
      `transition.durationSeconds ${transition.durationSeconds}s exceeds 1.2s cap — long cross-dissolve eats writing time.`,
    );
  }
}

function validateFinalFrame({ spec, anchors, errors, label }) {
  const ff = spec.finalFrame || {};
  check(ff.posterReady === true, errors, label, "finalFrame.posterReady must be true.");
  check(ff.handPosePresent === true, errors, label, "finalFrame.handPosePresent must be true — P03 poster requires the child hand or brush pointer.");
  check(ff.mizigeStateAtEnd === "writing", errors, label, `finalFrame.mizigeStateAtEnd must be "writing" (got "${ff.mizigeStateAtEnd}").`);
  const pointerForm = ff.pointerForm;
  check(
    typeof pointerForm === "string" && pointerForm.length > 0,
    errors,
    label,
    'finalFrame.pointerForm is required — must declare the rendered guide form so brief.finalFrame.guideObject.form can be cross-checked.',
  );
  if (anchors && pointerForm) {
    const allowed = anchors.hand?.allowedPointerForms || [];
    if (allowed.length > 0) {
      check(
        allowed.includes(pointerForm),
        errors,
        label,
        `finalFrame.pointerForm "${pointerForm}" is not in mizige-anchors.hand.allowedPointerForms [${allowed.join(", ")}]. Extending the brand pointer policy requires editing anchors first.`,
      );
    }
  }
}

function validateOutputs({ spec, errors, label }) {
  const outputs = spec.outputs || {};
  check(
    typeof outputs.composition === "string" && outputs.composition.length > 0,
    errors,
    label,
    "outputs.composition is required.",
  );
  check(
    typeof outputs.finalFramePng === "string" && outputs.finalFramePng.length > 0,
    errors,
    label,
    "outputs.finalFramePng is required (P03 poster).",
  );
  check(
    typeof outputs.domProbeJson === "string" && outputs.domProbeJson.length > 0,
    errors,
    label,
    "outputs.domProbeJson is required — without DOM probe, ghost-stroke regressions go undetected.",
  );
}

function readJson(filePath, targetErrors) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    targetErrors.push(`${filePath}: cannot read JSON (${error.message})`);
    return null;
  }
}

function check(condition, errors, label, message) {
  if (!condition) {
    errors.push(`${label}: ${message}`);
  }
}
