# 星光识字 · 项目宪法 (CLAUDE.md)

> 这是项目级硬约束，所有 AI 助手会话必须遵守。

---

## 🔴 改设计稿/加页面前的强制流程

**任何**对 `design.pen` 的修改、新增页面、调整跳转关系，**必须**：

1. **先读** `knowledge-base/01-产品设计/USER_FLOW.md`（项目宪法级流程文档）
2. **对照** PRD v3.0 (`docs/prd/v3.0.md`) 确认页面角色和编号
3. **登记** 任何新增页面到 USER_FLOW.md 的「页面权威清单」
4. **登记** 任何新增按钮/跳转到 USER_FLOW.md 的「按钮去向表」
5. **发现偏离** → 写到「偏离清单」并向用户报告，**禁止"先改了再说"**

---

## 🔴 视觉硬约束（必读）

- `knowledge-base/01-产品设计/反AI设计规范.md`：两条硬约束 + 踩雷审计
- `knowledge-base/01-产品设计/儿童零挫败设计原则.md`：错不罚 / 永远给星 / 卡关降难度
- `DESIGN.md` + `.impeccable.md`：当前**田园暖彩**设计系统权威源，禁止回滚到旧“梦幻渐变/彩虹糖果”描述

---

## 🔴 Pencil 设计稿操作约束

- 默认使用 **Pencil CLI** 操作 `.pen` 文件，尤其是用户明确说“用 Pencil CLI”时：
  - `pencil interactive -i design.pen -o design.pen`
  - 修改后必须 `save()`，再 `exit()`
- 不要在 Pencil CLI 可用时切回 Pencil MCP、桌面 socket 或任何会内联原始截图/base64 的接口；CLI 不可用时先停下来说明，不自动降级到 MCP
- 复杂 frame 必须用 `C()` 复制模板再 `U()` 改，**禁止** `I()` 从零建整页（会静默空白）
- 文本节点必须设 `fill`，否则不可见
- `type:"path"` 写入成功但截图不渲染，连续曲线放弃用 path
- 详见 `knowledge-base/05-技术文档/Pencil-MCP设计技巧.md`（现为 CLI 规范 + MCP 历史事故记录）

---

## 🟡 工作风格

- 总是用中文回答
- 不要阿谀奉承，实事求是
- 行就行，不行就不行，不要钻牛角尖
- 该问就问，不要只顾埋头干
- 不要擅自 git commit
- 永远只给最好的方案

---

## 📁 关键文档索引

| 用途 | 路径 |
|---|---|
| **项目宪法（流程）** | `knowledge-base/01-产品设计/USER_FLOW.md` |
| 完整 PRD | `docs/prd/v3.0.md` |
| 知识库总入口 | `knowledge-base/INDEX.md` |
| 产品设计索引 | `knowledge-base/01-产品设计/产品设计索引.md` |
| Pencil 技巧 | `knowledge-base/05-技术文档/Pencil-MCP设计技巧.md` |
| 当前任务 | `knowledge-base/03-开发日志/当前任务.md` |
