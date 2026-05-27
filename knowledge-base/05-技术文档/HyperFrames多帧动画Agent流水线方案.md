---
tags: [技术方案, HyperFrames, 认字动画, Agent, 多帧动画]
created: 2026-05-10
updated: 2026-05-18
---

# HyperFrames 多帧动画 Agent 流水线方案

## 结论

当前 HyperFrames skill 适合做“确定性视频编排”：排版、时间轴、字幕、音频合成、poster/final frame、媒体校验。

它不应该被当作完整动画生产能力。现有 `一` 样片的主要问题不是横竖屏，而是动画性不足：多数画面是静态图片、CSS 图形或单张 cutout 在做位移、缩放、淡入淡出；这类 motion graphic 不能替代真正的角色动作、物体变形和逐帧表演。

因此后续要把 HyperFrames 从“一个 skill 直接产视频”升级为“Agent 编排的一条稳定生产流水线”。HyperFrames 处在流水线末端，负责把上游产出的多帧素材、音频和教学脚本装配成视频。

2026-05-13 补充：这里必须区分两类 agent。

- **通用 HyperFrames 视频生成 agent**：只负责装配和渲染。它判断 composition 是否可渲染、轨道是否合规、素材是否存在、媒体 metadata 是否正确。
- **星光识字产品 HyperFrames 视频生成 agent**：负责判断视频值不值得被做出来，做出来后能不能教 3-6 岁孩子认字。它必须先处理教学钩子、关键帧、动作可读性、资产完成度、儿童记忆点、P03 适配和 official 资格。

通用 HyperFrames 通过只能说明“能做出 mp4”。星光识字 product gate 通过才说明“有资格进入 official 候选”。

## 新流水线节点

### 1. 教学动作 brief

输入：目标字、教学钩子、语音脚本、时长。

输出：

- 3-8 秒 shot plan。
- 每个动作的教学目的。
- 哪些元素必须逐帧动画，哪些元素只需要 timeline motion。

例：`一`

- 必须逐帧：兔子轻跳、苹果轻落/弹一下、木棒滚到横向、横线发光生长。
- 可以 timeline：背景慢推、云朵漂移、文字淡入、final card 收束。

### 2. 分层资产设计

输入：brief。

输出：

- 背景 plate：静态或轻微 parallax。
- 角色 cutout：透明 PNG，多 pose 或 sprite sheet。
- 物件 cutout：苹果、木棒、小路横线等，必要时多帧。
- UI/text 层：汉字、拼音、短文案，仍由 HTML/CSS 渲染，避免生图生成文字。

规则：

- 生成图不画汉字、拼音或 UI 文案。
- 角色/物件必须透明背景，统一光照、统一线条粗细。
- 每个动作至少 4-8 个 pose 才能摆脱“单张图移动”的廉价感。

### 3. 音画同步计划

输入：brief、asset-plan、参考时长。

输出：

- `audio-plans/<char-id>.audio-plan.json`
- 旁白 provider / voice / rate / pitch。
- 真实或草稿旁白的 cue 时间戳，优先来自 TTS 字幕或人工标注。
- 每句旁白对应的视觉窗口：`audioStart/audioEnd` 与 `visualStart/visualEnd`。
- `durationBenchmark`：洪恩式参考视频时长、星光 P03 目标时长，以及为什么要压缩或保留时长。
- final quiet hold：最后一句结束后仍要给孩子看回大字的安静时间。

规则：

- 不允许先把视频时间轴完全锁死，再把音频硬塞进去。可以先做草稿音频和 animatic，但正式装配前必须用测得的 cue 反推镜头起止。
- 旁白语速默认按儿童跟读调慢，Edge TTS 这类 voice 的 `rate` 通常应在 `-15%` 到 `0%`，多句带读更倾向 `-10%` 左右。
- P03 页面内认字短片仍保持 3-8 秒窗口；有 3 句以上 cue 时一般不应低于约 5.8 秒。
- 洪恩单字卡可作为节奏参考，但 P03 嵌入短片不照搬 20 秒长卡；时长选择必须写入 `durationBenchmark`。

校验命令：

```bash
node tools/recognition-video/scripts/validate-audio-sync-plan.mjs \
  tools/recognition-video/briefs/<char-id>.brief.json \
  tools/recognition-video/asset-plans/<char-id>.asset-plan.json \
  tools/recognition-video/audio-plans/<char-id>.audio-plan.json
```

### 4. 多帧 cutout 生成

输入：资产设计说明。

输出：

- `assets/unit-01/<char>/sprites/<actor>/<action>-000.png ...`
- 或 `sprite-sheet.png + manifest.json`。
- 若来源是生图 spritesheet，必须先用
  `tools/recognition-video/scripts/prepare-spritesheet-sprite.mjs`
  标准化，产出 `source-spritesheet.png`、透明帧、`manifest.json` 和
  `review-sheet.png`，并默认通过 `validate-sprite-assets.mjs`。

质量要求：

- 同一角色在多帧中体型、颜色、视角稳定。
- 透明边缘干净，无背景残留。
- 每帧保留足够 padding，避免动作被裁。
- 命名和帧率可由脚本读取。

### 5. 资产校验

脚本检查：

- 是否有 alpha。
- 尺寸是否一致。
- 帧数是否满足动作要求。
- 边界是否裁切。
- 首尾帧是否可循环或自然停住。

人工检查：

- 动作是否真的读得出来。
- 是否抢了汉字主体。
- 角色是否符合星光识字的暖彩绘本调性。

### 6. 星光产品视频 review

输入：

- `brief.json`
- `asset-plan.json`
- `audio-plan.json`
- 关键帧 review sheet
- 核心动作可读性说明
- 资产来源和完成度判断

输出：

- `product-reviews/<char-id>.product-review.json`

必须记录：

- product agent 和 generic HyperFrames agent 的职责边界。
- 至少 4 个关键帧的可读性证据。
- 核心动作是否能被孩子读懂，而不只是像素有变化。
- 是否存在一个强记忆瞬间。
- 语速、cue 间隔、音画同步和 final quiet hold 是否合理。
- 是否使用程序图形占位资产。
- 教学结构、字形绑定、动画表现、美术质感、儿童吸引力、音频贴合、技术合规和 official 准备度评分。
- `decision`：`ready-for-hyperframes / rendered-needs-iteration / ready-for-official / blocked`。

校验命令：

```bash
node tools/recognition-video/scripts/validate-product-video-gate.mjs \
  tools/recognition-video/product-reviews/<char-id>.product-review.json
```

official 候选必须使用严格模式：

```bash
node tools/recognition-video/scripts/validate-product-video-gate.mjs --official \
  tools/recognition-video/product-reviews/<char-id>.product-review.json
```

硬规则：程序绘制的 plate、CSS 几何、简单脚本 sprite 可以做 smoke test，但不能穿过 `ready-for-official` 门。

### 7. HyperFrames 装配

输入：

- 背景 plate。
- sprite sheet / PNG sequence。
- 已通过 `validate-audio-sync-plan.mjs` 的音频与 cue 时间轴。
- shot plan。

输出：

- `1080x1920` 手机竖屏 composition。
- `mp4 / webm / poster / finalFrame / metadata`。

HyperFrames 只做：

- 帧序列切换。
- 按 audio-plan 做时间轴同步，不能随手改 cue。
- 少量 transform / opacity / parallax。
- 字形、拼音、教学标签渲染。
- 音频和 final frame 对齐。

### 8. 验收

必须通过：

- `validate-teaching-harness.mjs`
- `validate-audio-sync-plan.mjs`
- `validate-product-video-gate.mjs`
- `npx hyperframes lint`
- `npx hyperframes inspect --at ... --json`
- `npx hyperframes render -c ... --fps 24`
- `ffprobe` 检查尺寸、时长、音轨、帧率。
- 手机竖屏截图/点播复核。

额外动画质量检查：

- 单个角色动作不能只靠整张图位移完成。
- 至少一个关键教学物件有多帧变化。
- 0.8 秒内出现明确字形钩子。
- final frame 仍然安静可读。
- review sheet 不能读成几张教学卡片顺序出现，必须有一个清楚的儿童记忆动作。

## 当前 `一` 竖屏 v1 的定位

`2026-05-10-mobile-v1-portrait-baseline-pose-step` 已解决：

- 手机竖屏规格。
- 有声 mp4/webm。
- poster/final frame。
- H5 official resource gate。
- 少量 pose-step 兔子雏形。

但它仍然不是最终动画质量标杆。它是“竖屏 baseline + 管线验证样片”，下一版应进入多帧 cutout 生产，而不是继续在单 HTML/CSS composition 里硬凑复杂动作。

## 2026-05-10 Agent 底座落地记录

本轮已把上面的方案从文档推进为项目内可执行底座：

- 新增根级 `AGENTS.md`，让 Codex 进入仓库后能发现 HyperFrames 认字视频应走 agent workflow。
- 新增 `tools/recognition-video/AGENTS.md` 和 `tools/recognition-video/README.md`，定义 Orchestrator / Teaching Brief / Asset Planning / Sprite Production / Validation / HyperFrames Assembly / Release QA 七个角色。
- 新增 schema：
  - `tools/recognition-video/schemas/brief.schema.json`
  - `tools/recognition-video/schemas/asset-plan.schema.json`
  - `tools/recognition-video/schemas/sprite-manifest.schema.json`
- 新增 sprite 校验脚本：
  - `tools/recognition-video/scripts/validate-sprite-assets.mjs`
  - 检查 RGBA PNG、alpha、尺寸一致、帧数、边界裁切风险、chroma-key 残留。
- 新增示例与模板：
  - `tools/recognition-video/examples/briefs/yi.brief.json`
  - `tools/recognition-video/examples/asset-plans/yi.asset-plan.json`
  - `tools/recognition-video/examples/sprites/yi/rabbit-hop/manifest.json`
  - `tools/recognition-video/templates/prompts/cutout-sequence-prompt.md`
  - `tools/recognition-video/templates/hyperframes/sprite-stage.html`
- `package.json` 新增命令：
  - `npm run video:create-example-sprite`
  - `npm run video:check-sprite-example`
- 已安装用户级 skill：`/Users/elvis/.agents/skills/starlight-video-agent`，后续可用 `$starlight-video-agent` 触发。

已验证：

```bash
node --check tools/recognition-video/scripts/validate-sprite-assets.mjs
node --check tools/recognition-video/scripts/create-example-sprite.mjs
npm run video:create-example-sprite
npm run video:check-sprite-example
```

`video:check-sprite-example` 输出 `Recognition sprite validation ok: 1 manifest.`。

## 2026-05-12 教学 Harness 卡口补强

本轮基于洪恩识字视频拆解后的结论，对 Agent 流水线补了一道“教学 harness”。核心判断是：光靠 prompt 要求“慢一点、兔子脚要动、字形要服务认字”不够，必须把教学结构、节奏、资产覆盖和动作契约变成可执行校验。

新增硬约束：

- **先语义，后字形收束**：brief 必须声明 `teachingContract.meaningAction`，并且它要早于 `phraseBridge / glyph-close`。
- **字形绑定真实场景**：必须有 `glyphBinding.boundElements`，说明生活物件、形状和目标字如何绑定。
- **词句桥接**：必须有 `phraseBridge` 和 `sentenceBridge`，短词必须包含目标字，并出现在 narration script 中。
- **儿童节奏**：`pacingRequirements` 必须存在；核心 cue 至少 1.2s，最终大字至少 2.0s，场景切换频率不得超过 0.75/s。
- **角色只做教具**：`mascotRole` 只能是 `supporting` 或 `none`，避免兔子、小动物变成主角。
- **写字后置或省略**：短认字视频里 `writingPosition` 只能是 `late / late-or-omitted / omitted`。
- **动作必须可验证**：每个 required sprite 要有 `requiredMotionParts`、逐帧 `poseContract`、manifest 和 `motionChecks`，防止“整张图移动但脚不动”。
- **文字只进渲染层**：`textRendering.rasterImagesMayContainText` 必须为 `false`，汉字、拼音和 UI 文案继续由 HTML / SVG / canvas 渲染。

新增/更新文件：

- `tools/recognition-video/scripts/validate-teaching-harness.mjs`
- `tools/recognition-video/schemas/brief.schema.json`
- `tools/recognition-video/briefs/yi-agent-pipeline-test.brief.json`
- `tools/recognition-video/scripts/create-yi-agent-pipeline-test.mjs`
- `tools/recognition-video/AGENTS.md`
- `tools/recognition-video/README.md`
- `package.json`：新增 `npm run video:check-teaching-harness`

验证记录：

```bash
node --check tools/recognition-video/scripts/validate-teaching-harness.mjs
node --check tools/recognition-video/scripts/create-yi-agent-pipeline-test.mjs
npm run video:check-teaching-harness
node tools/recognition-video/scripts/validate-sprite-assets.mjs tools/recognition-video/assets/unit-01/yi-agent-pipeline-test/sprites/rabbit/hop/manifest.json
node tools/recognition-video/scripts/validate-sprite-assets.mjs tools/recognition-video/assets/unit-01/yi-agent-pipeline-test/sprites/apple/settle/manifest.json
node tools/recognition-video/scripts/validate-sprite-assets.mjs tools/recognition-video/assets/unit-01/yi-agent-pipeline-test/sprites/stick/roll-flat/manifest.json
```

正向结果：`yi-agent-pipeline-test` 的 brief / asset-plan / 三个 sprite manifest 均通过。  
反向结果：旧 `examples/briefs/yi.brief.json` 会失败，能抓到缺 `teachingContract`、缺 pacing、缺 poseContract、缺 motionChecks、资产缺失和节奏过快等问题。

后续认字视频生产的顺序应改为：

1. 先写 `brief.json`，包含 `teachingContract` 和 `pacingRequirements`。
2. 再写 `asset-plan.json`，明确 plate / cutout / sprite / text rendering / audio。
3. 跑 `validate-teaching-harness.mjs`。
4. 写 `audio-plan.json`，明确语速、cue 时间戳、视觉窗口、洪恩时长对照和 final quiet hold。
5. 跑 `validate-audio-sync-plan.mjs`。
6. 再生产 sprite 帧和 manifest。
7. 跑 `validate-sprite-assets.mjs`。
8. 最后才进入 HyperFrames assembly / lint / inspect / render。

这道 harness 是“能不能继续往下生成”的门，不是补充建议。后续如果某个字的视频看起来漂亮但不满足教学结构，应当在 HyperFrames 渲染前就失败。

## 2026-05-12 一字洪恩式生成验证纠偏

本轮用最新 agent 流水线生成 `一` 的测试视频时，先复用了 `yi-agent-pipeline-test`。它通过了 teaching harness、三组 sprite validator、HyperFrames lint / inspect / render 和媒体检查，但用户指出“兔子的动画还是原来的，洪恩经验没有真正用上”。这个反馈暴露出一个新门槛：**机器卡口能证明结构存在，不能证明画面表达已经摆脱旧样片**。

因此新增 `yi-hongen-agent-v2` 作为纠偏样片：

- 新脚本：`tools/recognition-video/scripts/create-yi-hongen-agent-v2.mjs`
- 新 brief：`tools/recognition-video/briefs/yi-hongen-agent-v2.brief.json`
- 新 asset plan：`tools/recognition-video/asset-plans/yi-hongen-agent-v2.asset-plan.json`
- 新 build：`tools/recognition-video/builds/yi-hongen-agent-v2/`
- 新渲染：`tools/recognition-video/builds/yi-hongen-agent-v2/renders/yi-hongen-agent-v2.mp4`

关键变化：

- 不再把旧兔子作为第一视觉。即使兔子动作改成“指向”，用户仍会感知为旧样片延续。
- 改为“引导小手点一下并沿小路描一横”，让洪恩式“老师带孩子看、指、停顿”的经验直接进入画面动作。
- 保留 `一个苹果` 做数量复现，`一根木棒` 做字形绑定，最后收束到稳定大字 `一 / yi / 都是一`。
- 仍然保持图片资产不含汉字、拼音或 UI 文案，文字由 HTML 渲染。
- 测试产物不覆盖 existing official，也不接入 H5 official。

验证结果：

```bash
node --check tools/recognition-video/scripts/create-yi-hongen-agent-v2.mjs
node tools/recognition-video/scripts/create-yi-hongen-agent-v2.mjs
cd tools/recognition-video/builds/yi-hongen-agent-v2
npx hyperframes lint
npx hyperframes inspect --at 0.4,1.2,2.7,4.5,6.3,7.65 --json
npx hyperframes render -o renders/yi-hongen-agent-v2.mp4 --fps 24 --quality draft --workers 1
ffprobe -v error -show_entries format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,duration,bit_rate -of json renders/yi-hongen-agent-v2.mp4
ffmpeg -i renders/yi-hongen-agent-v2.mp4 -af volumedetect -f null -
```

结果为：

- teaching harness 通过。
- `guide-hand / apple / stick` 三组 sprite validator 通过。
- HyperFrames `lint` 0 error / 0 warning，`inspect` 0 issue。
- MP4 为 `1080x1920`、约 `7.85s`、`24fps`，含 H.264 video + AAC audio。
- 音量检查非静音：`mean_volume: -24.6 dB`，`max_volume: -8.1 dB`。

新增生产规则：

1. **`yi-agent-pipeline-test` 只是工程 smoke test，不是视觉标准。** 后续不能因为它通过 harness 就宣称洪恩式样片成立。
2. **Release QA 必须抽 review sheet。** 以后每个测试视频都要生成关键帧拼图，人工确认第一视觉、动作逻辑、字形锚点和旧样片差异。
3. **如果用户一眼觉得“还是原来的”，就要替换主资产。** 不要继续在旧角色上微调姿态和时间轴。
4. **音频 gate 不能只看有音轨。** 本轮发现 macOS `say -o` 可能退出 0 但生成空音频；必须用 `volumedetect` 或等价检查确认非静音。
5. **sprite validator 的裁切风险拦截保留。** 本轮小手帧曾被裁切风险拦住，修正后才进入 render。

## 2026-05-13 音画同步与时长卡口补强

用户进一步指出：问题不是某一个 `一` 字样片要同步，而是 agent 本身要记住“下次生成新视频时，先处理语速、音画同步和合理时长”。因此本轮把同步要求沉入流水线，而不是停留在单个 composition。

新增/更新文件：

- `tools/recognition-video/scripts/validate-audio-sync-plan.mjs`
- `tools/recognition-video/schemas/audio-plan.schema.json`
- `tools/recognition-video/templates/prompts/audio-sync-plan-prompt.md`
- `tools/recognition-video/AGENTS.md`
- `tools/recognition-video/README.md`
- `package.json`：新增 `npm run video:check-audio-sync`

新增硬约束：

- 每个新认字视频在 HyperFrames assembly 前必须产出 `audio-plans/<char-id>.audio-plan.json`。
- `audio-plan` 必须写明 voice/provider/rate/pitch，语速默认控制在儿童可跟读范围，Edge TTS rate 推荐 `-15%` 到 `0%`。
- 每句旁白必须有 `audioStart/audioEnd` 和对应 `visualStart/visualEnd`，视觉窗口不能晚于声音，也不能早于声音结束。
- 最后一句旁白结束后必须留 quiet final hold，让孩子回看大字。
- `durationBenchmark` 必须记录洪恩式参考时长和星光 P03 目标时长，避免凭感觉决定总时长。
- official 产品门禁严格模式要求 `sourceArtifacts.audioPlan` 存在。

验证记录：

```bash
node --check tools/recognition-video/scripts/validate-audio-sync-plan.mjs
npm run video:check-audio-sync
npm run video:check-teaching-harness
npm run video:check-product-gate
node tools/recognition-video/scripts/validate-product-video-gate.mjs \
  tools/recognition-video/product-reviews/yi-fresh-horizon-sync-v4.product-review.json
```

正向结果：`yi-fresh-horizon-sync-v4` 的 brief / asset-plan / audio-plan 三件套通过同步卡口。  
兼容性结果：原有 teaching harness 和 product gate 仍通过，没有把旧 smoke test 误伤。

## 2026-05-15 生图能力纠偏与 fallback 机制

本轮重新调研 gpt-image-2 的实际能力，并纠偏 05-14 日志的一处错误判断。

### 调研结论

- gpt-image-2（2026-04-21 发布）**已经能稳定输出真正的 RGBA 透明 PNG**，前提是 prompt 明确写 `transparent PNG with alpha channel (RGBA)` 并禁掉 backdrop/floor/shadow/halo 等背景元素。
- 05-14 日志 `2026-05-14-HyperFrames生图Spritesheet标准化.md` 中"fallback CLI 默认模型为 gpt-image-2；该模型不支持直接透明背景"的结论**不准确**：本轮 5 次独立测试（PIL 像素级验证）全部成功输出 RGBA 真透明，根因是当时的 prompt 把透明请求隐式表述了，被 codex 内部 taxonomy 归类成 product-mockup 类型。
- 风格控制：纯 prompt 控制风格不稳（容易被 model 归类到木刻或 3D 渲染）；附带 style reference image 显著更稳。
- 一次性产 spritesheet 通过 agent 调用容易作弊：agent 会偷偷写 python 脚本把单帧拼接，造成相邻帧完全一致。

### 调整

1. **生图主路径切换为透明 PNG**。chroma-key 降级为 fallback，仅当模型在当前会话不出透明时切换一次，不允许循环重试。
2. **`prepare-spritesheet-sprite.mjs` 双路径**：
   - 新增 `--mode auto|transparent|chroma-key`，默认 `auto`。
   - `auto`：读取 PNG 后用 `analyzeTransparency()` 检测 alpha 覆盖；`transparentPixelRatio > 0.05` 且 `edgeTransparentRatio > 0.5` 走 transparent 路径，否则回退 chroma-key。
   - `transparent`：强制要求真 alpha，不达标直接 fail-fast，**不重试**。
   - `chroma-key`：保留旧路径不动，不影响已通过 official 的 yi 样片。
3. **反作弊检测**：脚本切完 cell 后跑 `detectIdenticalCells()`，相邻帧像素完全一致直接 fail（除非显式 `--allow-identical-frames`）。这是为了堵 agent 用脚本拼接 spritesheet 的偷工路径。
4. **AGENTS.md / README.md 新增 hard stop**：
   - 一次 image-generation call 只能产 `(character, actor, action)` 一个组合，不允许批量。
   - 不允许用 python/shell 脚本把单帧生图拼成 spritesheet。
   - 透明 prompt 失败时只切换一次到 chroma-key，不重复重试同一 prompt。
5. **manifest 增加 `generationMode` 与 `sourceTransparency` 字段**，让下游 validator 能识别 sprite 是真透明还是抠色出来的。

### 决策树落地

```
生图输出 spritesheet.png
  ↓
prepare-spritesheet-sprite.mjs 解码 + analyzeTransparency
  ↓
  ├─ hasUsableAlpha = true  → mode=transparent，直接拆帧不抠色
  │
  └─ hasUsableAlpha = false → mode=chroma-key，跑 applyChromaKey 旧路径
       ↓ 抠不出主体
       └─ fail-fast，把决策权交回上游 agent / 产品 review，不在脚本里重生
  ↓
detectIdenticalCells
  ↓
  ├─ 全唯一 → 写盘 + manifest + review sheet + validate-sprite-assets
  └─ 有重复 → fail（除非 --allow-identical-frames）
```

### 后续

- 用新管线产代表字（如 `山`）的 spritesheet 跑端到端 smoke，仍然按 brief → asset-plan → audio-plan → sprite → HyperFrames 顺序。
- 旧的 `yi-fresh-horizon-sync-v4` chroma-key 资产仍然有效，不需要重生。
- 后续 agent 触发生图时优先使用 `templates/prompts/cutout-sequence-prompt.md` 的主路径段落。

## 下一步验证计划

`一` 已经完成两层验证：`yi-agent-pipeline-test` 证明工程卡口可跑，`yi-hongen-agent-v2` 证明旧兔子视觉路径可以被纠偏。下一步不再继续只打磨 `一`，而是用同一套卡口验证代表字生产能力：

1. 选择 `二 / 三 / 人 / 山 / 火` 中的一个代表字，先产出 `brief.json`、`asset-plan.json` 和 `audio-plan.json`。
2. brief 必须包含 `teachingContract` 和 `pacingRequirements`，先跑 `validate-teaching-harness.mjs`。
3. audio-plan 必须包含语速、VTT/cue、视觉窗口、洪恩时长对照和 quiet final hold，跑 `validate-audio-sync-plan.mjs`。
4. 通过后再生成或整理真实多帧 sprite/cutout，禁止用单张图位移冒充动作。
5. 跑 `validate-sprite-assets.mjs`，确认 alpha、帧数、尺寸、裁切、poseContract 和 motionChecks 能挡住坏资产。
6. 用 `templates/hyperframes/sprite-stage.html` 或派生 composition 装配测试视频。
7. 跑 HyperFrames lint / inspect / render，并抽 final frame / poster 做人工 review。
8. 测试产物不得覆盖现有 official 资源，也不得直接接入 H5 official。

## 2026-05-16 接入 H5 official 时新增的硬规则

来自 `一` gpt-image-2 production v3 端到端落地（详见 [[2026-05-16-一字gpt-image-2-production-v3正式版生产]]）：

1. **fps 必须显式指定 24**。HyperFrames render 默认 `30` fps，但 `scripts/check-mobile-h5-guardrails.mjs:135` 硬要求 `video.fps === 24`。每次 render 命令必须带 `-f 24`，否则 mp4 / webm 流上是 30fps，meta 写 24 就和 ffprobe 对不上，guardrail 直接拒。
2. **CJK 高字重不能赌字体注入**。HyperFrames 字体注入只内置 `Noto Sans SC / Noto Serif SC`，PingFang SC / Source Han / Songti / 苹方 全部 unmapped；用 `font-weight: 900` 渲 `一 / 二 / 三 / 十` 这种横平竖直的字会直接画成 tofu 黑方块。若字形适合几何描述（基本笔画字），优先 CSS rect 拼。
3. **H5 official 资产命名禁带 `vN`**。`scripts/check-mobile-h5-guardrails.mjs:160` 用 `/v3|legacy|sample/i` 拦截，是为了挡掉历史 v3 占位资产。build 目录可以保留 `yi-gpt-image-2-production-v3`，但拷进 `src/clients/mobile-h5/assets/recognition/` 时必须改名（建议 `production` 或日期戳，不带 `vN`）。
4. **official + baked 不允许 `voiceCues`**。`scripts/check-mobile-h5-guardrails.mjs:168` 检查 `recognitionVideo.voiceCues` 长度；只要 `audioTrack.status === "baked"` 就不能再挂 Web Speech voiceCues 抢读。如果想留时间标记，写进 audio-plan，不要写进 H5 数据模型。
5. **版本号一定走 bump 脚本**。不要手改 `sw.js` 的 `VERSION`，会与 `index.html / app.js` 的 `?v=N` 标记错开，guardrail 报 `Mobile H5 resource versions must match`。统一用 `node scripts/bump-h5-version.mjs` 一次性同步 4 处。
6. **sw.js 加 RECOGNITION_SHELL**。新 official 视频的 mp4 / webm / narration.mp3 必须显式入 ASSET_CACHE（`safeAddAll([...IMAGE_SHELL, ...AUDIO_SHELL, ...RECOGNITION_SHELL])`），否则 PWA 离线打不开 P03。poster / final 走 IMAGE_SHELL。
7. **自定义 CJK 字体走 base64-inline subset，不要 url() 加载原 TTF**。HyperFrames 字体注入只覆盖 Noto 系，PingFang / 楷体 / 宋体都拿不到；本地 `src: url(font.ttf)` 加载又有 24MB+ 字体在 render 时来不及解码的风险。推荐链路：开源字体（如 LXGW WenKai v1.522）→ `pyftsubset --text="..."` 裁到本视频实际字符 → woff2 → base64 → inline 到 `@font-face`。subset 后通常 <10KB，第一帧就能用，`font-display: block` 也安心。
8. **自定义 `font-family` 命名要业务别名**。`@font-face` 里写 `font-family: "Yi Kaiti"`（业务别名），不要直接写原字体名 `"LXGW WenKai"`——避免和 HyperFrames 内部已知字体撞名导致预解析路径走错；引用方 `.glyph { font-family: ... }` 必须严格对齐 `@font-face` 的别名（HyperFrames 没有任何模糊匹配）。

## 2026-05-17 HyperFrames 内置 GSAP shim 时长硬编码踩雷

来自 `一` v3 第三轮迭代（米字格 + 笔顺示范段，详见 [[2026-05-16-一字gpt-image-2-production-v3正式版生产]] 三轮迭代节）。

### 现象

把视频时长从 7.4s 扩到 10s，meta.json 改了 `duration: 10`，audio padding 也补到 10.056s，HyperFrames lint/inspect 全过，render 出来的 mp4 也是 10s。但 t > 7.4 之后的所有帧（笔顺示范段）画面冻结在 7.4 处，米字格根本没出现。

### 误判

第一反应怀疑 `gsap.timeline().add(callback, position)` 的 callback 只在 timeline 实际播过 position 时触发，于是改成 `onUpdate(time => ...)` 全局 ticker，问题依旧。puppeteer 注入探针打 `tl.duration()` 返回 7.4，调 `tl.totalTime(9.9, false)` 也只跳到 7.4。

### 真因

HyperFrames build 目录下的 `assets/runtime/gsap.min.js` **不是真 GSAP**，而是一个约 65 行的 `MiniTimeline` shim，构造函数把 `totalDuration` 硬编码成 `7.4`：

```js
function MiniTimeline(d) {
  this._dur = d || 7.4;
  this._actions = [];
  this._time = 0;
}
MiniTimeline.prototype.seek = function (time) {
  this._time = Math.min(this._dur, Math.max(0, time));
  // ...trigger callbacks whose position <= this._time
};
window.gsap = {
  timeline: function () { return new MiniTimeline(7.4); }, // ← 出厂硬编码
  ...
};
```

任何 `seek(time > 7.4)` 都被 `Math.min` clamp 回 7.4，render 帧捕获脚本拿到的也只能是 t=7.4 的画面，但 timeline 内部不会报错。

### 修复

把 shim 工厂改成读 DOM `data-duration`：

```js
function resolveDuration() {
  var root = document.querySelector("[data-composition-id][data-duration]");
  if (root) {
    var d = Number(root.getAttribute("data-duration"));
    if (Number.isFinite(d) && d > 0) return d;
  }
  return 7.4;
}
window.gsap = {
  timeline: function () { return new MiniTimeline(resolveDuration()); },
  utils: { toArray: function (s) { return Array.from(document.querySelectorAll(s)); } }
};
```

`<div data-composition-id="..." data-duration="10">` 写到根容器后，shim 自动按合成实际时长走完整 timeline，render 出来的 10s 帧序列就完整了。

### 沉淀

- HyperFrames build 内 `runtime/gsap.min.js` 是工程实现细节，**不是真 GSAP**。复杂动画扩展时必读源码。
- 凡是要做 > 7.4s 视频或在多个时长之间切换合成的项目，必须先把 shim 工厂改成 duration-aware 版本，并在根容器写 `data-duration`。
- 检测办法：在 puppeteer 探针里 `gsap.timeline().duration()` 返回固定 7.4 就是中招了。
- 长期解法：要么把 HyperFrames 升级到嵌入真 GSAP 的版本，要么把这个 duration-aware shim 推回上游做缺省。

### 同时新增的辅助卡口

1. **音视频不等长用 ffmpeg apad 静音填充**：`ffmpeg -y -i in.mp3 -af "apad=whole_dur=N" -t N -codec:a libmp3lame -b:a 192k out.mp3`。视频含静默尾段（如笔顺示范）时这一步必做，否则 H5 端 `video.ended` 早于 `audio.ended` 会断教学节奏。
2. **clip-path inset 揭字法**：写笔顺示范不需要 SVG path stroke-dashoffset，在带顿笔特征的楷体字上叠 `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` 即可，字形对齐零误差，适合横/竖等单笔画字。
3. **guardrail duration 上限提升到 12s**：`scripts/check-mobile-h5-guardrails.mjs` 原硬约束 ≤ 8s 是为了挡 runaway 视频；增加笔顺示范段后必然超 8s，放宽到 12s 既保留语义又留余量。

## 2026-05-18 流程约束沉淀（笔顺尾段进规范）

v37/v3 三轮迭代和 v4 重构跑出来的"末段必须有米字格 + 笔顺"已经是事实标准，但前面只活在单字日志里，schema/validator/AGENTS 三层都没卡。这一节把它们正式落到流水线规则上。落地要点是**"涉及内容设计的（怎么画太阳、光带颜色）不进 Agent 文档；流程约束级的（必须有什么、不能有什么、必须按什么顺序）才进"**。

### 1. brief schema 新增 `teachingContract.strokeOrderTail`（必选）

`tools/recognition-video/schemas/brief.schema.json` 给 `teachingContract.required` 列表追加 `strokeOrderTail`，对象形状：

```jsonc
{
  "shotId":               "<tail shot id, must exist in shotPlan>",
  "startSeconds":         7.4,                    // 必须等于 tail shot 的 start
  "minSeconds":           2.5,                    // ≥ 1.5
  "container":            "mizige",               // const
  "containerStatePolicy": "single-mizige-dual-state",
  "narrationPolicy":      "silent",               // const
  "writingDirection":     "left-to-right" | "top-to-bottom" | "stroke-order-table",
  "description":          "..."
}
```

附加：`brief.duration` 上限从 8s 放宽到 **12s**（spoken body ≤ 8s + silent tail ≤ 4s），与 H5 guardrail 已经放宽的 12s 对齐。

### 2. `validate-teaching-harness.mjs` 校验逻辑

新增 `validateStrokeOrderTail`：

- `strokeOrderTail.shotId` 必须出现在 `shotPlan` 里。
- `startSeconds` 与 shot 的 `start` 误差 ≤ 0.05s。
- shot.duration ≥ `minSeconds`。
- shot.start ≥ `phraseBridge.shot.start + duration - 0.05`（必须排在意义/字形/收束之后）。
- shot 末端 ≤ `brief.duration + 0.05`。
- **任何 narration cue 都不能落在 tail 窗口内**（保证 narrationPolicy=silent 不只是写字面）。

duration 上限同步放宽到 12s。

### 3. `validate-audio-sync-plan.mjs` 双时长对齐改写

原约束：`targetDurationSeconds === brief.duration`（误差 0.1s）。

问题：v4 之后 brief.duration 是含静默尾段的总长，target 是 spoken body，二者本就该不等。

改写后规则：

- 若 audio-plan 没有 `paddedTotalDurationSeconds`：保留旧约束 `target ≈ brief.duration`。
- 若 audio-plan 有 `paddedTotalDurationSeconds`：用 padded 对齐 `brief.duration`（误差 0.1s），同时 `target ≤ brief.duration`。

这样：(1) 不带尾段的字用旧规则（向后兼容）；(2) 带尾段的字用新规则。两条路径都不放水。

### 4. AGENTS / SKILL 文档级硬约束

机器侧只能卡机器能验的事。下列不易机器化的，写进 `tools/recognition-video/AGENTS.md`（Stroke-Order Tail Contract / H5 Wiring Contract / HyperFrames Runtime Notes 三节）和 `codex-skill/starlight-video-agent/SKILL.md` 的 Hard Rules：

- 单一米字格双状态（识字态↔写字态 走 CSS 变量），**禁止前段 tianzige + 后段 mizige cross-fade** 这种两套并列的写法。
- 多笔画字必须按笔顺逐笔揭开，单笔画字才允许 `clip-path inset` 一次揭完。
- `hyperframes render` 必须显式 `-f 24`（HyperFrames 默认 30fps，guardrail 拒非 24）。
- 长于 7.4s 的合成必须给根容器写 `data-composition-id` + `data-duration`，否则被 MiniTimeline shim 静默 clamp。
- 音频比视频短时**必须 apad 补齐音频，禁止剪短视频**（视频末帧是 P03 poster，剪掉等于丢 poster）。
- H5 资产命名禁用 `/v3|legacy|sample/i`；版本号一律走 `node scripts/bump-h5-version.mjs` 一次性同步 sw.js / index.html / app.js / styles.css 四处。
- official baked 视频禁止同时声明 `voiceCues`（Web Speech 与 baked 互斥）。

主 `AGENTS.md` 加一段指向。

### 5. 为什么这些是流程约束而不是内容设计

界限：

| 内容设计（不进文档） | 流程约束（进文档/schema） |
|---|---|
| 太阳 halo 用 sprite 还是 CSS 实心 disk | 视频末段必须有米字格 + 笔顺示范 |
| 光带是暖金还是暖棕 | 米字格只用一格双状态，不准两套并列 |
| 楷体用 LXGW 还是其他开源字体 | 笔顺示范段必须静默无旁白 |
| 米字格虚线 stroke-dasharray 数值 | 笔顺方向必须是 canonical 的（横从左到右、竖从上到下） |

判断方法：**这条规则换一个字（人/木/水/火）还成立吗？** 成立则是流程约束，不成立则是内容设计。

### 6. 回归

四条 validator + `npm run check:h5` 在 v4（含尾段）和旧 v3 brief（被新约束按预期挡下）上的输出符合预期：

```
Recognition teaching harness ok: 1 pair(s).
Recognition audio sync plan ok: 1 triplet(s).
Recognition sprite validation ok: 1 manifest.
Starlight product video gate ok: 1 review(s).
Mobile H5 guardrails ok: v38 resources, legacy gate, visual audit hook, official video policy.
```

旧 v3 brief 跑 teaching-harness 时报：

```
- yi-gpt-image-2-production-v3: teachingContract.strokeOrderTail is required: every recognition video must end with a stroke-order demo inside a mizige.
```

这是预期行为：v3 已被 v4 取代，不需回填，新约束自然把它从"可入 official"路径上挡下。

### 7. 后续每个新字必须做的事

走流水线生成新字时（如下一个 二、三、人 字），brief 必填 `strokeOrderTail`，shotPlan 末尾必有一个 stroke-order-tail 镜头，audio-plan 末尾必有一个 `narration: "silent"` cue 覆盖整个 tail 窗口。这套规则与具体字无关，跟单字内容（光带怎么画、太阳什么颜色）解耦。

## 2026-05-19 cinematic 模式与单字成本边界

详见 [[../03-开发日志/2026-05-19-一字v5-cinematic正式版生产]]。

v4 → v5 把一字 official 视频 product-review 从 8.6 推到 **9.12**，方法是把 12s 从 4 段重排成 6 plate × 5 段叙事 + 双静默呼吸 + light-to-ink 0.9s 相变桥 + 双相 mask 区分笔感。这一节记录的是**叙事编排层面的复用边界**，不是单字内容设计。

### 1. cinematic 模式的可复用元素（任何字都成立）

- **N+1 镜头交叉溶解替代 N 段硬切**：每段间留 0.4-1.2s overlap，软切去掉"教学动画"的味道
- **双静默呼吸**：开场 0.5-1.0s 不旁白让色温构图先落地，收势 0.5s 静态停留作 poster 锚点
- **显式相变桥**：两个相邻语义段之间（如"光"→"墨"）插一张过渡 plate，0.6-1.0s 即可
- **米字格单 SVG + 单 CSS 变量双态**：识字态 0.18 → 写字态 0.30，GSAP 0.6s 插值；整片只一个米字格不切换不换形
- **双相 mask 区分笔感**：同一字 mask 两次但 softness 14→6 vs 2.5 恒定，前者读"渗"后者读"写"。多笔画字按笔顺逐笔重复此手法即可

### 2. cinematic 模式的不可复用部分（单字内容）

- 6 张 plate 的具体题材（晨雾山谷 / 暖金日轮 / 横向光带 / 光转墨 / 宣纸渗墨 / 握笔示范）是 `一` 字限定。其他字必须从字义重新设计 plate 题材，不能直接套用。
- 旁白 3 段诗化叙事（"天亮了" / "山那边升起一道光" / "就是「一」"）是 `一` 字限定。
- bird sprite 是 `一` 字 silentPrologue 的限定动态钩子；其他字 silentPrologue 该用什么钩子需重新设计。

### 3. 单字成本边界

v5 单字成本相比 v4 大幅上升：

| 项 | v4 | v5 |
|---|---|---|
| plate 数量 | 1 张主 plate + sprite halo | 6 张 plate + 1 组 sprite |
| brief shotPlan | 4 段 | 6 段（含 silent prologue / stroke-order tail） |
| asset-plan | 1 plate + 1 sprite | 6 plates + 1 sprite + 1 web font |
| audio-plan cues | 4 spoken | 3 spoken + 1 silent |
| 渲染时长 | 10s | 12s |
| GSAP 调度复杂度 | 单段 fade + sprite 帧 | 多 plate cross-dissolve + 双相 mask + CSS 变量插值 |

这意味着**不能盲目把 v5 模板铺给 unit-01 全部 20 字**。v5 是"标杆"证明 9.0+ 可达，不是"模板"。下一步应先用 v5 同方法做 1-2 个代表字（建议 `山` 或 `水`，笔画更多能更充分测试 strokeOrderTail 多笔画），验证哪些环节能模板化（如 mask softness 双相 / 米字格 CSS 变量 / 双静默呼吸 timing），哪些必须每字重做（plate 题材 / 旁白文本 / 钩子动画），再决定批量策略。

### 4. cinematic 模式与教学严谨性的张力

cinematic 模式偏向"短片"美学，节奏比"教学动画"慢。v5 对 4-6 岁孩子是甜蜜区，但对 3 岁低龄段静默序曲可能略沉。这是**美学风险**，不是**工艺缺陷**——product-review `childAppeal` 维度给 v5 8.9（v4 是 9.x），明确扣这 0.1 是承认这套美学比 Pinkfong 慢，年龄段偏 4-6 岁会更受用。

后续如果要做 3 岁专享变体，可以：

- 缩短 silentPrologue 到 0.3-0.5s（保留色温建立但不让孩子等太久）
- 增加 bird sprite 可见时长（从 1.0s 拉到 2.0s，给低龄段更多动态钩子）
- 可考虑加一段非教学性的"小动物路过"sprite 在 ink-glyph dwell 段（6.4-9.6s），但要严格不抢字形

这些都是**针对年龄段的调谐**，不属于 schema/validator 卡的硬约束。

## 2026-05-23 框架四洞修复

详见 [[../03-开发日志/2026-05-23-HyperFrames框架四洞修复]]。

[[../03-开发日志/2026-05-23-双盲框架yi-v8烟测与SKILL修复|双盲框架 yi-v8 烟测]]给出 jury overall **4.7 / blocked / 8 merged blockers**。这 8 条 blocker 是 v8 在 brief / tail-spec / audio-plan **每份单跑校验都过**的情况下偷渡出去的，意味着结构性矛盾不在 schema 视野里。这次把 8 条 blocker 折叠成 4 个洞补上，以便下一次 brief 阶段就拦下。

### 1. 4 个洞 → 4 个补丁

| 洞 | 漏过路径 | 补丁 |
|---|---|---|
| **Hole 1** brief ↔ tail-spec ↔ anchors 之间无 cross-file 一致性 | brief.finalFrame.description 是自由文本，跨文件无机器对照 | brief.schema 加结构化 `finalFrame.guideObject {form, anchor, entryDirection}` + `posterHoldSeconds`；tail-spec.schema 加 `finalFrame.pointerForm` 必填 enum；新增 [validate-cross-file-consistency.mjs](../../tools/recognition-video/scripts/validate-cross-file-consistency.mjs) 串 brief ↔ tail-spec ↔ anchors 三方对照 |
| **Hole 2** "看不出动画"挡不下 | brief 不要求声明运动幅度下限，也不要求声明 writing implement | brief.schema 加 `animationRequirements.shotMotion[]`（animationDriver enum + effectiveScaleDeltaPercent + effectiveTranslatePx + diegeticOverlayId）+ `writingImplements[]`（implementForm enum + tracksMaskFront=true）；新增 [validate-motion-readability.mjs](../../tools/recognition-video/scripts/validate-motion-readability.mjs) 卡 ken-burns ≥5% 或 ≥24px、写字段 shot 必须有跟随笔具 |
| **Hole 3** tail-spec 把"持久字层"误清 | clearLayerIds 没有反向"保留层"声明位 | tail-spec.schema 加 `transition.protectedLayerIds[]`；validate-tail-spec.mjs 加 overlap 检查（同一层不能同时被 clear 和 protect） |
| **Hole 4** 相邻 plate 之间无 continuity 契约 | shotPlan 各段独立、没字段表达"跟上段哪里挂上钩" | brief.schema 的 shotPlan[] 加 `continuityWithPrev`（sharedSubjectIds / sharedPaletteHueRange / transitionalElementId / transitionType）；新增 [validate-plate-continuity.mjs](../../tools/recognition-video/scripts/validate-plate-continuity.mjs) 默认 warn、`--strict` 报 error |

### 2. 反向回归测试已落地

`tools/recognition-video/briefs/regression/yi-v8-form-mismatch.brief.json` 与 `tools/recognition-video/tail-specs/regression/yi-v8-protected-overlap.tail-spec.json` 是**故意构造**的反向 fixture，跑两遍自检 fail-fast 触发：

```bash
npm run video:check-cross-file-regression  # 期望 fail，"|| echo expected-fail-ok" 兜
node tools/recognition-video/scripts/validate-tail-spec.mjs tools/recognition-video/tail-specs/regression/yi-v8-protected-overlap.tail-spec.json  # 期望 fail
```

jury 8 blockers 全部能在 brief 阶段被新框架结构性拦截，不再依赖跑到 render 后用双盲 review 兜底。

### 3. 新字 brief 必填字段（约束清单）

任何新字 brief（"一" v9 / 二 / 三 / 人 / 山 / 火）从今起必须声明：

1. `brief.finalFrame.guideObject.{form, anchor, entryDirection}`
2. `brief.finalFrame.posterHoldSeconds`
3. `brief.animationRequirements.shotMotion[]`，每个非 stroke-order-tail shot 一条
4. 写字段 shot 必须配 `brief.animationRequirements.writingImplements[].tracksMaskFront=true`
5. `brief.shotPlan[].continuityWithPrev` 每段对前段
6. tail-spec 必须有 `finalFrame.pointerForm` enum
7. tail-spec.transition `clearLayerIds` 与 `protectedLayerIds` 不能 overlap

### 4. 8 道闸（render 前必跑）

```bash
npm run video:check-narration-spec
npm run video:check-tail-spec
npm run video:check-cross-file        # 新
npm run video:check-motion-readability # 新
npm run video:check-plate-continuity  # 新（新字必须 --strict）
npm run video:check-audio-sync
npm run video:check-teaching-harness
npm run video:check-product-gate
```

8 道闸全过才进 render；render 完跑双盲 review。**双盲 review 现在只兜 schema 抓不到的纯审美问题**（plate 题材是否符合儿童偏好、旁白文本质感、bird sprite 抢不抢字形），不再兜 schema 本该兜的结构性矛盾。

### 5. 跟 [[../../memory/feedback_validator_pass_not_product_pass]] 的关系

memory 那条说"validator 全过 ≠ 产品合格"，这次不是要否定它，是补充：**v8 那次 validator 全过是因为 schema 没覆盖结构性矛盾，能补的就要补到 schema**。schema 永远拦不住"plate 题材是不是儿童会喜欢"这类纯审美问题，那部分仍需要双盲 review + 人眼。

## 2026-05-24 yi-v9 评审版：voiced-tail 与柔光教训

详见 [[../03-开发日志/2026-05-24-一字v9评审版太阳尾音优化]]。

yi-v9 用户评审时暴露了一个新的边界问题：**用户想看的评审版体验**和**official tail contract**不一定一致。本轮用户明确要求最后一声"一"在 stroke-order tail 里跟着光标沿横笔移动播放；而现有 official contract 明确要求 tail 静音。结论不是改 validator 放行，而是把两种产物分轨。

### 1. voiced-tail review 不能伪装 official

当尾段需要发声时，产物状态必须写清楚：

```text
candidateStatus: user-review-voiced-tail
officialStatus: blocked-by-silent-tail-contract
```

对应门禁失败是预期信号：

- `validate-narration-bake.mjs` 会报 tail cue 前的大静音 gap。
- `validate-audio-sync-plan.mjs` 会报 silent cue 与 spoken targetDuration 关系不成立。
- `validate-teaching-harness.mjs` 会报 narration cue 落入 strokeOrderTail。

这三个失败说明当前合同还没升级，不说明 MP4 渲染坏了。后续如果产品拍板"写字尾段要跟读"，必须升级 `Stroke-Order Tail Contract`、schema 和 validator，而不是给某个字开特例。

### 2. 太阳光束的可复用参数边界

用户对 yi-v9 第一版太阳光束的判断是正确的：硬三角、硬白柱、局部高亮都容易读成探照灯，不像太阳的自然光。

后续做"一轮太阳 / 一道光"这类画面时，优先使用多层低对比柔光：

| 层 | 用途 | 建议 |
|---|---|---|
| `sun-disc` | 太阳本体 | opacity 不宜高，边缘 blur 1-3px |
| `sun-corona` | 圆形大光晕 | 大尺寸、blur 30px+，不要硬边 |
| `sun-haze` | 源头雾化 | 宽、淡、低饱和 |
| `sun-ray` | 主光带 | opacity 约 0.12-0.18，blur 48-80px，mask 顶部慢进 |
| `sun-ray-thread` | "一道"的细读法 | 极弱，opacity 约 0.04-0.07，不能成为白色硬线 |

避免：

- `clip-path` 三角光束。
- 高 opacity 白色锥形。
- 太阳和光束不同源、不同方向。
- 光束突然亮起，缺少 `2s+` 的慢泛开。

### 3. 尾音同步看实际可听窗口

VTT 时间不是听感时间。TTS 源文件头尾常有静音，拉长后静音也会被拉长。要确认"最后一声一跟着光标走"，至少看四个点：

1. 光标到达横笔起点时间。
2. 光标到达横笔终点时间。
3. `silencedetect` 下最后一声实际可听起点。
4. `silencedetect` 下最后一声实际可听终点。

yi-v9 本轮最终状态：

```text
tail writing window: 9.35s - 10.75s
VTT cue: 9.350s - 10.700s
silencedetect -35dB audible window in rendered mp4: about 9.40s - 10.67s
```

这才算"贴住光标"。只把 VTT 写成 `9.35-10.70` 但不查实际可听窗口，仍可能出现孩子听到的声音滞后半秒。

### 4. 抽帧复看是硬流程

HyperFrames `lint / inspect / render` 证明"能渲染"，不证明"看起来正常"。太阳是否像太阳、光束是否突兀、光标是否真的沿横笔走，必须抽帧或看视频。

最低复看帧建议：

```text
sun onset: 3.3s
sun full / fade: 4.8s
tail start: 9.35s
tail middle: 10.0s
tail end: 10.75s
final hold: 11.8s
```

未来当用户追问"你自己看过吗"时，必须先有这些证据再回答。
