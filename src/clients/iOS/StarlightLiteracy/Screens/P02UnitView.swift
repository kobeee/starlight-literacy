import SwiftUI

// P02 · 单元详情
// 单元 hero + 4 组进度 + 字 grid + 「开始」CTA → 第一字 P03
struct P02UnitView: View {
    @EnvironmentObject var model: AppModel
    private var unit: Unit { model.unit }
    private var firstChar: StarChar { Unit01.char(unit.charIds[0]) }

    var body: some View {
        VStack(spacing: 0) {
            PageTopBar(title: unit.title, subtitle: unit.subtitle) { model.go(.map) }
            ScrollView {
                VStack(spacing: Theme.S.s5) {
                    // hero
                    HStack(spacing: Theme.S.s4) {
                        Text(firstChar.char).font(.hanzi(64)).foregroundStyle(Theme.textPrimary)
                            .frame(width: 96, height: 96)
                            .background(Circle().fill(firstChar.color.soft))
                        VStack(alignment: .leading, spacing: 4) {
                            Text(firstChar.pinyin).font(.pinyin(18)).foregroundStyle(firstChar.color.deep)
                            Text(firstChar.phrase).font(.system(size: 16, weight: .medium)).foregroundStyle(Theme.textSecondary)
                            Text("每个字：先看图认读 → 认一认 → 跟读 → 写一写")
                                .font(.system(size: 12)).foregroundStyle(Theme.textTertiary)
                        }
                        Spacer()
                    }
                    .padding(Theme.S.s4).warmCard()

                    // 分组
                    VStack(alignment: .leading, spacing: Theme.S.s3) {
                        Text("本单元 \(unit.charIds.count) 字 · 分 \(unit.groups.count) 组")
                            .font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.textPrimary)
                        ForEach(Array(unit.groups.enumerated()), id: \.offset) { i, ids in
                            HStack(spacing: Theme.S.s3) {
                                Text("\(i + 1)").font(.system(size: 15, weight: .bold))
                                    .foregroundStyle(.white).frame(width: 28, height: 28)
                                    .background(Circle().fill(Theme.honeyGold))
                                Text(ids.map { Unit01.char($0).char }.joined(separator: " "))
                                    .font(.hanzi(20)).foregroundStyle(Theme.textPrimary)
                                Spacer()
                                Text("\(ids.count) 字").font(.system(size: 12)).foregroundStyle(Theme.textTertiary)
                            }
                            .padding(.vertical, 8).padding(.horizontal, 12)
                            .background(RoundedRectangle(cornerRadius: Theme.R.sm).fill(Theme.cardWarm))
                        }
                    }
                    .padding(Theme.S.s4).warmCard()

                    Text("已解锁 · 完全免费").font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.successDeep)
                }
                .padding(Theme.S.s4)
                .padding(.bottom, 96)
            }
        }
        .overlay(alignment: .bottom) {
            DockedCTA(title: "开始第一字「\(firstChar.char)」 →") { model.startUnit() }
        }
        .background(Theme.paperCream.ignoresSafeArea())
    }
}
