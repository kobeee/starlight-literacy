import SwiftUI

// P09 · 付费方案页 · 红线 §7.1 透明 / §7.2 退款宽松 / §7.9 邀请合规
// 三层 SKU 一屏可见 + 反差化对照 + 三条承诺（不藏小字）+ 邀请合规说明
// 不做"勾选续费默认"、不做"含糊永久"，价格/字数/退款全部明示。
struct P09PurchaseView: View {
    @EnvironmentObject var model: AppModel
    @State private var toast: String? = nil

    var body: some View {
        VStack(spacing: 0) {
            PageTopBar(title: "付费方案") { model.go(.map) }
            ScrollView {
                VStack(spacing: Theme.S.s5) {
                    contrast
                    ForEach(SKU.allCases) { sku in skuCard(sku) }
                    promises
                    Text("合规说明：邀请奖励仅限单元解锁 / 学伴券，禁现金、禁课程券、禁可流通积分；仅家长中心可见，累计上限 \(INVITE_CAP) 次")
                        .font(.system(size: 11)).foregroundStyle(Theme.textTertiary)
                        .multilineTextAlignment(.leading)
                }
                .padding(Theme.S.s4)
                .padding(.bottom, 40)
            }
        }
        .overlay(alignment: .bottom) { if let t = toast { toastView(t) } }
        .background(Theme.paperCream.ignoresSafeArea())
        .animation(Theme.easeWarm, value: toast)
    }

    private var contrast: some View {
        VStack(spacing: 6) {
            Text("洪恩：\(CompetitorContrast.hongenChars) 字 · 单字 ¥\(CompetitorContrast.hongenPerChar, specifier: "%.1f")")
                .font(.system(size: 14)).foregroundStyle(Theme.textSecondary)
            Text("我们：\(CompetitorContrast.oursChars) 字 · 单字 ¥\(CompetitorContrast.oursPerChar, specifier: "%.2f")")
                .font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.goldBrown)
            Text("单字成本 \(CompetitorContrast.perCharRatio) · 一次性付，远期升级免费")
                .font(.system(size: 12)).foregroundStyle(Theme.textTertiary)
        }
        .padding(Theme.S.s4).frame(maxWidth: .infinity).warmCard(fill: Theme.goldPaper.opacity(0.5))
    }

    private func skuCard(_ sku: SKU) -> some View {
        let owned = isOwned(sku)
        let featured = sku == .buyout
        return VStack(alignment: .leading, spacing: Theme.S.s3) {
            HStack {
                Text(sku.label).font(.system(size: 17, weight: .bold)).foregroundStyle(Theme.textPrimary)
                Spacer()
                Text(sku.price == 0 ? "免费" : "¥\(sku.price, specifier: "%g")")
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundStyle(featured ? Theme.goldBrown : Theme.textPrimary)
            }
            ForEach(sku.highlights, id: \.self) { h in
                Label(h, systemImage: "checkmark.circle.fill")
                    .font(.system(size: 13)).foregroundStyle(Theme.textSecondary)
                    .labelStyle(.titleAndIcon)
            }
            actionButton(sku, owned: owned)
        }
        .padding(Theme.S.s4)
        .warmCard(fill: featured ? Theme.goldPaper.opacity(0.7) : Theme.cardWarm)
        .overlay(alignment: .topLeading) {
            // B2 修复：原角标在 topTrailing 压住右上角 ¥199（被裁成「¥1」）。移到左上，不碰价格。
            if featured {
                Text("推荐").font(.system(size: 11, weight: .bold)).foregroundStyle(.white)
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Capsule().fill(Theme.goldDeep)).offset(x: 12, y: -10)
            }
        }
    }

    @ViewBuilder
    private func actionButton(_ sku: SKU, owned: Bool) -> some View {
        if owned {
            Text("已拥有").font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.successDeep)
                .frame(maxWidth: .infinity).padding(.vertical, 12)
                .background(Capsule().fill(Theme.successSoft))
        } else if sku == .free {
            Button { model.go(.unit) } label: { Text("直接体验") }.buttonStyle(GhostCTA())
        } else {
            Button {
                model.purchase(sku, unitId: sku == .unit ? "unit-02" : nil)
                toast = sku == .buyout ? "买断成功 · 1300 字全部解锁 · 远期 1800 字将自动升级"
                                       : "单元已购 · 永久可学 · 不会自动续费"
                clearToast()
            } label: { Text(sku == .buyout ? "买断 · ¥199" : "选购 · ¥9.9") }
                .buttonStyle(GoldCTA())
        }
    }

    private var promises: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("三条承诺（不藏小字）").font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.textPrimary)
            promiseLine("7 天无理由退款", "含已使用，家长中心一键发起，客服 ≤24h 处理")
            promiseLine("不设自动续费", "买断即买断，不勾选、不悄悄扣")
            promiseLine("远期 1800 字免费升级", "买断后所有新单元自动解锁")
        }
        .padding(Theme.S.s4).frame(maxWidth: .infinity, alignment: .leading).warmCard(fill: Theme.successSoft)
    }

    private func promiseLine(_ t: String, _ d: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Label(t, systemImage: "checkmark.seal.fill")
                .font(.system(size: 14, weight: .bold)).foregroundStyle(Theme.successDeep)
            Text(d).font(.system(size: 13)).foregroundStyle(Theme.textSecondary)
        }
    }

    private func toastView(_ t: String) -> some View {
        Text(t).font(.system(size: 14, weight: .medium)).foregroundStyle(.white)
            .padding(.horizontal, 18).padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: Theme.R.md).fill(Theme.textPrimary.opacity(0.92)))
            .padding(.bottom, 30).transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func isOwned(_ sku: SKU) -> Bool {
        switch sku {
        case .free: true
        case .unit: model.commerce.purchasedUnits.count > 1 && !model.commerce.isBuyout
        case .buyout: model.commerce.isBuyout
        }
    }

    private func clearToast() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.4) { toast = nil }
    }
}
