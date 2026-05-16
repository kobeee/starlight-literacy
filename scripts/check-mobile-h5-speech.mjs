import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, "../src/clients/mobile-h5/app.js"), "utf8");

const checks = [
  ["speech style presets", /const SPEECH_STYLE_PRESETS = \{/],
  ["punctuation pause map", /const SPEECH_PAUSE_MS = \{/],
  ["segmented speech entry", /function speakSegments\(/],
  ["lesson voice uses explicit segments", /function speak\(item\)[\s\S]*?speakSegments\(\[/],
  ["teaching cue is split before lesson speech", /function speak\(item\)[\s\S]*?const teachingSegments = splitSpeechText/],
  ["plain text is split by punctuation", /function splitSpeechText\(/],
  ["queued segments advance on end", /utterance\.onend = \(\) => \{/],
  ["speech cancellation clears queue", /function cancelSpeech\(\)[\s\S]*?clearSpeechQueue\(\)/],
  ["voice cache resets on voiceschanged", /voiceschanged[\s\S]*?cachedChineseVoice = null/]
];

const errors = checks
  .filter(([, pattern]) => !pattern.test(appSource))
  .map(([name]) => `- Missing mobile H5 speech behavior: ${name}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Mobile H5 speech rhythm ok: segmented queue, pause map, voice preference and cancellation are present.");
