---
tags: [技术方案, Codex, iOS-Simulator, Appium, WDA, MobAI]
created: 2026-04-29
updated: 2026-04-29
---

# Codex 内置浏览器连接 iOS 模拟器方案

## 结论

最推荐的本地方案是：

```text
iOS Simulator
  -> Appium XCUITest Driver
  -> WebDriverAgent(WDA)
     -> MJPEG 画面流 :9100
     -> XCTest / W3C Actions 控制通道
  -> 本地 Web 壳 localhost:3000
     -> 画面代理 /stream
     -> pointer 事件采集
     -> 手势 API /api/tap /api/drag /api/text
  -> Codex App in-app browser
```

核心原则：

- 视频面用 WDA 自带 MJPEG，先避免自己做窗口捕获和编码。
- 控制面用 Appium XCUITest，先避免直接碰私有 Simulator/XPC 协议。
- Web 层只做薄壳：显示设备画面、采集鼠标/触摸事件、把事件转发给本地后端。
- Codex App 只需要打开 `http://127.0.0.1:3000`，它看到的是网页里的设备画面，而不是直接连接 macOS 的 Simulator 窗口。

## 为什么选 Appium/WDA

### 相比 simctl

`simctl` 适合管理模拟器、安装 app、启动 app、截图、录屏，但不适合作为可交互实时投射的核心。

问题：

- 截图是离散帧，实时性和延迟都不理想。
- 录屏面向文件输出，不是面向浏览器交互流。
- 缺少稳定的高级手势和 UI tree 抽象。
- 点击、输入、滚动通常还要组合别的工具。

所以 `simctl` 在本方案中只作为辅助工具：

- boot simulator
- install app
- launch app
- open URL
- emergency screenshot

### 相比 FFmpeg + JSMpeg + idb

FFmpeg + JSMpeg + idb 可行，但不是首选。

优点：

- 全本地。
- idb 的 `tap`、`swipe`、`text`、accessibility JSON 很适合 agent 操作。
- JSMpeg 接入简单，浏览器端渲染门槛低。

主要问题：

- FFmpeg 在 macOS 上更像抓桌面/窗口的通用工具，不是专门为 Simulator 设备画面设计。
- 容易遇到窗口遮挡、Retina 缩放、Simulator 外框裁剪、权限、Space 切换等问题。
- MPEG1 over WebSocket 是能跑 demo 的方案，但画质、带宽和延迟都不是最优。

更合理的变体是：

```text
ScreenCaptureKit / WDA MJPEG 做视频面
idb 做控制面
```

如果后续发现 Appium 控制层太重，可以把控制面替换成 idb，但第一版不建议从 FFmpeg 视频链路开始。

### 相比 ScreenCaptureKit + WebRTC

ScreenCaptureKit + WebRTC 是高配方案，适合做成 SimCast 那种丝滑远程设备面板。

优点：

- 可以只捕获 Simulator window。
- 视频质量、延迟、帧率都更好。
- WebRTC 适合浏览器播放和远程共享。

问题：

- 需要写 macOS 原生捕获层。
- 需要编码、WebRTC signaling、权限处理。
- 控制面仍然需要 Appium、idb、AX 或 XCTest。

所以它适合第二阶段，不适合作为第一版最小可用方案。

## 推荐架构

```text
┌───────────────────────────────┐
│ Codex App in-app browser       │
│ http://127.0.0.1:3000          │
└───────────────┬───────────────┘
                │
                │ pointer / keyboard events
                ▼
┌───────────────────────────────┐
│ Local Web Shell                │
│ Frontend                       │
│ - renders /stream in <img>     │
│ - maps browser coords          │
│ - sends tap/drag/text requests │
└───────────────┬───────────────┘
                │
                │ HTTP / WebSocket
                ▼
┌───────────────────────────────┐
│ Local Backend                  │
│ - proxies WDA MJPEG            │
│ - owns Appium session          │
│ - exposes simple gesture API   │
└───────┬───────────────────────┘
        │
        │ WebDriver protocol
        ▼
┌───────────────────────────────┐
│ Appium Server :4723            │
│ XCUITest Driver                │
└───────┬───────────────────────┘
        │
        │ WebDriverAgent
        ▼
┌───────────────────────────────┐
│ iOS Simulator                  │
│ - app under test               │
│ - MJPEG stream :9100           │
└───────────────────────────────┘
```

## 依赖

### 必需

- Xcode
- Xcode Command Line Tools
- iOS Simulator runtime
- Node.js
- Appium 3
- Appium XCUITest Driver 10+

安装：

```bash
npm install -g appium
appium driver install xcuitest
```

检查：

```bash
appium -v
appium driver list --installed
xcrun simctl list devices available
```

### 可选

- `idb`：后续替换或补充控制面。
- ScreenCaptureKit native helper：后续替换视频面。
- WebRTC/LiveKit：后续做远程共享或低延迟高帧率。

## 最小启动流程

### 1. 启动 Appium

```bash
appium --address 127.0.0.1 --port 4723
```

### 2. 创建 iOS 会话

最小 capabilities：

```json
{
  "platformName": "iOS",
  "appium:automationName": "XCUITest",
  "appium:deviceName": "iPhone 16",
  "appium:platformVersion": "18.0",
  "appium:app": "/absolute/path/to/Your.app",
  "appium:mjpegServerPort": 9100
}
```

如果 app 已经安装，也可以用：

```json
{
  "platformName": "iOS",
  "appium:automationName": "XCUITest",
  "appium:deviceName": "iPhone 16",
  "appium:platformVersion": "18.0",
  "appium:bundleId": "com.example.app",
  "appium:mjpegServerPort": 9100
}
```

### 3. 本地 Web 壳显示画面

前端最小形态：

```html
<img id="device" src="/stream" />
```

后端把 `/stream` 代理到：

```text
http://127.0.0.1:9100
```

不要让 Codex in-app browser 直接连 `http://127.0.0.1:9100`，推荐始终走自己的 `/stream` 代理。这样后续可以统一处理跨源、鉴权、画面尺寸、fallback 和调试日志。

## 本地后端 API 草图

### 状态

```http
GET /api/status
```

返回：

```json
{
  "appium": "connected",
  "sessionId": "abc",
  "device": {
    "name": "iPhone 16",
    "platformVersion": "18.0",
    "orientation": "PORTRAIT",
    "windowRect": {
      "width": 393,
      "height": 852
    }
  },
  "stream": {
    "url": "/stream",
    "source": "http://127.0.0.1:9100"
  }
}
```

### 点击

```http
POST /api/tap
Content-Type: application/json
```

请求：

```json
{
  "x": 120,
  "y": 320
}
```

后端转成 Appium：

```text
mobile: tap
```

### 拖拽

```http
POST /api/drag
Content-Type: application/json
```

请求：

```json
{
  "from": { "x": 180, "y": 680 },
  "to": { "x": 180, "y": 240 },
  "duration": 0.35
}
```

后端转成：

```text
mobile: dragFromToForDuration
```

或 W3C Actions。

### 输入文本

```http
POST /api/text
Content-Type: application/json
```

请求：

```json
{
  "text": "hello"
}
```

后端可以先用 active element sendKeys；如果焦点不可控，再补一个 explicit target 或使用 pasteboard 辅助。

### UI tree

```http
GET /api/source
```

返回 Appium page source。后续可以额外转换成更适合 agent 阅读的简化 JSON：

```json
[
  {
    "type": "Button",
    "label": "Continue",
    "enabled": true,
    "visible": true,
    "rect": { "x": 44, "y": 720, "width": 305, "height": 52 }
  }
]
```

这个接口对 Codex 很关键：只看截图会让 agent 变成坐标猜测；有 UI tree 才能做稳定交互。

## 坐标映射策略

前端不要直接把鼠标坐标原样发给 Appium。必须做映射。

### 输入

浏览器侧拿到：

- `<img>` 在页面中的 `getBoundingClientRect()`
- pointer event 的 `clientX/clientY`
- 当前图片渲染宽高

后端或前端还需要知道：

- Appium `getWindowRect()` 返回的设备逻辑尺寸
- 当前 orientation
- MJPEG 是否被缩放

### 推荐做法

前端发送归一化坐标：

```json
{
  "nx": 0.42,
  "ny": 0.68
}
```

后端映射为设备坐标：

```text
x = nx * windowRect.width
y = ny * windowRect.height
```

这样即使浏览器页面缩放、Codex app 窗口大小改变、MJPEG 质量参数调整，控制面仍然稳定。

### 需要处理的细节

- `object-fit: contain` 时，图片可能有 letterbox 空白边，需要扣掉偏移。
- 横屏时需要确认 WDA 返回的 window rect 是否已经按当前方向旋转。
- 如果 MJPEG stream 输出不是设备逻辑比例，需要以后端的 `windowRect` 为准，不以图片 natural size 为准。
- 所有点击都应记录：raw pointer、normalized coords、mapped device coords、Appium command result。

## 前端页面建议

页面只做工具，不做复杂产品 UI。

第一版需要：

- 顶部状态条：Appium connected / session id / device name / orientation。
- 中央设备画面：`/stream`。
- 可切换交互模式：tap、drag、inspect。
- 右侧或底部日志：最近 20 条 pointer/action。
- 一个 refresh stream 按钮。
- 一个 reload app 按钮。
- 一个 source 按钮，用于抓 UI tree。

不要把设备画面包在复杂卡片里。Codex comment mode 的核心是对设备画面进行指向和评论，视觉壳越薄越好。

## 后端实现建议

第一版用 Node.js 即可：

- `express`：HTTP API 和静态页面。
- `undici` 或原生 fetch：调用 Appium。
- `http-proxy` 或手写 stream pipe：代理 MJPEG。
- 一个 Appium session manager：启动时创建 session，进程退出时清理 session。

后端职责：

1. 创建和维护 Appium session。
2. 代理 `http://127.0.0.1:9100` 到 `/stream`。
3. 暴露稳定的小 API：tap、drag、text、source、status。
4. 统一坐标映射。
5. 打印结构化日志。

## MVP 文件结构

```text
ios-device-webview/
  package.json
  src/
    server.ts
    appium.ts
    gestures.ts
    streamProxy.ts
    public/
      index.html
      app.css
      app.js
```

如果接入当前项目，可以先放在：

```text
tools/ios-device-webview/
```

## 验收标准

第一版完成的标准：

- `npm run dev` 后本地打开 `http://127.0.0.1:3000`。
- 页面能显示 iOS Simulator 当前 app 画面。
- 点击页面中的某个坐标，Simulator 里对应位置能收到 tap。
- 拖动页面中的某段轨迹，Simulator 里能滚动或拖拽。
- 能在页面里触发 `GET /api/source` 并看到当前 UI tree。
- Codex App in-app browser 打开该页面后，可以通过 comment mode 指向画面元素。

## 风险与对策

### WDA 启动慢或不稳定

对策：

- 后端显示 session 状态。
- 提供 recreate session 按钮。
- Appium 日志单独输出。

### MJPEG 不够丝滑

对策：

- 第一版接受。
- 调低分辨率和质量换延迟。
- 第二阶段换 ScreenCaptureKit + H.264/WebRTC。

### 坐标点击偏移

对策：

- 全部使用归一化坐标。
- 页面叠加 debug crosshair。
- 日志输出 rect、normalized coords、mapped coords。
- 增加校准模式：点击四角，确认映射。

### Codex 无法访问 localhost

对策：

- 优先使用 `http://127.0.0.1:3000`。
- 如果通过 HTTPS 页面嵌入 localhost 流被拦截，必须使用本地 HTTP 页面作为主入口。
- 不把远程 `app.mobai.run` 页面作为第一版依赖。

### 只看截图不够

对策：

- 必须实现 `/api/source`。
- 后续把 Appium XML 转成简化 JSON，供 agent 和日志面板使用。

## 第二阶段

当 MVP 跑通后，再考虑：

- 用 ScreenCaptureKit 捕获 Simulator window。
- 用 WebRTC 替代 MJPEG。
- 控制面从 Appium 切换或补充为 idb。
- 增加 accessibility tree overlay。
- 增加元素点击：点 overlay 元素，而不是点裸坐标。
- 增加录制/回放手势。
- 增加多设备选择。
- 增加 Codex-friendly action log，方便 agent 复盘。

## 最终建议

先做：

```text
Appium/WDA MJPEG + 本地 Web 壳 + 归一化坐标控制 + UI tree API
```

不要先做：

```text
FFmpeg 桌面捕获 + 自己转码 + 坐标硬映射
```

前者是最短路径，依赖公开生态，能快速跑进 Codex App in-app browser；后者虽然本地化程度高，但会把第一版复杂度花在视频编码和窗口捕获这些非核心问题上。
