---
tags: [开发日志, HyperFrames, schema, validator, framework]
created: 2026-05-23
updated: 2026-05-23
---

# 2026-05-23 HyperFrames 框架四洞修复

## 背景：双盲框架打穿了，但单靠 review 拦不住下一次

[[2026-05-23-双盲框架yi-v8烟测与SKILL修复]] 跑出 jury-decision.json：**overall 4.7 / blocked / 8 merged blockers**。这 8 条 blocker 全部是 v8 在 brief / tail-spec / audio-plan 单文件校验全过的情况下成功"偷渡"的：

| jury blockers | 漏过的层 |
|---|---|
| brush-pointer 出现在 upper-left（违反 brief 的 bottom-right 30° 锚点承诺） | brief 没有结构化字段表达"finalFrame guide object 在哪"，spec 之间无机器对照 |
| brush 进场方向与 brief 矛盾 | 同上 |
| 第一段 Ken Burns scale 1.0→1.04 / translateY -12px（孩子视口=完全没动） | brief 不要求声明运动幅度下限 |
| mountain→ray 硬切（无共享色 / 主体 / 过渡元素） | 镜头之间没有 continuity 契约 |
| body→tail handoff 把 kaiti 一字擦了再写一遍 | tail-spec.transition.clearLayerIds 没有"保留层"反向声明 |
| body mask reveal 没有可见笔尖 | brief 不强制声明 writing implement |
| final hold 2.0s 在 tail-spec 实际只能给 0.5s dwell | brief.pacingRequirements 与 tail-spec 时长之间无机器对照 |
| brief.finalFrame=child-hand vs tail-spec.finalFrame=brush-pointer | brief vs tail-spec 之间无 cross-file 一致性校验 |

**双盲 review 抓住了，但不应该靠 review 兜底**。Review 是慢、贵、对人的检查；schema/validator 是快、便宜、对机器的检查。能在 schema 挡的事就不该让 review 兜。

所以这次的任务是：**把这 8 条 blocker 折叠成 4 个"洞"，给每个洞配 schema + validator + 反向回归测试**。

---

## 4 个洞，4 个补丁

### Hole 1 · brief ↔ tail-spec ↔ anchors 之间没有 cross-file 一致性

**v8 怎么过的**：brief.finalFrame.description 是自由文本"child finger pointing at glyph right end +18px"，tail-spec.finalFrame.pointerForm 是另一个字段"brush-pointer"。两个文件单跑校验都过，但它们说的是两个东西。

**补法**：

1. `schemas/brief.schema.json` 的 `finalFrame` 升级：旧 `description` 留着但**新增结构化 guideObject**（form / anchor / entryDirection 三 enum），新增 `posterHoldSeconds`。结构化字段才能被机器跨文件对照。
2. `schemas/tail-spec.schema.json` 的 `finalFrame` 加 `pointerForm` 必填 enum `["child-hand", "brush-pointer"]`（v8 已用此字段但未进 schema，本次补声明）。
3. 新脚本 `scripts/validate-cross-file-consistency.mjs`：
   - 解析 `brief.tailSpecRef` / `brief.narrationSpecRef` / `tail-spec.anchorsRef`
   - 比较 `brief.finalFrame.guideObject.form` vs `tail-spec.finalFrame.pointerForm` → 不等就 error
   - 比较 `guideObject.form` vs `anchors.hand.allowedPointerForms` → 不在白名单就 error
   - 比较 `guideObject.entryDirection` vs `${anchors.hand.entryEdge}-${anchors.hand.entryAngleDeg}deg` → 字符串不等就 error
   - 比较 `brief.pacingRequirements.minimumFinalHoldSeconds` vs tail-spec phaseEnd + finalHold 实际能给的 dwell → 不够就 error
   - 比较 `brief.narration.script` vs `narration-spec.script`（normalize whitespace）→ 不等就 error
4. v5/v6/v7 tail-spec 全加 `"pointerForm": "child-hand"` 字段满足新 schema 必填。

### Hole 2 · "看不出动画"挡不下

**v8 怎么过的**：第一段镜头声明 ken-burns 但 scale 1.0→1.04 + translateY 0→-12px，在 1080×1920 child viewport 上孩子读不出动；mask reveal 没声明任何 writing implement，画面看到的是 wipe 不是写字。两条 brief 都没字段表达"运动幅度多少"和"是否有可见笔具"。

**补法**：

1. `schemas/brief.schema.json` 的 `animationRequirements` 加两个数组：
   - `shotMotion[]`：每个非 tail shot 声明 `animationDriver`（ken-burns / sprite-only / css-mask-reveal / gsap-transform / static-with-overlay）+ `effectiveScaleDeltaPercent` + `effectiveTranslatePx` + `diegeticOverlayId` + `rationale`
   - `writingImplements[]`：声明 `implementForm`（ink-front-bloom / brush-tip-sprite / pen-nib-sprite / child-finger-sprite）+ `tracksMaskFront: true`（const）
2. 新脚本 `scripts/validate-motion-readability.mjs`：
   - 硬阈值：MIN_KEN_BURNS_SCALE_DELTA_PERCENT=5, MIN_KEN_BURNS_TRANSLATE_PX=24, MIN_GSAP_*=5/24
   - 不达标且无 diegeticOverlayId → error "孩子在孩子视口会读成 still photograph (v8 blocker root cause)"
   - shot 描述命中 `渗墨 / writing / stroke / 笔顺 / 横笔 / mask reveal / ink-glyph / glyph-write` 任意关键词，必须有对应 writingImplements 条目 + tracksMaskFront=true，否则 error

### Hole 3 · tail-spec 把"持久字层"清掉

**v8 怎么过的**：tail-spec.transition.clearLayerIds 列了 `persistent-kaiti-glyph-layer` 一类层；body 写好的"一"在 10.0s 被擦掉，10.3s 米字格空了，tail 又重新写一遍。儿童视角 = appear → vanish → rewrite。schema 只校验"该清的层有没清"，没有"绝对不能清的层"声明位。

**补法**：

1. `schemas/tail-spec.schema.json` 的 `transition` 加 `protectedLayerIds[]`
2. `scripts/validate-tail-spec.mjs` 在 `validateTransition` 里加 overlap 检查：`clearLayerIds ∩ protectedLayerIds` 非空 → error "persistent kaiti glyph must NOT be cleared at body→tail handoff (root cause of v8 appear→vanish→rewrite)"

### Hole 4 · 相邻 plate 没有 continuity 契约

**v8 怎么过的**：山景 plate（蓝灰暖光，山+鸟）→ 橙光带 plate（一块橙红色 + 一条横线）。两 plate 不共享主体、不共享色相、没有过渡元素，硬切。儿童认知里就是"换了一个世界"。brief.shotPlan 没字段表达"这段跟上段哪里挂上钩"。

**补法**：

1. `schemas/brief.schema.json` 的 `shotPlan[]` 项加 `continuityWithPrev`：`sharedSubjectIds[]` / `sharedPaletteHueRange{hueDegMin, hueDegMax}` / `transitionalElementId` / `transitionType`（cross-dissolve / overlap-fade / shared-element-traverse / hard-cut）
2. 新脚本 `scripts/validate-plate-continuity.mjs`：
   - 每对相邻 shot 至少声明一项 continuity 维度（subject / palette / transitional）
   - 没声明 → warning（`--strict` 模式下 → error）
   - 声明了 sharedPaletteHueRange，相邻两段中点色相距离超 30° → warning（儿童视觉舒适区）
   - 允许的例外：`transitionType: "hard-cut"` + 必须同时有 sharedSubjectIds（hard cut 但同一对象）

**为什么是 warning 不是 error**：v5 brief 还没声明 continuityWithPrev，立刻 error 会让 v5 自己挂掉。先 warning 让现有 brief 浮出问题，新字 brief（v9 / 二 / 三）必须 `--strict` 跑。

---

## 反向回归测试：8 个 blocker 各跑一次，看新框架挡不挡得住

新增两个 regression fixture：

- `tools/recognition-video/briefs/regression/yi-v8-form-mismatch.brief.json` — 故意把 `brief.finalFrame.guideObject.form="child-hand"` 配上 tail-spec `pointerForm="brush-pointer"`
- `tools/recognition-video/tail-specs/regression/yi-v8-protected-overlap.tail-spec.json` — 故意把 `persistent-kaiti-glyph-layer` 同时放进 clearLayerIds 和 protectedLayerIds

8 步回归全过：

| 步 | 命令 | 期望 | 结果 |
|---|---|---|---|
| 1 | `validate-tail-spec.mjs` 跑 5 份 tail-spec | 4 通过、v5-as-shipped 按既往反构造继续 fail | ✓ 无新回归 |
| 2 | `validate-tail-spec.mjs` 跑 regression overlap fixture | 报 clearLayerIds∩protectedLayerIds 错 | ✓ 触发 |
| 3 | `validate-cross-file-consistency.mjs` 跑 yi-v5-cinematic | graceful pass（warn 缺 guideObject 但不 error） | ✓ |
| 4 | `validate-cross-file-consistency.mjs` 跑 yi-v8 brief | 报 form 不匹配 + minimumFinalHoldSeconds=2.0 不可达 | ✓ 两条触发 |
| 5 | `validate-cross-file-consistency.mjs` 跑 form-mismatch fixture | 报 form mismatch | ✓ 触发 |
| 6 | `validate-motion-readability.mjs` 跑 yi-v8 brief | 报 4 段缺 shotMotion + 3 段缺 writingImplements | ✓ 7 条触发 |
| 7 | `validate-plate-continuity.mjs --strict` 跑 yi-v8 brief | 报 3 个相邻镜头 hard-cut 无 continuity | ✓ 3 条触发 |
| 8 | `node --check` 3 个新 validator | 语法 OK | ✓ |

**jury 8 blockers 全部能被新框架在 brief 阶段挡下**，不需要跑到渲染再靠双盲 review 兜。

---

## npm scripts 新增

`package.json`：

```json
"video:check-cross-file": "node tools/recognition-video/scripts/validate-cross-file-consistency.mjs tools/recognition-video/briefs/yi-v5-cinematic.brief.json",
"video:check-cross-file-regression": "node tools/recognition-video/scripts/validate-cross-file-consistency.mjs tools/recognition-video/briefs/regression/yi-v8-form-mismatch.brief.json || echo 'expected-fail-ok'",
"video:check-motion-readability": "node tools/recognition-video/scripts/validate-motion-readability.mjs tools/recognition-video/briefs/yi-v5-cinematic.brief.json",
"video:check-plate-continuity": "node tools/recognition-video/scripts/validate-plate-continuity.mjs tools/recognition-video/briefs/yi-v5-cinematic.brief.json"
```

regression 命令故意让退出码非 0 也算"通过"——验证 fail-fast 触发是预期产物，不是失败。

---

## 对未来字的影响（不是规则，是事实）

任何新字 brief（包括"一" v9 / 二 / 三 / 人 / 山 / 火）从今天起**必须**声明：

1. `brief.finalFrame.guideObject.{form, anchor, entryDirection}` 三个 enum 字段
2. `brief.finalFrame.posterHoldSeconds`
3. `brief.animationRequirements.shotMotion[]` 每个非 tail shot 一条
4. 写字段 shot 必须有 `brief.animationRequirements.writingImplements[].tracksMaskFront=true`
5. `brief.shotPlan[].continuityWithPrev` 每段对前段的 continuity 声明
6. `brief.tailSpecRef` 指向的 tail-spec 必须有 `finalFrame.pointerForm` enum
7. tail-spec `transition.clearLayerIds` 与 `protectedLayerIds` 不能 overlap

跑全链：

```bash
npm run video:check-narration-spec  # 既有
npm run video:check-tail-spec       # 既有，加了 pointerForm + protected overlap
npm run video:check-cross-file      # 新：cross-file 一致性
npm run video:check-motion-readability  # 新：运动可读性
npm run video:check-plate-continuity --strict  # 新：plate 连续性
npm run video:check-audio-sync      # 既有
npm run video:check-teaching-harness  # 既有
npm run video:check-product-gate    # 既有
```

8 道闸全过 → 才进 render，render 完跑双盲 review。**双盲 review 现在只兜 schema 抓不到的审美问题**（如 plate 题材合不合适、旁白文本好不好、bird sprite 抢不抢字形），不再兜 schema 本该兜的结构性矛盾。

---

## 这次到底解决了什么 / 没解决什么

**解决**：

- jury yi-v8 的 8 条 blocker 在 brief 阶段被结构性拦截，不再依赖跑完 render 再 review 兜底
- v5 brief 自己缺 motion 声明这个**隐藏 bug**（[[2026-05-20-HyperFrames三子线化重构]] 的"两横笔幽灵 + 旁白无重复无锚定"之外的另一条）被新 motion-readability validator 露出来。下次 v5 同方法做新字时必须先补 shotMotion 才能通过

**没解决**：

- 双盲 review 框架本身的成本（~$1/run）。结构性 blocker 提前拦下后 review 跑的频率应该会下降，但每个新字过 render 仍然要跑一次
- 模型审美盲区（[[../../memory/feedback_validator_pass_not_product_pass]]）。schema 永远拦不住"plate 题材是不是儿童会喜欢"这类纯审美问题，那部分仍需要双盲 review + 人眼
- "一" v9 重做 vs 回退 v5 的决策。这次只是把工具备齐，**用户拍板才动**

**下一步**（不是这次的范围）：

- "一" v9 / 回退 v5 决策待用户拍板
- 8 道闸如果在 v9 上跑通，把这套迁移到代表字 `山` 或 `水`（按 v5 cinematic 单字成本边界讨论）

---

## 文件清单

新增：

- `tools/recognition-video/scripts/validate-cross-file-consistency.mjs`
- `tools/recognition-video/scripts/validate-motion-readability.mjs`
- `tools/recognition-video/scripts/validate-plate-continuity.mjs`
- `tools/recognition-video/briefs/regression/yi-v8-form-mismatch.brief.json`
- `tools/recognition-video/tail-specs/regression/yi-v8-protected-overlap.tail-spec.json`

修改：

- `tools/recognition-video/schemas/brief.schema.json`（finalFrame.guideObject / animationRequirements.shotMotion / animationRequirements.writingImplements / shotPlan[].continuityWithPrev）
- `tools/recognition-video/schemas/tail-spec.schema.json`（finalFrame.pointerForm 必填 / transition.protectedLayerIds）
- `tools/recognition-video/scripts/validate-tail-spec.mjs`（protected/clear overlap 检查 + finalFrame 按 anchors.allowedPointerForms 校验 pointerForm）
- `tools/recognition-video/tail-specs/yi-v5-cinematic-as-shipped.tail-spec.json` / `yi-v5-cinematic-fixed.tail-spec.json` / `yi-v6.tail-spec.json` / `yi-v7.tail-spec.json`（加 `"pointerForm": "child-hand"`）
- `package.json`（4 个 npm scripts）

参见：

- [[2026-05-23-双盲框架yi-v8烟测与SKILL修复|双盲框架 yi-v8 烟测（jury 4.7 / blocked / 8 blockers）]]
- [[../05-技术文档/HyperFrames多帧动画Agent流水线方案]] § "2026-05-23 框架四洞修复"
- [[../../memory/feedback_validator_pass_not_product_pass|validator 通过 ≠ 产品合格]]
