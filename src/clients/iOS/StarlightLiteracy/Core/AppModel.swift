import SwiftUI

enum LearningRoute: Equatable, Hashable {
    case map                  // P01 学习地图
    case unit                 // P02 单元入口
    case recognize(String)    // P03 认读绑定（图音字一体，主路径第 1 步）
    case etymology(String)    // 字源彩蛋（仅象形字，认读后追加）
    case imageCard(String)    // P05 动手指认 / 看图认字（第 2 步）
    case followRead(String)   // P05a 跟读纠音（第 3 步）
    case writing(String)      // P04 写字描红（第 4 步 · 完成）
    case group                // P06 单元小组练习（复现）
    case celebrate            // P07 庆祝复习
    case result               // P08 结果总览
    case purchase             // P09 付费三层
    case treasury             // P10 小星宝库
    case parentCenter         // P11 家长中心
}

@MainActor
final class AppModel: ObservableObject {
    @Published var route: LearningRoute = .map
    @Published var commerce: Commerce = .load() {
        didSet { commerce.save() }
    }

    // 每字学习证据（护城河：每字独立，不是全局一个布尔）
    // 2026-05-29 教学法重审：主路径五步「认读→认字→跟读→写→复现」，写字是完成步。
    @Published private(set) var recognizedIDs: Set<String> = []   // 认读绑定（图音字）
    @Published private(set) var identifiedIDs: Set<String> = []   // 动手指认（看图认字）
    @Published private(set) var followedIDs: Set<String> = []     // 跟读
    @Published private(set) var writtenIDs: Set<String> = []      // 写字
    @Published private(set) var passedIDs: Set<String> = []       // 完整学完（= 写完）
    @Published private(set) var starsByChar: [String: Int] = [:]  // 1~3 星
    private var identifyStars: [String: Int] = [:]                // 看图认字表现，写完时结算
    @Published var parentVerified = false

    init() {
        loadProgress()
        applyLaunchArgs()
    }

    var unit: Unit { Unit01.unit }
    var completedCount: Int { passedIDs.count }
    var unitComplete: Bool { passedIDs.count >= Unit01.order.count }
    var earnedStars: Int { starsByChar.values.reduce(0, +) }

    /// 当前应该学的字（第一个没学完的；全学完则停在最后一个）
    var currentCharId: String {
        Unit01.order.first(where: { !passedIDs.contains($0) }) ?? Unit01.order.last ?? "yi"
    }

    func go(_ r: LearningRoute) { withAnimation(Theme.easeWarm) { route = r } }

    func startUnit() { go(.recognize(currentCharId)) }

    // ── 学一个字的路由链（顺序即设计，方案 §3）──────────────
    func hasEtymologyEgg(_ id: String) -> Bool { EtymologyAssets.hasEtymologyEgg(id) }

    func routeAfterRecognize(_ id: String) -> LearningRoute {
        hasEtymologyEgg(id) ? .etymology(id) : .imageCard(id)
    }
    func routeAfterEtymology(_ id: String) -> LearningRoute { .imageCard(id) }
    func routeAfterImageCard(_ id: String) -> LearningRoute { .followRead(id) }
    func routeAfterFollow(_ id: String) -> LearningRoute { .writing(id) }
    func routeAfterWriting(_ id: String) -> LearningRoute {
        if let next = Unit01.next(after: id) { return .recognize(next.id) }
        return .group
    }

    // ── 不可绕过的顺序门（红线：零挫败可放过，但不能无行为通过）──
    // 顺序：认读 → 认字 → 跟读 → 写。每一步守上一步，绕过 UI 直调模型也跳不过。
    func markRecognized(_ id: String) {
        recognizedIDs.insert(id); persist()
    }
    func markIdentified(_ id: String, stars: Int) {
        guard recognizedIDs.contains(id) else { return }   // 没认读不能记认字
        identifiedIDs.insert(id)
        identifyStars[id] = max(identifyStars[id] ?? 0, stars)
        persist()
    }
    func markFollowed(_ id: String) {
        guard identifiedIDs.contains(id) else { return }    // 没认字不能记跟读
        followedIDs.insert(id); persist()
    }
    func markWritten(_ id: String) {
        guard followedIDs.contains(id) else { return }      // 没跟读不能写完通过
        writtenIDs.insert(id)
        passedIDs.insert(id)
        starsByChar[id] = max(starsByChar[id] ?? 0, identifyStars[id] ?? 3)
        persist()
    }

    func canEnterImageCard(_ id: String) -> Bool { recognizedIDs.contains(id) }
    func canEnterFollow(_ id: String) -> Bool { identifiedIDs.contains(id) }
    func canEnterWriting(_ id: String) -> Bool { followedIDs.contains(id) }

    // ── 商业动作 ──────────────────────────────────────────
    func purchase(_ tier: SKU, unitId: String? = nil) { commerce.purchase(tier, unitId: unitId) }
    func requestRefund() { commerce.requestRefund() }
    func confirmRefund() { commerce.confirmRefund() }
    func grantInviteReward() {
        let next = Phase1.placeholderUnits.first { !commerce.purchasedUnits.contains($0.id) }?.id
        commerce.grantInviteReward(nextUnlockable: next)
    }
    func activateInvite(from code: String) { commerce.activateAsInvitee(from: code) }

    // ── 学习进度持久化（C3：杀进程/系统回收不丢顺序门）─────────
    private static let progressKey = "starlight.progress.v1"

    private struct ProgressDTO: Codable {
        var recognized: [String]; var identified: [String]; var followed: [String]
        var written: [String]; var passed: [String]
        var stars: [String: Int]; var identifyStars: [String: Int]
    }

    private func persist() {
        let dto = ProgressDTO(
            recognized: Array(recognizedIDs), identified: Array(identifiedIDs),
            followed: Array(followedIDs), written: Array(writtenIDs), passed: Array(passedIDs),
            stars: starsByChar, identifyStars: identifyStars)
        if let data = try? JSONEncoder().encode(dto) {
            UserDefaults.standard.set(data, forKey: Self.progressKey)
        }
    }

    private func loadProgress() {
        guard let data = UserDefaults.standard.data(forKey: Self.progressKey),
              let dto = try? JSONDecoder().decode(ProgressDTO.self, from: data) else { return }
        recognizedIDs = Set(dto.recognized); identifiedIDs = Set(dto.identified)
        followedIDs = Set(dto.followed); writtenIDs = Set(dto.written); passedIDs = Set(dto.passed)
        starsByChar = dto.stars; identifyStars = dto.identifyStars
    }

    // 测试/演示用：直接置满整单元进度（仅 UITest 通过 launch arg / 单元测试调用）
    func seedDebugProgress() {
        for id in Unit01.order {
            recognizedIDs.insert(id); identifiedIDs.insert(id); followedIDs.insert(id)
            writtenIDs.insert(id); passedIDs.insert(id)
            identifyStars[id] = 3; starsByChar[id] = 3
        }
        persist()
    }

    // 仅供 UITest / 截图验证：通过启动参数跳转到指定页面（并补齐到该页所需的前置门）。
    // 生产无任何启动参数 → 不触发，保持正常 .map 起点。
    func applyLaunchArgs() {
        let args = ProcessInfo.processInfo.arguments
        guard args.contains("-uiTest") else { return }
        if args.contains("-seedProgress") { seedDebugProgress() }
        if let i = args.firstIndex(of: "-route"), i + 1 < args.count {
            // 可选 -char <id> 覆盖目标字（仅 -uiTest 截图/录屏用，校验字在表内）；缺省用首字。
            let id: String = {
                if let c = args.firstIndex(of: "-char"), c + 1 < args.count,
                   Unit01.order.contains(args[c + 1]) { return args[c + 1] }
                return Unit01.order.first ?? "yi"
            }()
            switch args[i + 1] {
            case "map": route = .map
            case "unit": route = .unit
            case "recognize": route = .recognize(id)
            case "etymology": markRecognized(id); route = .etymology(id)
            case "imageCard": markRecognized(id); route = .imageCard(id)
            case "followRead": markRecognized(id); markIdentified(id, stars: 3); route = .followRead(id)
            case "writing": markRecognized(id); markIdentified(id, stars: 3); markFollowed(id); route = .writing(id)
            case "group": route = .group
            case "celebrate": route = .celebrate
            case "result": route = .result
            case "purchase": route = .purchase
            case "treasury": route = .treasury
            case "parentCenter": route = .parentCenter
            default: break
            }
        }
        if args.contains("-autoTour") { startAutoTour() }
    }

    // 仅供录屏演示：自动按学习链路顺序巡览全部页面，复用真实 go() 转场动画。
    // 不接受任何用户输入，纯定时推进；生产无 -autoTour 参数 → 不触发。
    func startAutoTour() {
        seedDebugProgress()
        let id = Unit01.order.first(where: { hasEtymologyEgg($0) }) ?? (Unit01.order.first ?? "ren")
        let tour: [LearningRoute] = [
            .map, .unit, .recognize(id), .etymology(id), .imageCard(id),
            .followRead(id), .writing(id), .group, .celebrate, .result, .purchase, .treasury, .parentCenter
        ]
        route = tour[0]
        for (i, r) in tour.enumerated().dropFirst() {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.4 * Double(i)) { [weak self] in
                self?.go(r)
            }
        }
    }
}
