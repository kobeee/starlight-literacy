---
title: Starlight 双盲 reviewer 输入包契约
created: 2026-05-23
tags: [recognition-video, review, double-blind, orchestration]
---

# Reviewer Input Pack（5 件套）

> 主线 orchestrator 在 spawn 任一 reviewer（Claude / Codex / Jury）前，**必须**先按本文件准备输入包。Reviewer 只看输入包，不看其它任何文件。

---

## 1 · 5 件套清单

每次 review **一个 build**（如 `yi-v8`），输入包固定包含以下五项：

| 项 | 类型 | 路径模板 | 说明 |
|---|---|---|---|
| brief | JSON | `tools/recognition-video/briefs/<build>.brief.json` | 教学契约、shot list、duration、teachingContract |
| audio-plan | JSON | `tools/recognition-video/audio-plans/<build>.audio-plan.json` | 旁白脚本 + cue 时间窗 |
| tail-spec | JSON | `tools/recognition-video/tail-specs/<build>.tail-spec.json` | 笔顺尾段规格 + anchors 引用 |
| video | MP4 | `tools/recognition-video/builds/<build>/renders/<build>.mp4` | 渲染产物本体（仅作存在性证据，reviewer 不直接 decode） |
| keyframes | PNG[] | `tools/recognition-video/builds/<build>/snapshots/frame-*-at-*.png` | 至少 4 张关键帧 PNG，按时间戳排序 |

可选第六项（强烈建议带上）：

| 项 | 类型 | 路径模板 | 说明 |
|---|---|---|---|
| narration-spec | JSON | `tools/recognition-video/narration-specs/<build>.narration-spec.json` | 旁白宪法约束（concrete anchor / 重复次数） |
| review-sheet | PNG | `tools/recognition-video/builds/<build>/renders/final-frames/<build>-review-sheet.png` | 全帧拼图，便于一眼看叙事节奏 |

## 2 · 主线 orchestrator 的预检（必须）

在 spawn reviewer 之前，主线**逐项**确认：

```bash
# 1. 五件套全部存在
test -f tools/recognition-video/briefs/<build>.brief.json
test -f tools/recognition-video/audio-plans/<build>.audio-plan.json
test -f tools/recognition-video/tail-specs/<build>.tail-spec.json
test -f tools/recognition-video/builds/<build>/renders/<build>.mp4
ls tools/recognition-video/builds/<build>/snapshots/frame-*.png | wc -l  # ≥ 4

# 2. 关键帧时间戳分布合理（覆盖叙事各段）
ls tools/recognition-video/builds/<build>/snapshots/frame-*.png
# 应至少覆盖：开场（0-1s）/ 中段（视频时长 1/2 处）/ 末段（≥ duration - 1s）
```

预检任何一项失败 → orchestrator **不 spawn reviewer**，直接报错给用户。**禁止**在缺件的情况下让 reviewer "尽力而为"。

## 3 · Reviewer 行为约束（写进每个 reviewer SKILL.md 的硬规则）

1. **只看 5 件套**，不读项目内其它文件（不读历史 product-review.json、不读其它字的 brief、不读知识库日志）
2. **不写入任何文件**（除了自己的 reviewer-output.json）
3. **不调任何 npm script / validator**（review 不是 lint）
4. **必须为每个 blocker 引用具体证据**：keyframe 文件名 + 时间戳
5. **必须给出至少 3 个 blocker**，否则视为 derelict（orchestrator 会重派）
6. **必须填写 confidence**：自评 high/medium/low
7. **不参考另一个 reviewer 的输出**（盲审）

## 4 · Reviewer 输出约束

按 `reviewer-output.schema.json` 写到：

```
tools/recognition-video/reviewers/runs/<timestamp>-<build>/
  claude-review.json
  codex-review.json
  jury-decision.json    # 由 jury skill 写入
  input-pack.json        # 由 orchestrator 写入，记录本次实际输入路径
```

`<timestamp>` 形如 `2026-05-23T1030`（精度到分钟，UUID 在该粒度内冲突极低）。

## 5 · 主线 orchestrator 写入 input-pack.json

每次开 review 前主线先把 5 件套绝对路径落到 `input-pack.json`，让两个 reviewer 显式读到同一份清单：

```json
{
  "schemaVersion": "starlight-double-blind-review/v1",
  "characterId": "yi",
  "buildId": "yi-v8",
  "spawnedAt": "2026-05-23T10:30:00Z",
  "inputs": {
    "brief": "/abs/path/.../yi-v8.brief.json",
    "audioPlan": "/abs/path/.../yi-v8.audio-plan.json",
    "tailSpec": "/abs/path/.../yi-v8.tail-spec.json",
    "narrationSpec": "/abs/path/.../yi-v8.narration-spec.json",
    "video": "/abs/path/.../yi-v8.mp4",
    "reviewSheet": "/abs/path/.../yi-v8-review-sheet.png",
    "keyframes": [
      "/abs/path/.../frame-00-at-0.5s.png",
      "/abs/path/.../frame-01-at-2.5s.png",
      "..."
    ]
  }
}
```

## 6 · 反偷工保险

- Reviewer 输出 < 3 blocker → orchestrator **重派一次**，prompt 加 "you missed obvious issues, look again"
- 两个 reviewer 都打 ≥ 9.0 但视频是 needs-revision/blocked 状态 → orchestrator **必须**让 Jury 标记 `reviewer-fitness: questionable`，并把这次 review 列入审计样本
- 两个 reviewer 的 overallScore 差 ≥ 2.0 → Jury **必须**进入"深审"，逐 blocker 比对（这是好事，说明独立性发挥作用）

## 7 · 历史教训锚点

本契约直接源自以下教训：

- `memory:feedback_validator_pass_not_product_pass` — yi-v6 案例：dual-render 把"一"画成"二"我却放官方
- `2026-05-22 yi-v8.2` — 5 个 validator 全 ✅ 但视频"没动画 / 镜头突兀 / 手+笔事后摆设"
- `2026-05-19 yi-v5 cinematic` — 评 9.12 ready-for-official 但末帧两横笔幽灵 + 旁白无锚定

**reviewer 必须对得起这些事故**：自动化 validator 没挡住的，靠模型独立性 + 强制 blocker floor 挡。
