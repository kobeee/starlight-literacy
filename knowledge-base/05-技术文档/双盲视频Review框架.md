---
tags: [技术文档, recognition-video, review, double-blind, multi-agent, claude-codex]
created: 2026-05-23
updated: 2026-05-23
---

# 双盲视频 Review 框架（Claude × Codex × Jury）

> 适用对象：Starlight Literacy 识字视频 build（如 `yi-v5-cinematic`、`yi-v8`）。
> 落地路径：`.claude/skills/video-review*`、`tools/recognition-video/codex-skill/starlight-video-reviewer/`、`tools/recognition-video/reviewers/`。
> 立项触发：yi-v8.2 5 个 validator 全 ✅ 但视频"没动画 / 镜头突兀 / 手+笔事后摆设"，证明单模型 self-review 抓不到第一性原理失败。

---

## 1 · 为什么不是 fresh-session 单 Claude

事故链：

- yi-v5-cinematic 评 9.12 ready-for-official，但末帧两横笔幽灵 + 旁白无锚定
- yi-v6 dual-render 把"一"画成"二"，validator 通过我放官方
- yi-v8.2 5 个 validator 全 ✅，但视频在帧级别就能看出"字 t8.5 写完、笔 t10.3 才出现"

**根因不是"上下文污染"，是"单模型审美盲区"。** fresh session 解决记忆污染，没解决模型偏见。同一个 Claude 写 brief、设计动画、跑 validator、自己 review，再 fresh 也还是同一套审美。

**真正的独立 = 模型独立**。Claude 偏叙事/儿童共情，Codex 偏 spec/timing-window 冷面对比；两个模型的盲点不同 → 互补盖盲区。

---

## 2 · 三方架构

```
主线 Claude（orchestrator）
   ├── Agent tool spawn ──→ Claude Reviewer（fresh 子 agent，独立上下文）
   ├── Bash codex exec ──→ Codex Reviewer（独立进程 + 独立模型）
   └── Agent tool spawn ──→ Jury（fresh Claude 子 agent，只看两份 review）
```

四个独立上下文，三次真独立 review：

- Claude reviewer 不知道主线做过什么
- Codex reviewer 是另一个模型完全分开的进程
- Jury 不知道 review 怎么写出来的，只看两份 JSON
- 主线**不评不裁，只调度 + 汇报**——彻底排除自我偏见

---

## 3 · 5 件套输入包（共享契约）

每次 review 一个 build，固定 5（+1 可选）件套：

| 项 | 类型 | 路径模板 |
|---|---|---|
| brief | JSON | `briefs/<build>.brief.json` |
| audio-plan | JSON | `audio-plans/<build>.audio-plan.json` |
| tail-spec | JSON | `tail-specs/<build>.tail-spec.json` |
| video | MP4 | `builds/<build>/renders/<build>.mp4` |
| keyframes | PNG[] | `builds/<build>/snapshots/frame-*.png`（≥ 4） |
| narration-spec（可选） | JSON | `narration-specs/<build>.narration-spec.json` |

主线 orchestrator 在 spawn reviewer 前**强预检**：任何一项缺失 → 直接报错，不许 reviewer "尽力而为"。

详见 `tools/recognition-video/reviewers/reviewer-input-pack.md`。

---

## 4 · Reviewer 输出契约（强结构化）

每个 reviewer 写一份 `reviewer-output.schema.json` 合规 JSON：

```jsonc
{
  "schemaVersion": "starlight-double-blind-review/v1",
  "reviewerId": "claude" | "codex",
  "characterId": "yi",
  "buildId": "yi-v8",
  "scores": {              // 11 维，复用 product-review.schema.json
    "teachingStructure": { "score": 0-10, "reason": "one-line" },
    // ...
    "teachingFunctionalIntegrity": { ... }
  },
  "overallScore": 0-10,
  "blockers": [            // minItems: 3，强制
    {
      "severity": "critical" | "high" | "medium",
      "atTime": 10.3,
      "atKeyframe": "frame-06-at-10.3s.png",
      "issue": "≥ 20 字符 observable",
      "rootCause": "≥ 20 字符 first-principles",
      "specRef": "brief.shots[3].duration"  // optional
    }
  ],
  "decision": "ready-for-official" | "needs-revision" | "blocked",
  "confidence": "high" | "medium" | "low",
  "rationale": "≥ 100 字符"
}
```

详见 `tools/recognition-video/reviewers/reviewer-output.schema.json`。

---

## 5 · 7 条硬约束（写进每个 reviewer 的 SKILL.md）

1. **只读 5 件套**，不读其它（无历史 product-review、无 git、无 knowledge-base、无 source code、无其它 build）
2. **只写自己的 review JSON**，不改任何 build 文件
3. **不跑 npm script / validator**（review ≠ lint）
4. **必须为每个 blocker 引用具体证据**（keyframe 文件名 + 时间戳）
5. **必须 ≥ 3 个 blocker**，否则视为 derelict，orchestrator 重派一次 + prompt 加"you missed obvious issues"
6. **必须 confidence 自评**（high / medium / low）
7. **不参考另一个 reviewer 的输出**（盲审）

---

## 6 · Jury 五步裁决

1. **公平性检查** — 两 reviewer 的 input pack 是否一致；不一致 → `fairness: unequal-inputs`，停
2. **divergence 等级** — 11 维分差 ≤ 1.0 = low，≤ 2.0 = medium，> 2.0 = high（high 是好事，证明独立性发挥作用）
3. **合并 blockers** — 同根因 → `agreedBy: ["claude", "codex"]`；只 1 方 → 单 reviewer 标签，severity **不下调**
4. **决议** — decision 取**两个 reviewer 中更差**的（默认悲观）；犹豫两档 → 选差的
5. **Reviewer fitness 审计** — 任一 reviewer 出现 < 3 blocker / 低质量 blocker / 评分与 blocker 自相矛盾 / 高自信但 rationale 闪烁 → 整体决定降一档 + `reviewerFitnessAction: "re-spawn-recommended"`

Jury **不读 mp4/keyframes/brief**，只读两份 review JSON + input-pack。这样 Jury 没机会"替 reviewer 圆场"。

---

## 7 · 文件清单

```
.claude/skills/
  video-review/SKILL.md           # orchestrator（主线一键编排）
  video-review-claude/SKILL.md    # Claude reviewer 子 agent 行为契约
  video-review-jury/SKILL.md      # Jury 子 agent 裁决契约

tools/recognition-video/codex-skill/
  starlight-video-reviewer/SKILL.md  # Codex reviewer 行为契约

tools/recognition-video/reviewers/
  reviewer-input-pack.md          # 5 件套输入包契约
  reviewer-output.schema.json     # reviewer 输出 JSON Schema
  runs/<ts>-<build>/              # 每次 review 的 run dir（运行时生成）
    input-pack.json
    claude-review.json
    codex-review.json
    jury-decision.json
    codex-stdout.log
```

---

## 8 · 触发方式

主线 Claude 在 Claude Code 里：

```
/video-review yi-v8
```

或自然语言："审一下 yi-v8 / review build yi-v8 / double-blind yi-v8"。

orchestrator skill 触发后主线：

1. 预检 5 件套
2. 写 `input-pack.json`
3. **同一条 message 里并行** spawn Claude reviewer + Bash codex exec
4. 等两边落盘
5. fitness 检查：< 3 blocker → 重派一次
6. spawn Jury
7. 汇报：两边 overall + top blocker + Jury verdict + divergence + next actions

每次 review 约 $1，3-5 分钟。

---

## 9 · 关键技术决策

### 9.1 Codex 沙盒选 `workspace-write` 不是 read-only

Codex 必须写 `codex-review.json`。如果用 read-only，需要让 Codex 把输出打到 stdout，主线接管写——多一层管道，多一层 prompt 漂移风险。

折中：`workspace-write` 沙盒 + prompt 硬约束"只 Write codex-review.json"。这是软约束，依赖 prompt + 输出 schema 验证兜底（主线 fitness 步骤会拒绝写错路径的输出）。

### 9.2 Jury 不读 build 文件

诱惑很大：让 Jury 看一眼 mp4 "验证 reviewer 说的对不对"。**故意不允许**。一旦 Jury 能看原物，就会用自己的审美校准两份 review，自我偏见污染回流。Jury 的价值在于"基于结构化 review 做裁决"而不是"重审"。

### 9.3 默认悲观打分

worse-of-two 而不是 average。因为这个工具诞生的全部原因就是"我们一向太宽容"。两个 reviewer 同意时再用 average，否则取低。

### 9.4 强制 3-blocker floor

零 blocker 在 non-shipped build 上是不合理的——任何视频都有改进空间。零 = reviewer 没干活，必须重派。3 是经验数：足够暴露问题，又不至于强行制造噪声。

### 9.5 没用 Anthropic 官方 PR review 系统

官方 review 服务（2026-04 推出）面向代码 PR，托管制 $15-25/PR。我们的场景是视频/产品 review，需要：

- 自定义 11 维评分
- 关键帧图像输入
- 自定义 blocker 结构
- 自定义 fitness 审计

自托管 SKILL.md + Agent tool + codex exec 的方案 $1/run，可控可改，更贴合。

---

## 10 · 历史教训锚点

本框架直接源自以下三起事故：

| 事故 | 单模型 self-review 漏掉的事 |
|---|---|
| **yi-v6**（2026-05-21） | dual-render bug 把"一"画成"二"，validator 通过我放官方。memory: `feedback_validator_pass_not_product_pass` |
| **yi-v5-cinematic**（2026-05-19） | 评 9.12 ready-for-official，末帧两横笔幽灵 + 旁白无锚定。后用三子线化框架反向挡下 |
| **yi-v8.2**（2026-05-22） | 5 个 validator 全 ✅，但帧级别即可观察到"字 t8.5 写完、笔 t10.3 才出现"，且整段无写字动画 |

**双盲框架的承诺**：上述三类问题，独立 Codex 视角应能在 blocker 层抓住至少 timing-window 类（v8.2 那种）和 spec-vs-keyframe 矛盾类（v6 那种）；独立 Claude 视角应能抓住 narrative-coherence / 儿童感失败类（v5 那种叙事桥）。

---

## 11 · 已知局限

- **依赖 codex CLI 在本机可用**（codex-cli 0.130.0+ 已测）。无 codex 环境的 session 退化为单 Claude fresh-session review，价值显著下降。
- **图像理解依赖关键帧抽取质量**：reviewer 不直接 decode mp4，只看 PNG 关键帧。若关键帧覆盖不足（< 4 帧或不覆盖叙事各段），reviewer 可能漏掉中段问题。orchestrator 预检会做基本覆盖检查，但不保证语义覆盖。
- **不替代用户人眼最终验收**：reviewer 都过了不等于产品可发。最终发布前用户自己看 mp4 仍然是必须的（memory: `feedback_validator_pass_not_product_pass` 的逻辑延伸）。
- **不替代视频生产流水线 validator**：双盲 review 是产品质量门，不是工程合规门。`validate-*.mjs` 仍然要先全过才允许进入 review 阶段。

---

## 12 · 相关文档

- [[HyperFrames多帧动画Agent流水线方案]] —— 流水线技术总览，本 review 框架是其产品质量门
- [[2026-05-23-双盲视频Review框架落地]] —— 立项与落地研发日志（含 v8 翻车第一性原理诊断）
- `tools/recognition-video/schemas/product-review.schema.json` —— Jury 输出的最终结构来源
- `tools/recognition-video/reviewers/reviewer-input-pack.md` —— 输入包契约（reviewer & orchestrator 共读）
- `tools/recognition-video/reviewers/reviewer-output.schema.json` —— reviewer 输出 schema
- memory: `feedback_validator_pass_not_product_pass`
- memory: `feedback_first_principle_on_craft_issue`
