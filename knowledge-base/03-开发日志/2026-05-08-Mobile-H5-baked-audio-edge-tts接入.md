---
tags: [开发日志, Mobile-H5, Unit-01, TTS, baked-audio, edge-tts, Phase-4]
created: 2026-05-08
updated: 2026-05-08
---

# 2026-05-08 Mobile H5 baked audio（edge-tts）接入

## 本轮目标

承接 [[2026-05-08-Mobile-H5全链路UI验证]] 的下一步：解决 Phase 4 阻塞（baked audio）+ 顺手把 dev server 根路径 404 与 P08 庆祝触发也定下方向。

用户对前一轮"真人录音 vs TTS"的建议提了反馈：**2026 年中文神经 TTS 早就成熟了，不要纠结，应该上网找最佳实践**。本轮按这条原则做。

## TTS 选型调研

| 方案 | 接入成本 | 质量 | 价格 | SLA | 选用 |
|---|---|---|---|---|---|
| Microsoft edge-tts（Python `edge-tts` 包） | 5 分钟 | 神经合成，`zh-CN-Xiaoyi/Yunxia/Xiaoxiao` 已是第一梯队 | 完全免费 | 无（逆向接 Edge 大声朗读，但稳跑 4 年） | ⭐ MVP |
| 火山引擎豆包 Seed-TTS / BigTTS | 30-60 分钟（注册 + 实名 + 创建应用） | 神经合成，300+ 音色，22 种情感，有"陪伴教育/讲故事"专项 | 每应用 20 000 字符免费额度（Unit-01 总字符量 < 5 000） | 有 | 备选生产 |
| MiniMax / 阿里 Qwen-TTS / 讯飞 | 与豆包相当 | 顶级 | 类似豆包 | 有 | 备选 |

行业事实：洪恩识字、多多识字、巧虎主带读全部用神经 TTS（温暖女老师感），不用真人或童声。原因：① 内容更新不需要重录；② 多音色随时切换；③ 字数级别精确控制；④ 童声做主带读会让孩子潜意识把它归类为"小朋友说话"，标准发音权威性打折。

**洞察**：baked audio 是离线产物，不是运行时依赖。脚本 `provider` 字段一改就能换 TTS，所以选型可以**低成本起步**。先 edge-tts 跑 MVP，听感不够再切豆包，**音频路径和 H5 调用都不变**。

## 音色试听与选型

候选三档（同一段教学 cue，rate=-10%, pitch=+0Hz）：

| 候选 | voice | 定位 | 评估 |
|---|---|---|---|
| A | `zh-CN-XiaoyiNeural` | 女童·活泼·卡通 | 句句都活泼，但 80 段 cue 听久了显幼稚；童声咬字清晰度天然不如成人声 |
| B | `zh-CN-YunxiaNeural` | 男童·可爱·卡通 | 同 A，男童版 |
| C | `zh-CN-XiaoxiaoNeural` | 女老师·温暖·讲故事 | 一致性强、耐听、撑得住 5+ 秒连续叙述、与田园暖彩调性匹配 |

**结论：C 晓晓做主带读**。A/B 留作未来"答对惊喜 / 宝库点亮 / P08 庆祝"等微反馈句的可选升级，但需要给数据模型加"句子级音色标签"，本轮不做。

试听页：`tools/baked-audio/audition/index.html`，3 × 4 = 12 段对比表。

## 本轮落地

### 1. dev server 根路径 404 修复

[[2026-05-08-Mobile-H5全链路UI验证]] 中遗留：从 `http://127.0.0.1:4173/` 进入会让 `index.html` 加载，但相对 `./app.js` 解析为 `/app.js` → 404。

修复：在 [server.mjs](src/clients/mobile-h5/server.mjs) 让 `/` 直接 302 重定向到 `/src/clients/mobile-h5/`。浏览器跳转后 URL 变成 `/src/clients/mobile-h5/`，所有相对路径解析都正确。VPS / Docker 部署不受影响（公网入口已等价 `/`）。

curl 验证：

```
GET /                                  → 302 Location: /src/clients/mobile-h5/
GET /src/clients/mobile-h5/            → 200 (index.html)
GET /src/clients/mobile-h5/app.js      → 200
GET /app.js                            → 404（预期）
```

### 2. mp3 / wav / m4a / ogg MIME 修复

第一次起 audition 试听页时发现所有 audio 都是 0 秒：mp3 在 server 端被发成 `application/octet-stream`，浏览器不识别。[server.mjs](src/clients/mobile-h5/server.mjs) 的 `types` 字典加上：

```js
".mp3": "audio/mpeg",
".wav": "audio/wav",
".m4a": "audio/mp4",
".ogg": "audio/ogg",
```

### 3. 60 段 baked audio 生产

工具脚本：[tools/baked-audio/build-baked-audio.mjs](tools/baked-audio/build-baked-audio.mjs)。

- 数据源：`src/shared/unit-01.js` + `src/shared/unit-01-lessons.js`
- 每个字 3 段：`char` / `phrase` / `soundCue`
- 全部 voice = `zh-CN-XiaoxiaoNeural`，rate = `-10%`，pitch = `+0Hz`
- 输出位置：`src/clients/mobile-h5/assets/audio/unit-01/{字}/{seg}.mp3`
- 同时输出 manifest：[src/shared/unit-01-baked-audio.js](src/shared/unit-01-baked-audio.js)，由 H5 import
- 支持增量：默认跳过已存在文件，`--force` 覆盖重跑

实测：20 字 × 3 段 = 60 段，总耗时约 2 分钟，落盘 800 KB。每段时长合理：单字 1.1-1.2s、phrase 1.6-1.8s、soundCue 3-4.7s。

### 4. H5 speak() 接入 baked，Web Speech 退化为 fallback

[app.js](src/clients/mobile-h5/app.js) 改动：

- 顶部 import `unit01BakedAudio` manifest
- 新增 `speakBaked(item)` / `bakedAudioFor(item)` / `hasBakedSpeak(item)` / `cancelBakedAudio()`
- `speak(item)` 入口先尝试 `speakBaked`，失败才走原 Web Speech 路径
- `cancelSpeech()` 同步取消 baked
- 三段间隙：`char→phrase` 380ms，`phrase→soundCue` 320ms，soundCue 末尾 0ms

`speakText()` 不动，处理动态文本（`touch-world` discovery 提示等）继续用 Web Speech。

### 5. 资源版本 v20 → v21

- [index.html](src/clients/mobile-h5/index.html)：`styles.css?v=21`、`app.js?v=21`
- [app.js](src/clients/mobile-h5/app.js)：`unit-01.js?v=21`、`unit-01-baked-audio.js?v=21`
- [sw.js](src/clients/mobile-h5/sw.js)：`CACHE_NAME = "starlight-mobile-h5-v21"`，APP_SHELL 新增 `unit-01-baked-audio.js`

### 6. 服务端冒烟测试

```
GET /src/clients/mobile-h5/assets/audio/unit-01/yi/char.mp3       → 200 audio/mpeg 6912B
GET /src/clients/mobile-h5/assets/audio/unit-01/er/soundCue.mp3   → 200 audio/mpeg 23904B
GET /src/shared/unit-01-baked-audio.js?v=21                       → 200 text/javascript
GET /src/clients/mobile-h5/app.js?v=21                            → 200 text/javascript
```

`node --check` 全部 syntax ok。

## 未完成 / 下一步

按用户"先快速验证"原则，本轮停在 **baked audio 接入完成、待用户真机听感**。下一步分三块（待用户拍板继续）：

1. **`一` 视频音轨烘焙**：候选视频 `yi-stage-official-candidate.mp4` 5.83s，audioTrack.script 是 `一条小路。一个苹果。一根木棒。都是一。`。用 edge-tts 同套参数（Xiaoxiao / -10% / +0Hz）生成连贯叙述音轨，按视频时长用 ffmpeg `atempo` 微调到 ≈ 5.6s（留 0.2s silence 尾），合进 mp4 / webm。过 [scripts/check-mobile-h5-guardrails.mjs](scripts/check-mobile-h5-guardrails.mjs) 围栏（`audioTrack.status = "baked"` + 真实音频流），切换 `unit01.characters[yi].recognitionVideo.status = "official"`，资源版本可保持 v21（同一窗口内）。
2. **P08 庆祝触发改造**：用户回"按合理方式来做"。本日决策：每组 5/5 不弹（保持现状紧凑节奏），**整个 Unit-01 全 20 字 mastered 时触发一次** P08。理由：单元中段每组弹一次会变成 Duolingo 化负担（违反零挫败原则），但完整单元通关是真正的里程碑。触发逻辑改一处：P07 第 4 组通关时检查 `mastered === 20`，是则 route("celebrate")，否则保持现状。文案：`你认识了 Unit-01 全部 20 个字 / 收集到 20 颗小星星，全部点亮了`，CTA：`去家长中心看看 / 回学习地图`（Unit-02 未上线，不放"开始下一单元"）。
3. **真机验证**：H5 主流程（P01 → P03 → P05 → P07 → P10 → P11）走一遍听感、节奏、停顿、错答路径，无 console error / warn 后再视为 Phase 4 收口。

## 围栏与素材生产规范的一致性

本轮没有违反 [[06-素材资源/Unit-01素材与生图生产规范|Unit-01 素材与生图生产规范]]：

- 汉字仍由代码 / SVG / 字体渲染，TTS 不参与。
- baked audio 是音频资产，不是图片资产，不需要 chroma-key 抠色流程。
- 视频音轨烘焙后会更新 `assets/recognition/yi/` 目录，HyperFrames composition 不变。

[[01-产品设计/Unit-01产品级重构执行规划|Unit-01 产品级重构执行规划]] 中 Phase 4 的"语音使用可靠音轨，优先烘焙到视频或使用正式音频文件，不再依赖浏览器 Web Speech 定时拼接"已基本兑现：H5 主带读已切到 baked，视频音轨烘焙是 Phase 4 收口前最后一步。

## 关键决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| TTS provider | edge-tts（MVP） | 0 接入成本，质量已是第一梯队；离线产物，未来切豆包零迁移成本 |
| 主带读音色 | `zh-CN-XiaoxiaoNeural`（女老师·温暖） | 一致性 / 耐听 / 撑得住长 cue / 与暖彩调性匹配；童声做主带读权威性打折 |
| baked 段粒度 | char / phrase / soundCue 三段 | 与 H5 现有 `speak()` 教学节奏一致，间隙改 380/320ms 由 H5 控制，不再依赖 Web Speech 的拆句逻辑 |
| manifest 形式 | `src/shared/unit-01-baked-audio.js` 导出对象 | 数据驱动，避免 HEAD 探测；脚本生成，永远与 mp3 落盘同步 |
| 视频音轨方案 | 烘焙单条连贯叙述合进 mp4/webm 音轨 | 视频自带音轨后 voiceCues 调度路径 [app.js:1367](src/clients/mobile-h5/app.js:1367) 自然失效，减少时序漂移 |
| P08 触发 | Unit-01 全 mastered 时一次 | 中段每组弹会 Duolingo 化；单元通关是真里程碑，反 Duolingo + 仪式感兼得 |
