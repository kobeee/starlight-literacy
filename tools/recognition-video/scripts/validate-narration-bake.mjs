#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const DURATION_TOLERANCE_SECONDS = 0.15;
const MIN_AUDIO_BYTES = 4 * 1024;
const SILENCE_MEAN_VOLUME_DB = -55;
const SILENCE_MAX_VOLUME_DB = -40;
const MAX_SEGMENT_TIMING_GAP_SECONDS = 1.2;

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/validate-narration-bake.mjs <narration-spec.json> [<narration-spec.json>...]",
  );
  process.exit(2);
}

const errors = [];

for (const specPath of args) {
  const spec = readJson(specPath, errors);
  if (!spec) continue;
  validateBake({ spec, specPath, errors });
}

if (errors.length > 0) {
  console.error("Recognition narration bake failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Recognition narration bake ok: ${args.length} spec(s).`);

function validateBake({ spec, specPath, errors }) {
  const label = spec.characterId || basename(specPath);

  if (spec.schemaVersion !== "recognition-video-narration-spec/v1") {
    errors.push(`${label}: schemaVersion must be recognition-video-narration-spec/v1.`);
    return;
  }

  const outputs = spec.outputs || {};
  const audioPath = outputs.audio ? resolve(outputs.audio) : null;
  const subtitlePath = outputs.subtitles ? resolve(outputs.subtitles) : null;
  const measuredPath = outputs.measuredTimings ? resolve(outputs.measuredTimings) : null;

  if (!audioPath || !existsSync(audioPath)) {
    errors.push(`${label}: outputs.audio "${outputs.audio}" missing on disk — run bake-narration.mjs first.`);
  }
  if (!subtitlePath || !existsSync(subtitlePath)) {
    errors.push(`${label}: outputs.subtitles "${outputs.subtitles}" missing on disk — bake-narration.mjs must write VTT.`);
  }
  if (!measuredPath || !existsSync(measuredPath)) {
    errors.push(`${label}: outputs.measuredTimings "${outputs.measuredTimings}" missing on disk — bake-narration.mjs must emit measured timings JSON.`);
  }

  if (audioPath && existsSync(audioPath)) {
    validateAudioFile({ audioPath, spec, label, errors });
  }

  let vttText = null;
  if (subtitlePath && existsSync(subtitlePath)) {
    vttText = readFileSync(subtitlePath, "utf8");
    validateVtt({ vttText, spec, label, errors });
  }

  if (measuredPath && existsSync(measuredPath)) {
    validateMeasuredTimings({ measuredPath, spec, label, errors, vttText });
  }
}

function validateAudioFile({ audioPath, spec, label, errors }) {
  const stats = statSync(audioPath);
  if (stats.size < MIN_AUDIO_BYTES) {
    errors.push(
      `${label}: audio file ${audioPath} is only ${stats.size} bytes — bake likely produced an empty/corrupt mp3.`,
    );
    return;
  }

  const duration = probeDurationSeconds(audioPath);
  if (duration === null) {
    errors.push(`${label}: ffprobe could not read duration of ${audioPath}.`);
    return;
  }

  const padTo = spec.tts?.postProcess?.apadToSeconds;
  if (typeof padTo === "number" && Number.isFinite(padTo) && padTo > 0) {
    const delta = Math.abs(duration - padTo);
    if (delta > DURATION_TOLERANCE_SECONDS) {
      errors.push(
        `${label}: baked audio duration ${duration.toFixed(3)}s does not match tts.postProcess.apadToSeconds ${padTo}s (delta ${delta.toFixed(3)}s > tolerance ${DURATION_TOLERANCE_SECONDS}s) — silent tail length is wrong, stroke-order beat will land off.`,
      );
    }
  }

  const volumeStats = probeVolumeStats(audioPath);
  if (volumeStats) {
    if (volumeStats.meanDb !== null && volumeStats.meanDb < SILENCE_MEAN_VOLUME_DB) {
      errors.push(
        `${label}: audio mean volume ${volumeStats.meanDb.toFixed(2)}dB is below ${SILENCE_MEAN_VOLUME_DB}dB — narration sounds silent. Check edge-tts text/voice.`,
      );
    }
    if (volumeStats.maxDb !== null && volumeStats.maxDb < SILENCE_MAX_VOLUME_DB) {
      errors.push(
        `${label}: audio peak volume ${volumeStats.maxDb.toFixed(2)}dB is below ${SILENCE_MAX_VOLUME_DB}dB — bake produced (near-)silent mp3.`,
      );
    }
  }
}

function validateVtt({ vttText, spec, label, errors }) {
  if (!vttText.startsWith("WEBVTT")) {
    errors.push(`${label}: subtitles file is not a valid WEBVTT (missing WEBVTT header).`);
  }
  const normalizedVtt = normalizeText(vttText);
  const segments = Array.isArray(spec.segments) ? spec.segments : [];
  for (const seg of segments) {
    const normalizedSeg = normalizeText(seg.text);
    if (normalizedSeg.length === 0) continue;
    if (!normalizedVtt.includes(normalizedSeg)) {
      errors.push(
        `${label}: VTT does not contain segment "${seg.id}" text "${seg.text}" — edge-tts cue dropped characters; measured timings will mis-locate.`,
      );
    }
  }
}

function validateMeasuredTimings({ measuredPath, spec, label, errors, vttText }) {
  let measured;
  try {
    measured = JSON.parse(readFileSync(measuredPath, "utf8"));
  } catch (error) {
    errors.push(`${label}: cannot parse measuredTimings JSON (${error.message}).`);
    return;
  }

  if (measured.schemaVersion !== "recognition-video-narration-measured/v1") {
    errors.push(
      `${label}: measuredTimings.schemaVersion must be recognition-video-narration-measured/v1 (got "${measured.schemaVersion}").`,
    );
  }

  if (measured.characterId !== spec.characterId) {
    errors.push(
      `${label}: measuredTimings.characterId "${measured.characterId}" does not match spec.characterId "${spec.characterId}" — wrong bake artifact wired.`,
    );
  }

  const segments = Array.isArray(spec.segments) ? spec.segments : [];
  const measuredSegments = Array.isArray(measured.segments) ? measured.segments : [];

  if (measuredSegments.length !== segments.length) {
    errors.push(
      `${label}: measuredTimings.segments has ${measuredSegments.length} entries but spec has ${segments.length} — re-run bake-narration.mjs.`,
    );
  }

  const measuredById = new Map(measuredSegments.map((s) => [s.id, s]));
  let prevEnd = 0;
  for (const seg of segments) {
    const m = measuredById.get(seg.id);
    if (!m) {
      errors.push(`${label}: measuredTimings is missing segment "${seg.id}".`);
      continue;
    }
    if (m.warning) {
      errors.push(`${label}: segment "${seg.id}" measured timing warning: ${m.warning} — bake could not align this line.`);
    }
    if (typeof m.audioStart !== "number" || typeof m.audioEnd !== "number") {
      errors.push(`${label}: segment "${seg.id}" has no numeric audioStart/audioEnd in measuredTimings.`);
      continue;
    }
    if (m.audioEnd <= m.audioStart) {
      errors.push(
        `${label}: segment "${seg.id}" audioEnd ${m.audioEnd} ≤ audioStart ${m.audioStart} — measured timing inverted.`,
      );
    }
    if (m.audioStart < prevEnd - 0.05) {
      errors.push(
        `${label}: segment "${seg.id}" audioStart ${m.audioStart.toFixed(3)} overlaps previous segment ending ${prevEnd.toFixed(3)} — VTT cues are tangled.`,
      );
    }
    const gap = m.audioStart - prevEnd;
    if (gap > MAX_SEGMENT_TIMING_GAP_SECONDS) {
      errors.push(
        `${label}: gap of ${gap.toFixed(3)}s before segment "${seg.id}" exceeds ${MAX_SEGMENT_TIMING_GAP_SECONDS}s — narration has a dead silence the audio-plan will not know about.`,
      );
    }
    prevEnd = m.audioEnd;
  }

  const padTo = spec.tts?.postProcess?.apadToSeconds;
  if (typeof padTo === "number" && Number.isFinite(padTo) && padTo > 0) {
    if (typeof measured.apadToSeconds !== "number" || Math.abs(measured.apadToSeconds - padTo) > 0.001) {
      errors.push(
        `${label}: measuredTimings.apadToSeconds ${measured.apadToSeconds} does not match spec ${padTo} — bake script and spec disagree about silent tail length.`,
      );
    }
    if (typeof measured.rawAudioEndSeconds === "number" && measured.rawAudioEndSeconds > padTo + DURATION_TOLERANCE_SECONDS) {
      errors.push(
        `${label}: raw narration ends at ${measured.rawAudioEndSeconds.toFixed(3)}s but apad target is ${padTo}s — narration is longer than the padded slot, stroke-order tail will be cut off.`,
      );
    }
  }

  if (vttText && typeof measured.concatenatedTtsText === "string") {
    const normalizedScript = normalizeText(spec.script);
    if (!measured.concatenatedTtsText.includes(normalizedScript)) {
      errors.push(
        `${label}: measuredTimings.concatenatedTtsText does not contain the full spec.script — edge-tts dropped or reordered characters. Re-bake or adjust script.`,
      );
    }
  }
}

function probeDurationSeconds(path) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
    { encoding: "utf8" },
  );
  if (result.status !== 0) return null;
  const value = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(value) ? value : null;
}

function probeVolumeStats(path) {
  const result = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", path, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const stderr = result.stderr || "";
  const meanMatch = stderr.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  const maxMatch = stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  if (!meanMatch && !maxMatch) return null;
  return {
    meanDb: meanMatch ? Number.parseFloat(meanMatch[1]) : null,
    maxDb: maxMatch ? Number.parseFloat(maxMatch[1]) : null,
  };
}

function readJson(filePath, targetErrors) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    targetErrors.push(`${filePath}: cannot read JSON (${error.message})`);
    return null;
  }
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, "");
}
