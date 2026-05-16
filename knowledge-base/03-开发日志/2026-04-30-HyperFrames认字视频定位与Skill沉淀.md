---
tags: [开发日志, HyperFrames, 内容生产, Skill]
created: 2026-04-30
date: 2026-04-30
---

# 2026-04-30 HyperFrames 认字视频定位与 Skill 沉淀

## 今日完成
- [x] 明确 HyperFrames 在星光识字中的产品定位：离线认字短视频资产生产工具，不是小程序运行时动画系统。
- [x] 将 HyperFrames 的目标收敛到 P03 认字页增强层：为单字生成 `3-8 秒` 的 `mp4 / poster / final frame / metadata`，上传 CDN 后由小程序可选播放。
- [x] 创建用户级 Codex skill：`/Users/elvis/.agents/skills/starlight-recognition-video`，用于沉淀星光识字认字短视频的业务规则、视觉边界和验证流程。
- [x] 将 skill 默认执行路径调整为本机直跑：`npx hyperframes render` 默认不带 `--docker`，验证脚本使用本机 `ffprobe / ffmpeg`。
- [x] 用现有“一”字样片验证本机脚本，确认输出规格为 `1080x1920 / 6.0s / 24fps / 144 frames`，并成功抽取 `4.8s` 关键帧。

## 遇到的问题
- 初版 skill 过度偏向 Docker 验证路径，容易误导后续会话以为 HyperFrames 必须 Docker。
- 真实结论是：HyperFrames 不一定需要 Docker；本机具备 Node 22+、可用 browser/headless 环境、`ffmpeg`、`ffprobe` 时应优先本机直跑。
- Docker 只作为用户明确要求、CI 环境隔离、或本机浏览器/FFmpeg 依赖不可用时的 fallback，不作为默认路径。

## 关键决策
- HyperFrames 的产品边界：
  - 用来生产认字短视频资产。
  - 不进入微信小程序运行时。
  - 不替代 P03 的静态插画、大字、拼音、组词和下一步交互。
  - 不做洪恩式重剧情、强刺激、强游戏化长动画。
- 认字短视频的推荐结构：
  1. 场景或字源轻入场。
  2. 大字成为视觉焦点。
  3. 局部笔画或字形关系轻高亮。
  4. 拼音和简单组词出现。
  5. 收束到可作为 poster/fallback 的静态状态。
- 后续涉及 HyperFrames 认字视频时，优先显式调用 `$starlight-recognition-video`；若编辑 HyperFrames composition，再结合官方 HyperFrames skill。

## 下一步
- [ ] 继续做 10 字试验集：一、二、三、日、月、火、水、山、木、人。
- [ ] 抽出可参数化的单字模板，减少每个字重新写 HTML/CSS/GSAP 的成本。
- [ ] 为 `recognitionVideo` 设计数据字段：视频 URL、poster、final frame、字幕/旁白时间轴、版本号。
- [ ] 在 H5 或小程序 P03 页面验证视频增强层：ready 后淡入、结束停最终帧、弱网降级到 poster + 原生微动效 + TTS。

## 学到的知识
- 对星光识字而言，HyperFrames 的价值是“可控、批量、低刺激的认字短视频生产管线”，不是炫技动画框架。
- 本机开发应保持直接：`lint -> inspect -> render -> ffprobe -> ffmpeg 抽帧`，不要默认引入 Docker 心智负担。
- Skill 应该沉淀项目业务和审美边界，不复制官方框架文档；官方 HyperFrames skill 负责框架机制，本项目 skill 负责“星光识字怎么正确使用它”。
