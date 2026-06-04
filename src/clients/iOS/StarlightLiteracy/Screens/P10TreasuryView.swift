import SwiftUI

// P10 · 小星宝库 · 红线 §7.5 游戏化克制
// 已学字陈列 + 勋章 · 分享卡入口只在家长中心，学习页不弹窗、不引流
struct P10TreasuryView: View {
    @EnvironmentObject var model: AppModel
    private var unit: Unit { model.unit }
    private var learned: Int { model.passedIDs.count }
    private let cols = Array(repeating: GridItem(.flexible(), spacing: 10), count: 5)

    private var medals: [(name: String, hint: String, on: Bool)] {
        [
            ("第一颗星", "学会第 1 个字", learned >= 1),
            ("一组通关", "学完一组 5 字", learned >= 5),
            ("首单元毕业", "Unit-01 全部 20 字", learned >= 20),
            ("永久学伴", "一期 1300 字买断", model.commerce.isBuyout),
            ("推荐之星", "成功邀请 1 位家长", model.commerce.inviteRewardCount >= 1)
        ]
    }

    var body: some View {
        VStack(spacing: 0) {
            PageTopBar(title: "小星宝库") { model.go(.map) }
            ScrollView {
                VStack(spacing: Theme.S.s5) {
                    VStack(spacing: 4) {
                        Text("\(learned)").font(.system(size: 40, weight: .heavy, design: .rounded)).foregroundStyle(Theme.goldBrown)
                        + Text(" / \(unit.charIds.count) 字").font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.textSecondary)
                        Text("已学进度 · 还能解锁 \(max(unit.charIds.count - learned, 0)) 个")
                            .font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
                    }
                    .padding(Theme.S.s4).frame(maxWidth: .infinity).warmCard(fill: Theme.goldPaper.opacity(0.5))

                    // 勋章
                    VStack(alignment: .leading, spacing: Theme.S.s3) {
                        Text("勋章").font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.textPrimary)
                        ForEach(medals, id: \.name) { m in
                            HStack(spacing: 12) {
                                Image(systemName: m.on ? "star.circle.fill" : "star.circle")
                                    .font(.system(size: 30)).foregroundStyle(m.on ? Theme.honeyGold : Theme.lineSoft)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(m.name).font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(m.on ? Theme.textPrimary : Theme.textTertiary)
                                    Text(m.hint).font(.system(size: 12)).foregroundStyle(Theme.textTertiary)
                                }
                                Spacer()
                            }
                        }
                    }
                    .padding(Theme.S.s4).warmCard()

                    // 字陈列馆
                    VStack(alignment: .leading, spacing: Theme.S.s3) {
                        Text("字陈列馆").font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.textPrimary)
                        LazyVGrid(columns: cols, spacing: 10) {
                            ForEach(unit.charIds, id: \.self) { id in
                                let c = Unit01.char(id)
                                let on = model.passedIDs.contains(id)
                                VStack(spacing: 2) {
                                    Text(c.char).font(.hanzi(22)).foregroundStyle(on ? Theme.textPrimary : Theme.lockedDeep)
                                    Text(c.pinyin).font(.pinyin(9)).foregroundStyle(on ? c.color.deep : Theme.textTertiary)
                                }
                                .frame(maxWidth: .infinity).padding(.vertical, 8)
                                .background(RoundedRectangle(cornerRadius: Theme.R.sm).fill(on ? c.color.soft : Theme.lockedSoft))
                            }
                        }
                    }
                    .padding(Theme.S.s4).warmCard()

                    Text("分享卡入口只在家长中心 · 学习中不打扰")
                        .font(.system(size: 12)).foregroundStyle(Theme.textTertiary)
                }
                .padding(Theme.S.s4)
            }
        }
        .safeAreaInset(edge: .bottom) {
            DockedCTA(title: "去家长中心生成分享卡 →") { model.requestGated(.parentCenter) }
        }
        .background(Theme.paperCream.ignoresSafeArea())
    }
}
