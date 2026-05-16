---
tags: [开发日志, HyperFrames, Agent, 认字动画, 洪恩拆解, 纠偏]
created: 2026-05-12
date: 2026-05-12
---

# 2026-05-12 HyperFrames 一字洪恩式生成验证与旧兔子纠偏

## 背景

用户要求“用最新的 HyperFrames agent 生成‘一’字动画视频看看”。本轮一开始直接复用了 `yi-agent-pipeline-test`，它确实通过了 teaching harness、sprite validator、HyperFrames lint / inspect / render，但用户指出关键问题：兔子动画看起来还是原来的，之前学习洪恩识字吸收的经验没有真正用到画面里。

这次反馈成立。根因是：`yi-agent-pipeline-test` 是工程正向样例，用来证明流水线卡口能跑通，不是新的视觉/教学表达标准。它把洪恩式规则写进 `teachingContract`，但画面仍然沿用了“兔子 + 小路 + 苹果 + 木棒”的旧表达记忆，导致通过机器校验也无法避免用户感知上的“还是原来的”。

## 今日完成

- [x] 承认 `yi-agent-pipeline-test` 只能算 agent pipeline smoke test，不应被当作“洪恩式新样片”。
- [x] 新增独立测试脚本：`tools/recognition-video/scripts/create-yi-hongen-agent-v2.mjs`。
- [x] 新增独立产物，不覆盖 existing official，也不接入 H5：
  - `tools/recognition-video/briefs/yi-hongen-agent-v2.brief.json`
  - `tools/recognition-video/asset-plans/yi-hongen-agent-v2.asset-plan.json`
  - `tools/recognition-video/assets/unit-01/yi-hongen-agent-v2/`
  - `tools/recognition-video/builds/yi-hongen-agent-v2/`
- [x] 把旧兔子移出主动作，改为更洪恩式的“引导小手点线、描一横”：
  - `guide-hand / trace-line`：手指点一下并沿小路描横线。
  - `apple / one-bounce`：一个苹果落下，复现数量意义。
  - `stick / straighten`：木棒从斜滚到水平，完成字形绑定。
- [x] 发现并修复音频坑：macOS `say -o` 在当前环境里会退出 0 但生成空 AIFF，不能只看命令成功；最终复用已验证的 `yi-video-narration-v1-timed.mp3`，并用 `ffmpeg volumedetect` 确认非静音。
- [x] 抽 review sheet 后确认第一视觉不再是旧兔子，而是小手引导线条。

## 验证记录

已通过：

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

结果：

- teaching harness：通过。
- `guide-hand / apple / stick` 三组 sprite validator：通过。
- HyperFrames：`lint` 0 error / 0 warning；`inspect` 0 issue。
- MP4：`1080x1920`、约 `7.85s`、`24fps`、H.264 video + AAC audio。
- 音量：`mean_volume: -24.6 dB`，`max_volume: -8.1 dB`，确认不是静音。

## 关键纠偏

### 1. Harness 通过不等于画面真的升级

`teachingContract` 能挡住结构缺失、节奏过快、资产缺失和动作契约缺失，但挡不住“视觉上还是旧样片”。以后 official 或准 official 样片必须增加人工视觉复核：

- 是否第一眼就能看出和旧版本不同。
- 是否真正把洪恩拆解经验转成动作，而不是只写在 brief 里。
- 是否角色 / 物件 / 手势服务认字，不抢走字形锚点。

### 2. 旧素材记忆会污染新样片判断

即使兔子动作从“跳”改成“指向”，用户仍会觉得“还是原来的兔子”。后续如果要验证新教学范式，应优先换主引导形式，而不是在旧角色上改姿态。

对 `一` 来说，更稳的动作链是：

```text
引导小手点线 / 描线
  -> 一个苹果复现数量
  -> 木棒滚平成一横
  -> 大字一安静收束
```

兔子、小动物可以在 official 版本里做边缘陪伴，但不适合作为这次“洪恩式新样片”的第一视觉。

### 3. Sprite validator 仍然有价值

本轮两次被 `validate-sprite-assets.mjs` 拦下：

- 小手 / 旧兔子透明帧内容离边缘太近，存在裁切风险。
- 修正后再跑才进入 HyperFrames。

这说明 sprite validator 是真卡口，不是形式化检查。后续不能跳过。

### 4. 音频必须验证“有声音”，不能只验证“有音轨”

本轮 `say -o` 生成空 AIFF，但命令状态码为 0。如果只看文件存在或 mp4 有 audio stream，会误判成功。后续 baked audio gate 必须包含：

- `ffprobe` 看音轨。
- `ffmpeg -af volumedetect` 看音量，不允许接近全静音。
- 有条件时做实听或抽样播放。

## 产物定位

`yi-hongen-agent-v2` 是“旧兔子纠偏后的 agent 生成能力验证样片”，不是 official：

- 不覆盖 `src/shared/unit-01.js` 里的 `recognitionVideo.status = "official"`。
- 不替换当前 H5 official 视频。
- 不作为最终视觉标杆，只作为“洪恩式结构是否真正进入画面”的下一步基线。

## 后续计划

- [ ] 把“渲染抽帧人工复核 + 是否像旧样片”写进 Release QA 说明。
- [ ] 若继续做 `一`，下一版应进一步减少字幕感，把“手指描一横”和“木棒滚平”做得更自然。
- [ ] 开始验证代表字 `二 / 三 / 人 / 山 / 火`，不要继续无限打磨 `一`。
- [ ] 对每个新字都先过 `brief + asset-plan + teaching harness`，再产 sprite，再 render，再 review sheet。

## 学到的知识

- “用上洪恩经验”不是在 JSON 里写 `hongen-micro-lesson/v1`，而是让画面动作、节奏、停顿和字形绑定都发生变化。
- 工程卡口解决“能不能过流水线”，人工 review 解决“有没有真的变好”。
- 如果用户一眼认出旧样片影子，说明资产选择本身已经失败，不能继续靠微调时间轴补救。
