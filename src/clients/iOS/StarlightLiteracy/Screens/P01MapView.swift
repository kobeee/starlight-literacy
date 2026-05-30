import SwiftUI

// P01 · 学习地图首页 · 2026-05-29 教学法重审（偏离 #12）
// 界面铁律：给不识字的孩子，孩子侧图+音为主、文字几乎清零。
//   · 去字墙：不再一次摊 20 字网格（孩子读不了、也吓人）。
//   · 文案下沉：洪恩反差数据、"真象形真会意不直映"黑话、价格规模 → 全部下沉家长中心 / 付费页。
//   · 旅程感：当前字放大 + 已点亮进度，一个大「继续学」CTA，回学习地图本意。
struct P01MapView: View {
    @EnvironmentObject var model: AppModel

    private var current: StarChar { Unit01.char(model.currentCharId) }
    private var done: Int { model.passedIDs.count }
    private var total: Int { model.unit.charIds.count }
    private var started: Bool { done > 0 }

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.S.s5) {
                hero
                journeyCard
            }
            .padding(.horizontal, Theme.S.s4)
            .padding(.bottom, 90)
        }
        .overlay(alignment: .bottom) { bottomNav }
        .background(Theme.paperCream.ignoresSafeArea())
    }

    // 暖阳小院 hero（纯 SwiftUI 画，不依赖图片资产）
    private var hero: some View {
        ZStack {
            RoundedRectangle(cornerRadius: Theme.R.lg, style: .continuous)
                .fill(LinearGradient(colors: [Theme.skySoft, Theme.cardSoft],
                                     startPoint: .top, endPoint: .bottom))
            Circle().fill(Theme.honeyGold).frame(width: 56, height: 56)
                .offset(x: 110, y: -46)
                .shadow(color: Theme.honeyGold.opacity(0.5), radius: 18)
            HillShape().fill(Theme.grassDeep.opacity(0.55)).frame(height: 90)
                .frame(maxHeight: .infinity, alignment: .bottom)
            HillShape().fill(Theme.grassDeep).frame(height: 64)
                .frame(maxHeight: .infinity, alignment: .bottom)
                .offset(x: 40)
            VStack(spacing: 6) {
                Text("星光识字").font(.system(size: 34, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.textPrimary)
                Text(model.unit.title).font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Theme.textSecondary)
            }
            .offset(y: -14)
        }
        .frame(height: 200)
        .clipShape(RoundedRectangle(cornerRadius: Theme.R.lg, style: .continuous))
    }

    // 旅程卡：当前字放大 + 进度小星点 + 大 CTA（不摊字墙）
    private var journeyCard: some View {
        VStack(spacing: Theme.S.s4) {
            CharMedallion(char: current, diameter: 120)
                .overlay(alignment: .bottomTrailing) {
                    SceneAssetImage(id: model.currentCharId, maxSide: 42)
                        .offset(x: 6, y: 6)
                }

            VStack(spacing: 4) {
                Text(started ? "继续学" : "开始第一课")
                    .font(.system(size: 22, weight: .bold)).foregroundStyle(Theme.textPrimary)
                Text(current.pinyin).font(.pinyin(18)).foregroundStyle(current.color.deep)
            }

            // 进度：已点亮小星点（旅程感，非字表）
            progressDots

            Button { model.startUnit() } label: {
                Text(started ? "继续学「\(current.char)」" : "点亮第一颗星")
            }
            .buttonStyle(GoldCTA())
        }
        .padding(Theme.S.s5)
        .frame(maxWidth: .infinity)
        .warmCard()
    }

    private var progressDots: some View {
        HStack(spacing: 6) {
            ForEach(model.unit.charIds, id: \.self) { id in
                Circle()
                    .fill(model.passedIDs.contains(id) ? Theme.honeyGold
                          : id == model.currentCharId ? current.color.deep : Theme.lineSoft)
                    .frame(width: id == model.currentCharId ? 12 : 8,
                           height: id == model.currentCharId ? 12 : 8)
            }
        }
        .padding(.top, 2)
        .overlay(alignment: .bottom) {
            Text("已点亮 \(done) / \(total)")
                .font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.textTertiary)
                .offset(y: 22)
        }
        .padding(.bottom, 20)
    }

    private var bottomNav: some View {
        HStack(spacing: 0) {
            navItem("付费方案", "yensign.circle.fill") { model.go(.purchase) }
            navItem("小星宝库", "star.circle.fill") { model.go(.treasury) }
            navItem("家长中心", "person.crop.circle.fill") { model.go(.parentCenter) }
        }
        .padding(.top, 8).padding(.bottom, 6)
        .background(Theme.paperCream.opacity(0.98).overlay(Divider().overlay(Theme.lineSoft), alignment: .top))
    }

    private func navItem(_ title: String, _ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Image(systemName: icon).font(.system(size: 20))
                Text(title).font(.system(size: 11, weight: .medium))
            }
            .foregroundStyle(Theme.textSecondary)
            .frame(maxWidth: .infinity)
        }
    }
}

// 简单山丘曲线
struct HillShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 0, y: rect.maxY))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.maxY),
                       control: CGPoint(x: rect.midX, y: rect.minY))
        p.closeSubpath()
        return p
    }
}
