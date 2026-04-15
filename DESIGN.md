# 星光识字 · Design System

## 1. Visual Theme & Atmosphere

星光识字是一款面向 3~6 岁儿童的识字小程序，整体设计追求"纯净极美、温暖治愈"的品牌感。视觉语言以**星空主题**为核心——深蓝渐变底色（`#0B1A3E` → `#1A2F6E`）搭配星星元素和微光粒子，呼应"星光"品牌名。学习界面切换至**暖白底色**（`#FFF8F0`），护眼温和，如同柔软的纸张。

设计哲学：一屏只做一件事。信息密度极低，所有元素大而清晰，让不识字的幼儿也能通过图形、颜色、声音理解界面。圆角无处不在（16~24px），所有形状都带有"软糯"的质感。没有尖锐边缘，没有文字导航，一切靠图标和颜色引导。

插画风格：高饱和度、治愈系、细腻质感。每一屏都追求"家长想截图发朋友圈"的审美水准。动效以弹性缓动为主，轻快不花哨。

**Key Characteristics:**
- 星空深蓝渐变 + 暖白学习界面的双色调系统
- 超大圆角（16~24px）+ 柔和阴影，"软糯"视觉语言
- 所有可点击元素 ≥ 48×48pt，触控友好
- 高饱和度治愈系插画（AI 生成 + 人工审核）
- 圆润儿童友好字体，大号呈现，拼音辅助
- 星星/粒子/微光作为品牌视觉元素贯穿始终
- 纯净无干扰——无广告、无外链、无社交排行

## 2. Color Palette & Roles

### Primary Brand
- **Star Deep Blue** (`#0B1A3E`): 主品牌色，星空背景起始色，首页/地图背景
- **Star Mid Blue** (`#1A2F6E`): 星空渐变终止色
- **Star Gold** (`#FFD700`): 星星/成就/强调色，用于高亮当前单元、完成星级
- **Warm White** (`#FFF8F0`): 学习界面主背景色（护眼暖白）

### Functional Colors
- **Button Primary** (`#FF6B6B`): 主行动按钮——珊瑚红，温暖活泼
- **Button Primary Hover** (`#FF5252`): 按钮按下态
- **Button Secondary** (`#5B8DEF`): 次要按钮——天蓝色
- **Button Disabled** (`#D9D9D9`): 禁用态
- **Success Green** (`#4CAF50`): 答对/完成反馈
- **Error Soft** (`#FF8A80`): 错误反馈——柔和红色（不刺激）
- **Warning Amber** (`#FFB74D`): 警告/提示

### Surface & Background
- **Card White** (`#FFFFFF`): 卡片表面
- **Card Cream** (`#FFF3E0`): 暖色卡片底
- **Surface Light** (`#F5F0EB`): 次要表面（家长中心等）
- **Overlay Dark** (`rgba(11,26,62,0.6)`): 弹窗遮罩
- **Divider** (`rgba(0,0,0,0.08)`): 分隔线

### Text
- **Text Primary** (`#2D2D2D`): 主文本（暖黑，不用纯黑）
- **Text Secondary** (`#757575`): 次要文本
- **Text White** (`#FFFFFF`): 深色背景上的白色文本
- **Text Gold** (`#FFD700`): 星空背景上的金色强调文本
- **Pinyin Gray** (`#9E9E9E`): 拼音文本色

### Chinese Character Display
- **Char Display** (`#1A1A1A`): 大号汉字展示色
- **Char Stroke** (`#E0E0E0`): 描红灰色笔画
- **Char Fill Gold** (`#FFD700`): 书写完成后金色字体
- **Char Stroke Active** (`linear-gradient(135deg, #FF6B6B, #FFD700)`): 正在书写的笔画渐变色

## 3. Typography Rules

### Font Family
- **Chinese**: `"PingFang SC", "Noto Sans SC", "Microsoft YaHei"` — 圆润友好
- **Pinyin/English**: `"Inter", "SF Pro Rounded", -apple-system, sans-serif`
- **Display Hanzi**: 考虑使用 `汉仪乐喵体` 或类似圆润字体用于大号展示

### Hierarchy

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display Char | 96px | 700 | 1.1 | 认字页大号汉字展示 |
| Display Pinyin | 36px | 500 | 1.2 | 认字页拼音 |
| Hero Title | 32px | 700 | 1.3 | 页面大标题 |
| Section Title | 24px | 600 | 1.3 | 区块标题（单元名称等） |
| Card Title | 20px | 600 | 1.4 | 卡片标题 |
| Body Large | 18px | 500 | 1.5 | 组词/造句文本 |
| Body | 16px | 400 | 1.5 | 正文/描述 |
| Caption | 14px | 400 | 1.4 | 辅助文本 |
| Small | 12px | 500 | 1.3 | 标签/角标 |
| Char Label | 48px | 700 | 1.2 | 选项中的汉字展示 |

## 4. Component Stylings

### Buttons

**Primary Button (CTA)**
```
Height: 56px (extra-large for children)
Padding: 24px 48px
Background: #FF6B6B
Corner Radius: 28px (full-round pill)
Shadow: 0 4px 12px rgba(255,107,107,0.3)
Text: #FFFFFF, 18px, weight 600
Pressed: scale(0.95), background #FF5252
```

**Secondary Button**
```
Height: 48px
Padding: 16px 32px
Background: #5B8DEF
Corner Radius: 24px
Text: #FFFFFF, 16px, weight 500
```

**Icon Button (Navigation)**
```
Size: 56×56px
Background: rgba(255,255,255,0.15) on dark / #FFFFFF on light
Corner Radius: 28px (circle)
Icon Size: 28px
```

### Cards

**Unit Card (学习地图单元卡)**
```
Width: fill_container
Padding: 20px
Background: #FFFFFF
Corner Radius: 20px
Shadow: 0 4px 16px rgba(0,0,0,0.08)
Border: none
States:
  Completed: border 2px solid #FFD700, star icons filled
  Current: scale(1.05), glow shadow #FFD700
  Locked: opacity 0.5, lock icon overlay
```

**Character Card (汉字预览小卡)**
```
Size: 72×72px
Background: #FFF3E0
Corner Radius: 16px
Char: centered, 36px, weight 700
Pinyin: below char, 12px
```

**Illustration Card (认字页插画)**
```
Width: fill_container
Height: 300px
Corner Radius: 24px
Overflow: clip
Image: fill mode
```

### Progress Bar
```
Height: 8px
Background Track: rgba(0,0,0,0.08)
Fill: linear-gradient(90deg, #FF6B6B, #FFD700)
Corner Radius: 4px
```

### Star Rating
```
Star Size: 40px
Filled: #FFD700
Empty: #E0E0E0
Spacing: 8px
```

### Navigation Bar (Top)
```
Height: 56px
Background: transparent (overlay on content)
Back Button: 40×40px circle, white/semi-transparent
Title: centered, 18px, weight 600
```

## 5. Layout Principles

### Spacing Scale (based on 8px grid)
- `4px` — micro spacing (icon-to-label)
- `8px` — tight (within components)
- `12px` — compact
- `16px` — standard gap
- `20px` — section internal padding
- `24px` — between sections
- `32px` — page padding horizontal
- `48px` — major section separation
- `64px` — hero spacing

### Screen Layout
- **Frame Size**: 390×844px (iPhone standard)
- **Safe Area Top**: 54px (status bar + notch)
- **Safe Area Bottom**: 34px (home indicator)
- **Content Padding**: 24px horizontal
- **Pages arranged horizontally** on canvas with 100px gap between frames

### Grid Philosophy
- 单列布局为主（一屏一件事）
- 汉字选项最多 2×2 网格，gap 16px
- 学习地图纵向卷轴，单元卡片堆叠

## 6. Depth & Elevation

### Shadow System
| Level | Shadow | Usage |
|-------|--------|-------|
| Flat | none | 背景元素、文本 |
| Subtle | `0 2px 8px rgba(0,0,0,0.06)` | 轻微浮起的卡片 |
| Card | `0 4px 16px rgba(0,0,0,0.08)` | 标准卡片 |
| Elevated | `0 8px 24px rgba(0,0,0,0.12)` | 浮动按钮、选中卡片 |
| Modal | `0 16px 48px rgba(0,0,0,0.2)` | 弹窗/对话框 |
| Glow Gold | `0 0px 20px rgba(255,215,0,0.4)` | 星星发光效果 |

### Surface Hierarchy
1. **Sky Layer** — 星空渐变背景（最底层）
2. **Content Layer** — 暖白内容区域（圆角覆盖）
3. **Card Layer** — 白色卡片（浮起于内容层）
4. **Interactive Layer** — 按钮/选项（最高层）
5. **Overlay Layer** — 弹窗/提示（覆盖全屏）

## 7. Do's and Don'ts

### Do's ✓
- 使用大按钮（≥48pt）和宽容错区域
- 所有反馈都用视听双通道（动画+音效）
- 错误反馈温和——"再试一次"而不是"错了"
- 保持每屏信息极低密度
- 用图标和颜色替代文字导航
- 插画追求"朋友圈级"审美
- 星空元素始终贯穿品牌感

### Don'ts ✗
- 不使用纯黑（#000000）——用暖黑 #2D2D2D
- 不使用纯白背景——用暖白 #FFF8F0
- 不使用尖角（所有圆角 ≥ 12px）
- 不出现任何文字导航菜单
- 不使用红色"×"或负面表情作为错误反馈
- 不做复杂嵌套布局——保持扁平
- 不使用小于 14px 的文字

## 8. Responsive Behavior

### Target Devices
- 主要：iPhone SE ~ iPhone 16 Pro Max（375~430pt width）
- 次要：Android 主流机型
- 设计基准：390pt width（iPhone 14/15）

### Touch Targets
- 最小触控区域：48×48pt
- 推荐触控区域：56×56pt（按钮）
- 选项卡片：最小 72×72pt

### Adaptation Strategy
- 横向：内容居中，最大宽度 430pt
- 纵向：flex 布局自适应，内容自然流动
- 插画：保持宽高比，宽度 fill_container

## 9. Page Design Specifications

### P01 - 首页（学习地图）
- 全屏星空渐变背景（#0B1A3E → #1A2F6E）
- 顶部：品牌 Logo + "星光识字" 标题（金色）
- 右上角：家长中心入口（小圆形按钮）
- 中央：纵向卷轴地图，单元卡片从下到上排列
- 当前单元高亮跳动 + 金色光晕
- 已完成单元显示星级评价
- 未解锁单元灰色 + 锁图标

### P02 - 单元入口
- 暖白背景 #FFF8F0
- 顶部返回箭头
- 单元主题名称 + 插画 banner
- 字卡网格预览（已学/未学状态）
- 进度条（第 X 组 / 共 Y 组）
- 底部 CTA "开始学习" 大按钮

### P03 - 认字页
- 暖白背景
- 上半屏：全幅字源插画（圆角卡片，300px高）
- 下半屏：大号汉字（96px）+ 拼音（36px）+ 组词
- 底部："下一步" 按钮（延迟出现，呼吸动画）

### P04 - 书写页
- 暖白背景
- 顶部小字提示当前字 + 拼音
- 中央：田字格书写区域（大尺寸，占屏幕60%）
- 灰色空心描红字 + 引导小手动画
- 底部：笔画进度圆点指示器

### P05 - 练习页
- 暖白背景
- 顶部进度条
- 中央：题目区域（插画/语音图标 + 选项）
- 选项：大号汉字卡片（72×72px以上）
- 底部：反馈区域

### P08 - 测验结果
- 星空背景 + 庆祝元素
- 中央：大号星级展示（1~3 星）
- 鼓励文案
- 按钮组："下一单元" / "再试一次" / "分享"

### P09 - 付费引导
- 暖白背景 + 品牌点缀
- 顶部：孩子成就回顾（"已学会 X 个字！"）
- 中央：价格卡片（层级对比）
- 底部："开始学习" CTA + "稍后再说" 文字链

### P11 - 家长中心
- Surface Light 背景 #F5F0EB
- 数学验证入口（3+5=?）
- 今日学习卡片（新学字数/正确率/时长）
- 累计进度条
- 设置项列表（防沉迷/护眼等）

## 10. Agent Prompt Guide

### Quick Color Reference
```
Background (starry): #0B1A3E → #1A2F6E gradient
Background (learning): #FFF8F0
Cards: #FFFFFF
Warm cards: #FFF3E0
Primary CTA: #FF6B6B
Secondary: #5B8DEF
Gold accent: #FFD700
Success: #4CAF50
Error (soft): #FF8A80
Text primary: #2D2D2D
Text secondary: #757575
```

### Design Prompt for AI Agents
When designing pages for 星光识字:
1. Use 390×844px frames (iPhone)
2. Apply warm white #FFF8F0 background for learning pages, starry gradient for home/results
3. All corner radius ≥ 16px, buttons use pill shape (radius = height/2)
4. Button minimum 48px height, recommend 56px
5. Chinese characters display at 48px+ for options, 96px for featured
6. Use Material Symbols Rounded for icons
7. Arrange multiple pages horizontally with 100px gap
8. Each page is a top-level frame on the canvas
