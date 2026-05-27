---
characterId: yi-v5-cinematic
character: 一
pinyin: yī
unitId: unit-01
duration: 12s (was 10s in v4 — extended for narrative breathing room within strokeOrderTail silent constraint)
created: 2026-05-18
status: draft-v3 (4 open questions resolved + schema 妥协对齐 brief/asset-plan/audio-plan 三件套已生成并通过 validator)
supersedes: yi-gpt-image-2-production-v4
authoredBy: claude-opus-4-7 (CC)
generatedBy: codex-internal gpt-image-2 (image_generation tool)
---

# 「一」v5 · Cinematic Recognition Short · Art Director's Bible

## 0. 一句话定义

> **不是"汉字教学动画外面包装配景"，而是"一支关于「一」的 12 秒电影短片，里面嵌着一个汉字"。**

整片由 codex 内置 `gpt-image-2` 全力发挥生成 6-8 张完整 cinematic plate（每张都是一帧"剧照"），HyperFrames 只做镜头切换 / 推拉 / cutout 分层 / 字形诞生层的工程装配。**禁止再让 plate 留白等 CSS 补天**。

---

## 1. 美学定位

### 1.1 对标谱系（按相关性排序）

| # | 标杆 | 我们要拿走的东西 | 我们不拿的东西 |
|---|---|---|---|
| 1 | **Tonko House《The Dam Keeper》《Pig》** | 油画/手绘质感、光的物质感、孤独诗意、近无对白的情绪密度 | 阴郁、灾难叙事 |
| 2 | **Cartoon Saloon《Song of the Sea》《Wolfwalkers》** | 装饰性平面 + 凯尔特线条 + 大量留白 + 暖冷对位 | 凯尔特符号、神话角色 |
| 3 | **宫崎骏《起风了》《侧耳倾听》开场段** | 空气感、风的物质感、晨昏的色温、远景人物剪影 | 工业齿轮美学、战时元素 |
| 4 | **追光《长安三万里》、彩条屋《大鱼海棠》** | 东方水墨工笔电影化、宣纸质感、留白即叙事、青绿山水色板的现代化 | 神话叙事、武打 |
| 5 | **中国诗意绘本：熊亮《小石狮》《年》、九儿《妹妹的大南瓜》、蔡皋《桃花源的故事》** | 传统美学但不土、童趣不卖乖、墨韵 + 暖色低饱和、留白经营 | 民俗符号堆砌 |
| 6 | **Pixar 短片：Piper / Bao / Sanjay's Super Team** | 极简叙事下的情绪密度、镜头语言克制、单一情感弧线 | 卡通弹性变形 |
| 7 | **酒井驹子《虫子先生》、Jon Klassen《这不是我的帽子》** | 绘本级克制色彩、北欧式留白幽默、单一色温滤镜 | 极简到无情绪 |

### 1.2 反对的对标

> 这些是当前儿童识字赛道的天花板，**v5 明确不对标**：

- **洪恩识字 / 巧虎 / 多多识字 / Pinkfong**：色彩塑料化、动效弹跳化、配音卖萌化。工业流水线产物，无艺术。
- **欧美 educational YouTube**（CoComelon / Super Simple Songs）：3D 软糖渲染，质感低、感官刺激重。
- **当前 v4 自己**：留白草地 + CSS 橘黄甜豆 + chroma-key 残绿 + 三层 filter 抢救。是上述三类的本土低配版本。

### 1.3 v5 一句话风格

> **"一场宫崎骏开场段的晨光，渲染在追光长安三万里的宣纸上，配一段 Jon Klassen 式克制的旁白。"**

如果未来要扩展到 20 字流水线，**这个风格定义就是 character bible 的根**，所有 plate 都必须能被这句话辐射到。

---

## 2. 色板（v5 收紧到一套晨光低饱和色温滤镜）

### 2.1 主色

| 角色 | hex | 用途 |
|---|---|---|
| 黎明暗紫 | `#3a3550` | t=0-2s 山坳天空、剪影底色 |
| 黎明暖灰 | `#5d5366` | t=0-2s 远山轮廓、雾层 |
| 晨光起色 | `#f4b06a` | t=2-4s 地平线刚破云时的金色 |
| 晨光满色 | `#ffd071` | t=2-6s 晨光带主色、丁达尔光 |
| 晨光高光 | `#fff3c8` | t=4-6s 光带核心、纸面反光 |
| 宣纸底 | `#f5ead0` | t=6-10s 字形诞生段纸面 |
| 墨色 | `#1f1a14` | t=6-10s 楷体「一」、笔顺 |
| 暖棕（既有体系） | `#5D4A36` | 米字格水印、辅助线、暖光过渡 |
| 山色（淡墨） | `#8a8470` | 远山线条、扫尾段 |

### 2.2 严禁色

- 任何饱和度 > 60% 的颜色（卡通塑料感）
- 紫蓝、洋红、霓虹绿、薄荷蓝（v4 chroma-key 时代的残留色温）
- 任何 pure white `#ffffff`（破坏宣纸 + 油画统一滤镜）
- 任何 pure black `#000000`（除楷体墨色 `#1f1a14`，已偏暖）

### 2.3 滤镜锚

整片必须读起来像**同一台相机在 5:30 AM 拍的**：色温 3200K 偏暖、低对比、有微微的胶片颗粒（gpt-image-2 自带 paper grain）。任何一张 plate 出图后第一件事是放进 review-sheet 比对色温，**色温飘移 > 一档直接重生**。

---

## 3. 角色 bible（不是 mascot，是自然元素）

**v5 不要 5-6 个固定 mascot 兔鸟松鼠围观**——那是洪恩思路。v5 的"角色"是自然元素，全部以剪影/远景/局部呈现，从不正面卖萌：

| 角色 | 形态约束 | 出现位置 |
|---|---|---|
| **远山** | 单层墨色剪影，无细节，无树木点缀 | 全片地平线 |
| **村庄一盏灯** | 远景中一个温暖的橙色光点，约 8x8px 物理尺寸 | t=0-2s 左下角 |
| **晨雾** | 横向流动的低密度雾带，与晨光交融 | t=2-6s 地平线上方 |
| **一只飞鸟** | 远景剪影，约 12px 大小，从画面右下飞向左上 | t=0-2s |
| **风** | 不可见，通过草叶轻微倾斜表达 | 全片 |
| **晨光（丁达尔光）** | 物理化的光柱，可见有粒子 | t=2-6s |
| **宣纸** | 有手工纹理、有边缘茶渍、有竖纹 | t=6-10s |
| **一只孩子的手**（仅末段） | 远景手腕到指尖，肤色低饱和暖米 | t=8-10s 摹字 |

**Character bible reference 图**：D2 要单独生 6-8 张 character reference（远山一张、晨雾一张、飞鸟剪影一张、丁达尔光一张、宣纸纹理一张、孩子手一张），后续所有 plate 用 `reference_image` 引用这些 ref，**锁角色一致性**。

---

## 4. 镜头语言

> **brief.json schema 卡了 shot.duration ≥ 1.0s 与 spoken target ≤ 8s 两条硬线**，所以 v5 落到 brief 的实际是 **5 个 shot**：把原稿的 `light-to-ink` 作为 transition frame **并入 `ink-glyph` 段开头 0.5s 的 cross-dissolve**，由 CSS 完成；不再作为独立 shot。视觉上仍是 6 张 plate 6 个画面节拍，但 brief 时间线只有 5 个 shot 单元。

| 镜头号 | brief shot id | 时间 | 镜头类型 | 焦点 | 运镜 | 旁白？ |
|---|---|---|---|---|---|---|
| 1 | `dawn-valley` | 0.0-1.0s | 远景 (wide) | 山坳整体氛围 | 静止 + 0.5% Ken Burns 缓推 | silent prologue |
| 2 | `sun-rising` | 1.0-2.4s | 中景 (medium) | 地平线 + 晨光初破 | Ken Burns 缓推近 6% | **cue1 "天亮了。"** (1.0-2.3s) |
| 3 | `light-band` | 2.4-5.9s | 特写 (close-up) | 光带凝固成一笔 | 静止 + 0.3% 呼吸 | **cue2 "山那边升起一道光。"** (2.4-5.8s) |
| 4 | `ink-glyph` | 5.9-10.0s | 特写 (close-up) | 光化为墨 → 楷体一字渗墨 → silent dwell | 0-0.5s cross-dissolve `light-to-ink-plate` 进 `ink-glyph-plate` + 米字格水印淡入 + mask-gradient 渗墨动画 → 静止 hold | **cue3 "就是「一」。"** (5.9-7.4s) + 2.6s silent dwell |
| 5 | `stroke-order-tail` | 10.0-12.0s | 中景 (medium) | 米字格水印 识字→写字 切换 + 二次渗墨笔顺 + 孩子摹字 | 静止 + 阳光从右上斜入 | **silent (tail)** |

**镜头语言硬规则**：
- **绝不切硬切**：所有镜头切换用 cross-dissolve 0.3-0.6s 完成
- **绝不弹跳/缩放/旋转**：所有运镜限于 Ken Burns（位移 + 缩放线性插值）
- **绝不放大字幕**：拼音/句子条永远在画面边缘小字号，不入主视觉
- **每秒最多 0.6 次场景变化**（与 v4 一致，沿用 pacing 约束）

---

## 5. 分镜板（6 张 cinematic plate，其中 light-to-ink 作为 ink-glyph 段开头 0.5s 的 cross-dissolve 帧）

> brief.json 实际只有 5 个 shot：plate 1/2/3/6 各对应一个 shot（dawn-valley / sun-rising / light-band / stroke-order-tail），plate 4 (light-to-ink) + plate 5 (ink-glyph) 合并到 `ink-glyph` shot 内通过 CSS cross-dissolve 完成（plate 4 仅作为前 0.5s 过渡帧出现）。视觉上仍是 6 张 plate 6 个画面节拍，但 brief 时间线只有 5 个 shot 单元。

> 每张 plate 都是**完整剧照**，gpt-image-2 全力发挥。**禁止再写 `no sun / no halo / no rays` 阉割条款**。
> 每个 prompt 都已经按 codex `image_generation` tool 的输入规范写好，可直接复制使用。
> 命名：`{shot-id}-plate.png`，分辨率 1024×1536（gpt-image-2 portrait 上限），后期统一 center-crop 到 1080×1920。

### Plate 1: `dawn-valley` (t=0.0-1.0s, 远景, silent prologue, brief shot=dawn-valley)

**剧照**：黎明前 5:30 AM 的山坳。深紫天空（`#3a3550`）占上 2/3，远山墨色剪影（`#5d5366`）勾出地平线，左下角村庄一盏暖橙小光点（`#f4b06a`），地平线上方有薄雾带。前景是低饱和暖灰草坡，几根草叶在风中微微倾斜。**画面右下角有一只远景飞鸟剪影从画面外掠入**。整体色温冷偏紫，留出晨光即将打破的呼吸感。

**Codex prompt**（直接喂给 codex `image_generation` tool）：

```text
A cinematic dawn landscape painting in the visual language of Tonko House and Studio Ghibli, blended with traditional Chinese ink-wash painting (水墨) sensibility. Vertical 1024x1536 portrait composition.

Setting: A quiet mountain valley at 5:30 AM, just before sunrise. The deep violet pre-dawn sky (#3a3550) occupies the upper two-thirds. Distant mountain silhouettes (#5d5366) form a low horizon ridge along the lower-middle, painted with the softness of sumi-e ink wash. A single tiny warm-orange light from a faraway village house glows in the lower-left middle-ground (about 8 pixels, just a warm pinprick of #f4b06a). Soft horizontal mist drifts above the mountain ridge, painted as gentle low-density brushstrokes.

Foreground: A low warm-gray meadow slope with a few scattered tall grass blades leaning very slightly to the left as if a gentle dawn breeze just passed through. The foreground is dim, painted with the textural quality of oil on paper.

Subject of motion: In the lower-right area of the frame, a single tiny silhouette of a bird in flight (about 12 pixels), captured mid-wingbeat, heading toward the upper-left. The bird is pure dark silhouette, no detail.

Mood: Quiet, anticipatory, the moment just before the world wakes up. Lonely poetic stillness. Like the opening shot of a Hayao Miyazaki film.

Style: Oil-on-paper painterly texture with visible brushstrokes. Atmospheric perspective—distant mountains lose detail to soft warm-gray mist. Color palette strictly low-saturation: deep cool violets, warm grays, a single warm spark. No saturated colors, no neon, no cartoon outlines, no pure black, no pure white. Subtle paper grain texture overlay.

Composition: The horizon sits at about 60% from the top, leaving the upper sky as the dominant emotional space. The single warm light spark anchors the lower-left rule-of-thirds intersection. The bird silhouette anchors the lower-right intersection.

Camera: Wide establishing shot, slight high angle. Field of view roughly 35mm equivalent.

Lighting: Pre-dawn ambient only. No direct sunlight yet—the sky has the faintest hint of warmth in the lowest horizon band hinting that sunrise is about to happen, but no actual sun visible.

Strict constraints: No text, no Chinese characters, no pinyin, no logos, no watermark, no UI elements, no human figures (except the implied distant village light), no animals in foreground, no cartoon mascots, no smiling faces, no plastic 3D rendering, no glossy surfaces, no chroma-key backdrops.
```

**验收**：远山有"墨晕开"的笔触感、天空有色温过渡（顶部纯紫→地平线微暖）、村庄光点不能大于 10px、飞鸟剪影必须可辨且不大于 14px、整体偏冷。

---

### Plate 2: `sun-rising` (t=1.0-2.4s, 中景推近, 旁白"天亮了。"在 1.0-2.3s, brief shot=sun-rising)

**剧照**：天空开始转色，地平线后方一道金色光（`#f4b06a → #ffd071`）正在刺破云层，丁达尔光柱可见有微粒。远山被光打亮上缘，剪影变成暖墨色。雾带在光中变成金雾。**这是整片唯一一张"晨光初破"的瞬间剧照**。

**Codex prompt**：

```text
A cinematic sunrise breaking moment painting, same visual language and style as the dawn valley reference: Tonko House + Studio Ghibli + Chinese ink-wash. Vertical 1024x1536 portrait. SAME mountain silhouette shape, SAME composition layout as the dawn valley plate—this is the same place 90 seconds later as sunrise begins.

Key transformation from dawn: The horizon now glows. A single warm golden light source (#f4b06a fading outward to #ffd071) is breaking through behind the mountain ridge at center-frame. Visible volumetric god-rays (丁达尔光, Tyndall light) fan upward and slightly outward from this point, painted as soft warm-gold light beams with visible mist particles catching the light. The mist that was cool gray now glows warm gold where the light passes through it.

Sky: The upper portion is still deep violet-blue but transitioning at the horizon—gradient from #3a3550 at the very top down through warmer grays to a glowing warm-cream band just above the mountain. No hard sun disk visible yet—just the source glow behind the mountain and the light beams escaping into the air.

Mountains: Distant silhouettes now rim-lit along their upper edges with a thin warm-gold line, painted with the softness of sumi-e—no hard edge. The mountains remain mostly silhouette but their top contour is kissed by light.

Mist: Horizontal mist bands above the ridge now glow warm gold where the god-rays pass through, cool gray where they don't. Treat the mist as a physical material catching light.

Foreground: Same warm-gray meadow as the dawn plate, slightly more warmth creeping in from the back lighting. The few tall grass blades now have a faint rim light on their right edges.

Mood: The hush of the world about to wake. Awe. Sacred quiet. Like the moment Howl's Moving Castle opens, or the dam-keeper's first morning.

Style: Oil-on-paper painterly texture with visible directional brushstrokes following the god-rays. Atmospheric perspective preserved. Strictly low-saturation warm palette—golden warmth never tips into saturated orange or yellow. Color must read as "candlelight through dawn mist," not "neon."

Composition: Identical to the dawn plate so the transition reads as time-passing, not scene-changing. Light source is dead-center horizontally, just behind the highest mountain peak. God-rays fan upward and outward, with the brightest ray slightly tilted to suggest the sun is rising at an angle.

Camera: Same wide-medium framing as dawn plate. Slight zoom-in (about 6% tighter) to give a sense of the camera leaning toward the light.

Strict constraints: No text, no Chinese characters, no pinyin, no logos, no watermark, no UI elements, no human figures, no animals, no cartoon mascots, no smiling faces, no plastic 3D rendering, no glossy surfaces, no chroma-key backdrops, no fully-formed sun disk, no lens flare circles, no anime-style cross-shaped sparkle, no candy-bright colors.
```

**验收**：与 Plate 1 同一山形（用 `reference_image` 引用 Plate 1）、god-rays 必须可见有粒子、光源是"光团"不是"硬圆盘"。

---

### Plate 3: `light-band` (t=2.4-5.9s, 特写, 旁白"山那边升起一道光。"在 2.4-5.8s, brief shot=light-band)

**剧照**：镜头推到光带本身。**一道横贯画面的暖金色光带凝固在画面中央**，光带正在从"丁达尔光的扩散态"凝固成"一根有形状的横笔"。两端有柔光晕染、中间有最亮的核心（`#fff3c8`）。背景虚化为暖金雾。

**Codex prompt**：

```text
A cinematic close-up painting of a single horizontal beam of warm golden light suspended in mid-air across a misty pre-dawn sky. Vertical 1024x1536 portrait. Same painterly style: Tonko House + Studio Ghibli + Chinese ink-wash.

Subject: A horizontal band of warm golden light (#ffd071 at the edges, #fff3c8 at the brightest core, #f4b06a at the outer falloff) stretches across the middle of the frame from about 8% to 92% of the width. The band has a SOLID, INTENTIONAL shape—like a horizontal sword of light, or like a single calligraphy stroke painted in light. Both ends of the band taper softly into mist rather than ending hard. The band has visible thickness (about 5% of the frame height) and a soft glow halo around it.

Background: Out-of-focus warm-gold misty atmosphere behind the band. The mountains from the previous shots are visible but very softly blurred—you can sense the same valley but the focal plane is on the light band. Distant warm cream sky above, soft warm gray-green meadow far below, both heavily defocused.

Mood: A moment of crystallization. Of meaning condensing. Like the moment in Wolfwalkers when a shape suddenly resolves out of the mist. Sacred, quiet, slightly magical but never saccharine.

Style: Oil-on-paper painterly. Visible brushstrokes along the length of the band suggesting it was "painted" by a single horizontal sweep. The atmospheric perspective and grain texture are preserved. Color palette remains the warm golden-cream-amber low-saturation set.

Composition: The light band sits at the visual midline of the frame (50% from top) and extends nearly edge to edge horizontally. This is the dramatic center of the entire video—every other frame leads to or follows from this image.

Camera: Close-up. The camera has pushed in from the medium shot to focus tightly on the light band itself. The mountain ridge that anchored earlier plates is now soft-focus and lower in frame.

Lighting: Self-luminous band. The band lights up the mist around it. Soft falloff into darker warm dusk-rose at the frame edges.

Strict constraints: No text, no Chinese characters, no pinyin, no logos, no watermark, no UI elements, no human figures, no animals, no cartoon mascots, no smiling faces, no plastic 3D rendering, no glossy surfaces, no chroma-key backdrops, no sun disk, no lens flare cross sparkle, no candy colors. The band must read as "calligraphy stroke made of light," not "laser beam."
```

**验收**：光带必须是"一笔"的感觉，不是"激光"；两端柔化；中间最亮；背景虚化但仍能辨出是同一山谷。

---

### Plate 4: `light-to-ink` (t=5.9-6.4s, 转场帧, ink-glyph 段开头 0.5s cross-dissolve 用, silent, brief 内并入 ink-glyph shot)

**剧照**：光带正在化作墨色。背景从晨光雾景**化开为宣纸**，光带的形状被宣纸吸收，留下一条暖棕色（`#5D4A36`）的湿润墨痕。米字格的浅淡水印开始在宣纸上浮现。

**Codex prompt**：

```text
A cinematic transitional painting capturing the moment a horizontal beam of golden light dissolves into a wet ink stroke on traditional Chinese xuan paper. Vertical 1024x1536 portrait. Same painterly style with stronger paper texture.

Subject: A horizontal stroke at the visual midline, captured exactly at the transformation point. Left third of the stroke is still warm golden light (#ffd071) with mist particles; middle third is transitioning—the light is condensing, deepening, gaining edge and substance; right third has fully become a warm dark brown ink stroke (#5D4A36) with the wet edge bleed characteristic of wet ink on xuan paper (the slightly fuzzy halo of moisture-spread fibers around the stroke).

Background: The warm-golden misty atmosphere of the previous shot is dissolving into the texture of cream-colored xuan paper (#f5ead0). The transformation is partial—upper portion of frame still has hints of warm gold mist fading out, lower portion has fully resolved into paper texture with visible vertical fiber lines and subtle warm-gray paper aging marks at the edges.

Faint emerging element: A very pale, watermark-soft 米字格 (Chinese character practice grid, single cell) is just beginning to materialize behind the stroke—four corners of a square at about 70% of the frame width, with two faint dashed cross-lines (horizontal and vertical) and two faint dashed diagonal lines forming an asterisk inside. The grid is barely visible (opacity about 15%), painted in the warmest brown of the existing palette (#5D4A36 at very low opacity), as if drawn in extremely pale tea-ink. It does NOT compete with the stroke.

Mood: Alchemical, sacred. The moment light becomes ink. The moment meaning becomes character. Like the climactic transformation in a Studio Ghibli scene.

Style: Oil-on-paper painterly transitioning into traditional Chinese xuan paper texture. Visible warm-brown wet ink bleed. Paper grain dominates the lower portion. Atmospheric softness in the upper portion. Strictly the warm low-saturation palette.

Composition: The stroke at the visual midline. The pale grid behind and slightly larger than the stroke. The paper texture taking over the lower half. Mist remnants in the upper half.

Camera: Same tight close-up framing as the light-band shot, suggesting the camera hasn't moved—only the medium itself has transformed.

Strict constraints: No text, no Chinese characters (the 米字格 grid is geometric lines only, not a character), no pinyin, no logos, no watermark labels (the grid is a visual element not a watermark), no human figures, no animals, no cartoon mascots, no plastic 3D, no glossy surfaces, no chroma-key.
```

**验收**：左 → 右必须有"光 → 墨"的连续过渡、米字格水印必须几乎看不见（opacity ~15%）、纸面纹理必须像真宣纸不像打印纸。

---

### Plate 5: `ink-glyph` (t=6.4-10.0s, 特写, 旁白末句"就是「一」。" 在 5.9-7.4s, 后接 2.6s silent dwell, brief shot=ink-glyph)

**剧照**：宣纸上一笔暖黑色（`#1f1a14`）的楷体「一」字完全成形，墨已收干，边缘有最细微的渗透痕迹。米字格水印仍然淡淡可见。宣纸的纹理、茶渍、竖纹都清晰可读。**这是 P03 poster 帧的来源**。

**Codex prompt**：

```text
A cinematic still painting of a single horizontal ink brushstroke fully formed on traditional Chinese xuan paper. Vertical 1024x1536 portrait. Strong paper-texture realism with painterly softness.

Subject: One horizontal Chinese calligraphy stroke (the character 一 / yī / "one") painted in warm-deep ink (#1f1a14) across the visual midline. The stroke is a KAITI-style (楷体 regular script) horizontal line: subtle thickening at the start (起笔), even body, subtle pressure release at the end (收笔). About 60% of frame width. The ink has settled and dried—the edges show the finest hint of feathering into the paper fibers but the body of the stroke is opaque and confident.

Background: Cream xuan paper (#f5ead0) fills the entire frame. Visible vertical paper fibers, subtle warm-gray aging marks at the corners, very faint horizontal handmade-paper "screen lines." The paper has a tactile, handmade quality—not printed paper, not digital paper—painted xuan paper.

Pale grid: A 米字格 (single cell of Chinese character practice grid) is visible at very low opacity (about 18%) behind the stroke, framing it. The grid is a square (about 70% of frame width, centered) with two thin solid lines forming a cross (horizontal and vertical through center) and two thin solid lines forming an X (corner to corner). All grid lines are warm brown (#5D4A36) at low opacity, looking like they were drawn in pale tea-ink. The grid frames the stroke without competing with it. The stroke aligns precisely with the horizontal center-line of the grid.

Edge details: Just-visible warm cream paper margins on all four edges where the paper meets the frame. Suggestion of paper texture wrapping around an edge in the lower-right corner.

Mood: Quiet completion. The hush after a master calligrapher's brush leaves the paper. Resolution. Like the final shot of Bao after the bun is whole again.

Style: Oil-on-paper painterly with strong xuan paper texture. The stroke itself is painted with calligraphic confidence—no wobble, no AI-fuzz. Paper fibers and aging tones are painted, not photographed.

Composition: The stroke is the visual center, perfectly horizontal, aligned with the horizontal cross-line of the pale grid behind it. All weight in the center; edges fall off into paper texture.

Camera: Tight close-up, same framing as the previous transitional shot—the camera still has not moved, only the medium has settled.

Lighting: Even diffuse warm daylight on the paper. No directional shadow. The paper itself glows slightly from being warm cream against the darker stroke.

Strict constraints: No Chinese characters OTHER than the single 一 stroke (no captions, no labels, no pinyin, no signature seals). No printed text, no logos, no watermark, no UI, no human figures, no animals, no cartoon mascots, no plastic 3D, no glossy surfaces, no chroma-key. The grid is allowed; it is geometric lines only.
```

**验收**：「一」字必须有楷体起笔/收笔顿笔特征（不能是"一根直棍"）、宣纸必须像真宣纸、米字格水印不能抢戏。**这张 plate 是整片美学最关键的一张，要 3-5 轮迭代到位**。

---

### Plate 6: `hand-tracing` (t=10.0-12.0s, 中景, strokeOrderTail silent, brief shot=stroke-order-tail)

**剧照**：镜头拉远一点，一只孩子的手（远景手腕到指尖，肤色低饱和暖米）从画面右下进入，食指指腹轻轻触在「一」字上方，**正要摹一遍**。阳光从右上斜进，在纸面投下温柔的暖光。

**Codex prompt**：

```text
A cinematic still painting of a child's hand about to trace a character on Chinese xuan paper. Vertical 1024x1536 portrait. Same painterly oil-on-paper style.

Subject: A child's right hand (ages 3-6) entering from the lower-right of the frame, palm down, index finger extended, fingertip hovering about 5mm above the right end of a horizontal ink stroke on xuan paper. The hand is shown from wrist to fingertip—no arm, no face, no body. Skin tone is a warm low-saturation cream-peach (NOT pink, NOT yellow, NOT brown), painted with the same paper-and-oil texture as the rest of the scene. Tiny gentle hand: rounded knuckles, soft fingernails, no jewelry, no nail polish. Hand size suggests a 4-5 year old.

The stroke: The same warm-deep ink (#1f1a14) horizontal stroke from the previous shot, kaiti-style, perfectly horizontal across the visual midline. About 55% of the frame width (slightly smaller because camera pulled back a touch).

Background: Cream xuan paper (#f5ead0) fills the frame as before. The pale 米字格 grid (about 65% frame width, opacity ~18%) frames the stroke.

Lighting: Warm directional sunlight enters from the upper-right at about a 30-degree angle. The light creates a soft warm rim along the back of the hand and a gentle long shadow extending toward the lower-left. The paper picks up a subtle warm gradient—brighter in the upper-right where sun strikes directly, slightly cooler toward the lower-left. NO harsh shadows, NO blown-out highlights—everything stays within the low-saturation warm palette.

Mood: Quiet learning. The moment a child encounters a character with the intimacy of touch. Tender, reverent, never sentimental. Like a Pixar Bao moment.

Style: Oil-on-paper painterly. The hand is painted with the same softness as the paper—no photographic realism, no anime cuteness. Visible brushstrokes on the hand's surface.

Composition: Camera has pulled back about 15% from the previous shot. The stroke now sits slightly above frame center. The hand enters from the lower-right third, fingertip pointing toward the right end of the stroke. The upper-left portion of the frame is breathing room of warm paper.

Camera: Medium close-up, slight high angle, as if the viewer is sitting beside the child.

Strict constraints: No face, no body except the right hand and wrist. No Chinese characters other than the single 一 stroke. No text, no pinyin, no logos, no watermark, no UI, no toys, no cartoon mascots, no plastic 3D, no glossy surfaces, no chroma-key, no jewelry, no nail polish, no Disney-cute hands.
```

**验收**：手必须读起来是"孩子的手"不是成人的手、手 + 笔触 + 米字格三层之间不能挡叠错乱、阳光方向必须 R→L 斜入、手不能露脸或胳膊。

---

### Plate refs（D2 单独生，作为后续 plate 的 reference_image 锚点）

| Ref ID | 内容 | 用途 |
|---|---|---|
| `ref-mountains` | 山形剪影单图 | 锁住 Plate 1, 2 的同一座山 |
| `ref-xuan-paper` | 一张干净的 1024×1536 宣纸 | 锁住 Plate 4, 5, 6 的同一张纸 |
| `ref-mizige-watermark` | 浅淡米字格水印单图 | 锁住 Plate 4, 5, 6 的同一个格子 |
| `ref-child-hand` | 孩子的手单图 | 锁住 Plate 6 的手形 |
| `ref-style-anchor` | 一张包含全部色板 + 主笔触示例的 mood board | 喂给所有 plate 当 style anchor |

---

## 6. 字形诞生段设计（与 strokeOrderTail schema 对齐）

> 2026-05-18 沉淀的 `strokeOrderTail` schema 要求：必须有米字格 / 排在 phraseBridge 之后 / tail 内无 narration cue。
> **v5 改的是 CSS 和字体，不动 schema。** 米字格不再是"作业本工业风"，而是"宣纸上浅淡水印"。

### 6.1 米字格视觉重做

| 项 | v4（工业风作业本） | v5（宣纸水印） |
|---|---|---|
| 背景 | cream `#faf3e3` opacity 0.42→0.96 | **不画方块**——纸面就是宣纸 plate 本身 |
| 外框 | 暖棕 → 黑色 4px 实线 | 暖棕 `#5D4A36` 1px 实线，opacity 0.25 |
| 内部线 | 黑色 dashed `# X` | 暖棕 `#5D4A36` 0.5px 实线（极细），opacity 0.18 |
| 状态切换 | 识字态↔写字态用变量插值 4 个属性 | 状态切换简化为 opacity 0.18→0.30（仍是水印感） |

**核心改变**：米字格永远是水印，永远不抢戏。它的功能是"在孩子写字时给参考"，不是"教学权威符号"。

### 6.2 字形诞生 = 毛笔渗墨

v4 用 `clip-path inset(0 100% 0 0) → inset(0)` 由左到右揭开，太机械。**v5 改用"墨从笔尖渗开"的动画**：

```css
.glyph-yi-ink {
  font-family: 'Yi Kaiti'; /* LXGW WenKai subset */
  color: #1f1a14;
  /* 起始：极细 + 透明 + 略偏淡 */
  filter: blur(2px);
  opacity: 0;
  -webkit-mask-image: linear-gradient(90deg, #000 0%, transparent 0%);
  mask-image: linear-gradient(90deg, #000 0%, transparent 0%);
}
/* GSAP 把 mask gradient stop 从 0%→100%，同步 opacity 0→1, blur 2px→0 */
```

视觉效果：字像被毛笔慢慢从左往右"写"出来，每一段都先是模糊的湿墨，然后干透变实。比 v4 的 clip-path 揭开**有十倍的工艺感**。

### 6.3 旁白同步与 schema 一致性

- tail 窗口 7.0-10s 内**无任何 spoken cue**（沿用 v4 silent + apad）
- `strokeOrderTail.container = "mizige"` 仍然有效（水印仍是米字格语义）
- `containerStatePolicy = "single-mizige-dual-state"` 仍然有效（opacity 18%→30% 也是 "dual state"）
- `writingDirection = "left-to-right"` 仍然有效（mask gradient L→R）
- schema 不需要改

---

## 7. 旁白 + 音效设计

### 7.1 旁白（v3 schema 妥协版）

> 原 v2 设计 cue3 为 "平平一笔——就是「一」。"（7 字 + 句 + 破折号约 2.8s）。但 audio-plan schema **硬卡 `targetDurationSeconds` ≤ 8s** 且需要 **末段 quiet ≥ 0.45s**——也就是说所有 spoken 旁白必须在 7.55s 前结束。把 3 段铺到 7.55s 内只能让 cue3 ≤ 1.8s。
>
> 两条路：(a) 改 schema 把 target 上限提到 10；(b) 把 cue3 trim 成 1.5s 内能说完的短句。**选 (b)**，因为：sediment "schema 越窄越稳定" 是昨天 5/18 刚定的规矩，v5 自己改 schema 等于自打嘴巴；而且 cue3 的诗意核心是 "就是「一」"（命名收束），"平平一笔"是冗余修饰——画面已经把"平平一笔"画明白了，旁白不需要重复说。
>
> 最终 v3 脚本：**"天亮了。山那边升起一道光。就是「一」。"**

| 项 | v4 | v5 |
|---|---|---|
| 脚本 | "一个太阳。一条光线。平平一横。就是一。" | **"天亮了。山那边升起一道光。就是「一」。"** |
| 段数 | 4 段对号入座说明书 | **3 段诗化叙事**（不再是"一个=太阳、一条=光线、一横=这一笔"低龄说教） |
| 时机 | 4 段铺满 0-6.5s | 段1 t=1.0s / 段2 t=2.4s / 段3 t=5.9s |
| 音色 | edge-tts XiaoxiaoNeural rate -10% | **保持 XiaoxiaoNeural rate -10% pitch +0Hz**（与 v37 同款女老师声，零口音偏差） |
| 留白 | 6.5-10s 静默 | **0-1.0s 静默 + 段间呼吸 + 7.4-12s 静默 (含 ink-glyph dwell 2.6s + stroke-order tail 2.0s)** |

**完整时机表**（与 brief.json + audio-plan.json 严格对齐）：

| t | 旁白 | 持续 | brief shotId | 教学语义 |
|---|---|---|---|---|
| 0.0-1.0s | (silent) | 1.0s | dawn-valley | 建立氛围，世界还未醒（silent prologue） |
| 1.0-2.3s | "天亮了。" | ~1.3s | sun-rising | meaningAction 起点（时间入场） |
| 2.3-2.4s | (silent) | 0.1s | sun-rising 尾 | 让晨光画面充分呼吸 |
| 2.4-5.8s | "山那边升起一道光。" | ~3.4s | light-band | glyphBinding（光带=横笔的物-形绑定） |
| 5.8-5.9s | (silent) | 0.1s | light-band 尾 | dissolve 入 ink-glyph |
| 5.9-7.4s | "就是「一」。" | ~1.5s | ink-glyph | phraseBridge 点题（字形命名收束） |
| 7.4-10.0s | (silent) | 2.6s | ink-glyph dwell | 让宣纸上的墨字稳定回看 + 米字格水印浮现 |
| 10.0-12.0s | **(silent, strokeOrderTail)** | 2.0s | stroke-order-tail | 米字格 识字→写字 切换 + 笔顺二次渗墨 + 孩子摹字 |

**为什么这么改**：当前 v4 旁白"一个太阳。一条光线。平平一横。就是一"是工业说明书风（每段都"对号入座"找东西），挤掉画面情绪的呼吸。v5 改为**诗化叙事**："天亮了"是时间的入场，"山那边升起一道光"是空间的展开，"就是「一」"是字形的点题。三段一气呵成像一首小诗。**这是 Tonko House / 宫崎骏旁白克制 + 中国诗意意境的合体。**

**为什么不能更短**：用户明确要求"有介绍"。完全去旁白让 3-6 岁孩子在抽象画面前断片。3 段 ~6.3s 旁白 + 5.7s 画面呼吸（含 silent prologue 1.0s + ink-glyph dwell 2.6s + stroke-order tail 2.0s + 段间 0.2s）是诗意与教学的最优平衡点。

**为什么 cue3 砍掉 "平平一笔——"**：原稿的诗意意图在画面里已经完全表达了——`ink-glyph` 段的渗墨动画就是"平平一笔"的可视化，旁白再说一遍是冗余。schema 卡口逼着 trim 反而让 cue3 更克制、更点题。Jon Klassen / Pixar Bao 的旁白都是这种风格：画面已经在说，旁白只补一句不说就不行的。

### 7.2 自然环境音（D4 必做，12s 时间轴）

| 时间 | 声音层 | 音量 | 备注 |
|---|---|---|---|
| 0.0-1.2s | 远处虫鸣 + 风声底噪 | -32 dB | dawn-valley，世界未醒 |
| 1.2-3.5s | 风声渐强 + 一只鸟啼（远，单声） | -28 dB | sun-breaking 起，鸟啼与"天亮了"错峰 0.3s |
| 3.5-6.0s | 风声渐弱 + 一次极柔的钟声单击（远，t≈4.5s） | -25 dB | 钟声作为光带凝固的节拍锚 |
| 6.0-7.0s | 宣纸窸窣声（极轻） | -30 dB | light-to-ink 转场 |
| 7.0-10.0s | 毛笔在纸上的极轻摩擦声 + 远风 | -32 dB | glyph-emergence，与"平平一笔"旁白错峰 |
| 10.0-12.0s | 鸟啼回响 + 风声 + 极轻摹字摩擦 | -30 dB | stroke-order-tail，与旁白 silent 同步 |

**所有环境音来自公开音效库（Freesound CC0 优先 / freesound.org）**，D4 单独整理 manifest，与 baked narration 合轨混音。所有音效音量必须远低于旁白（旁白 -16 dB 基准，环境音 -25 ~ -32 dB），确保 3-6 岁孩子先听清旁白。

---

## 8. 验收标准 + 反 anti-pattern

### 8.1 必须满足

- [ ] 6 张 plate 每张单独看都是"可以挂在墙上的剧照"
- [ ] 6 张 plate 串起来视觉风格一致（同一台相机、同一种笔触、同一套色板）
- [ ] 全片色温始终偏暖、低饱和、低对比
- [ ] 字形「一」必须有楷体笔意，不能是"一根线"
- [ ] 米字格永远是水印，从不抢戏
- [ ] 旁白只说一个字「一」
- [ ] 自然环境音始终在场，但永远不喧宾夺主
- [ ] product-review overall 必须 ≥ **9.0**（v3 是 8.3，v4 是 8.6；v5 不到 9.0 就重做）

### 8.2 反 anti-pattern（v5 的红线）

- 任何"卡通弹跳"动效
- 任何 chroma-key + filter 抢救工艺（cutout 必须走 gpt-image-2 原生透明 PNG）
- 任何 CSS 几何元素（光带、圆盘、box-shadow 光晕）出现在主视觉
- 任何饱和度 > 60% 的颜色
- 任何 mascot 角色露脸
- 任何"哈哈大笑"或"惊讶张嘴"式的儿童产品惯性表情
- 任何拼音 / 句子条占用主视觉面积（仅允许边缘小字）
- 任何 plate 留白等 CSS 补天的工艺路径

---

## 9. 与 v4 的工艺对照速查

| 项 | v4 | v5 |
|---|---|---|
| 视频时长 | 10s | **12s**（schema 允许 ≤12，给画面情绪呼吸） |
| plate 数量 | 1 张留白草地 | **6 张完整剧照** |
| plate 内容 | 草地 + 远山 | **完整电影画面（含太阳/光带/纸面）** |
| prompt 风格 | 大量 `no XXX` 阉割 | **描述性 cinematic prompt** |
| 一致性策略 | 靠人记 | **ref image + character bible 锁定** |
| 太阳 | CSS disk + halo sprite + chroma-key + filter 抢救 | **直接画进 plate** |
| 光带 | CSS linear-gradient | **直接画进 plate** |
| 米字格 | 工业风作业本（cream 底 + 黑实线 + 黑虚线） | **宣纸上的浅暖棕水印** |
| 字形动画 | clip-path 揭开 | **毛笔渗墨（mask gradient + blur + opacity）** |
| mascot | 无 | **无（自然元素代替）** |
| 旁白 | 4 段工业说明书 6.5s | **3 段诗化叙事 ~6.3s**（"天亮了。山那边升起一道光。就是「一」。"——v3 schema 妥协后将 cue3 从 "平平一笔——就是「一」。" 砍到 "就是「一」。"，让 target ≤ 8s 同时让画面自己说"平平一笔"） |
| 环境音 | 无 | **6 层环境音（虫鸣/风/远钟/纸/笔/鸟）** |
| 镜头切换 | 单 plate 全程 | **6 段 cross-dissolve，含 Ken Burns** |
| product-review 目标 | 8.6 | **≥ 9.0**（v5 硬门槛） |

---

## 10. 后续每个字必须做的事（v5 流水线模板）

v5 验证通过后，「二 / 三 / 人 / 山 / 火」走相同流水线：

1. 写 art bible（基于本文档模板，更换：标杆字、情绪、自然元素、镜头分镜）
2. 生 character refs（同一套 style anchor + 该字特有的 1-2 个自然元素 ref）
3. 生 6-8 张 plate（每张 3-5 轮迭代到剧照水准）
4. 写 brief / asset-plan / audio-plan（沿用 schema，更换内容）
5. HyperFrames composition（沿用 v5 模板：多 plate cross-dissolve + Ken Burns + cutout 分层 + 字形渗墨）
6. 音轨（单字旁白 + 自然环境音）
7. product gate ≥ 9.0
8. H5 接入

---

## Appendix A · 与现有 schema 的兼容性

- `brief.schema.json`：v5 完全兼容（duration 12 = 上限 / strokeOrderTail 字段全部填 / spriteRequired ≥1 满足）
- `asset-plan.schema.json`：v5 plate 数量从 1 升到 6-8，schema 已是数组，**无需改**
- `audio-plan.schema.json`：v5 cues 3 个 spoken + 1 个 silent (strokeOrderTail)，schema 已支持 `narration: "silent"` 且 `targetDurationSeconds ≤ 8` / `paddedTotalDurationSeconds ≤ 12` 全部满足，**无需改**
- `product-review.schema.json`：v5 overall 阈值在 schema 外（脚本里），**无需改**
- `strokeOrderTail`：v5 仍然满足全部约束，**无需改**

**v5 不需要动 schema。这意味着昨天沉淀的流程约束没白做。**

---

## Appendix B · 4 项决策（v2 已闭环, 2026-05-18）

| # | 议题 | 用户决策 | 落地 |
|---|---|---|---|
| 1 | 旁白长度 | 必须有介绍，内容自定，仍用 XiaoxiaoNeural | v3 schema 妥协后落地为 3 段诗化叙事 "天亮了。山那边升起一道光。就是「一」。"，分布 t=1.0-2.3s / 2.4-5.8s / 5.9-7.4s（target ≤ 8s 卡口逼着 cue3 砍掉冗余的"平平一笔——"，让画面自己说） |
| 2 | Plate 6（孩子摹字） | 必须保留 | 已纳入 stroke-order-tail，迭代到位为止，不允许降级 |
| 3 | 自然环境音 | 不考虑工作量，必做 | 6 层环境音 manifest 已规划进 §7.2，D4 阶段落地 |
| 4 | product-review 阈值 | 接受 ≥9.0 高门槛 | v5 不到 9.0 就重做，不接入 H5 |

---

*D1 闭环*：brief / asset-plan / audio-plan 三件套已写并通过全部 validator（audio-sync 全绿；teaching-harness 结构通过，仅剩 D2 资产 path 不存在的预期告警）。
*下一步 D2*：触发 codex 出 5 张 character ref + 6 张 plate + 1 张 sprite (bird-flight-loop 6 帧)，每张 plate 3-5 轮迭代到剧照水准；ref 用作后续 plate 的 `reference_image` 锚定一致性。
