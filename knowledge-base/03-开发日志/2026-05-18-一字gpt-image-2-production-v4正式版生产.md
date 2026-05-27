---
tags: [开发日志, HyperFrames, 认字视频, gpt-image-2, edge-tts, baked-audio, Mobile-H5, official, 楷体, 米字格, 笔顺, GSAP, chroma-key, CSS-disk, mix-blend-mode]
created: 2026-05-18
updated: 2026-05-18
---

# 2026-05-18 · 一 字 gpt-image-2 production v4 正式版生产

## 任务定义

承接 [2026-05-16 v3 日志](2026-05-16-一字gpt-image-2-production-v3正式版生产.md) 的三轮迭代成果（v37：楷体 + 半透明田字格 + 米字格笔顺尾段 + 静默 apad 到 10s）。本轮在 v37 上做 v4 重构，目标是**一次性消除三处肉眼可见的工程瑕疵**，再走完 official gate 与 H5 接入：

1. **田字格 + 米字格顺序冗余**：v3/v37 在 3.3-7.4s 用半透明田字格、7.7-10s 切到不透明米字格，存在两套格子前后并列。希望改成一个米字格贯穿识字 + 写字两阶段。
2. **太阳 halo 残色奇怪**：v3 用整块 sprite (rim → halo → rays)，chroma-key 后边缘留下粉紫与冷绿残留，与暖橙田园 plate 色温不和。希望让 plate 上的太阳本体稳定且 halo 融进暖光。
3. **SVG 光带易碎**：v3 用 SVG path + radial-gradient 渲光带，render 时偶发抗锯齿条纹与 transform-origin 偏移。希望换成纯 CSS。

硬约束沿用 v3：codex 内置 gpt-image-2（Responses API + image_generation），edge-tts XiaoxiaoNeural rate -10%，HyperFrames render `-f 24`，official gate 全过，audio drift ≤0.35s，video drift ≤0.15s，H5 资产命名避开 `/v3|legacy|sample/i` 正则。

## 产物清单

| 类型 | 路径 |
|---|---|
| build 目录 | `tools/recognition-video/builds/yi-gpt-image-2-production-v4/` |
| meta.json | 同上 `meta.json`，状态 `official`，sourceModel `hongen-micro-lesson/v1` |
| product-review | `tools/recognition-video/product-reviews/yi-gpt-image-2-production-v4.product-review.json`，`decision: ready-for-official`，overall **8.6**（v3 为 8.3） |
| brief / asset-plan / audio-plan | 同前缀 `briefs / asset-plans / audio-plans` |
| plate 原图 | `tools/recognition-video/assets/unit-01/yi-gpt-image-2-production-v4/plates/morning-field-plate-gpt-image-2.png`（codex gpt-image-2，1024×1536 high，2.7MB） |
| sprite manifest | `tools/recognition-video/assets/unit-01/yi-gpt-image-2-production-v4/sprites/sun/glow-breathe/manifest.json`，6 帧 480×480，chroma-key `#00ff00`，`alphaRequired: true` |
| mp4 / webm | 24fps，1080×1920，10.000s（mp4 流时长，drift 0.000s）。`renders/yi-gpt-image-2-production-v4.{mp4,webm}` 1.5MB / 1.2MB |
| poster / final / review-sheet | `renders/final-frames/yi-gpt-image-2-production-v4-{poster,final,review-01..04,review-sheet}.png` |
| H5 资产 | `src/clients/mobile-h5/assets/recognition/yi/yi-gpt-image-2-production-v4.{mp4,webm,poster.png,final.png,narration.mp3}` |
| H5 wiring | `src/shared/unit-01.js#yi.recognitionVideo` 全部指向 v4；`src/clients/mobile-h5/sw.js` IMAGE_SHELL + RECOGNITION_SHELL + VERSION 同步 v37→**v38** |

## 关键工艺路径（v3→v4 四条升级）

### 1. 单米字格双状态消除田字格 + 米字格顺序冗余

**v3 做法**：t=3.3-7.4s 半透明田字格服务于"识字"（透出物象），t=7.7-10s cross-fade 到不透明米字格服务于"写字"。两套格子前后切换有 0.3s 视觉跳跃。

**v4 做法**：从头到尾只有一个米字格，通过 4 个 CSS 变量驱动状态切换：

```css
.mizige {
  --bg-opacity: 0.42;        /* 识字态 半透明 → 写字态 0.96 */
  --border-strength: 0.55;   /* 识字态 暖棕半透明 → 写字态 1.0 黑实线 */
  --border-width: 2px;       /* 识字态 细 → 写字态 4px */
  --border-color: 93,74,54;  /* 识字态 暖棕 RGB → 写字态 31,26,20 黑 */
  background: rgba(250,243,227, var(--bg-opacity));
  border: var(--border-width) solid rgba(var(--border-color), var(--border-strength));
}
.mizige::before, .mizige::after { /* 横纵中线 + dashed X 对角线，opacity 由 --border-strength 推导 */ }
```

GSAP timeline 在 7.4-8.0s 内插值这 4 个变量，让米字格"原地"从识字态平滑过渡到写字态：cream 底加深、暖棕边框升级为黑色实线、米字虚线显形。同时楷体 `一` 通过 GSAP `.to({color: '#1f1a14'})` 由 `#5D4A36` 渐变到黑色。**不切镜，不切场，不换格子**——孩子注意力锚点全程不动。

附加收益：识字态 t=4.0-7.4s 时米字格 RGB 边框 `rgba(93,74,54,0.55)` 与最终大字 `#5D4A36` 同色温，预告字色血缘；写字态 t=8.0+s 升级为黑色后又与笔顺示范 `#1f1a14` 同色，强化"现在该写了"的信号。

### 2. CSS 实心 disk + halo-only sprite 双层日轮

**v3 做法**：sprite 一帧承担太阳本体 + halo + rays 全套，chroma-key (`#ff00ff` 洋红) 抠出后边缘留下粉紫色，与暖橙 plate 不和。

**v4 做法**：把太阳拆成两层：

- **底层**：纯 CSS 暖橙实心 disk（`radial-gradient(circle, #fff3c8 0%, #ffe19a 32%, #f5b85a 60%, #e08a35 86%, #c97320 100%)`），尺寸固定 280×280px，提供视觉本体的稳定锚点。
- **上层**：6 帧 halo-only spritesheet（`#00ff00` 绿色 chroma-key，**只包含光晕，不包含太阳本体**），通过 `prepare-spritesheet-sprite.mjs` 拆为 6 张 480×480 PNG。CSS 关键点：

```css
.sun-halo {
  mix-blend-mode: screen;       /* 暖白 halo 与 plate 自然加亮 */
  isolation: isolate;            /* 隔离混合上下文，防止漏到底层 */
  filter: hue-rotate(-35deg) saturate(0.75) brightness(1.08);
  /* 把 chroma-key 留下的微量绿/紫残色压成暖白 */
}
```

`mix-blend-mode: screen` 在暖橙 plate 上把 halo 自然加亮，残色被白光覆盖；`isolation: isolate` 把混合范围圈住，防止漏到底层 plate；`hue-rotate(-35deg) saturate(0.75) brightness(1.08)` 三段 filter 把绿色 chroma-key 的边缘残留偏到暖黄方向并降饱和，最终 halo 读出来就是"晨光呼吸光晕"，不再有 v3 的奇怪粉紫圈。

### 3. CSS 暖金光带替代易碎 SVG path

**v3 做法**：SVG `<path>` + `transform-origin` + `radial-gradient` 渲染光带。在 24fps render 时偶发抗锯齿条纹，且 SVG user-coordinate 默认原点不在中心导致 scaleX 时左侧抖动。

**v4 做法**：纯 CSS `linear-gradient` 横带：

```css
.light-band {
  width: 912px; height: 28px;
  background: linear-gradient(90deg,
    transparent 0%, rgba(255,208,113,0.0) 14%,
    #ffd071 28%, #e89a2a 50%, #ffd071 72%,
    rgba(255,208,113,0.0) 86%, transparent 100%);
  box-shadow:
    0 0 24px rgba(232,154,42,0.55),
    0 0 60px rgba(232,154,42,0.32);
  transform: scaleX(0); transform-origin: 50% 50%;
}
```

GSAP `1.6s → 2.5s` 把 `scaleX` 从 0 跑到 1，徐徐展开。CSS 渐变天然抗锯齿，在 1080×1920 portrait + 24fps 上稳定无闪烁。光带颜色（`#ffd071` 边、`#e89a2a` 焦点）与上一镜的 CSS sun disk 暖橙渐变同色温，视觉同源。

### 4. flat-line 暖棕预告字色血缘

**v3 做法**：t=4.2s 光带收束为 760×38 暖金 `#d8a13a` 横笔，再由暖金渐变到暖棕楷体大字 `#5D4A36`。中间有一次"金→棕"的色相跳变。

**v4 做法**：光带收束直接跳到 560×38 暖棕 `#5D4A36` 圆头圆尾横笔，与最终楷体大字 `一` 颜色完全一致。两阶段血缘从一开始就锁死，不再让孩子在 4.0-6.0s 间感受色相变化。横笔尺寸从 760 缩到 560 也是为了和 720px 米字格容器更协调。

## 验证流程

四条卡口 + H5 全链路依次跑过：

```
$ node tools/recognition-video/scripts/validate-teaching-harness.mjs \
    tools/recognition-video/briefs/yi-gpt-image-2-production-v4.brief.json \
    tools/recognition-video/asset-plans/yi-gpt-image-2-production-v4.asset-plan.json
Recognition teaching harness ok: 1 pair(s).

$ node tools/recognition-video/scripts/validate-audio-sync-plan.mjs \
    .../briefs/yi-gpt-image-2-production-v4.brief.json \
    .../asset-plans/yi-gpt-image-2-production-v4.asset-plan.json \
    .../audio-plans/yi-gpt-image-2-production-v4.audio-plan.json
Recognition audio sync plan ok: 1 triplet(s).

$ node tools/recognition-video/scripts/validate-sprite-assets.mjs \
    .../assets/unit-01/yi-gpt-image-2-production-v4/sprites/sun/glow-breathe/manifest.json
Recognition sprite validation ok: 1 manifest.

$ node tools/recognition-video/scripts/validate-product-video-gate.mjs --official \
    .../product-reviews/yi-gpt-image-2-production-v4.product-review.json
Starlight product video gate ok: 1 review(s).
```

product-review 各项打分：teachingStructure 9.0 / glyphBinding 8.8 / glyphAnchor 8.8 / pacing 8.5 / animationPerformance 8.3 / visualQuality 8.5 / childAppeal 8.6 / audioFit 8.4 / technicalCompliance 8.7 / officialReadiness 8.6，overall **8.6**（score 平均 8.62，落在 0.35 容差内）。

ffprobe 关键数：

| 项 | 实测 | 容差 | 结论 |
|---|---|---|---|
| mp4 视频流 duration | **10.000s** | declared 10s，drift ≤0.15s | ✓ |
| mp4 fps | **24/1** | declared 24 | ✓ |
| webm format duration | 10.001s | — | ✓ |
| narration.mp3 duration | **10.056s** | audio-plan target 10s，drift ≤0.35s | ✓（drift 0.056s） |
| narration.mp3 bitrate | 160kbps | — | 与 v37 baked 完全一致 |

## H5 接入（v37 → v38，零踩坑）

`src/shared/unit-01.js#yi.recognitionVideo` 整块替换：

```js
recognitionVideo: {
  status: "official",
  src: "./assets/recognition/yi/yi-gpt-image-2-production-v4.mp4",
  webm: "./assets/recognition/yi/yi-gpt-image-2-production-v4.webm",
  sources: [
    { src: "./assets/recognition/yi/yi-gpt-image-2-production-v4.webm", type: "video/webm" },
    { src: "./assets/recognition/yi/yi-gpt-image-2-production-v4.mp4", type: "video/mp4" }
  ],
  poster: "./assets/recognition/yi/yi-gpt-image-2-production-v4-poster.png",
  finalFrame: "./assets/recognition/yi/yi-gpt-image-2-production-v4-final.png",
  width: 1080, height: 1920, duration: 10, fps: 24,
  version: "yi-gpt-image-2-production-v4",
  teachingCue: "一个太阳、一条光线、平平一横，就是一。",
  audioTrack: {
    status: "baked",
    src: "./assets/recognition/yi/yi-gpt-image-2-production-v4-narration.mp3",
    voice: "zh-CN-XiaoxiaoNeural", rate: "-10%", pitch: "+0Hz", duration: 10.056
  }
}
```

`sw.js` 同步：

- `IMAGE_SHELL` 加入 `yi-gpt-image-2-production-v4-poster.png` 和 `-final.png`。
- `RECOGNITION_SHELL` 全部换到 v4 (`*.mp4 / *.webm / *-narration.mp3`)。
- 用 `node scripts/bump-h5-version.mjs` 把 4 处 (`sw.js / index.html / app.js / styles.css?v=`) 一起从 v37 推到 **v38**。

**对比 v3 接入的 5 条踩坑，v4 一次过**：

1. ~~`v3` 命中 legacy/sample 正则~~ → v4 用 `-v4` 后缀，`/v3|legacy|sample/i` 不会匹配。
2. ~~fps mismatch~~ → 直接 `npx hyperframes render -f 24`，guardrail 24fps 硬约束满足。
3. ~~voiceCues 不允许出现~~ → recognitionVideo 上没有 `voiceCues` 字段，只有 `audioTrack.status: "baked"`。
4. ~~版本号不一致~~ → 用 `bump-h5-version.mjs` 一次性同步。
5. ~~RECOGNITION_SHELL 漏加~~ → 这次直接整段替换 IMAGE_SHELL + RECOGNITION_SHELL。

```
$ npm run check:h5
Unit-01 course model ok: 20/20 characters, 11 required fields.
Unit-01 visual assets ok: 4 group scenes, style board 2026-05-10-phase3-style-board-v1.
Mobile H5 speech rhythm ok: segmented queue, pause map, voice preference and cancellation are present.
Mobile H5 guardrails ok: v38 resources, legacy gate, visual audit hook, official video policy.
Mobile H5 learning flow ok: review priority, evidence gates, group quizzes and unlock gating are consistent.
Mobile H5 routing ok: 12 routes, 29 data-actions, all aligned with USER_FLOW.md.
Mobile H5 version ok: all markers at v38.
```

## 沉淀进知识库（4 条新工艺）

1. **CSS 实心 disk + halo-only sprite 双层日轮模式**：sprite 抠像残色无法 100% 干净时，让 sprite 只负责光晕、CSS 负责本体。`mix-blend-mode: screen` + `isolation: isolate` 把残色压成暖光，`hue-rotate + saturate + brightness` 三段 filter 把残色偏向想要的色相。比死磕 chroma-key 颜色更稳。

2. **CSS 变量驱动的米字格双状态**：识字态半透明 + 写字态实色 + 黑色辅助线全显，全部用 `--bg-opacity / --border-strength / --border-width / --border-color` 4 个变量做 GSAP 插值，比"两套元素 cross-fade"省一半 DOM 也消除切镜感。模板可推广到其他笔画字（二、三、十、工 等单一笔画字）。

3. **CSS linear-gradient 横带替代 SVG path 光束**：单方向光束/横带优先用 CSS gradient + `box-shadow` 双层晕，再用 `transform: scaleX(0→1)` 展开。CSS 渐变天然抗锯齿，render 时不会出条纹，也不会踩 SVG `transform-origin` 默认值的坑。

4. **暖棕 flat-line 直接预告大字字色**：如果最终大字楷体颜色已经定下（`#5D4A36`），就把上一阶段抽象笔画直接用同色，不要中间走暖金再跳棕。色相血缘越紧，孩子建立"光带就是这一笔"的意义闭环就越快。

## 不做项

- 没有重新生 plate（沿用本次新生成的 morning-field-plate-gpt-image-2.png，与 v3 plate 内容相同色温，但因 v4 prompt 强约束 `no sun / no light beam / no UI text`，太阳和光带留给 CSS 层）。
- 没有动 audio-plan 的脚本与 cue 时间，narration.mp3 复用 v37 完整 baked + apad 文件（bit-identical），保证 Unit-01 全字主带读女老师声连续。
- 没有动 `unit-01-baked-audio.js`（char/phrase/soundCue 是 P03 tap-to-play 音轨，与 recognitionVideo.audioTrack 解耦）。
- 没有改 H5 端 `hydrateRecognitionMedia` 的有声 autoplay 三段式兜底（v3 三轮迭代时已固化，v4 沿用）。
- 没有重做 review-sheet 4 帧，沿用 t=2.5/4.0/6.0/9.0 抽帧（覆盖光带展开、flat-line + 识字态米字格、glyph closure、笔顺示范四个关键节点）。

## 与 v3 的对照速查

| 项 | v3 (2026-05-16, v37) | v4 (2026-05-18, v38) |
|---|---|---|
| 格子 | 半透明田字格 (3.3-7.4s) + 不透明米字格 (7.7-10s)，cross-fade | 单一米字格贯穿，CSS 变量驱动识字态→写字态 |
| 太阳 | 整块 sprite (rim+halo+rays)，magenta chroma-key | CSS 实心 disk + halo-only 6 帧 sprite，green chroma-key + screen blend |
| 光带 | SVG path + radial-gradient | CSS linear-gradient + box-shadow |
| flat-line | 暖金 `#d8a13a` 760×38 | 暖棕 `#5D4A36` 560×38（与最终大字同色） |
| 大字字号 | 520px | 560px |
| 视频时长 | mp4 10.021s / webm 10.042s | mp4 10.000s / webm 10.001s |
| audio | XiaoxiaoNeural baked 7.464s + apad 10.056s | 同上（bit-identical 复用） |
| product-review overall | 8.3 | 8.6 |
| H5 cache version | v37 | v38 |
| H5 接入踩坑 | 5 条 | 0 条 |
