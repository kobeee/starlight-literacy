#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { basename } from "node:path";

const MIN_TARGET_CHAR_COUNT = 3;
const MAX_SEGMENT_CHARS = 12;
const MIN_VOICE_RATE_PERCENT = -15;
const MAX_VOICE_RATE_PERCENT = 0;
const KNOWN_QUANTIFIERS = ["道", "只", "根", "条", "片", "束", "颗", "个", "把", "张", "块", "团", "朵", "粒", "面", "枚", "棵"];

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/validate-narration-spec.mjs <narration-spec.json> [<narration-spec.json>...]",
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
  console.error("Recognition narration spec failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Recognition narration spec ok: ${args.length} spec(s).`);

function readJson(filePath, targetErrors) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    targetErrors.push(`${filePath}: cannot read JSON (${error.message})`);
    return null;
  }
}

function validateSpec({ spec, specPath, errors }) {
  const label = spec.characterId || basename(specPath);

  check(
    spec.schemaVersion === "recognition-video-narration-spec/v1",
    errors,
    label,
    "schemaVersion must be recognition-video-narration-spec/v1.",
  );

  const targetChar = spec.targetCharacter;
  check(typeof targetChar === "string" && targetChar.length >= 1, errors, label, "targetCharacter is required.");
  if (!targetChar) return;

  check(
    ["number", "object", "action", "nature", "abstract"].includes(spec.targetCharSemantic),
    errors,
    label,
    "targetCharSemantic must be one of number/object/action/nature/abstract.",
  );

  validateSegments({ spec, targetChar, errors, label });
  validateScriptConsistency({ spec, errors, label });
  validateTargetCharFrequency({ spec, targetChar, errors, label });
  validateConcreteAnchorPhrase({ spec, targetChar, errors, label });
  validateRoleCoverage({ spec, errors, label });
  validateQuantifierUsage({ spec, targetChar, errors, label });
  validateVoice({ spec, errors, label });
  validateTts({ spec, errors, label });
  validateOutputs({ spec, errors, label });
}

function validateSegments({ spec, targetChar, errors, label }) {
  const segments = Array.isArray(spec.segments) ? spec.segments : [];
  check(segments.length >= 2, errors, label, "segments must have at least 2 sentences.");

  const ids = new Set();
  for (const seg of segments) {
    check(typeof seg.id === "string" && seg.id.length > 0, errors, label, "each segment needs an id.");
    if (seg.id) {
      check(!ids.has(seg.id), errors, label, `duplicate segment id "${seg.id}".`);
      ids.add(seg.id);
    }
    check(
      typeof seg.text === "string" && seg.text.length >= 1,
      errors,
      label,
      `segment "${seg.id}" needs non-empty text.`,
    );
    if (typeof seg.text === "string") {
      check(
        seg.text.length <= MAX_SEGMENT_CHARS,
        errors,
        label,
        `segment "${seg.id}" is ${seg.text.length} chars; cap is ${MAX_SEGMENT_CHARS} for 3-6 year olds.`,
      );
      const actualCount = countOccurrences(seg.text, targetChar);
      check(
        actualCount === seg.targetCharOccurrences,
        errors,
        label,
        `segment "${seg.id}" claims ${seg.targetCharOccurrences} target-char occurrences but text contains ${actualCount}.`,
      );
    }
  }
}

function validateScriptConsistency({ spec, errors, label }) {
  const segments = Array.isArray(spec.segments) ? spec.segments : [];
  const joined = segments.map((seg) => seg.text || "").join("");
  check(
    normalizeText(joined) === normalizeText(spec.script),
    errors,
    label,
    "script must equal the concatenation of segments[].text (no extra characters).",
  );
}

function validateTargetCharFrequency({ spec, targetChar, errors, label }) {
  const total = countOccurrences(spec.script || "", targetChar);
  check(
    total >= MIN_TARGET_CHAR_COUNT,
    errors,
    label,
    `target character "${targetChar}" appears only ${total} time(s); recognition narration must repeat it at least ${MIN_TARGET_CHAR_COUNT} times so children can anchor it.`,
  );
}

function validateConcreteAnchorPhrase({ spec, targetChar, errors, label }) {
  const anchor = spec.concreteAnchorPhrase;
  check(Boolean(anchor), errors, label, "concreteAnchorPhrase is required: every recognition narration needs one functional sentence binding the target character to a concrete object.");
  if (!anchor) return;

  const segments = Array.isArray(spec.segments) ? spec.segments : [];
  const matched = segments.find((seg) => seg.id === anchor.segmentId);
  check(Boolean(matched), errors, label, `concreteAnchorPhrase.segmentId "${anchor.segmentId}" must reference an existing segment.`);
  if (matched) {
    check(
      matched.role === "concrete-anchor",
      errors,
      label,
      `segment "${anchor.segmentId}" referenced by concreteAnchorPhrase must have role "concrete-anchor" (currently "${matched.role}").`,
    );
    check(
      typeof matched.text === "string" && matched.text.includes(anchor.phrase),
      errors,
      label,
      `concreteAnchorPhrase.phrase "${anchor.phrase}" must appear inside the referenced segment text.`,
    );
  }
  check(
    typeof anchor.phrase === "string" && anchor.phrase.includes(targetChar),
    errors,
    label,
    `concreteAnchorPhrase.phrase must contain the target character "${targetChar}".`,
  );
  check(
    typeof anchor.anchorObject === "string" && anchor.anchorObject.length >= 1 && anchor.anchorObject !== targetChar,
    errors,
    label,
    "concreteAnchorPhrase.anchorObject must name a concrete noun distinct from the target character (e.g. 木棒, 小船).",
  );
}

function validateRoleCoverage({ spec, errors, label }) {
  const segments = Array.isArray(spec.segments) ? spec.segments : [];
  const roles = new Set(segments.map((seg) => seg.role));
  check(roles.has("concrete-anchor"), errors, label, "at least one segment must have role \"concrete-anchor\".");
  check(roles.has("glyph-naming"), errors, label, "at least one segment must have role \"glyph-naming\" (the segment that names the character).");
}

function validateQuantifierUsage({ spec, targetChar, errors, label }) {
  const declared = Array.isArray(spec.quantifierUsage) ? spec.quantifierUsage : [];
  const segments = Array.isArray(spec.segments) ? spec.segments : [];

  const declaredKeys = new Set(declared.map((u) => `${u.segmentId}::${u.phrase}`));
  const autoDetected = [];

  for (const seg of segments) {
    if (typeof seg.text !== "string") continue;
    for (let i = 0; i < seg.text.length - 1; i += 1) {
      if (seg.text[i] !== targetChar) continue;
      const next = seg.text[i + 1];
      if (KNOWN_QUANTIFIERS.includes(next)) {
        const phrase = `${targetChar}${next}`;
        autoDetected.push({ segmentId: seg.id, phrase });
      }
    }
  }

  for (const usage of autoDetected) {
    const key = `${usage.segmentId}::${usage.phrase}`;
    check(
      declaredKeys.has(key),
      errors,
      label,
      `quantifier usage "${usage.phrase}" in segment "${usage.segmentId}" must be declared in quantifierUsage so its semantic kind is explicit.`,
    );
  }

  if (spec.targetCharSemantic === "number") {
    for (const usage of declared) {
      if (usage.kind === "number-as-quantifier") {
        check(
          usage.boundToVisualCount === true,
          errors,
          label,
          `target character is a number; quantifier use "${usage.phrase}" must be backed by a visible count of the noun (boundToVisualCount=true) — otherwise the child learns the measure word, not the number.`,
        );
        check(
          typeof usage.visualReference === "string" && usage.visualReference.length > 0,
          errors,
          label,
          `quantifier use "${usage.phrase}" must name a visualReference (shotId/plate/sprite) showing the count.`,
        );
      }
    }
  }
}

function validateVoice({ spec, errors, label }) {
  const voice = spec.voice || {};
  check(typeof voice.provider === "string" && voice.provider.length > 0, errors, label, "voice.provider is required.");
  check(typeof voice.voice === "string" && voice.voice.length > 0, errors, label, "voice.voice is required.");
  const rate = parseRatePercent(voice.rate);
  check(rate !== null, errors, label, "voice.rate must be a percentage such as -10%.");
  if (rate !== null) {
    check(
      rate >= MIN_VOICE_RATE_PERCENT && rate <= MAX_VOICE_RATE_PERCENT,
      errors,
      label,
      `voice.rate must stay between ${MIN_VOICE_RATE_PERCENT}% and ${MAX_VOICE_RATE_PERCENT}% for clear child-facing narration.`,
    );
  }
}

function validateTts({ spec, errors, label }) {
  const tts = spec.tts || {};
  check(tts.engine === "edge-tts", errors, label, "tts.engine must be edge-tts (only supported engine).");
  check(
    typeof tts.commandTemplate === "string" &&
      tts.commandTemplate.includes("{{voice}}") &&
      tts.commandTemplate.includes("{{rate}}") &&
      tts.commandTemplate.includes("{{text}}") &&
      tts.commandTemplate.includes("{{audioOut}}") &&
      tts.commandTemplate.includes("{{subtitleOut}}"),
    errors,
    label,
    "tts.commandTemplate must include {{voice}}, {{rate}}, {{text}}, {{audioOut}}, {{subtitleOut}} placeholders.",
  );
}

function validateOutputs({ spec, errors, label }) {
  const outputs = spec.outputs || {};
  check(typeof outputs.audio === "string" && outputs.audio.length > 0, errors, label, "outputs.audio is required.");
  check(typeof outputs.subtitles === "string" && outputs.subtitles.length > 0, errors, label, "outputs.subtitles is required.");
  check(
    typeof outputs.measuredTimings === "string" && outputs.measuredTimings.length > 0,
    errors,
    label,
    "outputs.measuredTimings is required so audio-plan can pick up real cue timings instead of guessing.",
  );
}

function countOccurrences(haystack, needle) {
  if (typeof haystack !== "string" || typeof needle !== "string" || needle.length === 0) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function parseRatePercent(value) {
  const match = String(value).trim().match(/^([+-]?\d+(?:\.\d+)?)%$/);
  return match ? Number.parseFloat(match[1]) : null;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, "");
}

function check(condition, errors, label, message) {
  if (!condition) {
    errors.push(`${label}: ${message}`);
  }
}
