# 星光识字 · Design System

> Design system for a children's literacy app (ages 3–6). Keywords: 天真 · 无邪 · 快乐 · 幸福 · 无忧无虑 · 有趣 · 好玩。

---

## 1. Visual Theme & Atmosphere

**Brand Essence:** 星光识字不是“梦幻魔法夜空”产品，而是一个发生在暖阳田野里的儿童识字绘本。孩子进入页面时，应该像走进一张被太阳晒过的插画：柔软、明亮、轻松、没有压迫感。

**Design Philosophy:** *One screen, one happy little world.* 每一屏只做一件事，但每一屏都要有情绪。不是靠炫技、glow、紫蓝渐变制造“魔法感”，而是靠暖光、留白、插画、圆润形体和有节奏的色彩，让孩子自然觉得亲近、好玩、愿意继续点下去。

**Mood:** 春日下午的花田和小院子。奶油米纸面、晒暖的蜂蜜金、低饱和花朵色、远处的小屋、云朵和小动物。整体像被阳光过滤过，而不是被霓虹灯照过。

**Key Characteristics:**
- 暖米底色主导，像绘本纸面而不是发光屏保
- 低饱和暖彩点缀，而不是平均分彩虹
- 圆润、厚实、可触摸的按钮和卡片
- 手绘插画和场景感优先于装饰性特效
- 信息密度低，一眼只看到一个重点
- 正反馈明确，但不靠廉价 glow 和彩色爆炸
- 孩子觉得轻松好玩，家长觉得温暖、精致、可信

---

## 2. Design Intent

### 关键词怎么落地

| 关键词 | 对应设计动作 |
|---|---|
| 天真 | 大形体、低门槛、不过度精致，像儿童绘本而不是成人 UI |
| 无邪 | 不用攻击性强的黑、红、霓虹；反馈永远柔和 |
| 快乐 | 明亮暖色、小奖励、小星星、小庆祝，但不过量 |
| 幸福 | 画面像有陪伴感：花田、小屋、云朵、温暖留白 |
| 无忧无虑 | 减少压迫信息，不制造失败恐惧和 KPI 焦虑 |
| 有趣 | 每页都有一个可感知的小亮点：插画、字卡、节奏变化 |
| 好玩 | 点一下就有回报，视觉上“想摸”“想点”“想继续” |

### 双受众原则

- 对孩子：先理解、先想点、先获得鼓励。
- 对家长：看起来干净、有审美、有品质，不像廉价 AI 壳子。

---

## 3. Color Palette & Roles

### Foundation
| Token | Hex | Role |
|---|---|---|
| `paper-cream` | `#FAF6F0` | 全产品主背景，暖米纸面 |
| `card-warm` | `#FFFAEC` | 主卡片背景 |
| `card-soft` | `#FFF4C7` | 提示条、轻强调卡 |
| `line-soft` | `#EFE7DC` | 轻描边、分隔线 |
| `text-primary` | `#5D4A36` | 主文字，暖深棕 |
| `text-secondary` | `#7A6A55` | 次文字 |
| `text-tertiary` | `#9A8F82` | 标签、小说明 |

### Core Accent
| Token | Hex | Role |
|---|---|---|
| `honey-gold` | `#FFC947` | 全产品主强调色，CTA / 当前态 / 关键奖励 |
| `gold-deep` | `#E8A800` | 大字、图标、需要更强对比的金色前景 |
| `gold-paper` | `#FFEDB8` | 题面卡 / banner / 轻主视觉底色 |
| `gold-brown` | `#8B5E00` | 金色区域上的深文字 |

### Meadow Supporting Palette
| Token | Hex | Role |
|---|---|---|
| `grass-soft` | `#D8E8C5` | 自然系辅助底色 |
| `grass-deep` | `#9CC077` | 绿色描边/轻状态 |
| `petal-soft` | `#FFD9D9` | 粉系辅助底色 |
| `petal-deep` | `#F5A8A8` | 粉系描边/轻状态 |
| `sky-soft` | `#D4E8F0` | 蓝系辅助底色 |
| `sky-deep` | `#8FBED4` | 蓝系描边/轻状态 |
| `apricot-soft` | `#FFE0C2` | 橘系辅助底色 |
| `apricot-deep` | `#FFB87A` | 橘系描边/轻状态 |
| `mint-soft` | `#F0FAF6` | 家长端可信辅助色 |

### Semantic Usage
| Token | Hex | Role |
|---|---|---|
| `success-soft` | `#E8F5EF` | 正确/完成背景 |
| `success-deep` | `#5BA88E` | 正确/完成前景 |
| `info-soft` | `#E5EFFA` | 信息类背景 |
| `info-deep` | `#5B8FC7` | 信息类前景 |
| `locked-soft` | `#F5EEE2` | 未解锁背景 |
| `locked-deep` | `#A08B78` | 未解锁前景 |
| `danger-soft` | `#F8E7E1` | 非负向提醒，谨慎使用 |
| `danger-deep` | `#B8562A` | 警示 / 高亮提醒 |

### Color Rules
- 一个页面只允许一个主强调色；默认就是 `honey-gold`
- 其余颜色只做信息分组和气氛辅助，面积必须小于中性色
- 禁止紫蓝渐变、赛博蓝紫、暗底霓虹、平均分彩虹六色
- 禁止把“彩”理解成“饱和度高”；我们的彩来自暖光和层次，不来自荧光

---

## 4. Typography Rules

### Font Family
- **Chinese**: `"PingFang SC", "Noto Sans SC", "Microsoft YaHei"`
- **Pinyin / English**: `"SF Pro Rounded", "Inter", -apple-system, sans-serif"`

> Pencil 阶段先用系统字体保结构和节奏；开发阶段再替换为更有童趣的品牌字体。禁止把当前系统字体误读为最终品牌气质。

### Hierarchy
| Role | Size | Weight | Usage |
|---|---|---|---|
| Hero Char | 96–140px | 800 | 主汉字展示 |
| Hero Number | 64–130px | 800 | 大数字、大里程碑 |
| H1 | 28–32px | 800 | 大标题 |
| H2 | 22–24px | 700 | 页面主要说明 |
| H3 | 17–20px | 700 | 卡片标题/模块标题 |
| Body | 16–18px | 500–600 | 主文案 |
| Caption | 13–14px | 500–600 | 状态说明 |
| Small | 11–12px | 500–700 | 标签、辅助信息 |
| Option Char | 48px | 700 | 选项字卡 |

### Text Rules
- 绝不使用纯黑，主文字默认 `#5D4A36`
- 幼儿可读信息尽量控制在一行或两行内
- 小字只能出现在浅底或中性底上，不放在花色强背景上
- 拼音和辅助信息永远是“支持理解”，不是视觉主角

---

## 5. Component Stylings

### Primary CTA
```
Height: 56px
Background: #FFC947
Text/Icon: #5D4A36
Corner Radius: 28px
Shadow: 0 6px 16px rgba(255, 201, 71, 0.33)
Feel: 厚实、温暖、像可以按下去的蜂蜜糖块
```

### Secondary Button
```
Height: 52px
Background: #FFFAEC
Border: 1.5px solid #EFE7DC
Text/Icon: #5D4A36
Corner Radius: 26px
Shadow: 0 2px 8px rgba(0,0,0,0.06)
```

### Ghost / Quiet Action
```
Height: 44–48px
Background: transparent or very light cream
Text: #7A6A55
Use: 弱操作、跳过、稍后再说
```

### Icon Button
```
Size: 40–48px
Background: #FFFAEC / #FFFFFF
Icon: #8B5E00 or #5D4A36
Corner Radius: full
Shadow: 0 2px 8px rgba(0,0,0,0.08)
```

### Character Card
```
Background: #FFFFFF
Corner Radius: 24px
Shadow: 0 4px 16px rgba(0,0,0,0.08)
Selected: gold border + gold shadow
Correct/Done: mint/grass/blue 辅助色可用，但不抢主强调色
Wrong: 不做红色惩罚，只做轻提示
```

### Illustration Card
```
Background: #FFEDB8
Border: 2px solid #FFC947
Corner Radius: 24px
Shadow: 0 5px 16px rgba(255, 201, 71, 0.2)
Goal: 像被阳光晒亮的一页插图
```

### Feedback Bar
```
Background: #FFF4C7
Border: 1.5px solid #FFC94788
Text: #8B5E00
Icon: #E8A800
Principle: 统一给鼓励，不制造惩罚感
```

### Parent Cards
```
Background: #FFFAEC
Border: 1px solid #EFE7DC
Text: #5D4A36
Accent: 允许低饱和 mint / blue / gold 做信息区分
Goal: 安静、可信、不是儿童派对
```

---

## 6. Illustration & Decoration

### Allowed
- 花田、云朵、小屋、树木、小动物、太阳暖光
- 小星星可以保留，但它是“点缀”，不是视觉发动机
- 轻微纸感、暖空气感、晒过的色温
- 散点式小装饰，用来打破留白单调

### Avoid
- 大面积烟花、霓虹粒子、宇宙星空、魔法 glow
- 为了“可爱”堆满 icon 和 sticker
- 装饰和功能抢层级
- 每页都搞成主题乐园

### Decoration Rules
- 单页装饰数量宁少勿多
- 装饰透明度低，优先贴边和角落
- 装饰不能压住核心信息区
- 一旦标题、主字、按钮已经足够活跃，就删装饰

---

## 7. Layout Principles

### Spacing Scale
- `4px`: 微距
- `8px`: 紧密
- `12px`: 组件内部
- `16px`: 默认间距
- `20px`: 卡片内边距
- `24px`: 模块间距
- `32px`: 页边距/大段落
- `48px`: 大块留白

### Layout Philosophy
- 一屏一个重点，不追求“塞满很值”
- 通过大小差、左右重心、插画位置变化打破机械对称
- 留白是情绪的一部分，不是没做完
- 页面像绘本翻页，有呼吸感和停顿感

### Screen Baseline
- Frame: `390 × 844`
- Safe top: `54`
- Safe bottom: `34`
- Page padding: `24` horizontal

---

## 8. Depth & Elevation

### Shadow System
| Level | Shadow | Usage |
|---|---|---|
| Whisper | `0 2px 6px rgba(0,0,0,0.04)` | 极轻抬升 |
| Card | `0 4px 16px rgba(0,0,0,0.08)` | 普通卡片 |
| Float | `0 6px 18px rgba(0,0,0,0.12)` | 选中态、主按钮 |
| Gold Lift | `0 6px 16px rgba(255,201,71,0.33)` | 金色主强调组件 |

### Elevation Rules
- 阴影是“厚度”，不是“发光”
- 禁止把阴影做成大面积霓虹 halo
- 选中态优先加边框和厚度，不优先加 glow

---

## 9. Page Design Specifications

### P01 — 首页学习地图
- 奶油米底 + 田园长卷插画
- 当前单元用蜂蜜金主强调
- 已完成/未解锁主要靠灰度和形状区分
- 气质关键词：探索、期待、轻松、前路感

### P02 — 单元入口
- 暖米底，顶部米黄插画 banner
- 20 字卡用花田五色分组，但整体仍被暖滤镜统一
- 底部 CTA 统一蜂蜜金

### P03 — 认字页
- 主字单色金，不做彩色渐变
- 插画卡和组词卡是两个清晰层级
- “下一步”按钮始终是明确视觉终点

### P04 — 书写页
- 像暖纸上的田字格练习，不像 neon 书法板
- 手势提示要轻，不要喧宾夺主

### P05 / P06 / P07 — 练习与测验
- 题面卡统一为金米黄
- 选项卡白底厚边，选中态靠描边和阴影
- 反馈条统一鼓励，不做恐吓式错误反馈

### P08 — 结果页
- 方向是“暖日庆祝”，不是“夜空烟花秀”
- 数据信息要清楚可读，庆祝插画永远是背景层

### P09 — 付费引导
- 更像暖白纸卡的方案选择，而不是促销页
- 高级感来自克制和层级，不来自糖果渐变

### P10 — 小星宝库
- 里程碑感可以强一点，但依然在暖彩体系内
- 收藏感、获得感优先于派对感

### P11 — 家长中心
- 可信、克制、安静
- 可以保留少量暖彩，但不应和孩子页一样热闹

### Parent Verify
- 功能先于装饰
- 明快、清楚、可信，不必强行可爱

---

## 10. Do's and Don'ts

### Do's
- 用暖米底和暖棕字建立整体温度
- 用蜂蜜金做跨页面统一主强调
- 让插画、按钮、字卡都看起来“软”“厚”“好按”
- 把“快乐”做成轻盈的小奖励，而不是视觉轰炸
- 保持页面之间气质统一，但允许局部辅助色变化

### Don'ts
- 不要回到紫蓝渐变、粉橙大渐变、廉价 glow
- 不要把每个状态都做成不同高饱和色
- 不要把所有信息都装进卡片
- 不要让装饰比内容更响
- 不要把“儿童产品”理解成“越闹越好”

---

## 11. Agent Prompt Guide

When designing pages for 星光识字:
1. Default background is `#FAF6F0`
2. Default primary accent is `#FFC947`
3. Default primary text is `#5D4A36`
4. Prefer solid warm surfaces over gradients
5. Use supporting palette only as small-area categorization
6. Avoid purple, neon, dark-space, and multi-color AI palettes
7. Build delight through illustration, shape, and rhythm, not glow
8. Vibe check: does this feel like a child exploring a sunlit picture book, not a magical login screen?
