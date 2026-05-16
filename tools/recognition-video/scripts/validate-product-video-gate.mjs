#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const REQUIRED_SCORES = [
  "teachingStructure",
  "glyphBinding",
  "glyphAnchor",
  "pacing",
  "animationPerformance",
  "visualQuality",
  "childAppeal",
  "audioFit",
  "technicalCompliance",
  "officialReadiness",
];

const DECISIONS = new Set([
  "ready-for-hyperframes",
  "rendered-needs-iteration",
  "ready-for-official",
  "blocked",
]);

const OFFICIAL_THRESHOLDS = {
  overallScore: 8,
  teachingStructure: 8,
  glyphBinding: 8,
  glyphAnchor: 8,
  pacing: 7,
  animationPerformance: 7,
  visualQuality: 7,
  childAppeal: 7,
  audioFit: 7,
  technicalCompliance: 8,
  officialReadiness: 8,
};

const args = process.argv.slice(2);
const requireOfficial = args.includes("--official");
const reviewPaths = args.filter((arg) => arg !== "--official");

if (reviewPaths.length === 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/validate-product-video-gate.mjs [--official] <product-review.json> [...]",
  );
  process.exit(2);
}

const errors = [];

for (const reviewPath of reviewPaths) {
  const review = readJson(reviewPath, errors);
  if (review) validateReview({ review, reviewPath, errors, requireOfficial });
}

if (errors.length > 0) {
  console.error("Starlight product video gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Starlight product video gate ok: ${reviewPaths.length} review(s).`);

function validateReview({ review, reviewPath, errors, requireOfficial }) {
  const label = review.characterId || basename(reviewPath);

  check(
    review.schemaVersion === "starlight-product-video-review/v1",
    errors,
    label,
    "schemaVersion must be starlight-product-video-review/v1.",
  );
  check(typeof review.characterId === "string" && review.characterId.length > 0, errors, label, "characterId is required.");
  check(
    ["concept", "keyframe-review", "agent-pipeline-test", "official-candidate", "official"].includes(review.candidateStatus),
    errors,
    label,
    "candidateStatus must describe the production stage.",
  );

  validateLayerBoundary({ review, errors, label });
  validateArtifacts({ review, errors, label });
  validateEvidence({ review, errors, label });
  validateScores({ review, errors, label });
  validateDecision({ review, errors, label, requireOfficial });
}

function validateLayerBoundary({ review, errors, label }) {
  const productOwns = review.layerBoundary?.productAgentOwns || [];
  const hyperframesOwns = review.layerBoundary?.genericHyperframesOwns || [];

  check(productOwns.length >= 3, errors, label, "layerBoundary.productAgentOwns must list product-director duties.");
  check(
    hyperframesOwns.length >= 3,
    errors,
    label,
    "layerBoundary.genericHyperframesOwns must list assembly/render duties.",
  );
  check(
    productOwns.some((item) => /教学|记忆|字形|儿童|产品|quality|teaching|memory|glyph/i.test(item)),
    errors,
    label,
    "productAgentOwns must include teaching/product quality responsibility.",
  );
  check(
    hyperframesOwns.some((item) => /render|渲染|lint|inspect|ffprobe|metadata|poster|final/i.test(item)),
    errors,
    label,
    "genericHyperframesOwns must include render/media validation responsibility.",
  );
}

function validateArtifacts({ review, errors, label }) {
  const artifacts = review.sourceArtifacts || {};

  for (const key of ["brief", "assetPlan"]) {
    check(typeof artifacts[key] === "string" && artifacts[key].length > 0, errors, label, `sourceArtifacts.${key} is required.`);
    if (artifacts[key]) checkPathExists(artifacts[key], errors, label, `sourceArtifacts.${key}`);
  }

  for (const key of ["audioPlan", "buildMeta", "video", "reviewSheet", "poster", "finalFrame"]) {
    if (artifacts[key]) checkPathExists(artifacts[key], errors, label, `sourceArtifacts.${key}`);
  }

  const brief = artifacts.brief ? readJsonIfExists(artifacts.brief) : null;
  const assetPlan = artifacts.assetPlan ? readJsonIfExists(artifacts.assetPlan) : null;
  const audioPlan = artifacts.audioPlan ? readJsonIfExists(artifacts.audioPlan) : null;
  const buildMeta = artifacts.buildMeta ? readJsonIfExists(artifacts.buildMeta) : null;

  if (brief) {
    check(
      brief.characterId === review.characterId,
      errors,
      label,
      `brief.characterId (${brief.characterId}) must match review.characterId.`,
    );
  }
  if (assetPlan) {
    check(
      assetPlan.characterId === review.characterId,
      errors,
      label,
      `assetPlan.characterId (${assetPlan.characterId}) must match review.characterId.`,
    );
  }
  if (audioPlan) {
    check(
      audioPlan.characterId === review.characterId,
      errors,
      label,
      `audioPlan.characterId (${audioPlan.characterId}) must match review.characterId.`,
    );
  }
  if (buildMeta) {
    check(
      buildMeta.id === review.characterId || buildMeta.characterId === review.characterId,
      errors,
      label,
      "buildMeta must match review.characterId by id or characterId.",
    );
  }
}

function validateEvidence({ review, errors, label }) {
  const evidence = review.evidence || {};
  const keyframes = evidence.keyframes || [];

  check(keyframes.length >= 4, errors, label, "evidence.keyframes must include at least 4 product-review frames.");

  for (const frame of keyframes) {
    check(isNumber(frame.at) && frame.at >= 0, errors, label, "each keyframe needs a non-negative at timestamp.");
    check(typeof frame.purpose === "string" && frame.purpose.length >= 4, errors, label, "each keyframe needs a purpose.");
    check(
      typeof frame.visibleAnchor === "string" && frame.visibleAnchor.length >= 4,
      errors,
      label,
      "each keyframe needs a visibleAnchor.",
    );
    check(["pass", "partial", "fail"].includes(frame.readability), errors, label, "keyframe readability must be pass/partial/fail.");
  }

  const memoryMoment = evidence.memoryMoment;
  check(typeof memoryMoment?.exists === "boolean", errors, label, "evidence.memoryMoment.exists must be boolean.");
  check(
    typeof memoryMoment?.description === "string" && memoryMoment.description.length >= 4,
    errors,
    label,
    "evidence.memoryMoment.description is required.",
  );

  const actionReadability = evidence.actionReadability || [];
  check(actionReadability.length > 0, errors, label, "evidence.actionReadability must review core actions.");
  for (const action of actionReadability) {
    check(typeof action.action === "string" && action.action.length >= 2, errors, label, "actionReadability.action is required.");
    check(["pass", "partial", "fail"].includes(action.verdict), errors, label, "actionReadability verdict must be pass/partial/fail.");
    check(typeof action.reason === "string" && action.reason.length >= 4, errors, label, "actionReadability.reason is required.");
  }
}

function validateScores({ review, errors, label }) {
  const scores = review.scores || {};
  for (const key of REQUIRED_SCORES) {
    check(isScore(scores[key]), errors, label, `scores.${key} must be a 0-10 number.`);
  }
  check(isScore(review.overallScore), errors, label, "overallScore must be a 0-10 number.");

  if (REQUIRED_SCORES.every((key) => isScore(scores[key])) && isScore(review.overallScore)) {
    const average = REQUIRED_SCORES.reduce((sum, key) => sum + scores[key], 0) / REQUIRED_SCORES.length;
    check(
      Math.abs(average - review.overallScore) <= 0.35,
      errors,
      label,
      `overallScore (${review.overallScore}) should stay close to the score average (${average.toFixed(2)}).`,
    );
  }
}

function validateDecision({ review, errors, label, requireOfficial }) {
  check(DECISIONS.has(review.decision), errors, label, "decision must be a known gate decision.");
  check(Array.isArray(review.blockers), errors, label, "blockers must be an array.");
  check(Array.isArray(review.nextActions) && review.nextActions.length > 0, errors, label, "nextActions must not be empty.");

  const scores = review.scores || {};
  const hasBlockers = (review.blockers || []).length > 0;
  const usesPlaceholderAssets = review.assetAssessment?.usesProgrammaticPlaceholderAssets === true;
  const officialAssetReadiness = review.assetAssessment?.officialAssetReadiness;

  check(
    Array.isArray(review.assetAssessment?.notes) && review.assetAssessment.notes.length > 0,
    errors,
    label,
    "assetAssessment.notes must explain asset readiness.",
  );

  if (usesPlaceholderAssets) {
    check(
      review.decision !== "ready-for-official",
      errors,
      label,
      "programmatic placeholder assets cannot pass as ready-for-official.",
    );
  }

  if (officialAssetReadiness === "blocked") {
    check(review.decision !== "ready-for-official", errors, label, "blocked asset readiness cannot pass as ready-for-official.");
  }

  if (review.overallScore < 7) {
    check(
      ["rendered-needs-iteration", "blocked"].includes(review.decision),
      errors,
      label,
      "overallScore below 7 must be marked rendered-needs-iteration or blocked.",
    );
  }

  if (review.decision === "ready-for-official" || requireOfficial) {
    const audioPlanPath = review.sourceArtifacts?.audioPlan;
    check(review.decision === "ready-for-official", errors, label, "--official requires decision ready-for-official.");
    check(typeof audioPlanPath === "string" && audioPlanPath.length > 0, errors, label, "ready-for-official requires sourceArtifacts.audioPlan.");
    if (audioPlanPath) checkPathExists(audioPlanPath, errors, label, "sourceArtifacts.audioPlan");
    check(!hasBlockers, errors, label, "ready-for-official cannot have blockers.");
    check(!usesPlaceholderAssets, errors, label, "ready-for-official cannot use programmatic placeholder assets.");
    check(officialAssetReadiness === "ready", errors, label, "ready-for-official requires assetAssessment.officialAssetReadiness ready.");
    check(review.evidence?.memoryMoment?.exists === true, errors, label, "ready-for-official requires a real memory moment.");

    for (const [key, threshold] of Object.entries(OFFICIAL_THRESHOLDS)) {
      const value = key === "overallScore" ? review.overallScore : scores[key];
      check(value >= threshold, errors, label, `ready-for-official requires ${key} >= ${threshold}.`);
    }

    const failedActions = (review.evidence?.actionReadability || []).filter((action) => action.verdict !== "pass");
    check(failedActions.length === 0, errors, label, "ready-for-official requires all core actions to pass readability review.");
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

function readJsonIfExists(filePath) {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) return null;
  try {
    return JSON.parse(readFileSync(resolved, "utf8"));
  } catch {
    return null;
  }
}

function checkPathExists(path, errors, label, subject) {
  check(existsSync(resolve(path)), errors, label, `${subject} path does not exist: ${path}`);
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isScore(value) {
  return isNumber(value) && value >= 0 && value <= 10;
}

function check(condition, errors, label, message) {
  if (!condition) errors.push(`${label}: ${message}`);
}
