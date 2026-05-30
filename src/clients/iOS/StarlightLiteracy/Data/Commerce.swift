import Foundation

// 商业链路 · 与 mh5v2 data/commerce.js 同源
// 红线：§7.1 付费透明 / §7.2 退款宽松 / §7.5 §7.9 邀请克制（禁现金/课程券/积分，上限 10，仅内容权益）
struct InviteRecord: Codable, Equatable {
    var rewardType: String
    var rewardValue: String
    var activatedAt: Date
}

struct Commerce: Codable, Equatable {
    var sku: String? = nil                      // nil | "free" | "unit" | "buyout"
    var purchasedUnits: [String] = ["unit-01"]  // Unit-01 默认免费
    var buyoutAt: Date? = nil
    var refundState: String = RefundState.idle.rawValue
    var refundRequestedAt: Date? = nil
    var inviteReceivedFrom: String? = nil       // 被邀请：已激活的邀请码
    var inviteRewardCount: Int = 0              // 累计发出奖励，上限 INVITE_CAP
    var inviteSent: [InviteRecord] = []

    var isBuyout: Bool { sku == "buyout" }
    var canInvite: Bool { inviteRewardCount < INVITE_CAP }
    var refund: RefundState { RefundState(rawValue: refundState) ?? .idle }

    func isUnitUnlocked(_ unitId: String) -> Bool {
        isBuyout || purchasedUnits.contains(unitId)
    }

    // ── 付费 mock ──────────────────────────────────────────
    mutating func purchase(_ tier: SKU, unitId: String? = nil) {
        switch tier {
        case .buyout:
            sku = "buyout"; buyoutAt = Date()
        case .unit:
            if sku == nil { sku = "unit" }
            if let u = unitId, !purchasedUnits.contains(u) { purchasedUnits.append(u) }
        case .free:
            break
        }
    }

    // ── 退款（≤2 步：requested → completed）────────────────
    mutating func requestRefund() {
        refundState = RefundState.requested.rawValue
        refundRequestedAt = Date()
    }
    mutating func confirmRefund() {
        guard refund == .requested else { return }
        refundState = RefundState.completed.rawValue
        sku = nil
        purchasedUnits = ["unit-01"]
        buyoutAt = nil
    }

    // ── 邀请 ───────────────────────────────────────────────
    // 被邀请人激活 → 自动解锁 Unit-02 + Unit-03（仅内容权益）
    mutating func activateAsInvitee(from code: String) {
        guard inviteReceivedFrom == nil else { return }
        inviteReceivedFrom = code
        for u in ["unit-02", "unit-03"] where !purchasedUnits.contains(u) { purchasedUnits.append(u) }
    }

    // 邀请人累计奖励（上限 10）：已买断→学伴券；未买断→解锁下一个未购单元
    @discardableResult
    mutating func grantInviteReward(nextUnlockable: String?) -> InviteRecord? {
        guard canInvite else { return nil }
        let rec: InviteRecord
        if isBuyout {
            rec = InviteRecord(rewardType: InviteRewardType.giftVoucher.rawValue,
                               rewardValue: "gift-\(Int(Date().timeIntervalSince1970))",
                               activatedAt: Date())
        } else {
            let unit = nextUnlockable ?? "unit-02"
            if !purchasedUnits.contains(unit) { purchasedUnits.append(unit) }
            rec = InviteRecord(rewardType: InviteRewardType.unitUnlock.rawValue,
                               rewardValue: unit, activatedAt: Date())
        }
        inviteRewardCount += 1
        inviteSent.append(rec)
        return rec
    }

    // ── 持久化 ─────────────────────────────────────────────
    private static let key = "starlight-ios-claude-commerce"
    static func load() -> Commerce {
        guard let data = UserDefaults.standard.data(forKey: key),
              let c = try? JSONDecoder().decode(Commerce.self, from: data) else { return Commerce() }
        return c
    }
    func save() {
        if let data = try? JSONEncoder().encode(self) { UserDefaults.standard.set(data, forKey: Commerce.key) }
    }
}
