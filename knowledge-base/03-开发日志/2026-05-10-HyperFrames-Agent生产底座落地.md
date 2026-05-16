---
tags: [开发日志, HyperFrames, Agent, 生产底座, 认字动画]
created: 2026-05-10
date: 2026-05-10
---

# 2026-05-10 HyperFrames Agent 生产底座落地

## 今日完成

- [x] 将 HyperFrames 认字视频生产从“单 composition 手工打磨”推进为 agent workflow。
- [x] 新增 `tools/recognition-video/` 目录，承载 brief、asset plan、sprite manifest、校验脚本、prompt 模板和 HyperFrames 装配模板。
- [x] 新增根级 `AGENTS.md`，提示后续 Codex 先走 `tools/recognition-video/`，不要直接改单条视频 composition。
- [x] 新增用户级 skill：`/Users/elvis/.agents/skills/starlight-video-agent`，后续可用 `$starlight-video-agent` 触发。
- [x] 新增 npm 命令：
  - `npm run video:create-example-sprite`
  - `npm run video:check-sprite-example`
- [x] 跑通最小验证：示例 `yi/rabbit-hop` sprite manifest 通过校验。

## 关键文件

- `AGENTS.md`
- `tools/recognition-video/AGENTS.md`
- `tools/recognition-video/README.md`
- `tools/recognition-video/schemas/brief.schema.json`
- `tools/recognition-video/schemas/asset-plan.schema.json`
- `tools/recognition-video/schemas/sprite-manifest.schema.json`
- `tools/recognition-video/scripts/create-example-sprite.mjs`
- `tools/recognition-video/scripts/validate-sprite-assets.mjs`
- `tools/recognition-video/templates/prompts/cutout-sequence-prompt.md`
- `tools/recognition-video/templates/hyperframes/sprite-stage.html`

## 验证记录

已通过：

```bash
node --check tools/recognition-video/scripts/validate-sprite-assets.mjs
node --check tools/recognition-video/scripts/create-example-sprite.mjs
npm run video:create-example-sprite
npm run video:check-sprite-example
```

`npm run video:check-sprite-example` 输出：

```text
Recognition sprite validation ok: 1 manifest.
```

## 关键决策

- HyperFrames 降级为最终编排与渲染层，不再承担上游动画资产生产职责。
- Agent 不是黑箱“输入一个字输出 mp4”，而是分阶段产出：`brief -> asset-plan -> sprite manifest -> validation -> HyperFrames assembly -> release QA`。
- 动画质量的第一道门槛由脚本兜底：alpha、尺寸、帧数、裁切、chroma-key 残留必须可自动检查。
- 任何测试视频不得覆盖现有 official 资源，也不得直接接入 H5 official。

## 下个 session 计划

- [ ] 用 `$starlight-video-agent` 进行一次端到端能力验证。
- [ ] 建议仍用 `一` 做低风险测试，但产物命名为 `agent-pipeline-test`。
- [ ] 让 agent 真实生成或整理一组多帧 sprite/cutout，而不是使用 placeholder。
- [ ] 跑 `validate-sprite-assets.mjs`，确认校验能挡住坏资产。
- [ ] 由 HyperFrames 装配测试 composition，跑 lint / inspect / render。
- [ ] 抽 final frame / poster 做人工 review，判断动画性是否明显优于“单张图移动”。
- [ ] 本轮只验证生产能力，不接入 H5 official。
