---
tags: [开发日志, HyperFrames, Agent, 认字动画, 产品门禁]
created: 2026-05-13
date: 2026-05-13
---

# 2026-05-13 HyperFrames Agent 产品门禁分层

## 背景

用户指出需要区分两个问题：

1. 通用的 HyperFrames 视频生成 agent。
2. 星光识字产品自己的 HyperFrames 视频生成 agent。

这个区分是此前 `yi-hongen-agent-v2` 评分偏低的根因之一。上一次生成链路证明了 `brief / asset-plan / sprite / HyperFrames render / ffprobe` 能跑通，但它不能证明视频已经适合 3-6 岁孩子在 P03 认字页里学习。换句话说，通用 HyperFrames 装配层过了，星光识字产品导演层还没有真正立起来。

## 今日完成

- [x] 明确职责边界：
  - 通用 HyperFrames agent 只负责 HTML/CSS/GSAP 装配、lint、inspect、render、poster/final frame、metadata、媒体检查。
  - 星光识字产品 video agent 负责教学钩子、关键帧、动作可读性、资产完成度、儿童记忆点、P03 适配和 official 资格。
- [x] 新增 product review schema：
  - `tools/recognition-video/schemas/product-review.schema.json`
- [x] 新增产品门禁脚本：
  - `tools/recognition-video/scripts/validate-product-video-gate.mjs`
- [x] 新增 npm 命令：
  - `npm run video:check-product-gate`
- [x] 给 `yi-hongen-agent-v2` 补了诚实复盘：
  - `tools/recognition-video/product-reviews/yi-hongen-agent-v2.product-review.json`
  - 总分 `6.3`
  - 决策 `rendered-needs-iteration`
  - 明确不能 official：程序图形素材、动作可读性 partial、无强记忆瞬间、音频未按新版动作重配。
- [x] 更新 agent 工作流文档：
  - `tools/recognition-video/AGENTS.md`
  - `tools/recognition-video/README.md`
  - `tools/recognition-video/codex-skill/starlight-video-agent/SKILL.md`
  - `knowledge-base/05-技术文档/HyperFrames多帧动画Agent流水线方案.md`

## 新门禁定义

`validate-product-video-gate.mjs` 是星光识字产品层的门，不替代 HyperFrames 技术门。

它检查：

- `layerBoundary` 是否明确拆分 product agent 与 generic HyperFrames agent。
- `keyframes` 是否提供至少 4 个关键帧证据。
- `actionReadability` 是否逐项评价核心动作是否读得出来。
- `memoryMoment.exists` 是否存在强记忆瞬间。
- `assetAssessment.usesProgrammaticPlaceholderAssets` 是否为程序占位资产。
- 多维评分是否覆盖教学结构、字形绑定、字形锚点、节奏、动画表现、美术质感、儿童吸引力、音频贴合、技术合规和 official 准备度。
- `decision` 是否与评分、blocker、资产状态一致。

普通模式允许低分测试产物被记录下来，但必须诚实标记为 `rendered-needs-iteration` 或 `blocked`。严格模式：

```bash
node tools/recognition-video/scripts/validate-product-video-gate.mjs --official \
  tools/recognition-video/product-reviews/<char-id>.product-review.json
```

严格模式会阻止程序图形占位资产、无强记忆瞬间、动作可读性 partial/fail、分数不足或仍有 blocker 的视频进入 official。

## 验证记录

已通过：

```bash
node --check tools/recognition-video/scripts/validate-product-video-gate.mjs
npm run video:check-product-gate
npm run video:check-teaching-harness
node tools/recognition-video/scripts/validate-sprite-assets.mjs \
  tools/recognition-video/assets/unit-01/yi-hongen-agent-v2/sprites/guide-hand/trace-line/manifest.json \
  tools/recognition-video/assets/unit-01/yi-hongen-agent-v2/sprites/apple/one-bounce/manifest.json \
  tools/recognition-video/assets/unit-01/yi-hongen-agent-v2/sprites/stick/straighten/manifest.json
```

预期失败也已验证：

```bash
node tools/recognition-video/scripts/validate-product-video-gate.mjs --official \
  tools/recognition-video/product-reviews/yi-hongen-agent-v2.product-review.json
```

失败原因符合预期：`yi-hongen-agent-v2` 不是 `ready-for-official`，仍有 blocker，使用程序占位资产，没有强记忆瞬间，多项分数未达 official 阈值，核心动作可读性不是全 pass。

## 接手规则

- 不要再把 HyperFrames render pass 当成星光识字 product pass。
- 代表字扩展验证必须补 `product-reviews/<char-id>.product-review.json`。
- 官方候选必须跑 `validate-product-video-gate.mjs --official`。
- 程序绘制的 plate、CSS 几何、脚本 sprite 只允许做 smoke test，不允许 promoted to official。
- 进入 HyperFrames 前，应先看关键帧和动作可读性；如果静帧就像测试稿，不要继续 render。
- 下一轮做 `二 / 三 / 人 / 山 / 火` 时，顺序应为：brief + asset-plan → teaching harness → product review/keyframe gate → sprite/cutout → sprite validator → HyperFrames assembly → media QA → official product gate。

## 学到的知识

- 通用 HyperFrames agent 的目标是“把视频做出来”。
- 星光识字产品 agent 的目标是“判断这个视频是否值得被做出来，以及是否能教孩子认字”。
- `yi-hongen-agent-v2` 的价值不是画面达标，而是暴露出必须新增 product gate。
- 低分样片如果被诚实记录，比假装合格更有价值；它能让下一轮 agent 知道该在哪一层停下。
