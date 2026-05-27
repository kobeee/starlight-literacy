# 2026-05-20 · HyperFrames 三子线化重构

## 背景

v5 cinematic 一字视频在 product-review 评分 9.12、决策 ready-for-official，但回看末帧时用户发现两个隐藏 bug：

1. **末帧出现两条横笔**：cinematic body 里的 ink-glyph 渗墨层在笔顺尾段开始时没被清除，导致写字态横笔下面还压着识字态的横笔残影。
2. **旁白没有重复 + 没有具象锚定**：脚本"天亮了。山那边升起一道光。就是「一」。"中目标字"一"只出现 2 次，且"一道光"是量词不是数词。3-6 岁孩子无法在如此短的认知窗口里建立"一 = 一个具体的东西"的映射。

两个 bug 都不是 cinematic 本身的问题，而是**生成框架**的问题：旁白文本设计、笔顺尾段 DOM 状态 这两件事在原 8 阶段流水线里没有独立节点，散落在 brief.narration / composition HTML 内，没有专属 schema / validator / 末段 product 复查，所以 9.12 高分掩盖了两个内容性硬伤。

## 决策：主线 + 三子线

参考 sprite 子线（已经独立）的成功经验，把流水线重构为 **1 条主线 + 3 条独立子线**。任务能不能独立的判据**不是内容明确，而是输入/输出/成功标准明确**。

| 线 | 角色 | 输入 | 输出 | 成功标准 |
|---|---|---|---|---|
| 主线 | 编排、装配、打包 | 子线产物 + brief | mp4/webm + product-review + H5 wiring | 通过 product gate + H5 guardrails |
| **子线 A · Narration** | 旁白文本 + TTS | narration-spec.json | narration.mp3 + .vtt + .measured-timings.json | 重复≥3、具象锚定、量词分离、edge-tts 跑通 |
| 子线 B · Sprite | 多帧精灵 | 提示词 + 风格 | manifest.json + 帧 PNG + review-sheet | pose contract + alpha/crop/identity 校验 |
| **子线 C · Stroke-Order Tail** | 米字格写字尾段 | tail-spec.json + mizige-anchors.json | tail.html + final-frame.png + dom-probe.json | DOM 探针通过 + 末帧只剩目标字 + 手势就位 |

主线的 brief 现在只声明引用 `narrationSpecRef` / `tailSpecRef`，不再内嵌旁白文本和笔顺尾段细节。

## 落地物（本次新增）

### 子线 A · Narration Production

- [tools/recognition-video/schemas/narration-spec.schema.json](../../tools/recognition-video/schemas/narration-spec.schema.json) — 旁白文本结构契约
- [tools/recognition-video/scripts/validate-narration-spec.mjs](../../tools/recognition-video/scripts/validate-narration-spec.mjs) — 设计期校验
- [tools/recognition-video/scripts/bake-narration.mjs](../../tools/recognition-video/scripts/bake-narration.mjs) — 独立 TTS 烘焙脚本
- [tools/recognition-video/scripts/validate-narration-bake.mjs](../../tools/recognition-video/scripts/validate-narration-bake.mjs) — 烘焙产物收口

**核心约束（process）：**

- 目标字在脚本中至少出现 3 次（`MIN_TARGET_CHAR_COUNT = 3`）
- 必须存在 `concreteAnchorPhrase`，把目标字绑到具体名词（如"一根木棒"、"一只小船"）
- 必须有 `role = concrete-anchor` 的段落
- 必须有 `role = glyph-naming` 的段落（明确读出"念 一"）
- `targetCharSemantic = number` 时，任何量词用法（一道/一束/一只…）都必须 `boundToVisualCount = true` 并指明 `visualReference`，否则孩子学到的是量词不是数词
- voice rate 限定 -15%..0%
- 段落字数硬上限 12（3-6 岁断句容量）
- bake 产物必须有非静默音频 + 时长匹配 apad + 每段都有 audioStart/audioEnd

### 子线 C · Stroke-Order Tail Production

- [tools/recognition-video/anchors/mizige-anchors.json](../../tools/recognition-video/anchors/mizige-anchors.json) — 系统级米字格锚点表（位置/尺寸/字色/手入画方向/光照/清层契约/DOM 探针）
- [tools/recognition-video/schemas/tail-spec.schema.json](../../tools/recognition-video/schemas/tail-spec.schema.json) — 单字尾段契约
- [tools/recognition-video/scripts/validate-tail-spec.mjs](../../tools/recognition-video/scripts/validate-tail-spec.mjs) — 设计期校验
- [tools/recognition-video/scripts/render-stroke-order-tail.mjs](../../tools/recognition-video/scripts/render-stroke-order-tail.mjs) — 独立 tail HTML 生成 + headless 末帧 + DOM 探针

**核心约束（process）：**

- 任何字的笔顺尾段必须引用同一份 mizige-anchors.json，米字格在画布上的位置/尺寸/字色对所有字相同 — 换字不漂
- `container.policy` 必须是 `single-mizige-dual-state`，禁止两个格子或两次格子切换
- `transition.clearLayerIds` 必须包含 anchors.clearingContract 里所有 mustClear 项（`ink-glyph-bleed-layer`、`light-band-layer`、`phrase-bridge-layer`） — 这是 v5 末帧两横笔 bug 的根因
- `finalFrame.handPosePresent = true` + `mizigeStateAtEnd = "writing"` — P03 海报锁死的画面
- 必须输出 DOM probe JSON：headless chrome 抓末帧时验证 `[data-tail-state="writing"]` 在位，禁止选择器（如未被标记 removed 的 ink-glyph 层）不出现 — 截图肉眼复查抓不到的 bug 这里抓得到

### 主线接入

- [tools/recognition-video/schemas/brief.schema.json](../../tools/recognition-video/schemas/brief.schema.json) 新增 `narrationSpecRef` / `tailSpecRef` 顶层字段
- [tools/recognition-video/schemas/product-review.schema.json](../../tools/recognition-video/schemas/product-review.schema.json) scores 新增 **`teachingFunctionalIntegrity`** 维度（兜底网，专门接住子线没接入或子线漏报的内容缺陷）
- [tools/recognition-video/scripts/validate-product-video-gate.mjs](../../tools/recognition-video/scripts/validate-product-video-gate.mjs) 把新维度纳入 `--official` 闸口，阈值 **≥ 9**，比其它维度都高，因为它就是为了让"cinematic 8+ 但教学功能性<9"的情况无法升 official

### 文档

- [tools/recognition-video/AGENTS.md](../../tools/recognition-video/AGENTS.md) 新增"Pipeline Architecture: Main Line + Three Independent Sub-Lines"段落，stage gates 由 11 步细化为 15 步，新增 sub-line A / sub-line C 两组 hard stops
- [tools/recognition-video/codex-skill/starlight-video-agent/SKILL.md](../../tools/recognition-video/codex-skill/starlight-video-agent/SKILL.md) workflow 改写为子线-then-主线顺序，useful files 新增 8 个

## 反向验证：v5 as-shipped 被新校验器挡下

为证明框架不是空谈，本次按 v5 实际产出做了 as-shipped narration-spec 和 tail-spec，跑两个新验证器：

**narration-spec 验证器抓到的 v5 问题（一次 5 条）：**

```text
- target character "一" appears only 2 time(s); recognition narration must repeat it at least 3 times so children can anchor it.
- concreteAnchorPhrase is required: every recognition narration needs one functional sentence binding the target character to a concrete object.
- at least one segment must have role "concrete-anchor".
- target character is a number; quantifier use "一道" must be backed by a visible count of the noun (boundToVisualCount=true) — otherwise the child learns the measure word, not the number.
- quantifier use "一道" must name a visualReference (shotId/plate/sprite) showing the count.
```

**tail-spec 验证器抓到的 v5 问题（一次 2 条）：**

```text
- transition.clearLayerIds is missing "ink-glyph-bleed-layer" — anchors.clearingContract requires it. Failing this causes ghost-stroke bugs.
- transition.clearLayerIds is missing "light-band-layer" — anchors.clearingContract requires it. Failing this causes ghost-stroke bugs.
```

修复版 tail-spec（清层契约补齐）跑 render-stroke-order-tail.mjs --capture 全链路通过，DOM 探针 passed=true，末帧 PNG 170547 bytes（1280×720 米字格 + 单一横笔 + 手势占位 + 暖光环境），无幽灵笔画。

## 评估

- **两个 v5 隐藏 bug 都能在生成框架层（schema + validator）被自动挡下**。不依赖人眼复查截图、不依赖 product-review 分数 9.x。
- **system-level 锚点表 + per-char 子线 spec 的双层结构**保证换字时整张 P03 海报系列保持一致：每个字的米字格、字色、手入画、光照都一样，差异只发生在 strokeOrder 数据。这正是"流程约束 vs 内容设计"的换字测试：换得动是流程（进规范），换不动是内容（留单字日志）。
- **teachingFunctionalIntegrity 是兜底**：如果子线 A/C 还没接入或漏报，product-review 里这个维度评分会强制 < 9，挡住 official 升级。
- 这次重构的本质不是改 8 阶段为 11 阶段，而是把"独立性的判据从内容明确改成 input/output/success criteria 明确"。Sprite 子线早就是这个模式，本次把 narration 和 tail 也升级到同一形态，三条子线现在都能各自单独跑、单独验、单独修。

## 历史 product-review 回填（同日完成）

按"真实标准评、不为通过验证而虚标"的原则，给 9 份历史 product-review 回填了 teachingFunctionalIntegrity 维度。打分依据 schema description：旁白重复目标字 ≥3 次 + concrete-anchor + 末帧米字格 writing 状态干净（无 ghost stroke）。

| 文件 | 分 | 关键依据 |
|---|---|---|
| yi-hongen-agent-v2 | 5.5 | 苹果/木棒 anchor 弱，无米字格 stroke-order tail |
| yi-fresh-horizon-agent-v3 | 6.0 | narration 合规、一只纸船 anchor，但无 mizige tail |
| yi-fresh-horizon-sync-v4 | 6.0 | 同 v3，audio-sync 改善但 tail 仍缺 |
| **yi-gpt-image-2-production-v3** | 9.0 | 全维度满足；扣 0.1 因田字格→米字格双格切换轻微冗余 |
| **yi-gpt-image-2-production-v4** | 9.2 | 单米字格双态，最干净 |
| yi-official-sunrise-v1 | 6.5 | narration 合规但 code-native overlay 无 mizige tail |
| yi-one-light-path-official-v2 | 6.5 | 同 sunrise-v1 |
| yi-sunrise-line-v1 | 6.0 | 程序绘制占位 + 无 tail |
| **yi-v5-cinematic** | 5.5 | 「一」仅 2 次 + 「一道光」量词无视觉锚定 + 末帧 ghost stroke（本次重构的 trigger） |

每份回填前都核算 overall 与新 11 维平均的容差（gate 要求 ≤0.35），全部通过——不改 overallScore 也不改 decision，保留历史评审记录的可追溯性。

回填后 `npm run video:check-product-gate`（smoke 跑 yi-hongen-agent-v2）**重新转绿** ✓。

全量扫 9 份发现两类副产物：

1. **预期失败 2 份**：yi-official-sunrise-v1 和 yi-v5-cinematic 都是 `decision: "ready-for-official"`，但 teachingFunctionalIntegrity 分别 6.5 / 5.5 < 9，新 gate 在 `--official` 隐式触发的阈值检查里挡下。这**正是新框架生效的证据**——历史按旧框架放行的 official 在新框架下不达标。不回改 decision，让这两份作为审计样本留存。
2. **预存数据质量问题 10 处**（顺手修，与本次回填无关）：v5-cinematic 9 处 `readability: "high"` 应为 enum `pass/partial/fail` → 全改 pass；one-light-path-official-v2 `candidateStatus: "rendered-needs-iteration"`（把 decision 值填到 candidateStatus 字段）→ 改 `official-candidate`。

## 后续

- 重新生产 v5 → v6：用新框架做一字 narration-spec + tail-spec，bake + render 全跑通后再走主线，看 cinematic 9.12 是不是依然能保住，并且 teachingFunctionalIntegrity 拿到 ≥ 9。
- 二/三/十 这几个数字字预计是子线 A 的最大压力测试：作为 number 类目标字，量词 vs 数词的区分是日常表达的灰区，新规会强制每次都做 `boundToVisualCount` 决策。
