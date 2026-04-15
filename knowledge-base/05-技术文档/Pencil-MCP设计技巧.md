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
