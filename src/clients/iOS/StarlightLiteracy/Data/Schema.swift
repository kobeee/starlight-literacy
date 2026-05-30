import Foundation

// 数据 schema · 与 mh5v2 data/schema.js 同源
// 设计目标：1300 字 / 87 单元规模化，五大模块字段对齐，红线落到类型边界
let SCHEMA_VERSION = "v2.0.0-ios-2026-05-28"

// 六书（字源真讲红线 §7.3：禁直映法）
enum EtymologyType: String, Codable { case 象形, 会意, 指事, 形声, 转注, 假借 }
// 字源必须有真实出处
enum EtymologySource: String, Codable { case 甲骨文, 金文, 篆文, 隶书 }

struct Etymology: Codable, Equatable {
    let type: EtymologyType
    let source: EtymologySource
    let glyphHook: String       // 真象形/会意 hook，非牵强联想
    let lifeMapping: String     // 生活映射
    let contrastTargets: [String]  // 易混字对比
}

struct StarChar: Identifiable, Equatable {
    let id: String              // 拼音无声调 + 可选后缀（mu / mu-eye）
    let char: String            // 单字
    let pinyin: String          // 含声调
    let etymology: Etymology
    let strokes: Int            // 笔画数（hanzi 数据校验用）
    let phrase: String          // 组词（跟读用）
    let color: ColorToken
}

struct Unit: Identifiable, Equatable {
    let id: String
    let title: String
    let subtitle: String
    let tier: Tier
    let charIds: [String]
    let groups: [[String]]
    enum Tier: String { case free, paid }
}

// ── 商业状态机 · 与 commerce.js 同源 ──────────────────────────
enum SKU: String, CaseIterable, Identifiable {
    case free, unit, buyout
    var id: String { rawValue }
    var price: Double { switch self { case .free: 0; case .unit: 9.9; case .buyout: 199 } }
    var label: String {
        switch self {
        case .free: "免费体验"
        case .unit: "单元单买"
        case .buyout: "一期买断 + 远期升级"
        }
    }
    var title: String {
        switch self {
        case .free: "Unit-01 完整免费"
        case .unit: "¥9.9 单元永久"
        case .buyout: "¥199 一期买断"
        }
    }
    var highlights: [String] {
        switch self {
        case .free:   ["Unit-01 完整 20 字", "永久免费", "无需注册"]
        case .unit:   ["任选 1 个单元 ≈ 15 字", "永久可学", "无续费陷阱"]
        case .buyout: ["一期 1300 字全部内容", "远期 1800 字扩展免费升级", "7 天无理由退款（含已使用）", "不设自动续费"]
        }
    }
}

// 退款状态机（红线 §7.2 ≤2 步可达）
enum RefundState: String { case idle, requested, completed, rejected }

// 邀请状态机（红线 §7.5 §7.9：禁现金/禁课程券/禁积分，仅家长中心可见，上限 10）
enum InviteState: String { case idle, shared, clicked, activated }
enum InviteRewardType: String { case unitUnlock = "unit-unlock", giftVoucher = "gift-voucher" }
let INVITE_CAP = 10

// 反差化数据（vs 洪恩）
struct CompetitorContrast {
    static let hongenPrice = 388; static let hongenChars = 20; static let hongenPerChar = 19.4
    static let oursPrice = 199; static let oursChars = 1300; static let oursPerChar = 0.15
    static let perCharRatio = "1/130"
}

// 禁用声学层（红线：禁所有 OS TTS / 欢迎语 / 操作播报）
enum ForbiddenAudio: String, CaseIterable {
    case welcomeVoice = "welcome-voice"
    case buttonFeedbackVoice = "button-feedback-voice"
    case osTTSFallback = "os-tts-fallback"
}
