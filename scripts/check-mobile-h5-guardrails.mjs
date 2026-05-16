import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { unit01 } from "../src/shared/unit-01.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const h5Root = join(root, "src/clients/mobile-h5");
const appSource = readFileSync(join(h5Root, "app.js"), "utf8");
const indexSource = readFileSync(join(h5Root, "index.html"), "utf8");
const swSource = readFileSync(join(h5Root, "sw.js"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const errors = [];

const styleVersion = matchVersion(indexSource, /styles\.css\?v=(\d+)/, "index styles.css version");
const appVersion = matchVersion(indexSource, /app\.js\?v=(\d+)/, "index app.js version");
const importVersion = matchVersion(appSource, /unit-01\.js\?v=(\d+)/, "app unit-01.js version");
const cacheVersion = matchVersion(swSource, /const VERSION\s*=\s*"v(\d+)"/, "service worker cache version");
const versions = [styleVersion, appVersion, importVersion, cacheVersion].filter(Boolean);
if (new Set(versions).size > 1) {
  errors.push(`Mobile H5 resource versions must match, found ${versions.join(", ")}.`);
}

if (!pkg.scripts?.["audit:h5"]?.includes("scripts/mobile-h5-visual-audit.mjs")) {
  errors.push("package.json must expose audit:h5 for fixed viewport screenshot review.");
}

if (!pkg.scripts?.["check:h5"]?.includes("check-mobile-h5-guardrails.mjs")) {
  errors.push("npm run check:h5 must include check-mobile-h5-guardrails.mjs.");
}

if (!/if \(!video \|\| video\.status === "legacy-sample"\) return null;/.test(appSource)) {
  errors.push("recognitionVideoFor() must keep filtering legacy-sample videos.");
}

if (!/function hasBakedRecognitionAudio\(item\)[\s\S]*?audioTrack\?\.status === "baked"/.test(appSource)) {
  errors.push("Mobile H5 must detect baked recognition audio before suppressing Web Speech.");
}

if (!/function scheduleIntroSpeech\([\s\S]*?hasBakedRecognitionAudio\(currentChar\(\)\)/.test(appSource)) {
  errors.push("Mobile H5 must not auto-start Web Speech when a recognition video has baked audio.");
}

if (!/\$\{video\.audioTrack\?\.status === "baked" \? "" : "muted"\}/.test(appSource)) {
  errors.push("Mobile H5 recognition videos with baked audio must not be forced muted.");
}

if (!/function markRecognized\(id\)[\s\S]*?recognizedAt: Date\.now\(\),[\s\S]*?needsReview: false[\s\S]*?function markNeedsReview/.test(appSource)) {
  errors.push("Single-character practice must record recognizedAt and clear needsReview only on correct answers.");
}

if (/function markRecognized\(id\)[\s\S]*?tracedAt: characterEvidence\(id\)\.tracedAt \|\| Date\.now\(\)[\s\S]*?function markNeedsReview/.test(appSource)) {
  errors.push("Correct practice answers must not synthesize tracedAt; writing evidence must come from the write step.");
}

if (!/function markNeedsReview\(id\)[\s\S]*?needsReview: true[\s\S]*?lastMissAt: Date\.now\(\)/.test(appSource)) {
  errors.push("Wrong answers must set needsReview and lastMissAt.");
}

if (!/function markNeedsReview\(id\)[\s\S]*?masteredAt: null[\s\S]*?needsReview: true/.test(appSource)) {
  errors.push("Wrong answers must clear masteredAt so missed characters are not still treated as mastered.");
}

if (!/function nextPendingStudyIndex\(\)[\s\S]*?findIndex\(\(item\) => needsReview\(item\.id\)\)[\s\S]*?findIndex\(\(item\) => !isRecognized\(item\.id\)\)/.test(appSource)) {
  errors.push("Next learning target must prioritize needsReview before unseen characters.");
}

if (!/function isUnitComplete\(\)[\s\S]*?learnedCount\(\) >= unit01\.characters\.length && evidenceCounts\(\)\.review === 0/.test(appSource)) {
  errors.push("Unit completion must require all recognized characters and no pending review.");
}

if (!/function markMasteredFromQuiz\(quiz\)[\s\S]*?quiz\.answers[\s\S]*?filter\(\(answer\) => answer\.correct\)[\s\S]*?masteredAt: Date\.now\(\)/.test(appSource)) {
  errors.push("Mastery must be granted from correct quiz answers, not from merely reaching a result page.");
}

if (!/answers: \[\],[\s\S]*?questions: targets\.map/.test(appSource)) {
  errors.push("Quiz state must keep per-question answers for mastery evidence.");
}

if (!/function renderResult\(\)[\s\S]*?const canAdvance = result\.passed && isUnitComplete\(\)[\s\S]*?data-action="start-learning">复习错字/.test(appSource)) {
  errors.push("Result page must gate next-unit advancement on full unit completion and route pending review back to learning.");
}

if (!/function renderPayment\(\)[\s\S]*?if \(!isUnitComplete\(\)\)[\s\S]*?data-action="start-learning"/.test(appSource)) {
  errors.push("Payment route must remain locked until Unit-01 is complete with no pending review.");
}

if (!/function nextAfterPractice\(\)[\s\S]*?groupHasPendingStudy\(completedGroup\)[\s\S]*?groupNeedsQuiz\(completedGroup\)[\s\S]*?nextPendingStudyIndex\(\)/.test(appSource)) {
  errors.push("Practice completion must prefer pending review/unrecognized characters before moving into tests.");
}

if (!/function nextQuizQuestion\(\)[\s\S]*?const completedQuiz = state\.quiz[\s\S]*?const nextIndex = nextPendingStudyIndex\(\)[\s\S]*?if \(nextIndex === -1\)/.test(appSource)) {
  errors.push("Quiz completion must use the unified pending-study target before moving to the unit test.");
}

if (!existsSync(join(root, "scripts/mobile-h5-visual-audit.mjs"))) {
  errors.push("scripts/mobile-h5-visual-audit.mjs is required for visual review.");
}

for (const item of unit01.characters) {
  if (item.legacyRecognitionVideo && item.legacyRecognitionVideo.status !== "legacy-sample") {
    errors.push(`${item.id}(${item.char}) legacyRecognitionVideo must keep status legacy-sample.`);
  }

  if (item.recognitionVideo) {
    validateOfficialVideo(item, item.recognitionVideo);
  }
}

validateRecognitionCandidateMetadata();

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Mobile H5 guardrails ok: v${versions[0] || "?"} resources, legacy gate, visual audit hook, official video policy.`);

function matchVersion(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) errors.push(`Missing ${label}.`);
  return match?.[1] || "";
}

function validateOfficialVideo(item, video) {
  if (video.status !== "official") {
    errors.push(`${item.id}(${item.char}) recognitionVideo must use status "official".`);
  }

  // 2026-05-16 v37: upper bound relaxed 8s → 12s. The 一 v3 video grew to 10s
  // when the 米字格 + 笔顺 demo segment was appended after the original 7.4s
  // teaching beats. 12s keeps the cap meaningful (rejects runaway videos) but
  // leaves headroom for one extra teaching/writing demo segment per char.
  if (!Number.isFinite(video.duration) || video.duration < 3 || video.duration > 12) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo duration must be 3-12s.`);
  }

  if (video.fps !== 24) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo must render at 24fps.`);
  }

  if (!Number.isFinite(video.width) || !Number.isFinite(video.height)) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo must include width and height.`);
  }

  if (!Array.isArray(video.sources) || video.sources.length < 2) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo must include mp4 and webm sources.`);
  }

  const sourceTypes = new Set((video.sources || []).map((source) => source.type));
  if (!sourceTypes.has("video/mp4") || !sourceTypes.has("video/webm")) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo sources must include video/mp4 and video/webm.`);
  }

  const assetPaths = [
    video.src,
    video.webm,
    video.poster,
    video.finalFrame,
    ...(video.sources || []).map((source) => source.src)
  ].filter(Boolean);
  assetPaths.forEach((assetPath) => {
    if (/v3|legacy|sample/i.test(assetPath)) {
      errors.push(`${item.id}(${item.char}) official recognitionVideo must not point at legacy/sample assets: ${assetPath}`);
    }
    if (!existsSync(resolveH5Asset(assetPath))) {
      errors.push(`${item.id}(${item.char}) missing official recognitionVideo asset: ${assetPath}`);
    }
  });

  if (Array.isArray(video.voiceCues) && video.voiceCues.length > 0) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo must not depend on Web Speech voiceCues.`);
  }

  if (video.audioTrack?.status !== "baked") {
    errors.push(`${item.id}(${item.char}) official recognitionVideo must include audioTrack.status="baked".`);
  }

  const sourcePaths = uniqueVideoSources(video);
  sourcePaths.forEach((sourcePath) => validateOfficialVideoMedia(item, video, sourcePath));
}

function validateRecognitionCandidateMetadata() {
  const candidateMetadataPaths = collectMetadataPaths(join(h5Root, "assets/recognition"));

  candidateMetadataPaths.filter(existsSync).forEach((metadataPath) => {
    let metadata;
    try {
      metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    } catch {
      errors.push(`Invalid recognition candidate metadata JSON: ${metadataPath}`);
      return;
    }

    const item = unit01.characters.find((character) => character.id === metadata.characterId);
    if (!item) {
      errors.push(`Recognition candidate metadata references unknown character: ${metadata.characterId || "missing"}`);
      return;
    }

    const claimsOfficial = metadata.status === "official" || metadata.audioTrack?.status === "baked";
    if (!claimsOfficial) return;

    const videoPath = metadataAssetPath(metadataPath, metadata.video || metadata.videoCandidate);
    const webmPath = metadataAssetPath(metadataPath, metadata.webm || metadata.webmCandidate);
    const posterPath = metadataAssetPath(metadataPath, metadata.poster || metadata.posterCandidate);
    const finalFramePath = metadataAssetPath(metadataPath, metadata.finalFrame || metadata.finalFrameCandidate);
    validateOfficialVideo(item, {
      status: "official",
      src: videoPath,
      webm: webmPath,
      poster: posterPath,
      finalFrame: finalFramePath,
      sources: [
        { src: webmPath, type: "video/webm" },
        { src: videoPath, type: "video/mp4" }
      ].filter((source) => source.src),
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      fps: metadata.fps,
      audioTrack: metadata.audioTrack
    });
  });
}

function collectMetadataPaths(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return collectMetadataPaths(entryPath);
    if (entry.isFile() && entry.name.endsWith(".metadata.json")) return [entryPath];
    return [];
  });
}

function metadataAssetPath(metadataPath, assetPath) {
  if (!assetPath) return "";
  if (assetPath.startsWith("./")) {
    const absoluteAssetPath = normalize(join(dirname(metadataPath), assetPath.slice(2)));
    return `./${relative(h5Root, absoluteAssetPath)}`;
  }
  return assetPath;
}

function resolveH5Asset(assetPath) {
  if (assetPath.startsWith("./")) return normalize(join(h5Root, assetPath.slice(2)));
  return normalize(join(h5Root, assetPath));
}

function uniqueVideoSources(video) {
  const paths = [
    video.src,
    video.webm,
    ...(video.sources || []).map((source) => source.src)
  ].filter(Boolean);
  return [...new Set(paths)];
}

function validateOfficialVideoMedia(item, video, assetPath) {
  const fullPath = resolveH5Asset(assetPath);
  if (!existsSync(fullPath)) return;

  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,duration:format=duration,size",
      "-of",
      "json",
      fullPath
    ],
    { encoding: "utf8" }
  );

  if (probe.error) {
    errors.push(`${item.id}(${item.char}) ffprobe failed for ${assetPath}: ${probe.error.message}`);
    return;
  }

  if (probe.status !== 0) {
    errors.push(`${item.id}(${item.char}) ffprobe rejected ${assetPath}: ${probe.stderr || "unknown error"}`);
    return;
  }

  let media;
  try {
    media = JSON.parse(probe.stdout);
  } catch {
    errors.push(`${item.id}(${item.char}) ffprobe returned invalid JSON for ${assetPath}.`);
    return;
  }

  const streams = Array.isArray(media.streams) ? media.streams : [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");
  const audioStream = streams.find((stream) => stream.codec_type === "audio");
  if (!videoStream) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo source has no video stream: ${assetPath}`);
    return;
  }

  if (!audioStream) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo source must contain a baked audio stream: ${assetPath}`);
  }

  if (videoStream.width !== video.width || videoStream.height !== video.height) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo dimensions mismatch for ${assetPath}: expected ${video.width}x${video.height}, got ${videoStream.width}x${videoStream.height}.`);
  }

  const sourceDuration = Number(videoStream.duration || media.format?.duration);
  if (!Number.isFinite(sourceDuration) || Math.abs(sourceDuration - video.duration) > 0.15) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo duration mismatch for ${assetPath}: expected ${video.duration}s, got ${Number.isFinite(sourceDuration) ? `${sourceDuration}s` : "unknown"}.`);
  }

  const sourceFps = fpsFromRate(videoStream.avg_frame_rate || videoStream.r_frame_rate);
  if (!Number.isFinite(sourceFps) || Math.abs(sourceFps - video.fps) > 0.05) {
    errors.push(`${item.id}(${item.char}) official recognitionVideo fps mismatch for ${assetPath}: expected ${video.fps}, got ${Number.isFinite(sourceFps) ? sourceFps : "unknown"}.`);
  }
}

function fpsFromRate(rate) {
  if (!rate || rate === "0/0") return NaN;
  const [numerator, denominator] = `${rate}`.split("/").map(Number);
  if (!Number.isFinite(numerator)) return NaN;
  if (!Number.isFinite(denominator) || denominator === 0) return numerator;
  return numerator / denominator;
}
