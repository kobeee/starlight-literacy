---
tags: [开发日志, 复盘, mobile-h5-v2, Codex, Claude]
created: 2026-05-28
date: 2026-05-28
---

# 2026-05-28 Codex 对照 Claude mh5v2 复盘

## 背景

用户要求 Codex 不再只看自己 worktree，而是拉起 Claude 的 `mobile-h5-v2` worktree，对最新 H5 做一轮完整产品设计 review，并直接对照 Claude 的实现。

本次对照对象：

| 对象 | 路径 | 分支 |
|---|---|---|
| Claude worktree | `/Users/elvis/Documents/codes/challenges/2026/Apr/starlight-mh5v2` | `mobile-h5-v2` |
| Codex worktree | `/Users/elvis/Documents/codes/challenges/2026/Apr/starlight-literacy-mobile-h5-v2` | `codex/mobile-h5-v2` |

## 实测动作

- 读取产品权威源：`CLAUDE.md`、[[../01-产品设计/砍cinematic后执行方案]]、`.impeccable.md`。
- 读取 Claude 关键实现：`app.js`、`data/schema.js`、`data/units.js`、`data/commerce.js`、`modules/hanzi.js`、`modules/follow-record.js`、`pages/P03/P04/P05a/P05/P09/P11`。
- 跑 Claude 静态检查：`npm run check:h5-v2`，通过。
- 启动 Claude H5：`PORT=4181 npm run dev:h5-v2`。
- 用 Chrome 插件实测 `#/p01`、`#/p03/unit-01/yi`、`#/p04/unit-01/yi`、`#/p05a/unit-01/yi`、`#/p05/unit-01/yi`、`#/p09`、`#/p11`。
- 启动 Codex H5：`PORT=4180 npm run dev:h5:v2`。
- 用 Chrome 插件实测 Codex 学习流：地图 → 字源 → 写字 → 跟读 → 图卡。

## 关键发现

### 1. Claude 更接近产品主线

Claude 不是把产品合同写成 UI 文案，而是把合同拆成模块、schema、状态机和不可绕过的交互门：

- P04 接 `hanzi-writer` 本地库和字数据，未写完前 CTA 禁用。
- P05a 接 `MediaRecorder` 和双波形包络，未录音前 CTA 禁用。
- P09/P11 有 SKU、退款、邀请上限状态机。
- P03/P05 虽然素材仍是占位，但显式标记为待生产，不伪装成正式资产。

### 2. Codex 版本是可点 demo，不是产品实现

Codex 版本能跑、能通过 `npm run check:h5:v2`，但核心红线没落地：

- P04 `finish-write` 一开始可点，未描红也能进入跟读。
- 跟读 `finish-read` 一开始可点，未录音也能进入图卡。
- 录音状态是全局 `state.recording.url`，不是每字证据。
- P03 是泛化 SVG，不是真甲骨/金文/篆文演变。
- P05 图卡直接展示目标字，不是 3-5 张真实场景图。
- 一期 1300 字数据占位实际会算成 1305 字。
- Docker/nginx 仍发布旧 `mobile-h5`，不是 `mobile-h5-v2`。

### 3. 两边都还不能算最终产品

Claude 方向正确，但仍有正式验收 blocker：

- P03 真字源图片资产未产，Chrome 里实际 fallback 成现代字。
- P05 图卡仍是 emoji 占位。
- 视觉仍偏卡片化 H5，距离“晒暖绘本小世界”还有差距。
- P04/P05a 需要真机手指和麦克风 QA。
- Unit-02~87 仍是数据/内容生产空位。

## 结论

本次判断：**Claude worktree 应作为 mobile-h5-v2 后续主线；Codex 版本不应继续作为主线推进。**

评分仅作内部参考：

| 版本 | 产品设计符合度 | 判断 |
|---|---:|---|
| Claude `starlight-mh5v2` | 约 70/100 | 产品结构和护城河方向正确，素材和视觉未收口 |
| Codex `starlight-literacy-mobile-h5-v2` | 约 45/100 | 工程 demo 壳，产品核心可绕过 |

## 本次沉淀

- 新增产品方法论：[[../01-产品设计/Claude-mh5v2产品落地方法论]]
- 关键教训：**validator pass 不是 product pass**。静态检查通过只能说明代码没明显坏，不能说明学习动作、付费承诺、红线约束真的成立。

## 后续建议

1. 以 Claude worktree 为主线继续收口。
2. 先补 P03 真字源资产和 P05 真图卡资产。
3. 对 P04 / P05a 做真机手指、麦克风、低端机 QA。
4. 把不可绕过交互门纳入 H5 产品验收脚本。
5. Codex 版本只保留少量可用的自检思路，不再作为产品实现基线。

记录人：Codex · 2026-05-28
