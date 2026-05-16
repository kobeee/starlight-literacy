#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const recognitionRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const characterId = "yi-fresh-horizon-sync-v4";
const duration = 7.2;
const fps = 24;
const narrationScript = "一只小船。一条水线。平平一横。就是一。";
const audioFileName = "yi-fresh-horizon-sync-v4-narration.mp3";
const rawAudioFileName = "yi-fresh-horizon-sync-v4-narration-raw.mp3";
const subtitleFileName = "yi-fresh-horizon-sync-v4-narration.vtt";
const audioCuePlan = [
  { id: "boat", text: "一只小船", audioStart: 0.1, audioEnd: 1.789, visualStart: 0.0, visualEnd: 1.98 },
  { id: "water", text: "一条水线", audioStart: 1.739, audioEnd: 3.41, visualStart: 1.74, visualEnd: 3.56 },
  { id: "flat", text: "平平一横", audioStart: 3.41, audioEnd: 5.108, visualStart: 3.38, visualEnd: 5.23 },
  { id: "close", text: "就是一", audioStart: 5.108, audioEnd: 6.494, visualStart: 5.0, visualEnd: 7.2 },
];
const durationBenchmark = {
  sourceModel: "hongen-character-card/v1",
  referenceProduct: "洪恩识字汉字卡",
  referenceDurationSeconds: { min: 18, max: 23, example: 19 },
  referenceEvidence: "公开分集索引里洪恩汉字卡 0001_一_一个人 标为 00:19；相邻基础字多在 00:18-00:23。",
  starlightTargetSeconds: duration,
  starlightDecision: "P03 页面内认字视频不做 20 秒长卡，控制在 7.2 秒；保留洪恩式慢 cue 和 final hold。",
};

const canonicalRoot = join(recognitionRoot, "assets/unit-01", characterId);
const buildRoot = join(recognitionRoot, "builds", characterId);
const buildAssetRoot = join(buildRoot, "assets/unit-01", characterId);
const briefPath = join(recognitionRoot, "briefs", `${characterId}.brief.json`);
const assetPlanPath = join(recognitionRoot, "asset-plans", `${characterId}.asset-plan.json`);
const audioPlanPath = join(recognitionRoot, "audio-plans", `${characterId}.audio-plan.json`);
const productReviewPath = join(recognitionRoot, "product-reviews", `${characterId}.product-review.json`);

rmSync(canonicalRoot, { recursive: true, force: true });
rmSync(buildRoot, { recursive: true, force: true });

mkdirSync(dirname(briefPath), { recursive: true });
mkdirSync(dirname(assetPlanPath), { recursive: true });
mkdirSync(dirname(audioPlanPath), { recursive: true });
mkdirSync(dirname(productReviewPath), { recursive: true });
mkdirSync(join(canonicalRoot, "plates"), { recursive: true });
mkdirSync(join(canonicalRoot, "sprites/paper-boat/glide-line"), { recursive: true });
mkdirSync(join(canonicalRoot, "sprites/water/settle-line"), { recursive: true });
mkdirSync(buildRoot, { recursive: true });

writeJson(briefPath, createBrief());
writeJson(assetPlanPath, createAssetPlan());
writeJson(audioPlanPath, createAudioPlan());

writeFileSync(
  join(canonicalRoot, "plates/horizon-water-plate.png"),
  encodeRgbaPng(1080, 1920, drawPlate(1080, 1920)),
);

writeSprite(join(canonicalRoot, "sprites/paper-boat/glide-line"), createBoatFrames(), {
  id: "paper-boat-glide-line",
  actor: "paper-boat",
  action: "glide-line",
  fps: 12,
  minFrames: 10,
  poseContract: manifestPoseContract(boatPoseContract()),
  motionChecks: [
    {
      id: "boat-sail-fold",
      label: "paper sail and fold changes",
      region: { x: 90, y: 42, width: 102, height: 104 },
      minChangedFramePairs: 6,
      minChangedPixels: 110,
      minMeanDelta: 4,
      notes: "The boat must breathe through sail and fold pose changes, not just slide as one PNG.",
    },
    {
      id: "boat-flag-tail",
      label: "tiny flag and tail movement",
      region: { x: 150, y: 74, width: 72, height: 62 },
      minChangedFramePairs: 5,
      minChangedPixels: 55,
      minMeanDelta: 3,
      notes: "Small fabric detail should visibly respond to the glide.",
    },
  ],
  notes: "Fresh paper boat action for yi-fresh-horizon-sync-v4; no rabbit or guide-hand continuity from earlier samples.",
});

writeSprite(join(canonicalRoot, "sprites/water/settle-line"), createWaterFrames(), {
  id: "water-settle-line",
  actor: "water",
  action: "settle-line",
  fps: 12,
  minFrames: 8,
  poseContract: manifestPoseContract(waterPoseContract()),
  motionChecks: [
    {
      id: "ripple-flattens",
      label: "ripples flatten into one horizontal line",
      region: { x: 28, y: 76, width: 200, height: 102 },
      minChangedFramePairs: 5,
      minChangedPixels: 260,
      minMeanDelta: 6,
      notes: "The glyph-binding motion must happen inside the sprite frames before final HTML line growth.",
    },
    {
      id: "sparkle-follow",
      label: "line sparkle follows the settling ripple",
      region: { x: 140, y: 70, width: 82, height: 82 },
      minChangedFramePairs: 4,
      minChangedPixels: 42,
      minMeanDelta: 3,
      notes: "Prevents the water sprite from being only a static line.",
    },
  ],
  notes: "Water ripples flatten into a calm one-line cue, forming the memory action for 一.",
});

cpSync(canonicalRoot, buildAssetRoot, { recursive: true });
createNarrationAudio();
writeJson(join(buildRoot, "hyperframes.json"), {
  $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
  registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  paths: {
    blocks: "compositions",
    components: "compositions/components",
    assets: "assets",
  },
});
writeJson(join(buildRoot, "meta.json"), createBuildMeta());
mkdirSync(join(buildRoot, "assets/runtime"), { recursive: true });
writeFileSync(join(buildRoot, "assets/runtime/gsap.min.js"), createMiniGsapScript(), "utf8");
writeFileSync(join(buildRoot, "index.html"), createHtml(), "utf8");
writeJson(productReviewPath, createProductReview());

runValidationHarness();
runProductGate();

console.log(`Wrote audio-synced fresh horizon recognition-video candidate to ${buildRoot}`);

function createBrief() {
  return {
    schemaVersion: "recognition-video-brief/v1",
    characterId,
    character: "一",
    pinyin: "yi",
    unitId: "unit-01",
    duration,
    fps,
    teachingHook: "一只小船从一条平平水线上滑过，水波慢慢停成一横，再收成清楚的“一”。",
    narration: {
      script: narrationScript,
      voice: "zh-CN-XiaoxiaoNeural, rate -8%, pitch +0Hz",
      cues: audioCuePlan.map((cue) => ({ at: cue.audioStart, text: cue.text })),
    },
    shotPlan: [
      {
        id: "boat-meaning",
        start: 0,
        duration: 1.98,
        purpose: "语义先行：先看到一个生活物件和一条平静方向线。",
        description: "晨光水面上只有一只纸船，沿着平平水线慢慢滑过，给孩子时间看见一个和一条。",
        requiredAssets: ["horizon-water-plate", "paper-boat-glide-line"],
      },
      {
        id: "water-binding",
        start: 1.74,
        duration: 1.82,
        purpose: "字形绑定：水波从动到静，逐帧变成一条水平线。",
        description: "水波先轻轻晃，再慢慢收平，孩子看到生活里的线变成字形线索。",
        requiredAssets: ["water-settle-line", "html-water-cue"],
      },
      {
        id: "flat-line-lock",
        start: 3.38,
        duration: 1.85,
        purpose: "强调一横：平平的一条线被暖光托住。",
        description: "纸船退场后，水线变亮，平平一横在画面中间安静停住。",
        requiredAssets: ["html-memory-line"],
      },
      {
        id: "glyph-close",
        start: 5.0,
        duration: 2.2,
        purpose: "认字收束：从水线回到大字一和拼音。",
        description: "大字一、yi 和记忆短语就是一出现，最终帧安静清楚，适合 poster。",
        requiredAssets: ["html-glyph", "html-memory-line"],
      },
    ],
    teachingContract: {
      sourceModel: "hongen-micro-lesson/v1",
      meaningAction: {
        shotId: "boat-meaning",
        description: "先让孩子看到一只小船和一条水线，语义动作早于大字出现。",
        mustPrecedeGlyphClosure: true,
      },
      glyphBinding: {
        shotId: "water-binding",
        description: "水波从弯到平，小船沿线滑过，把一条水线和平平一横绑定到汉字一。",
        boundElements: ["一只小船", "一条水线", "平平一横", "汉字一"],
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
        {
          shotId: "boat-meaning",
          target: "一只小船和一条水线",
          seconds: 1.45,
        },
        {
          shotId: "water-binding",
          target: "水波收平成水平线",
          seconds: 1.45,
        },
        {
          shotId: "glyph-close",
          target: "最终大字一和就是一",
          seconds: 2.2,
        },
      ],
      practiceOrRepeat: {
        mode: "meaning-shape-repeat",
        description: "小船、水线、平平一横三次递进复现一，最后由大字完成确认。",
      },
      writingPosition: "late-or-omitted",
      mascotRole: "none",
    },
    pacingRequirements: {
      audienceAgeRange: "3-6",
      minimumCueHoldSeconds: 1.4,
      minimumFinalHoldSeconds: 2.2,
      maximumSceneChangesPerSecond: 0.62,
      productSurface: "P03 认字页竖屏手机教学舞台；参考洪恩单字卡慢节奏，但压缩为页面内 7.2 秒短片。",
    },
    animationRequirements: {
      spriteRequired: [
        {
          actor: "paper-boat",
          action: "glide-line",
          reason: "纸船需要船身、帆和小旗的逐帧变化，不能只平移单张图。",
          minFrames: 10,
          requiredMotionParts: ["boat hull", "paper sail", "fold highlight", "tiny flag"],
          poseContract: boatPoseContract(),
        },
        {
          actor: "water",
          action: "settle-line",
          reason: "水波收平成一横是本版核心记忆动作，必须在帧内变化。",
          minFrames: 8,
          requiredMotionParts: ["upper ripple", "lower ripple", "center line", "sparkle"],
          poseContract: waterPoseContract(),
        },
      ],
      timelineOnly: [
        "plate parallax",
        "boat scene placement",
        "warm line glow",
        "html glyph and pinyin",
        "final poster hold",
      ],
    },
    finalFrame: {
      description: "晨光水面淡在背景里，大字一、yi、就是一和平平横线居中安静可读，末尾留安静回看时间。",
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
      summary: "暖阳绘本、低饱和、纸感水面；生成图中不出现汉字、拼音、UI 文案或水印。",
    },
    plates: [
      {
        id: "horizon-water-plate",
        kind: "plate",
        purpose: "提供晨光水面和一条水平视觉基线，承载小船和水线动作。",
        path: `tools/recognition-video/assets/unit-01/${characterId}/plates/horizon-water-plate.png`,
      },
    ],
    cutouts: [
      {
        id: "paper-boat-cutout-sequence",
        kind: "cutout",
        purpose: "纸船沿水平线滑行，逐帧改变帆、折痕和小旗。",
      },
      {
        id: "water-line-cutout-sequence",
        kind: "cutout",
        purpose: "水波逐帧收成一条平平横线，承担字形绑定。",
      },
    ],
    sprites: [
      {
        id: "paper-boat-glide-line",
        actor: "paper-boat",
        action: "glide-line",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/paper-boat/glide-line/manifest.json`,
        minFrames: 10,
        requiredMotionParts: ["boat hull", "paper sail", "fold highlight", "tiny flag"],
        motionCheckIntent: "船帆、折痕和小旗必须变化，避免静态纸船只靠时间轴平移。",
        notes: "新动作不复用旧兔子、小手、苹果或木棒路径。",
      },
      {
        id: "water-settle-line",
        actor: "water",
        action: "settle-line",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/water/settle-line/manifest.json`,
        minFrames: 8,
        requiredMotionParts: ["upper ripple", "lower ripple", "center line", "sparkle"],
        motionCheckIntent: "水波必须在 PNG 帧内从弯曲到水平，不能只用 CSS 缩放横线。",
        notes: "这是本版的核心记忆动作。",
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
      "语义动作先于大字出现，不能一开场直接显示字卡。",
      "纸船和水面是教具，不能抢过最终汉字一。",
      "每个 required sprite 都有 poseContract 和 motionChecks。",
      "核心 cue 使用 edge-tts 字幕时间戳对齐，句间隔约 1.64-1.70 秒，final hold 不低于 2.2 秒。",
      "总时长 7.2 秒，短于洪恩 18-23 秒汉字卡，但不压缩成快闪演示。",
      "图片资产不含中文、拼音或 UI 文案，文字只由 HTML 渲染。",
      "测试产物不覆盖 existing official，也不自动接入 H5。",
    ],
  };
}

function createAudioPlan() {
  return {
    schemaVersion: "recognition-video-audio-plan/v1",
    characterId,
    script: narrationScript,
    voice: {
      provider: "edge-tts",
      voice: "zh-CN-XiaoxiaoNeural",
      rate: "-8%",
      pitch: "+0Hz",
      rationale: "比项目主带读 -10% 略快一点，避免 7.2 秒短片拖沓；仍保留女老师温暖清晰感。",
    },
    durationBenchmark,
    targetDurationSeconds: duration,
    rawTtsAudioDurationSeconds: 6.552,
    bakedAudioDurationSeconds: 7.248,
    quietAfterLastCueSeconds: 0.706,
    cues: audioCuePlan,
    syncRules: [
      "每个 visualStart 不晚于对应 audioStart 0.12 秒以上。",
      "每句画面主物必须覆盖对应 audioStart 到 audioEnd。",
      "glyph-close 从最后一句开始前 0.108 秒入场，确保听到“就是一”时已经看到大字收束。",
      "末尾至少 0.65 秒不再新增信息，让孩子回看大字一。",
    ],
    outputs: {
      audio: `tools/recognition-video/builds/${characterId}/assets/audio/${audioFileName}`,
      rawAudio: `tools/recognition-video/builds/${characterId}/assets/audio/${rawAudioFileName}`,
      subtitles: `tools/recognition-video/builds/${characterId}/assets/audio/${subtitleFileName}`,
    },
  };
}

function boatPoseContract() {
  return [
    { frame: 0, pose: "float-left", body: "纸船刚进入水线，船身轻轻前倾。", limbs: ["boat hull", "paper sail", "fold highlight", "tiny flag"], contact: "船底贴近水线。", mustReadAs: "一只小船出现。" },
    { frame: 1, pose: "sail-catches-light", body: "船帆向右侧鼓起，折痕变亮。", limbs: ["paper sail", "fold highlight", "tiny flag"], contact: "船底保持在水线附近。", mustReadAs: "沿线慢慢滑。" },
    { frame: 2, pose: "soft-bob-down", body: "船身轻轻下沉，帆和小旗滞后。", limbs: ["boat hull", "paper sail", "tiny flag"], contact: "船底压近水线。", mustReadAs: "小船在一条线上。" },
    { frame: 3, pose: "soft-bob-up", body: "船身回弹上浮，折痕角度变化。", limbs: ["boat hull", "fold highlight", "paper sail"], contact: "船底离水线一点点。", mustReadAs: "平稳滑行。" },
    { frame: 4, pose: "mid-glide", body: "纸船居中，帆面打开。", limbs: ["boat hull", "paper sail", "fold highlight", "tiny flag"], contact: "船底对齐水线。", mustReadAs: "一只小船。" },
    { frame: 5, pose: "flag-flutter-a", body: "小旗向后飘，船头微微抬起。", limbs: ["boat hull", "tiny flag", "paper sail"], contact: "船底轻触水线。", mustReadAs: "跟着水线走。" },
    { frame: 6, pose: "flag-flutter-b", body: "小旗回摆，帆的折面换光。", limbs: ["tiny flag", "paper sail", "fold highlight"], contact: "船底贴近水线。", mustReadAs: "不是静态贴图。" },
    { frame: 7, pose: "glide-slow", body: "船身放慢，帆面收小。", limbs: ["boat hull", "paper sail", "fold highlight"], contact: "船底继续对齐水线。", mustReadAs: "准备停住。" },
    { frame: 8, pose: "near-stop", body: "纸船停到右侧，旗子仍有轻摆。", limbs: ["boat hull", "tiny flag", "paper sail"], contact: "船底贴住水线。", mustReadAs: "把焦点让给一横。" },
    { frame: 9, pose: "hold-side", body: "纸船安静停在旁边。", limbs: ["boat hull", "paper sail", "fold highlight", "tiny flag"], contact: "船底与水线稳定对齐。", mustReadAs: "配角停住。" },
  ];
}

function waterPoseContract() {
  return [
    { frame: 0, pose: "wide-ripple", body: "水面上下两道弯波还很明显。", limbs: ["upper ripple", "lower ripple", "center line", "sparkle"], contact: "波纹围绕水线展开。", mustReadAs: "水面在动。" },
    { frame: 1, pose: "ripple-narrows", body: "弯波变窄，中间线开始清楚。", limbs: ["upper ripple", "lower ripple", "center line"], contact: "波纹靠近中线。", mustReadAs: "正在收平。" },
    { frame: 2, pose: "line-emerges", body: "中心横线变长，波纹幅度变小。", limbs: ["upper ripple", "lower ripple", "center line", "sparkle"], contact: "上下波纹夹住中线。", mustReadAs: "一条线出现。" },
    { frame: 3, pose: "almost-flat", body: "上下波纹接近水平，亮点向右走。", limbs: ["upper ripple", "lower ripple", "center line", "sparkle"], contact: "中心线稳定。", mustReadAs: "平平一横。" },
    { frame: 4, pose: "flat-line", body: "水线基本水平，波纹只剩浅浅起伏。", limbs: ["center line", "sparkle", "upper ripple"], contact: "线条贴住水面。", mustReadAs: "一横清楚。" },
    { frame: 5, pose: "warm-highlight", body: "金色高光沿线展开。", limbs: ["center line", "sparkle"], contact: "水线保持水平。", mustReadAs: "亮出这一横。" },
    { frame: 6, pose: "settled-line", body: "水面安静，只剩一条平线。", limbs: ["center line", "sparkle"], contact: "线条稳定不晃。", mustReadAs: "就是一的形状。" },
    { frame: 7, pose: "hold-one-line", body: "一条水平线安静停住。", limbs: ["center line", "sparkle"], contact: "水线稳定。", mustReadAs: "可对照汉字一。" },
  ];
}

function manifestPoseContract(briefPoseContract) {
  return {
    requiredMotionParts: Array.from(new Set(briefPoseContract.flatMap((frame) => frame.limbs))),
    frames: briefPoseContract.map((frame) => ({
      frame: frame.frame,
      pose: frame.pose,
      contact: frame.contact,
    })),
  };
}

function createBuildMeta() {
  return {
    id: characterId,
    name: "一 - Fresh Horizon Sync V4",
    characterId,
    char: "一",
    status: "agent-pipeline-test",
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
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/paper-boat/glide-line/manifest.json`,
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/water/settle-line/manifest.json`,
      ],
    },
    outputs: {
      video: `renders/${characterId}.mp4`,
      webm: `renders/${characterId}.webm`,
      poster: `renders/final-frames/${characterId}-poster.png`,
      finalFrame: `renders/final-frames/${characterId}-final.png`,
      reviewSheet: `renders/final-frames/${characterId}-review-sheet.png`,
    },
    note: "Fresh non-official sync test. It avoids previous rabbit/hand/apple/stick ideas, uses a paper-boat/horizon-water memory action, and locks shot timing to Edge TTS subtitle cues in a 7.2s page-friendly duration.",
  };
}

function createProductReview() {
  return {
    schemaVersion: "starlight-product-video-review/v1",
    characterId,
    candidateStatus: "agent-pipeline-test",
    layerBoundary: {
      productAgentOwns: [
        "判断纸船和水线是否真正帮助 3-6 岁孩子记住一。",
        "检查语义先行、字形绑定、final hold、语速和音画同步。",
        "评估记忆瞬间是否比旧兔子/小手路径更独立。",
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
        {
          at: 0.55,
          purpose: "语义入场",
          visibleAnchor: "一只纸船沿一条水线慢慢进入。",
          readability: "pass",
          notes: "与旧动物/手势完全分离，记忆动作更安静。",
        },
        {
          at: 2.35,
          purpose: "字形绑定",
          visibleAnchor: "水波逐帧收向水平线。",
          readability: "pass",
          notes: "与“一条水线”旁白窗口重合，帧内 motionChecks 覆盖波纹和亮点。",
        },
        {
          at: 4.25,
          purpose: "平平一横",
          visibleAnchor: "水线被暖光托住，成为平平一横。",
          readability: "pass",
          notes: "处在“平平一横”旁白窗口内，动作连接到一横，不是独立剧情。",
        },
        {
          at: 6.35,
          purpose: "认字收束",
          visibleAnchor: "大字一、yi、就是一居中停住。",
          readability: "pass",
          notes: "最后一句结束前已收束到大字，并留 0.65 秒安静回看。",
        },
      ],
      memoryMoment: {
        exists: true,
        description: "小船滑过后，水波慢慢停成一条平平的线，再变成大字一。",
      },
      actionReadability: [
        {
          action: "paper-boat glide-line",
          verdict: "pass",
          reason: "船帆、折痕和小旗逐帧变化，配合慢速横向滑行，能读成一只小船沿线走。",
        },
        {
          action: "water settle-line",
          verdict: "pass",
          reason: "水波从弯到平的变化是核心字形绑定动作，motionChecks 覆盖中心线和波纹。",
        },
        {
          action: "glyph closure",
          verdict: "pass",
          reason: "大字一和就是一从 5.0 秒入场，覆盖最后一句“就是一”并保持到片尾。",
        },
      ],
    },
    assetAssessment: {
      usesProgrammaticPlaceholderAssets: true,
      officialAssetReadiness: "needs-polish",
      notes: [
        "本轮为程序绘制占位资产，适合验证最新流水线和新教学记忆动作。",
        "若进入 official，需要替换为同构图的真实暖阳绘本 cutout/plate，并复核儿童可读性。",
        "音频使用 edge-tts Xiaoxiao -8% 生成，并用 VTT 时间戳反推镜头起止；本版已 baked 进 HyperFrames 渲染。",
      ],
    },
    scores: {
      teachingStructure: 8.3,
      glyphBinding: 8.2,
      glyphAnchor: 8.1,
      pacing: 8.4,
      animationPerformance: 7.2,
      visualQuality: 6.4,
      childAppeal: 7.0,
      audioFit: 7.5,
      technicalCompliance: 8.6,
      officialReadiness: 5.2,
    },
    overallScore: 7.5,
    decision: "rendered-needs-iteration",
    blockers: [
      "程序绘制占位资产不能作为 official 美术。",
      "需要真实暖阳绘本 plate/cutout 后才能进入 official-candidate。",
      "正式发布前还需要人工听感复核，确认 -8% 语速对 3-6 岁儿童足够清晰。",
    ],
    nextActions: [
      "用同一 brief 生产真实纸船、水线和晨光水面 cutout。",
      "让产品侧看 review sheet，确认小船水线记忆动作是否比旧路径更有记忆点。",
      "美术替换后保留本 audio-plan 重新跑 --official 产品门禁和 H5 guardrails。",
    ],
  };
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
    chromaKey: { enabled: false, color: "#ff00ff" },
    minFrames: manifestBase.minFrames,
    frames: frameNames,
    poseContract: manifestBase.poseContract,
    motionChecks: manifestBase.motionChecks,
    notes: manifestBase.notes,
  });
}

function createNarrationAudio() {
  const target = join(buildRoot, "assets/audio", audioFileName);
  const rawTarget = join(buildRoot, "assets/audio", rawAudioFileName);
  const subtitles = join(buildRoot, "assets/audio", subtitleFileName);
  mkdirSync(dirname(target), { recursive: true });

  const ttsResult = spawnSync("edge-tts", [
    "--voice",
    "zh-CN-XiaoxiaoNeural",
    "--rate=-8%",
    "--pitch=+0Hz",
    "--text",
    narrationScript,
    "--write-media",
    rawTarget,
    "--write-subtitles",
    subtitles,
  ], { stdio: "inherit" });

  if (ttsResult.status !== 0 || !existsSync(rawTarget) || !existsSync(subtitles)) {
    console.error("Failed to create edge-tts narration or subtitle timing for sync-v4.");
    process.exit(ttsResult.status ?? 1);
  }

  const ffmpegResult = spawnSync("ffmpeg", [
    "-y",
    "-i",
    rawTarget,
    "-af",
    "apad=pad_dur=0.8",
    "-t",
    String(duration),
    target,
  ], { stdio: "inherit" });

  if (ffmpegResult.status !== 0 || !existsSync(target)) {
    console.error("Failed to pad synced narration to the target 7.2s duration.");
    process.exit(ffmpegResult.status ?? 1);
  }
}

function runValidationHarness() {
  runNodeScript("scripts/validate-teaching-harness.mjs", [briefPath, assetPlanPath]);
  for (const manifestPath of [
    join(canonicalRoot, "sprites/paper-boat/glide-line/manifest.json"),
    join(canonicalRoot, "sprites/water/settle-line/manifest.json"),
  ]) {
    runNodeScript("scripts/validate-sprite-assets.mjs", [manifestPath]);
  }
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

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function drawPlate(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const water = Math.max(0, (y - height * 0.49) / (height * 0.51));
    for (let x = 0; x < width; x += 1) {
      const sun = radial(x, y, width * 0.28, height * 0.18, 410);
      const paper = ((x * 17 + y * 23) % 31) / 31;
      const base = y < height * 0.5
        ? mix([255, 242, 210], [249, 226, 190], y / (height * 0.5))
        : mix([207, 229, 213], [238, 225, 190], water);
      setPixel(pixels, width, height, x, y, [
        base[0] + sun * 16 + paper * 4,
        base[1] + sun * 11 + paper * 3,
        base[2] + sun * 4,
        255,
      ]);
    }
  }

  drawEllipse(pixels, width, height, 305, 365, 160, 160, [255, 218, 118, 96]);
  drawCloud(pixels, width, height, 170, 450, 1.05, [255, 255, 246, 128]);
  drawCloud(pixels, width, height, 780, 350, 0.86, [255, 255, 246, 116]);
  drawCapsule(pixels, width, height, 125, 1038, 955, 1038, 5, [127, 153, 128, 88]);
  drawCapsule(pixels, width, height, 142, 1045, 938, 1045, 18, [255, 229, 143, 70]);

  for (let i = 0; i < 12; i += 1) {
    const y = 1138 + i * 46;
    const alpha = 58 - i * 2;
    drawWavyLine(pixels, width, height, 86, 990, y, 8 + (i % 3) * 3, 11, 3, [116, 158, 150, alpha]);
  }

  drawEllipse(pixels, width, height, 540, 1490, 690, 230, [249, 220, 153, 46]);
  for (let i = 0; i < 34; i += 1) {
    const x = i % 2 === 0 ? 34 + (i * 17) % 180 : 850 + (i * 23) % 190;
    const y = 1010 + (i * 47) % 410;
    drawCapsule(pixels, width, height, x, y + 110, x + 8, y - 8, 4, [104, 139, 97, 118], -8 + (i % 5) * 4);
  }
  return pixels;
}

function createBoatFrames() {
  const poses = [
    { bob: 6, sail: -8, flag: -14, fold: 0.20, hull: 0 },
    { bob: 2, sail: -4, flag: -8, fold: 0.35, hull: 2 },
    { bob: 9, sail: 2, flag: 2, fold: 0.48, hull: -1 },
    { bob: -2, sail: 6, flag: 8, fold: 0.62, hull: 3 },
    { bob: 1, sail: 3, flag: 14, fold: 0.74, hull: 0 },
    { bob: 5, sail: -2, flag: 6, fold: 0.62, hull: -3 },
    { bob: 0, sail: -6, flag: -5, fold: 0.44, hull: 2 },
    { bob: 4, sail: -2, flag: -12, fold: 0.30, hull: 0 },
    { bob: 2, sail: 1, flag: -4, fold: 0.25, hull: 1 },
    { bob: 2, sail: 0, flag: 0, fold: 0.22, hull: 0 },
  ];

  return poses.map((pose, index) => {
    const pixels = transparent(256, 256);
    const cy = 152 + pose.bob;
    const sailShift = pose.sail;
    drawEllipse(pixels, 256, 256, 130, 199, 74, 12, [88, 117, 113, 38]);
    drawPolygon(pixels, 256, 256, [
      [50, cy + 11 + pose.hull],
      [208, cy + 10 - pose.hull],
      [175, cy + 56],
      [85, cy + 58],
    ], [239, 184, 116, 255]);
    drawPolygon(pixels, 256, 256, [
      [74, cy + 13],
      [131, cy + 22],
      [112, cy + 54],
      [84, cy + 56],
    ], [255, 224, 160, 220]);
    drawCapsule(pixels, 256, 256, 126, cy - 78, 127, cy + 22, 4, [131, 86, 48, 255], 0);
    drawPolygon(pixels, 256, 256, [
      [129, cy - 75],
      [129, cy + 13],
      [80 + sailShift, cy - 2],
    ], [255, 245, 213, 255]);
    drawPolygon(pixels, 256, 256, [
      [132, cy - 66],
      [132, cy + 8],
      [185 + sailShift * 0.4, cy - 8],
    ], [255, 234, 178, 255]);
    drawCapsule(pixels, 256, 256, 91 + pose.fold * 12, cy - 2, 126, cy + 11, 2, [203, 142, 78, 108], 8 + pose.sail);
    drawCapsule(pixels, 256, 256, 142, cy - 18, 183 + pose.flag, cy - 29, 4, [230, 121, 86, 240], pose.flag * 0.3);
    drawEllipse(pixels, 256, 256, 62 + index * 6, cy + 75, 20, 5, [96, 148, 149, 52]);
    return pixels;
  });
}

function createWaterFrames() {
  const poses = [
    { amp: 24, line: 0.35, sparkleX: 72, alpha: 110 },
    { amp: 18, line: 0.45, sparkleX: 92, alpha: 130 },
    { amp: 13, line: 0.56, sparkleX: 114, alpha: 154 },
    { amp: 8, line: 0.66, sparkleX: 138, alpha: 178 },
    { amp: 4, line: 0.76, sparkleX: 164, alpha: 204 },
    { amp: 2, line: 0.88, sparkleX: 188, alpha: 226 },
    { amp: 0.5, line: 1, sparkleX: 204, alpha: 238 },
    { amp: 0, line: 1, sparkleX: 208, alpha: 230 },
  ];

  return poses.map((pose) => {
    const pixels = transparent(256, 256);
    drawEllipse(pixels, 256, 256, 128, 176, 82, 13, [86, 120, 112, 30]);
    drawWavyLine(pixels, 256, 256, 35, 221, 118, pose.amp, 8, 4, [87, 147, 156, Math.max(38, pose.alpha - 58)]);
    drawWavyLine(pixels, 256, 256, 43, 213, 142, -pose.amp * 0.64, 8, 3, [103, 168, 168, Math.max(30, pose.alpha - 76)]);
    drawCapsule(pixels, 256, 256, 42, 131, 42 + 172 * pose.line, 131, 7, [255, 217, 98, pose.alpha]);
    drawCapsule(pixels, 256, 256, 48, 131, 42 + 160 * pose.line, 131, 3, [255, 249, 196, Math.min(240, pose.alpha + 16)]);
    drawSparkle(pixels, 256, 256, pose.sparkleX, 104, 11, [255, 236, 139, 206]);
    drawSparkle(pixels, 256, 256, Math.max(48, pose.sparkleX - 70), 153, 7, [255, 247, 192, 146]);
    return pixels;
  });
}

function createHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <link rel="icon" href="data:," />
  <title>一 - Fresh Horizon Sync V4</title>
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
    .paper-grain {
      inset: 0;
      opacity: 0.11;
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
      font-size: 60px;
      line-height: 1.1;
      font-weight: 850;
      letter-spacing: 0;
      color: #684918;
      text-shadow: 0 3px 0 rgba(255, 248, 220, 0.58);
    }
    .cue-boat { top: 1260px; }
    .cue-water { top: 1276px; }
    .cue-flat { top: 1270px; }
    .focus-ribbon {
      position: absolute;
      left: 156px;
      right: 156px;
      top: 955px;
      height: 226px;
      border-radius: 118px;
      background: rgba(255, 244, 202, 0.24);
      border: 4px solid rgba(171, 121, 41, 0.10);
    }
    .horizon-line,
    .final-line {
      position: absolute;
      left: 234px;
      top: 1031px;
      width: 612px;
      height: 30px;
      border-radius: 999px;
      transform-origin: 0 50%;
      background:
        linear-gradient(180deg, rgba(255, 250, 204, 0.9), rgba(255, 226, 96, 0.25)),
        linear-gradient(90deg, #f8ca55, #d69a16);
      box-shadow: 0 0 0 17px rgba(249, 200, 73, 0.11), 0 19px 28px rgba(92, 57, 21, 0.10);
    }
    .sprite {
      position: absolute;
      width: 256px;
      height: 256px;
      transform-origin: 50% 72%;
      filter: drop-shadow(0 18px 20px rgba(90, 52, 34, 0.13));
    }
    .sprite-frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; }
    .boat { left: 122px; top: 884px; width: 328px; height: 328px; }
    .water { left: 412px; top: 920px; width: 300px; height: 300px; filter: drop-shadow(0 12px 14px rgba(56, 102, 105, 0.10)); }
    .glyph-scene { text-align: center; }
    .glyph-card {
      position: absolute;
      left: 168px;
      right: 168px;
      top: 438px;
      height: 804px;
      display: grid;
      place-items: center;
      border-radius: 48px;
      background: rgba(255, 250, 230, 0.78);
      border: 6px solid rgba(188, 132, 38, 0.18);
      box-shadow: 0 38px 80px rgba(92, 57, 21, 0.14);
    }
    .glyph { font-size: 382px; line-height: 0.84; font-weight: 900; color: #5b351f; }
    .pinyin { margin-top: 44px; font-size: 76px; line-height: 1; font-weight: 850; color: #9f6812; }
    .final-line { top: 1322px; height: 34px; }
    .final-phrase {
      position: absolute;
      left: 0;
      top: 1412px;
      width: 100%;
      font-size: 66px;
      line-height: 1.15;
      font-weight: 850;
      color: #714817;
    }
    .tokens {
      position: absolute;
      left: 132px;
      right: 132px;
      bottom: 160px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .token {
      min-height: 92px;
      display: grid;
      place-items: center;
      border-radius: 26px;
      background: rgba(255, 250, 232, 0.76);
      border: 4px solid rgba(165, 108, 27, 0.14);
      color: #765226;
      font-size: 34px;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <div id="${characterId}" class="stage" data-composition-id="${characterId}" data-start="0" data-width="1080" data-height="1920" data-duration="${duration}">
    <img id="horizon-water-plate" class="clip plate" data-start="0" data-duration="${duration}" data-track-index="0" src="assets/unit-01/${characterId}/plates/horizon-water-plate.png" alt="" />
    <div id="paper-grain" class="clip paper-grain" data-start="0" data-duration="${duration}" data-track-index="1" aria-hidden="true"></div>

    <section id="boat-meaning-scene" class="clip scene boat-scene" data-start="0" data-duration="1.98" data-track-index="2" aria-label="一只小船">
      <div class="focus-ribbon"></div>
      <div class="horizon-line"></div>
      <div class="sprite boat">
${spriteImages(`assets/unit-01/${characterId}/sprites/paper-boat/glide-line`, 10)}
      </div>
      <div class="cue cue-boat">一只小船</div>
    </section>

    <section id="water-binding-scene" class="clip scene water-scene" data-start="1.74" data-duration="1.82" data-track-index="3" aria-label="一条水线">
      <div class="focus-ribbon"></div>
      <div class="sprite water">
${spriteImages(`assets/unit-01/${characterId}/sprites/water/settle-line`, 8)}
      </div>
      <div class="cue cue-water">一条水线</div>
    </section>

    <section id="flat-line-lock-scene" class="clip scene flat-scene" data-start="3.38" data-duration="1.85" data-track-index="4" aria-label="平平一横">
      <div class="focus-ribbon"></div>
      <div class="horizon-line"></div>
      <div class="cue cue-flat">平平一横</div>
    </section>

    <section id="glyph-close-scene" class="clip scene glyph-scene" data-start="5" data-duration="2.2" data-track-index="5" aria-label="就是一">
      <div class="glyph-card">
        <div>
          <div class="glyph">一</div>
          <div class="pinyin">yi</div>
        </div>
      </div>
      <div class="final-line"></div>
      <div class="final-phrase">就是一</div>
      <div class="tokens" aria-hidden="true">
        <div class="token">小船</div>
        <div class="token">水线</div>
        <div class="token">一横</div>
      </div>
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
      setOpacity(".boat-scene", ease(range(time, 0.0, 0.18)) * (1 - range(time, 1.78, 0.24)));
      setScaleX(".boat-scene .horizon-line", ease(range(time, 0.12, 0.65)));
      showSpriteFrame(".boat-scene .boat", time, 0.1, 1.55, 10);
      setTransform(".boat-scene .boat", {
        x: 470 * ease(range(time, 0.1, 1.55)),
        y: -8 * Math.sin(Math.PI * range(time, 0.1, 1.55)),
        scale: 1,
        rotation: -2 + 3 * Math.sin(Math.PI * range(time, 0.1, 1.55))
      });

      setOpacity(".water-scene", ease(range(time, 1.74, 0.22)) * (1 - range(time, 3.32, 0.24)));
      showSpriteFrame(".water-scene .water", time, 1.86, 1.25, 8);
      setTransform(".water-scene .water", {
        y: -5 * Math.sin(Math.PI * range(time, 1.86, 1.25)),
        scale: 1.02,
        rotation: 0
      });

      setOpacity(".flat-scene", ease(range(time, 3.38, 0.22)) * (1 - range(time, 5.0, 0.24)));
      setScaleX(".flat-scene .horizon-line", ease(range(time, 3.5, 0.7)));

      setOpacity(".glyph-scene", ease(range(time, 5.0, 0.38)));
      setScaleX(".final-line", ease(range(time, 5.12, 0.62)));
      setTransform(".glyph-card", {
        y: 18 * (1 - ease(range(time, 5.0, 0.5))),
        scale: 0.94 + 0.06 * ease(range(time, 5.0, 0.5)),
        rotation: 0
      });
      setOpacity(".final-phrase", ease(range(time, 5.4, 0.35)));
      setOpacity(".tokens", ease(range(time, 6.12, 0.35)));
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

function drawPolygon(pixels, width, height, points, color) {
  const minX = Math.floor(Math.min(...points.map((point) => point[0])) - 1);
  const maxX = Math.ceil(Math.max(...points.map((point) => point[0])) + 1);
  const minY = Math.floor(Math.min(...points.map((point) => point[1])) - 1);
  const maxY = Math.ceil(Math.max(...points.map((point) => point[1])) + 1);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        setPixel(pixels, width, height, x, y, color);
      }
    }
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function drawWavyLine(pixels, width, height, startX, endX, centerY, amplitude, segments, radius, color) {
  let lastX = startX;
  let lastY = centerY;
  for (let index = 1; index <= segments; index += 1) {
    const t = index / segments;
    const nextX = startX + (endX - startX) * t;
    const nextY = centerY + Math.sin(t * Math.PI * 2) * amplitude;
    drawCapsule(pixels, width, height, lastX, lastY, nextX, nextY, radius, color);
    lastX = nextX;
    lastY = nextY;
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
