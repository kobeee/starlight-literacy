---
tags: [开发日志, Mobile-H5, Unit-01, HyperFrames, baked-audio, P08]
created: 2026-05-10
updated: 2026-05-10
---

# 2026-05-10 Mobile H5 一字 official 视频与 P08 庆祝收口

## 本轮目标

承接 [[2026-05-08-Mobile-H5-baked-audio-edge-tts接入]] 的遗留项：

- 把 `一` 的 visual candidate 升级为 official recognition video。
- 使用生图工具补一个受控背景板，但汉字、拼音和 UI 文案仍由代码渲染。
- 将 baked audio 合进 mp4 / webm，过真实媒体流围栏。
- 落地 P08：只在 Unit-01 全 20 字 mastered 时庆祝一次。
- 用 in-app 浏览器先做基线自测，再做接入后自测。

## 完成项

### 1. in-app 浏览器基线自测

本地服务使用 `PORT=4174 npm run dev:h5` 启动，因 4173 已被占用。

验证：

- `/` 正确 302 到 `/src/clients/mobile-h5/`。
- P01 → P02 → P03 第一节课可达。
- 接入前 console 0 error / 0 warning。

### 2. 生图背景板接入 HyperFrames

使用内置 imagegen 生成 `一` 课程背景板，要求：

- 1280×800 横向教学舞台。
- 暖彩田园小院，中央留出空白教学面板。
- 只画生活场景、苹果、木棒、小路氛围。
- 不画汉字、拼音、数字、UI 文案或任何可读文字。

落盘：

- `tools/hyperframes-one/assets/unit-01/yi/yi-stage-bg-generated-20260510-source.png`
- `tools/hyperframes-one/assets/unit-01/yi/yi-stage-bg-v1.png`
- `src/clients/mobile-h5/assets/recognition/yi/source-assets/yi-stage-bg-v1.png`

HyperFrames composition `tools/hyperframes-one/index.html` 将该图作为最底层 raster plate，所有字形、拼音、标签仍由 HTML/CSS 渲染。

### 3. baked audio 音轨

用同套 H5 主带读参数生成视频旁白：

- provider：edge-tts
- voice：`zh-CN-XiaoxiaoNeural`
- rate：`-10%`
- pitch：`+0Hz`
- script：`一条小路。一个苹果。一根木棒。都是一。`

产物：

- 原始：`tools/hyperframes-one/assets/unit-01/yi/yi-video-narration-v1.mp3`，约 6.384s。
- 定时版：`tools/hyperframes-one/assets/unit-01/yi/yi-video-narration-v1-timed.mp3`，经 `atempo=1.14` 调整，约 5.58s。
- H5 source asset：`src/clients/mobile-h5/assets/recognition/yi/source-assets/yi-video-narration-v1-timed.mp3`

### 4. official 视频产物

重新 render silent mp4，再用 ffmpeg 合入音轨并输出 mp4 / webm。

产物：

- `tools/hyperframes-one/renders/yi-stage-official-v1.mp4`
- `tools/hyperframes-one/renders/yi-stage-official-v1.webm`
- `tools/hyperframes-one/renders/final-frames/yi-stage-official-v1-poster.png`
- `tools/hyperframes-one/renders/final-frames/yi-stage-official-v1-final.png`
- `src/clients/mobile-h5/assets/recognition/yi/yi-stage-official-v1.mp4`
- `src/clients/mobile-h5/assets/recognition/yi/yi-stage-official-v1.webm`
- `src/clients/mobile-h5/assets/recognition/yi/yi-stage-official-v1-poster.png`
- `src/clients/mobile-h5/assets/recognition/yi/yi-stage-official-v1-final.png`
- `src/clients/mobile-h5/assets/recognition/yi/yi-stage-official-v1.metadata.json`

ffprobe 关键结果：

- mp4：1280×800，24fps，5.833333s，140 frames，含 AAC audio stream。
- webm：1280×800，24fps，5.834s，含 Opus audio stream。

### 5. H5 接入

`src/shared/unit-01.js` 为 `一` 增加：

- `recognitionVideo.status = "official"`
- mp4 / webm / poster / finalFrame
- `audioTrack.status = "baked"`
- TTS 参数和 timed audio source

旧 `legacyRecognitionVideo.status = "legacy-sample"` 保留为历史资料，继续被 `recognitionVideoFor()` 过滤。

资源版本从 v21 升到 v22：

- `src/clients/mobile-h5/index.html`
- `src/clients/mobile-h5/app.js`
- `src/clients/mobile-h5/sw.js`

### 6. P08 落地

新增 `renderUnitCelebration()` 与 `celebrate` route。

触发条件：

```text
全 20 字都有 masteredAt
没有 needsReview
```

行为：

- 每组 5/5 不弹。
- Unit-01 全 mastered 后触发一次。
- 文案：`你认识了 Unit-01 全部 20 个字 / 收集到 20 颗小星星，全部点亮了`。
- CTA：`去家长中心看看 / 回学习地图`。
- 不放“开始下一单元”。

`scripts/check-mobile-h5-learning-flow.mjs` 已新增静态围栏，防止以后回退成每组阻断式庆祝或未 mastered 即庆祝。

## 验证

通过：

```bash
npx hyperframes lint
npx hyperframes inspect --at 0.3,0.8,1.6,3.2,4.8,5.7 --json
npx hyperframes render -o renders/yi-stage-official-v1-silent.mp4 --fps 24 --quality draft --workers 1
/Users/elvis/.agents/skills/starlight-recognition-video/scripts/verify_hyperframes_video.sh tools/hyperframes-one renders/yi-stage-official-v1.mp4
npm run check:h5
```

关键输出：

- HyperFrames lint：0 error / 0 warning。
- HyperFrames inspect：0 issue。
- `Mobile H5 guardrails ok: v22 resources, legacy gate, visual audit hook, official video policy.`
- `Mobile H5 learning flow ok: review priority, evidence gates, group quizzes and unlock gating are consistent.`

in-app 浏览器接入后自测：

- P01 根入口正常。
- P01 → P02 → P03 `一` 可达。
- P03 出现 1 个 video。
- video poster 指向 `./assets/recognition/yi/yi-stage-official-v1-poster.png`。
- video 无 `muted` 属性，baked audio 视频策略生效。
- console 0 error / 0 warning。

本地服务冒烟：

- official mp4：`200 OK`，`content-type: video/mp4`，支持 range。
- official webm：`200 OK`，`content-type: video/webm`，支持 range。
- poster：`200 OK`，`content-type: image/png`。

## 当前状态

`一` 已从 visual candidate 正式升级为 H5 official recognition video。

Phase 4 的首个标准样片闭环已成立：生图背景、HyperFrames、baked audio、真实媒体流围栏、H5 接入和 in-app browser 自测均完成。

## 补记：v1b 小动物与播放页修复

同日后续复核发现 v1 仍有两个产品级问题：

- 视频产物没有用户明确强调的小动物动画。
- P03 H5 播放页把 official video 和原生字卡/提示层叠在一起，视觉层级混乱。

已在 [[2026-05-10-Mobile-H5一字视频小动物与P03播放页修复]] 中收口：

- HyperFrames 补入兔子、蓝鸟、松鼠、小鸭边缘陪伴动画。
- official 资源重渲染并同步 H5。
- P03 official video 模式改为 `poster + video + replay`，不再叠原生 `glyph / cue / strokes`。
- 资源版本升到 v24，`npm run check:h5` 与 in-app 浏览器截图/点播验证通过。

后续优先级：

1. 启动 Phase 3 第一批生图资产体系：Unit-01 视觉语法板、4 组场景底板、范式物件。
2. 做代表字 `二 / 三 / 人 / 山 / 火` 的 content brief 和视频样片。
3. 在可启动 Chrome 的环境中重跑 `npm run audit:h5` 固定截图巡检。
