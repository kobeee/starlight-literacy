---
tags: [开发日志, Mobile-H5, Unit-01, 视觉资产, 生图, 产品级重构]
created: 2026-05-10
updated: 2026-05-10
---

# 2026-05-10 Mobile H5 Phase 3 视觉资产体系首批落地

## 背景

产品级重构进入 Phase 3：Unit-01 不能继续依赖临时 group 图或裸字形占位，而要先建立可复用的视觉资产体系，再展开逐字插画和代表字视频。

本轮目标不是生成 20 张散图，而是用生图工具建立 Unit-01 视觉语法：style board、四组场景 plate、资产 manifest、H5 首屏接入和检查脚本。

## 本轮完成

- 使用生图工具生成 Unit-01 四宫格视觉语法板，要求暖阳田园绘本、纸感、低饱和、无汉字 / 拼音 / UI 文案。
- 从四宫格裁切出 4 张 `1280x800` group scene plate：
  - `group-01-line-count-scene-v1.png`：数量、线条、大小。
  - `group-02-position-body-scene-v1.png`：位置、身体、动作。
  - `group-03-nature-pictograph-scene-v1.png`：日月水火山。
  - `group-04-nature-body-review-scene-v1.png`：自然、器官、易混复认。
- 新增 `src/shared/unit-01-visual-assets.js`，作为 Unit-01 视觉资产 manifest。
- Mobile H5 P02 路线页接入 `--unit-scene`：单元 hero 和四组 group card 都使用对应 group scene。
- 资源版本提升到 v23，`index.html / app.js / sw.js` 同步，Service Worker app shell 纳入 visual assets manifest 和 4 张 scene plate。
- 新增 `scripts/check-unit-01-visual-assets.mjs`，校验 style board、四组场景尺寸、每组支持字覆盖，以及 H5 inline scene URL 写法。

## 关键修复

首次接入时发现 `style="--unit-scene:url(\"...\")"` 类写法会被 HTML 属性双引号截断，导致背景图实际没有挂上。

已改为：

```js
return scene ? `--unit-scene:url(${scene.src})` : "";
```

并把这个坑写进 `check-unit-01-visual-assets.mjs`，防止后续回归。

## 验证

- `npm run check:h5` 通过。
- `STARLIGHT_H5_URL=http://127.0.0.1:4174/src/clients/mobile-h5/ npm run audit:h5` 通过，`consoleIssues: []`。
- 固定 390px 移动视口截图确认 P02 首屏已经真实渲染场景图：苹果、小路、木板、小芽、山景进入 hero；四组卡片也显示对应场景底图。
- in-app Browser 验证 P01 → P02：`第一单元 20 字完整路线`、`开始第一节`、第 4 组列表均存在，console warn/error 为空。

备注：in-app Browser 的截图接口本轮连续超时；因此视觉截图用固定审计脚本补充，DOM/路由/控制台仍由 in-app Browser 验证。

## 后续

- 继续沿同一视觉语法生产代表物件 cutout：苹果、小路、木板、小山、气球、雨滴、太阳、月亮、水流、火苗、树、土丘、手、眼、耳。
- 基于首批资产推进 `二 / 三 / 人 / 山 / 火` 代表字视频 brief 和样片。
- P03 native micro-lesson 后续逐步从纯代码舞台升级为“代码字形 + 受控物件资产”的组合。
