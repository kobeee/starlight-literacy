---
tags: [技术文档, Pencil, Pencil CLI, UI设计, 工具技巧]
created: 2026-04-15
updated: 2026-04-27
---

# Pencil CLI 设计技巧（原 MCP 事故记录）

> 🔴 **2026-04-25 当前铁律**：本项目统一使用 **Pencil CLI** 操作 `.pen` 文件。不要再使用 Pencil MCP、桌面 socket 或会把截图/base64 原图内联回会话的接口。本文旧 MCP 内容只作为历史事故记录和 schema 经验保留；实际操作以 CLI 为准。
>
> ⚠️ **2026-04-19 重要修正**：下文 2026-04-15 节的"画布宽度渲染限制（x>1960）"**结论被本轮实验推翻**，真因是 `I()` 从零建复杂 frame 静默失败。修正见文末 "2026-04-19 补充" 节。旧内容保留作历史追溯。

## 概述
Pencil CLI 是当前唯一默认工具链，用于读取、修改、保存、导出 `.pen` 设计稿。MCP 相关经验只用于理解历史问题，不再作为常规操作入口。

## 核心工作流

### 1. 检查 CLI 状态
```bash
pencil status
```

### 2. 精确编辑
```bash
pencil interactive -i design.pen -o /tmp/design-work.pen
```

交互内遵循：
```text
get_editor_state({ include_schema: true })
batch_get(...) / snapshot_layout(...)
batch_design(...)
save()
exit()
```

### 3. 导出验证
```bash
pencil --in design.pen --export /tmp/starlight-literacy/exports/p01-polish/9wPMd.png --export-node 9wPMd --export-scale 2
```

验证图片只使用缩略图或压缩图，不把原始大图发给模型。
导出验收 PNG 统一写到 `/tmp/starlight-literacy/exports/`，不要在项目根目录创建 `exports-*`、`export-*` 或 `exports/`。

### 4. placeholder 约束
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
- 默认不要直接盲写 `.pen` JSON；优先使用 Pencil CLI 读取 schema、执行 `batch_design`、保存和导出。
- 只有在 CLI 明确不可用、且用户接受风险时，才考虑直接改 JSON。
- 直接写 JSON 后必须 `jq empty design.pen` 校验，并重新用 Pencil CLI 打开/导出复核。

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

### 截图与导出
- 不使用会把截图/base64 原图内联回对话的接口。
- 使用 CLI `export_nodes` 导出到本地文件，再生成缩略图本地复核。
- **始终使用 `export_nodes` (scale:2) 进行最终验证**
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
- **新洞察**：CLI 交互式编辑修复渲染问题后，Agent 不受桌面工具交互限制，创意产出反而更强
- **推荐工作流**：Pencil CLI 读现状 → 小批量 `batch_design` → CLI 导出文件 → 缩略图复核 → `save()`

## 2026-04-16 设计优化轮补充

### 批量配色迁移方法
- `replace_all_matching_properties` 可一次性替换整棵节点树中所有匹配的属性值
- 支持 fillColor、textColor、strokeColor、fontSize、fontWeight、cornerRadius、padding、gap 等
- 用法：指定 `parents`（顶层节点 ID 数组）+ `properties`（from→to 映射数组）
- 适合全局配色迁移、字号统一、圆角合规检查等场景
```javascript
replace_all_matching_properties({
  parents: ["page1", "page2", ...],
  properties: {
    fillColor: [
      {from: "#0B1A3E", to: "#E8E0F0"},
      {from: "#1A2F6E", to: "#D4E8F7"}
    ]
  }
})
```

### snapshot_layout 问题检测
- `snapshot_layout({problemsOnly: true})` 只返回有布局问题的节点
- 常见问题类型：`partially clipped`（部分裁剪）、`fully clipped`（完全不可见）
- 修复优先级：fully clipped > partially clipped
- 典型原因：子元素超出父 frame 的 clip 边界、padding 挤压导致内容溢出

### 复杂布局崩溃的终极方案
- 当反复调整布局仍然崩溃时（子元素 y 偏移异常、flexbox 计算错误），**不要继续调试**
- **Copy 策略**：找一个结构相似且渲染正常的节点 → `C()` 复制 → 仅修改文本/颜色等内容属性
- 这比从零 `I()` 插入更可靠，因为保留了原节点的渲染上下文和布局状态

### Material Symbols Rounded 图标验证
- 不是所有 Material Icons 都在 Rounded 变体中可用
- 已确认不存在：`auto_awesome`、`emoji_events`
- 安全替代：`auto_awesome` → `stars`、`emoji_events` → `military_tech`
- 建议：使用前先用 `batch_get` 搜索 `{type: "icon_font", name: "xxx"}` 验证是否可用

### search_all_unique_properties 审计用法
- 可递归搜索指定节点树下所有唯一的属性值
- 适合审计：所有使用的 fillColor、fontSize、cornerRadius 等
- 用于验证设计规范合规性（如"是否所有圆角 ≥ 20px"、"是否有 <14px 字号"）

## 2026-04-17 视觉细节打磨轮补充

### 文本渐变填充（对比度强化利器）
text 节点的 `fill` 属性完整支持 gradient 对象，不只是纯色或变量引用。这是深/彩底文字对比度不够时的最佳解法，避免用描边或简单加深背景。

```javascript
U("titleTxt", {
  fill: {
    type: "gradient", gradientType: "linear", rotation: 180,
    colors: [
      {color: "#FFFFFF", position: 0},
      {color: "#FFF2C7", position: 0.5},
      {color: "#FFD166", position: 1}
    ]
  }
})
```

配合 `effect: {type:"shadow", offset:{x:0,y:3}, blur:12, color:"#深色80"}` 效果更立体。

### flex 容器 I() 插入的 +50px y 偏移 bug
在 `layout: "horizontal" | "vertical"` 的容器内用 `I()` 插入新子节点时，子节点会自动带 **+50px 的 y 偏移**，导致渲染位置超出父 frame 的 clip 边界。

**复现案例**（P01 首页优化）：
- bottomNav 设置 y=756 → 实际渲染到 y=806
- Streak 打卡条子元素 y=64、y=84，父高仅 69px，完全被裁

**规避方案**：
1. 不要向 flex 容器 `I()` 新子节点
2. 只用 `U()` 修改已有节点的属性
3. 必须新增时，`I()` 到顶层 frame 并用 `layoutPosition: "absolute"`（此时仍有 +50，但可手动补偿坐标）

### Material Symbols Rounded 图标黑名单扩充
| ❌ 不存在 | ✅ 可用替代 |
|---|---|
| auto_awesome | flare / stars |
| emoji_events | workspace_premium / military_tech |
| auto_fix_high | brush |
| auto_graph | trending_up |

**使用前验证**：`batch_get({patterns:[{type:"icon_font",name:"xxx"}]})` 搜索整库或先小批量试跑。

### 装饰聚落化原则
孤立装饰元素（单颗星、单个心）视觉上很"穷"。以孤立元素为锚点，按以下规则形成聚落：
1. 聚落至少 3 个元素，大中小密度梯度
2. 颜色/形状混搭（星 + 心 + 闪光）
3. 透明度从锚点向外递减（75% → 50% → 30%）
4. 中段留低透明"节奏点"让视觉连续，避免上下两端孤岛

### 差异化套路（3 数据并列）
平铺的 3 个数据/卡片会显得单调。标准三色区分：

| 数据类型 | 主色（token） | 背景渐变 | 描边 |
|---|---|---|---|
| 成绩/累计 | `$starlight-gold` #FFD166 | gold-26→gold-10 | gold-55 |
| 正确率/完成 | `$mint-green` #7ECFB8 | mint-26→mint-10 | mint-55 |
| 时长/次数 | `$sky-powder-deep` #8BB8E8 | blue-26→blue-10 | blue-55 |

数字使用同色系浅→深渐变，标签亮度 +30%。

## 2026-04-18 P01 蜿蜒小路尝试补充

### type:"path" 节点渲染 bug（重要！）

**现象**：`type:"path"` 的 SVG 路径节点写入 .pen 文件成功（batch_get 能读回完整 geometry），但 CLI 导出渲染时不可见。

**已验证无效的方案**：
1. 直接 `I("parent", {type:"path", layoutPosition:"absolute", ...})` — 不渲染
2. 极端参数（纯红 30px 粗线）— 不渲染
3. `layout:"none"` 的 frame wrapper 包裹 path — 不渲染

**复现代码**（失败例）：
```javascript
I("Qm8Jg", {
  type:"path",
  layoutPosition:"absolute",
  x:0, y:0, width:390, height:844,
  viewBox:[0,0,390,844],
  geometry:"M 50 400 L 340 400",
  stroke:{fill:"#FF0000", thickness:30, cap:"round", align:"center"}
})
// 文件里有，截图里看不见
```

**规避方案**：
- 曲线/路径视觉需求 → **放弃 path 节点**，改用：
  - 多段 `ellipse` 沿贝塞尔采样点排布（踏脚石效果，但视觉不等效于连续曲线！）
  - 多段窄 rectangle 拼接折线
  - icon_font 里的现成路径图标（waves、timeline 等）
  - 最根本方案：交给前端代码真 SVG 渲染

**结论**：**path 节点视为当前 Pencil 导出渲染盲区**，在 Pencil 设计阶段不能指望它可视化。"像 Duolingo 弯曲小路"这类诉求应明确告知用户当前工具限制。

### 诚实交付原则（本轮最大教训）

看到工具能力边界时应立刻停下来如实告知用户，而不是用"看起来像"的妥协方案硬凑。具体到本轮：
- path 不渲染 → 应直接说"当前 Pencil 导出链路画不出连续曲线"
- 不应自作主张用 12 颗踏脚石凑一条"路" —— 用户的诉求是连续曲线，密集圆点在视觉本质上就是点阵，再多也不是路
- 早承认能力边界比继续凑更专业

## 2026-04-19 补充：渲染 bug 根因修正 + Copy 策略上升为铁律

### 推翻"画布宽度 x>1960 不渲染"假设

4/15 节里把"P05 之后的页面空白"归因为画布 x 坐标超过 1960。**这个结论是错的**，本轮被多个反证推翻：

| 节点 | x 坐标 | 是否渲染 |
|---|---|---|
| ZXtU6（P09 付费引导） | 2940 | ✅ 正常 |
| wEaOQ（P11 家长中心） | 3430 | ✅ 正常 |
| 本轮新建空白页（P06/P07/P10 first attempt） | 0 | ❌ 空白 |

x 坐标和渲染失败不存在因果关系。当时之所以"网格布局解决"看起来有效，是因为重建时顺手用 Copy 复制了已有页面，真正起作用的是 Copy 而不是网格位置。

### 真因：I() 从零建复杂 frame 静默失败

**复现条件**：
```javascript
// ❌ 从零建整页结构 → 写入成功 / batch_get 可读 / 截图全空白
I("document", {
  type:"frame", width:390, height:844,
  layout:"vertical", padding:[54,24,34,24], gap:16,
  fill:"#FAF6F0", clip:true, name:"P06"
})
// 之后再 I() 子节点也都不可见
```

```javascript
// ✅ 从已工作模板 Copy → 立即可见
C("JGbRx", "document", {x:4410, y:0, name:"P06-答题页"})
// 之后用 U("newId/childId", {...}) 改内容全部生效
```

**判定边界**：
- 单节点 `I()`（text、icon_font、单个 rect/ellipse）插入到**已渲染**的 frame 内 → 渲染正常
- 多层嵌套 `I()` 从零生成整页结构 → 静默失败概率极高
- `C()` 复制任何已渲染节点 → 始终成功

推测原因：渲染器内部某种"渲染上下文初始化"步骤只在节点首次创建时执行，从零 `I()` 触发不到，复制操作则继承已存在的上下文。**这是工具内部 bug，外部无法绕过，只能用 Copy 策略回避**。

### Copy 策略升格为铁律

之前 4/16 节的"复杂布局崩溃用 Copy"是**事后救火**定位，本轮升格为**事前预防**铁律：

```
新建任何复杂页面 / 卡片 / 模态：
  Step 1: 在现有节点里找结构最相似的"模板"（首选 P05 JGbRx — Hero+网格+底部条三段式万能）
  Step 2: C(templateId, "document", {x, y, name:"新页面名"})
  Step 3: U("newId/childId", {...}) 逐项改文字/颜色/图标
  Step 4: 用不到的子树 D() 删除

不再尝试 I() 从零建整页。即使简单页面也优先 Copy。
```

**模板节点速查**（截至 4/19）：
| 模板 ID | 结构 | 适用场景 |
|---|---|---|
| `JGbRx` (P05 练习页) | 顶部导航 + Hero 大字 + 4 选 1 网格 + 底部反馈条 | 答题 / 选字 / 庆祝类页面（P06/P07/P10 都来自这个模板） |
| `Qm8Jg` (P01 首页) | 顶部品牌 + 单元卡片瀑布流 + 浮球入口 | 列表型 / 地图型主页 |
| `wEaOQ` (P11 家长中心) | 卡片网格 + 数据条 | 设置类 / 数据展示类 |

### 验证流程更新

```
batch_design (Copy + Update)
  ↓
export_nodes scale:1 到本地文件（先冒烟）
  ↓
内容/视觉细节调整（U 操作链）
  ↓
export_nodes scale:2 高清复核（最终验收）
```

不要用会内联原始截图的接口做验收。统一导出到本地文件，再用缩略图或压缩图做视觉复核。

### 教训

**memory 里的工具行为假设必须能被反证实验推翻，不能因为"以前这么干过"就当成事实。** "x>1960 不渲染"这条错误结论从 4/15 一路带到 4/19 才被推翻，期间多次浪费时间挪坐标位置追错方向。今后任何写进 memory 的"工具 bug 规避方案"，都必须附带**最小复现实验**和**反例验证**，否则只是侥幸观察的过度归因。

## 2026-04-25 补充：Pencil CLI 恢复 `.pen` 的稳定流程

本次 P01 长卷恢复使用 Pencil CLI headless interactive 完成，结论是：**CLI 适合“读取现状 → 小批量 batch_design → 导出验收 → 保存”的恢复任务**，比直接盲写 `.pen` JSON 更可控。

后续 `.pen` 操作统一走 CLI；不要再切回 MCP。CLI 在沙箱内可能因本地 WebSocket 监听权限失败，此时按权限流程运行：

```bash
pencil interactive -i design.pen -o /tmp/design-work.pen
```

### 推荐命令

```bash
pencil status
pencil interactive -i design.pen -o design.pen
```

进入交互 shell 后按以下顺序：

```text
get_editor_state({ include_schema: true })
batch_get({ readDepth: 2 })
snapshot_layout({ maxDepth: 0 })
batch_design({ operations: "..." })
export_nodes({ nodeIds:["目标节点"], outputDir:"/tmp/starlight-literacy/exports/xxx", scale:1 })
snapshot_layout({ parentId:"目标节点", problemsOnly:true, maxDepth:3 })
save()
exit()
```

### 本次实测有效点

- `pencil 0.2.5` 可直接操作当前项目 `design.pen`。
- `pencil status` 可确认登录态；本次账号为 Active。
- `export_nodes` 适合作为最终视觉验收，比只看结构可靠。
- `export_nodes` 的 `outputDir` 统一使用 `/tmp/starlight-literacy/exports/...`，项目根目录不放临时导出图。
- `snapshot_layout(... problemsOnly:true)` 能快速确认没有异常裁切；预览画板里长卷副本被视窗裁切属于预期，不算错误。
- 保存前必须显式调用 `save()`，否则 headless interactive 的编辑不会可靠落盘。

### 这次踩到的关键坑

- 研发笔记记录的节点 ID 可能和当前 `design.pen` 不一致。4/25 笔记曾写 `SKCMe / n3K6E`，但 CLI 打开当前文件只看到旧 `Qm8Jg`，未发现这两个节点。恢复时必须以**当前文件结构 + 权威日志**共同判断。
- 复制出来的预览副本是独立树。长卷本体后续改了雾带、层级或标签，预览不会自动同步，必须删除旧副本后重新 `C("长卷", "预览画板", {...})`，或手动同步内部节点。
- `placeholder:true` 适合编辑中标记工作画板，但收尾前必须 `U("id",{placeholder:false})`，然后用 `rg -n "placeholder" design.pen` 复查。
- `PingFang SC` 会被 CLI 提示为 invalid font family，但项目既有页面大量使用且导出可渲染；除非出现实际视觉问题，不必因为这条提示中断恢复。
- Pencil 桌面端如果标题显示 `design.pen — Edited`，说明它持有未保存的内存状态，不会自动刷新 CLI 写回磁盘的版本。此时**不要在桌面端直接 Save**，否则可能把旧内存状态覆盖回磁盘。应先另存/关闭不保存，再重新打开磁盘文件；本次正确磁盘版本已额外备份到 `.codex-temp/design-p01-polish-saved-20260425-1601.pen`。

### P01 恢复案例速记

- 当前正式长卷：`9wPMd`
- 当前单屏预览：`IF6la`
- 当前精修导出目录：`exports-p01-polish/`
- 早期恢复导出目录：`exports-p01-restore/`
- 旧单屏首页：`Qm8Jg` 已删除，不再作为正式 P01 参考
- 关键验收：
  - `exports-p01-polish/9wPMd.png` 为 `780×3600`（scale 2）
  - `exports-p01-polish/IF6la.png` 为 `780×1688`（scale 2）
  - 长卷本体 `snapshot_layout(... problemsOnly:true)` 无问题

### P01 2026-04-25 精修状态

- `9wPMd / IF6la` 已同步完成关卡圆去灰：
  - 已通关主圆：`#E1B46A`
  - 已通关勾选：`#FFF8E8`
  - 未解锁圆：`#EBD8A8`
  - 锁 icon：`#B58A4A`
  - 路径点：`#D4A14A99`
- `IF6la` 左侧硬白/浅绿竖带已修复：`rXgrb / qulAl` 均为 `x=0,width=390`。
- 路上的空白椭圆台阶属于背景图 `images/generated-1776749248335.png`，不是独立 Pencil 节点；若要调整，只能重绘/替换底图或叠加遮罩。
- 预览画板的 `SsbLg y=-460` 被父级裁切是正常取景，不是布局问题。
- 如果 Pencil 桌面端仍显示灰色圆圈，先检查窗口标题是否为 `Edited`；磁盘 `design.pen` 可用 `rg '#E1B46A|#EBD8A8|#D4A14A99' design.pen` 验证是否已是新版本。

### P01 2026-04-26 保存与前景叠层状态

- 当前正式长卷仍是 `9wPMd`，单屏预览仍是 `IF6la`。
- 当前背景资产：`images/p01-bg-redraw-road-centered-20260426.png`。
- 当前前景装饰资产：`images/p01-pastoral-overlay-20260426.png`。
- 当前动物边缘叠层资产：`images/p01-animal-edge-overlay-20260426.png`，源图为 `images/p01-animal-edge-overlay-source-20260426.png`。
- 起点小房子资产 `images/p01-start-house-large-ui-20260426.png` 和旧 `images/p01-start-house-small-20260426.png` 均为历史实验资产；2026-04-27 已按用户反馈从正式脚本移除。
- `scripts/p01-visual-embellishments.js` 现在只返回 `p01PastoralOverlay` 和 `p01AnimalEdgeOverlay` 两个图片节点；不要恢复旧的兔子、鸟、蜗牛、蝴蝶等形状动物函数，也不要恢复 `p01StartHouse`。
- `design.pen` 中脚本节点名已改为 `P01沿途田园叠层`。
- 用户要求补 `pencil save` 后，实测有效保存流程：
  - `pencil interactive -i design.pen -o /tmp/design-user-requested-save-20260426.pen`
  - 动物叠层追加后的补保存文件为 `/tmp/design-user-requested-animal-save-20260426.pen`
  - 起点小房子追加后的补保存文件为 `/tmp/design-user-requested-start-house-save-20260426.pen`
  - 起点房子放大重绘后的补保存文件为 `/tmp/design-p01-start-house-large-save-20260426.pen`
  - 用户决定大房子先保留后的补保存文件为 `/tmp/design-user-requested-large-house-save-20260426.pen`
  - 最新覆盖前备份为 `.codex-temp/design-before-user-requested-large-house-save-20260426.pen`
  - 单独发送 `save()`，不要和 `exit()` 连发
  - 校验 `/tmp/*.pen` 非空、`jq empty` 通过、关键引用存在
  - 再 `exit()`，最后用有效 `/tmp/*.pen` 覆盖回 `design.pen`
- 本次保存后的 `design.pen` 为 `339682` bytes。
- 关键点：前景图、动物图保持外部图片引用，不内联进 `.pen`；`design.pen` 文件大小不随这些装饰图片增加。
- 当前设计判断：起点房子方案已废弃。下一轮若继续 P01，不要围绕房子做低对比/放大/融合度修补，除非用户重新明确要求恢复这个视觉隐喻。

### 2026-04-27 Pencil CLI save 补测

本次用户再次要求 `pencil save`，验证流程稳定：

- 覆盖前备份：`.codex-temp/design-before-user-requested-save-20260427.pen`，`334906` bytes，`jq empty` 通过。
- 交互命令：`pencil interactive -i design.pen -o /tmp/design-user-requested-save-20260427.pen`。
- 进入 Ready 后先跑 `get_editor_state({ include_schema: false })`，确认当前 active editor 是项目内 `design.pen`。
- 单独发送 `save()`，等待 CLI 输出 `Saved /tmp/design-user-requested-save-20260427.pen`。
- 退出前后都不信任输出本身，继续检查：
  - `/tmp/design-user-requested-save-20260427.pen` 非空
  - `jq empty /tmp/design-user-requested-save-20260427.pen` 通过
  - 保存文件大小为 `334777` bytes
- 校验后才覆盖回正式 `design.pen`，覆盖后 `design.pen` 同样为 `334777` bytes 且 `jq empty` 通过。
- 冷色/考试化残留扫描无命中：`正确率|用时|再试一次|重考|错不罚|47/1300|FF7B9C|2A4494|4B6CB7|E8E0F0|B5A7D5|D4E8F7|Inter|generated-1776266885389`。

本次 CLI 仍出现 Noto / Material Symbols 字体 fetch timeout，但编辑器已 Ready，且本地图片资源加载完成；这类字体网络超时不等同于 `.pen` 保存失败。真正的保存判定只看最终文件非空、JSON 有效、关键内容扫描通过。

### 2026-04-27 P01 脚本叠层缓存与小房子移除

用户指出 P01 底部“我的家”旁的小房子比例不协调，要求高效处理且不要把原图放进请求。处理方式是直接删除脚本叠层里的房子节点，不再生成新房子。

- 修改点：`scripts/p01-visual-embellishments.js` 删除 `p01StartHouse`，移除 `./images/p01-start-home-entrance-ui-164-20260426.png` 引用。
- 当前脚本只返回：
  - `p01PastoralOverlay`
  - `p01AnimalEdgeOverlay`
- 验证导出目录：`exports-p01-start-house-harmonize-20260427/`。
- 关键扫描应无命中：`rg "p01StartHouse|p01-start-home-entrance|p01-start-house-large-ui|Foliage" design.pen scripts/p01-visual-embellishments.js`。
- 当前 `design.pen` 保存后大小为 `334777` bytes，`jq empty design.pen` 通过。

注意：Pencil interactive 会缓存脚本节点渲染结果。同一 headless 进程中改脚本后连续导出，可能继续看到旧房子或临时遮盖层。处理脚本节点视觉问题时，最终验收必须重启 `pencil interactive`，等它重新 `read-file scripts/...` 后再 `export_nodes`。
