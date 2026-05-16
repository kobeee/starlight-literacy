---
tags: [开发日志, HyperFrames, 认字视频, gpt-image-2, edge-tts, baked-audio, Mobile-H5, official, 楷体, 田字格, 米字格, 笔顺, GSAP]
created: 2026-05-16
updated: 2026-05-17
---

# 2026-05-16 · 一 字 gpt-image-2 production v3 正式版生产

## 任务定义

用户要求：用最新 HyperFrames agent 流水线生成「百分百可上线」的 `一` 字正式版认字视频。硬约束：
- 生图必须使用 codex 内置 gpt-image-2（Responses API + image_generation tool），不使用 `/v1/images/generations`。
- 多帧 sprite 动画（10 帧 sun rise-glow）。
- 主带读用 edge-tts `zh-CN-XiaoxiaoNeural` rate -10% 烘焙，与 Unit-01 全字主带读女老师声保持一致。
- 一次性产出最终版，不要把中间态留给 H5。

## 产物清单

| 类型 | 路径 |
|---|---|
| build 目录 | `tools/recognition-video/builds/yi-gpt-image-2-production-v3/` |
| meta.json | 同上 `meta.json`，状态 `official` |
| product-review | `tools/recognition-video/product-reviews/yi-gpt-image-2-production-v3.product-review.json`，`decision: ready-for-official`，overall 8.3 |
| brief / asset-plan / audio-plan | 同前缀 `briefs / asset-plans / audio-plans` |
| sprite manifest | `tools/recognition-video/assets/unit-01/yi-gpt-image-2-production-v3/sprites/sun/rise-glow/manifest.json` |
| mp4 / webm | 24fps，1080×1920，7.4s。`renders/yi-gpt-image-2-production-v3.{mp4,webm}` |
| H5 资产 | `src/clients/mobile-h5/assets/recognition/yi/yi-gpt-image-2-production.{mp4,webm,poster.png,final.png,narration.mp3}` |

## 关键工艺路径

### 1. plate 与 sprite 全部走 codex 内置 gpt-image-2

明确生图调用是 Responses API + `image_generation` 工具（不是 `/v1/images/generations`）。proxy 暴露的封装模型是 `gpt-5.5`。

- plate：1024×1536 high 暖橙田园晨光，落地 1080×1920，画面无 raster 文字 / 水印 / UI。
- sprite：先用 `#00ff00` 绿色 chroma-key，halo 被绿色污染；换 `#ff00ff` 洋红重生 spritesheet，配合更严格的 prompt（halo 严禁 green/blue tint），最终落到带 alpha 的 10 帧 sun rise-glow。

### 2. 字形与笔画用 CSS rect，不用 HTML 文本

- 第一次把 `一` 渲成 `font-weight: 900` 文本节点，HyperFrames 字体注入只内置 Noto Sans SC / Serif SC，PingFang SC / Source Han / Songti 都没有映射，于是 weight 900 直接画成 tofu 黑方块。
- 修复方案：放弃 HTML 文本，直接用 `.glyph-stroke` div（500×80 圆角矩形，深棕 `#5D4A36`，带高光与投影）。因为 `一` 字本来就是一笔横画，几何上完全等价，且产品上更稳。
- 配套的金色横光也从 SVG `transform-origin` 改 div + radial-gradient，避开 SVG user-coordinate 默认原点不在中心的坑。

### 3. 音画同步硬卡口

- 旁白脚本：`一个太阳。一条光线。平平一横。就是一。`
- 4 段 cue：`0.1 / 1.638 / 3.305 / 5.041`，末段 `就是一` 后再保留 0.942s 静音让大字稳定可读 ≥2s。
- baked mp3 实测 7.464s，与 audio-plan target 7.4s 误差 0.064s，落在 0.35s 容差内。

### 4. product-review 与 --official gate

- 评 8 项：teachingStructure 8.5 / glyphBinding 8.4 / glyphAnchor 8.5 / pacing 8.3 / animationPerformance 8.0 / visualQuality 8.0 / childAppeal 8.3 / audioFit 8.2 / technicalCompliance 8.5 / officialReadiness 8.2。
- `validate-product-video-gate.mjs --official` 全过。

## H5 接入踩坑（5 条）

接入 `src/shared/unit-01.js` + `sw.js` 跑 `npm run check:h5` 第一次报 4 类错误：

1. **`v3` 命中 legacy/sample 正则**（`scripts/check-mobile-h5-guardrails.mjs:160`，`/v3|legacy|sample/i`）。这条 regex 是为了挡掉历史 v3 占位资产。
   - 修复：H5 侧文件名去掉 `-v3` 后缀，统一叫 `yi-gpt-image-2-production.{mp4,webm,...}`。build 目录保留 v3 作为版本号。

2. **fps mismatch 30 vs 24**。HyperFrames render 默认 30fps，guardrail 硬要求 24fps。
   - 修复：`npx hyperframes render -f 24 ...` 重渲 mp4 + webm。

3. **voiceCues 不允许出现在 official baked 视频上**（guardrail 行 168-170）。逻辑：既然有 baked 音轨，就不允许 Web Speech voiceCues 抢读。
   - 修复：从 `recognitionVideo` 上删掉 `voiceCues` 数组。

4. **版本号不一致**：手工把 `sw.js` 改 v36 但 `index.html / app.js` 还在 v35，guardrail `Mobile H5 resource versions must match` 报错。
   - 修复：先把 `sw.js` 改回 v35，再用 `node scripts/bump-h5-version.mjs` 把 4 处同步到 v36。

5. **sw.js 缓存新增 RECOGNITION_SHELL**：把 mp4 / webm / narration.mp3 加入 ASSET_CACHE，poster / final 加入 IMAGE_SHELL，install 时 `safeAddAll([...IMAGE_SHELL, ...AUDIO_SHELL, ...RECOGNITION_SHELL])`。

## 验收

```
Mobile H5 guardrails ok: v36 resources, legacy gate, visual audit hook, official video policy.
Mobile H5 learning flow ok: review priority, evidence gates, group quizzes and unlock gating are consistent.
Mobile H5 routing ok: 12 routes, 29 data-actions, all aligned with USER_FLOW.md.
Mobile H5 version ok: all markers at v36.

audit:h5:runtime → { ok: true, steps: 16, failures: 0 }
```

## 沉淀进知识库（3 条工艺）

1. **HyperFrames render 默认 30fps**：产品视频走 official gate 必须显式 `-f 24`，否则 guardrail 直接拒。
2. **CJK 字体高字重 fallback 不可靠**：HyperFrames 内置字体只映射到 Noto Sans / Serif SC，PingFang / Source Han / Songti 都没有。如果字形适合矩形描述（`一 / 二 / 三 / 十 / 工` 等），直接用 CSS rect 拼，比赌字体映射稳。
3. **H5 official 命名禁用 `v3`**：guardrail 用 `/v3|legacy|sample/i` 拦截，build 目录可以保留版本号，但 H5 侧资产命名应使用语义版本（`production` 或日期戳），不要带 `vN` 后缀。

## 不做项

- 没有做 sprite 透明背景（plate 上铺底已足够，sprite 走 chroma-key 即可）。
- 没有重做四组 review-sheet 帧，沿用旧 final-frames（24fps 重渲只动了视频流，poster / final / review-sheet 视觉差异肉眼不可分）。
- 没有动 `unit-01-baked-audio.js`（char / phrase / soundCue 是 P03 tap-to-play 音轨，recognitionVideo 的 narration 走独立的 `audioTrack.src`）。

---

## 二轮迭代（同日，~19:00）：楷体 + 半透明田字格

### 用户反馈

- 「'一' 字目前用的是什么字体呢」→ 实情：CSS rect 矩形，不是字体。
- 「我记得有一版是类似正楷的字体？是不是可以给汉字加个田宫格？稍微透明一些的，不要完全挡住背景。」→ 明确要求把大字 `一` 从 CSS rect 换成楷体，外面再裹一个半透明田字格。
- 「我强调一下，是动画视频中的 '一' 字字体，田宫格也是给这个字体加的哈」→ 锁定改造目标是视频末段 t≈5.041-7.4s 的大字。

### 工艺路径

1. **选字体**：开源 `LXGW WenKai`（霞鹜文楷）Medium v1.522，真楷体且自带起笔顿笔特征，符合儿童识字课本范式。
2. **绕开 HyperFrames 字体注入**：HyperFrames 只映射 Noto 系，自定义字体走 `@font-face` 注入也容易因 24MB TTF 加载超时导致 fallback。
   - 用 `pyftsubset --text="一个太阳条光线平横就是"` 把字体裁到 11 字符 → 3.2KB woff2。
   - base64 inline 到 `@font-face`，`font-family` 别名 `Yi Kaiti`（避免和 HyperFrames 内部预解析的 LXGW WenKai 名称冲突）。
   - 字号最终 520px / weight 500 / color `#5D4A36`，撑满田字格 560×560 容器。
3. **田字格**：`div#tianzige` + `::before`（横中线）+ `::after`（纵中线）。
   - 外框 `3px solid rgba(93,74,54,0.45)`，中线 `rgba(93,74,54,0.32)`，外加 `box-shadow: 0 2px 12px rgba(80,50,20,0.08)` 增加贴附感。
   - 半透明设计让背景的草原 + 远山 + 晨光透过来，符合用户「不要完全挡住背景」的诉求。
4. **时间线**：田字格 t=3.3s fade-in 到 0.85 opacity（先于字出现，给孩子心理预期），大字 t=5.041s 与旁白 `就是一` 同步亮起，scale 0.94 → 1.0。
5. **句子带轨道位移**：sentence-strip 从 track 7 移到 track 8，避免和新增的 tianzige、glyph 元素 lint 冲突。

### 一次踩坑

- 首次 base64 inline 后 `font-family` 写的是 `"Yi Kaiti"`，但 `.glyph` CSS 还在引用 `"LXGW WenKai"`，导致字体压根没生效，snapshot 显示 sans-serif fallback。修复：把 `.glyph` 的 font-family 改成 `"Yi Kaiti", "Noto Serif SC", serif`。
- 教训：自定义字体的 `@font-face` family 名 + 引用方的 `font-family` 必须严格对齐，HyperFrames 没有任何模糊匹配。

### 验收（v37）

- snapshot t=4.0 / 6.5 / 7.2 三帧：田字格半透明 + 楷体起笔/收笔顿笔特征清晰可见。
- product-review 文案同步更新：`assetAssessment.notes[2]` 改成 LXGW + base64 inline + 田字格描述，`evidence.keyframes[3]` 与 `actionReadability[3]` 同步。
- gate 复验：`validate-product-video-gate.mjs --official` 通过。
- H5 链路：`bump-h5-version.mjs` v36 → v37 同步 4 处；`check:h5` 全绿；`audit:h5:runtime` 16/16 步骤通过。

### 新增工艺沉淀（1 条）

**HyperFrames 自定义 CJK 字体推荐 base64-inline subset 路径**：
- 不要依赖 HyperFrames 字体注入（只覆盖 Noto 系）。
- 不要靠 TTF 文件 `src: url()` 直接加载（24MB 字体在 render 时可能加载不及时）。
- 推荐链路：开源字体 → pyftsubset 裁到本视频实际需要的 N 个字符 → woff2 → base64 → inline 到 `@font-face`。subset 后 typically <10KB，可在第一帧就用，font-display:block 也安心。
- 自定义 `font-family` 命名要避免和 HyperFrames 已知字体撞名（用 `Yi Kaiti` 这种业务别名），并确保引用方 `font-family` 严格一致。

---

## 三轮迭代（次日 2026-05-17）：米字格 + 笔顺示范 + 静默尾段

### 用户反馈

- 「再给字加个米字格，米字格不要透明，就是要像练字本那样，黑色实线外边框、内部用虚线作为辅助引导」
- 「米字格出来后，要按照笔顺把 '一' 字写出来；衔接要丝滑，新增段保留原动画视频的最后一帧背景」
- 「不要新增旁白，纯视觉；总长 +2.5s 走 10s」
- 「P03 进来要自动播带声音，不要等用户点」

### 工艺路径

1. **时间线扩展 7.4s → 10s**
   - 7.4-7.7s：半透明田字格 + 暖棕楷体 一 字 0.3s cross-fade 退出。
   - 7.7-8.2s：米字格淡入 + scale 0.95 → 1.0 上台。背景 plate 在米字格外框外保留，不切场。
   - 8.2-9.2s：黑色楷体 一 字（540px, `#2d2d2d`）通过 `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` 从左到右写出，模拟单笔横画起笔→走笔→收笔。
   - 9.2-10s：完成姿态保持。
   - 整体仍在 3-6 岁注意力窗口（10s）内。

2. **米字格构造（不透明字帖纸感）**
   - 外框：`4px solid #2d2d2d`，cream 高不透明背景 `rgba(255,250,240,0.96)`，`box-shadow` 给物理字帖纸贴附感。
   - 内部辅助线：inline SVG，4 条 `stroke-dasharray="10 6"` dashed lines（`#` 横纵中线 + `X` 对角线，stroke `#2d2d2d` 1.5px）。
   - 与上一段半透明田字格的"半透"对比鲜明：田字格服务于"识字"（透出物象），米字格服务于"写字"（像练字纸）。

3. **笔顺示范用同字体 clip-path 揭开**
   - 不用 SVG path stroke-dashoffset，直接复用同一 `Yi Kaiti` 楷体在米字格上层叠加，clip-path inset 从左 100% → 0% 揭开。
   - 起笔/走笔/收笔的顿笔特征自然由楷体字形给出，不需要 path animation。

4. **音频静默尾段（保持 audio/video 等长）**
   - 旁白只到 7.464s（原 4 段），笔顺示范段为静默。
   - `ffmpeg -y -i bak.mp3 -af "apad=whole_dur=10" -t 10 ...` 把 mp3 padding 到 10.056s。
   - audio-plan 新增第 5 个 cue `writing-demo`，`text=""`、`audioStart/audioEnd=null`、`narration: "silent"`。

5. **guardrail duration 上限 8s → 12s**
   - `scripts/check-mobile-h5-guardrails.mjs:131` 原硬约束 video.duration ≤ 8s 是为了挡住失控视频。
   - v37 一字增加笔顺段后必然超 8s，放宽到 12s 既保留"挡 runaway 视频"的语义，也给后续每个字加一段笔顺示范留余量。

### 关键踩坑：HyperFrames 内置 gsap.min.js 是 MiniTimeline shim，时长被硬编码

**症状**：把 `mizige` / `glyph-write` 元素和 GSAP timeline cue 全部加进去后，t=7.5 / 8.0 / 8.7 / 9.5 四帧 snapshot 内容完全一致，米字格根本没出现。

**误判一**：怀疑 `.add(callback, position)` 在 GSAP 里只在 timeline.totalDuration() 走过 position 时才被触发。改成 `onUpdate` 全局 ticker → 仍然空白。

**真因**：HyperFrames build 目录下的 `assets/runtime/gsap.min.js` 不是真 GSAP，而是一个 65 行的 `MiniTimeline` shim。它的构造函数把 `totalDuration` 硬编码成 `7.4`，`seek(time)` 内部 `this._time = Math.min(7.4, time)`，所以任何 `time > 7.4` 的捕帧都被 clamp 到 7.4。

**修复**：把 shim 的 `gsap.timeline()` 工厂改成读 DOM 上的 `data-duration`：

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

把 `<div data-composition-id="..." data-duration="10">` 写到根容器后，shim 自动按合成实际时长走完整 timeline。

**教训**：HyperFrames build 内 `runtime/gsap.min.js` 是工程实现细节而非真 GSAP，做超过它"出厂时长假设"的扩展时必读源码。

### H5 P03 自动播音修复

`hydrateRecognitionMedia` 之前在 baked-audio 路径硬写 `video.muted = true`，结果用户落到 P03 后视频静音播放，必须点重播按钮才能听到旁白——破坏了"进来就听"的教学节奏。

**修复策略**（先尝试有声 → 浏览器拦截则退到静音 + 首次触摸解锁）：

```js
if (hasBakedAudio) {
  video.muted = false;
  const audibleAttempt = video.play();
  audibleAttempt?.catch?.(() => {
    video.muted = true;
    stage?.classList.add("is-muted-autoplay");
    video.play()?.catch?.(() => { /* fallback */ });
    const unmuteOnce = () => {
      stage?.classList.remove("is-muted-autoplay");
      video.muted = false;
      video.currentTime = 0;
      video.play()?.catch?.(() => {});
    };
    document.addEventListener("pointerdown", unmuteOnce, { once: true, capture: true });
    document.addEventListener("touchstart", unmuteOnce, { once: true, capture: true, passive: true });
  });
  return;
}
```

`replay-recognition` action 同步从 `audible: false` 改为 `audible: true`，重播也带声。

audit:h5:runtime 在 headless 环境会出现一条 console warning「Unmuting failed and the element was paused because the user didn't interact with the document」——这正是兜底分支被触发的预期行为，正式浏览器有用户手势后无此 warning。

### 验收（v37 三轮迭代后）

| 项 | 结果 |
|---|---|
| product-review gate | `validate-product-video-gate.mjs --official` ✓ |
| video duration | mp4 10.021s / webm 10.042s |
| audio duration | narration.mp3 10.056s（apad 静音填充） |
| snapshot t=7.3 / 7.55 / 7.85 | 田字格淡出 → 米字格淡入丝滑无切场 |
| snapshot t=8.7 | 楷体 一 字约 50% 已写出 |
| snapshot t=9.5 / 9.9 | 完整楷体 一 字稳定停在米字格上 |
| `check:h5` | 全绿 v37 |
| `audit:h5:runtime` | 16/16 通过 |

### 新增工艺沉淀（4 条）

1. **HyperFrames build 内 `gsap.min.js` 是 MiniTimeline shim，不是真 GSAP**：默认 totalDuration=7.4 硬编码，做长视频要把工厂改成读 `data-duration`，否则 timeline 被 clamp 但不会报错。
2. **音视频不等长用 ffmpeg apad 静音填充**：`apad=whole_dur=N -t N` 保证 audio 严格等长且尾部静默，避免 H5 端 `ended` 事件错位。
3. **clip-path inset 揭字法**：在带顿笔特征的楷体上叠 `inset(0 100% 0 0) → inset(0)` 比 SVG path stroke-dashoffset 简单且字形对齐零误差，适合横/竖等单笔画字。
4. **H5 视频有声 autoplay 三段式兜底**：`audible play → catch 退 muted + ready 标志 → 首次 pointerdown/touchstart 解锁后 reset+play`。比一刀切 `muted=true` 教学节奏好得多。
