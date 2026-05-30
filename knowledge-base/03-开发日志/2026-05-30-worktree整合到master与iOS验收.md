---
tags: [开发日志, worktree, git, 整合收口, iOS, 验收]
created: 2026-05-30
date: 2026-05-30
---

# 2026-05-30 worktree 整合进 master 与 iOS 验收

## 背景

并行竞赛阶段累计开出 5 个 worktree。用户决策：**只保留 Claude 的成果合并进本地 master（不提交），其余清理**，且特别强调「Claude 的 iOS app 部分要完好保留」。

`git worktree list` 初始状态（全部指向同一 commit `6a3874e`）：

| 目录 | 分支 | 归属 | 处置 |
|---|---|---|---|
| `starlight-literacy`（主） | `master` | 合并目标 | 保留 |
| `starlight-literacy-ios-claude` | `claude/ios-app` | **Claude iOS** | ✅ 完整合并 |
| `starlight-literacy-ios` | `codex/ios-app` | Codex iOS | ❌ 丢弃 |
| `starlight-literacy-mobile-h5-v2` | `codex/mobile-h5-v2` | Codex H5v2 | ❌ 丢弃 |
| `starlight-mh5v2` | `mobile-h5-v2` | **Claude H5v2** | 🟡 仅提炼留档后丢弃 |

## 🔴 最关键的一个判断（差点踩坑）

**5 个分支全部指向同一 commit `6a3874e`，说明各分支没有任何独立 commit——所有工作都是未提交的工作区改动（modified + untracked）。**

直接 `git worktree remove` 会**永久丢失**这些未提交工作。所以「合并到 master 不提交」的真实含义 = 把各 worktree 的**工作区改动应用进主 worktree**，删除是必须放在最后、且确认落地之后的一步。

## 执行（四阶段，全程不 commit）

### A. 搬 Claude iOS 源码
`src/clients/iOS/` 原始 3116 文件 / 174MB，但绝大部分是 `build/`（166MB Xcode 编译缓存，`.gitignore` 本就忽略）和 `demo-out/`（7.9MB 录屏产物）。用 rsync 排除产物，只搬源码：

```
rsync -a --exclude 'build/' --exclude 'demo-out/' \
  <ios-claude>/src/clients/iOS/ <master>/src/clients/iOS/
```
落地 **117 文件 / 1.1M / 29 个 Swift**。

### B. 搬 iOS 专属新文档
4 个文件名独特、零冲突，直接 cp：教学法重审方案 + 3 篇 05-29/05-30 iOS 开发日志。

### C. 三方合并 4 个索引/流程文档（本次最易错处）
`USER_FLOW.md`、`当前任务.md`、`产品设计索引.md`、`开发日志索引.md` 在主 worktree（已是 mh5v2 版）和 iOS worktree（iOS 版）**都被改了，且是分叉而非叠加**——iOS 版甚至删掉/替换了 mh5v2 的章节。直接覆盖会丢失 mh5v2 留档。

正解是 `git merge-file` 三方合并，base 取原始 commit：
```
git show 6a3874e:<path> > base
git merge-file -p <主worktree当前(含mh5v2)> base <iOS版> > merged
```
- `产品设计索引.md` 自动干净合并；
- 其余 3 个有冲突，手工解决，原则：**双方内容都保留**、`updated` 取最新 05-30、日志列表按时间倒序（05-30 iOS → 05-29 iOS×2 → 05-28 mh5v2×3 → 05-27）。
- 校验：4 文档零残留冲突标记。

### D. 安全闸 + 清理
删 worktree 前用脚本 guard 校验 master 已落地（iOS `project.yml`/`StarlightLiteracy/`、教学法文档、05-30 日志、Swift 文件数），**校验通过才删**：
```
git worktree remove --force <4 个>
git branch -D claude/ios-app codex/ios-app codex/mobile-h5-v2 mobile-h5-v2
git worktree prune
```
结果：worktree 5 → 1，分支只剩 master，HEAD 仍 `6a3874e`（无新 commit）。

## mh5v2 的「提炼留档」如何落地
用户原话：「提炼总结一下进 master 再丢吧，iOS app 有一些灵感就是从 h5 来的，所以还是记录下吧」。

master 工作区**原本就已有** 4 篇 Claude mh5v2 记录文档（产品落地方法论 + 骨架P04 + 全11页交付 + Codex对照复盘）。三方合并时它们在基底里被原样保留，已满足留档；mh5v2 的实际代码（`src/clients/mobile-h5-v2/`）按要求未搬，随 worktree 删除。

## 验收（iOS App）

| 项 | 命令 | 结果 |
|---|---|---|
| 工程重生 | `xcodegen generate` | ✅ 29 Swift 全纳入 |
| 编译 | `xcodebuild build -scheme StarlightLiteracy -destination 'platform=iOS Simulator,name=iPhone 17' CODE_SIGNING_ALLOWED=NO` | ✅ **BUILD SUCCEEDED / 0 error** |
| 单测 | `xcodebuild test ...` | ✅ **14/14 全绿**（MoatGate 7 + StrokeJudge 6 + 占位 1）|

- 唯一 warning 无害：`appintentsmetadataprocessor ... No AppIntents.framework dependency found`（Xcode 26 标准提示）。
- 核心意义：`MoatGateTests`（顺序门护城河）+ `StrokeJudgeTests`（笔顺真判定）是两条护城河逻辑，全绿证明**跨 worktree 搬运没破坏任何东西**。

## 教训沉淀

1. **多分支同指一个 commit = 工作全在工作区未提交**。动 worktree 前先 `git status` 逐棵排查，删除永远是最后一步，且必须先确认要保留的内容已落地。
2. **文档类合并别简单覆盖**。同一文件在两棵 worktree 分叉演化时用 `git merge-file` 做三方合并（base=共同 commit），双方章节都保留。
3. **搬 iOS/原生工程排除 `build/`、`demo-out/` 等产物**，只搬源码（174MB → 1.1M）。
4. **破坏性操作前置安全闸**：脚本里先 guard 校验、`exit 1` 兜底，再执行 remove。

## 当前状态
- master 工作区：iOS 全源码（untracked）+ 8 篇文档 + 4 个合并后的索引/流程文档，**全部未提交**。
- 等用户决定何时、以什么粒度 commit。
