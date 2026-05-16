---
tags: [开发日志, HyperFrames, 生产底座, 认字动画, 接手记录]
created: 2026-05-10
updated: 2026-05-10
---

# 2026-05-10 HyperFrames 生产底座重构接手记录

## 背景

用户明确纠偏：当前不应继续在单个 `一` 字样片上消耗上下文。真正的问题不是再把横屏改竖屏，也不是继续在现有 HyperFrames composition 里加一点 motion，而是先解决认字视频的生产底座。

当前视频动画性的核心缺陷：

- 大部分画面是静态图片、CSS 图形或单张 cutout 做位移、缩放、淡入淡出。
- 这类 motion graphic 不能替代真正的逐帧动作。
- HyperFrames skill 当前更适合做最终编排和渲染，不具备稳定生成多帧角色/物件动作素材的能力。

## 本轮纠偏结论

下个 session 的目标不是继续做 `一 / 二 / 三 / 人 / 山 / 火` 样片。

新的首要目标是：**重构认字视频生产底座**。

必须先建立一条稳定流水线：

1. 教学动作 brief。
2. 分层资产设计。
3. 多帧 cutout / sprite 生成。
4. 透明图、帧数、尺寸、裁切校验。
5. HyperFrames 装配。
6. 音频、poster、final frame、H5 接入围栏。
7. 手机竖屏播放验收。

HyperFrames 在这条流水线里的角色应降级为“编排与渲染层”，不能继续承担上游动画资产生产职责。

## 已补记录

- 技术方案：[[05-技术文档/HyperFrames多帧动画Agent流水线方案|HyperFrames 多帧动画 Agent 流水线方案]]

该方案记录了 production substrate 的节点、输入输出、质量要求和验收标准。

## 下个 session 接手约束

新会话开始后，先读：

- [[03-开发日志/当前任务|当前任务]]
- [[05-技术文档/HyperFrames多帧动画Agent流水线方案|HyperFrames 多帧动画 Agent 流水线方案]]
- [[05-技术文档/Mobile-H5-HyperFrames教学动画优化方案|Mobile H5 + HyperFrames 教学动画优化方案]]
- [[06-素材资源/Unit-01素材与生图生产规范|Unit-01 素材与生图生产规范]]

然后只做生产底座设计与落地，不继续出正式字样片。

优先拆解：

- sprite / PNG sequence 的目录规范。
- `manifest.json` schema。
- cutout alpha 校验脚本。
- 多帧素材生成提示词模板。
- HyperFrames sprite 装配模板。
- 质量门槛：禁止“单张图移动”冒充角色动画。

## 明确暂停

暂停继续推进：

- `一` 样片视觉打磨。
- `二 / 三 / 人 / 山 / 火` 样片生产。
- 继续给现有 composition 加静态元素 motion。

这些工作等生产底座完成后再重新开始。
