---
tags: [开发日志, iOS, 真机, B5, 跟读, 布局, safeAreaInset, 签名, DockedCTA]
created: 2026-05-31
updated: 2026-05-31
---

# 2026-05-31 · iOS 真机部署 + B5 听声验证 + 布局 safeAreaInset 系统性根治

> 承接 [[2026-05-30-iOS生图素材接入验证与oracle字源色块修复]]。本 session 第一次把 App 装上**真机**（用户的 iPhone 15 Pro Max「ChenHang」），用户亲测带读音 + 真机暴露两个 bug，修掉其一（布局），定位另一（跟读打分）留下个 session。
> **所有改动未 git commit**（等用户许可）。下个 session 直接在主仓 `src/clients/iOS/` 继续。

---

## 一、真机部署配方（关键，下次照做，别再趟一遍坑）

1. **真机签名必须有 `DEVELOPMENT_TEAM`**；模拟器不需要，所以之前一直没暴露。
2. **首次装机必须 Xcode GUI 跑一次**：独立 `xcodebuild -allowProvisioningUpdates` **够不着刚在 Xcode GUI 登录的 Apple ID session**，报 `No Account for Team "VWBLM675NZ"` / `0 valid identities`。要在 Xcode 选真机 `Cmd+R`，弹钥匙串授权框点「始终允许」——这一步才**生成 `Apple Development` 证书进钥匙串** + 创建 profile + 注册设备。
3. **首装后续都得 GUI**：免费个人团队（`VWBLM675NZ` = `chenhangkobe@gmail.com` Personal Team）下，证书生成后 CLI **仍签不了**：不带 `-allowProvisioningUpdates` 报 `No profiles ... unable to generate`，带了又 `No Account for Team`。缓存 profile（`~/Library/Developer/Xcode/UserData/Provisioning Profiles/15d9631a-*.mobileprovision`）不匹配本 bundle。**结论：每次上真机 = Xcode GUI `Cmd+R`，别指望 CLI 接管真机签名**（这点和 memory 早先乐观的"证书生成后命令行接管"不符，已校正）。
4. Team ID 挖法：`defaults read com.apple.dt.Xcode | grep -i team`。已写进 `project.yml` 的 `DEVELOPMENT_TEAM: VWBLM675NZ`（⚠️个人凭证，commit 前考虑是否该进共享仓）。
5. **拉起到指定页**：`xcrun devicectl device process launch --device <UDID> --terminate-existing <bundle> -- -uiTest -route followRead`（route token 见 `AppModel.applyLaunchArgs`；followRead→"一"yi）。**手机必须解锁**，否则 `FBSOpenApplication error 7 Locked`。设备 UDID `00008130-0008550E3E38001C`，iPhone 15 Pro Max / iOS 26.4.2 / 开发者模式已开 / 已配对。

### 真机我能 / 不能
- **能**：推包（经 GUI 签名后）、`devicectl` 拉起到任意 route、抓日志。
- **不能**：① **听声**（无 CLI 抓真机扬声器）；② **真机点按滑动**（无 idb 那种手势，要 WDA）；③ **截真机屏**——`idevicescreenshot`（libimobiledevice 1.4.0）在 **iOS 26 上报 `Could not start screenshotr service`（DDI/screenshotr 旧机制已废）**，截不了。所以**真机截图/听声/手感本质都得用户来**，让用户手机截图发我是最快的。

---

## 二、B5 真机听声 ✅（部分闭环）

- 用户在真机跟读页实听 **①进页自动播 + ②点「听老师」** 带读音 → **音对，确认是 Xiaoxiao 老师音**。
- 意义：「声音从没真听过」这个**最大未知数死了**，跟读 + baked 老师音两大卖点站住。
- **仍未验**：③录音回放 + 双波形对比链路；④全 20 字逐字扫音（烘焙批量产，可能个别字有坑）。

---

## 三、真机暴露 bug #1：布局不自适应（已系统性根治 ✅，模拟器验证通过，真机待用户 Cmd+R 确认）

### 现象
P03 认读页「看一看 听一听」，右下角喇叭重播按钮被底部 CTA「认识它啦」切掉一半探出来。模拟器（iPhone 17 / 402×874pt）没事，真机（15 Pro Max / 430×932pt）才露馅。

### 根因（两层，第一性）
- **近因**：P03 是**唯一**没按全局约定留底部空间的页——没包 ScrollView、没 `.padding(.bottom)`，卡片铺到屏幕底被悬浮 CTA 压。
- **第一性**：全 App 给悬浮 CTA 留位靠**每页手抄魔法数 `.padding(.bottom, 96)`**。① 靠人记得抄，P03 漏了；② `96` 写死、不随设备**安全区(home indicator)**变，15 Pro Max 底部安全区更大 → 真机才崩。`DockedCTA` 组件本身（`SharedComponents.swift:46`）不占布局空间、不吃安全区。爆炸半径：9 页用 DockedCTA，8 页 ScrollView+魔法数（能用但脆），P03 是唯一真坏的。

### 修法（用户拍板选 B 系统性根治）
1. **9 页全部** `.overlay(alignment:.bottom){DockedCTA}` → `.safeAreaInset(edge:.bottom){DockedCTA}`（原生：自动占布局空间 + 自动吃安全区，不可能再漏、不挑设备），删掉 8 个 `.padding(.bottom,96/120)` 魔法数。涉及 P02/P03Recognize/P03Etymology/P04/P05/P05a/P06/P08/P10。
2. **P03 认读页重构**：① 内容包进 ScrollView（与其余页一致）；② 喇叭重播按钮从 `.overlay(.bottomTrailing)` 挪到 **`.overlay(.topTrailing)`**——可点提示钉在卡片底边天生要和 CTA 抢位置，挪到右上角后**无论卡片多高都不可能撞 CTA**，且"右上角播放徽标"是常见样式。（中途试过 `maxHeight:.infinity`、`clipShape`、`containerRelativeFrame` 都不理想：maxHeight:.infinity 会无视 inset 铺到 CTA 后面；clipShape 把圆角连喇叭一起裁；最终回到 ScrollView + topTrailing 最稳。）

### 验证
- 模拟器（**固定 `-derivedDataPath /tmp/sl-dd` 避免装到旧包**）：P03 喇叭右上角完整、木盘图正常、CTA 底部预留正常、hero 卡片感保留 ✅；跟读页 / 结果页（双按钮 CTA）底部预留正常、不重叠 ✅。
- 真机：待用户 Xcode `Cmd+R` 重装确认。

### 工具坑（本 session 浪费最多时间的）
- **stale DerivedData**：`find ~/.../DerivedData/StarlightLiteracy-*/...app | head -1` 抓到的可能是**旧文件夹**（有 -fqzz/-ajtl/-gzue 三个），导致 `simctl install` 装的是旧代码 → 反复截图看到"改了还是没生效"的假象。**教训：编译/装机必须固定 `-derivedDataPath` 或用最新 mtime 的 .app**。
- **simctl installd 卡死**：`install` exit 0 但 `get_app_container` 报 `No such file or directory` → `simctl shutdown` + `boot` + `bootstatus -b` 解卡。

---

## 四、真机暴露 bug #2：跟读「一直再试一次」（已定位真 bug，未修，修法已定，留下个 session）

### 现象
用户真机录音跟读，老师声音和录音差距大，**一直提示"再试一次"之类**。

### 根因（读 `FollowRecorder.swift` + `P05aFollowReadView.swift` 确认）
- 进度门（`去写一写` CTA）只看 `rec.hasRecorded`（录了就能过），**没卡分数**——技术上没挡住。
- 但 tier 反馈（`score()` line 110-131）启发式**几乎总返回最低档 `try-again`**：录音是**点按式**（点开始/点停止），两头裹静音 → ① `durRatio = userDur/teacherDur` 轻易 >2.0 触发"再快一点"罚分 → `t` 非空 → **永远拿不到 great**（line 127 要求 `t.isEmpty`）；② 包络 cosine（line 121-124）**逐桶硬比、没时间对齐**，用户语音落点和老师错位 → cosine 偏低 → 掉 `try-again`。**读对了也一直"再试一次"** = 真 bug + 踩零挫败红线（跟读是双波形自我对比、不是判分卡关）。

### 修法（已定，下个 session 执行）
1. **掐头去尾静音**再算时长/包络（`envelope` 加能量阈值裁剪）——bug 本身。
2. **包络时间对齐/归一**（按语音起点对齐）再算 cosine。
3. **最低档不再说"再试一次"**，改鼓励语（"录到啦！再跟老师对对看~"）；门本就不卡分，反馈也不该制造失败感。
4. 阈值放宽（`great` 去掉 `t.isEmpty` 硬条件）。
- 约束：跟读纠音要真做（红线 §6 不能只放音）+ 零挫败永远给星，两者靠"真对比但永不挡住、永不羞辱"调和。

---

## 五、顺手修的 P11 编译雷
工作区原有的未提交改动 `P11ParentView.swift`（分享卡接 `ShareCard` 图）用了**不存在的 `model.learnedCount`** → 改 `model.completedCount`（`AppModel:43`）。否则编译不过。

---

## 本 session 未提交改动清单（下个 session commit 前核对）
- `StarlightLiteracy/Screens/P11ParentView.swift`（learnedCount→completedCount，分享卡接图本就在工作区）
- `StarlightLiteracy/Screens/` 9 个页面（safeAreaInset）+ P03RecognizeView 重构
- `StarlightLiteracy/project.yml`（`DEVELOPMENT_TEAM: VWBLM675NZ`，⚠️个人凭证）
- 新装系统工具：`brew install libimobiledevice`（iOS 26 截图没用上，但 `ideviceinfo` 等仍可用）

## 六、本 session 续：模拟器独立复验布局 ✅ + bug #2 修法细化到代码级

> 这一段是同日稍晚的延续：先回顾全部知识库/笔记 + 通读 iOS 代码，再**重新独立构建模拟器复验**布局修复，并把 bug #2 从"思路"打到"代码级可直接开干"。**仍未 commit。**

### 6.1 布局 safeAreaInset 修复 —— 模拟器独立复验通过 ✅
- 流程：`xcodegen generate` → `xcodebuild ... -derivedDataPath /tmp/sl-dd ... build`（**BUILD SUCCEEDED**，固定 derivedDataPath 防 stale 包）→ `simctl install` iPhone 17 → `-uiTest -route` 逐页截图。
- **P03 认读页**：喇叭已稳在卡片**右上角**（白底圆形徽标），不再被底部「认识它啦」CTA 切；木盘场景图 + 大字「一」+ 拼音 + CTA 间距正常。**修复在模拟器成立**（真机仍待用户 `Cmd+R`）。
- **P05a 跟读页**：老师波形（蜂蜜金）加载、用户波形空、三按钮齐、「听自己」灰显禁用、CTA「先跟读一遍」禁用态 —— 布局干净。
- **P03 字源页**（强制路由到「一」，真实流程「一」是指事字不走字源）：`真实的它 → 甲骨文 → 今天的字` 三联渲染正常。

### 6.2 bug #2 跟读打分 —— 代码级修法（新 session 照此直接写）
文件 `Modules/FollowRecorder.swift` + `Screens/P05aFollowReadView.swift`。
1. **掐头去尾静音（修 bug 本身）**：`envelope(url:)` 抽出纯函数 `trimmedEnvelope(samples:sampleRate:buckets:)` —— 噪声门限 `peak*0.08` 找首/末超阈样本切片到纯语音区（全静音则退回整段），切片重采样到 `buckets` 桶 + 归一；`dur` 改为**语音区时长**。老师/用户都裁剪归一后：cosine 比的是**形状（时间归一）**、durRatio 比的是**语音时长**而非含静音总时长。
2. **打分纯函数化 + 去硬门**：`score()` 抽出 `scoreTier(teacher:user:teacherDur:userDur:) -> (tier, tips)`，**tier 只由 cos 决定**（去掉 `t.isEmpty` 硬条件）：`cos>0.6→great` / `>0.3→ok` / `else→encourage`（新档替代 `try-again`，文案「录到啦！再跟老师对对看～」）。太快/太慢/太小声只作**柔性附加提示**、不降档、great 时不加矛盾提示。
3. **补单测**（现打分**零单测**）`StarlightLiteracyTests/FollowScoreTests.swift`：① `trimmedEnvelope` 喂"前后补零+中间能量包" → 断言 dur≈包长、归一、峰在中；② `scoreTier` 同包络→great / 错位补静音裁剪后→仍 great（证裁剪+归一修了错位）/ 完全不同→encourage 且无羞辱语 / durRatio 极端→不降档。
4. **视图收口**：P05a `tierIcon/tierColor` 的 `try-again`→`encourage`，图标去掉 `arrow.clockwise`（重来感）换鼓励向，保持暖色不报警。
5. **第一性**：门（`hasRecorded`）本就不卡分，这次让**反馈也不羞辱** → 调和「§7.6 跟读真纠音（双波形真对比）」与「零挫败永远给星」：永远真对比、永不挡住、永不羞辱。
- 验收：`xcodebuild ... iPhone 17 test` 全绿（含新 FollowScoreTests）；真机录音手感最后由用户验。

### 6.3 新观察（顺手记，非阻塞）
- 指事字 **scene 图弱**：「一」认读页场景图是**木盘/饼干**，对「一/one」承载牵强（codex 生指事字图的已知弱项）。内容侧可重产，排 P2。

---

## 下个 session 开工清单（按"我能否自主"分流）

**P0 · 我能自主、修法已锁 → 第一件事**
1. **修跟读打分 bug #2**：照 §6.2 代码级修法做 + 补 `FollowScoreTests` + `xcodebuild test` 全绿。

**P1 · 需用户在场配合**
2. 用户 `Cmd+R` 真机确认布局修复（P03 喇叭右上角不切 + 扫其余 8 页 CTA 不重叠）。
3. B5 剩半边：③录音回放双波形 + ④20 字逐字扫音（真机 + 用户耳朵；bug #2 修完正好一起验）。
4. B6 复杂字手感：WDA/idb 真机弯笔逐点 HID（只「一」验过，其余 19 字未验）。

**P2 · 内容/资产（非阻塞，排后）**
5. shou 甲骨源替换（找可验证 CC0 SVG）；指事字 scene 图重产（§6.3）；内容规模仍只 Unit-01 20 字（付费页吆喝 1300）→ 内容流水线大决策待用户拍板。

**约束**：字源彩蛋不做 mp4；只播 baked mp3 禁 OS TTS；零挫败容差、付费/邀请红线不动；**全部改动未 commit（等用户许可）**。

---

## 七、本 session 续：P0 bug #2 跟读打分 —— 已按 §6.2 落地（25 单测全绿 ✅）

> 这是同日再续：把 §6.2 的代码级修法真正写进代码并验收。**仍未 commit。**

### 7.1 改了什么（`Modules/FollowRecorder.swift`）
1. **`trimmedEnvelope(samples:sampleRate:buckets:)` 纯函数**（新）：从原 `envelope(url:)` 抽出。读完整样本数组 → 找全局峰值 → 噪声门限 `peak*0.08` 从首/末向内切到纯语音区 `[first,last]`（全静音兜底退回整段）→ `dur` 改为**语音区时长**（不含两头静音）→ 语音区重采样到 56 桶（peak per bucket）+ 归一。`envelope(url:)` 退化为「读音频 buffer → 转 `[Float]` → 委托 `trimmedEnvelope`」的薄壳。
2. **`scoreTier(teacher:user:teacherDur:userDur:) -> Score` 纯函数**（新）：`score()` 退化为调用它。**tier 只由包络 cosine 决定**（去掉旧版 `t.isEmpty` 硬门）：`cos>0.6 great / >0.3 ok / else encourage`。快/慢/小声只在**非 great** 时作柔性附加提示、**永不降档**；great 时不加任何矛盾提示。最低档文案 `录到啦！再跟老师对对看～`（替代旧 `try-again` 的「仔细听听老师，再来一次」羞辱语）。

### 7.2 改了什么（`Screens/P05aFollowReadView.swift`）
- `tierIcon` 最低档 `arrow.clockwise.circle.fill`（重来感）→ `sparkles`（鼓励向）；颜色保持 `skyDeep`（平和不报警）。tier 字符串 `try-again`→`encourage` 全链路对齐。

### 7.3 为什么这样修第一性
- **bug 本身**＝点按式录音两头裹静音：① 含静音的总时长让 `durRatio` 轻易 >2 触发罚分；② 包络逐桶硬比、用户/老师语音落点错位让 cosine 偏低。`trimmedEnvelope` 掐掉静音 + 把各自语音区都拉伸归一到 56 桶 → cosine 比的是**时间归一后的形状**、`durRatio` 比的是**语音时长**，两个失真源一起消。
- **零挫败调和**＝门（`hasRecorded`）本就不卡分，这次让**反馈也不羞辱**：永远真对比（§7.6 跟读真纠音不退让）、永不挡住、永不羞辱。

### 7.4 补单测 `StarlightLiteracyTests/FollowScoreTests.swift`（打分从零单测 → 6 例）
- `testTrimmedEnvelopeCutsSilenceNormalizesAndKeepsPeakCentered`：前后补零 + 中间半正弦能量包 → dur≈包长（不含静音）、归一峰=1、峰桶在中间。
- `testIdenticalEnvelopeIsGreat`：同款发音 → great。
- `testMisalignedSilenceStillGreatAfterTrim`：老师少量前导静音 vs 用户大段前导静音（同款发音）→ 裁剪+时间归一后**仍 great**（直接证 bug 修了）。
- `testSilentUserEncouragesWithoutShaming`：没出声（包络全 0，cos=0）→ encourage，且 tips 不含「再试一次/重来/仔细听/不对/错」，主反馈是鼓励语。
- `testExtremeDurRatioDoesNotDowngradeGreat`：形状一致但 userDur 拉到老师 10 倍 → **仍 great**（快慢不降档）。
- `testAllSilenceFallsBackGracefully`：全静音不崩、dur 退回整段、包络全 0。

### 7.5 一个测试设计教训（值得记）
- 初版写了个「能量堆前段、后段近静音」的 user 想触发 encourage，结果判 great → 一度以为代码 bug。**实为测试设计错**：`trimmedEnvelope` 会把语音区**拉伸重采样到满 56 桶**，任何「单团发音」归一后形状都趋同；而全正值包络的 cosine 天然偏高（共享正 DC 分量），单团 vs 单团很难 <0.3。**结论：encourage 现实触发面 = 没出声/空录音（cos=0）或真·多音节错配**，不是「单团发音位置/宽窄不同」。改用「没出声」这个真实且最该被温柔对待的场景。

### 7.6 验收
- `xcodegen generate`（新增测试文件必须重生 proj）→ `xcodebuild test ... -destination 'iPhone 17' -derivedDataPath /tmp/sl-dd-followscore`（固定 derivedDataPath 防 stale）→ **`** TEST SUCCEEDED **`，Executed 25 tests, 0 failures**（CurvedStrokeJudge 5 + FollowScore 6 + MoatGate 7 + StrokeJudge 6 + 占位 1）。
- **真机录音手感**仍需用户验（并入下个 session P1.3，bug#2 修完正好一起扫）。

---

## 八、本 session 续：当前 build 走查视频 + autoTour 不适合录屏的教训 + `-char` 调试参数

> 用户要「最新录屏视频」。过程踩了 autoTour 的坑，换方案交付。**仍未 commit。**

### 8.1 autoTour 直接录屏 = 一闪一闪的白屏（弃用）
- 先用内置 `-autoTour`（13 页每页停 2.4s）+ `simctl io recordVideo` 录了一版（23MB）。抽帧体检发现：**每页切换间有约 1 秒的纯空白闪屏**。
- 根因＝[RootView.swift] 的转场 `.asymmetric(insertion: .move(.trailing)+.opacity, removal: .opacity)` + 较慢的 `Theme.easeWarm`：旧页 fade-out 在原地、新页从右滑入，中途两页都半透明 → 透出奶油底 = 视觉空白；`easeWarm` 慢，空窗占到约 1s。`magick` 内容占比量化证实：页面满屏帧 darkish≈27%、空窗帧≈0.05%，每 2.4s 周期里 ~1.5s 有内容 + ~1s 空。
- **结论：autoTour + 慢转场对「抽静帧」和「录屏交付」都不友好**（在真实手指操作下转场是连续动作、无感；但定时自动巡览 + 录屏会把转场空窗暴露成闪屏）。这一版已删。

### 8.2 改用「逐页确定性截图 → 合成幻灯片」（交付版）
- 逐页 `simctl terminate` → `launch -uiTest -seedProgress -route <r>` → `sleep 1.8` 停稳 → `simctl io screenshot`，13 页（map/unit/recognize/etymology/imageCard/followRead/writing/group/celebrate/result/purchase/treasury/parentCenter）。
- `magick` 体检：13 张内容占比 26~50%，**全部满屏停稳、无空窗**。
- `ffmpeg concat`（每页 2.4s 硬切，yuv420p/crf20/faststart）合成 → **`~/Desktop/星光识字-iOS当前build走查-20260531.mp4`（31s / 2.3MB）**。硬切清晰、零闪烁。
- **视频能证 / 不能证**：能证 9 页 safeAreaInset 布局正常（认读页喇叭稳在右上角、各页 CTA 在底部不打架）、`ren` 真字源彩蛋（走路小孩→真甲骨「人」→今字）、scene 真图、P04 双窗、付费三层等当前 build 真实状态；**不能证 bug#2 打分行为**——跟读页 tier 反馈要真录音才出，模拟器无麦克风、截图里看不到 encourage 图标。打分正确性的证据是 §七 的 6 个单测，不是这视频。

### 8.3 顺带加的 `-char` 调试参数（`Core/AppModel.swift`，仅 `-uiTest` 路径）
- 问题：`-route` 写死用 `Unit01.order.first`＝`yi`（一，指事字**无字源彩蛋**），强行 `-route etymology` 会进一个**真实流程永不可达**的状态，「真实的它」显示饼干图（§6.3 指事字 scene 图弱点）—— 截这页会误导。
- 修：`applyLaunchArgs` 加可选 `-char <id>` 覆盖目标字（**校验 `Unit01.order.contains`**、仅 `-uiTest` 内生效、零生产影响），用 `-route etymology -char ren` 截到正确的「人」字源页。也方便以后截图/录屏自动化指定任意字。

### 8.4 本 session 总未提交清单（最终核对，下个 session commit 前用）
- `Modules/FollowRecorder.swift`（§七 打分重构）
- `Screens/P05aFollowReadView.swift`（§七 encourage 图标）
- `Core/AppModel.swift`（§8.3 `-char` 调试参数）
- 新增 `StarlightLiteracyTests/FollowScoreTests.swift`（§七 6 例，用户微调过：删「不同形状」用例、改「没出声」用例）
- 以及前几节遗留：9 页 `safeAreaInset` + P03 重构 + `P11ParentView`（learnedCount→completedCount）+ `project.yml`（`DEVELOPMENT_TEAM`，⚠️个人凭证）+ `project.pbxproj`（xcodegen 重生）
- **全部未 commit，等用户许可。**

---

## 九、下个 session（同日再续）：C1 录音回退根因复验 ✅ 证伪 + P11 分享卡接图 ✅ 确认

> 用户「回顾知识库和研发笔记，接下来要做的事情马上开干」。按 §下个 session 作战计划「P0 我能自主」分流，挑了**不需真机/不需用户**的两项干完。**本 session 零代码改动**（C1 是误报，无需修；P11 早已接好）——纯验证收口。

### 9.1 C1 · P05a「点录音回到 P04 + 写字完成态丢失」—— 真机实测证伪，是历史误报

**背景**：2026-05-29 codex 引入期报过「点『录我的』后回到 P04 且写字完成状态丢失」，bug#2 修的是打分不是这个回退，至今没单独定位。

**复验方法（模拟器 iPhone 17 + idb 真点 + 流式日志，不靠猜）**：
1. `xcodegen` → `xcodebuild ... -derivedDataPath /tmp/sl-dd-c1 build`（BUILD SUCCEEDED）→ `simctl install`。
2. `simctl privacy reset microphone` 强制复现**首次麦克风授权**弹窗。
3. 启动 `-uiTest -route followRead` → idb tap「录我的」(201,588) → **系统授权弹窗出现，背后仍是「跟读一遍」页，没跳 P04** → tap「允许」(275,541)。
4. 临时在 `FollowRecorder` 的 `init/deinit/requestAndStart/permission callback/start()` 插 `NSLog` + `ObjectIdentifier`，`simctl spawn ... log stream` 抓证。

**日志铁证（同一对象，无重建，无释放）**：
```
🔵 FollowRecorder INIT  0x...cb40
🟡 requestAndStart on   0x...cb40
🟢 permission callback granted=true self=alive
🟣 start() done phase=.recording on 0x...cb40
```
- `@StateObject rec` 全程同一 ObjectIdentifier、**无 DEINIT**：权限弹窗 dismiss 不会重建视图、不丢状态。
- `[weak self]` 回调里 **self 仍 alive**、`start()` 真跑、`phase=.recording`。

**真相 = 我自己早先截图时机太早，不是 bug**：时间戳显示 `requestAndStart`(03.494) → `permission callback`(05.679)，**首次授权回调比点「允许」晚约 2.2 秒**（系统首次授权开销）。先前 `sleep 1` 就截图 → 截在回调到达前 → 拍到「录我的」误判成"没自动录"。补截一张（回调后）→ 按钮正确变粉色「停止」录音态。

**完整链路活体验证（全程留在跟读页、无 P04 跳转、无状态丢失）**：录音 → 点「停止」→ 用户波形（薄荷绿）出现 + 反馈 **「✨ 录到啦！再跟老师对对看～」**（模拟器麦克风近乎无输入 cos≈0，正确落 encourage 最低档**且不羞辱**——顺带活体验证 bug#2 修复，不只是单测）+「听自己」解锁 + CTA 变「去写一写 →」；点对底部 CTA(200,804) → **正向**到 P04「写一写」（田字格/看老师写/描红引导齐）。

**结论**：C1 那个「回到 P04 + 状态丢失」是绑在**旧流程/旧架构**上的历史描述。2026-05-30 流程重排后 P04 写字在 P05a 跟读**之后**（`routeAfterFollow → .writing`），方向上根本不存在"从跟读回到 P04"；叠加 C2 拒权 fallback + C3 `UserDefaults` 持久化，即便真重置也不丢门。**当前架构（route-switch + @StateObject）实测稳健，C1 关闭。**

**清理**：临时 NSLog 已全撤（`grep -c NSLog` = 0），`FollowRecorder.swift` diff 仅剩上个 session 的 bug#2 重构（60+/27-）；`xcodebuild test` **25 单测 + 1 UI 占位全绿**。

### 9.2 P11 分享卡接图 —— 确认已真渲染 ✅

- 启动 `-uiTest -seedProgress -route parentCenter`，idb 上滑到底部截图：**`Image("ShareCard")` 正确渲染**——笑脸太阳插画 + 「星光识字 / 图音字一体认读 / Unit-01 免费学 20 字 / 每天 10 分钟」徽章，下方「已学 20 个字 · 启蒙第一课」+「保存分享卡到相册」+「去小星宝库看成就 →」+「查看付费方案」。
- 家长中心整体红线齐：账户（免费体验/已解锁 1 个）、给家长 3 条建议、退款（7 天无理由/≤2 步）、双向邀请（0/10 次上限/禁现金课程券积分）。
- `P11ParentView.swift:122` 的 `Image("ShareCard")` 接 `ShareCard.imageset` 无误。作战计划「P1.P11 分享卡接图确认」**关闭**。

### 9.3 本 session（第九节）未改任何代码
- C1 验证：插了又撤的调试 NSLog，净改动 = 0。
- P11：只读 + 截图确认，未改。
- **总未提交清单与 §8.4 完全一致**（无新增），commit 决策仍悬而未决（个人凭证 `DEVELOPMENT_TEAM` 待用户拍板）。

### 9.4 剩余作战计划（按依赖分流，下次接着干）
- **P1 需用户在场（真机）**：① 用户 `Cmd+R` 真机确认 bug#1 布局 9 页；② B5 剩半边（录音回放双波形 + 20 字逐字扫音）；③ bug#2 真机录对了给 great/ok；④ B6 复杂字弯笔手感。
- **P2 自主但需先和 codex 打招呼**：指事字 scene 图重产（一=饼干牵强，§6.3）——memory `reference_gpt_image_2_calling` 警告同目录并行会互相覆盖，**跑生图脚本前先确认 codex 没在跑**，不擅自启动。
- **需用户决策（大）**：内容规模仍只 Unit-01 20 字 vs 付费页吆喝 1300 字 → 内容流水线是否启动、从哪个 Unit 起、走什么流水线。【→ §11 用户已拍板：只专注 Unit-01，暂缓流水线】
- **commit 粒度 + 个人凭证剔除**：仍是开场就该和用户拍板的事，本 session 自主验证不涉及 commit 故未推进。【→ §10 已拍板落地】

---

## 十、用户拍板：commit 先攒着不提交 + 个人凭证抽到本地 xcconfig（已落地 ✅）

> 验证收口后问了用户两个 commit 相关决策。结果：① **commit 先攒着不提交**（保持现状）；② **`DEVELOPMENT_TEAM` 抽到本地 xcconfig + gitignore**（自主执行，已完成）。

### 10.1 个人凭证抽离方案（xcconfig 可选 include，fresh clone 不报错）
- 新建 `Config/Signing.xcconfig`（**提交**）：仅一行 `#include? "Signing.local.xcconfig"`——`?` 让 include 可选，别人 clone 没有本地文件时静默跳过、`DEVELOPMENT_TEAM` 留空，各自填自己的 team 或走 Xcode GUI 自动签名。
- 新建 `Config/Signing.local.xcconfig`（**gitignore**）：`DEVELOPMENT_TEAM = VWBLM675NZ`（个人免费团队 ID，只在我本机）。
- 新建 `Config/Signing.local.xcconfig.example`（**提交**）：模板 + 团队 ID 挖法注释，方便他人复制。
- `project.yml`：删掉 `settings.base.DEVELOPMENT_TEAM: VWBLM675NZ`，改在 app target 挂 `configFiles: {Debug/Release: Config/Signing.xcconfig}`。
- 新建 iOS 层 `.gitignore`：忽略 `Config/Signing.local.xcconfig` + `xcuserdata/` + `DerivedData/` + `build/` 等 Xcode 噪声（顺手把之前 git status 里裸露的 `xcuserdata/` 也收了）。

### 10.2 验证（实测，不靠猜）
- `xcodegen generate` → `grep VWBLM675NZ project.pbxproj` = **0**（凭证不再硬编码进生成的工程）；`grep Signing.xcconfig project.pbxproj` = **4**（xcconfig 引用已挂）。
- `git check-ignore Config/Signing.local.xcconfig` ✅ 命中；`git status` 只看到 `Config/`（含 .xcconfig + .example，**不含 .local**）+ `.gitignore`。
- `xcodebuild -showBuildSettings | grep DEVELOPMENT_TEAM` = **`VWBLM675NZ`**（从本地 xcconfig 正确解析，我本机真机签名照常可用）。
- `xcodebuild test` **25 单测 + 1 UI 占位全绿**。

### 10.3 commit 状态
- 用户选「**先攒着不提交**」→ 全部改动仍未 commit（与 §8.4 清单 + 本节新增 `Config/` & `.gitignore` 一起攒着）。
- **好处**：将来真 commit 时，`project.yml`/`project.pbxproj` 的 diff 已不含个人凭证，本地 `Signing.local.xcconfig` 永不进版本库。§8.4 清单里「project.yml（DEVELOPMENT_TEAM，⚠️个人凭证）」这条隐患**已拆除**。

---

## 十一、用户拍板范围决策：**只专注 Unit-01 收口，内容流水线暂缓**

> 用户：「记录知识库和研发笔记，规划好下一个 session 要做的事情，注意，目前先只专注在 Unit-01」。

### 11.1 决策内容
- **范围硬约束**：下个阶段**只专注 Unit-01（启蒙第一课 · 20 字）**，把这 20 字的内容质量 + 真机验收做到"可交付体验"。
- **内容规模扩张（1300 字 / 87 单元流水线 / Unit-02+ 生产）暂缓**，本阶段不启动——长期悬而未决的"内容流水线启不启"问题**关闭：不启**。
- 全套围绕 Unit-01 的下个 session 作战计划已写进 `当前任务.md` 顶部「下一个 session 作战计划 · 只专注 Unit-01 收口」（权威源）。

### 11.2 Unit-01 各维度完成度盘点（规划依据，实测核对过）
- 字表/拼音/组词/释义：✅ 20/20（`Data/Unit01.swift`）。
- 20 字构成：**14 字象形/会意**（ren/kou/shou/ri/yue/shan/shui/huo/mu/mu-eye/er-ear/da/tu + tian 会意，有 oracle 字源彩蛋）+ **6 字指事**（yi/er/san/xiao/shang/xia，规范不做字源彩蛋）。
- scene 实物图：🟡 20/20 接入，**6 指事字牵强**（一=饼干）→ A1 重产（⚠️ 先和 codex 打招呼）。
- oracle 字源彩蛋：🟡 14/14 接入，**shou 用兜底线稿** → A2 替真甲骨源。
- baked 跟读音：✅ `Resources/Audio/unit-01/` 20 字目录齐（60 文件 = 20×3 类），音质待真机逐字听（B5④）。
- P04 弯笔手感：🟡 仅「一」验过，其余 19 字待真机 HID（B6）。
- 布局 / bug#2 / C1 / P11：见 §三/§七/§九（模拟器✅，真机待 Cmd+R）。

### 11.3 下个 session 两条线（详见 `当前任务.md`）
- **A 自主（不需真机，Unit-01 内容质量）**：A1 六指事字 scene 重产（⚠️codex 协调；指事字本就抽象，目标不牵强不误导，做完人眼审 rendered）/ A2 shou 甲骨源替换 / A3 通读 20 字文案对红线 §7.3 自审。
- **B 真机（攒一次 Cmd+R 全扫，全是 Unit-01 验收）**：B1 布局 9 页 / B2 录音回放+20 字扫音质 / B3 bug#2 真机录对 / B4 19 字弯笔手感。
