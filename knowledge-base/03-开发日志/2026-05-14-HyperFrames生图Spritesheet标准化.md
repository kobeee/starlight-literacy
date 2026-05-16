---
tags: [开发日志, HyperFrames, 认字动画, 生图, spritesheet, agent]
created: 2026-05-14
date: 2026-05-14
---

# 2026-05-14 HyperFrames 生图 Spritesheet 标准化

## 背景

前一轮回顾 `yi-fresh-horizon-sync-v4` 后确认：HyperFrames 通用装配和渲染能力已经稳定，但星光识字产品级 official 仍卡在上游美术资产。原测试视频里的纸船、水线、plate 多为程序占位或半占位，`validate-product-video-gate.mjs --official` 按预期失败。

随后验证了 Codex 内置生图能力：

- 内置 `imagegen` skill 默认可用生图工具，不依赖项目内 `OPENAI_API_KEY`。
- fallback CLI 默认模型为 `gpt-image-2`；该模型不支持直接透明背景。
- 可行路径是：让生图输出纯色 chroma-key 背景，再本地抠 alpha。

用户指出 sprite 最合理的生产方式不是逐帧单独生成，而是“一张图生成多个 sprite，多行多列排列，然后裁剪得到单帧”。本轮按这个方向完成了端到端 smoke，并把流程固化成标准脚本。

## 今日完成

- 用生图生成纸船 `2 x 5` spritesheet，统一角色、比例、视角和光照。
- 将 spritesheet 拆为 10 帧，绿幕抠 alpha，统一输出透明 PNG 序列。
- 生成标准 sprite manifest，并通过 `validate-sprite-assets.mjs`。
- 将标准化后的纸船 sprite 替换进临时 HyperFrames build，跑通：
  - `npx hyperframes lint`
  - `npx hyperframes inspect --at 0.55,1.25,2.35,4.25,6.35 --json`
  - `npx hyperframes render -o renders/yi-fresh-horizon-spritesheet-smoke.mp4 --fps 24 --quality draft --workers 1`
  - `ffprobe`
  - `ffmpeg volumedetect`
  - 关键帧 review sheet
- 新增标准化脚本：
  - `tools/recognition-video/scripts/prepare-spritesheet-sprite.mjs`
- 新增 npm 入口：
  - `npm run video:prepare-spritesheet`
- 更新 agent / 知识库文档：
  - `tools/recognition-video/AGENTS.md`
  - `tools/recognition-video/README.md`
  - `tools/recognition-video/codex-skill/starlight-video-agent/SKILL.md`
  - `tools/recognition-video/templates/prompts/cutout-sequence-prompt.md`
  - `knowledge-base/06-素材资源/Unit-01素材与生图生产规范.md`
  - `knowledge-base/05-技术文档/HyperFrames多帧动画Agent流水线方案.md`
- 将 `tmp/imagegen/` 加入 `.gitignore`，避免 smoke 产物污染正式资产。

## 标准命令

后续 agent 拿到生图 spritesheet 后，不要手工裁切，直接执行：

```bash
npm run video:prepare-spritesheet -- \
  --input <generated-spritesheet.png> \
  --output tools/recognition-video/assets/unit-01/<char-id>/sprites/<actor>/<action> \
  --character-id <char-id> \
  --actor <actor> \
  --action <action> \
  --rows 2 \
  --cols 5 \
  --chroma-key auto \
  --required-motion-parts part-a,part-b
```

脚本会输出：

- `source-spritesheet.png`
- `frame-000.png ...`
- `manifest.json`
- `review-sheet.png`

并默认自动调用：

```bash
node tools/recognition-video/scripts/validate-sprite-assets.mjs <manifest.json>
```

## 技术结果

本轮纸船 smoke 的标准化脚本回归通过：

```bash
node --check tools/recognition-video/scripts/prepare-spritesheet-sprite.mjs
npm run video:prepare-spritesheet -- ...
npm run video:check-sprite-example
```

结果：

- `prepare-spritesheet-sprite.mjs` 语法检查通过。
- `npm run video:prepare-spritesheet -- ...` 成功输出 10 帧透明 PNG、manifest 和 review sheet。
- 自动 sprite 校验输出 `Recognition sprite validation ok: 1 manifest.`
- 旧 example sprite 校验仍通过。

临时视频 smoke 结果：

- MP4：`1080 x 1920`
- FPS：`24`
- 时长：约 `7.23s`
- 音频：AAC 音轨存在
- 音量：`mean_volume: -25.0 dB`，`max_volume: -8.4 dB`
- HyperFrames lint：`0 errors, 0 warnings`
- HyperFrames inspect：`issueCount: 0`

## 关键决策

1. **生图动画资产优先用 spritesheet，而不是逐帧散图。**
   同一张图里的多格姿态更容易保持同一角色、比例、纸感、光照和风格。

2. **默认使用绿色 `#00ff00` chroma-key。**
   纸船这类暖色 / 红旗主体容易被洋红边缘误伤；绿色背景在本轮更稳。脚本也支持 `--chroma-key auto` 从边缘估计实际背景色。

3. **HyperFrames 不再接收未标准化的生图 spritesheet。**
   必须先有 `source-spritesheet.png`、透明帧、`manifest.json`、`review-sheet.png` 和 validator 输出。

4. **脚本只保证技术可用，不替代产品判断。**
   自动 `motionChecks` 是粗粒度防静帧卡口；动作是否对 3-6 岁儿童“读得懂”，仍归 `product-review.json` 与产品 video agent 判断。

5. **smoke 产物不能进入 official。**
   本轮只替换纸船，水线 / plate 仍有程序资产；即使 render 成功，也不能绕过 `validate-product-video-gate.mjs --official`。

## 生图 Prompt 基准

后续 spritesheet prompt 应明确：

```text
Create one clean animation spritesheet with 2 rows and 5 columns.
Each cell shows the same subject in a consecutive pose of one simple action.
Keep the subject identity, scale, camera angle, lighting, paper texture, line weight, and color palette consistent across all cells.
Use a perfectly flat solid #00ff00 chroma-key background in every cell.
No grid lines, no labels, no numbers, no Chinese characters, no pinyin, no readable text, no watermark.
Leave generous padding around the subject in every cell.
```

## 仍然存在的问题

- 纸船这类“漂浮 / 滑行”动作，spritesheet 的帧间变化偏细，最终观感更像姿态轻微变化叠加 HyperFrames 位移，不是强动作。
- 生图模型可能让旗子、船身折痕等局部形态轻微漂移，需要 review sheet 人工检查。
- `poseContract` 目前由脚本生成占位语义，正式资产应由 asset plan / sprite producer 补更具体的逐帧动作描述。
- 水线、背景 plate、其他代表字资产还未进入同一标准化生产。

## 后续计划

- [ ] 用同一脚本生产 `二 / 三 / 人 / 山 / 火` 的代表动作 spritesheet。
- [ ] 在每个新字的 `asset-plan.json` 中声明 spritesheet 行列、chroma-key 色、required motion parts 和输出目录。
- [ ] 对正式候选补充语义化 `poseContract.frames`，不要只保留脚本占位描述。
- [ ] 代表字视频继续跑完整链路：brief + asset-plan + audio-plan → teaching harness → audio sync gate → product-review → spritesheet standardization → sprite validator → HyperFrames render → media QA → official product gate。

## 接手提示

下次继续 HyperFrames agent 生成视频时，先读：

- [[05-技术文档/HyperFrames多帧动画Agent流水线方案]]
- [[06-素材资源/Unit-01素材与生图生产规范]]
- `tools/recognition-video/AGENTS.md`
- `tools/recognition-video/README.md`

然后先产出上游 brief / asset-plan / audio-plan / product-review，再用 `npm run video:prepare-spritesheet` 处理生图 spritesheet。不要把未校验的图片直接塞进 HyperFrames composition。
