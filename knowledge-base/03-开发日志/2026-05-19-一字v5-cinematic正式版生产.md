---
tags: [开发日志, HyperFrames, 认字视频, v5, cinematic, 六镜头, cross-dissolve, 米字格, 笔顺, GSAP, MiniTimeline, edge-tts, baked-audio, Mobile-H5, official, product-review]
created: 2026-05-19
updated: 2026-05-19
---

# 2026-05-19 · 一 字 v5 cinematic 正式版生产（六镜头交叉溶解 + 双静默呼吸）

## 任务定义

承接 [2026-05-18 v4 正式版生产](2026-05-18-一字gpt-image-2-production-v4正式版生产.md)。v4 落地后 product-review overall **8.6**，能用但**美学上限被工艺上限锁死**：

- 6 张 plate 还是 CSS 几何 + sprite halo + chroma-key 残色，本质是"看起来不抽风"，不是"看起来想再看一遍"
- 5.9-6.4s 光带→墨字一刀切，孩子能看到字但看不到"光怎么变成墨"
- 0-0.6s 直接进入旁白"天亮了"，开场草台，无电影感
- 10-12s 笔顺尾段已经有但写完即停，无收势

用户原话：

> "这个 v4 的视频里面的素材也太抽风了，简直是暴殄天物。能否参照 Tonko House / Cartoon Saloon / 长安三万里 / Jon Klassen 的美学风格出一版获奖级的？"

**目标**：v4 → v5 整体重做，把 8.6 推到 ≥9.0，建立 cinematic short-film 而不是教学动画。硬约束沿用前几版（HyperFrames + edge-tts XiaoxiaoNeural -10% + 24fps + 米字格 + 静默笔顺尾 + H5 资产命名避开 `/v3|legacy|sample/i`）；新增软约束：**视觉目标 Tonko House / Cartoon Saloon / 吉卜力 / 追光长安三万里 / Jon Klassen，反目标 洪恩 / Pinkfong / CoComelon**。

## 产物清单

| 类型 | 路径 |
|---|---|
| build 目录 | `tools/recognition-video/builds/yi-v5-cinematic/` |
| meta.json | 同上 `meta.json`，状态 `draft`（product-review 接管为 `ready-for-official`） |
| product-review | `tools/recognition-video/product-reviews/yi-v5-cinematic.product-review.json`，`decision: ready-for-official`，overall **9.12**（v4 8.6） |
| brief / asset-plan / audio-plan | 同前缀 `briefs / asset-plans / audio-plans` |
| plate 原图（6 张） | `tools/recognition-video/assets/unit-01/yi-v5-cinematic/plates/{dawn-valley, sun-rising, light-band, light-to-ink, ink-glyph, hand-tracing}-plate.png`（codex gpt-image-2 high） |
| bird sprite | `assets/unit-01/yi-v5-cinematic/sprites/bird/flight-loop/`，6 帧 256×256 透明 PNG，`alphaRequired: true`、`transparentPixelRatio 0.9446`（无 chroma-key） |
| mp4 / webm | 1080×1920 / 24fps / 12.000s（audio drift 10.7ms）。`renders/yi-v5-cinematic.{mp4,webm}` 8.9MB / 3.5MB |
| poster / final / review-sheet | `renders/final-frames/yi-v5-cinematic-{poster,final,review-sheet}.png` |
| H5 资产 | `src/clients/mobile-h5/assets/recognition/yi/yi-v5-cinematic.{mp4,webm,poster.png,final.png,narration.mp3}` |
| H5 wiring | `src/shared/unit-01.js#yi.recognitionVideo` 全部指向 v5；`index.html` / `app.js` / `sw.js` 同步 v38→**v39** |

## 关键工艺路径（v4→v5 五条升级）

### 1. 六镜头交叉溶解叙事编排（取代 v4 三段直叙）

**v4 做法**：场景→光带→大字→米字格四段切换，每段视觉信息独立堆叠，孩子看完知道发生了什么但不会想再看。

**v5 做法**：把 12 秒拆成 6 个 plate 互相交叉溶解，每段都有 0.4-1.2s overlap 而不是硬切：

| 段位 | 时间 | plate | 教学功能 | 旁白 |
|---|---|---|---|---|
| 1 | 0-1.0s | dawn-valley + bird sprite | silentPrologue 静默序曲 | — |
| 2 | 1.0-2.4s | sun-rising | meaningAction 意义入场 | "天亮了" |
| 3 | 2.4-5.9s | light-band | glyphBinding 字形绑定 | "山那边升起一道光" |
| 4a | 5.5-6.4s | light-to-ink | lightToInkBridge 相变桥 | — |
| 4b | 6.4-10.0s | ink-glyph + mask 渗墨 | phraseBridge 字形点题 | "就是「一」" |
| 5 | 9.6-12.0s | hand-tracing + 二次书写 | strokeOrderTail 笔顺尾 | — |

交叉溶解全靠 GSAP 单 timeline 调度 plate 的 `opacity`，配合 `easeInOut` 0.4-1.2s 软切；plate 时间窗有显式 overlap（如 light-band 2.0 起 4.4s，sun-rising 0.6 起 2.6s，交叠 0.4s）。最重要的不是镜头多，而是**段间没有硬切**——观感从"教学动画"切到了"短片"。

### 2. 双静默呼吸（0-1.0s 序曲 + 10-12s 笔顺尾）

**v4 做法**：0-1.0s 旁白已经在念了，没有任何"建立调性"的时间；10-12s 米字格 + 笔顺示范虽然 silent 但画面没收势，写完戛然而止。

**v5 做法**：刻意在头尾各留一段"无旁白纯画面"：

- **silentPrologue**（0-1.0s）：dawn-valley 晨雾色温 + 远景小鸟剪影沿对角线斜向左上飞行（6 帧 wing-flap sprite，96px 等比，不抢主体）。这 1.0s 全静默，让色温和构图先落地，再开始念"天亮了"。
- **strokeOrderTailDwell**（11.5-12.0s）：笔顺二写完成后保留 0.5s 静态停留，作为 poster / final-frame 的安全锚点。

呼吸的存在让节奏从"信息密度堆满"降到"4-6 岁孩子能跟上"。

### 3. light-to-ink 0.9s 显式相变桥（v4 一刀切的根治）

**v4 根因**：5.9-6.4s 光带直接淡出 + 大字直接淡入，0.5s 内画面"从光变成字"，但孩子看到的是"光消失了，字出现了"，不是"光变成了字"。

**v5 做法**：在中间多塞一张 `light-to-ink-plate`：

- 5.5-6.1s `light-to-ink` plate 0.6s ease-in 显形（背景宣纸暖色已渗出，光带边缘开始向墨色化）
- 6.1-6.4s 0.3s hold
- 6.4-7.0s 0.6s ease-out 淡出，让位 `ink-glyph` plate

这 0.9s 桥段成本不高，但它**显式呈现了相变**：光带不是消失，是"变浓了，变成墨"。这是 v5 product-review `glyphBinding` 得 9.3（v4 是 7.x）的核心证据。

### 4. 米字格双态语义切换（CSS 变量 0.18 → 0.30）

**v4 做法**：识字态 + 写字态两套米字格 cross-fade。

**v5 做法**：v4 的 single-mizige-dual-state 契约保留，但实现简化为单 SVG overlay + 单一 CSS 变量 `--mizige-opacity`：

```css
.mizige-watermark { --mizige-opacity: 0.18; }
.mizige-watermark svg { opacity: var(--mizige-opacity); }
```

GSAP timeline 在 10.0-10.6s 内把变量从 `0.18` 插值到 `0.30`。识字态半透明让 plate 物象（宣纸纹理）透出来，写字态加深给笔顺示范当容器。**整片只有一个米字格**，从 5.6s 显形到 12.0s 末帧不变位置不变形状，孩子注意力锚点全程不动。

### 5. 双相 mask 渲染笔感对比（softness 6-14 vs 2.5）

**v4 做法**：大字直接 fade-in，无笔感。

**v5 做法**：楷体 `一` 出现两次，用同一个 web font (LXGW Wenkai Yi subset .woff2) 但 mask-image phase 不同：

- **glyph-ink**（6.9-8.2s）：`linear-gradient(90deg, #000 X%, transparent X+softness%)` 由左向右推进，`softness` 从 14 收到 6（边缘羽化收窄），同时 `filter: blur(2px)` 渐 `blur(0)`。读出来是"墨在宣纸上慢慢渗开"。
- **glyph-write**（10.6-11.5s）：同样的 mask-image phase，但 `softness=2.5` 恒定锐边，`filter: blur(0.6px)` 渐 `blur(0)`。读出来是"笔在写"。

两次书写共享 y 中线（米字格中线 y≈1245px）、同色相（warm-deep #1f1a14）、同字形，但笔感不同。识字段的"渗"和写字段的"写"被显式区分，孩子能感到"现在这是看，现在这是写"。

## product-review 9.12

10 维度全部 ≥8.9：

| 维度 | 分 | 备注 |
|---|---|---|
| teachingStructure | 9.2 | 5 段叙事 + 双静默呼吸 |
| glyphBinding | **9.3** | 光带→渗墨→楷体→笔顺二写四态共享 y 中线与暖深色相 |
| glyphAnchor | 9.0 | 米字格双态 + 0.6s dwell |
| pacing | 9.1 | 12s 切 5 段最长 3.6s 最短 1.0s 无挤压 |
| animationPerformance | 9.0 | 多 plate cross-dissolve 帧成本略高，H5 实测仍流畅 |
| visualQuality | **9.4** | 六张 plate 美学跃迁（晨雾山谷/暖金日轮/横向光带/光转墨/宣纸渗墨/握笔示范） |
| childAppeal | 8.9 | 静默序曲对最低龄段略沉但有小鸟扑翅做动态钩子 |
| audioFit | 9.2 | drift 10.7ms < 25ms |
| technicalCompliance | 9.0 | 1080×1920 / 24fps / data-composition-id + data-duration=12 / sprite alphaRequired const true |
| officialReadiness | 9.1 | 给 H5 实机回归留余量 |

**overallScore 9.12 / decision ready-for-official / blockers []**。

## H5 接入（v38 → v39）

`src/shared/unit-01.js#yi.recognitionVideo` 全字段替换：

- `version`: `yi-v5-cinematic`
- `duration`: 10 → **12**
- `src/webm/poster/finalFrame`: 全部 `yi-v5-cinematic-*`
- `audioTrack.duration`: 10.056 → **12.0**
- `teachingCue`: "天亮了，山那边升起一道光，平平的一横，就是「一」。"
- `legacyRecognitionVideo` block 保留（`status: "legacy-sample"`，被 `recognitionVideoFor()` 过滤）

`bump-h5-version.mjs` 一次同步 3 文件（index.html / app.js / sw.js）v38→**v39**，4 个查询字符串 `?v=39` 全部就位。`check:h5` 全链绿（course model / visual assets / speech rhythm / guardrails / learning flow / routing / version）。**命名 `yi-v5-cinematic` 注意**：包含 `v5` 不是 `v3`，对 `/v3|legacy|sample/i` 正则不命中。

回归审计：

- `audit-mobile-h5-runtime.mjs` 16 步零失败（含 home/treasure/parent/first-guide/open-unit/start-learning/speak/wrong-answer-replay/answer-question/practice-correct-into-review/open-parent/open-treasure 等 P01→P11 关键路径）
- `audit-mobile-h5-viewport.mjs` 4 设备 × 6 页零失败
- P03 iphone-12 截图视觉确认 v5 poster 已挂载（米字格 + 暖深墨「一」+ 拼音 "yī" 与 final-frame 一致）

## 关键决策

### v5 不是"v4 + 多 1 张 plate"

最初的方案是给 v4 加 light-to-ink 桥段 + 改用更好的 plate。**否决**——单点缝补会让 v4 的草台开场和写完即停继续拖分。最终选择从零重排 6 镜头叙事，把 v4 的 4 段重组为 5 段 + 双静默呼吸 + 桥段相变 + 双相 mask。这是 **8.6 → 9.12** 跃迁的根因。

### 静默序曲是奢侈但必要

0-1.0s 全静默 + 远景小鸟扑翅，对一个 12s 教学视频来说"贵"——12 秒里花了 8% 不讲字。但**这 1 秒决定了观感是"教学动画"还是"短片"**。最终该段拿到 product-review `silentPrologue` 项 `pass`，rationale 是"色温和构图先建静的基调"。

### bird sprite 走 transparent PNG 不走 chroma-key

v4 sun halo 走的是 `#00ff00` chroma-key + filter 中和残色。v5 bird sprite 直接走真 RGBA 透明 PNG（`transparentPixelRatio 0.9446`，`hasUsableAlpha: true`）。原因是 chroma-key 在暗背景上仍可能漏微量绿色边缘，而 bird 飞在山谷晨雾的 mid-tone 上**对边缘残色更敏感**。`prepare-spritesheet-sprite.mjs` 已经支持 `--mode auto`，自动选 transparent。

### v4 保留 legacy 不删

v4 的 mp4/webm/poster/final/narration 仍留在 `src/clients/mobile-h5/assets/recognition/yi/` 但 unit-01.js 已不引用。**没删**——后续如果 v5 有线上回归问题需要快速回滚 v4，资产还在。删除等真机回归一周稳定后再说。

## 反思 / 不做项

### 没做的（且不该做）

- **没做** 给其他 19 个字（二/三/大/小/上/下/人/口/手/日/月/水/火/山/木/土/天/目/耳）按 v5 cinematic 模板批量生产。v5 是 `一` 字的标杆，证明 9.0+ 可以做到；但**单字成本陡升**（plate 从 1 张变 6 张，brief / asset-plan / audio-plan 都重写），盲目铺给 19 字会拖死进度。下一步该先用 v5 同套方法做 1-2 个代表字（`山` 或 `水`），验证模板能否复用，再决定批量策略。
- **没做** 真机回归。当前所有"通过"都是 headless Chrome 审计 + 静态截图视觉确认。真机（iPhone Safari / Android WebView / 微信内置浏览器）autoplay policy、video tag mime、SW 缓存行为都还没验过。等 v39 真上 VPS 后再补一轮。
- **没做** poster 优化。当前 poster 是 t≈9.0s 的 ink-glyph 完整态，能用但暗背景占比偏多；理论上 t=7.5s（mask 渗墨中段）或 t=11.5s（笔顺收尾）更"动感"。但 ROI 不高，留给下一轮。

### 工艺侧的发现

**HyperFrames GSAP MiniTimeline shim 在 v5 仍是隐患**：v37 三轮迭代时已经把 shim 的 `totalDuration=7.4` 硬编码改成读 `data-duration`，v4 / v5 都靠这条修复。但 shim 仍然不是真 GSAP，只能跑 `gsap.timeline({ paused: true }).add(fn)` 这一种用法；如果未来有人想用 `gsap.to()` / `gsap.fromTo()` 写关键帧，会发现 shim 没实现。这是潜在阻塞，但今天不动——v5 用单 timeline 函数式调度已经够用。

**plate 数量与 render 帧成本**：6 张 plate cross-dissolve 时多张同时显形（如 5.5-6.4s 段同时存在 light-band / light-to-ink / 米字格 / glyph-ink 多层），单帧 layer composite 成本明显高于 v4。H5 实测仍 60fps 但已经看出多 plate 不是免费午餐。后续字如果再加 plate 数量要警惕。

## 沉淀（4 条）

1. **8.6 → 9.0 不是"打补丁"，是"重排叙事"**：v4 → v5 最大变化不是哪一个工艺细节，是把 12s 从 4 段重排成 5 段 + 双静默呼吸 + 显式桥段。单点修补只能让分数从 8.6 涨到 8.8；要破 9 必须重做编排。
2. **静默是 cinematic 的硬通货**：0-1s 序曲和 10-12s 收势这两段"贵"的 silent 是 v5 与 v4 在观感上拉开的关键。教学动画怕静默（怕孩子走神），短片靠静默立调性。儿童识字视频可以借短片的呼吸节奏，但不能借短片的剪辑密度。
3. **mask softness 区分笔感**：同一字 mask 两次但 softness=14 vs 2.5，读出来一次是"渗"一次是"写"。比加两套字形便宜，比加旁白更直观。该手法可以直接复用到其他字（任何笔画字都能做"先渗后写"两相）。
4. **v5 是标杆不是模板**：v5 证明 9.0+ 可达，但单字成本（plate × 6 / brief 重写 / audio cue 重写）使其不能直接批量。下一步该用 v5 同方法做 1-2 个代表字（建议 `山` 或 `水`，笔画更多能更充分测试 strokeOrderTail），再决定模板化策略。
