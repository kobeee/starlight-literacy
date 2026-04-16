---
tags: [技术文档, Pencil, MCP, UI设计, 工具技巧]
created: 2026-04-15
updated: 2026-04-15
---

# Pencil MCP 设计技巧

## 概述
Pencil MCP 是 Cursor IDE 中的设计工具，通过 MCP 协议操作 `.pen` 文件进行 UI 设计。

## 核心工作流

### 1. 初始化
```
get_editor_state → open_document → set_variables → get_guidelines
```

### 2. 设计循环
```
batch_design (创建/修改) → snapshot_layout (检查布局) → get_screenshot (视觉验证)
```

### 3. placeholder 约束
- 新建或修改 frame 必须先设 `placeholder: true`
- 设计完成后必须设 `placeholder: false`
- placeholder 存在期间，不在该 frame 外操作

## 关键注意事项

### icon_font 不支持 fontSize
```javascript
// ❌ 错误
{type: "icon_font", fontSize: 24, width: 24, height: 24}
// ✅ 正确
{type: "icon_font", width: 24, height: 24}
```

### 文本必须设置 fill
```javascript
// ❌ 不可见
{type: "text", content: "Hello"}
// ✅ 可见
{type: "text", content: "Hello", fill: "#2D2D2D"}
```

### textGrowth 与 width 的关系
- `auto`（默认）：不设 width/height，自动适应文本
- `fixed-width`：必须设 width，height 自动
- `fixed-width-height`：必须设 width 和 height

### 使用变量引用
```javascript
// 设置变量
set_variables({variables: {"primary": {type: "color", value: "#FF6B6B"}}})
// 引用变量
{fill: "$primary"}
```

### AI 图片生成（G 操作）
- 可能超时（60s 限制）
- 先创建 frame，再用 G() 填充
- 超时时用渐变色 placeholder 替代

### 批量操作限制
- 每次 batch_design 最多 25 个操作
- 操作失败会全部回滚
- binding 名称在每次调用间不共享

## 布局最佳实践

### 移动端页面模板
```javascript
page=I(document, {
  type: "frame",
  width: 390, height: 844,  // iPhone 标准
  layout: "vertical",
  padding: [54, 24, 34, 24], // 安全区域
  gap: 16,
  clip: true,
  fill: "#FFF8F0"
})
```

### 弹性空间（推底部元素）
```javascript
spacer=I(page, {type: "frame", width: "fill_container", height: "fill_container"})
button=I(page, {type: "frame", ...})  // 这会被推到底部
```

### 水平居中的按钮
```javascript
btn=I(parent, {
  type: "frame",
  width: "fill_container", height: 56,
  cornerRadius: 28,  // pill shape = height/2
  fill: "#FF6B6B",
  layout: "horizontal",
  alignItems: "center",
  justifyContent: "center"
})
```

## 与其他 AI Agent 协作

### DESIGN.md 作为共识
- 创建标准化的 DESIGN.md 文件
- 定义颜色变量、字体层级、组件规范
- 所有 Agent 读取同一份设计规范

### .pen JSON 直接写入
- Claude Code / Codex 无法使用 Pencil MCP
- 可以直接写 .pen JSON（格式 `{"version":"2.10","children":[...]}`)
- 需要提供完整的 schema 说明

### Git Worktree 隔离
```bash
git branch design/agent-name
git worktree add ../worktrees/agent-name design/agent-name
```

## 2026-04-15 Claude Code 第二轮设计补充

### 画布宽度渲染限制（重要！）
- **Pencil 渲染器对画布 x 坐标有上限（约 x≈1960）**
- 超出此范围的 frame 子元素不会渲染（背景渐变/填充正常，但子节点全部不可见）
- **解决方案**：多页面设计时使用 2行×4列 网格排列，而非单行横排
```
Row 1: P01(0,0)  P02(490,0)  P03(980,0)  P04(1470,0)
Row 2: P05(0,944) P08(490,944) P09(980,944) P11(1470,944)
```
- 行间距 = 844(页面高度) + 100(间距) = 944px

### get_screenshot vs export_nodes
- `get_screenshot` 返回低分辨率缩略图，暖白底页面几乎看不到内容
- **始终使用 `export_nodes` (scale:2) 进行高清验证**
- 子节点可以单独导出验证，不受父 frame 渲染限制

### 设计变量最佳实践
- 在 `set_variables` 中定义所有颜色变量，使用 `$变量名` 引用
- 变量名用英文短横线命名：`star-gold`, `text-primary`, `btn-primary`
- 变量在 `resolveVariables: true` 的 batch_get 中可验证解析结果

### 文本渲染核心要点（上次失败的根因）
- **每个 text 节点必须设置 fill 属性**，否则完全不可见
- 深色背景用 `$text-white` (#FFFFFF)
- 浅色背景用 `$text-primary` (#2D2D2D)
- 半透明文本用 hex+alpha：`#FFFFFF99`, `#FFFFFFCC`

### Claude Code / Codex CLI 设计质量提升（v2 最终结论）
- **Claude Code v2 评分：9/10**（v1 仅 3/10，用户重跑后逆袭）
- **Codex v2 评分：8/10**（v1 仅 4.5/10）
- **Cursor/Opus 评分：8.5/10**
- Claude Code v2 赢下 5.5/8 页：组词模块、田字格、划线原价等功能创新超越 PRD
- 关键改进：fill 属性全覆盖 + 文本渲染正确 + 内容创造力释放
- **新洞察**：CLI 盲写修复渲染问题后，Agent 不受工具交互限制，创意产出反而更强
- **推荐工作流**：CLI 盲写（发挥创意）→ Pencil MCP 验证/微调（确保渲染正确）
