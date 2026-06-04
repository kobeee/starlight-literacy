import SwiftUI

// 学习舞台顶栏：返回 + 标题 + 4 步进度（认读→认字→跟读→写）+ 当前字
struct StageTopBar: View {
    @EnvironmentObject var model: AppModel
    let title: String
    let step: Int          // 1=认读 2=认字 3=跟读 4=写
    let char: StarChar
    var revealChar: Bool = true   // 认字测试页(P05)传 false：顶栏不挂答案字，堵送分漏洞
    var onBack: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: Theme.S.s3) {
            Button { (onBack ?? { model.go(.unit) })() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Theme.textSecondary)
                    .frame(width: 40, height: 40)
                    .background(Circle().fill(Theme.cardWarm))
                    .overlay(Circle().stroke(Theme.lineSoft, lineWidth: 1))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 17, weight: .bold)).foregroundStyle(Theme.textPrimary)
                HStack(spacing: 5) {
                    ForEach(1...4, id: \.self) { i in
                        Capsule()
                            .fill(i <= step ? char.color.deep : Theme.lineSoft)
                            .frame(width: i == step ? 18 : 10, height: 5)
                    }
                }
            }
            Spacer()
            if revealChar {
                HStack(spacing: 6) {
                    Text(char.char).font(.hanzi(22)).foregroundStyle(Theme.textPrimary)
                    Text(char.pinyin).font(.pinyin(13)).foregroundStyle(char.color.deep)
                }
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(Capsule().fill(char.color.soft))
            } else {
                // 认字测试页：不挂答案字，用中性「听音找字」标记占位，避免送分
                HStack(spacing: 6) {
                    Image(systemName: "ear.fill").font(.system(size: 14)).foregroundStyle(char.color.deep)
                    Text("听音找字").font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.textSecondary)
                }
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(Capsule().fill(char.color.soft))
            }
        }
        .padding(.horizontal, Theme.S.s4)
        .padding(.vertical, Theme.S.s3)
        .background(Theme.paperCream)
    }
}

// 主操作「呼吸 + 蜜金光晕」引导（母题A 去文字化 · 2026-06-04 替代旧版「丑手指」TapHintHand）。
// 不识字孩子的视觉自驱信号——红线禁操作播报/OS TTS，所以靠视觉不靠语音。
// 为什么不用「向外扩散淡出的环」：蜜金环画在蜜金钮上没对比、扩散到奶油背景又淡成 0，
// 两头都看不见。改成钮体轻微缩放呼吸 + 蜜金光晕脉冲（在奶油背景上始终可见、永不淡到 0），
// 比写实手指图标更贴田园暖彩、更克制，且不挡点击。scale=1 时为纯光晕（不缩放钮体）。
extension View {
    func tapBreathe(_ active: Bool = true, scale: CGFloat = 1.035) -> some View {
        modifier(TapBreathe(active: active, scale: scale))
    }
}

struct TapBreathe: ViewModifier {
    var active: Bool = true
    var scale: CGFloat = 1.035
    @State private var on = false
    func body(content: Content) -> some View {
        content
            .scaleEffect(active && on ? scale : 1)
            .shadow(color: Theme.honeyGold.opacity(active ? (on ? 0.55 : 0.22) : 0),
                    radius: active ? (on ? 18 : 9) : 0, y: 4)
            .onAppear {
                guard active else { return }
                withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) { on = true }
            }
    }
}

// 光晕呼吸圈引导（2026-06-03，调研：幼龄可点元素用 glow/sparkle 高亮、不贴手指图标）。
// 替代 TapHintHand 的「丑手指」——在主操作钮外围画一圈向外扩散 + 淡出的光环，更贴田园暖彩。
// 用在跟读大圆钮：未录音时呼吸引导孩子「点这里说话」。allowsHitTesting(false) 不挡点击。
struct PulseHalo: View {
    var color: Color = Theme.honeyGold
    var size: CGFloat = 100
    @State private var animate = false
    var body: some View {
        Circle()
            .stroke(color.opacity(0.55), lineWidth: 3)
            .frame(width: size, height: size)
            .scaleEffect(animate ? 1.28 : 0.9)
            .opacity(animate ? 0 : 0.85)
            .allowsHitTesting(false)
            .onAppear {
                withAnimation(.easeOut(duration: 1.4).repeatForever(autoreverses: false)) { animate = true }
            }
    }
}

// 音→形绑定字形（认读页 P03 主路径第 1 步）· 2026-06-03 第二刀
// 第一性：幼儿音义已有、缺的只是「形」。念音一响，字形就像老师写字一样「逐笔描写点亮」，
// 把孩子注意力从已有的音牵到新符号的形上（调研 §二3 Duolingo ABC 音→形绑定）。
// 复用 hanzi-writer-data 真字形（与 P04 描红窗同源）；无 json 的字回退静态大字。
struct StrokeRevealGlyph: View {
    let charId: String
    let hanzi: String
    let color: ColorToken
    var size: CGFloat = 180
    var playToken: Int = 0          // 每次念音 +1，触发一次逐笔点亮
    var revealDuration: Double = 0.8 // 念音时长，逐笔节奏对齐它

    private var data: HanziData? { HanziData.load(char: hanzi) }
    private var t: HanziTransform { HanziTransform(size: size, padding: 12) }

    @State private var stroke = 0       // 已点亮到第几笔
    @State private var progress: CGFloat = 0 // 当前笔描写进度 0→1
    @State private var timer: Timer?

    var body: some View {
        Group {
            if let data {
                Canvas { ctx, _ in
                    for s in 0..<data.strokes.count {
                        let p = SVGPath.path(from: data.strokes[s], t: t)
                        if s < stroke {
                            ctx.fill(p, with: .color(color.deep))           // 已点亮：实色
                        } else {
                            ctx.fill(p, with: .color(Theme.lineSoft.opacity(0.22))) // 未点亮：极淡轮廓
                        }
                    }
                    // 当前笔沿 median 描写（同 DemoWriterView）
                    if stroke < data.medians.count {
                        let med = t.median(data.medians[stroke])
                        if med.count > 1 {
                            var line = Path(); line.addLines(med)
                            ctx.stroke(line.trimmedPath(from: 0, to: progress),
                                       with: .color(color.deep),
                                       style: StrokeStyle(lineWidth: max(7, size * 0.05),
                                                          lineCap: .round, lineJoin: .round))
                        }
                    }
                }
                .frame(width: size, height: size)
                .shadow(color: color.deep.opacity(0.18), radius: 6, y: 3)
            } else {
                // 无笔画数据兜底：等于改造前的静态大字
                Text(hanzi)
                    .font(.hanzi(size * 0.7))
                    .foregroundStyle(Theme.textPrimary)
                    .shadow(color: color.deep.opacity(0.25), radius: 8, y: 3)
                    .frame(width: size, height: size)
            }
        }
        .onAppear { startReveal() }                       // 进页自动首演
        .onChange(of: playToken) { _, _ in startReveal() } // 每次念音重演
        .onDisappear { timer?.invalidate() }
    }

    private func startReveal() {
        timer?.invalidate()
        let count = data?.medians.count ?? 0
        guard count > 0 else { return }
        stroke = 0; progress = 0
        // 节奏护栏：念音过短不一闪而过、多笔字不拖沓
        let total = min(max(revealDuration, Double(count) * 0.30), 3.0)
        let perStroke = max(total / Double(count), 0.18)
        let step = 0.03
        let inc = CGFloat(step / perStroke)
        timer = Timer.scheduledTimer(withTimeInterval: step, repeats: true) { _ in
            Task { @MainActor in
                progress += inc
                if progress >= 1 {
                    progress = 0
                    stroke += 1
                    if stroke >= count { stroke = count; timer?.invalidate() } // 停在整字成型
                }
            }
        }
    }
}

// 家长验证门（母题 C 合规）· 2026-06-03 第三刀
// 红线 §1 付费透明 / 防误扣：付费方案、家长中心入口拦一道算术门，防孩子一指直达。
// 算术验证（非长按）= Apple 家长门推荐做法，真验证成人；亲子共用下家长层可文字。

// 纯逻辑（可单测）：两个一位数乘法挑战。
struct ParentChallenge: Equatable {
    let a: Int
    let b: Int
    var answer: Int { a * b }
    var prompt: String { "\(a) × \(b) = ?" }
    static func make() -> ParentChallenge { ParentChallenge(a: Int.random(in: 3...9), b: Int.random(in: 3...9)) }
}

struct ParentGate: View {
    var onPass: () -> Void
    var onCancel: () -> Void

    @State private var challenge = ParentChallenge.make()
    @State private var entry = ""
    @State private var wrong = false

    private let keys = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"]

    var body: some View {
        ZStack {
            Color.black.opacity(0.45).ignoresSafeArea()
                .onTapGesture { onCancel() }
            VStack(spacing: Theme.S.s4) {
                Text("请家长完成验证").font(.system(size: 17, weight: .bold)).foregroundStyle(Theme.textPrimary)
                Text("这是给家长看的页面，请回答下面的算术题").font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)

                Text(challenge.prompt).font(.system(size: 30, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.goldBrown)
                Text(entry.isEmpty ? " " : entry)
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundStyle(wrong ? Theme.petalDeep : Theme.textPrimary)
                    .frame(minWidth: 80).padding(.vertical, 6)
                    .background(Capsule().fill(Theme.goldPaper))
                    .overlay(Capsule().stroke(wrong ? Theme.petalDeep : Theme.lineSoft, lineWidth: 1.5))

                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 10) {
                    ForEach(keys, id: \.self) { k in keyButton(k) }
                }

                Button { onCancel() } label: {
                    Text("返回").font(.system(size: 14, weight: .medium)).foregroundStyle(Theme.textSecondary)
                }
                .padding(.top, 2)
            }
            .padding(Theme.S.s5)
            .frame(maxWidth: 320)
            .background(RoundedRectangle(cornerRadius: Theme.R.lg, style: .continuous).fill(Theme.cardWarm))
            .overlay(RoundedRectangle(cornerRadius: Theme.R.lg).stroke(Theme.lineSoft, lineWidth: 1))
            .shadow(color: .black.opacity(0.18), radius: 24, y: 8)
            .padding(Theme.S.s5)
        }
    }

    private func keyButton(_ k: String) -> some View {
        Button {
            switch k {
            case "⌫": if !entry.isEmpty { entry.removeLast() }
            case "✓": submit()
            default: if entry.count < 3 { entry += k }
            }
        } label: {
            Text(k).font(.system(size: 22, weight: .semibold))
                .foregroundStyle(k == "✓" ? Color.white : Theme.textPrimary)
                .frame(maxWidth: .infinity).frame(height: 48)
                .background(RoundedRectangle(cornerRadius: Theme.R.sm)
                    .fill(k == "✓" ? Theme.honeyGold : Color.white))
                .overlay(RoundedRectangle(cornerRadius: Theme.R.sm).stroke(Theme.lineSoft, lineWidth: 1))
        }
    }

    private func submit() {
        if Int(entry) == challenge.answer {
            onPass()
        } else {
            withAnimation(Theme.easePop) { wrong = true }
            entry = ""
            challenge = ParentChallenge.make()   // 答错换新题，防瞎试
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { wrong = false }
        }
    }
}

// 底部锁定 CTA（mh5v2 .docked-cta 同源，解决"继续按钮乱漂"）
// icon：前置图标，给不识字孩子「往前走」的视觉符号（学习流页统一用 arrow.right）。
// pulse：就绪时跳动手指 + 轻微脉冲，回答走查母题A「认读看完不知道该点下面了」。
struct DockedCTA: View {
    let title: String
    var enabled: Bool = true
    var icon: String? = nil
    var pulse: Bool = false
    var secondaryTitle: String? = nil
    var onSecondary: (() -> Void)? = nil
    let action: () -> Void

    private var showHint: Bool { pulse && enabled }

    var body: some View {
        VStack(spacing: 0) {
            Divider().overlay(Theme.lineSoft)
            HStack(spacing: Theme.S.s3) {
                if let s = secondaryTitle {
                    Button(action: { onSecondary?() }) { Text(s) }.buttonStyle(GhostCTA()).frame(maxWidth: 130)
                }
                Button(action: { if enabled { action() } }) {
                    HStack(spacing: 8) {
                        if let icon { Image(systemName: icon).font(.system(size: 20, weight: .bold)) }
                        Text(title)
                    }
                }
                .buttonStyle(GoldCTA(enabled: enabled))
                .disabled(!enabled)
                .tapBreathe(showHint)
            }
            .padding(.horizontal, Theme.S.s4)
            .padding(.top, Theme.S.s3)
            .padding(.bottom, Theme.S.s2)
        }
        .background(Theme.paperCream.opacity(0.98))
    }
}

// 简易栏标题
struct PageTopBar: View {
    let title: String
    var subtitle: String? = nil
    var onBack: (() -> Void)? = nil
    var trailing: AnyView? = nil
    var body: some View {
        HStack(spacing: Theme.S.s3) {
            if let onBack {
                Button(action: onBack) {
                    Image(systemName: "chevron.left").font(.system(size: 17, weight: .bold))
                        .foregroundStyle(Theme.textSecondary)
                        .frame(width: 40, height: 40)
                        .background(Circle().fill(Theme.cardWarm))
                        .overlay(Circle().stroke(Theme.lineSoft, lineWidth: 1))
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.textPrimary)
                if let subtitle { Text(subtitle).font(.system(size: 13)).foregroundStyle(Theme.textTertiary) }
            }
            Spacer()
            if let trailing { trailing }
        }
        .padding(.horizontal, Theme.S.s4)
        .padding(.vertical, Theme.S.s3)
    }
}

// 星星行
struct StarRow: View {
    let count: Int          // 0~3
    var size: CGFloat = 20
    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<3, id: \.self) { i in
                Image(systemName: i < count ? "star.fill" : "star")
                    .font(.system(size: size))
                    .foregroundStyle(i < count ? Theme.honeyGold : Theme.lineSoft)
            }
        }
    }
}

// 字大圆牌
struct CharMedallion: View {
    let char: StarChar
    var diameter: CGFloat = 96
    var locked: Bool = false
    var body: some View {
        ZStack {
            Circle().fill(locked ? Theme.lockedSoft : char.color.soft)
            Circle().stroke(locked ? Theme.lockedDeep.opacity(0.3) : char.color.deep.opacity(0.4), lineWidth: 2)
            if locked {
                Image(systemName: "lock.fill").font(.system(size: diameter * 0.28)).foregroundStyle(Theme.lockedDeep)
            } else {
                Text(char.char).font(.hanzi(diameter * 0.5)).foregroundStyle(Theme.textPrimary)
            }
        }
        .frame(width: diameter, height: diameter)
    }
}
