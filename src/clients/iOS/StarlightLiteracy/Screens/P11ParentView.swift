import SwiftUI

// P11 · 家长中心 · 暖灰底（区别孩子学习页）
// 红线 §7.1 透明 / §7.2 退款 ≤2 步可达 / §7.9 邀请奖励禁现金禁课程券禁可流通积分，仅此可见，上限 10
struct P11ParentView: View {
    @EnvironmentObject var model: AppModel
    @State private var toast: String? = nil
    @State private var inviteCode = P11ParentView.makeCode()

    private var c: Commerce { model.commerce }

    var body: some View {
        VStack(spacing: 0) {
            PageTopBar(title: "家长中心", subtitle: "暖灰底 · 仅家长可见") { model.go(.map) }
            ScrollView {
                VStack(spacing: Theme.S.s4) {
                    account
                    advice
                    refund
                    invite
                    share
                    Button { model.go(.purchase) } label: {
                        Text("查看付费方案").font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.infoDeep)
                    }
                }
                .padding(Theme.S.s4)
                .padding(.bottom, 40)
            }
        }
        .overlay(alignment: .bottom) { if let t = toast { toastView(t) } }
        .background(Theme.parentPaper.ignoresSafeArea())
        .animation(Theme.easeWarm, value: toast)
        .animation(Theme.easeWarm, value: c.refundState)
    }

    private var account: some View {
        card("账户") {
            line("付费状态", c.isBuyout ? "一期买断（¥199）" : c.sku == "unit" ? "单元单买" : "免费体验")
            line("已解锁单元", "\(c.purchasedUnits.count) 个")
            if let from = c.inviteReceivedFrom {
                Text("已通过邀请码 \(from) 激活 · 额外解锁 2 个单元")
                    .font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.mintDeep)
            }
        }
    }

    private var advice: some View {
        card("今日给家长的 3 条建议") {
            adviceLine("每日固定 1 个时段陪学 ≤ 15 分钟，比无规律 1 小时更有效")
            adviceLine("孩子读错音不要纠正太多次，今天读不准明天再来")
            adviceLine("\(model.unit.title) 字源故事可在饭后讲给孩子听一次，巩固记忆")
        }
    }

    private var refund: some View {
        card("退款") {
            Text("承诺：7 天无理由（含已使用）· 客服 ≤24h 处理 · 仅需 2 步")
                .font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
            refundBlock
        }
    }

    @ViewBuilder
    private var refundBlock: some View {
        if c.sku == nil || c.sku == "free" {
            Text("当前是免费体验，无需退款").font(.system(size: 14)).foregroundStyle(Theme.textSecondary)
        } else {
            switch c.refund {
            case .requested:
                VStack(alignment: .leading, spacing: 8) {
                    Label("第 1 步完成：已提交退款申请", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 14)).foregroundStyle(Theme.successDeep)
                    Button {
                        model.confirmRefund(); toast = "退款已完成 · 保留 Unit-01 免费"; clearToast()
                    } label: { Text("第 2 步：确认退款（不可撤销）") }.buttonStyle(DangerCTA())
                }
            case .completed:
                Label("已退款 · 仅保留 Unit-01 免费", systemImage: "checkmark.seal.fill")
                    .font(.system(size: 14)).foregroundStyle(Theme.mintDeep)
            default:
                Button {
                    model.requestRefund(); toast = "已提交退款申请 · 第 2 步在下方"; clearToast()
                } label: { Text("第 1 步：发起退款") }.buttonStyle(DangerCTA())
            }
        }
    }

    private var invite: some View {
        card("双向邀请") {
            Text("奖励只能是内容权益（解锁单元 / 学伴券）或情感符号 · 禁现金 / 禁课程券 / 禁可流通积分")
                .font(.system(size: 12)).foregroundStyle(Theme.textTertiary)
            HStack {
                Text("我的邀请码").font(.system(size: 14)).foregroundStyle(Theme.textSecondary)
                Spacer()
                Text("STAR-\(inviteCode)").font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundStyle(Theme.goldBrown)
            }
            Text("累计成功邀请：\(c.inviteRewardCount) / \(INVITE_CAP) 次（上限触发即停）")
                .font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.textPrimary)
            ForEach(Array(c.inviteSent.suffix(3).enumerated()), id: \.offset) { _, r in
                Text("已激活 · 奖励：\(rewardLabel(r))").font(.system(size: 12)).foregroundStyle(Theme.mintDeep)
            }
            VStack(spacing: 8) {
                Button {
                    if c.canInvite { model.grantInviteReward(); toast = "已发放邀请奖励（内容权益）" }
                    else { toast = "已达上限 \(INVITE_CAP) 次，邀请奖励不再发放（合规）" }
                    clearToast()
                } label: { Text("模拟一位好友激活 → 发放奖励") }
                    .buttonStyle(GhostCTA()).disabled(!c.canInvite).opacity(c.canInvite ? 1 : 0.5)
                Button {
                    model.activateInvite(from: "FRIEND-\(Int.random(in: 1000...9999))")
                    toast = "已激活 · Unit-02+03 已解锁（不可流通）"; clearToast()
                } label: { Text("模拟我被人邀请 → 激活解锁 Unit-02+03") }.buttonStyle(GhostCTA())
            }
        }
    }

    private var share: some View {
        card("分享卡") {
            Text("学习成就分享卡入口只在这里，孩子学习页不会弹窗打扰")
                .font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
            Image("ShareCard")
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: Theme.R.md))
                .overlay(RoundedRectangle(cornerRadius: Theme.R.md).stroke(Theme.lineSoft, lineWidth: 1))
                .accessibilityLabel("学习成就分享卡预览")
            Text("已学 \(model.completedCount) 个字 · \(model.unit.title)")
                .font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.textSecondary)
            VStack(spacing: 8) {
                Button {
                    toast = "分享卡已保存到相册（示意）"; clearToast()
                } label: { Text("保存分享卡到相册") }.buttonStyle(GhostCTA())
                Button { model.go(.treasury) } label: { Text("去小星宝库看成就 →") }.buttonStyle(GhostCTA())
            }
        }
    }

    // ── 复用小件 ──────────────────────────────────────────
    private func card<Content: View>(_ title: String, @ViewBuilder _ body: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Theme.S.s2) {
            Text(title).font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.textPrimary)
            body()
        }
        .padding(Theme.S.s4).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: Theme.R.md).fill(Theme.cardWarm))
        .overlay(RoundedRectangle(cornerRadius: Theme.R.md).stroke(Theme.lineSoft, lineWidth: 1))
    }

    private func line(_ k: String, _ v: String) -> some View {
        HStack { Text(k).font(.system(size: 14)).foregroundStyle(Theme.textSecondary); Spacer()
            Text(v).font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.textPrimary) }
    }
    private func adviceLine(_ t: String) -> some View {
        Label(t, systemImage: "circle.fill").font(.system(size: 13)).foregroundStyle(Theme.textSecondary)
            .labelStyle(BulletLabel())
    }
    private func rewardLabel(_ r: InviteRecord) -> String {
        r.rewardType == InviteRewardType.unitUnlock.rawValue ? "解锁 \(r.rewardValue)" : "学伴券"
    }
    private func toastView(_ t: String) -> some View {
        Text(t).font(.system(size: 14, weight: .medium)).foregroundStyle(.white)
            .padding(.horizontal, 18).padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: Theme.R.md).fill(Theme.textPrimary.opacity(0.92)))
            .padding(.bottom, 30).transition(.move(edge: .bottom).combined(with: .opacity))
    }
    private func clearToast() { DispatchQueue.main.asyncAfter(deadline: .now() + 2.4) { toast = nil } }
    private static func makeCode() -> String {
        let key = "starlight-ios-claude-invite-code"
        if let s = UserDefaults.standard.string(forKey: key) { return s }
        let s = String((0..<6).map { _ in "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".randomElement()! })
        UserDefaults.standard.set(s, forKey: key); return s
    }
}

struct DangerCTA: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.petalDeep)
            .frame(maxWidth: .infinity).padding(.vertical, 12)
            .background(Capsule().fill(Theme.petalSoft))
            .overlay(Capsule().stroke(Theme.petalDeep.opacity(0.5), lineWidth: 1.5))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct BulletLabel: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle().fill(Theme.honeyGold).frame(width: 5, height: 5).padding(.top, 7)
            configuration.title
        }
    }
}
