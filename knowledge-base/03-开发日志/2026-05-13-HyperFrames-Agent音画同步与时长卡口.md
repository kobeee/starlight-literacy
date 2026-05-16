---
tags: [开发日志, HyperFrames, Agent, 认字动画, 音画同步, 时长卡口]
created: 2026-05-13
date: 2026-05-13
---

# 2026-05-13 HyperFrames Agent 音画同步与时长卡口

## 背景

用户连续指出两个关键问题：

1. 不能只把 `一` 字样片调好，下次生成新视频也要无缝继承。
2. 语速、音画同步和视频时长必须进入 agent 流水线，而不是渲染后临时补救。

此前 `yi-fresh-horizon-sync-v4` 已经证明可以用 Edge TTS 字幕时间戳反推镜头时间线，但这还只是单片验证。本轮把这个经验沉淀成项目内通用卡口：以后每个新字都必须先产出 `audio-plan.json`，再进入 HyperFrames 装配。

## 今日完成

- [x] 新增音画同步校验脚本：
  - `tools/recognition-video/scripts/validate-audio-sync-plan.mjs`
- [x] 新增 audio-plan schema：
  - `tools/recognition-video/schemas/audio-plan.schema.json`
- [x] 新增可复用 prompt 模板：
  - `tools/recognition-video/templates/prompts/audio-sync-plan-prompt.md`
- [x] 更新 recognition-video agent 文档：
  - `tools/recognition-video/AGENTS.md`
  - `tools/recognition-video/README.md`
- [x] 更新产品门禁：
  - `validate-product-video-gate.mjs --official` 现在要求 `sourceArtifacts.audioPlan`
- [x] 更新技术方案：
  - [[05-技术文档/HyperFrames多帧动画Agent流水线方案|HyperFrames 多帧动画 Agent 流水线方案]]
- [x] 新增 npm 命令：
  - `npm run video:check-audio-sync`
- [x] 将 `yi-fresh-horizon-sync-v4` 的 `asset-plan` / `audio-plan` 补齐为新格式，作为正向样例。

## 新的必经顺序

后续新字视频生产顺序改为：

1. `brief.json`
2. `asset-plan.json`
3. `audio-plans/<char-id>.audio-plan.json`
4. `validate-teaching-harness.mjs`
5. `validate-audio-sync-plan.mjs`
6. `product-review.json`
7. `validate-product-video-gate.mjs`
8. sprite/cutout 生产与 `validate-sprite-assets.mjs`
9. HyperFrames lint / inspect / render
10. ffprobe / volumedetect / poster / final frame / H5 guardrails
11. official 候选必须再跑 `validate-product-video-gate.mjs --official`

## Audio Plan 必填内容

`audio-plan.json` 需要记录：

- `voice.provider / voice.voice / voice.rate / voice.pitch`
- `durationBenchmark`
  - 洪恩式参考产品
  - 参考时长范围
  - 星光 P03 目标时长
  - 为什么压缩或保留这个时长
- `targetDurationSeconds`
- `rawTtsAudioDurationSeconds`
- `bakedAudioDurationSeconds`
- `quietAfterLastCueSeconds`
- 每句 cue 的：
  - `audioStart`
  - `audioEnd`
  - `visualStart`
  - `visualEnd`

## 新硬规则

- 不允许先把视频时间轴完全锁死，再把音频硬塞进去。
- 可以先生成草稿音频和 animatic，但正式装配前必须用测得的字幕/cue 时间戳回填时间线。
- Edge TTS 这类带读 voice 的 `rate` 默认控制在 `-15%` 到 `0%`，多句带读倾向 `-10%` 左右。
- P03 页面内认字短片保持 3-8 秒；3 句以上 cue 一般不低于约 5.8 秒。
- 洪恩单字卡可以作为慢节奏参考，但 P03 嵌入短片不照搬 20 秒长卡；必须在 `durationBenchmark` 里解释目标时长。
- 最后一句旁白结束后必须留 quiet final hold，让孩子看回大字。
- HyperFrames assembly 只能按已通过的 audio-plan 装配；如果移动 cue，需要同步改 audio-plan 并重跑校验。

## 验证记录

已通过：

```bash
node --check tools/recognition-video/scripts/validate-audio-sync-plan.mjs
node --check tools/recognition-video/scripts/validate-product-video-gate.mjs
node --check tools/recognition-video/scripts/create-yi-fresh-horizon-sync-v4.mjs
npm run video:check-audio-sync
npm run video:check-teaching-harness
npm run video:check-product-gate
node tools/recognition-video/scripts/validate-product-video-gate.mjs \
  tools/recognition-video/product-reviews/yi-fresh-horizon-sync-v4.product-review.json
```

预期失败：

```bash
node tools/recognition-video/scripts/validate-product-video-gate.mjs --official \
  tools/recognition-video/product-reviews/yi-fresh-horizon-sync-v4.product-review.json
```

失败原因符合预期：`yi-fresh-horizon-sync-v4` 仍是程序占位美术，`decision` 不是 `ready-for-official`，仍有 blocker，visual quality 和 official readiness 没达到 official 阈值。这个失败说明新门禁没有放松 official 标准。

## 接手规则

- 下次生成 `二 / 三 / 人 / 山 / 火` 时，不能只生成一个 HyperFrames composition；必须先补 `brief / asset-plan / audio-plan`。
- 音频和视频建议“先同步契约，再分别生产，最后一起装配”，不要走“先视频后音频硬贴”的路线。
- 如果 TTS provider 输出 VTT，就用 VTT 回填 cue；如果没有 VTT，也要人工标注 cue，并写进 `audio-plan.syncRules`。
- 渲染后的媒体检查仍要保留：`ffprobe` 看时长/音轨/帧率，`volumedetect` 看非静音和音量。
- `yi-fresh-horizon-sync-v4` 是 audio-sync 正向样例，不是 official 美术样例。

## 学到的知识

- 音画同步不是 HyperFrames 末端问题，而是 agent 流水线中游的契约问题。
- `audio-plan` 是连接教学 brief、旁白生成和 HyperFrames timeline 的共同语言。
- 只检查“有音轨”不够；必须知道每句声音对应哪个画面窗口。
- 时长不是越像洪恩越好，P03 页面内短片要保留慢 cue，但不能照搬 20 秒长卡。
