import SwiftUI

// P08 · 单元结果摘要 · 学习证据卡（vs 洪恩反差化在此处）
struct P08ResultView: View {
    @EnvironmentObject var model: AppModel
    private var unit: Unit { model.unit }
    private let cols = Array(repeating: GridItem(.flexible(), spacing: 10), count: 5)

    var body: some View {
        VStack(spacing: 0) {
            PageTopBar(title: "学习成果") { model.go(.map) }
            ScrollView {
                VStack(spacing: Theme.S.s5) {
                    VStack(spacing: 4) {
                        Text("\(unit.charIds.count)").font(.system(size: 52, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.goldBrown)
                        + Text(" 字").font(.system(size: 24, weight: .bold)).foregroundStyle(Theme.textSecondary)
                        Text(unit.title).font(.system(size: 15)).foregroundStyle(Theme.textTertiary)
                        HStack(spacing: 6) {
                            Image(systemName: "star.fill").foregroundStyle(Theme.honeyGold)
                            Text("共得 \(model.earnedStars) 颗小星").font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.goldBrown)
                        }
                    }
                    .padding(Theme.S.s5).frame(maxWidth: .infinity).warmCard(fill: Theme.goldPaper.opacity(0.5))

                    LazyVGrid(columns: cols, spacing: 10) {
                        ForEach(unit.charIds, id: \.self) { id in
                            let c = Unit01.char(id)
                            VStack(spacing: 2) {
                                Text(c.char).font(.hanzi(24)).foregroundStyle(Theme.textPrimary)
                                Text(c.pinyin).font(.pinyin(10)).foregroundStyle(c.color.deep)
                            }
                            .frame(maxWidth: .infinity).padding(.vertical, 8)
                            .background(RoundedRectangle(cornerRadius: Theme.R.sm).fill(c.color.soft))
                        }
                    }

                    // 母题 C：孩子学习流终点只给孩子向的鼓励，不摆洪恩对比 / ¥199 营销。
                    // 付费方案搬到家长门后的「付费方案」入口（P09 含完整反差化），不打扰孩子。
                    Text("你真棒！\(unit.title) 都学完啦 🌟")
                        .font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.goldBrown)
                        .multilineTextAlignment(.center)
                        .padding(Theme.S.s4).frame(maxWidth: .infinity).warmCard(fill: Theme.goldPaper.opacity(0.5))
                }
                .padding(Theme.S.s4)
            }
        }
        .safeAreaInset(edge: .bottom) {
            DockedCTA(title: "回学习地图", icon: "house.fill",
                      secondaryTitle: "小星宝库", onSecondary: { model.go(.treasury) }) {
                model.go(.map)
            }
        }
        .background(Theme.paperCream.ignoresSafeArea())
    }
}
