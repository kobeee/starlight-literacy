import SwiftUI

// 田园暖彩设计系统 · 与 mh5v2 styles.css :root 同源
// 硬约束：蜂蜜金是唯一主强调；花田 5 色仅做信息分组（面积 < 中性）；
// 阴影是厚度不是发光；禁紫蓝渐变 / 霓虹 / 暗底 glow。
enum Theme {
    // Foundation · 暖米纸面
    static let paperCream  = Color(hex: 0xFAF6F0)
    static let cardWarm    = Color(hex: 0xFFFAEC)
    static let cardSoft    = Color(hex: 0xFFF4C7)
    static let lineSoft    = Color(hex: 0xEFE7DC)
    static let textPrimary   = Color(hex: 0x5D4A36)  // 暖深棕 · 禁纯黑
    static let textSecondary = Color(hex: 0x7A6A55)
    static let textTertiary  = Color(hex: 0x9A8F82)

    // Core Accent · 蜂蜜金
    static let honeyGold = Color(hex: 0xFFC947)
    static let goldDeep  = Color(hex: 0xE8A800)
    static let goldPaper = Color(hex: 0xFFEDB8)
    static let goldBrown = Color(hex: 0x8B5E00)

    // Meadow · 5 色花田辅助
    static let grassSoft = Color(hex: 0xD8E8C5); static let grassDeep = Color(hex: 0x9CC077)
    static let petalSoft = Color(hex: 0xFFD9D9); static let petalDeep = Color(hex: 0xF5A8A8)
    static let skySoft   = Color(hex: 0xD4E8F0); static let skyDeep   = Color(hex: 0x8FBED4)
    static let apricotSoft = Color(hex: 0xFFE0C2); static let apricotDeep = Color(hex: 0xFFB87A)
    static let mintSoft  = Color(hex: 0xF0FAF6); static let mintDeep  = Color(hex: 0x5BA88E)

    // Semantic
    static let successSoft = Color(hex: 0xE8F5EF); static let successDeep = Color(hex: 0x5BA88E)
    static let infoSoft  = Color(hex: 0xE5EFFA); static let infoDeep  = Color(hex: 0x5B8FC7)
    static let lockedSoft = Color(hex: 0xF5EEE2); static let lockedDeep = Color(hex: 0xA08B78)
    static let parentPaper = Color(hex: 0xEDE4D2)  // 家长中心暖灰底

    // Radius
    enum R { static let sm: CGFloat = 12; static let md: CGFloat = 18; static let lg: CGFloat = 24; static let pill: CGFloat = 999 }
    // Spacing
    enum S { static let s1: CGFloat = 4; static let s2: CGFloat = 8; static let s3: CGFloat = 12; static let s4: CGFloat = 16; static let s5: CGFloat = 20; static let s6: CGFloat = 24; static let s8: CGFloat = 32; static let s12: CGFloat = 48 }

    static let easeWarm = Animation.timingCurve(0.32, 0.72, 0.36, 1, duration: 0.42)
    static let easePop  = Animation.timingCurve(0.18, 1.4, 0.42, 1, duration: 0.42)
}

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB,
                  red:   Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue:  Double(hex & 0xFF) / 255,
                  opacity: alpha)
    }
}

enum ColorToken: String, Codable, Equatable {
    case gold, sky, grass, petal, apricot, mint
    var soft: Color {
        switch self {
        case .gold: Theme.goldPaper; case .sky: Theme.skySoft; case .grass: Theme.grassSoft
        case .petal: Theme.petalSoft; case .apricot: Theme.apricotSoft; case .mint: Theme.mintSoft
        }
    }
    var deep: Color {
        switch self {
        case .gold: Theme.goldDeep; case .sky: Theme.skyDeep; case .grass: Theme.grassDeep
        case .petal: Theme.petalDeep; case .apricot: Theme.apricotDeep; case .mint: Theme.mintDeep
        }
    }
}

// ── 复用样式 ─────────────────────────────────────────────
struct WarmCard: ViewModifier {
    var fill: Color = Theme.cardWarm
    var radius: CGFloat = Theme.R.lg
    func body(content: Content) -> some View {
        content
            .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(fill))
            .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous).stroke(Theme.lineSoft, lineWidth: 1))
            .shadow(color: Theme.textPrimary.opacity(0.08), radius: 14, x: 0, y: 5)
    }
}
extension View {
    func warmCard(fill: Color = Theme.cardWarm, radius: CGFloat = Theme.R.lg) -> some View {
        modifier(WarmCard(fill: fill, radius: radius))
    }
}

// 蜂蜜金主 CTA（disabled 时退为浅灰，零发光）
struct GoldCTA: ButtonStyle {
    var enabled: Bool = true
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 19, weight: .bold, design: .rounded))
            .foregroundStyle(enabled ? Theme.goldBrown : Theme.textTertiary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: Theme.R.pill, style: .continuous)
                    .fill(enabled ? Theme.honeyGold : Theme.lineSoft)
            )
            .shadow(color: enabled ? Theme.honeyGold.opacity(0.4) : .clear, radius: 14, x: 0, y: 6)
            .scaleEffect(configuration.isPressed && enabled ? 0.97 : 1)
            .animation(Theme.easePop, value: configuration.isPressed)
    }
}

struct GhostCTA: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold, design: .rounded))
            .foregroundStyle(Theme.textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(RoundedRectangle(cornerRadius: Theme.R.pill, style: .continuous).fill(Theme.cardWarm))
            .overlay(RoundedRectangle(cornerRadius: Theme.R.pill, style: .continuous).stroke(Theme.lineSoft, lineWidth: 1.5))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

// 拼音圆角字体
extension Font {
    static func pinyin(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }
    static func hanzi(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight)
    }
}
