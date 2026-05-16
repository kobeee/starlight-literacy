---
tags: [开发日志, HyperFrames, Agent, 认字动画, Harness, 教学设计]
created: 2026-05-12
date: 2026-05-12
---

# 2026-05-12 HyperFrames 教学 Harness 卡口落地

## 今日完成

- [x] 基于洪恩识字视频分析，把“先懂意思，再认字形；字形贴到语义对象；词句复现；练习/暂停服务识别；角色只做教具”的设计原则整理为机器可检查字段。
- [x] 在 `brief.schema.json` 中新增 `teachingContract`，覆盖 meaning action、glyph binding、phrase bridge、sentence bridge、recognition pauses、practice/repeat、writing position 和 mascot role。
- [x] 新增 `validate-teaching-harness.mjs`，把 prompt 里的要求变成流水线卡口。
- [x] 为 `yi-agent-pipeline-test.brief.json` 补充教学契约，保持当前 `一` agent 测试产物可通过新卡口。
- [x] 将 `create-yi-agent-pipeline-test.mjs` 改为生成后自动跑 teaching harness 和三个 sprite validator，不再依赖人工记得运行校验。
- [x] 在 `package.json` 新增 `npm run video:check-teaching-harness`。
- [x] 更新 `tools/recognition-video/AGENTS.md` 与 `README.md`，把 teaching harness 放入 Stage Gate。

## 验证记录

已通过：

```bash
node --check tools/recognition-video/scripts/validate-teaching-harness.mjs
node --check tools/recognition-video/scripts/create-yi-agent-pipeline-test.mjs
npm run video:check-teaching-harness
node tools/recognition-video/scripts/validate-sprite-assets.mjs tools/recognition-video/assets/unit-01/yi-agent-pipeline-test/sprites/rabbit/hop/manifest.json
node tools/recognition-video/scripts/validate-sprite-assets.mjs tools/recognition-video/assets/unit-01/yi-agent-pipeline-test/sprites/apple/settle/manifest.json
node tools/recognition-video/scripts/validate-sprite-assets.mjs tools/recognition-video/assets/unit-01/yi-agent-pipeline-test/sprites/stick/roll-flat/manifest.json
```

反向验证：

```bash
node tools/recognition-video/scripts/validate-teaching-harness.mjs \
  tools/recognition-video/examples/briefs/yi.brief.json \
  tools/recognition-video/examples/asset-plans/yi.asset-plan.json
```

旧 example 按预期失败，问题包括：缺 `pacingRequirements`、缺 `teachingContract`、cue 过快、资产缺失、sprite 缺 `requiredMotionParts` / `poseContract` / `motionChecks`。这说明 harness 不是空跑。

## 关键决策

- 不再把“视频要慢一点、兔子脚要动、字形要服务认字”停留在 prompt 层；这些规则必须能阻断流水线。
- HyperFrames 仍然只是最终装配层。教学结构、资产计划、sprite 动作契约必须在上游产物里显式存在。
- 对 3-6 岁孩子的 P03 认字视频，最终大字至少保留 2.0 秒；短视频不能为了节奏感牺牲认读时间。
- 小动物可以出现，但必须是边缘陪伴或提示动作；如果角色抢走字形锚点，应该在 brief 阶段就被纠偏。
- `一` 的旧 example 保留为“会被新 harness 拦住的历史样例”，不要把它误当成新的生产标准。

## 后续计划

- [ ] 新增字符视频时，先写 `brief + asset-plan` 并跑 `validate-teaching-harness.mjs`，通过后再生成 sprite。
- [ ] 把 `二 / 三 / 人 / 山 / 火` 的代表字 brief 按同一契约生产，优先看教学闭环，不先追求画面复杂。
- [ ] 后续如果接入 CI 或发布脚本，把 `video:check-teaching-harness` 和 sprite validators 统一纳入 official video gate。

## 学到的知识

- 对儿童识字视频来说，“动画好看”不是目标，“孩子能把字形、字义、声音挂在一起”才是目标。
- Prompt 可以表达意图，但 harness 才能让规则稳定生效。
- 识字动画的好坏要前置到数据结构和资产契约里判断，不能等 mp4 渲染出来以后才肉眼补救。
