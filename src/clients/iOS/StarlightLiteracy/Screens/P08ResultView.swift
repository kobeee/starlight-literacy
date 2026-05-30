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

                    VStack(spacing: 6) {
                        Text("\(unit.title) 是免费体验。继续学下去：")
                            .font(.system(size: 14)).foregroundStyle(Theme.textSecondary)
                        Text("洪恩 ¥\(CompetitorContrast.hongenPrice) 给 \(CompetitorContrast.hongenChars) 字 · 我们 ¥\(CompetitorContrast.oursPrice) 给 \(CompetitorContrast.oursChars) 字")
                            .font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.goldBrown)
                            .multilineTextAlignment(.center)
                    }
                    .padding(Theme.S.s4).frame(maxWidth: .infinity).warmCard(fill: Theme.infoSoft)
                }
                .padding(Theme.S.s4)
                .padding(.bottom, 120)
            }
        }
        .overlay(alignment: .bottom) {
            DockedCTA(title: "解锁后续单元（¥199 一期买断）",
                      secondaryTitle: "小星宝库", onSecondary: { model.go(.treasury) }) {
                model.go(.purchase)
            }
        }
        .background(Theme.paperCream.ignoresSafeArea())
    }
}
