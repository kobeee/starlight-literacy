import SwiftUI

enum LearningRoute: Equatable, Hashable {
    case map                  // P01 学习地图
    case unit                 // P02 单元入口
    case recognize(String)    // P03 认读绑定（图音字一体，主路径第 1 步）
    case etymology(String)    // 字源彩蛋（仅象形字，认读后追加）
    case imageCard(String)    // P05 动手指认 / 看图认字（第 2 步）
    case followRead(String)   // P05a 跟读纠音（第 3 步）
    case writing(String)      // P04 写字描红（第 4 步 · 完成）
    case group                // P06 单元小组练习（即时再认 · 复现的「本课结尾」面）
    case review               // P12 间隔复习关（艾宾浩斯 · 复现的「时间维度」面，隔天/隔几天再认）
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
    @Published var parentVerified = false                         // 本次会话家长已通过验证门
    @Published var pendingGate: LearningRoute? = nil              // 待家长门放行的目标页（付费/家长中心）

    // 艾宾浩斯间隔复现（第四刀 · 复现的「时间维度」面）
    @Published private(set) var passedAt: [String: Date] = [:]    // 每字写完通过的时刻（复习曲线起点）
    @Published private(set) var reviewStage: [String: Int] = [:]  // 已完成的复习轮次（0=刚学完，graduateStage=巩固毕业）
    @Published private(set) var lastReviewAt: [String: Date] = [:]// 最近一次见到这个字的时刻（初学=passedAt，复习后更新）
    private var clockOffset: TimeInterval = 0                     // 仅 -uiTest 快进时间用，生产恒 0

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

    // ── 家长门（母题 C 合规）──────────────────────────────────
    // 红线 §1 付费透明 / 防误扣：付费方案、家长中心入口必须先过家长验证门，
    // 防孩子一指直达；营销/付费搬出孩子学习流终点（P08）。一次会话验证一次即放行。
    func requestGated(_ r: LearningRoute) {
        if parentVerified { go(r) } else { pendingGate = r }
    }
    func passGate() {
        parentVerified = true
        if let r = pendingGate { pendingGate = nil; go(r) }
    }
    func cancelGate() { pendingGate = nil }

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
        // 复习曲线起点：首次通过才登记（重学不重置已有复习进度）
        if passedAt[id] == nil {
            let t = now()
            passedAt[id] = t
            lastReviewAt[id] = t
            reviewStage[id] = 0
        }
        persist()
    }

    func canEnterImageCard(_ id: String) -> Bool { recognizedIDs.contains(id) }
    func canEnterFollow(_ id: String) -> Bool { identifiedIDs.contains(id) }
    func canEnterWriting(_ id: String) -> Bool { followedIDs.contains(id) }

    // ── 艾宾浩斯间隔复现（第四刀）────────────────────────────
    // 生产时 now() == 当前时刻；仅 -uiTest -fastForwardDays N 时整体快进 N 天，让单 Unit 也能演示「隔天到期」。
    func now() -> Date { Date().addingTimeInterval(clockOffset) }

    /// 今天到期该复习的字（按学习顺序排，毕业的不再排）。供 P01 入口 + P12 复习关。
    func dueReviewIDs(now: Date? = nil) -> [String] {
        let t = now ?? self.now()
        return Unit01.order.filter { id in
            guard passedIDs.contains(id), let since = lastReviewAt[id] else { return false }
            return ReviewSchedule.isDue(stage: reviewStage[id] ?? 0, since: since, now: t)
        }
    }

    /// 复习成功：推进该字的遗忘曲线档位，刷新「最近见到」时刻。零挫败——只在答对时调用。
    func recordReview(_ id: String) {
        guard passedIDs.contains(id) else { return }
        reviewStage[id] = ReviewSchedule.advance(stage: reviewStage[id] ?? 0)
        lastReviewAt[id] = now()
        persist()
    }

    // 留存证据（护城河感知层：亮给家长「孩子隔天回来还认得」）
    var reviewedCharCount: Int { reviewStage.values.filter { $0 >= 1 }.count }       // 至少复习过一轮
    var masteredCharCount: Int { reviewStage.values.filter { ReviewSchedule.isGraduated(stage: $0) }.count }

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
        // 第四刀新增；旧存档无此字段 → 可选解码，缺失时不崩（向后兼容）
        var passedAt: [String: Double]?
        var reviewStage: [String: Int]?
        var lastReviewAt: [String: Double]?
    }

    private func persist() {
        let dto = ProgressDTO(
            recognized: Array(recognizedIDs), identified: Array(identifiedIDs),
            followed: Array(followedIDs), written: Array(writtenIDs), passed: Array(passedIDs),
            stars: starsByChar, identifyStars: identifyStars,
            passedAt: passedAt.mapValues { $0.timeIntervalSince1970 },
            reviewStage: reviewStage,
            lastReviewAt: lastReviewAt.mapValues { $0.timeIntervalSince1970 })
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
        passedAt = (dto.passedAt ?? [:]).mapValues { Date(timeIntervalSince1970: $0) }
        reviewStage = dto.reviewStage ?? [:]
        lastReviewAt = (dto.lastReviewAt ?? [:]).mapValues { Date(timeIntervalSince1970: $0) }
        // 旧存档已通过但无复习起点 → 以加载时刻补登记，纳入复习曲线（不丢老用户）
        for id in passedIDs where passedAt[id] == nil {
            let t = now()
            passedAt[id] = t; lastReviewAt[id] = t; reviewStage[id] = 0
        }
    }

    // 测试/演示用：直接置满整单元进度（仅 UITest 通过 launch arg / 单元测试调用）
    func seedDebugProgress() {
        let base = Date()   // 真实 baseline，不含快进偏移；配合 -fastForwardDays 让 now() 超过它而到期
        for id in Unit01.order {
            recognizedIDs.insert(id); identifiedIDs.insert(id); followedIDs.insert(id)
            writtenIDs.insert(id); passedIDs.insert(id)
            identifyStars[id] = 3; starsByChar[id] = 3
            passedAt[id] = base; lastReviewAt[id] = base; reviewStage[id] = 0
        }
        persist()
    }

    // 仅供 UITest / 截图验证：通过启动参数跳转到指定页面（并补齐到该页所需的前置门）。
    // 生产无任何启动参数 → 不触发，保持正常 .map 起点。
    func applyLaunchArgs() {
        let args = ProcessInfo.processInfo.arguments
        guard args.contains("-uiTest") else { return }
        // 单 Unit-01 范围内演示「隔天到期」：把 now() 整体快进 N 天（仅 -uiTest，生产恒 0）
        if let f = args.firstIndex(of: "-fastForwardDays"), f + 1 < args.count, let days = Int(args[f + 1]) {
            clockOffset = Double(days) * 86_400
        }
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
            case "review": route = .review
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
