---
tags: [技术文档, AI工作流, 方法论, Pencil, Claude-Code, Codex]
created: 2026-04-15
updated: 2026-04-15
---

# AI Agent 并行设计方法论

## 适用场景
需要快速产出 UI 设计稿，且希望获得多样化方案进行比选。

## 核心流程

```
1. 准备 DESIGN.md → 2. 创建 Git Worktree → 3. 多 Agent 并行设计 → 4. 导出对比 → 5. 融合最优
```

### Step 1：准备 DESIGN.md
统一设计规范文档，确保所有 Agent 使用相同的视觉语言：
- 色彩体系（主色/辅助色/语义色 + 具体 hex 值）
- 字体层级（标题/正文/辅助 + 具体字号）
- 组件规范（按钮/卡片/进度条 + 圆角/阴影/间距）
- 页面规格（屏幕尺寸/安全区/页面间距/排列方式）
- 每个页面的内容说明和布局要求

### Step 2：创建 Git Worktree 隔离
```bash
git branch design/agent-a
git branch design/agent-b
git worktree add ../worktrees/agent-a design/agent-a
git worktree add ../worktrees/agent-b design/agent-b
```

### Step 3：多 Agent 并行
| Agent | 工具链 | 特点 |
|-------|--------|------|
| Cursor + Pencil MCP | 交互式，写→验证→修复 | 稳定，一次成功率高 |
| Claude Code CLI | 盲写 .pen JSON | 内容创造力强，需正确处理文本 fill |
| Codex CLI | 盲写 .pen JSON | 视觉创意好（渐变/配色），执行稳定性差 |

### Step 4：Pencil 导出对比
```
open_document → get_editor_state → export_nodes (scale:2)
```

### Step 5：融合最优方案
从各 Agent 中取长补短，生成最终设计稿。

## 关键经验

### CLI 盲写 .pen 的必须规则
1. **每个 text 节点必须设 `fill` 属性**——否则文字完全不可见
2. 深色背景用白色 `#FFFFFF`，浅色背景用深色 `#2D2D2D`
3. 多页面使用 2行×4列 网格排列，避免超出画布 x 坐标上限（~1960px）
4. 文件格式：`{"version":"2.10","children":[...]}`

### Agent 能力画像（2026-04 实测）
- **Claude Code (Opus 4.6)**：内容创造力最强，会主动超越 PRD 增加功能（组词/田字格/划线价），9/10
- **Cursor/Opus (Opus 4.6)**：交互式最稳定，视觉精细度高，一次成功率最高，8.5/10
- **Codex (GPT-5.4)**：渐变配色最美，交互创意好（字高亮/内嵌字），但执行易卡住，8/10

### 推荐工作流
```
Claude Code CLI 盲写（发挥创意）
    → Pencil MCP 打开验证/微调（确保渲染正确）
    → export_nodes 高清导出（最终确认）
```

## 相关链接
- [[03-开发日志/2026-04-15-UI设计稿并行实验|实验完整记录]]
- [[05-技术文档/Pencil-MCP设计技巧|Pencil MCP 设计技巧]]
