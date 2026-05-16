#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const recognitionRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const characterId = "yi-agent-pipeline-test";
const duration = 7.8;
const fps = 24;

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
mkdirSync(join(canonicalRoot, "sprites/rabbit/hop"), { recursive: true });
mkdirSync(join(canonicalRoot, "sprites/apple/settle"), { recursive: true });
mkdirSync(join(canonicalRoot, "sprites/stick/roll-flat"), { recursive: true });
mkdirSync(buildRoot, { recursive: true });

writeJson(briefPath, createBrief());
writeJson(assetPlanPath, createAssetPlan());

writeFileSync(
  join(canonicalRoot, "plates/meadow-path-plate.png"),
  encodeRgbaPng(1080, 1920, drawPlate(1080, 1920))
);

writeSprite(
  join(canonicalRoot, "sprites/rabbit/hop"),
  createRabbitFrames(),
  {
    id: "rabbit-hop-agent-test",
    actor: "rabbit",
    action: "hop",
    fps: 12,
    minFrames: 8,
    poseContract: manifestPoseContract(rabbitHopPoseContract()),
    motionChecks: [
      {
        id: "rabbit-foot-motion",
        label: "rabbit feet and legs",
        region: { x: 28, y: 142, width: 178, height: 86 },
        minChangedFramePairs: 5,
        minChangedPixels: 340,
        minMeanDelta: 9,
        notes: "Catches fake hop sprites where the body moves but feet keep the same pose."
      },
      {
        id: "rabbit-ear-lag",
        label: "rabbit ear lag",
        region: { x: 84, y: 34, width: 112, height: 84 },
        minChangedFramePairs: 4,
        minChangedPixels: 120,
        minMeanDelta: 5,
        notes: "Ear lag should support the jump instead of staying pasted to the body."
      }
    ],
    notes: "Procedural transparent cutout sequence for agent-pipeline-test; pose changes are baked into frames."
  }
);

writeSprite(
  join(canonicalRoot, "sprites/apple/settle"),
  createAppleFrames(),
  {
    id: "apple-settle-agent-test",
    actor: "apple",
    action: "settle",
    fps: 12,
    minFrames: 6,
    poseContract: manifestPoseContract(appleSettlePoseContract()),
    motionChecks: [
      {
        id: "apple-squash-rebound",
        label: "apple squash and rebound",
        region: { x: 54, y: 38, width: 150, height: 178 },
        minChangedFramePairs: 4,
        minChangedPixels: 420,
        minMeanDelta: 8,
        notes: "Apple landing must include frame-level shape change, not only timeline y motion."
      }
    ],
    notes: "Apple falling and soft squash/rebound are baked into the transparent frames."
  }
);

writeSprite(
  join(canonicalRoot, "sprites/stick/roll-flat"),
  createStickFrames(),
  {
    id: "stick-roll-flat-agent-test",
    actor: "stick",
    action: "roll-flat",
    fps: 12,
    minFrames: 8,
    poseContract: manifestPoseContract(stickRollFlatPoseContract()),
    motionChecks: [
      {
        id: "stick-rotation",
        label: "stick roll-to-horizontal",
        region: { x: 38, y: 60, width: 180, height: 140 },
        minChangedFramePairs: 5,
        minChangedPixels: 520,
        minMeanDelta: 10,
        notes: "The stick must rotate inside frames before HyperFrames places it."
      }
    ],
    notes: "Wood stick rotation into a horizontal line is baked into the transparent frames."
  }
);

cpSync(canonicalRoot, buildAssetRoot, { recursive: true });
copyNarrationIfAvailable();
writeJson(join(buildRoot, "hyperframes.json"), {
  $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
  registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  paths: {
    blocks: "compositions",
    components: "compositions/components",
    assets: "assets"
  }
});
writeJson(join(buildRoot, "meta.json"), createBuildMeta());
mkdirSync(join(buildRoot, "assets/runtime"), { recursive: true });
writeFileSync(join(buildRoot, "assets/runtime/gsap.min.js"), createMiniGsapScript(), "utf8");
writeFileSync(join(buildRoot, "index.html"), createHtml(), "utf8");
runValidationHarness();

console.log(`Wrote recognition-video agent pipeline test to ${buildRoot}`);

function createBrief() {
  return {
    schemaVersion: "recognition-video-brief/v1",
    characterId,
    character: "一",
    pinyin: "yi",
    unitId: "unit-01",
    duration,
    fps,
    teachingHook: "一条平平的小路，收成一个清清楚楚的一。",
    narration: {
      script: "一条小路。一个苹果。一根木棒。都是一。",
      voice: "zh-CN-XiaoxiaoNeural",
      cues: [
        { at: 0.9, text: "一条小路" },
        { at: 2.55, text: "一个苹果" },
        { at: 4.35, text: "一根木棒" },
        { at: 6.55, text: "都是一" }
      ]
    },
    shotPlan: [
      {
        id: "path-hook",
        start: 0,
        duration: 2.1,
        purpose: "用横向小路建立一的字形方向。",
        description: "暖色草地中出现一条平平的小路，兔子在路边用逐帧轻跳提醒孩子看横向。",
        requiredAssets: ["meadow-path-plate", "rabbit-hop-agent-test"]
      },
      {
        id: "one-object",
        start: 2.1,
        duration: 1.65,
        purpose: "用一个苹果连接数量意义。",
        description: "一个苹果落下并轻轻回弹，停在横线附近，强调只有一个。",
        requiredAssets: ["apple-settle-agent-test"]
      },
      {
        id: "shape-object",
        start: 3.75,
        duration: 1.75,
        purpose: "让木棒滚平，连接物件形状和一横。",
        description: "木棒用多帧滚动逐步放平，最后与横线方向一致。",
        requiredAssets: ["stick-roll-flat-agent-test"]
      },
      {
        id: "glyph-close",
        start: 5.35,
        duration: 2.45,
        purpose: "把生活画面收束到稳定汉字。",
        description: "金色横线生长，大字一、pinyin 和短短记忆词安静出现。",
        requiredAssets: ["html-glyph", "html-memory-line"]
      }
    ],
    teachingContract: {
      sourceModel: "hongen-micro-lesson/v1",
      meaningAction: {
        shotId: "path-hook",
        description: "先用小路和兔子轻跳建立横向语义场景，再收束到汉字一。",
        mustPrecedeGlyphClosure: true
      },
      glyphBinding: {
        shotId: "shape-object",
        description: "小路、木棒和金色横线都指向平平一横，让物件形状和字形绑定。",
        boundElements: ["横向小路", "滚平木棒", "汉字一"]
      },
      phraseBridge: {
        shotId: "glyph-close",
        phrase: "都是一"
      },
      sentenceBridge: {
        sentence: "一条小路。一个苹果。一根木棒。都是一。",
        source: "narration.script"
      },
      recognitionPauses: [
        {
          shotId: "path-hook",
          target: "小路横向语义 cue",
          seconds: 1.4
        },
        {
          shotId: "glyph-close",
          target: "最终大字和记忆词",
          seconds: 2.2
        }
      ],
      practiceOrRepeat: {
        mode: "semantic-repeat",
        description: "小路、苹果、木棒三次换物复现一，最后用都是一完成认字闭环。"
      },
      writingPosition: "late-or-omitted",
      mascotRole: "supporting"
    },
    pacingRequirements: {
      audienceAgeRange: "3-6",
      minimumCueHoldSeconds: 1.4,
      minimumFinalHoldSeconds: 2.2,
      maximumSceneChangesPerSecond: 0.65,
      productSurface: "P03 认字页竖屏手机教学舞台；孩子需要看清、听清、跟读，而不是快速看完演示。"
    },
    animationRequirements: {
      spriteRequired: [
        {
          actor: "rabbit",
          action: "hop",
          reason: "兔子需要真实 pose 变化，不能只移动单张图。",
          minFrames: 8,
          requiredMotionParts: ["rear foot", "front foot", "ears", "body squash"],
          poseContract: rabbitHopPoseContract()
        },
        {
          actor: "apple",
          action: "settle",
          reason: "苹果落地和回弹需要形变帧。",
          minFrames: 6,
          requiredMotionParts: ["apple body", "stem", "leaf"],
          poseContract: appleSettlePoseContract()
        },
        {
          actor: "stick",
          action: "roll-flat",
          reason: "木棒滚平是字形归纳动作，必须在帧内改变朝向。",
          minFrames: 8,
          requiredMotionParts: ["stick angle", "wood highlight"],
          poseContract: stickRollFlatPoseContract()
        }
      ],
      timelineOnly: [
        "background hold",
        "path highlight grow",
        "html text fade",
        "final card hold"
      ]
    },
    finalFrame: {
      description: "暖色草地和横线安静停住，汉字一、yi 和都是一清楚可读。",
      mustBeReadableAsPoster: true
    }
  };
}

function createAssetPlan() {
  return {
    schemaVersion: "recognition-video-asset-plan/v1",
    characterId,
    style: {
      source: "knowledge-base/06-素材资源/Unit-01素材与生图生产规范.md",
      summary: "暖阳绘本、低饱和、纸感草地；图片资产不包含汉字、拼音、UI 文案或水印。"
    },
    plates: [
      {
        id: "meadow-path-plate",
        kind: "plate",
        purpose: "提供一条横向小路和安静草地，让一的横向字形钩子先成立。",
        path: `tools/recognition-video/assets/unit-01/${characterId}/plates/meadow-path-plate.png`
      }
    ],
    cutouts: [
      {
        id: "rabbit-cutout-sequence",
        kind: "cutout",
        purpose: "兔子逐帧轻跳，作为边缘陪伴动作。"
      },
      {
        id: "apple-cutout-sequence",
        kind: "cutout",
        purpose: "苹果逐帧落下和回弹，强调一个。"
      },
      {
        id: "stick-cutout-sequence",
        kind: "cutout",
        purpose: "木棒逐帧滚平成横向，服务字形归纳。"
      }
    ],
    sprites: [
      {
        id: "rabbit-hop-agent-test",
        actor: "rabbit",
        action: "hop",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/rabbit/hop/manifest.json`,
        minFrames: 8,
        requiredMotionParts: ["rear foot", "front foot", "ears", "body squash"],
        motionCheckIntent: "脚部和耳朵区域必须在相邻帧里变化，挡住整只兔子平移冒充跳跃。",
        notes: "透明 PNG 序列，pose 变化已写入帧。"
      },
      {
        id: "apple-settle-agent-test",
        actor: "apple",
        action: "settle",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/apple/settle/manifest.json`,
        minFrames: 6,
        requiredMotionParts: ["apple body", "stem", "leaf"],
        motionCheckIntent: "苹果主体必须有落地压扁和回弹形变。",
        notes: "透明 PNG 序列，落下、压扁、回弹已写入帧。"
      },
      {
        id: "stick-roll-flat-agent-test",
        actor: "stick",
        action: "roll-flat",
        manifest: `tools/recognition-video/assets/unit-01/${characterId}/sprites/stick/roll-flat/manifest.json`,
        minFrames: 8,
        requiredMotionParts: ["stick angle", "wood highlight"],
        motionCheckIntent: "木棒必须在帧内旋转到水平，不能只靠 HTML 旋转。",
        notes: "透明 PNG 序列，滚动角度变化已写入帧。"
      }
    ],
    textRendering: {
      rasterImagesMayContainText: false,
      renderer: "html-css"
    },
    audio: {
      status: "baked",
      script: "一条小路。一个苹果。一根木棒。都是一。",
      path: `tools/recognition-video/builds/${characterId}/assets/audio/yi-agent-narration.mp3`
    },
    qualityBars: [
      "节奏服务 P03 儿童认字页，每个核心 cue 至少停留约 1.4 秒。",
      "总时长控制在 8 秒内，但不能把三例和大字收束挤成快速演示。",
      "三个 required actions 都有真实多帧透明 sprite。",
      "rabbit-hop 必须能看出后脚蓄力、前脚抬起、空中收腿、落地压缩。",
      "每个 required sprite manifest 必须写 poseContract 和 motionChecks。",
      "所有 raster 图片都不含汉字、拼音、UI 文案或水印。",
      "final frame 可以作为 poster/fallback 安静阅读。",
      "HyperFrames 只装配已验证 manifest 和 HTML 字形层。"
    ]
  };
}

function rabbitHopPoseContract() {
  return [
    {
      frame: 0,
      pose: "crouch",
      body: "身体压低变宽，重心在后脚上。",
      limbs: ["后脚贴地向后压", "前脚贴地但准备抬起", "耳朵向后垂"],
      contact: "两只脚都接触地面。",
      mustReadAs: "起跳前蓄力。"
    },
    {
      frame: 1,
      pose: "push-prep",
      body: "身体开始抬起，胸口向前。",
      limbs: ["后脚继续压地", "前脚微微离地", "耳朵开始滞后"],
      contact: "后脚仍接触地面，前脚轻抬。",
      mustReadAs: "准备蹬地。"
    },
    {
      frame: 2,
      pose: "takeoff",
      body: "身体离地，重心上升。",
      limbs: ["后腿伸开", "前脚收向身体", "耳朵向后甩"],
      contact: "脚离开地面。",
      mustReadAs: "蹬地起跳。"
    },
    {
      frame: 3,
      pose: "air-up",
      body: "身体到达较高位置。",
      limbs: ["后腿向后伸", "前脚收起", "耳朵明显滞后"],
      contact: "无脚接触地面。",
      mustReadAs: "空中跳起。"
    },
    {
      frame: 4,
      pose: "air-peak",
      body: "身体在最高点略拉长。",
      limbs: ["后腿开始收回", "前脚仍收起", "耳朵追上身体"],
      contact: "无脚接触地面。",
      mustReadAs: "跳到最高点。"
    },
    {
      frame: 5,
      pose: "landing-reach",
      body: "身体下降，头部向前。",
      limbs: ["后脚向下找地", "前脚伸向落点", "耳朵向前回摆"],
      contact: "脚即将落地。",
      mustReadAs: "准备落地。"
    },
    {
      frame: 6,
      pose: "squash-landing",
      body: "身体轻微压扁吸收落地。",
      limbs: ["后脚重新贴地", "前脚贴地", "耳朵向前弹"],
      contact: "两只脚接触地面。",
      mustReadAs: "落地压缩。"
    },
    {
      frame: 7,
      pose: "recover",
      body: "身体回到站姿。",
      limbs: ["后脚稳定", "前脚稳定", "耳朵回到自然角度"],
      contact: "两只脚稳定接触地面。",
      mustReadAs: "跳完站稳。"
    }
  ];
}

function appleSettlePoseContract() {
  return [
    {
      frame: 0,
      pose: "fall-high",
      body: "苹果从高处落下，形状略拉长。",
      limbs: ["叶子随下落向上滞后"],
      contact: "未接触地面。",
      mustReadAs: "一个苹果落下。"
    },
    {
      frame: 1,
      pose: "fall-mid",
      body: "苹果继续下降。",
      limbs: ["叶子轻微摆动"],
      contact: "未接触地面。",
      mustReadAs: "正在落下。"
    },
    {
      frame: 2,
      pose: "touch",
      body: "苹果刚接触地面，底部开始变宽。",
      limbs: ["叶子向前摆"],
      contact: "底部接触地面。",
      mustReadAs: "轻轻落地。"
    },
    {
      frame: 3,
      pose: "squash",
      body: "苹果被压扁变宽。",
      limbs: ["叶子压低"],
      contact: "底部充分接触地面。",
      mustReadAs: "软软弹一下。"
    },
    {
      frame: 4,
      pose: "rebound",
      body: "苹果回弹变高。",
      limbs: ["叶子向上跟随"],
      contact: "轻微离地或减压。",
      mustReadAs: "回弹。"
    },
    {
      frame: 5,
      pose: "settle",
      body: "苹果恢复稳定圆润形状。",
      limbs: ["叶子回到自然角度"],
      contact: "稳定停住。",
      mustReadAs: "一个苹果停住。"
    }
  ];
}

function stickRollFlatPoseContract() {
  return [
    {
      frame: 0,
      pose: "tilted-left",
      body: "木棒左高右低，角度明显。",
      limbs: ["高光随木棒倾斜"],
      contact: "一端靠近地面。",
      mustReadAs: "木棒开始滚。"
    },
    {
      frame: 1,
      pose: "rolling-a",
      body: "木棒角度变小。",
      limbs: ["高光继续随角度转动"],
      contact: "接触点移动。",
      mustReadAs: "正在滚动。"
    },
    {
      frame: 2,
      pose: "rolling-b",
      body: "木棒继续接近横向。",
      limbs: ["木纹位置变化"],
      contact: "接触点继续移动。",
      mustReadAs: "滚向平平一横。"
    },
    {
      frame: 3,
      pose: "near-flat-a",
      body: "木棒接近水平。",
      limbs: ["高光接近水平"],
      contact: "大部分靠近横线方向。",
      mustReadAs: "快要放平。"
    },
    {
      frame: 4,
      pose: "near-flat-b",
      body: "木棒只剩微小角度。",
      limbs: ["木纹稳定"],
      contact: "接触面变长。",
      mustReadAs: "变成一横。"
    },
    {
      frame: 5,
      pose: "over-correct",
      body: "木棒轻微越过水平。",
      limbs: ["高光轻微越过"],
      contact: "接触面保持稳定。",
      mustReadAs: "小小回弹。"
    },
    {
      frame: 6,
      pose: "flat",
      body: "木棒水平停住。",
      limbs: ["木纹水平"],
      contact: "平稳贴地。",
      mustReadAs: "平平一横。"
    },
    {
      frame: 7,
      pose: "flat-hold",
      body: "木棒保持水平。",
      limbs: ["木纹不再滚动"],
      contact: "平稳贴地。",
      mustReadAs: "稳定的一横。"
    }
  ];
}

function manifestPoseContract(briefPoseContract) {
  return {
    requiredMotionParts: Array.from(new Set(briefPoseContract.flatMap((frame) => frame.limbs))),
    frames: briefPoseContract.map((frame) => ({
      frame: frame.frame,
      pose: frame.pose,
      contact: frame.contact
    }))
  };
}

function createBuildMeta() {
  return {
    id: characterId,
    name: "yi-agent-pipeline-test",
    characterId: "yi",
    char: "一",
    status: "agent-pipeline-test",
    dimensions: {
      width: 1080,
      height: 1920
    },
    duration,
    fps,
    pacing: {
      audienceAgeRange: "3-6",
      productSurface: "P03 recognition teaching stage",
      minimumCueHoldSeconds: 1.4,
      minimumFinalHoldSeconds: 2.2,
      narration: "Source narration is time-stretched for the slower child-facing test render."
    },
    sourceArtifacts: {
      brief: `tools/recognition-video/briefs/${characterId}.brief.json`,
      assetPlan: `tools/recognition-video/asset-plans/${characterId}.asset-plan.json`,
      manifests: [
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/rabbit/hop/manifest.json`,
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/apple/settle/manifest.json`,
        `tools/recognition-video/assets/unit-01/${characterId}/sprites/stick/roll-flat/manifest.json`
      ]
    },
    outputs: {
      video: "renders/yi-agent-pipeline-test.mp4",
      poster: "renders/final-frames/yi-agent-pipeline-test-poster.png",
      finalFrame: "renders/final-frames/yi-agent-pipeline-test-final.png"
    },
    note: "Generated as a non-official pipeline test. It must not overwrite or wire into existing H5 official resources."
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
    frameSize: {
      width: 256,
      height: 256
    },
    pivot: {
      x: 0.5,
      y: 0.78
    },
    playback: {
      loop: false,
      holdLastFrame: true
    },
    alphaRequired: true,
    chromaKey: {
      enabled: false,
      color: "#ff00ff"
    },
    minFrames: manifestBase.minFrames,
    frames: frameNames,
    poseContract: manifestBase.poseContract,
    motionChecks: manifestBase.motionChecks,
    notes: manifestBase.notes
  });
}

function copyNarrationIfAvailable() {
  const source = join(repoRoot, "tools/hyperframes-one/assets/unit-01/yi/yi-video-narration-v1-timed.mp3");
  if (!existsSync(source)) return;
  const target = join(buildRoot, "assets/audio/yi-agent-narration.mp3");
  mkdirSync(dirname(target), { recursive: true });
  const atempo = "0.72";
  const result = spawnSync("ffmpeg", [
    "-y",
    "-i",
    source,
    "-filter:a",
    `atempo=${atempo},apad=pad_dur=0.4`,
    "-t",
    String(duration),
    target
  ], { stdio: "ignore" });

  if (result.status !== 0) {
    cpSync(source, target);
  }
}

function runValidationHarness() {
  runNodeScript("scripts/validate-teaching-harness.mjs", [
    briefPath,
    assetPlanPath
  ]);

  for (const manifestPath of [
    join(canonicalRoot, "sprites/rabbit/hop/manifest.json"),
    join(canonicalRoot, "sprites/apple/settle/manifest.json"),
    join(canonicalRoot, "sprites/stick/roll-flat/manifest.json")
  ]) {
    runNodeScript("scripts/validate-sprite-assets.mjs", [manifestPath]);
  }
}

function runNodeScript(scriptPath, scriptArgs) {
  const result = spawnSync(process.execPath, [
    join(recognitionRoot, scriptPath),
    ...scriptArgs
  ], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function drawPlate(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const skyMix = Math.min(1, y / (height * 0.68));
    const meadowMix = Math.max(0, (y - height * 0.56) / (height * 0.44));
    for (let x = 0; x < width; x += 1) {
      const sun = radial(x, y, width * 0.5, height * 0.13, 360);
      const paper = ((x * 37 + y * 17) % 23) / 23;
      const sky = mix([255, 244, 214], [252, 238, 208], skyMix);
      const grass = mix([226, 238, 196], [246, 226, 187], meadowMix);
      const color = y < height * 0.58 ? sky : grass;
      color[0] += sun * 16 + paper * 5;
      color[1] += sun * 12 + paper * 3;
      color[2] += sun * 4;
      setPixel(pixels, width, height, x, y, [color[0], color[1], color[2], 255]);
    }
  }

  drawEllipse(pixels, width, height, 540, 230, 170, 170, [255, 223, 126, 90]);
  drawCloud(pixels, width, height, 165, 310, 1.12, [255, 255, 245, 150]);
  drawCloud(pixels, width, height, 760, 270, 0.92, [255, 255, 245, 130]);
  drawCloud(pixels, width, height, 860, 520, 0.6, [255, 255, 245, 90]);

  drawEllipse(pixels, width, height, 540, 1390, 650, 185, [211, 229, 176, 210]);
  drawEllipse(pixels, width, height, 520, 1510, 720, 240, [235, 231, 185, 180]);
  drawCapsule(pixels, width, height, 168, 1120, 912, 1120, 54, [214, 168, 94, 238]);
  drawCapsule(pixels, width, height, 200, 1120, 880, 1120, 31, [239, 198, 123, 245]);
  drawCapsule(pixels, width, height, 268, 1118, 812, 1118, 8, [255, 238, 181, 190]);

  for (let i = 0; i < 38; i += 1) {
    const x = 62 + ((i * 89) % 980);
    const y = 1300 + ((i * 47) % 430);
    const h = 26 + ((i * 13) % 30);
    drawCapsule(pixels, width, height, x, y, x + 8, y - h, 3, [120, 157, 84, 88]);
  }
  return pixels;
}

function createRabbitFrames() {
  const poses = [
    {
      bodyX: -6,
      bodyY: 20,
      bodySx: 1.12,
      bodySy: 0.88,
      ear: -12,
      rear: { x: -52, y: 72, rx: 44, ry: 12, angle: 2 },
      front: { x: 40, y: 72, rx: 32, ry: 10, angle: -4 }
    },
    {
      bodyX: -3,
      bodyY: 10,
      bodySx: 1.05,
      bodySy: 0.94,
      ear: -8,
      rear: { x: -56, y: 78, rx: 47, ry: 11, angle: -8 },
      front: { x: 46, y: 60, rx: 28, ry: 9, angle: -34 }
    },
    {
      bodyX: 1,
      bodyY: -7,
      bodySx: 0.98,
      bodySy: 1.02,
      ear: -2,
      rear: { x: -62, y: 62, rx: 42, ry: 10, angle: 26 },
      front: { x: 50, y: 34, rx: 25, ry: 9, angle: -48 }
    },
    {
      bodyX: 4,
      bodyY: -12,
      bodySx: 0.96,
      bodySy: 1.06,
      ear: 6,
      rear: { x: -48, y: 44, rx: 38, ry: 10, angle: 44 },
      front: { x: 58, y: 28, rx: 24, ry: 8, angle: -58 }
    },
    {
      bodyX: 6,
      bodyY: -9,
      bodySx: 0.98,
      bodySy: 1.04,
      ear: 8,
      rear: { x: -34, y: 45, rx: 34, ry: 10, angle: 28 },
      front: { x: 60, y: 38, rx: 25, ry: 8, angle: -38 }
    },
    {
      bodyX: 8,
      bodyY: 4,
      bodySx: 1,
      bodySy: 1,
      ear: 0,
      rear: { x: -42, y: 65, rx: 38, ry: 11, angle: -14 },
      front: { x: 54, y: 68, rx: 31, ry: 10, angle: 18 }
    },
    {
      bodyX: 9,
      bodyY: 19,
      bodySx: 1.1,
      bodySy: 0.9,
      ear: -7,
      rear: { x: -48, y: 78, rx: 43, ry: 12, angle: -3 },
      front: { x: 43, y: 78, rx: 34, ry: 10, angle: 2 }
    },
    {
      bodyX: 9,
      bodyY: 15,
      bodySx: 1,
      bodySy: 1,
      ear: -5,
      rear: { x: -44, y: 74, rx: 38, ry: 12, angle: -8 },
      front: { x: 44, y: 72, rx: 31, ry: 10, angle: 8 }
    }
  ];

  return poses.map((pose) => {
    const pixels = transparent(256, 256);
    const cx = 122 + pose.bodyX;
    const cy = 142 + pose.bodyY;

    drawEllipse(pixels, 256, 256, 120, 222, 58, 10, [112, 79, 45, 34]);
    drawRotatedEllipse(pixels, 256, 256, cx + pose.rear.x, cy + pose.rear.y, pose.rear.rx, pose.rear.ry, pose.rear.angle, [218, 188, 156, 255]);
    drawRotatedEllipse(pixels, 256, 256, cx + pose.front.x, cy + pose.front.y, pose.front.rx, pose.front.ry, pose.front.angle, [218, 188, 156, 255]);
    drawEllipse(pixels, 256, 256, cx - 4, cy + 22, 74 * pose.bodySx, 44 * pose.bodySy, [238, 222, 198, 255]);
    drawEllipse(pixels, 256, 256, cx + 46, cy - 22, 42, 38, [245, 232, 211, 255]);
    drawRotatedEllipse(pixels, 256, 256, cx + 22 + pose.ear * 0.3, cy - 78, 13, 48, -16 + pose.ear, [239, 221, 198, 255]);
    drawRotatedEllipse(pixels, 256, 256, cx + 56 + pose.ear * 0.25, cy - 78, 12, 43, 8 + pose.ear, [239, 221, 198, 255]);
    drawRotatedEllipse(pixels, 256, 256, cx + 22 + pose.ear * 0.3, cy - 78, 6, 34, -16 + pose.ear, [232, 180, 168, 180]);
    drawRotatedEllipse(pixels, 256, 256, cx + 56 + pose.ear * 0.25, cy - 78, 5, 30, 8 + pose.ear, [232, 180, 168, 180]);
    drawEllipse(pixels, 256, 256, cx - 69, cy + 16, 18, 22, [250, 244, 233, 255]);
    drawEllipse(pixels, 256, 256, cx + 60, cy - 27, 4, 4, [76, 54, 43, 255]);
    drawEllipse(pixels, 256, 256, cx + 81, cy - 13, 9, 6, [207, 124, 103, 255]);
    drawEllipse(pixels, 256, 256, cx + 34, cy - 40, 8, 5, [255, 247, 238, 110]);
    return pixels;
  });
}

function createAppleFrames() {
  const poses = [
    { y: -24, sx: 0.95, sy: 1.04 },
    { y: -10, sx: 0.98, sy: 1.02 },
    { y: 2, sx: 1.05, sy: 0.96 },
    { y: 16, sx: 1.18, sy: 0.82 },
    { y: 5, sx: 0.96, sy: 1.08 },
    { y: 9, sx: 1.02, sy: 0.99 }
  ];

  return poses.map((pose) => {
    const pixels = transparent(256, 256);
    const cx = 128;
    const cy = 134 + pose.y;
    drawEllipse(pixels, 256, 256, 128, 206, 56, 12, [112, 79, 45, 42]);
    drawEllipse(pixels, 256, 256, cx - 26, cy + 8, 42 * pose.sx, 54 * pose.sy, [237, 87, 70, 255]);
    drawEllipse(pixels, 256, 256, cx + 25, cy + 8, 43 * pose.sx, 54 * pose.sy, [224, 74, 64, 255]);
    drawEllipse(pixels, 256, 256, cx, cy + 36, 54 * pose.sx, 46 * pose.sy, [220, 71, 61, 255]);
    drawEllipse(pixels, 256, 256, cx - 28, cy - 3, 16 * pose.sx, 20 * pose.sy, [255, 190, 166, 160]);
    drawCapsule(pixels, 256, 256, cx, cy - 82, cx + 8, cy - 45, 7, [121, 84, 42, 255]);
    drawRotatedEllipse(pixels, 256, 256, cx + 34, cy - 66, 28, 13, -24, [111, 160, 83, 255]);
    drawRotatedEllipse(pixels, 256, 256, cx + 33, cy - 67, 20, 7, -24, [144, 185, 107, 130]);
    return pixels;
  });
}

function createStickFrames() {
  const angles = [-52, -38, -24, -12, -5, 2, 0, 0];
  return angles.map((angle, index) => {
    const pixels = transparent(256, 256);
    const cx = 128;
    const cy = 138 + Math.max(0, 4 - index) * 4;
    drawEllipse(pixels, 256, 256, 128, 205, 82, 11, [112, 79, 45, 34]);
    drawCapsule(pixels, 256, 256, cx - 78, cy, cx + 78, cy, 18, [164, 103, 52, 255], angle);
    drawCapsule(pixels, 256, 256, cx - 68, cy - 6, cx + 70, cy - 6, 5, [222, 169, 92, 145], angle);
    drawCapsule(pixels, 256, 256, cx - 63, cy + 8, cx - 44, cy + 8, 3, [117, 76, 43, 115], angle);
    drawCapsule(pixels, 256, 256, cx + 32, cy + 8, cx + 58, cy + 8, 3, [117, 76, 43, 110], angle);
    return pixels;
  });
}

function createHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>一 - Agent Pipeline Test</title>
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
    .stage {
      position: relative;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      background: #f8ecd8;
    }
    .clip { position: absolute; }
    .plate {
      inset: 0;
      width: 1080px;
      height: 1920px;
      object-fit: cover;
    }
    .paper-grain {
      inset: 0;
      opacity: 0.14;
      background-image:
        radial-gradient(circle at 18% 24%, rgba(91, 61, 33, 0.11) 0 1px, transparent 1.5px),
        radial-gradient(circle at 71% 42%, rgba(91, 61, 33, 0.08) 0 1px, transparent 1.5px);
      background-size: 42px 42px, 67px 67px;
    }
    .stage-title {
      left: 0;
      top: 178px;
      width: 100%;
      text-align: center;
      font-size: 48px;
      line-height: 1.25;
      font-weight: 800;
      color: #7a570c;
    }
    .path-scene,
    .apple-scene,
    .stick-scene,
    .glyph-scene {
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .path-highlight,
    .memory-line {
      position: absolute;
      height: 30px;
      border-radius: 999px;
      transform-origin: 0 50%;
      background:
        linear-gradient(180deg, rgba(255, 247, 191, 0.85), rgba(255, 221, 85, 0.16)),
        linear-gradient(90deg, #f9c849, #dda015);
      box-shadow: 0 0 0 16px rgba(249, 200, 73, 0.12), 0 18px 24px rgba(92, 57, 21, 0.12);
    }
    .path-highlight {
      left: 258px;
      top: 1099px;
      width: 564px;
    }
    .sprite {
      position: absolute;
      width: 256px;
      height: 256px;
      transform-origin: 50% 78%;
      filter: drop-shadow(0 18px 18px rgba(90, 52, 34, 0.12));
    }
    .sprite-frame {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0;
    }
    .rabbit {
      left: 114px;
      top: 1022px;
      width: 210px;
      height: 210px;
    }
    .apple {
      left: 415px;
      top: 792px;
      width: 250px;
      height: 250px;
    }
    .stick {
      left: 338px;
      top: 1006px;
      width: 390px;
      height: 390px;
    }
    .caption {
      position: absolute;
      left: 0;
      width: 100%;
      text-align: center;
      font-size: 58px;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: 0;
      color: #735018;
      text-shadow: 0 3px 0 rgba(255, 248, 222, 0.55);
    }
    .caption-path { top: 1276px; }
    .caption-apple { top: 1126px; }
    .caption-stick { top: 1274px; }
    .glyph-card {
      position: absolute;
      left: 164px;
      right: 164px;
      top: 470px;
      height: 760px;
      display: grid;
      place-items: center;
      text-align: center;
      border-radius: 52px;
      background: rgba(255, 249, 228, 0.74);
      border: 6px solid rgba(188, 132, 38, 0.18);
      box-shadow: 0 38px 80px rgba(92, 57, 21, 0.14);
      backdrop-filter: blur(2px);
    }
    .glyph {
      font-size: 360px;
      line-height: 0.86;
      font-weight: 900;
      color: #5b351f;
    }
    .pinyin {
      margin-top: 46px;
      font-size: 74px;
      line-height: 1;
      font-weight: 850;
      color: #a46b12;
    }
    .memory-line {
      left: 260px;
      top: 1322px;
      width: 560px;
      height: 34px;
    }
    .final-phrase {
      position: absolute;
      left: 0;
      top: 1416px;
      width: 100%;
      text-align: center;
      font-size: 64px;
      line-height: 1.15;
      font-weight: 850;
      color: #714817;
    }
    .tokens {
      position: absolute;
      left: 132px;
      right: 132px;
      bottom: 166px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .token {
      min-height: 92px;
      display: grid;
      place-items: center;
      border-radius: 28px;
      background: rgba(255, 250, 232, 0.72);
      border: 4px solid rgba(165, 108, 27, 0.14);
      color: #765226;
      font-size: 34px;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <div
    id="yi-agent-pipeline-test"
    class="stage"
    data-composition-id="yi-agent-pipeline-test"
    data-start="0"
    data-width="1080"
    data-height="1920"
    data-duration="${duration}"
  >
    <img
      id="meadow-path-plate"
      class="clip plate"
      data-start="0"
      data-duration="${duration}"
      data-track-index="0"
      src="assets/unit-01/${characterId}/plates/meadow-path-plate.png"
      alt=""
    />
    <div
      id="paper-grain"
      class="clip paper-grain"
      data-start="0"
      data-duration="${duration}"
      data-track-index="1"
      aria-hidden="true"
    ></div>
    <div
      id="opening-title"
      class="clip stage-title"
      data-start="0"
      data-duration="2"
      data-track-index="2"
    >平平一条线</div>

    <section
      id="path-hook-scene"
      class="clip path-scene"
      data-start="0.25"
      data-duration="2.05"
      data-track-index="3"
      aria-label="一条小路"
    >
      <div class="path-highlight"></div>
      <div class="caption caption-path">一条小路</div>
    </section>

    <div
      id="rabbit-hop-sprite"
      class="clip sprite rabbit"
      data-start="0.35"
      data-duration="1.85"
      data-track-index="4"
      aria-hidden="true"
    >
${spriteImages(`assets/unit-01/${characterId}/sprites/rabbit/hop`, 8)}
    </div>

    <section
      id="apple-settle-scene"
      class="clip apple-scene"
      data-start="2.1"
      data-duration="1.85"
      data-track-index="5"
      aria-label="一个苹果"
    >
      <div class="sprite apple">
${spriteImages(`assets/unit-01/${characterId}/sprites/apple/settle`, 6)}
      </div>
      <div class="caption caption-apple">一个苹果</div>
    </section>

    <section
      id="stick-roll-flat-scene"
      class="clip stick-scene"
      data-start="3.75"
      data-duration="1.85"
      data-track-index="6"
      aria-label="一根木棒"
    >
      <div class="sprite stick">
${spriteImages(`assets/unit-01/${characterId}/sprites/stick/roll-flat`, 8)}
      </div>
      <div class="caption caption-stick">一根木棒</div>
    </section>

    <section
      id="glyph-close-scene"
      class="clip glyph-scene"
      data-start="5.35"
      data-duration="2.45"
      data-track-index="7"
      aria-label="都是一"
    >
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
        <div class="token">苹果</div>
        <div class="token">木棒</div>
      </div>
    </section>

    <audio
      id="narration-audio"
      class="clip"
      data-start="0"
      data-duration="${duration}"
      data-track-index="20"
      src="assets/audio/yi-agent-narration.mp3"
      preload="auto"
    ></audio>
  </div>

  <script>
    window.__timelines = window.__timelines || {};
    const timeline = gsap.timeline({ paused: true });
    const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
    const ease = (value) => 1 - Math.pow(1 - clamp(value), 3);
    const range = (time, start, length) => clamp((time - start) / length);
    const setOpacity = (selector, value) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.opacity = String(clamp(value));
      });
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
      document.querySelectorAll(selector).forEach((el) => {
        el.style.transform = "scaleX(" + clamp(value).toFixed(3) + ")";
      });
    };
    const showSpriteFrame = (selector, time, start, length, frameCount) => {
      const frames = gsap.utils.toArray(selector + " .sprite-frame");
      const progress = range(time, start, length);
      const index = Math.min(frameCount - 1, Math.floor(progress * frameCount));
      frames.forEach((frame, frameIndex) => {
        frame.style.opacity = frameIndex === index ? "1" : "0";
      });
    };

    timeline.add((time) => {
      setOpacity(".stage-title", 1 - range(time, 1.65, 0.45));
      setOpacity(".path-scene", ease(range(time, 0.25, 0.22)) * (1 - range(time, 2.02, 0.28)));
      setScaleX(".path-highlight", ease(range(time, 0.55, 0.75)));
      showSpriteFrame(".rabbit", time, 0.35, 1.55, 8);
      setTransform(".rabbit", {
        x: 18 * ease(range(time, 0.35, 1.55)),
        y: -34 * Math.sin(Math.PI * range(time, 0.35, 1.55)),
        scale: 1,
        rotation: -3 + 7 * Math.sin(Math.PI * range(time, 0.35, 1.55))
      });

      setOpacity(".apple-scene", ease(range(time, 2.1, 0.22)) * (1 - range(time, 3.72, 0.25)));
      showSpriteFrame(".apple", time, 2.25, 1.05, 6);
      setTransform(".apple", {
        y: -26 * (1 - ease(range(time, 2.25, 1.05))),
        scale: 1,
        rotation: -3 + 6 * Math.sin(Math.PI * range(time, 2.25, 1.05))
      });

      setOpacity(".stick-scene", ease(range(time, 3.75, 0.22)) * (1 - range(time, 5.32, 0.25)));
      showSpriteFrame(".stick", time, 3.9, 1.15, 8);
      setTransform(".stick", {
        y: -8 * Math.sin(Math.PI * range(time, 3.9, 1.15)),
        scale: 1,
        rotation: 0
      });

      setOpacity(".glyph-scene", ease(range(time, 5.35, 0.45)));
      setScaleX(".memory-line", ease(range(time, 5.55, 0.65)));
      setTransform(".glyph-card", {
        y: 18 * (1 - ease(range(time, 5.35, 0.55))),
        scale: 0.94 + 0.06 * ease(range(time, 5.35, 0.55)),
        rotation: 0
      });
      setOpacity(".final-phrase", ease(range(time, 6.35, 0.35)));
      setOpacity(".tokens", ease(range(time, 6.9, 0.35)));
    });

    timeline.seek(0);
    window.__timelines["yi-agent-pipeline-test"] = timeline;
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
    this._appliers.forEach(function (applier) {
      applier(this._time);
    }, this);
    return this;
  };
  MiniTimeline.prototype.totalTime = function (time) {
    if (arguments.length === 0) return this._time;
    return this.seek(time);
  };
  MiniTimeline.prototype.time = function () {
    return this._time;
  };
  MiniTimeline.prototype.duration = function () {
    return this._duration;
  };
  MiniTimeline.prototype.pause = function () {
    return this;
  };
  MiniTimeline.prototype.play = function () {
    return this;
  };
  MiniTimeline.prototype.timeScale = function () {
    return this;
  };
  window.gsap = {
    timeline: function () {
      return new MiniTimeline(${duration});
    },
    utils: {
      toArray: function (selector) {
        return Array.from(document.querySelectorAll(selector));
      }
    }
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
    a[2] + (b[2] - a[2]) * value
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
    pngChunk("IEND", Buffer.alloc(0))
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
