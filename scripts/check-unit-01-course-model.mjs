import { unit01 } from "../src/shared/unit-01.js";
import { REQUIRED_COURSE_FIELDS } from "../src/shared/unit-01-lessons.js";

const errors = [];
const seenIds = new Set();

if (unit01.characters.length !== 20) {
  errors.push(`Unit-01 must contain 20 characters, found ${unit01.characters.length}.`);
}

for (const item of unit01.characters) {
  if (seenIds.has(item.id)) errors.push(`Duplicate character id: ${item.id}`);
  seenIds.add(item.id);

  for (const field of REQUIRED_COURSE_FIELDS) {
    if (!(field in item)) {
      errors.push(`${item.id}(${item.char}) missing ${field}`);
    }
  }

  if (!Array.isArray(item.contrastTargets)) {
    errors.push(`${item.id}(${item.char}) contrastTargets must be an array.`);
  }

  if (!item.nativeLesson?.title || !item.nativeLesson?.cue || !Array.isArray(item.nativeLesson?.props)) {
    errors.push(`${item.id}(${item.char}) nativeLesson must include title, cue and props.`);
  }

  if (!item.practiceChecks?.visual || !item.practiceChecks?.audio || !item.practiceChecks?.review) {
    errors.push(`${item.id}(${item.char}) practiceChecks must include visual, audio and review.`);
  }

  if (!item.assetBrief?.scene || !Array.isArray(item.assetBrief?.objects)) {
    errors.push(`${item.id}(${item.char}) assetBrief must include scene and objects.`);
  }

  if (item.legacyRecognitionVideo && item.legacyRecognitionVideo.status !== "legacy-sample") {
    errors.push(`${item.id}(${item.char}) legacyRecognitionVideo must keep status legacy-sample.`);
  }

  if (item.recognitionVideo && item.recognitionVideo.status !== "official") {
    errors.push(`${item.id}(${item.char}) recognitionVideo must be status official after approval.`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Unit-01 course model ok: ${unit01.characters.length}/20 characters, ${REQUIRED_COURSE_FIELDS.length} required fields.`);
