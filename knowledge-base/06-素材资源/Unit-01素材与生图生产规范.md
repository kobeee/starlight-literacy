---
tags: [素材资源, 生图, Unit-01, 插画规范, HyperFrames]
created: 2026-05-05
updated: 2026-05-10
---

# Unit-01 素材与生图生产规范

## 目标

生图工具要成为星光识字的资产生产能力，而不是临时美化手段。

后续 Unit-01 的图片资产分三类：

1. H5 native micro-lesson 使用的生活承载物和场景底板。
2. HyperFrames 视频使用的关键帧、物件 cutout、场景 plate。
3. 弱网 / reduced-motion 使用的 poster 和 final frame。

任何图片都必须服务汉字的字形、字音、字义记忆，不能只因为“可爱”而加入。

## 生图使用策略

### 1. 先生成视觉语法，不先生成 20 张散图

第一批不直接给 20 个字各生成一张插画，而是先建立可复用视觉语法：

| 资产 | 目的 |
|---|---|
| Unit-01 style board | 确认暖阳绘本、低饱和、纸感、光线和物件尺度 |
| 第 1 组场景 plate | 线条、数量、大小的生活环境 |
| 第 2 组场景 plate | 上下位置、身体动作、简单物件 |
| 第 3 组场景 plate | 日月水火山等自然象形 |
| 第 4 组场景 plate | 木土天目耳的自然和身体复认 |
| 代表物件 cutout | 苹果、小路、木板、小山、太阳、月亮、水流、火苗、树、土丘、手、眼、耳等 |

20 字逐字素材在视觉语法通过后再展开。

### 2. 汉字不交给生图画

生成图中默认不出现中文文字、拼音或 UI 文案。

原因：

- 生图容易画错字、写错拼音、生成不可控伪文字。
- 汉字教学需要清晰、稳定、可读，必须由代码 / 字体 / SVG / canvas 控制。
- 图片只负责生活物件、空间关系、光线和情绪。

例外：如果生成的是仅供内部灵感参考的 moodboard，可允许少量伪文字，但不得进入产品资产。

### 3. 生图输出必须落盘并记录

项目内使用的最终图必须落到 workspace，不能只留在默认生成目录。

推荐路径：

```text
src/clients/mobile-h5/assets/learning/unit-01/
  style/
  scenes/
  objects/
  posters/

tools/hyperframes-one/assets/unit-01/
  yi/
  er/
  san/
  ren/
  shan/
  huo/
```

命名建议：

```text
unit01-style-board-v1.png
group-01-line-count-scene-v1.png
object-apple-one-v1.png
object-path-line-v1.png
yi-video-keyframe-01-v1.png
```

同一资产迭代使用 `v2 / v3`，不覆盖正式已接入资产。

## 已落地资产（2026-05-10）

首批 Phase 3 资产已接入 Mobile H5：

```text
src/clients/mobile-h5/assets/learning/unit-01/style/
  unit01-style-board-v1.png
  unit01-style-board-v1-source.png

src/clients/mobile-h5/assets/learning/unit-01/scenes/
  group-01-line-count-scene-v1.png
  group-02-position-body-scene-v1.png
  group-03-nature-pictograph-scene-v1.png
  group-04-nature-body-review-scene-v1.png

src/shared/unit-01-visual-assets.js
scripts/check-unit-01-visual-assets.mjs
```

源图备份：

```text
tools/unit-01-assets/unit01-style-board-v1-source.png
```

H5 接入注意：`--unit-scene` 是 inline style 变量，URL 必须写成 `url(${scene.src})`，不能写 `url("${scene.src}")`，否则会被 HTML 属性双引号截断。该规则已写入 `scripts/check-unit-01-visual-assets.mjs`。

## 已落地资产（2026-05-30 · iOS scene-assets 实物图卡）

iOS / Unit-01 认读绑定与看图认字所需的实物图卡已补齐 20/20。当前只确认素材库存，不代表已经接入 iOS `Assets.xcassets`。

```text
tools/recognition-video/assets/unit-01/scene-assets/
  yi.png
  er.png
  san.png
  ren.png
  kou.png
  shou.png
  ri.png
  yue.png
  shan.png
  shui.png
  huo.png
  mu.png
  mu-eye.png
  er-ear.png
  tian.png
  da.png
  xiao.png
  shang.png
  xia.png
  tu.png
  _overview.png
  raw/
    <same 20 ids>.png
```

验收记录：

- 正图 20/20，raw 源图 20/20。
- 正图全部为 `1024x1024 RGBA` 透明 PNG。
- `_overview.png` 为总览图，`1500x1200 RGB`，仅用于 review。
- 画面中不得出现中文、拼音、数字、箭头、UI、标签、水印。

生成路径：

```bash
node tools/recognition-video/scripts/build-scene-assets.mjs \
  --only yi,er,san,xiao,shang,xia \
  --concurrency 2

node tools/recognition-video/scripts/build-scene-assets.mjs \
  --only yi,shang \
  --force \
  --concurrency 2
```

当前环境不要再假设 `codex exec` 有可用 image-generation tool。可靠路径是 `aicodewith proxy + Responses API image_generation + gpt-image-2`，先生成品红 `#ff00ff` chroma-key 图，再由 `tools/recognition-video/scripts/chroma-key-to-alpha.py` 抠为透明 PNG。

### 2026-05-31 补充：`一` scene 图优化

`scene_yi` 已从容易看成厚木盘 / 托盘的旧图，优化为**一根横放木质计数棒**，用于表达「一个 / 一件」。

已更新：

```text
tools/recognition-video/assets/unit-01/scene-assets/yi.png
tools/recognition-video/assets/unit-01/scene-assets/raw/yi.png
tools/recognition-video/assets/unit-01/scene-assets/_overview.png
src/clients/iOS/StarlightLiteracy/Assets.xcassets/scene_yi.imageset/
```

本轮生成使用内置 `imagegen` + 绿色 chroma-key `#00ff00`，再用 `remove_chroma_key.py` 本地抠透明。绿色 key 比品红 key 在该木质主体边缘更干净。

## 已落地资产（2026-05-30 · iOS App 资产目录接入）

iOS 原生 App 已生成并接入 `Assets.xcassets`：

```text
src/clients/iOS/StarlightLiteracy/Assets.xcassets/
  scene_<id>.imageset/        # Unit-01 20/20 实物 / 看图认字图
  oracle_<id>.imageset/       # 14 个字源彩蛋模板图
  AppIcon.appiconset/
  LaunchBrand.imageset/
  ShareCard.imageset/
```

复用脚本与字源 SVG 源：

```text
tools/ios-assets/generate-ios-image-assets.mjs
tools/ios-assets/oracle-svg/
```

接入范围：

- `P03RecognizeView` / `P05ImageCardView` / `P01MapView` 已使用 `scene_*`。
- `P03EtymologyView` 已使用 `实物图 -> 甲骨模板图 -> 今字`。
- 字源彩蛋显式清单：`ren kou shou ri yue shan shui huo mu mu-eye er-ear tian da tu`。
- 指事字 `yi er san xiao shang xia` 不做字源彩蛋，只使用实物承载图做认读 / 看图认字。
- `shou` 当前用本地手形线稿源兜底，2026-05-31 已修复 iOS `oracle_shou` 空图问题；后续找到可验证甲骨 SVG 时替换 `tools/ios-assets/oracle-svg/shou-oracle.svg` 后重跑脚本。

仍未完成：

- `shou` 仍需更权威的甲骨源替换本地兜底。

### 2026-05-31 补充：`手` oracle 空图修复

`oracle_shou@3x.png` 曾是全透明空图（`maxAlpha=0`）。根因是本地 `shou-oracle.svg` 使用 `stroke` 线条，而当前 ImageMagick SVG 栅格化路径不吃 stroke，导致输出透明空图。

本轮已将：

```text
tools/ios-assets/oracle-svg/shou-oracle.svg
```

转成当前管线可栅格化的填充型 SVG，并重生成：

```text
src/clients/iOS/StarlightLiteracy/Assets.xcassets/oracle_shou.imageset/
  oracle_shou@1x.png
  oracle_shou@2x.png
  oracle_shou@3x.png
```

验证：14 个 `oracle_*@3x.png` 均 `alphaMax=1`，`oracle_shou` 不再是空图。

注意：这只是修复“可见性 / 非空图”问题，不等于已找到权威 `手` 甲骨来源。后续仍应优先替换为可验证 CC0 / Commons 来源。

## Prompt 基准

### 通用风格段

```text
Warm pastoral children's picture-book illustration for a Chinese literacy app, ages 3-6.
Cream paper texture, honey sunlight, low-saturation warm colors, soft gouache and colored-pencil feel.
Simple composition, tactile rounded shapes, calm and joyful, premium children's book taste.
No neon, no dark fantasy, no purple-blue gradient, no sticker collage, no glossy 3D, no UI chrome.
No Chinese characters, no pinyin, no readable text, no watermark.
```

### 透明物件 cutout 段

2026-05-15 调研结论：gpt-image-2 已经能稳定输出真正的 RGBA 透明 PNG，前提是 prompt 明确要求 "transparent PNG with alpha channel (RGBA)" 并禁掉一切背景元素。主路径走透明，chroma-key 仅作为 fallback。

主路径（透明 PNG，优先）：

```text
Output as a transparent PNG with an alpha channel (RGBA). The background must be fully transparent (alpha = 0).
No backdrop, no floor plane, no cast shadow, no contact shadow, no halo, no gradient, no checker, no watermark.
Keep the subject fully isolated with crisp anti-aliased edges and generous padding.
```

Fallback（chroma-key，仅当模型不出透明时使用）：

```text
Create the subject on a perfectly flat solid #00ff00 chroma-key background for background removal.
The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Keep the subject fully separated from the background with crisp edges and generous padding.
Do not use #00ff00 anywhere in the subject.
No cast shadow, no contact shadow, no reflection, no watermark, and no text.
```

切换原则：透明 prompt 一次失败立刻切 chroma-key prompt，不要反复重试同一 prompt 烧 token。抠色失败时不硬接入产品，重新生成或改为非透明场景 plate。

### HyperFrames 多帧 spritesheet 段

HyperFrames 动画里的同一角色 / 物件动作，必须让生图工具**一次**生成一张完整的 spritesheet。不允许用脚本把多张单帧生图拼成 grid——风格会漂、相邻帧像素一致会被 validator 拦下。

推荐格式（透明 PNG 主路径）：

```text
Create one clean animation spritesheet with 2 rows and 5 columns.
Each cell shows the same subject in a consecutive pose of one simple action.
Keep the subject identity, scale, camera angle, lighting, paper texture, line weight, and color palette consistent across all cells.
Save the result as a transparent PNG with an alpha channel (RGBA). The background of every cell must be fully transparent.
No grid lines, no labels, no numbers, no Chinese characters, no pinyin, no readable text, no watermark.
Leave generous padding around the subject in every cell.
```

Fallback 格式（chroma-key，仅当透明输出失败时切换一次）：

```text
[...same header...]
Use a perfectly flat solid #00ff00 chroma-key background in every cell. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
```

生图落盘后必须用标准脚本拆帧、检测 alpha（或回退抠色）、居中、生成 manifest 和 review sheet：

```bash
npm run video:prepare-spritesheet -- \
  --input <generated-spritesheet.png> \
  --output tools/recognition-video/assets/unit-01/<char-id>/sprites/<actor>/<action> \
  --character-id <char-id> \
  --actor <actor> \
  --action <action> \
  --rows 2 \
  --cols 5 \
  --mode auto \
  --required-motion-parts part-a,part-b
```

`--mode auto` 会先检测 RGBA alpha；没有真 alpha 时自动回退 chroma-key。也可显式 `--mode transparent` 强制要求真 alpha（不达标直接 fail-fast，不重试）。脚本会输出 `source-spritesheet.png`、`frame-000.png ...`、`manifest.json` 和 `review-sheet.png`，并默认运行 `validate-sprite-assets.mjs`。没有通过这一步的 spritesheet 不进入 HyperFrames 装配。

## Unit-01 代表资产 brief

### 线条数量

| 字 | 推荐承载物 | 禁止方向 |
|---|---|---|
| 一 | 一个苹果、一条小路、一根木棒 | 裸横线、过度抽象符号 |
| 二 | 两块木板、两层台阶、两片云 | 两条孤立横线 |
| 三 | 三座小山、三条田埂、三层矮台 | 三根线排排站 |

### 大小位置

| 字 | 推荐承载物 | 禁止方向 |
|---|---|---|
| 大 | 孩子张开手臂、树冠展开 | 巨大怪兽、夸张压迫感 |
| 小 | 小种子、小脚印、小花苞 | 可爱但无形状关系的小图标 |
| 上 | 气球上升、太阳在山上 | 箭头符号代替教学 |
| 下 | 雨滴落下、果子掉到篮子里 | 单纯向下箭头 |
| 天 | 大字上方多一横、天空盖在头顶 | 大片天空但看不出字形 |

### 身体器官

| 字 | 推荐承载物 | 禁止方向 |
|---|---|---|
| 人 | 两笔支撑像人站稳 | 复杂人物插画抢字 |
| 口 | 小口唱歌、方形窗/洞口 | 只画一个嘴唇 |
| 手 | 小手挥一挥、手掌轮廓 | 真实手部细节过重 |
| 目 | 眼睛里一横、方框内横线 | 写实眼球 |
| 耳 | 耳朵轮廓和内侧线条 | 医学结构图 |

### 自然象形

| 字 | 推荐承载物 | 禁止方向 |
|---|---|---|
| 日 | 方框里的太阳光 | 只画太阳不回到字形 |
| 月 | 月牙和内侧两条光线 | 暗夜蓝紫氛围 |
| 水 | 小溪分流 | 水花特效抢戏 |
| 火 | 火苗跳动后高亮点撇 | 烟花、爆炸、危险大火 |
| 山 | 三座山峰站起来 | 巨大山景无字形归纳 |
| 木 | 树干和树枝 | 森林大场面 |
| 土 | 地面一竖两横 | 泥土贴图无结构 |

## 图片验收标准

每张图接入前至少检查：

- 是否能一眼看出它服务哪个字形钩子。
- 是否与田园暖彩、暖阳绘本语境一致。
- 是否没有伪文字、错误汉字、错误拼音。
- 是否没有高饱和霓虹、紫蓝梦幻、贴纸堆叠、过度 3D。
- 是否主体清楚，能在 390px 宽手机屏看懂。
- 是否不会让角色、动物、场景抢走汉字本身。
- 是否能复用到同一范式的其他字，而不是孤立特例。

## 与 HyperFrames 的关系

HyperFrames 视频需要图片时，先从同一套资产库取：

```text
课程字段 assetBrief
  -> 生图生成物件 / keyframe
  -> HyperFrames composition
  -> poster / final frame 回流 H5
```

不要在 HyperFrames 目录里临时生成一套与 H5 风格不同的图。视频资产和 H5 资产应该共享同一个视觉系统。

## 生产顺序

1. Unit-01 style board。
2. 四组场景 plate。
3. `一` 标准样片所需物件和关键帧。
4. `二 / 三 / 人 / 山 / 火` 代表字物件。
5. 20 字完整 native micro-lesson 所需补图。
6. 批量视频生产所需 keyframes。
