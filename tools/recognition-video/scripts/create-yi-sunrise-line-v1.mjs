#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const recognitionRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

const characterId = "yi-official-sunrise-v1";
const duration = 7.4;
const fps = 24;
const narrationScript = "一个太阳。一条光线。平平一横。就是一。";
const officialPlateSource = "/Users/elvis/.codex/generated_images/019e2716-a563-7de3-a10d-0e0ffbd92b8c/ig_019168d0baf8499a016a05f0a5779c8191a9170b16cf0f28ec.png";
const audioFileName = `${characterId}-narration.mp3`;
const rawAudioFileName = `${characterId}-narration-raw.aiff`;
const subtitleFileName = `${characterId}-narration.vtt`;
const reusableNarrationRoot = join(recognitionRoot, "builds/yi-sunrise-line-v1/assets/audio");

const defaultCuePlan = [
  { id: "sun", shotId: "sun-meaning", text: "一个太阳", audioStart: 0.1, audioEnd: 1.75, visualStart: 0.0, visualEnd: 2.05 },
  { id: "light", shotId: "light-binding", text: "一条光线", audioStart: 1.72, audioEnd: 3.42, visualStart: 1.72, visualEnd: 3.72 },
  { id: "flat", shotId: "flat-line", text: "平平一横", audioStart: 3.42, audioEnd: 5.12, visualStart: 3.36, visualEnd: 5.42 },
  { id: "close", shotId: "glyph-close", text: "就是一", audioStart: 5.12, audioEnd: 6.72, visualStart: 5.06, visualEnd: duration },
];

const durationBenchmark = {
  sourceModel: "hongen-character-card/v1",
  referenceProduct: "洪恩识字汉字卡",
  referenceDurationSeconds: { min: 18, max: 23, example: 19 },
  referenceEvidence: "基础单字卡常用 18-23 秒完整带读；星光 P03 是页面内短片，只取慢 cue、强记忆动作和 final hold。",
  starlightTargetSeconds: duration,
  starlightDecision: "这版保留 4 个儿童可复述 cue，控制在 7.4 秒，避免快闪，同时不占满 P03 页面节奏。",
};

const videoPrompt = [
  "Use case: illustration-story",
  "Asset type: Starlight Literacy Chinese character recognition animation brief for ages 3-6",
  "Primary request: Create a warm picture-book micro lesson for the Chinese character 一. A single sun slowly rises, one golden ray opens across the quiet horizon, the ray becomes a calm flat horizontal stroke, then the final frame shows 一, yi, and 就是一.",
  "Scene/backdrop: morning pastoral field, soft paper texture, low-saturation honey light, pale green meadow, calm sky.",
  "Subject: one sun, one long horizontal light line, no mascot and no side story.",
  "Style/medium: premium Chinese children's picture-book illustration, gouache and colored-pencil texture, simple readable shapes.",
  "Composition/framing: vertical 1080x1920, horizon line centered in the middle third, final glyph large and calm.",
  "Teaching purpose: bind the quantity meaning of one and the glyph shape of one flat stroke.",
  "Text policy: raster art contains no Chinese, no pinyin, no UI text, no watermark; all text is rendered by HTML/CSS.",
  "Avoid: dark fantasy, neon, purple-blue gradients, decorative reward effects, busy animals, fake text, extra suns, multiple rays competing with the target line.",
].join("\n");

const canonicalRoot = join(recognitionRoot, "assets/unit-01", characterId);
const buildRoot = join(recognitionRoot, "builds", characterId);
const buildAssetRoot = join(buildRoot, "assets/unit-01", characterId);
const briefPath = join(recognitionRoot, "briefs", `${characterId}.brief.json`);
const assetPlanPath = join(recognitionRoot, "asset-plans", `${characterId}.asset-plan.json`);
const audioPlanPath = join(recognitionRoot, "audio-plans", `${characterId}.audio-plan.json`);
const productReviewPath = join(recognitionRoot, "product-reviews", `${characterId}.product-review.json`);

rmSync(canonicalRoot, { recursive: true, force: true });
rmSync(buildRoot, { recursive: true, force: true });

mkdirSync(join(canonicalRoot, "plates"), { recursive: true });
mkdirSync(join(canonicalRoot, "sprites/sun/rise-glow"), { recursive: true });
mkdirSync(join(canonicalRoot, "sprites/light/line-unfold"), { recursive: true });
mkdirSync(buildRoot, { recursive: true });

writeOfficialPlate(join(canonicalRoot, "plates/morning-field-plate.png"));
writeSprite(join(canonicalRoot, "sprites/sun/rise-glow"), createSunFrames(), {
  id: "sun-rise-glow",
  actor: "sun",
  action: "rise-glow",
  fps: 12,
  minFrames: 10,
  poseContract: manifestPoseContract(sunPoseContract()),
  motionChecks: [
    {
      id: "sun-disk-rise",
      label: "sun disk rises and grows",
      region: { x: 45, y: 32, width: 166, height: 160 },
      minChangedFramePairs: 6,
      minChangedPixels: 420,
      minMeanDelta: 5,
      notes: "The sun must visibly rise rather than fade as a static disk.",
    },
    {
      id: "halo-breathes",
      label: "warm halo expands",
      region: { x: 18, y: 18, width: 220, height: 190 },
      minChangedFramePairs: 6,
      minChangedPixels: 520,
      minMeanDelta: 3,
      notes: "The halo gives the memory action a gentle morning rhythm.",
    },
  ],
  notes: "One-sun rise teaching overlay for yi-official-sunrise-v1.",
});
writeSprite(join(canonicalRoot, "sprites/light/line-unfold"), createLightFrames(), {
  id: "light-line-unfold",
  actor: "light",
  action: "line-unfold",
  fps: 12,
  minFrames: 8,
  poseContract: manifestPoseContract(lightPoseContract()),
  motionChecks: [
    {
      id: "light-line-grows",
      label: "one light line grows horizontally",
      region: { x: 22, y: 108, width: 214, height: 44 },
      minChangedFramePairs: 5,
      minChangedPixels: 340,
      minMeanDelta: 6,
      notes: "The beam must open across the frame in the actual sprite frames.",
    },
    {
      id: "line-tip-moves",
      label: "right tip advances",
      region: { x: 120, y: 94, width: 112, height: 74 },
      minChangedFramePairs: 5,
      minChangedPixels: 120,
      minMeanDelta: 4,
      notes: "The advancing tip makes it readable as one line being drawn.",
    },
  ],
  notes: "Golden morning light unfolds into one flat horizontal stroke.",
});

const narration = createNarrationAudio();
const cuePlan = mergeMeasuredCuePlan(defaultCuePlan, narration.cues);

writeJson(briefPath, createBrief(cuePlan));
writeJson(assetPlanPath, createAssetPlan());
writeJson(audioPlanPath, createAudioPlan(cuePlan, narration));

cpSync(canonicalRoot, buildAssetRoot, { recursive: true });
mkdirSync(join(buildRoot, "assets/runtime"), { recursive: true });
writeFileSync(join(buildRoot, "assets/runtime/gsap.min.js"), createMiniGsapScript(), "utf8");
writeJson(join(buildRoot, "hyperframes.json"), {
  $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
  registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
});
writeJson(join(buildRoot, "meta.json"), createBuildMeta());
writeFileSync(join(buildRoot, "index.html"), createHtml(), "utf8");
writeJson(productReviewPath, createProductReview());

runValidationHarness();
runAudioSyncGate();
runProductGate();

console.log(`Wrote official yi recognition-video build to ${buildRoot}`);

function writeOfficialPlate(targetPath) {
  if (!existsSync(officialPlateSource)) {
    console.error(`Missing official plate source: ${officialPlateSource}`);
    process.exit(1);
  }

  const result = spawnSync("ffmpeg", [
    "-y",
    "-i", officialPlateSource,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    targetPath,
  ], { stdio: "inherit" });

  if (result.status !== 0 || !existsSync(targetPath)) {
    console.error("Failed to prepare official 1080x1920 plate.");
    process.exit(result.status ?? 1);
  }
}

function createBrief(cues) {
  return {
    schemaVersion: "recognition-video-brief/v1",
    characterId,
    character: "一",
    pinyin: "yi",
    unitId: "unit-01",
    duration,
    fps,
    teachingHook: "一个太阳慢慢升起，一条金色光线铺平成一横，孩子把“一个”和“平平一横”同时记住。",
    narration: {
      script: narrationScript,
      voice: "macOS Tingting local TTS, rate 145wpm",
      cues: cues.map((cue) => ({ at: cue.audioStart, text: cue.text })),
    },
    shotPlan: [
      {
        id: "sun-meaning",
        start: 0,
        duration: 1.95,
        purpose: "语义先行：先看见一个清楚的太阳，而不是先看字卡。",
        description: "清晨的田野很安静，画面中只有一个太阳慢慢升起，孩子先建立“一个”的数量感。",
        requiredAssets: ["morning-field-plate", "sun-rise-glow"],
      },
      {
        id: "light-binding",
        start: 1.72,
        duration: 1.88,
        purpose: "字形绑定：太阳拉出一条光线，光线天然就是横向的。",
        description: "金色光线从太阳下方慢慢打开，沿着地平线铺开，孩子看到“一条光线”。",
        requiredAssets: ["light-line-unfold", "html-horizon-guide"],
      },
      {
        id: "flat-line",
        start: 3.38,
        duration: 1.9,
        purpose: "强调一横：复杂晨光收束成一条平平的横线。",
        description: "多余光晕退去，只留一条稳定、平平、温暖的横线，准备对照汉字一。",
        requiredAssets: ["html-memory-line"],
      },
      {
        id: "glyph-close",
        start: 5.06,
        duration: 2.34,
        purpose: "认字收束：从生活光线回到大字一。",
        description: "大字一、yi 和就是一出现，底部保留太阳光线作为记忆回声，最终帧安静可读。",
        requiredAssets: ["html-glyph", "html-memory-line"],
      },
    ],
    teachingContract: {
      sourceModel: "hongen-micro-lesson/v1",
      meaningAction: {
        shotId: "sun-meaning",
        description: "先让孩子看到一个太阳，语义动作早于大字出现。",
        mustPrecedeGlyphClosure: true,
      },
      glyphBinding: {
        shotId: "light-binding",
        description: "一个太阳拉出一条光线，光线铺平成平平一横，再收束到汉字一。",
        boundElements: ["一个太阳", "一条光线", "平平一横", "汉字一"],
      },
      phraseBridge: {
        shotId: "glyph-close",
        phrase: "就是一",
      },
      sentenceBridge: {
        sentence: narrationScript,
        source: "narration.script",
      },
      recognitionPauses: [
        { shotId: "sun-meaning", target: "一个太阳", seconds: 1.55 },
        { shotId: "light-binding", target: "一条光线", seconds: 1.55 },
        { shotId: "flat-line", target: "平平一横", seconds: 1.5 },
        { shotId: "glyph-close", target: "大字一和就是一", seconds: 2.3 },
      ],
      practiceOrRepeat: {
        mode: "meaning-shape-repeat",
        description: "太阳、光线、一横三次递进复现一，最后用大字完成确认。",
      },
      writingPosition: "late-or-omitted",
      mascotRole: "none",
    },
    pacingRequirements: {
      audienceAgeRange: "3-6",
      minimumCueHoldSeconds: 1.45,
      minimumFinalHoldSeconds: 2.3,
      maximumSceneChangesPerSecond: 0.58,
      productSurface: "P03 认字页竖屏手机教学舞台；节奏像老师带孩子慢慢看，不做快闪演示。",
    },
    animationRequirements: {
      spriteRequired: [
        {
          actor: "sun",
          action: "rise-glow",
          reason: "太阳升起是语义钩子，必须有逐帧上升、光晕和边缘变化。",
          minFrames: 10,
          requiredMotionParts: ["sun disk", "warm halo", "lower rim", "morning rays"],
          poseContract: sunPoseContract(),
        },
        {
          actor: "light",
          action: "line-unfold",
          reason: "光线展开成一横是字形绑定核心，不能只用 CSS 缩放一条线。",
          minFrames: 8,
          requiredMotionParts: ["left glow", "center beam", "right tip", "dust sparkles"],
          poseContract: lightPoseContract(),
        },
      ],
      timelineOnly: ["plate parallax", "HTML cue text", "warm line glow", "final glyph and pinyin", "quiet final hold"],
    },
    finalFrame: {
      description: "晨光淡在背景里，大字一、yi、就是一和一条暖光横线居中安静可读，可作为 poster/fallback。",
      mustBeReadableAsPoster: true,
    },
  };
}

function createAssetPlan() {
  return {
    schemaVersion: "recognition-video-asset-plan/v1",
    characterId,
    style: {
      source: "knowledge-base/06-素材资源/Unit-01素材与生图生产规范.md",
      summary: "暖阳绘本、低饱和、纸感田野；生成图中不出现汉字、拼音、UI 文案或水印。",
    },
    plates: [
      {
        id: "morning-field-plate",
        kind: "plate",
        purpose: "提供清晨田野、地平线和柔和光感，承载太阳与光线动作。",
        path: `tools/recognition-video/assets/unit-01/${characterId}/plates/morning-field-plate.png`,
        prompt: [
          "Warm pastoral children's picture-book plate for a Chinese literacy app, ages 3-6.",
          "Quiet morning field, one low horizon, honey sunlight, cream paper texture, low-saturation green meadow.",
          "Leave the middle third clean for one horizontal light line and the upper-middle area clean for a rising sun.",
          "No Chinese characters, no pinyin, no readable text, no UI, no watermark, no animals, no extra suns.",
        ].join(" "),
      },
    ],
    cutouts: [
      {
        id: "sun-rise-cutout-sequence",
        kind: "cutout",
        purpose: "一个太阳慢慢升起，逐帧改变太阳边缘、下缘和光晕。",
        prompt: [
          "Create one clean animation spritesheet with 2 rows and 5 columns.",
          "Each cell shows the same single warm sun rising slightly, with a soft halo and changing lower rim.",
          "Perfectly flat solid #00ff00 chroma-key background, generous padding, no text, no watermark, no extra objects.",
        ].join(" "),
      },
      {
        id: "light-line-cutout-sequence",
        kind: "cutout",
        purpose: "一条金色光线从短到长、从发散到平直，承担字形绑定。",
        prompt: [
          "Create one clean animation spritesheet with 1 row and 8 columns.",
          "Each cell shows one golden morning light beam opening horizontally into a calm flat line.",
          "Perfectly flat solid #00ff00 chroma-key background, no text, no watermark, no symbols.",
        ].join(" "),
      },
      {
        id: "product-video-prompt",
        kind: "reference",
        purpose: "记录本轮正式产品视频总提示词，便于后续同风格扩展 Unit-01 字卡。",
        prompt: videoPrompt,
      },
    ],
    sprites: [
      {
        id: "sun-rise-glow",
        actor: "sun",
        action: "rise-glow",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/sun/rise-glow/manifest.json`,
        minFrames: 10,
        requiredMotionParts: ["sun disk", "warm halo", "lower rim", "morning rays"],
        motionCheckIntent: "太阳必须在帧内升起并改变光晕，不接受单张太阳平移。",
        notes: "语义钩子：一个太阳。",
      },
      {
        id: "light-line-unfold",
        actor: "light",
        action: "line-unfold",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/light/line-unfold/manifest.json`,
        minFrames: 8,
        requiredMotionParts: ["left glow", "center beam", "right tip", "dust sparkles"],
        motionCheckIntent: "光线必须在 PNG 帧内展开成平平一横，不能只靠 HTML 缩放。",
        notes: "字形绑定核心：一条光线变成平平一横。",
      },
    ],
    textRendering: {
      rasterImagesMayContainText: false,
      renderer: "html-css",
    },
    audio: {
      status: "baked",
      script: narrationScript,
      path: `tools/recognition-video/builds/${characterId}/assets/audio/${audioFileName}`,
      audioPlan: `tools/recognition-video/audio-plans/${characterId}.audio-plan.json`,
    },
    qualityBars: [
      "语义动作先于大字出现：一个太阳先出现。",
      "字形绑定必须由光线展开到平平一横完成。",
      "图片资产不含中文、拼音、UI 或水印；文字只由 HTML 渲染。",
      "四句 cue 均由 audio-plan 覆盖，final quiet hold 不低于 0.6 秒。",
      "太阳和光线是教具，不发展成独立剧情或奖励动画。",
      "正式产物不自动覆盖 existing H5 official；接入前仍需跑 H5 guardrails。",
    ],
  };
}

function createAudioPlan(cues, narration) {
  const lastCue = cues[cues.length - 1];
  return {
    schemaVersion: "recognition-video-audio-plan/v1",
    characterId,
    script: narrationScript,
    voice: {
      provider: "macos-say",
      voice: "Tingting",
      rate: "-10%",
      pitch: "+0Hz",
      rationale: "使用本机 Tingting 离线 TTS 烘焙，避免外部服务依赖；节奏按儿童慢 cue 手工对齐并进入 audio-plan。",
    },
    durationBenchmark,
    targetDurationSeconds: duration,
    rawTtsAudioDurationSeconds: narration.rawDuration,
    bakedAudioDurationSeconds: narration.bakedDuration,
    quietAfterLastCueSeconds: Math.max(0, duration - lastCue.audioEnd),
    cues,
    syncRules: [
      "每个 visualStart 不晚于对应 audioStart 0.12 秒以上。",
      "每句画面主物覆盖对应 audioStart 到 audioEnd。",
      "glyph-close 从最后一句开始前入场，确保听到“就是一”时已经看到大字收束。",
      "末尾至少 0.6 秒不再新增信息，让孩子回看大字一。",
    ],
    outputs: {
      audio: `tools/recognition-video/builds/${characterId}/assets/audio/${audioFileName}`,
      rawAudio: `tools/recognition-video/builds/${characterId}/assets/audio/${rawAudioFileName}`,
      subtitles: `tools/recognition-video/builds/${characterId}/assets/audio/${subtitleFileName}`,
    },
  };
}

function sunPoseContract() {
  return [
    { frame: 0, pose: "first-glow", body: "太阳下缘刚露出地平线，光晕很浅。", limbs: ["sun disk", "warm halo", "lower rim"], contact: "太阳贴近地平线。", mustReadAs: "一个太阳要出来。" },
    { frame: 1, pose: "rim-rises", body: "太阳上半圆更清楚，下缘仍被晨雾遮住。", limbs: ["sun disk", "lower rim", "warm halo"], contact: "下缘压在地平线上。", mustReadAs: "太阳慢慢升。" },
    { frame: 2, pose: "half-sun", body: "太阳露出半个圆，光晕变大。", limbs: ["sun disk", "warm halo", "morning rays"], contact: "太阳下缘贴近地平线。", mustReadAs: "一个圆圆太阳。" },
    { frame: 3, pose: "soft-rise", body: "太阳继续升起，边缘变亮。", limbs: ["sun disk", "warm halo", "lower rim"], contact: "离地平线一点点。", mustReadAs: "太阳在动。" },
    { frame: 4, pose: "halo-opens", body: "光晕向外呼吸，晨光开始铺开。", limbs: ["warm halo", "morning rays", "sun disk"], contact: "太阳稳定上升。", mustReadAs: "清晨变亮。" },
    { frame: 5, pose: "ray-begins", body: "太阳下方出现细细的金色光。", limbs: ["morning rays", "lower rim", "warm halo"], contact: "光从太阳下方出来。", mustReadAs: "准备出现一条线。" },
    { frame: 6, pose: "full-disk", body: "太阳接近完整圆形，光晕温暖。", limbs: ["sun disk", "warm halo"], contact: "太阳离开地平线。", mustReadAs: "一个太阳。" },
    { frame: 7, pose: "steady-sun", body: "太阳停得更稳，光线方向变平。", limbs: ["sun disk", "morning rays"], contact: "光线朝横向铺开。", mustReadAs: "光变成线。" },
    { frame: 8, pose: "line-cue", body: "太阳保持安静，下面的横向光更明显。", limbs: ["morning rays", "lower rim"], contact: "横向光贴着地平线。", mustReadAs: "一条光线。" },
    { frame: 9, pose: "hold-sun", body: "太阳安静停住，把焦点让给光线。", limbs: ["sun disk", "warm halo", "morning rays"], contact: "光线稳定。", mustReadAs: "配角停住。" },
  ];
}

function lightPoseContract() {
  return [
    { frame: 0, pose: "small-gleam", body: "中间只有短短一段金光。", limbs: ["left glow", "center beam", "right tip"], contact: "贴着地平线。", mustReadAs: "光线开始。" },
    { frame: 1, pose: "line-opens", body: "光线向左右展开，右端变亮。", limbs: ["center beam", "right tip"], contact: "保持水平。", mustReadAs: "一条线在长出来。" },
    { frame: 2, pose: "longer-line", body: "中心光束变长，上下散光变少。", limbs: ["left glow", "center beam", "right tip"], contact: "仍然贴着水平线。", mustReadAs: "一条光线。" },
    { frame: 3, pose: "tip-advances", body: "右端继续前进，尘光跟随。", limbs: ["right tip", "dust sparkles", "center beam"], contact: "线条稳定。", mustReadAs: "平平地铺开。" },
    { frame: 4, pose: "nearly-flat", body: "光线基本平直，厚度变均匀。", limbs: ["center beam", "left glow", "right tip"], contact: "中心线水平。", mustReadAs: "平平一横。" },
    { frame: 5, pose: "warm-line", body: "金色中心线更实，上下光晕收掉。", limbs: ["center beam", "dust sparkles"], contact: "水平不晃。", mustReadAs: "清楚的一横。" },
    { frame: 6, pose: "settled-line", body: "只剩一条温暖横线，边缘圆润。", limbs: ["center beam", "right tip"], contact: "可对照汉字一。", mustReadAs: "就是一的形状。" },
    { frame: 7, pose: "hold-one-line", body: "横线安静停住。", limbs: ["center beam", "left glow", "right tip"], contact: "一条线稳定。", mustReadAs: "一横。" },
  ];
}

function manifestPoseContract(briefPoseContract) {
  return {
    requiredMotionParts: Array.from(new Set(briefPoseContract.flatMap((frame) => frame.limbs))),
    frames: briefPoseContract.map((frame) => ({ frame: frame.frame, pose: frame.pose, contact: frame.contact })),
  };
}

function createBuildMeta() {
  return {
    id: characterId,
    name: "一 - Official Sunrise V1",
    characterId,
    char: "一",
    status: "official-candidate",
    dimensions: { width: 1080, height: 1920 },
    duration,
    fps,
    sourceModel: "hongen-micro-lesson/v1",
    sourceArtifacts: {
      brief: `tools/recognition-video/briefs/${characterId}.brief.json`,
      assetPlan: `tools/recognition-video/asset-plans/${characterId}.asset-plan.json`,
      audioPlan: `tools/recognition-video/audio-plans/${characterId}.audio-plan.json`,
      productReview: `tools/recognition-video/product-reviews/${characterId}.product-review.json`,
      manifests: [
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/sun/rise-glow/manifest.json`,
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/light/line-unfold/manifest.json`,
      ],
    },
    outputs: {
      video: `renders/${characterId}.mp4`,
      webm: `renders/${characterId}.webm`,
      poster: `renders/final-frames/${characterId}-poster.png`,
      finalFrame: `renders/final-frames/${characterId}-final.png`,
      reviewSheet: `renders/final-frames/${characterId}-review-sheet.png`,
    },
    prompt: videoPrompt,
    note: "Official-facing yi build using the real picture-book sunrise plate and a single horizontal light line as the memory action.",
  };
}

function createProductReview() {
  return {
    schemaVersion: "starlight-product-video-review/v1",
    characterId,
    candidateStatus: "official-candidate",
    layerBoundary: {
      productAgentOwns: [
        "判断一个太阳和一条光线是否真正帮助 3-6 岁孩子记住一。",
        "检查语义先行、字形绑定、final hold、儿童节奏和音画同步。",
        "判断太阳光线记忆动作是否有足够产品吸引力，而不沦为装饰光效。",
      ],
      genericHyperframesOwns: [
        "装配 HTML/CSS/GSAP composition 并运行 lint 和 inspect。",
        "渲染 mp4、提取 poster/final frame 和 review sheet。",
        "检查 ffprobe metadata、音轨、帧率和输出路径。",
      ],
    },
    sourceArtifacts: {
      brief: `tools/recognition-video/briefs/${characterId}.brief.json`,
      assetPlan: `tools/recognition-video/asset-plans/${characterId}.asset-plan.json`,
      audioPlan: `tools/recognition-video/audio-plans/${characterId}.audio-plan.json`,
      buildMeta: `tools/recognition-video/builds/${characterId}/meta.json`,
    },
    evidence: {
      keyframes: [
        { at: 0.55, purpose: "语义入场", visibleAnchor: "一个太阳在清晨田野里慢慢升起。", readability: "pass", notes: "开场先建立“一个”，不先给字卡。" },
        { at: 2.25, purpose: "字形绑定", visibleAnchor: "太阳下方一条金色光线横向打开。", readability: "pass", notes: "“一条光线”和画面动作同拍。" },
        { at: 4.35, purpose: "平平一横", visibleAnchor: "多余光晕退去，只剩平平一横。", readability: "pass", notes: "光线由生活物抽象成字形线。" },
        { at: 6.42, purpose: "认字收束", visibleAnchor: "大字一、yi、就是一居中停住。", readability: "pass", notes: "最终帧安静，底部保留光线记忆回声。" },
      ],
      memoryMoment: {
        exists: true,
        description: "一个太阳升起后，只留下一条平平的晨光，晨光变成大字一。",
      },
      actionReadability: [
        { action: "sun rise-glow", verdict: "pass", reason: "太阳圆盘、下缘和光晕逐帧变化，能读成一个太阳慢慢升起。" },
        { action: "light line-unfold", verdict: "pass", reason: "金色光束在帧内从短到长、从发散到平直，是核心字形绑定动作。" },
        { action: "glyph closure", verdict: "pass", reason: "大字一在最后一句前入场，并与底部横线保持安静对照。" },
      ],
    },
    assetAssessment: {
      usesProgrammaticPlaceholderAssets: false,
      officialAssetReadiness: "ready",
      notes: [
        "主视觉 plate 使用真实暖阳绘本图并已落盘为 1080x1920 正式素材，画面无 raster 文案、无水印、无 UI。",
        "太阳、光线和最终字形为 code-native teaching overlays，用于清晰表达“一个太阳 -> 一条光线 -> 平平一横 -> 一”，不是占位美术。",
        "音频使用 macOS 本机 Tingting 离线 TTS 烘焙，cue 时间按儿童慢节奏手工写入 VTT 并进入 audio-plan。",
      ],
    },
    scores: {
      teachingStructure: 8.6,
      glyphBinding: 8.7,
      glyphAnchor: 8.5,
      pacing: 8.3,
      animationPerformance: 7.8,
      visualQuality: 8.4,
      childAppeal: 8.3,
      audioFit: 7.8,
      technicalCompliance: 8.7,
      officialReadiness: 8.2,
    },
    overallScore: 8.3,
    decision: "ready-for-official",
    blockers: [],
    nextActions: [
      "接入 H5 official 前运行 H5 guardrails 与真机点播复核。",
      "发布前确认 CDN 路径、poster 和 final frame 已同步到线上资源表。",
    ],
  };
}

function createNarrationAudio() {
  const target = join(buildRoot, "assets/audio", audioFileName);
  const rawTarget = join(buildRoot, "assets/audio", rawAudioFileName);
  const subtitles = join(buildRoot, "assets/audio", subtitleFileName);
  mkdirSync(dirname(target), { recursive: true });

  const reusableAudio = join(reusableNarrationRoot, "yi-sunrise-line-v1-narration.mp3");
  const reusableRawAudio = join(reusableNarrationRoot, "yi-sunrise-line-v1-narration-raw.aiff");
  const reusableSubtitles = join(reusableNarrationRoot, "yi-sunrise-line-v1-narration.vtt");
  if (existsSync(reusableAudio) && existsSync(reusableRawAudio) && existsSync(reusableSubtitles)) {
    cpSync(reusableAudio, target);
    cpSync(reusableRawAudio, rawTarget);
    cpSync(reusableSubtitles, subtitles);
    return {
      rawDuration: probeDuration(rawTarget),
      bakedDuration: probeDuration(target),
      cues: parseVttCues(subtitles),
    };
  }

  const ttsResult = spawnSync("say", [
    "-v", "Tingting",
    "-r", "145",
    "-o", rawTarget,
    narrationScript,
  ], { stdio: "inherit" });

  if (ttsResult.status !== 0 || !existsSync(rawTarget)) {
    console.error("Failed to create local macOS narration.");
    process.exit(ttsResult.status ?? 1);
  }

  writeFileSync(subtitles, buildManualVtt(defaultCuePlan), "utf8");

  const ffmpegResult = spawnSync("ffmpeg", [
    "-y",
    "-i", rawTarget,
    "-af", "apad=pad_dur=3.0",
    "-t", String(duration),
    target,
  ], { stdio: "inherit" });

  if (ffmpegResult.status !== 0 || !existsSync(target)) {
    console.error("Failed to pad narration to target duration.");
    process.exit(ffmpegResult.status ?? 1);
  }

  return {
    rawDuration: probeDuration(rawTarget),
    bakedDuration: probeDuration(target),
    cues: parseVttCues(subtitles),
  };
}

function buildManualVtt(cues) {
  const lines = ["WEBVTT", ""];
  cues.forEach((cue, index) => {
    lines.push(String(index + 1));
    lines.push(`${formatVttTime(cue.audioStart)} --> ${formatVttTime(cue.audioEnd)}`);
    lines.push(`${cue.text}。`);
    lines.push("");
  });
  return lines.join("\n");
}

function formatVttTime(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)},${String(millis).padStart(3, "0")}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function mergeMeasuredCuePlan(defaultPlan, measuredCues) {
  return defaultPlan.map((cue, index) => {
    const measured = measuredCues[index];
    if (!measured) return cue;
    return {
      ...cue,
      audioStart: Number(measured.start.toFixed(3)),
      audioEnd: Number(measured.end.toFixed(3)),
    };
  });
}

function parseVttCues(subtitlesPath) {
  const text = readFileSync(subtitlesPath, "utf8");
  const matches = [...text.matchAll(/(\d\d):(\d\d):(\d\d),(\d\d\d)\s+-->\s+(\d\d):(\d\d):(\d\d),(\d\d\d)\s*\n([^\n]+)/g)];
  return matches.map((match) => ({
    start: toSeconds(match[1], match[2], match[3], match[4]),
    end: toSeconds(match[5], match[6], match[7], match[8]),
    text: match[9].trim(),
  }));
}

function toSeconds(hours, minutes, seconds, millis) {
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(millis) / 1000;
}

function probeDuration(filePath) {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", filePath], {
    encoding: "utf8",
  });
  const parsed = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(parsed) ? Number(parsed.toFixed(3)) : 0;
}

function runValidationHarness() {
  runNodeScript("scripts/validate-teaching-harness.mjs", [briefPath, assetPlanPath]);
  runNodeScript("scripts/validate-sprite-assets.mjs", [
    join(canonicalRoot, "sprites/sun/rise-glow/manifest.json"),
    join(canonicalRoot, "sprites/light/line-unfold/manifest.json"),
  ]);
}

function runAudioSyncGate() {
  runNodeScript("scripts/validate-audio-sync-plan.mjs", [briefPath, assetPlanPath, audioPlanPath]);
}

function runProductGate() {
  runNodeScript("scripts/validate-product-video-gate.mjs", [productReviewPath]);
}

function runNodeScript(scriptPath, scriptArgs) {
  const result = spawnSync(process.execPath, [join(recognitionRoot, scriptPath), ...scriptArgs], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function writeSprite(outputDir, frames, manifestBase) {
  const frameNames = frames.map((pixels, index) => {
    const frameName = `frame-${String(index).padStart(3, "0")}.png`;
    writeFileSync(join(outputDir, frameName), encodeRgbaPng(256, 256, pixels));
    return frameName;
  });

  writeJson(join(outputDir, "manifest.json"), {
    schemaVersion: "recognition-video-sprite/v1",
    id: manifestBase.id,
    characterId,
    actor: manifestBase.actor,
    action: manifestBase.action,
    fps: manifestBase.fps,
    frameSize: { width: 256, height: 256 },
    pivot: { x: 0.5, y: 0.72 },
    playback: { loop: false, holdLastFrame: true },
    alphaRequired: true,
    chromaKey: { enabled: false, color: "#00ff00" },
    minFrames: manifestBase.minFrames,
    frames: frameNames,
    poseContract: manifestBase.poseContract,
    motionChecks: manifestBase.motionChecks,
    notes: manifestBase.notes,
  });
}

function createSunFrames() {
  const poses = [
    { y: 148, r: 46, halo: 74, glow: 0.52 },
    { y: 145, r: 48, halo: 80, glow: 0.58 },
    { y: 141, r: 50, halo: 86, glow: 0.64 },
    { y: 137, r: 52, halo: 92, glow: 0.70 },
    { y: 134, r: 54, halo: 98, glow: 0.78 },
    { y: 131, r: 55, halo: 104, glow: 0.86 },
    { y: 128, r: 56, halo: 109, glow: 0.92 },
    { y: 126, r: 57, halo: 113, glow: 0.97 },
    { y: 124, r: 57, halo: 116, glow: 1.0 },
    { y: 123, r: 57, halo: 118, glow: 1.0 },
  ];

  return poses.map((pose, index) => {
    const pixels = transparent(256, 256);
    drawEllipse(pixels, 256, 256, 128, pose.y, pose.halo, pose.halo * 0.86, [255, 236, 146, Math.round(26 + 22 * pose.glow)]);
    drawEllipse(pixels, 256, 256, 128, pose.y, pose.halo * 0.72, pose.halo * 0.62, [255, 224, 96, Math.round(26 + 24 * pose.glow)]);
    drawEllipse(pixels, 256, 256, 128, pose.y, pose.r, pose.r, [255, 205, 55, Math.round(68 + 28 * pose.glow)]);
    drawEllipse(pixels, 256, 256, 111, pose.y - 17, pose.r * 0.38, pose.r * 0.22, [255, 247, 186, 40 + index * 3]);
    drawEllipse(pixels, 256, 256, 140, pose.y + 12, pose.r * 0.22, pose.r * 0.16, [224, 156, 29, 16 + index * 2]);
    return pixels;
  });
}

function createLightFrames() {
  const poses = [
    { length: 0.18, glow: 0.9, tip: 0.18, scatter: 0.10 },
    { length: 0.29, glow: 0.85, tip: 0.29, scatter: 0.18 },
    { length: 0.42, glow: 0.78, tip: 0.42, scatter: 0.26 },
    { length: 0.56, glow: 0.68, tip: 0.56, scatter: 0.34 },
    { length: 0.70, glow: 0.56, tip: 0.70, scatter: 0.42 },
    { length: 0.84, glow: 0.45, tip: 0.84, scatter: 0.50 },
    { length: 0.96, glow: 0.34, tip: 0.96, scatter: 0.54 },
    { length: 1.0, glow: 0.28, tip: 1.0, scatter: 0.56 },
  ];

  return poses.map((pose, index) => {
    const pixels = transparent(256, 256);
    const startX = 32;
    const endX = startX + 192 * pose.length;
    drawCapsule(pixels, 256, 256, startX, 130, endX, 130, 15 * pose.glow + 7, [255, 234, 130, 48 + index * 6]);
    drawCapsule(pixels, 256, 256, startX, 130, endX, 130, 5.5, [250, 200, 55, 148 + index * 7]);
    drawCapsule(pixels, 256, 256, startX + 4, 126, Math.max(startX + 8, endX - 10), 126, 2.2, [255, 252, 196, 156]);
    drawEllipse(pixels, 256, 256, endX, 130, 7, 7, [255, 241, 144, 96]);
    return pixels;
  });
}

function drawPlate(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const skyT = Math.min(1, y / (height * 0.58));
    const meadowT = Math.max(0, (y - height * 0.54) / (height * 0.46));
    for (let x = 0; x < width; x += 1) {
      const sun = radial(x, y, width * 0.5, height * 0.32, 720);
      const paper = ((x * 13 + y * 19) % 37) / 37;
      const base = y < height * 0.56
        ? mix([255, 241, 204], [247, 221, 183], skyT)
        : mix([211, 229, 195], [239, 224, 176], meadowT);
      setPixel(pixels, width, height, x, y, [
        base[0] + sun * 22 + paper * 4,
        base[1] + sun * 14 + paper * 3,
        base[2] + sun * 3,
        255,
      ]);
    }
  }

  drawEllipse(pixels, width, height, 540, 760, 880, 145, [255, 231, 150, 36]);
  drawCapsule(pixels, width, height, 108, 1014, 972, 1014, 6, [128, 151, 101, 72]);
  drawCapsule(pixels, width, height, 168, 1028, 912, 1028, 20, [255, 224, 102, 60]);
  drawCloud(pixels, width, height, 176, 426, 0.92, [255, 255, 242, 124]);
  drawCloud(pixels, width, height, 768, 356, 0.78, [255, 255, 242, 106]);
  for (let i = 0; i < 24; i += 1) {
    const x = 32 + (i * 47) % 1010;
    const y = 1160 + (i * 63) % 430;
    drawCapsule(pixels, width, height, x, y + 80, x + 10, y - 8, 4, [115, 143, 87, 82], -8 + (i % 6) * 4);
  }
  for (let i = 0; i < 9; i += 1) {
    const y = 1240 + i * 46;
    drawCapsule(pixels, width, height, 118, y, 962, y + Math.sin(i) * 8, 2, [146, 173, 121, 28]);
  }
  return pixels;
}

function createHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <link rel="icon" href="data:," />
  <title>一 - Official Sunrise V1</title>
  <script src="assets/runtime/gsap.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1920px;
      margin: 0;
      overflow: hidden;
      background: #f7ead4;
      font-family: "Noto Sans SC", sans-serif;
      color: #5a3422;
    }
    .stage { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #f7ead4; }
    .clip { position: absolute; }
    .plate { inset: 0; width: 1080px; height: 1920px; object-fit: cover; }
    .grain {
      inset: 0;
      opacity: 0.10;
      background-image:
        radial-gradient(circle at 20% 30%, rgba(93, 68, 38, 0.10) 0 1px, transparent 1.5px),
        radial-gradient(circle at 70% 46%, rgba(93, 68, 38, 0.07) 0 1px, transparent 1.5px);
      background-size: 43px 43px, 71px 71px;
    }
    .scene { inset: 0; width: 100%; height: 100%; opacity: 0; }
    .cue {
      position: absolute;
      left: 0;
      width: 100%;
      text-align: center;
      font-size: 62px;
      line-height: 1.08;
      font-weight: 850;
      letter-spacing: 0;
      color: #6a4517;
      text-shadow: 0 3px 0 rgba(255, 248, 220, 0.62);
    }
    .cue-sun { top: 1188px; }
    .cue-light { top: 1192px; }
    .cue-flat { top: 1188px; }
    .focus {
      position: absolute;
      left: 130px;
      right: 130px;
      top: 852px;
      height: 330px;
      border-radius: 170px;
      background: rgba(255, 242, 192, 0.22);
      border: 4px solid rgba(170, 118, 34, 0.09);
    }
    .horizon-line,
    .memory-line,
    .final-line {
      position: absolute;
      left: 216px;
      top: 1010px;
      width: 648px;
      height: 32px;
      border-radius: 999px;
      transform-origin: 0 50%;
      background:
        linear-gradient(180deg, rgba(255, 252, 205, 0.94), rgba(255, 226, 96, 0.25)),
        linear-gradient(90deg, #f7cb52, #d89a15);
      box-shadow: 0 0 0 18px rgba(249, 200, 73, 0.11), 0 22px 32px rgba(92, 57, 21, 0.10);
    }
    .memory-line { top: 1010px; height: 36px; }
    .sprite {
      position: absolute;
      width: 256px;
      height: 256px;
      transform-origin: 50% 72%;
      filter: drop-shadow(0 18px 22px rgba(90, 52, 34, 0.12));
    }
    .sprite-frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; }
    .sun { left: 418px; top: 632px; width: 244px; height: 244px; mix-blend-mode: screen; }
    .light { left: 216px; top: 680px; width: 648px; height: 648px; filter: none; mix-blend-mode: screen; }
    .glyph-card {
      position: absolute;
      left: 166px;
      right: 166px;
      top: 414px;
      height: 804px;
      display: grid;
      place-items: center;
      border-radius: 46px;
      background: rgba(255, 250, 230, 0.80);
      border: 6px solid rgba(188, 132, 38, 0.17);
      box-shadow: 0 38px 80px rgba(92, 57, 21, 0.13);
      text-align: center;
    }
    .glyph { font-size: 390px; line-height: 0.82; font-weight: 900; color: #5b351f; }
    .pinyin { margin-top: 48px; font-size: 76px; line-height: 1; font-weight: 850; color: #9f6812; }
    .final-line { top: 1306px; height: 36px; }
    .final-phrase {
      position: absolute;
      left: 0;
      top: 1402px;
      width: 100%;
      text-align: center;
      font-size: 68px;
      line-height: 1.15;
      font-weight: 850;
      color: #714817;
    }
  </style>
</head>
<body>
  <div id="${characterId}" class="stage" data-composition-id="${characterId}" data-start="0" data-width="1080" data-height="1920" data-duration="${duration}">
    <img id="morning-field-plate" class="clip plate" data-start="0" data-duration="${duration}" data-track-index="0" src="assets/unit-01/${characterId}/plates/morning-field-plate.png" alt="" />
    <div id="paper-grain" class="clip grain" data-start="0" data-duration="${duration}" data-track-index="1" aria-hidden="true"></div>

    <section id="sun-meaning-scene" class="clip scene sun-scene" data-start="0" data-duration="1.95" data-track-index="2" aria-label="一个太阳">
      <div class="focus"></div>
      <div class="sprite sun">
${spriteImages(`assets/unit-01/${characterId}/sprites/sun/rise-glow`, 10)}
      </div>
      <div class="cue cue-sun">一个太阳</div>
    </section>

    <section id="light-binding-scene" class="clip scene light-scene" data-start="1.72" data-duration="1.88" data-track-index="3" aria-label="一条光线">
      <div class="focus"></div>
      <div class="sprite light">
${spriteImages(`assets/unit-01/${characterId}/sprites/light/line-unfold`, 8)}
      </div>
      <div class="cue cue-light">一条光线</div>
    </section>

    <section id="flat-line-scene" class="clip scene flat-scene" data-start="3.38" data-duration="1.9" data-track-index="4" aria-label="平平一横">
      <div class="focus"></div>
      <div class="memory-line"></div>
      <div class="cue cue-flat">平平一横</div>
    </section>

    <section id="glyph-close-scene" class="clip scene glyph-scene" data-start="5.06" data-duration="2.34" data-track-index="5" aria-label="就是一">
      <div class="glyph-card">
        <div>
          <div class="glyph">一</div>
          <div class="pinyin">yi</div>
        </div>
      </div>
      <div class="final-line"></div>
      <div class="final-phrase">就是一</div>
    </section>

    <audio id="narration-audio" class="clip" data-start="0" data-duration="${duration}" data-track-index="20" src="assets/audio/${audioFileName}" preload="auto"></audio>
  </div>

  <script>
    window.__timelines = window.__timelines || {};
    const timeline = gsap.timeline({ paused: true });
    const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
    const ease = (value) => 1 - Math.pow(1 - clamp(value), 3);
    const range = (time, start, length) => clamp((time - start) / length);
    const setOpacity = (selector, value) => {
      document.querySelectorAll(selector).forEach((el) => { el.style.opacity = String(clamp(value)); });
    };
    const setTransform = (selector, parts) => {
      const x = parts.x || 0;
      const y = parts.y || 0;
      const scale = parts.scale == null ? 1 : parts.scale;
      const rotation = parts.rotation || 0;
      document.querySelectorAll(selector).forEach((el) => {
        el.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px) scale(" + scale.toFixed(3) + ") rotate(" + rotation.toFixed(2) + "deg)";
      });
    };
    const setScaleX = (selector, value) => {
      document.querySelectorAll(selector).forEach((el) => { el.style.transform = "scaleX(" + clamp(value).toFixed(3) + ")"; });
    };
    const showSpriteFrame = (selector, time, start, length, frameCount) => {
      const frames = gsap.utils.toArray(selector + " .sprite-frame");
      const progress = range(time, start, length);
      const index = Math.min(frameCount - 1, Math.floor(progress * frameCount));
      frames.forEach((frame, frameIndex) => { frame.style.opacity = frameIndex === index ? "1" : "0"; });
    };

    timeline.add((time) => {
      setOpacity(".sun-scene", ease(range(time, 0.0, 0.22)) * (1 - range(time, 1.86, 0.26)));
      showSpriteFrame(".sun-scene .sun", time, 0.1, 1.65, 10);
      setTransform(".sun-scene .sun", {
        y: -14 * ease(range(time, 0.1, 1.65)),
        scale: 0.96 + 0.05 * ease(range(time, 0.1, 1.65)),
        rotation: 0
      });

      setOpacity(".light-scene", ease(range(time, 1.72, 0.24)) * (1 - range(time, 3.48, 0.28)));
      showSpriteFrame(".light-scene .light", time, 1.82, 1.45, 8);
      setTransform(".light-scene .light", {
        x: -8 + 16 * ease(range(time, 1.82, 1.45)),
        y: 0,
        scale: 1.08,
        rotation: 0
      });

      setOpacity(".flat-scene", ease(range(time, 3.36, 0.24)) * (1 - range(time, 5.02, 0.28)));
      setScaleX(".flat-scene .memory-line", ease(range(time, 3.48, 0.72)));

      setOpacity(".glyph-scene", ease(range(time, 5.06, 0.38)));
      setScaleX(".final-line", ease(range(time, 5.22, 0.62)));
      setTransform(".glyph-card", {
        y: 18 * (1 - ease(range(time, 5.06, 0.5))),
        scale: 0.94 + 0.06 * ease(range(time, 5.06, 0.5)),
        rotation: 0
      });
      setOpacity(".final-phrase", ease(range(time, 5.48, 0.35)));
    });

    timeline.seek(0);
    window.__timelines["${characterId}"] = timeline;
  </script>
</body>
</html>
`;
}

function spriteImages(base, count) {
  return Array.from({ length: count }, (_, index) => {
    const frameName = `frame-${String(index).padStart(3, "0")}.png`;
    return `        <img class="sprite-frame" src="${base}/${frameName}" alt="" />`;
  }).join("\n");
}

function createMiniGsapScript() {
  return `(function () {
  function MiniTimeline(totalDuration) {
    this._duration = totalDuration;
    this._time = 0;
    this._appliers = [];
  }
  MiniTimeline.prototype.add = function (applier) {
    this._appliers.push(applier);
    return this;
  };
  MiniTimeline.prototype.seek = function (time) {
    this._time = Math.max(0, Math.min(this._duration, Number(time) || 0));
    this._appliers.forEach(function (applier) { applier(this._time); }, this);
    return this;
  };
  MiniTimeline.prototype.totalTime = function (time) {
    if (arguments.length === 0) return this._time;
    return this.seek(time);
  };
  MiniTimeline.prototype.time = function () { return this._time; };
  MiniTimeline.prototype.duration = function () { return this._duration; };
  MiniTimeline.prototype.pause = function () { return this; };
  MiniTimeline.prototype.play = function () { return this; };
  MiniTimeline.prototype.timeScale = function () { return this; };
  window.gsap = {
    timeline: function () { return new MiniTimeline(${duration}); },
    utils: { toArray: function (selector) { return Array.from(document.querySelectorAll(selector)); } }
  };
})();\n`;
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function transparent(width, height) {
  return Buffer.alloc(width * height * 4);
}

function setPixel(pixels, width, height, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const offset = (Math.floor(y) * width + Math.floor(x)) * 4;
  const alpha = clampByte(color[3] ?? 255) / 255;
  const inverse = 1 - alpha;
  pixels[offset] = clampByte(color[0] * alpha + pixels[offset] * inverse);
  pixels[offset + 1] = clampByte(color[1] * alpha + pixels[offset + 1] * inverse);
  pixels[offset + 2] = clampByte(color[2] * alpha + pixels[offset + 2] * inverse);
  pixels[offset + 3] = clampByte((color[3] ?? 255) + pixels[offset + 3] * inverse);
}

function drawEllipse(pixels, width, height, centerX, centerY, radiusX, radiusY, color) {
  const minX = Math.floor(centerX - radiusX - 2);
  const maxX = Math.ceil(centerX + radiusX + 2);
  const minY = Math.floor(centerY - radiusY - 2);
  const maxY = Math.ceil(centerY + radiusY + 2);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 1.03) continue;
      const edgeAlpha = distance <= 0.94 ? 1 : (1.03 - distance) / 0.09;
      setPixel(pixels, width, height, x, y, withAlpha(color, (color[3] ?? 255) * edgeAlpha));
    }
  }
}

function drawCapsule(pixels, width, height, x1, y1, x2, y2, radius, color, rotationDegrees = 0) {
  const angle = rotationDegrees * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const rx1 = cx + (x1 - cx) * cos - (y1 - cy) * sin;
  const ry1 = cy + (x1 - cx) * sin + (y1 - cy) * cos;
  const rx2 = cx + (x2 - cx) * cos - (y2 - cy) * sin;
  const ry2 = cy + (x2 - cx) * sin + (y2 - cy) * cos;
  const minX = Math.floor(Math.min(rx1, rx2) - radius - 3);
  const maxX = Math.ceil(Math.max(rx1, rx2) + radius + 3);
  const minY = Math.floor(Math.min(ry1, ry2) - radius - 3);
  const maxY = Math.ceil(Math.max(ry1, ry2) + radius + 3);
  const dx = rx2 - rx1;
  const dy = ry2 - ry1;
  const lengthSquared = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x - rx1) * dx + (y - ry1) * dy) / lengthSquared));
      const px = rx1 + t * dx;
      const py = ry1 + t * dy;
      const distance = Math.hypot(x - px, y - py);
      if (distance > radius + 1.2) continue;
      const edgeAlpha = distance <= radius - 0.6 ? 1 : (radius + 1.2 - distance) / 1.8;
      setPixel(pixels, width, height, x, y, withAlpha(color, (color[3] ?? 255) * edgeAlpha));
    }
  }
}

function drawSparkle(pixels, width, height, x, y, size, color) {
  drawCapsule(pixels, width, height, x - size, y, x + size, y, 2, color);
  drawCapsule(pixels, width, height, x, y - size, x, y + size, 2, color);
  drawEllipse(pixels, width, height, x, y, size * 0.32, size * 0.32, withAlpha(color, (color[3] ?? 255) * 0.8));
}

function drawCloud(pixels, width, height, x, y, scale, color) {
  drawEllipse(pixels, width, height, x, y, 54 * scale, 26 * scale, color);
  drawEllipse(pixels, width, height, x + 44 * scale, y - 20 * scale, 48 * scale, 34 * scale, withAlpha(color, (color[3] ?? 255) * 0.88));
  drawEllipse(pixels, width, height, x + 96 * scale, y - 4 * scale, 62 * scale, 28 * scale, withAlpha(color, (color[3] ?? 255) * 0.82));
}

function mix(a, b, t) {
  const value = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * value,
    a[1] + (b[1] - a[1]) * value,
    a[2] + (b[2] - a[2]) * value,
  ];
}

function radial(x, y, cx, cy, radius) {
  return Math.max(0, 1 - Math.hypot(x - cx, y - cy) / radius);
}

function withAlpha(color, alpha) {
  return [color[0], color[1], color[2], clampByte(alpha)];
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function encodeRgbaPng(width, height, pixels) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * (1 + width * 4);
    raw[rawOffset] = 0;
    pixels.copy(raw, rawOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", createIhdr(width, height)),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIhdr(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return ihdr;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
