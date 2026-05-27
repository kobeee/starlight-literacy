#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/bake-narration.mjs <narration-spec.json>",
  );
  process.exit(2);
}

const specPath = args[0];
const spec = readJson(specPath);
if (!spec) {
  console.error(`Cannot read narration spec at ${specPath}.`);
  process.exit(1);
}

if (spec.schemaVersion !== "recognition-video-narration-spec/v1") {
  console.error(`Unexpected schemaVersion "${spec.schemaVersion}".`);
  process.exit(1);
}

const outputs = spec.outputs;
const audioPath = resolve(outputs.audio);
const rawAudioPath = outputs.rawAudio
  ? resolve(outputs.rawAudio)
  : resolve(outputs.audio.replace(/(\.[^.]+)$/, "-raw$1"));
const subtitlePath = resolve(outputs.subtitles);
const measuredPath = resolve(outputs.measuredTimings);

ensureDir(audioPath);
ensureDir(rawAudioPath);
ensureDir(subtitlePath);
ensureDir(measuredPath);

const ttsArgs = renderEdgeTtsArgs({
  voice: spec.voice.voice,
  rate: spec.voice.rate,
  pitch: spec.voice.pitch,
  text: spec.script,
  audioOut: rawAudioPath,
  subtitleOut: subtitlePath,
});

console.log(`[bake-narration] edge-tts ${ttsArgs.map((arg) => maybeQuote(arg)).join(" ")}`);
const ttsResult = spawnSync("edge-tts", ttsArgs, { stdio: "inherit" });
if (ttsResult.status !== 0) {
  console.error("edge-tts failed.");
  process.exit(ttsResult.status ?? 1);
}
if (!existsSync(rawAudioPath) || !existsSync(subtitlePath)) {
  console.error("edge-tts exited 0 but did not produce expected outputs.");
  process.exit(1);
}

normalizeSubtitlesToWebVtt(subtitlePath);

const padTo = spec.tts?.postProcess?.apadToSeconds;
if (typeof padTo === "number" && Number.isFinite(padTo) && padTo > 0) {
  console.log(`[bake-narration] ffmpeg apad -> ${padTo}s`);
  const padResult = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      rawAudioPath,
      "-af",
      `apad=whole_dur=${padTo}`,
      "-t",
      String(padTo),
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "192k",
      audioPath,
    ],
    { stdio: "inherit" },
  );
  if (padResult.status !== 0 || !existsSync(audioPath)) {
    console.error("ffmpeg apad failed.");
    process.exit(padResult.status ?? 1);
  }
} else {
  const buf = readFileSync(rawAudioPath);
  writeFileSync(audioPath, buf);
}

const measured = computeMeasuredTimings({ spec, subtitlePath });
writeFileSync(measuredPath, `${JSON.stringify(measured, null, 2)}\n`, "utf8");

const finalDuration = probeDurationSeconds(audioPath);
const rawDuration = probeDurationSeconds(rawAudioPath);

console.log(
  `[bake-narration] ok: raw=${rawDuration?.toFixed(3) ?? "?"}s baked=${finalDuration?.toFixed(3) ?? "?"}s segments=${
    measured.segments.length
  }`,
);
console.log(`  audio:    ${audioPath}`);
console.log(`  subtitles:${subtitlePath}`);
console.log(`  timings:  ${measuredPath}`);

function renderEdgeTtsArgs({ voice, rate, pitch, text, audioOut, subtitleOut }) {
  return [
    "--voice",
    voice,
    `--rate=${rate}`,
    `--pitch=${pitch || "+0Hz"}`,
    "--text",
    text,
    "--write-media",
    audioOut,
    "--write-subtitles",
    subtitleOut,
  ];
}

function computeMeasuredTimings({ spec, subtitlePath }) {
  const vtt = readFileSync(subtitlePath, "utf8");
  const cues = parseVttCues(vtt);

  const charTimings = [];
  for (const cue of cues) {
    const chars = [...cue.text];
    if (chars.length === 0) continue;
    const span = cue.end - cue.start;
    const per = chars.length > 0 ? span / chars.length : 0;
    chars.forEach((ch, index) => {
      charTimings.push({
        char: ch,
        start: cue.start + per * index,
        end: cue.start + per * (index + 1),
      });
    });
  }

  const concatenated = charTimings.map((c) => c.char).join("");
  const normalizedScript = normalizeText(spec.script);
  const segmentTimings = [];

  let cursor = 0;
  for (const seg of spec.segments) {
    const normalizedSeg = normalizeText(seg.text);
    if (normalizedSeg.length === 0) {
      segmentTimings.push({ id: seg.id, text: seg.text, audioStart: null, audioEnd: null });
      continue;
    }
    const startIndex = concatenated.indexOf(normalizedSeg, cursor);
    if (startIndex === -1) {
      segmentTimings.push({
        id: seg.id,
        text: seg.text,
        audioStart: null,
        audioEnd: null,
        warning: "could-not-locate-in-vtt",
      });
      continue;
    }
    const endIndex = startIndex + normalizedSeg.length - 1;
    const start = charTimings[startIndex]?.start ?? null;
    const end = charTimings[endIndex]?.end ?? null;
    segmentTimings.push({
      id: seg.id,
      text: seg.text,
      audioStart: round3(start),
      audioEnd: round3(end),
    });
    cursor = endIndex + 1;
  }

  const lastEndedCharIndex = (function () {
    for (let i = charTimings.length - 1; i >= 0; i -= 1) {
      if (charTimings[i]) return i;
    }
    return -1;
  })();

  return {
    schemaVersion: "recognition-video-narration-measured/v1",
    characterId: spec.characterId,
    sourceVtt: subtitlePath,
    concatenatedTtsText: concatenated,
    rawScriptNormalized: normalizedScript,
    totalCharCount: charTimings.length,
    rawAudioEndSeconds: lastEndedCharIndex >= 0 ? round3(charTimings[lastEndedCharIndex].end) : null,
    apadToSeconds: spec.tts?.postProcess?.apadToSeconds ?? null,
    segments: segmentTimings,
  };
}

function normalizeSubtitlesToWebVtt(filePath) {
  const original = readFileSync(filePath, "utf8");
  const trimmed = original.replace(/^﻿/, "");
  if (/^WEBVTT/.test(trimmed)) return;
  const normalized = trimmed.replace(
    /(\d{2}):(\d{2}):(\d{2}),(\d{3})/g,
    "$1:$2:$3.$4",
  );
  const body = normalized.replace(/^\s+/, "");
  writeFileSync(filePath, `WEBVTT\n\n${body}`, "utf8");
}

function parseVttCues(vtt) {
  const lines = vtt.split(/\r?\n/);
  const cues = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const match = line.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
    if (match) {
      const start = toSeconds(match[1], match[2], match[3], match[4]);
      const end = toSeconds(match[5], match[6], match[7], match[8]);
      i += 1;
      const textLines = [];
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i]);
        i += 1;
      }
      cues.push({ start, end, text: textLines.join("").trim() });
    } else {
      i += 1;
    }
  }
  return cues;
}

function toSeconds(hh, mm, ss, ms) {
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000;
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

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`Cannot parse JSON ${path}: ${error.message}`);
    return null;
  }
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, "");
}

function round3(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 1000) / 1000 : value;
}

function maybeQuote(value) {
  if (/[\s"']/.test(value)) return `"${value.replace(/"/g, '\\"')}"`;
  return value;
}
