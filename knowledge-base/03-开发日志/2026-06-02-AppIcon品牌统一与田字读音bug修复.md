---
tags: [开发日志, iOS, 素材, AppIcon, baked-audio, bug修复]
created: 2026-06-02
updated: 2026-06-02
---

# 2026-06-02 · AppIcon 品牌意象统一 + 田字读音 bug 修复 + 素材库存复核

> 范围仍是 [[当前任务|只专注 Unit-01 收口]]。工作目录主仓 `src/clients/iOS/`。
> **本 session 全部改动未 git commit**（用户：先记录，新 session 再继续）。
> 关联：[[2026-06-01-真机无线部署打通与Unit01验收收口]] / memory `project_ios_app_status`。

---

## 一、Unit-01 / iOS 基础素材库存复核（结论：数量无硬缺口）

实地扫描 `Assets.xcassets`，不凭记忆：

| 项 | 状态 |
|---|---|
| `scene_*` 实物图 | **20/20**，三档齐，抠透明实物图 |
| `oracle_*` 字源彩蛋 | **14/14**（对应非指事字），三档齐，@3x alpha 全健康（meanAlpha 0.02~0.17，**无空图**）|
| `AppIcon` / `LaunchBrand` / `ShareCard` | 全在，三档齐；AppIcon 单尺寸 1024 universal = Xcode 13+ 合法 single-size 配置 |
| 代码 `Image()` 引用 | **0 悬空引用** —— `ShareCard` 字面量 + `scene_\(slug)` + `oracle_\(slug)`（`hasEtymologyEgg` 才取）全命中；`mu-eye`/`er-ear` 正确 slug 成 `scene_mu_eye`/`oracle_er_ear` |

**人眼审了几张被点名的图**：
- `上/下` 重做成功 ✅ —— 食指向上/向下的手，方向一眼可辨，对得上 story「指天花板/指地板」。
- `三` = 三层草坡台阶，对得上「三层台阶/田埂」。
- `小` = 三粒发芽豆子，承载「小」偏弱（story 是米粒/芝麻），但 06-01 已论证保持（怕 上/下/手 已 3 手、小再做手势导致看图认字四手互扰）→ **有意识取舍，非缺口**。

**结论**：基础素材在 Unit-01 范围内已收口，不该再投入大规模补图。唯一像缺陷的是旧 AppIcon（见下）。

---

## 二、AppIcon 重做 —— 从「太阳」到「小屋+亮星」，顺带挖出品牌意象不统一

### 起因：旧 AppIcon / LaunchBrand 底部有一根「空名条」

旧 AppIcon、LaunchBrand 底部都有一根**深棕色空横条** —— 是「本该放品牌名却留空」的占位，看着像没做完。

### 过程中的两次自我修正（实事求是记录）

1. **第一版生了「太阳笑脸」→ 被用户一句「你确定用这个太阳吗？」点醒**：我最初给 codex 的 prompt 只给了「小屋 or 太阳」二选一，**根本没把品牌核心『星光/星星』放进去**，codex 只能在我划错的圈里选。太阳是 ShareCard 的元素，但 app 名叫「星光」，桌面图标该呼应名字。
2. **看 LaunchBrand 后发现更大的问题 = 品牌意象四处分裂**：

   | 出现处 | 意象 |
   |---|---|
   | App 名字 | **星光**（星/星光）|
   | LaunchBrand 启动图 | 小屋 + 黄圆 + **绿**旗 + 空名条 |
   | 旧 AppIcon | 小屋 + **星星**旗 + 空名条 |
   | ShareCard | **太阳**笑脸 |

   名字喊星光、主视觉是小屋、分享卡是太阳，连旗子颜色都不统一。

### 用户拍板方向：**小屋 + 头顶亮星**

复用已画好的田园小屋（主视觉资产不浪费）+ 把语义含糊的黄圆换成一颗明确金色亮星（补上「星光」核心）+ 去掉空名条 → 一次性让 **AppIcon / LaunchBrand / 名字** 第一次对齐。

### 落地

- **codex `gpt-image-2`（built-in image_gen，不需 OPENAI_API_KEY）** 生成，prompt 写死：满版、主体够大、小尺寸可识别、**绝对无文字/空名条/边框**、RGB 不透明。
- 产物 `assets/illustrations/starlight-literacy-ios-icon-house-star-1024.png`（1024×1024 RGB 无 alpha = app icon 硬要求）。
- **人眼审过 rendered**（不信 codex 自检）：红瓦小屋 + 金色发光五角星，对比够（亮星+红顶从黄背景跳出，不再是第一版「黄底黄太阳糊一团」）。
- 回填 `AppIcon.appiconset/AppIcon-1024.png`，**旧图备份** `tmp/appicon-backup/AppIcon-1024.old-house-emptyplate.png`，可回滚。
- 用户真机看过：「还行」。✅

### 遗留（未做，下个 session 可选）

- **LaunchBrand 也有同款空名条 + 含糊黄圆**，按「品牌统一」方向也该换成同款（小屋+亮星），但它是竖版构图、那根条本意可能是放「星光识字」字样，处理方式和方图图标不同，是另一个小活，**留到测验收尾后单独做**。

---

## 三、真机部署：当前网络直连，CLI 全自动（再次验证 06-01 配方）

- 当前 Mac 在 **`192.168.0.105`**（普通 WiFi，**不是** 172.20.10.x 个人热点）下，`devicectl list devices` 里 **ChenHang 直接 `available (paired)`** —— 这个网络没触发公司网那种 VPN 客户端隔离，**不用切个人热点**。
- 全程 CLI 无 GUI：`xcodebuild -destination 'platform=iOS,id=00008130-0008550E3E38001C' -allowProvisioningUpdates -derivedDataPath build/DerivedData-device build` → `devicectl device install app` → `devicectl device process launch`，本 session 反复装机 4 次全成功（证书 `Apple Development: chenhangkobe@gmail.com`，7 天有效期内）。
- 再次坐实 06-01 校正：「真机签名只能 Xcode GUI Cmd+R」是过度绝对化，钥匙串有 GUI bootstrap 过的有效证书 + profile 时 CLI 全自动接管。

---

## 四、🔴 田字读音 bug —— 根因不是声调标注，是整条数据抄成「天」

### 现象（用户真机报）

「田」单字读音是一声、听着像「天」，应为二声 tián。

### 根因（确凿，逐层定位）

1. iOS 端拼音**文字显示**是对的（`Unit01.swift` `c("tian","田","tián",…)`）—— 掩盖了问题。
2. iOS 播的是**预烘焙 mp3**（`Resources/Audio/unit-01/tian/{char,phrase,soundCue}.mp3`），不是 OS TTS（红线：禁 OS TTS）。
3. mp3 由 `tools/baked-audio/build-baked-audio.mjs`（edge-tts `zh-CN-XiaoxiaoNeural` rate -10%）烘焙，**数据源是 `src/shared/unit-01.js` + `src/shared/unit-01-lessons.js`**（`unit-01-baked-audio.js` 只是产物）。
4. **真凶**：这两个文件里整个 `tian` 条目**从头到尾都是用「天」字模板填的** —— `char:"天"` / `phrase:"天空的天"` / `words:["天空","今天","蓝天"]` / `scene` / `glyphHook` / `lifeMapping` / `soundCue` / `nativeLesson` / `practiceChecks` / `parentProof` **全是天**，只有 `id:"tian"`。当初录入时拿「天」复制了模板、忘了改成「田」。
5. edge-tts 拿到的文本是汉字「天」→ 自然读 tiān。**声调由汉字决定，不是拼音字母**（田、天拼音字母都是 tian，所以 `pinyin/tone:"tian"` 本身没错）。

> 教训：**baked audio 读音错，先查烘焙文本数据源（汉字对不对），不是去 fix「声调标注」**。

### 修复

- 改 `unit-01.js` tian：`char→田` / `phrase→田地的田` / `words→["田地","稻田","花田"]` / `scene→「一块方方的田，被田埂分成四小块。」`
- 改 `unit-01-lessons.js` tian：`glyphHook/lifeMapping/structureFocus/strokeGoal/soundCue/contrastTargets/nativeLesson/practiceChecks/parentProof/assetBrief` 全部改成「田」（对照 iOS 已审内容，符合红线 §7.3 字源真讲 —— 田为真象形，描摹田地阡陌、外框口+中间十字田埂，不牵强）。
- 删 mobile-h5 旧 mp3 → `node tools/baked-audio/build-baked-audio.mjs`（重烘 tian 3 条，其余 57 skip，manifest 自动更新）→ 拷 iOS `Resources/Audio/unit-01/tian/` → 重 build + install。
- 验证：ffprobe 三条 mp3 时长正常（char 1.224s / phrase 1.8s / soundCue 4.824s），非空未损坏；**用户真机听 → 田读音已是 tián ✅**。

> 小坑记录：edge-tts 输出 **CBR mp3**，「田」「天」都是单字、时长一致 → char.mp3 字节数和旧的完全相同（7344），**字节相同 ≠ 没重烘**；soundCue 文本变长（12→19 字）字节才明显变（19296→28944）反证了重烘生效。别因「字节没变」误判修复失败。

### 🟡 遗留（已加 TODO 注释，不影响 iOS）

`unit-01.js` tian 的 **`strokes` 笔顺坐标仍是「天」的 4 笔**（田是 5 笔 口+十）、**`image` 配图也是天的**、`color` 是天的蓝。这俩需要准确的田字格坐标 + 田的图，**没瞎填**（填错比留着更糟）。**只影响 mh5**（H5 端写字/配图）；**iOS 笔顺/配图在 Swift 端、本来就是田、不受影响**。要不要补 mh5 这两项，下个 session 用户定。

---

## 五、下个 session 接续

- 真机验收剩余项（06-01 清单不变）：`上/下` 新图实地验（顺序门第 18/19 位，需通关前 17 字）、20 字逐字扫 baked 音质（**这次田字就是逐字扫才能抓出的同类，建议把 20 字音频都过一遍**）、bug#2 真机录对、B6 复杂字弯笔手感。
- **可选清理**：LaunchBrand 同步「小屋+亮星」；mh5 tian 的 strokes/image/color 补成田。
- **commit 决策**：本 session 改动（AppIcon 回填 + 田字数据/音频修复）仍未 commit，用户「先攒着」。
