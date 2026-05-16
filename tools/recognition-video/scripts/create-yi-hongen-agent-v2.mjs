#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const recognitionRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const characterId = "yi-hongen-agent-v2";
const duration = 7.8;
const fps = 24;
const narrationScript = "一条小路。一个苹果。一根木棒。都是一。";

const canonicalRoot = join(recognitionRoot, "assets/unit-01", characterId);
const buildRoot = join(recognitionRoot, "builds", characterId);
const buildAssetRoot = join(buildRoot, "assets/unit-01", characterId);
const briefPath = join(recognitionRoot, "briefs", `${characterId}.brief.json`);
const assetPlanPath = join(recognitionRoot, "asset-plans", `${characterId}.asset-plan.json`);

rmSync(canonicalRoot, { recursive: true, force: true });
rmSync(buildRoot, { recursive: true, force: true });

mkdirSync(dirname(briefPath), { recursive: true });
mkdirSync(dirname(assetPlanPath), { recursive: true });
mkdirSync(join(canonicalRoot, "plates"), { recursive: true });
mkdirSync(join(canonicalRoot, "sprites/guide-hand/trace-line"), { recursive: true });
mkdirSync(join(canonicalRoot, "sprites/stick/straighten"), { recursive: true });
mkdirSync(join(canonicalRoot, "sprites/apple/one-bounce"), { recursive: true });
mkdirSync(buildRoot, { recursive: true });

writeJson(briefPath, createBrief());
writeJson(assetPlanPath, createAssetPlan());

writeFileSync(
  join(canonicalRoot, "plates/meadow-line-plate.png"),
  encodeRgbaPng(1080, 1920, drawPlate(1080, 1920)),
);

writeSprite(join(canonicalRoot, "sprites/guide-hand/trace-line"), createGuideHandFrames(), {
  id: "guide-hand-trace-line",
  actor: "guide-hand",
  action: "trace-line",
  fps: 12,
  minFrames: 10,
  poseContract: manifestPoseContract(guideHandPoseContract()),
  motionChecks: [
    {
      id: "guide-finger-trace",
      label: "guiding finger reaches, taps, and traces the line",
      region: { x: 88, y: 96, width: 146, height: 92 },
      minChangedFramePairs: 6,
      minChangedPixels: 160,
      minMeanDelta: 5,
      notes: "The guide action must be a hand tracing the horizontal cue, not an animal sprite sliding around.",
    },
    {
      id: "guide-wrist-follow",
      label: "wrist and sleeve follow-through",
      region: { x: 30, y: 122, width: 100, height: 86 },
      minChangedFramePairs: 5,
      minChangedPixels: 120,
      minMeanDelta: 4,
      notes: "Wrist motion catches static pasted-hand sprites.",
    },
  ],
  notes: "New Hongen-style guide hand. The gesture discovers, taps, and traces the horizontal path.",
});

writeSprite(join(canonicalRoot, "sprites/stick/straighten"), createStickFrames(), {
  id: "stick-straighten-agent-v2",
  actor: "stick",
  action: "straighten",
  fps: 12,
  minFrames: 8,
  poseContract: manifestPoseContract(stickPoseContract()),
  motionChecks: [
    {
      id: "stick-rolls-flat",
      label: "stick rotates into one horizontal line",
      region: { x: 34, y: 58, width: 188, height: 146 },
      minChangedFramePairs: 5,
      minChangedPixels: 520,
      minMeanDelta: 10,
      notes: "The shape-binding action must happen inside the PNG frames before HyperFrames places it.",
    },
  ],
  notes: "The stick visibly rolls and settles into a horizontal line, serving the glyph binding.",
});

writeSprite(join(canonicalRoot, "sprites/apple/one-bounce"), createAppleFrames(), {
  id: "apple-one-bounce-agent-v2",
  actor: "apple",
  action: "one-bounce",
  fps: 12,
  minFrames: 7,
  poseContract: manifestPoseContract(applePoseContract()),
  motionChecks: [
    {
      id: "apple-one-soft-bounce",
      label: "single apple lands with squash and leaf follow-through",
      region: { x: 52, y: 36, width: 152, height: 184 },
      minChangedFramePairs: 5,
      minChangedPixels: 300,
      minMeanDelta: 6,
      notes: "The apple is a quantity repeat cue, so it needs actual frame-level settle motion.",
    },
  ],
  notes: "A single apple appears and gently bounces, reinforcing the quantity meaning of 一.",
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
runValidationHarness();

console.log(`Wrote Hongen-inspired recognition-video agent test to ${buildRoot}`);

function createBrief() {
  return {
    schemaVersion: "recognition-video-brief/v1",
    characterId,
    character: "一",
    pinyin: "yi",
    unitId: "unit-01",
    duration,
    fps,
    teachingHook: "先看见一条真实的小路，再用一个苹果复现数量，最后把木棒推成一横并收成清楚的“一”。",
    narration: {
      script: narrationScript,
      voice: "Ting-Ting-local-test",
      cues: [
        { at: 0.55, text: "一条小路" },
        { at: 2.2, text: "一个苹果" },
        { at: 4.1, text: "一根木棒" },
        { at: 5.9, text: "都是一" },
      ],
    },
    shotPlan: [
      {
        id: "meaning-path",
        start: 0,
        duration: 2.1,
        purpose: "语义先行：孩子先看到生活里的横向小路，而不是先看到字。",
        description: "暖草地中横向小路被轻轻点亮，一只引导小手用手指点一下并沿着小路描过去。",
        requiredAssets: ["meadow-line-plate", "guide-hand-trace-line"],
      },
      {
        id: "quantity-repeat",
        start: 2.0,
        duration: 1.85,
        purpose: "数量复现：一个苹果出现，让“一”不只是形状，也有数量意义。",
        description: "只有一个苹果轻轻落下并回弹，画面保持克制。",
        requiredAssets: ["apple-one-bounce-agent-v2"],
      },
      {
        id: "shape-bind",
        start: 3.75,
        duration: 1.95,
        purpose: "字形绑定：木棒真的滚平，和小路一起指向一横。",
        description: "一根木棒从斜放滚到水平，停住后与小路方向一致。",
        requiredAssets: ["stick-straighten-agent-v2"],
      },
      {
        id: "glyph-close",
        start: 5.55,
        duration: 2.25,
        purpose: "认字收束：生活物件淡下去，大字一、pinyin 和记忆短语安静停留。",
        description: "金色横线长成一，大字一出现，孩子有足够时间看清和跟读。",
        requiredAssets: ["html-glyph", "html-memory-line"],
      },
    ],
    teachingContract: {
      sourceModel: "hongen-micro-lesson/v1",
      meaningAction: {
        shotId: "meaning-path",
        description: "先让小路和引导手势建立横向意义，孩子知道要看一条平平的东西。",
        mustPrecedeGlyphClosure: true,
      },
      glyphBinding: {
        shotId: "shape-bind",
        description: "木棒从斜到平的动作，把生活物件、横向小路和汉字一绑定在一起。",
        boundElements: ["横向小路", "滚平木棒", "金色一横", "汉字一"],
      },
      phraseBridge: {
        shotId: "glyph-close",
        phrase: "都是一",
      },
      sentenceBridge: {
        sentence: narrationScript,
        source: "narration.script",
      },
      recognitionPauses: [
        {
          shotId: "meaning-path",
          target: "一条小路的横向语义",
          seconds: 1.45,
        },
        {
          shotId: "shape-bind",
          target: "木棒滚平成一横",
          seconds: 1.55,
        },
        {
          shotId: "glyph-close",
          target: "最终大字一和都是一",
          seconds: 2.25,
        },
      ],
      practiceOrRepeat: {
        mode: "semantic-repeat",
        description: "小路、苹果、木棒三次复现一的横向和数量意义，最后用都是一完成闭环。",
      },
      writingPosition: "late-or-omitted",
      mascotRole: "supporting",
    },
    pacingRequirements: {
      audienceAgeRange: "3-6",
      minimumCueHoldSeconds: 1.4,
      minimumFinalHoldSeconds: 2.2,
      maximumSceneChangesPerSecond: 0.62,
      productSurface: "P03 认字页竖屏手机教学舞台；节奏按幼儿园老师带读，不按 demo reel 快切。",
    },
    animationRequirements: {
      spriteRequired: [
        {
          actor: "guide-hand",
          action: "trace-line",
          reason: "引导动作改为手指点线和描线，不能复用旧兔子跳跃素材。",
          minFrames: 10,
          requiredMotionParts: ["index finger", "wrist", "sleeve", "tap motion"],
          poseContract: guideHandPoseContract(),
        },
        {
          actor: "stick",
          action: "straighten",
          reason: "木棒滚平成一横是字形绑定核心，必须在帧内改变角度。",
          minFrames: 8,
          requiredMotionParts: ["stick angle", "wood highlight", "contact point"],
          poseContract: stickPoseContract(),
        },
        {
          actor: "apple",
          action: "one-bounce",
          reason: "一个苹果用于数量复现，落下和回弹需要形变帧。",
          minFrames: 7,
          requiredMotionParts: ["apple body", "stem", "leaf"],
          poseContract: applePoseContract(),
        },
      ],
      timelineOnly: [
        "background hold",
        "path highlight grow",
        "scene opacity",
        "html glyph and pinyin",
        "final card hold",
      ],
    },
    finalFrame: {
      description: "引导小手和物件退到辅助位置，大字一、yi、都是一和金色横线安静可读。",
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
      summary: "暖阳绘本、低饱和、纸感草地；图片资产不含汉字、拼音、UI 文案或水印。",
    },
    plates: [
      {
        id: "meadow-line-plate",
        kind: "plate",
        purpose: "提供一条横向小路作为语义和字形共同钩子。",
        path: `tools/recognition-video/assets/unit-01/${characterId}/plates/meadow-line-plate.png`,
      },
    ],
    cutouts: [
      {
        id: "guide-hand-cutout-sequence",
        kind: "cutout",
        purpose: "引导小手指向小路、点一下并横向描过去，不复用旧兔子姿态。",
      },
      {
        id: "stick-straighten-cutout-sequence",
        kind: "cutout",
        purpose: "木棒逐帧滚平成横线，承担字形绑定。",
      },
      {
        id: "apple-one-bounce-cutout-sequence",
        kind: "cutout",
        purpose: "单个苹果轻落回弹，承担数量复现。",
      },
    ],
    sprites: [
      {
        id: "guide-hand-trace-line",
        actor: "guide-hand",
        action: "trace-line",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/guide-hand/trace-line/manifest.json`,
        minFrames: 10,
        requiredMotionParts: ["index finger", "wrist", "sleeve", "tap motion"],
        motionCheckIntent: "手指、手腕和袖口必须变化，挡住旧兔子素材或静态平移。",
        notes: "新动作是手指点线、描线，不是动物跳跃。",
      },
      {
        id: "stick-straighten-agent-v2",
        actor: "stick",
        action: "straighten",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/stick/straighten/manifest.json`,
        minFrames: 8,
        requiredMotionParts: ["stick angle", "wood highlight", "contact point"],
        motionCheckIntent: "木棒必须在帧内从斜到平，不能只靠 HTML rotate。",
        notes: "这是本版的主要字形绑定动作。",
      },
      {
        id: "apple-one-bounce-agent-v2",
        actor: "apple",
        action: "one-bounce",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/apple/one-bounce/manifest.json`,
        minFrames: 7,
        requiredMotionParts: ["apple body", "stem", "leaf"],
        motionCheckIntent: "苹果主体、叶子和梗必须在落地回弹中变化。",
        notes: "只出现一个苹果，服务数量意义。",
      },
    ],
    textRendering: {
      rasterImagesMayContainText: false,
      renderer: "html-css",
    },
    audio: {
      status: "baked",
      script: narrationScript,
      path: `tools/recognition-video/builds/${characterId}/assets/audio/yi-hongen-narration.mp3`,
    },
    qualityBars: [
      "语义动作先于大字出现，不能一开场直接炫字。",
      "引导小手是配角，画面主线是小路、苹果、木棒到一的绑定。",
      "每个 required sprite 都有 poseContract 和 motionChecks。",
      "核心 cue 间隔不低于 1.4 秒，final hold 不低于 2.2 秒。",
      "图片资产不含中文、拼音或 UI 文案，文字只由 HTML 渲染。",
      "测试产物不覆盖 existing official，也不自动接入 H5。",
    ],
  };
}

function guideHandPoseContract() {
  return [
    { frame: 0, pose: "hand-near-line", body: "小手停在小路左侧，食指还没伸出。", limbs: ["index finger", "wrist", "sleeve"], contact: "手腕轻轻悬在画面边缘。", mustReadAs: "准备指给孩子看。" },
    { frame: 1, pose: "finger-extends", body: "食指向右伸出，手腕跟着前移。", limbs: ["index finger", "wrist", "sleeve"], contact: "指尖尚未碰到线。", mustReadAs: "伸手指向小路。" },
    { frame: 2, pose: "finger-reaches", body: "食指伸到小路边缘。", limbs: ["index finger", "wrist", "sleeve", "tap motion"], contact: "指尖接近横线。", mustReadAs: "快要点到一条线。" },
    { frame: 3, pose: "tap-line", body: "食指向下轻点小路。", limbs: ["index finger", "wrist", "sleeve", "tap motion"], contact: "指尖点到横线。", mustReadAs: "点一下这一横。" },
    { frame: 4, pose: "tap-rebound", body: "食指从点按中回弹。", limbs: ["index finger", "wrist", "sleeve", "tap motion"], contact: "指尖离开横线一点点。", mustReadAs: "提醒孩子看这里。" },
    { frame: 5, pose: "trace-start", body: "食指沿横向开始描线。", limbs: ["index finger", "wrist", "sleeve"], contact: "指尖沿线滑动。", mustReadAs: "从左往右描一横。" },
    { frame: 6, pose: "trace-middle", body: "食指继续向右描，手腕跟进。", limbs: ["index finger", "wrist", "sleeve"], contact: "指尖贴近横线中部。", mustReadAs: "这一横是平平的。" },
    { frame: 7, pose: "trace-end", body: "食指描到横线右侧。", limbs: ["index finger", "wrist", "sleeve"], contact: "指尖靠近横线末端。", mustReadAs: "一横描完。" },
    { frame: 8, pose: "hold-point", body: "食指停住，给孩子一个观察停顿。", limbs: ["index finger", "wrist", "sleeve"], contact: "指尖停在横线旁。", mustReadAs: "看清一条线。" },
    { frame: 9, pose: "hand-withdraws", body: "小手退回边缘，把焦点还给字形。", limbs: ["index finger", "wrist", "sleeve"], contact: "小手离开横线。", mustReadAs: "配角退出。" },
  ];
}

function stickPoseContract() {
  return [
    { frame: 0, pose: "tilted-start", body: "木棒左高右低，离一横还有明显角度。", limbs: ["stick angle", "wood highlight"], contact: "右端接触地面。", mustReadAs: "木棒还没放平。" },
    { frame: 1, pose: "roll-a", body: "木棒开始滚动，角度变小。", limbs: ["stick angle", "wood highlight", "contact point"], contact: "接触点向中间移动。", mustReadAs: "正在滚向平平一横。" },
    { frame: 2, pose: "roll-b", body: "木棒继续靠近水平。", limbs: ["stick angle", "wood highlight", "contact point"], contact: "接触点继续移动。", mustReadAs: "快平了。" },
    { frame: 3, pose: "near-flat", body: "木棒接近水平。", limbs: ["stick angle", "wood highlight", "contact point"], contact: "接触面变长。", mustReadAs: "像一横了。" },
    { frame: 4, pose: "flat-touch", body: "木棒水平贴住地面。", limbs: ["stick angle", "wood highlight", "contact point"], contact: "木棒平稳贴地。", mustReadAs: "平平一横。" },
    { frame: 5, pose: "tiny-rebound", body: "木棒轻轻回弹一点。", limbs: ["stick angle", "wood highlight", "contact point"], contact: "接触面保持稳定。", mustReadAs: "软软停住。" },
    { frame: 6, pose: "flat-settle", body: "木棒再次水平停住。", limbs: ["stick angle", "wood highlight"], contact: "平稳贴地。", mustReadAs: "稳定的一横。" },
    { frame: 7, pose: "flat-hold", body: "木棒保持水平。", limbs: ["stick angle", "wood highlight"], contact: "平稳贴地。", mustReadAs: "可对照汉字一。" },
  ];
}

function applePoseContract() {
  return [
    { frame: 0, pose: "single-high", body: "一个苹果从上方出现。", limbs: ["apple body", "stem", "leaf"], contact: "未接触地面。", mustReadAs: "只有一个苹果。" },
    { frame: 1, pose: "fall-mid", body: "苹果继续下降，叶子滞后。", limbs: ["apple body", "stem", "leaf"], contact: "未接触地面。", mustReadAs: "正在落下。" },
    { frame: 2, pose: "touch-ground", body: "苹果底部刚碰到地面。", limbs: ["apple body", "stem", "leaf"], contact: "底部接触地面。", mustReadAs: "轻轻落地。" },
    { frame: 3, pose: "soft-squash", body: "苹果压扁变宽。", limbs: ["apple body", "stem", "leaf"], contact: "底部充分接触。", mustReadAs: "软软弹一下。" },
    { frame: 4, pose: "rebound-up", body: "苹果回弹变高。", limbs: ["apple body", "stem", "leaf"], contact: "减压回弹。", mustReadAs: "回弹。" },
    { frame: 5, pose: "settle-round", body: "苹果恢复圆润。", limbs: ["apple body", "stem", "leaf"], contact: "稳定停住。", mustReadAs: "一个苹果。" },
    { frame: 6, pose: "hold-one", body: "苹果安静停住。", limbs: ["apple body", "stem", "leaf"], contact: "稳定停住。", mustReadAs: "数量一。" },
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
    name: "yi-hongen-agent-v2",
    characterId: "yi",
    char: "一",
    status: "agent-pipeline-test",
    dimensions: { width: 1080, height: 1920 },
    duration,
    fps,
    sourceModel: "hongen-micro-lesson/v1",
    sourceArtifacts: {
      brief: `tools/recognition-video/briefs/${characterId}.brief.json`,
      assetPlan: `tools/recognition-video/asset-plans/${characterId}.asset-plan.json`,
      manifests: [
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/guide-hand/trace-line/manifest.json`,
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/stick/straighten/manifest.json`,
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/apple/one-bounce/manifest.json`,
      ],
    },
    outputs: {
      video: "renders/yi-hongen-agent-v2.mp4",
      poster: "renders/final-frames/yi-hongen-agent-v2-poster.png",
      finalFrame: "renders/final-frames/yi-hongen-agent-v2-final.png",
    },
    note: "Non-official new test. It replaces the old hop-rabbit idea with Hongen-style meaning action, glyph binding, repeat, and calm closure.",
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
    pivot: { x: 0.5, y: 0.78 },
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
  const target = join(buildRoot, "assets/audio/yi-hongen-narration.mp3");
  const aiff = join(buildRoot, "assets/audio/yi-hongen-narration.aiff");
  mkdirSync(dirname(target), { recursive: true });

  const bakedSource = join(repoRoot, "tools/hyperframes-one/assets/unit-01/yi/yi-video-narration-v1-timed.mp3");
  if (existsSync(bakedSource)) {
    const bakedResult = spawnSync("ffmpeg", [
      "-y",
      "-i",
      bakedSource,
      "-filter:a",
      "atempo=0.72,apad=pad_dur=0.4",
      "-t",
      String(duration),
      target,
    ], { stdio: "ignore" });
    if (bakedResult.status === 0 && existsSync(target)) return;
  }

  const sayResult = spawnSync("say", ["-v", "Ting-Ting", "-o", aiff, narrationScript], { stdio: "ignore" });
  if (sayResult.status === 0 && existsSync(aiff)) {
    const ffmpegResult = spawnSync("ffmpeg", [
      "-y",
      "-i",
      aiff,
      "-filter:a",
      "atempo=0.88,apad=pad_dur=0.45",
      "-t",
      String(duration),
      target,
    ], { stdio: "ignore" });
    if (ffmpegResult.status === 0 && existsSync(target)) return;
  }

  const silent = spawnSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-t",
    String(duration),
    target,
  ], { stdio: "ignore" });

  if (silent.status !== 0) {
    const fallback = join(repoRoot, "tools/hyperframes-one/assets/unit-01/yi/yi-video-narration-v1-timed.mp3");
    if (existsSync(fallback)) cpSync(fallback, target);
  }
}

function runValidationHarness() {
  runNodeScript("scripts/validate-teaching-harness.mjs", [briefPath, assetPlanPath]);
  for (const manifestPath of [
    join(canonicalRoot, "sprites/guide-hand/trace-line/manifest.json"),
    join(canonicalRoot, "sprites/stick/straighten/manifest.json"),
    join(canonicalRoot, "sprites/apple/one-bounce/manifest.json"),
  ]) {
    runNodeScript("scripts/validate-sprite-assets.mjs", [manifestPath]);
  }
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
    const meadow = Math.max(0, (y - height * 0.56) / (height * 0.44));
    for (let x = 0; x < width; x += 1) {
      const sun = radial(x, y, width * 0.46, height * 0.12, 360);
      const paper = ((x * 31 + y * 19) % 29) / 29;
      const base = y < height * 0.58
        ? mix([255, 244, 214], [251, 235, 205], y / (height * 0.58))
        : mix([226, 238, 196], [244, 225, 185], meadow);
      setPixel(pixels, width, height, x, y, [
        base[0] + sun * 18 + paper * 4,
        base[1] + sun * 12 + paper * 3,
        base[2] + sun * 3,
        255,
      ]);
    }
  }

  drawEllipse(pixels, width, height, 500, 220, 172, 172, [255, 224, 126, 88]);
  drawCloud(pixels, width, height, 160, 310, 1.1, [255, 255, 246, 150]);
  drawCloud(pixels, width, height, 760, 265, 0.92, [255, 255, 246, 130]);
  drawCloud(pixels, width, height, 865, 525, 0.62, [255, 255, 246, 90]);

  drawEllipse(pixels, width, height, 540, 1380, 650, 185, [211, 229, 176, 205]);
  drawEllipse(pixels, width, height, 520, 1510, 720, 240, [235, 231, 185, 170]);
  drawCapsule(pixels, width, height, 162, 1115, 918, 1115, 58, [211, 163, 91, 230]);
  drawCapsule(pixels, width, height, 198, 1115, 882, 1115, 32, [238, 198, 124, 245]);
  drawCapsule(pixels, width, height, 278, 1112, 802, 1112, 7, [255, 239, 185, 205]);

  for (let i = 0; i < 42; i += 1) {
    const x = 58 + ((i * 89) % 970);
    const y = 1285 + ((i * 53) % 420);
    const h = 24 + ((i * 11) % 30);
    drawCapsule(pixels, width, height, x, y, x + 7, y - h, 3, [120, 157, 84, 82]);
  }
  return pixels;
}

function createGuideHandFrames() {
  const poses = [
    { x: 0, y: 0, finger: 0, tap: 0, rot: -10 },
    { x: 10, y: -2, finger: 12, tap: 0, rot: -7 },
    { x: 22, y: -4, finger: 28, tap: 0, rot: -4 },
    { x: 28, y: 3, finger: 34, tap: 8, rot: -2 },
    { x: 25, y: -3, finger: 30, tap: -3, rot: -5 },
    { x: 38, y: -2, finger: 36, tap: 0, rot: -2 },
    { x: 54, y: -2, finger: 38, tap: 0, rot: 0 },
    { x: 70, y: -1, finger: 36, tap: 0, rot: 2 },
    { x: 72, y: -1, finger: 34, tap: 0, rot: 0 },
    { x: 10, y: 0, finger: 8, tap: 0, rot: -8 },
  ];

  return poses.map((pose) => {
    const pixels = transparent(256, 256);
    const wristX = 52 + pose.x;
    const wristY = 163 + pose.y;
    const palmX = 96 + pose.x;
    const palmY = 138 + pose.y + pose.tap * 0.25;
    const fingerEndX = 136 + pose.x + pose.finger * 0.7;
    const fingerEndY = 126 + pose.y + pose.tap;

    drawEllipse(pixels, 256, 256, 112, 211, 80, 12, [112, 79, 45, 30]);
    drawCapsule(pixels, 256, 256, wristX - 8, wristY + 28, wristX + 34, wristY + 10, 22, [130, 178, 156, 255], pose.rot);
    drawCapsule(pixels, 256, 256, wristX - 4, wristY + 18, wristX + 30, wristY + 4, 15, [184, 217, 199, 255], pose.rot);
    drawRotatedEllipse(pixels, 256, 256, palmX, palmY, 42, 28, pose.rot, [247, 207, 174, 255]);
    drawCapsule(pixels, 256, 256, palmX + 18, palmY - 9, fingerEndX, fingerEndY, 10, [248, 210, 178, 255]);
    drawEllipse(pixels, 256, 256, fingerEndX + 4, fingerEndY, 10, 8, [250, 219, 188, 255]);
    drawCapsule(pixels, 256, 256, palmX + 4, palmY + 8, palmX + 50, palmY + 22, 8, [244, 201, 169, 255], 12 + pose.rot);
    drawCapsule(pixels, 256, 256, palmX - 2, palmY + 18, palmX + 34, palmY + 36, 8, [240, 194, 163, 255], 18 + pose.rot);
    drawCapsule(pixels, 256, 256, palmX - 20, palmY + 10, palmX + 6, palmY + 33, 8, [238, 192, 161, 255], 34 + pose.rot);
    if (pose.tap > 3) drawEllipse(pixels, 256, 256, fingerEndX + 15, fingerEndY + 4, 5, 5, [250, 207, 72, 185]);
    return pixels;
  });
}

function createStickFrames() {
  const angles = [-58, -42, -26, -10, 0, 4, 0, 0];
  return angles.map((angle, index) => {
    const pixels = transparent(256, 256);
    const cx = 128;
    const cy = 140 + Math.max(0, 4 - index) * 3;
    drawEllipse(pixels, 256, 256, 128, 207, 82, 11, [112, 79, 45, 34]);
    drawCapsule(pixels, 256, 256, cx - 80, cy, cx + 80, cy, 19, [160, 100, 51, 255], angle);
    drawCapsule(pixels, 256, 256, cx - 68, cy - 7, cx + 70, cy - 7, 5, [224, 171, 94, 150], angle);
    drawCapsule(pixels, 256, 256, cx - 62, cy + 8, cx - 42, cy + 8, 3, [117, 76, 43, 116], angle);
    drawCapsule(pixels, 256, 256, cx + 30, cy + 8, cx + 60, cy + 8, 3, [117, 76, 43, 110], angle);
    return pixels;
  });
}

function createAppleFrames() {
  const poses = [
    { y: -34, sx: 0.94, sy: 1.04, leaf: -12 },
    { y: -16, sx: 0.98, sy: 1.02, leaf: -5 },
    { y: 1, sx: 1.05, sy: 0.96, leaf: 8 },
    { y: 16, sx: 1.18, sy: 0.82, leaf: 14 },
    { y: 4, sx: 0.95, sy: 1.08, leaf: -8 },
    { y: 9, sx: 1.02, sy: 0.99, leaf: 0 },
    { y: 9, sx: 1, sy: 1, leaf: 2 },
  ];

  return poses.map((pose) => {
    const pixels = transparent(256, 256);
    const cx = 128;
    const cy = 133 + pose.y;
    drawEllipse(pixels, 256, 256, 128, 207, 56, 12, [112, 79, 45, 42]);
    drawEllipse(pixels, 256, 256, cx - 26, cy + 8, 42 * pose.sx, 54 * pose.sy, [237, 87, 70, 255]);
    drawEllipse(pixels, 256, 256, cx + 25, cy + 8, 43 * pose.sx, 54 * pose.sy, [224, 74, 64, 255]);
    drawEllipse(pixels, 256, 256, cx, cy + 36, 54 * pose.sx, 46 * pose.sy, [220, 71, 61, 255]);
    drawEllipse(pixels, 256, 256, cx - 28, cy - 3, 16 * pose.sx, 20 * pose.sy, [255, 190, 166, 160]);
    drawCapsule(pixels, 256, 256, cx, cy - 82, cx + 8, cy - 45, 7, [121, 84, 42, 255]);
    drawRotatedEllipse(pixels, 256, 256, cx + 34, cy - 66, 28, 13, -24 + pose.leaf, [111, 160, 83, 255]);
    drawRotatedEllipse(pixels, 256, 256, cx + 33, cy - 67, 20, 7, -24 + pose.leaf, [144, 185, 107, 130]);
    return pixels;
  });
}

function createHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>一 - Hongen Agent V2</title>
  <script src="assets/runtime/gsap.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1920px;
      margin: 0;
      overflow: hidden;
      background: #f8ecd8;
      font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #5a3422;
    }
    .stage { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #f8ecd8; }
    .clip { position: absolute; }
    .plate { inset: 0; width: 1080px; height: 1920px; object-fit: cover; }
    .paper-grain {
      inset: 0;
      opacity: 0.12;
      background-image:
        radial-gradient(circle at 18% 24%, rgba(91, 61, 33, 0.10) 0 1px, transparent 1.5px),
        radial-gradient(circle at 71% 42%, rgba(91, 61, 33, 0.08) 0 1px, transparent 1.5px);
      background-size: 42px 42px, 67px 67px;
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
      color: #725019;
      text-shadow: 0 3px 0 rgba(255, 248, 222, 0.55);
    }
    .cue-path { top: 1284px; }
    .cue-stick { top: 1278px; }
    .cue-apple { top: 1234px; }
    .path-glow,
    .memory-line {
      position: absolute;
      left: 256px;
      top: 1102px;
      width: 568px;
      height: 28px;
      border-radius: 999px;
      transform-origin: 0 50%;
      background:
        linear-gradient(180deg, rgba(255, 249, 196, 0.9), rgba(255, 222, 84, 0.20)),
        linear-gradient(90deg, #f9c849, #dda015);
      box-shadow: 0 0 0 15px rgba(249, 200, 73, 0.12), 0 18px 24px rgba(92, 57, 21, 0.12);
    }
    .sprite {
      position: absolute;
      width: 256px;
      height: 256px;
      transform-origin: 50% 78%;
      filter: drop-shadow(0 18px 18px rgba(90, 52, 34, 0.12));
    }
    .sprite-frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; }
    .guide-hand { left: 56px; top: 978px; width: 292px; height: 292px; }
    .stick { left: 338px; top: 988px; width: 398px; height: 398px; }
    .apple { left: 414px; top: 794px; width: 254px; height: 254px; }
    .soft-focus {
      position: absolute;
      left: 170px;
      right: 170px;
      top: 1018px;
      height: 190px;
      border-radius: 96px;
      background: rgba(255, 243, 198, 0.24);
      border: 4px solid rgba(196, 139, 42, 0.10);
    }
    .glyph-card {
      position: absolute;
      left: 168px;
      right: 168px;
      top: 438px;
      height: 804px;
      display: grid;
      place-items: center;
      text-align: center;
      border-radius: 48px;
      background: rgba(255, 250, 230, 0.78);
      border: 6px solid rgba(188, 132, 38, 0.18);
      box-shadow: 0 38px 80px rgba(92, 57, 21, 0.14);
    }
    .glyph { font-size: 382px; line-height: 0.84; font-weight: 900; color: #5b351f; }
    .pinyin { margin-top: 44px; font-size: 76px; line-height: 1; font-weight: 850; color: #a46b12; }
    .memory-line { top: 1324px; height: 34px; }
    .final-phrase {
      position: absolute;
      left: 0;
      top: 1414px;
      width: 100%;
      text-align: center;
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
    <img id="meadow-line-plate" class="clip plate" data-start="0" data-duration="${duration}" data-track-index="0" src="assets/unit-01/${characterId}/plates/meadow-line-plate.png" alt="" />
    <div id="paper-grain" class="clip paper-grain" data-start="0" data-duration="${duration}" data-track-index="1" aria-hidden="true"></div>

    <section id="meaning-path-scene" class="clip scene path-scene" data-start="0" data-duration="2.1" data-track-index="2" aria-label="一条小路">
      <div class="soft-focus"></div>
      <div class="path-glow"></div>
      <div class="sprite guide-hand">
${spriteImages(`assets/unit-01/${characterId}/sprites/guide-hand/trace-line`, 10)}
      </div>
      <div class="cue cue-path">一条小路</div>
    </section>

    <section id="quantity-repeat-scene" class="clip scene apple-scene" data-start="2" data-duration="1.85" data-track-index="3" aria-label="一个苹果">
      <div class="sprite apple">
${spriteImages(`assets/unit-01/${characterId}/sprites/apple/one-bounce`, 7)}
      </div>
      <div class="cue cue-apple">一个苹果</div>
    </section>

    <section id="shape-bind-scene" class="clip scene stick-scene" data-start="3.75" data-duration="1.95" data-track-index="4" aria-label="一根木棒">
      <div class="soft-focus"></div>
      <div class="sprite stick">
${spriteImages(`assets/unit-01/${characterId}/sprites/stick/straighten`, 8)}
      </div>
      <div class="cue cue-stick">一根木棒</div>
    </section>

    <section id="glyph-close-scene" class="clip scene glyph-scene" data-start="5.55" data-duration="2.25" data-track-index="5" aria-label="都是一">
      <div class="glyph-card">
        <div>
          <div class="glyph">一</div>
          <div class="pinyin">yi</div>
        </div>
      </div>
      <div class="memory-line"></div>
      <div class="final-phrase">都是一</div>
      <div class="tokens" aria-hidden="true">
        <div class="token">小路</div>
        <div class="token">木棒</div>
        <div class="token">苹果</div>
      </div>
    </section>

    <audio id="narration-audio" class="clip" data-start="0" data-duration="${duration}" data-track-index="20" src="assets/audio/yi-hongen-narration.mp3" preload="auto"></audio>
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
      setOpacity(".path-scene", ease(range(time, 0.0, 0.22)) * (1 - range(time, 1.92, 0.25)));
      setScaleX(".path-glow", ease(range(time, 0.45, 0.8)));
      showSpriteFrame(".guide-hand", time, 0.18, 1.55, 10);
      setTransform(".guide-hand", {
        x: 8 * ease(range(time, 0.18, 1.55)),
        y: -5 * Math.sin(Math.PI * range(time, 0.18, 1.55)),
        scale: 1,
        rotation: -1 + 2 * Math.sin(Math.PI * range(time, 0.18, 1.55))
      });

      setOpacity(".apple-scene", ease(range(time, 2.0, 0.24)) * (1 - range(time, 3.62, 0.25)));
      showSpriteFrame(".apple", time, 2.2, 1.05, 7);
      setTransform(".apple", {
        y: -30 * (1 - ease(range(time, 2.2, 1.05))),
        scale: 1,
        rotation: -2 + 4 * Math.sin(Math.PI * range(time, 2.2, 1.05))
      });

      setOpacity(".stick-scene", ease(range(time, 3.75, 0.24)) * (1 - range(time, 5.48, 0.25)));
      showSpriteFrame(".stick", time, 3.95, 1.25, 8);
      setTransform(".stick", {
        y: -8 * Math.sin(Math.PI * range(time, 3.95, 1.25)),
        scale: 1,
        rotation: 0
      });

      setOpacity(".glyph-scene", ease(range(time, 5.55, 0.42)));
      setScaleX(".memory-line", ease(range(time, 5.76, 0.7)));
      setTransform(".glyph-card", {
        y: 18 * (1 - ease(range(time, 5.55, 0.55))),
        scale: 0.94 + 0.06 * ease(range(time, 5.55, 0.55)),
        rotation: 0
      });
      setOpacity(".final-phrase", ease(range(time, 6.35, 0.35)));
      setOpacity(".tokens", ease(range(time, 6.92, 0.35)));
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

function drawRotatedEllipse(pixels, width, height, centerX, centerY, radiusX, radiusY, degrees, color) {
  const angle = degrees * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const bound = Math.max(radiusX, radiusY) + 4;
  for (let y = Math.floor(centerY - bound); y <= Math.ceil(centerY + bound); y += 1) {
    for (let x = Math.floor(centerX - bound); x <= Math.ceil(centerX + bound); x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const rx = (dx * cos + dy * sin) / radiusX;
      const ry = (-dx * sin + dy * cos) / radiusY;
      const distance = Math.sqrt(rx * rx + ry * ry);
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
