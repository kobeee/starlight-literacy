# AGENTS.md

## Cursor Cloud specific instructions

### 项目状态

星光识字（Starlight Literacy）是一个微信小程序项目，当前处于**初始脚手架阶段**——仅有目录结构和文档，尚无应用代码、依赖或配置文件。

### 技术栈

- **前端**：微信小程序原生 + Skyline 渲染引擎 + glass-easel
- **后端**：微信云开发（云函数 Node.js + 云数据库 + 云存储）
- **Node.js**：v22.x（通过 nvm 管理）
- **包管理**：项目尚未初始化 `package.json`；VM 上可用 npm/pnpm/yarn

### 重要注意事项

1. **微信小程序无法在 Linux VM 上运行**：微信开发者工具是 GUI 桌面应用（仅 Windows/macOS），Cloud Agent VM 无法安装或运行。小程序的完整预览/调试需要在本地开发者工具中进行。
2. **Cloud Agent 可做的事**：代码编辑、lint 检查（ESLint 配置后）、单元测试（Jest/Vitest 配置后）、云函数本地调试、`miniprogram-ci` CLI 上传。
3. **项目文档**：PRD 在 `docs/prd/v3.0.md`，知识库在 `knowledge-base/`，技术架构在 `knowledge-base/02-技术架构/`。
4. **编码规范**：见 `.cursor/rules/coding-standards.mdc`，Git commit 格式为 `<type>：<tool-tag>-<description>`。
5. **当项目有 `package.json` 后**：更新脚本应运行对应的依赖安装命令（如 `npm install`）。

### 服务概览

| 服务 | 类型 | 说明 |
|------|------|------|
| 微信小程序前端 | 必需 | 需微信开发者工具预览，Cloud Agent 无法直接运行 |
| 微信云开发后端 | 必需 | 云函数可本地测试（Node.js），但完整云环境需 AppID |
| Node.js | 必需 | 云函数运行时 + 构建脚本，VM 已安装 v22.x |

### Lint / Test / Build 命令

项目尚未配置 lint 或测试工具。待配置后，预计：
- **Lint**：`npx eslint src/` 或对应 package.json script
- **Test**：`npm test` 或对应 package.json script
- **构建**：微信小程序无需传统构建步骤；如有 npm 依赖需运行"构建 npm"
