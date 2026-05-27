---
tags: [开发日志, HyperFrames, Agent, schema, validator, 笔顺, 米字格, 流程约束, AGENTS, SKILL]
created: 2026-05-18
updated: 2026-05-18
---

# 2026-05-18 · HyperFrames Agent 流程约束沉淀（笔顺尾段进规范）

## 任务定义

承接同日 [一字 v4 正式版生产](2026-05-18-一字gpt-image-2-production-v4正式版生产.md)。v4 落地后用户提出：

> "看看 HyperFrames Agent 的内容如何更新一下，注意，不涉及到具体内容设计的（如太阳怎么画），就是流程约束上的。比如新增的米字格，动画视频的最后要求按照正确的笔画在米字格完成汉字。"

之前 v37/v3 的三轮迭代和 v4 重构跑出来的"末段必须有米字格 + 笔顺示范"已经是事实标准，但只活在单字开发日志里——schema 没卡、validator 没查、AGENTS / SKILL 文档没写。任何后续字（二、三、人 ...）走流水线时，没东西强制它做笔顺尾段；早晚有人会跳过这一步出"裸 spoken body"视频。

**目标**：把"末段笔顺示范"从经验规则升级为 schema/validator/文档三层硬约束，且严格区分"流程约束"与"内容设计"——前者进规范，后者不进。

## 落地清单

### 机器卡口（3 处）

| 文件 | 改动 |
|---|---|
| `tools/recognition-video/schemas/brief.schema.json` | (1) `duration.maximum` 8 → **12**（spoken body ≤ 8s + silent tail ≤ 4s）；(2) `teachingContract.required` 新增 **`strokeOrderTail`**（含 shotId / startSeconds / minSeconds≥1.5 / container=`mizige` / containerStatePolicy=`single-mizige-dual-state` / narrationPolicy=`silent` / writingDirection 三选一 / description） |
| `tools/recognition-video/scripts/validate-teaching-harness.mjs` | (1) duration 上限同步 8 → 12；(2) 新增 `validateStrokeOrderTail`：tail shot 必须存在 + startSeconds 与 shot.start 一致 + tail.duration ≥ minSeconds + tail 必须排在 phraseBridge 之后 + tail 不超 brief.duration + **任何 narration cue 不许落在 tail 窗口内**（保证 silent 不只是字面） |
| `tools/recognition-video/scripts/validate-audio-sync-plan.mjs` | 改写 target/padded 对齐逻辑：有 `paddedTotalDurationSeconds` 时让 padded 对齐 `brief.duration`（误差 0.1s）+ 要求 target ≤ brief.duration；没有 padded 时保留旧规则 target ≈ brief.duration。**不带尾段的字向后兼容，带尾段的字也不放水**。 |

### v4 brief 回填

`tools/recognition-video/briefs/yi-gpt-image-2-production-v4.brief.json`：

- `duration` 7.4 → **10**（原本 brief 把 spoken body 当总长，与 audio-plan 的 paddedTotalDurationSeconds 不自洽）
- shotPlan 末尾补 `stroke-order-tail` 镜头（start 7.4, duration 2.6）
- teachingContract 加 `strokeOrderTail` 块（shotId=stroke-order-tail / startSeconds=7.4 / minSeconds=2.5 / 单格双状态 / silent / left-to-right）

### 文档约束（3 处）

| 文件 | 改动 |
|---|---|
| `tools/recognition-video/AGENTS.md` | (1) Stage Gate 4 加"`strokeOrderTail` 必须存在且校验"；Stage Gate 5 加"padded 对齐 brief.duration / silent tail cue 必须存在 / 必须 apad 不准剪视频"；Stage Gate 10 加"render 必须 `-f 24`"。(2) 新增 **Stroke-Order Tail Contract** 一节（米字格 / 单格双状态 / 排在 phraseBridge 之后 / 不许有 narration cue / 笔顺正确 / 末帧 = 写字态 poster）。(3) 新增 **H5 Wiring Contract** 一节（命名禁用 v3/legacy/sample / 24fps drift ≤0.15s / audio drift ≤0.35s / `bump-h5-version.mjs` 一次性同步 4 处 / IMAGE_SHELL+RECOGNITION_SHELL 同步更新 / official 不许 voiceCues）。(4) 新增 **HyperFrames Runtime Notes** 一节（MiniTimeline shim 7.4s 硬编码 + apad 不剪视频）。(5) Hard Stops 加 3 条尾段相关红线 + 时长上限改 12s。 |
| `tools/recognition-video/codex-skill/starlight-video-agent/SKILL.md` | Hard Rules 加 8 条同步约束 |
| `AGENTS.md`（仓库根） | 加一段指向新约束 |

### 知识库

`knowledge-base/05-技术文档/HyperFrames多帧动画Agent流水线方案.md` 末尾追加 **2026-05-18 流程约束沉淀（笔顺尾段进规范）** 节：6 个小节阐述 schema 改了什么 / validator 加了什么 / 文档加了什么 / 为什么这些是流程约束而不是内容设计 / 回归怎么过 / 后续每个新字必须做什么。

## 关键决策

### "流程约束 vs 内容设计"的判断方法

划这条边界是这次工作的**核心难点**。一开始很容易把"暖棕 #5D4A36 / mix-blend-mode:screen / chroma-key 残留中和"这种 v4 学到的招数都塞进 Agent 文档；但用户明确说**不要**。

最终用一条机械的判断：**这条规则换一个字（人/木/水/火）还成立吗？** 成立则是流程约束，不成立则是内容设计。

| 内容设计（不进文档） | 流程约束（进文档/schema） |
|---|---|
| 太阳 halo 用 sprite 还是 CSS 实心 disk | 视频末段必须有米字格 + 笔顺示范 |
| 光带是暖金还是暖棕 | 米字格只用一格双状态，不准两套并列 |
| 楷体用 LXGW 还是其他开源字体 | 笔顺示范段必须静默无旁白 |
| 米字格虚线 stroke-dasharray 数值 | 笔顺方向必须 canonical（横左→右、竖上→下） |

最后筛出 8 条流程约束，分到 schema(2) + validator(2) + 文档(8 条 Hard Rules) 三层。

### 为什么 schema 只卡 1 条而不是全部

最初想过把"24fps / `/v3|legacy|sample/`命名 / 版本 bump / voiceCues 互斥"也全做成 schema 或 validator。否决了，因为：

- guardrail 已经在 H5 侧卡了 24fps、命名、版本、voiceCues 这 4 条。再在 brief schema 卡一遍是重复。
- shim 时长坑（7.4s 硬编码）是 HyperFrames build 内部的事，brief 不该知道这件事。
- apad 不剪视频是 audio 工具链选择，不该由 brief 来约束。

最后只把"必须有 strokeOrderTail"这一条上 schema——因为它是**brief 必须先承诺的事**，guardrail 在 H5 侧才发现 brief 没承诺就晚了。其他 7 条都留在文档+guardrail 双卡。

### audio-plan validator 的"双时长对齐"

原来约束 `targetDurationSeconds === brief.duration`（误差 0.1s）。把 v4 brief.duration 改成 10 后这条直接挂了——因为 target 是 spoken body 7.4s，padded 才是 10s。

简单粗暴的方案是把约束放成 ≤ 0.35s 容差，但这会让其他不带尾段的字也松绑。**正确的写法是分流**：

- 没有 padded 字段：target 对 brief.duration（旧规则）
- 有 padded 字段：padded 对 brief.duration + target ≤ brief.duration（新规则）

两条路都不放水。

## 回归

```
$ node tools/recognition-video/scripts/validate-teaching-harness.mjs \
    .../yi-gpt-image-2-production-v4.brief.json \
    .../yi-gpt-image-2-production-v4.asset-plan.json
Recognition teaching harness ok: 1 pair(s).

$ node tools/recognition-video/scripts/validate-audio-sync-plan.mjs \
    .../yi-gpt-image-2-production-v4.brief.json \
    .../yi-gpt-image-2-production-v4.asset-plan.json \
    .../yi-gpt-image-2-production-v4.audio-plan.json
Recognition audio sync plan ok: 1 triplet(s).

$ node tools/recognition-video/scripts/validate-sprite-assets.mjs \
    .../sprites/sun/glow-breathe/manifest.json
Recognition sprite validation ok: 1 manifest.

$ node tools/recognition-video/scripts/validate-product-video-gate.mjs --official \
    .../yi-gpt-image-2-production-v4.product-review.json
Starlight product video gate ok: 1 review(s).

$ npm run check:h5
... v38 resources, legacy gate, visual audit hook, official video policy.
Mobile H5 version ok: all markers at v38.
```

**反向验证**：旧 v3 brief 跑 teaching-harness：

```
- yi-gpt-image-2-production-v3: teachingContract.strokeOrderTail is required:
  every recognition video must end with a stroke-order demo inside a mizige.
```

按预期挡下。v3 已被 v4 取代不需回填，新约束把它从"可入 official"路径上自然剔除。

## 不做项

- **没改** `validate-product-video-gate.mjs`：本来想强制 product-review 的 `actionReadability` 必须含 "mizige state transition" 与 "stroke-write" 两条。否决——这两条名字和 v4 强相关，强制要求会绑死命名风格；teaching-harness 已在 brief 侧卡了 strokeOrderTail，product-review 自由描述即可。
- **没改** `sprite-manifest.schema.json`：笔顺示范不依赖 sprite，全是 HTML/CSS + clip-path，sprite 这条线没必要动。
- **没回填** v3 brief：v3 已被 v4 替代且 H5 侧不再引用，新规则按预期挡它，符合"已废弃的字不需要回填新约束"的语义。

## 后续每个新字必须做的事

下一个字（如 二 / 三 / 人）走流水线时，自动需要满足：

1. **brief**：`teachingContract.strokeOrderTail` 必填；shotPlan 末尾必有一个 stroke-order-tail 镜头排在 phraseBridge 之后。
2. **audio-plan**：末尾必有一个 `narration: "silent"` cue 覆盖整个 tail 窗口；如果视频比 spoken body 长就用 `paddedTotalDurationSeconds` + ffmpeg apad。
3. **HyperFrames composition**：根容器写 `data-composition-id` + `data-duration`；render 用 `-f 24`。
4. **米字格**：单格双状态（识字态↔写字态），CSS 变量驱动，不准两套格子并列。
5. **笔顺**：多笔画字必须按 canonical 顺序逐笔揭开（横左→右、竖上→下、撇右上→左下、捺左上→右下）；单笔画字才允许 clip-path inset 一次揭完。
6. **H5 接入**：命名 `-vN` 或日期戳，禁用 `/v3|legacy|sample/i`；用 `bump-h5-version.mjs` 一次同步 4 处版本号。

这 6 条在 v4 之前**全部靠人记**，从今天起 schema/validator/文档三层接管。

## 沉淀（4 条）

1. **流程约束 vs 内容设计的边界靠"换字测试"判断**：规则换个字还成立才是流程约束。这次砍掉一半候选规则全靠这条。
2. **schema 只卡"brief 必须先承诺的事"**：能在下游 guardrail 卡的（24fps/版本号/命名）就别在 brief schema 卡两遍。schema 越窄越稳定。
3. **validator 升级时分流而不是放容差**：audio-plan 双时长对齐用"有 padded 走新规则、没 padded 走旧规则"分流，而不是统一放宽到 0.35s 容差。两条路都严，不互相污染。
4. **新约束上线时反向验证才算闭环**：v3 brief 被新约束按预期挡下这件事，比 v4 通过更重要——证明约束确实在挡事。
