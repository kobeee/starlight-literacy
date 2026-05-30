---
tags: [开发日志, iOS, 验证, 录屏, ImageMagick, 字源, oracle, Unit-01]
created: 2026-05-30
updated: 2026-05-30
---

# 2026-05-30 · iOS 生图素材接入验证 + oracle 字源色块修复

> 承接 [[2026-05-30-iOS图片素材接入与基础品牌图补齐]] / [[2026-05-30-生图链路根因诊断与打通]]。
> 本篇做两件事：① 验证 codex 补图 + iOS 接入到底成没成、录最新走查屏；② 录屏暴露字源彩蛋「甲骨文」格变纯色块，定位根因并修复重录。

## 一、验证结论（先不信日志，看实物）

- **构建**：`xcodegen` 重生 → `xcodebuild -destination 'iPhone 17'` **BUILD SUCCEEDED**，装进模拟器跑通。
- **资产非空壳**：`Assets.xcassets` 里 `scene_*`×20 + `oracle_*`×14 + AppIcon/LaunchBrand/ShareCard，共 109 个 png；抽查 `scene_ren@3x` 146KB、`oracle_ren` 有三档。
- **codex 新补的 6 个指事字场景图**（`yi/er/san/xiao/shang/xia`，scene-assets 目录 15:49–15:52 那批）已通过 `generate-ios-image-assets.mjs` 进了 `scene_*`，全 20 字齐。
- **scene 生图素材三处真图渲染正常**（录屏抽帧 + `-uiTest -route` 单独跳页双重确认）：
  - 认读页 P03：`scene_ren` 行走男孩插画 ✅
  - 看图认字 P05 四选一：口 / 人 / 手 / 一 四张 scene 真图 ✅
  - 首页地图 P01：旅程卡「土」右下角 `scene_tu` 种子小图 ✅

> 即「iOS app 是否正式接入生图素材」= **是的，gpt-image-2 产的 20 字 scene 实物场景图已正式接入并渲染正常**。

## 二、录屏暴露的真 bug：字源彩蛋「甲骨文」格变纯棕色块

autoTour 走到字源页 P03（`-autoTour` 默认选第一个有彩蛋的字 = `人`）时，三联格「真实的它 → 甲骨文 → 今天的字」的**中间格是一整块棕色圆角方块**，甲骨字形完全看不见。

### 根因（坐实，非臆测）

1. SVG 源是干净的：`tools/ios-assets/oracle-svg/ren-oracle.svg` = 透明底 + 单条黑色 path（`fill:#000000`），无白底矩形。
2. 但生成的 `oracle_ren@3x.png` 实测：**白色不透明像素 289495、黑字仅 10981**——SVG 被栅格化到了**不透明白底**上。
3. 原因在 `generate-ios-image-assets.mjs` 的 magick 命令：`-background none` 放在了 **input 之后**。**ImageMagick 对 SVG 的栅格化发生在「读取 input」那一刻**，此时 `-background` 还没生效 → 用默认白底栅格化。
4. 叠加 `Contents.json` 的 `template-rendering-intent: template` + `P03EtymologyView` 的 `.renderingMode(.template)` + tint=`Theme.goldBrown` → **整块非透明区域（白底+黑字）被统一染成棕色**，字形淹没。
5. 14 个 `oracle_*` 全中（同脚本生成）。注意：这不是 gpt-image-2 生图素材，是 SVG 矢量字源图，属另一类，不影响「scene 生图素材已接入」的结论。

### 修复（一处，最小改动）

`tools/ios-assets/generate-ios-image-assets.mjs` makeScaledImageset()：把 `-background none -density 384` 移到 `src`（input）**之前**。

```text
- args = [ src, "-background","none", "-resize",... ]
+ args = [ "-background","none", "-density","384", src, "-resize",... ]
```

- `-density 384`：SVG（viewBox 300）先高密度栅格化再缩到 768，字形更利落。
- 对 `scene_*` 的 PNG 输入两选项均无副作用（PNG 自带 alpha、density 只影响矢量栅格化）—— 已验证 scene 三处仍正常。

### 验证

- 重跑脚本后 `oracle_ren@3x`：**透明像素 576029/589824（98%）、不透明部分全是黑色 12298px**（纯字形）。
- `xcodebuild` BUILD SUCCEEDED，重装重录。
- 重录帧确认：字源页「甲骨文」格现在显示**棕色甲骨文「人」字形**（一撇一捺），与旁白「古字一撇一捺，像人迈开两条腿」对得上 ✅。

## 三、产物

- 新走查成片：`~/Desktop/星光识字-iOS生图素材接入走查-20260530.mp4`（32s，1206×2622，autoTour 13 页全链路，含修复后的字源页，已覆盖旧版）。
- 改动文件（**未 git commit，等用户决定**）：
  - `tools/ios-assets/generate-ios-image-assets.mjs`（magick 参数顺序）
  - `src/clients/iOS/StarlightLiteracy/Assets.xcassets/`（14 个 oracle 重生）

## 四、教训（可复用）

- **ImageMagick `-background` / `-density` 处理 SVG 必须放在 input 之前**，否则 SVG 用默认白底栅格化，是 template-rendering 资产「整格变色块」的隐形根因。
- **template image 的隐性前提是「背景透明、只笔画不透明」**；任何带白底的图设成 template + tint 都会糊成一块。验资产别只看「文件在不在、大小对不对」，要看 alpha 直方图。

## 五、仍待办（沿用上一篇，未变）

- `shou` 甲骨可验证源替换本地兜底线稿。
- P11 家长中心分享卡 UI 接 `ShareCard` 图。
- C1 录音异常根因复验 / B5 真机听声 / B6 复杂字手感。
- 内容规模仍只 Unit-01 20 字。
