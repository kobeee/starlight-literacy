#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const MIN_DURATION_SECONDS = 3;
const MAX_DURATION_SECONDS = 12;
const MAX_PADDED_TOTAL_DURATION_SECONDS = 12;
const MIN_MULTI_CUE_DURATION_SECONDS = 5.8;
const MIN_FINAL_QUIET_SECONDS = 0.45;
const MAX_VISUAL_LATE_SECONDS = 0.12;
const MAX_VISUAL_EARLY_END_SECONDS = 0.08;
const MAX_TARGET_MEDIA_DELTA_SECONDS = 0.35;
const MIN_VOICE_RATE_PERCENT = -15;
const MAX_VOICE_RATE_PERCENT = 0;

const args = process.argv.slice(2);

if (args.length === 0 || args.length % 3 !== 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/validate-audio-sync-plan.mjs <brief.json> <asset-plan.json> <audio-plan.json> [<brief.json> <asset-plan.json> <audio-plan.json>...]",
  );
  process.exit(2);
}

const errors = [];

for (let index = 0; index < args.length; index += 3) {
  const briefPath = args[index];
  const assetPlanPath = args[index + 1];
  const audioPlanPath = args[index + 2];
  const brief = readJson(briefPath, errors);
  const assetPlan = readJson(assetPlanPath, errors);
  const audioPlan = readJson(audioPlanPath, errors);

  if (!brief || !assetPlan || !audioPlan) {
    continue;
  }

  validateTriplet({ brief, briefPath, assetPlan, assetPlanPath, audioPlan, audioPlanPath, errors });
}

if (errors.length > 0) {
  console.error("Recognition audio sync plan failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Recognition audio sync plan ok: ${args.length / 3} triplet(s).`);

function readJson(filePath, targetErrors) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    targetErrors.push(`${filePath}: cannot read JSON (${error.message})`);
    return null;
  }
}

function validateTriplet({ brief, briefPath, assetPlan, assetPlanPath, audioPlan, audioPlanPath, errors }) {
  const label = audioPlan.characterId || brief.characterId || basename(audioPlanPath);

  check(
    audioPlan.schemaVersion === "recognition-video-audio-plan/v1",
    errors,
    label,
    "audioPlan.schemaVersion must be recognition-video-audio-plan/v1.",
  );
  check(
    brief.characterId === assetPlan.characterId && brief.characterId === audioPlan.characterId,
    errors,
    label,
    `characterId must match across ${briefPath}, ${assetPlanPath}, and ${audioPlanPath}.`,
  );
  check(
    normalizeText(audioPlan.script) === normalizeText(brief.narration?.script),
    errors,
    label,
    "audioPlan.script must match brief.narration.script.",
  );
  check(
    normalizeText(assetPlan.audio?.script) === normalizeText(audioPlan.script),
    errors,
    label,
    "assetPlan.audio.script must match audioPlan.script.",
  );

  if (assetPlan.audio?.audioPlan) {
    check(
      resolve(assetPlan.audio.audioPlan) === resolve(audioPlanPath),
      errors,
      label,
      "assetPlan.audio.audioPlan must point to the audio-plan being validated.",
    );
  }

  validateTargetDuration({ brief, audioPlan, errors, label });
  validateVoice({ audioPlan, errors, label });
  validateDurationBenchmark({ audioPlan, errors, label });
  validateCues({ brief, audioPlan, errors, label });
  validateOutputs({ audioPlan, errors, label });
}

function validateTargetDuration({ brief, audioPlan, errors, label }) {
  const target = audioPlan.targetDurationSeconds;
  check(isNumber(target), errors, label, "targetDurationSeconds is required.");
  if (!isNumber(target)) return;

  check(
    target >= MIN_DURATION_SECONDS && target <= MAX_DURATION_SECONDS,
    errors,
    label,
    `targetDurationSeconds must stay within ${MIN_DURATION_SECONDS}-${MAX_DURATION_SECONDS}s for the spoken cue body of a P03 recognition clip. Use paddedTotalDurationSeconds for the silent stroke-order tail.`,
  );

  const padded = isNumber(audioPlan.paddedTotalDurationSeconds)
    ? audioPlan.paddedTotalDurationSeconds
    : null;
  if (padded === null) {
    check(
      Math.abs(target - brief.duration) <= 0.1,
      errors,
      label,
      "targetDurationSeconds must match brief.duration within 0.1s when no paddedTotalDurationSeconds is declared.",
    );
  } else {
    check(
      Math.abs(padded - brief.duration) <= 0.1,
      errors,
      label,
      "paddedTotalDurationSeconds must match brief.duration within 0.1s (brief.duration is the final video length including the silent stroke-order tail).",
    );
    check(
      target <= brief.duration + 0.05,
      errors,
      label,
      "targetDurationSeconds (spoken body) cannot exceed brief.duration.",
    );
  }

  const spokenCueCount = Array.isArray(audioPlan.cues)
    ? audioPlan.cues.filter((cue) => isSpokenCue(cue)).length
    : 0;
  if (spokenCueCount >= 3) {
    check(
      target >= MIN_MULTI_CUE_DURATION_SECONDS,
      errors,
      label,
      `multi-cue clips need at least ${MIN_MULTI_CUE_DURATION_SECONDS}s so children can hear and look back.`,
    );
  }

  if (padded !== null) {
    check(
      padded >= target - 0.001,
      errors,
      label,
      "paddedTotalDurationSeconds must be greater than or equal to targetDurationSeconds.",
    );
    check(
      padded <= MAX_PADDED_TOTAL_DURATION_SECONDS,
      errors,
      label,
      `paddedTotalDurationSeconds cannot exceed ${MAX_PADDED_TOTAL_DURATION_SECONDS}s.`,
    );
  }
}

function validateVoice({ audioPlan, errors, label }) {
  const voice = audioPlan.voice || {};
  check(typeof voice.provider === "string" && voice.provider.length > 0, errors, label, "voice.provider is required.");
  check(typeof voice.voice === "string" && voice.voice.length > 0, errors, label, "voice.voice is required.");
  check(typeof voice.rate === "string" && voice.rate.length > 0, errors, label, "voice.rate is required.");

  const rate = parseRatePercent(voice.rate);
  check(rate !== null, errors, label, "voice.rate must be a percentage such as -8%.");
  if (rate !== null) {
    check(
      rate >= MIN_VOICE_RATE_PERCENT && rate <= MAX_VOICE_RATE_PERCENT,
      errors,
      label,
      `voice.rate should stay between ${MIN_VOICE_RATE_PERCENT}% and ${MAX_VOICE_RATE_PERCENT}% for clear child-facing narration.`,
    );
  }
}

function validateDurationBenchmark({ audioPlan, errors, label }) {
  const benchmark = audioPlan.durationBenchmark;
  check(Boolean(benchmark), errors, label, "durationBenchmark is required; do not choose clip length by feel only.");
  if (!benchmark) return;

  const referenceText = [
    benchmark.sourceModel,
    benchmark.referenceProduct,
    benchmark.referenceEvidence,
    benchmark.hongenPublicExample,
    benchmark.hongenPublicCharacterCardSeconds,
  ].join(" ");

  check(/洪恩|hongen/i.test(referenceText), errors, label, "durationBenchmark must explicitly reference the Hongen comparison set.");
  check(
    isNumber(benchmark.starlightTargetSeconds) &&
      Math.abs(benchmark.starlightTargetSeconds - audioPlan.targetDurationSeconds) <= 0.1,
    errors,
    label,
    "durationBenchmark.starlightTargetSeconds must match targetDurationSeconds.",
  );
  check(
    typeof benchmark.starlightDecision === "string" && benchmark.starlightDecision.trim().length >= 8,
    errors,
    label,
    "durationBenchmark.starlightDecision must explain why this duration is right for P03.",
  );

  const referenceMax = referenceMaxSeconds(benchmark.referenceDurationSeconds);
  if (referenceMax !== null) {
    check(
      referenceMax > audioPlan.targetDurationSeconds,
      errors,
      label,
      "Hongen reference duration should be longer than the P03 short-clip target.",
    );
  }
}

function validateCues({ brief, audioPlan, errors, label }) {
  const cues = Array.isArray(audioPlan.cues) ? audioPlan.cues : [];
  check(cues.length > 0, errors, label, "audioPlan.cues must not be empty.");
  if (cues.length === 0) return;

  const shotById = new Map((brief.shotPlan || []).map((shot) => [shot.id, shot]));
  const minCueHold = brief.pacingRequirements?.minimumCueHoldSeconds ?? 1.2;
  const target = audioPlan.targetDurationSeconds;
  const padded = isNumber(audioPlan.paddedTotalDurationSeconds)
    ? audioPlan.paddedTotalDurationSeconds
    : target;
  let previousSpokenCue = null;
  let lastSpokenCue = null;

  for (const cue of cues) {
    const cueLabel = cue.id || cue.text || "unnamed cue";
    check(typeof cue.id === "string" && cue.id.length > 0, errors, label, "each audio cue needs an id.");

    const silent = isSilentCue(cue);

    if (silent) {
      for (const key of ["visualStart", "visualEnd"]) {
        check(isNumber(cue[key]), errors, label, `silent cue "${cueLabel}" must have numeric ${key}.`);
      }
      if (!isNumber(cue.visualStart) || !isNumber(cue.visualEnd)) continue;

      check(cue.visualEnd > cue.visualStart, errors, label, `silent cue "${cueLabel}" visualEnd must be after visualStart.`);
      check(
        cue.visualEnd <= padded + MAX_TARGET_MEDIA_DELTA_SECONDS,
        errors,
        label,
        `silent cue "${cueLabel}" visual window extends past paddedTotalDurationSeconds (${padded}).`,
      );
      check(
        cue.visualStart >= target - MAX_TARGET_MEDIA_DELTA_SECONDS,
        errors,
        label,
        `silent cue "${cueLabel}" should start at or after the spoken target duration; silent tails must follow the narration body.`,
      );
      check(
        typeof cue.rationale === "string" && cue.rationale.trim().length >= 4,
        errors,
        label,
        `silent cue "${cueLabel}" must explain its purpose in "rationale".`,
      );

      if (cue.shotId) {
        const shot = shotById.get(cue.shotId);
        if (shot) {
          check(
            cue.visualStart >= shot.start - MAX_VISUAL_LATE_SECONDS &&
              cue.visualEnd <= shot.start + shot.duration + MAX_TARGET_MEDIA_DELTA_SECONDS,
            errors,
            label,
            `silent cue "${cueLabel}" visual window should fit inside shot "${cue.shotId}".`,
          );
        }
      }
      continue;
    }

    check(typeof cue.text === "string" && cue.text.length > 0, errors, label, `cue "${cueLabel}" needs text.`);

    for (const key of ["audioStart", "audioEnd", "visualStart", "visualEnd"]) {
      check(isNumber(cue[key]), errors, label, `cue "${cueLabel}" must have numeric ${key}.`);
    }
    if (!["audioStart", "audioEnd", "visualStart", "visualEnd"].every((key) => isNumber(cue[key]))) {
      continue;
    }

    check(cue.audioStart >= 0, errors, label, `cue "${cueLabel}" audioStart must be non-negative.`);
    check(cue.audioEnd > cue.audioStart, errors, label, `cue "${cueLabel}" audioEnd must be after audioStart.`);
    check(cue.visualEnd > cue.visualStart, errors, label, `cue "${cueLabel}" visualEnd must be after visualStart.`);
    check(cue.audioEnd <= target + MAX_TARGET_MEDIA_DELTA_SECONDS, errors, label, `cue "${cueLabel}" extends past target duration.`);
    check(cue.visualEnd <= target + MAX_TARGET_MEDIA_DELTA_SECONDS, errors, label, `cue "${cueLabel}" visual window extends too far past target duration.`);
    check(
      cue.visualStart <= cue.audioStart + MAX_VISUAL_LATE_SECONDS,
      errors,
      label,
      `cue "${cueLabel}" visual starts too late for the narration.`,
    );
    check(
      cue.visualEnd + MAX_VISUAL_EARLY_END_SECONDS >= cue.audioEnd,
      errors,
      label,
      `cue "${cueLabel}" visual ends before the narration finishes.`,
    );

    if (cue.shotId) {
      const shot = shotById.get(cue.shotId);
      check(Boolean(shot), errors, label, `cue "${cueLabel}" references missing shotId "${cue.shotId}".`);
      if (shot) {
        check(
          cue.visualStart >= shot.start - MAX_VISUAL_LATE_SECONDS &&
            cue.visualEnd <= shot.start + shot.duration + MAX_TARGET_MEDIA_DELTA_SECONDS,
          errors,
          label,
          `cue "${cueLabel}" visual window should fit inside shot "${cue.shotId}".`,
        );
      }
    }

    if (previousSpokenCue) {
      check(
        cue.audioStart >= previousSpokenCue.audioStart,
        errors,
        label,
        `cue "${cueLabel}" starts before the previous cue.`,
      );
      check(
        cue.audioStart - previousSpokenCue.audioStart >= minCueHold,
        errors,
        label,
        `cue "${cueLabel}" starts only ${(cue.audioStart - previousSpokenCue.audioStart).toFixed(2)}s after the previous cue.`,
      );
    }

    previousSpokenCue = cue;
    lastSpokenCue = cue;
  }

  if (!lastSpokenCue) {
    errors.push(`${label}: audioPlan must contain at least one spoken cue.`);
    return;
  }

  const quietAfterLastCue = isNumber(audioPlan.quietAfterLastCueSeconds)
    ? audioPlan.quietAfterLastCueSeconds
    : target - lastSpokenCue.audioEnd;

  check(
    quietAfterLastCue >= MIN_FINAL_QUIET_SECONDS,
    errors,
    label,
    `clip needs at least ${MIN_FINAL_QUIET_SECONDS}s of quiet final glyph review after the last spoken cue.`,
  );
  check(
    lastSpokenCue.visualEnd >= target - MAX_TARGET_MEDIA_DELTA_SECONDS,
    errors,
    label,
    "final cue visual should hold through the end of the spoken target window.",
  );

  if (isNumber(audioPlan.paddedTotalDurationSeconds)) {
    const tailCue = cues.find((cue) => isSilentCue(cue));
    check(
      Boolean(tailCue),
      errors,
      label,
      "paddedTotalDurationSeconds implies a silent tail cue (narration=\"silent\") must be present in cues.",
    );
    if (tailCue && isNumber(tailCue.visualEnd)) {
      check(
        Math.abs(tailCue.visualEnd - audioPlan.paddedTotalDurationSeconds) <= MAX_TARGET_MEDIA_DELTA_SECONDS,
        errors,
        label,
        "the silent tail cue visualEnd must hold to paddedTotalDurationSeconds.",
      );
    }
  }
}

function isSilentCue(cue) {
  if (!cue || typeof cue !== "object") return false;
  if (cue.narration === "silent") return true;
  if (cue.narration === "spoken") return false;
  // legacy: spoken cues always have numeric audioStart/audioEnd
  if (cue.audioStart === null && cue.audioEnd === null) return true;
  return false;
}

function isSpokenCue(cue) {
  return !isSilentCue(cue);
}

function validateOutputs({ audioPlan, errors, label }) {
  const outputs = audioPlan.outputs || {};
  check(typeof outputs.audio === "string" && outputs.audio.length > 0, errors, label, "outputs.audio is required.");
  check(typeof outputs.subtitles === "string" && outputs.subtitles.length > 0, errors, label, "outputs.subtitles is required.");

  if (outputs.subtitles && existsSync(resolve(outputs.subtitles))) {
    const subtitleText = readFileSync(resolve(outputs.subtitles), "utf8");
    for (const cue of audioPlan.cues || []) {
      check(
        subtitleText.includes(cue.text) || subtitleText.includes(`${cue.text}。`),
        errors,
        label,
        `subtitle output does not include cue text "${cue.text}".`,
      );
    }
  }

  if (outputs.audio && existsSync(resolve(outputs.audio))) {
    const mediaDuration = probeDuration(outputs.audio);
    if (mediaDuration !== null) {
      const expectedDuration = isNumber(audioPlan.paddedTotalDurationSeconds)
        ? audioPlan.paddedTotalDurationSeconds
        : audioPlan.targetDurationSeconds;
      const expectedLabel = isNumber(audioPlan.paddedTotalDurationSeconds)
        ? `paddedTotalDurationSeconds ${expectedDuration}s`
        : `target ${expectedDuration}s`;
      check(
        Math.abs(mediaDuration - expectedDuration) <= MAX_TARGET_MEDIA_DELTA_SECONDS,
        errors,
        label,
        `outputs.audio duration ${mediaDuration.toFixed(3)}s does not match ${expectedLabel}.`,
      );
      if (isNumber(audioPlan.bakedAudioDurationSeconds)) {
        check(
          Math.abs(mediaDuration - audioPlan.bakedAudioDurationSeconds) <= 0.15,
          errors,
          label,
          "bakedAudioDurationSeconds must match the actual audio file duration.",
        );
      }
    }
  }
}

function probeDuration(path) {
  const result = spawnSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    path,
  ], { cwd: process.cwd(), encoding: "utf8" });

  if (result.status !== 0) {
    return null;
  }

  const value = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(value) ? value : null;
}

function parseRatePercent(value) {
  const match = String(value).trim().match(/^([+-]?\d+(?:\.\d+)?)%$/);
  return match ? Number.parseFloat(match[1]) : null;
}

function referenceMaxSeconds(value) {
  if (isNumber(value)) return value;
  if (value && typeof value === "object") {
    if (isNumber(value.max)) return value.max;
    if (isNumber(value.example)) return value.example;
  }
  return null;
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
