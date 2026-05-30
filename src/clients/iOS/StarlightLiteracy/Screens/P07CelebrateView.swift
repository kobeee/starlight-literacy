import SwiftUI

// P07 · 庆祝页 · 红线零挫败：永远给星
// 粒子径向扩散 + 五星 staggered pop + 字数 count-up
struct P07CelebrateView: View {
    @EnvironmentObject var model: AppModel
    @State private var starShown = 0
    @State private var count = 0
    @State private var burst = false

    private var total: Int { model.unit.charIds.count }

    var body: some View {
        // B3 修复：原来用上下两个对称 Spacer + 底部 s8 padding，庆祝块上下大片空白、垂直失衡。
        // 改为庆祝块整体居中（单一居中容器），CTA 锚定底部安全区，视觉平衡。
        VStack(spacing: Theme.S.s6) {
            ZStack {
                sparkles
                VStack(spacing: 6) {
                    Text("真棒！").font(.system(size: 40, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.textPrimary)
                    Text("\(model.unit.title) · 全部完成")
                        .font(.system(size: 16, weight: .medium)).foregroundStyle(Theme.textSecondary)
                }
            }

            HStack(spacing: 8) {
                ForEach(0..<5, id: \.self) { i in
                    Image(systemName: "star.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(i < starShown ? Theme.honeyGold : Theme.lineSoft)
                        .scaleEffect(i < starShown ? 1 : 0.5)
                }
            }

            Text("认识了 \(count) 个新字")
                .font(.system(size: 18, weight: .semibold)).foregroundStyle(Theme.goldBrown)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)   // 居中
        .overlay(alignment: .bottom) {
            Button { model.go(.result) } label: { Text("看看学习成果 →") }
                .buttonStyle(GoldCTA())
                .padding(.horizontal, Theme.S.s4)
                .padding(.bottom, Theme.S.s6)
        }
        .background(Theme.paperCream.ignoresSafeArea())
        .onAppear { runAnim() }
    }

    private var sparkles: some View {
        ForEach(0..<14, id: \.self) { i in
            let angle = Double(i) / 14 * 2 * .pi
            Circle().fill(Theme.honeyGold.opacity(0.8)).frame(width: 8, height: 8)
                .offset(x: burst ? cos(angle) * 120 : 0, y: burst ? sin(angle) * 120 : 0)
                .opacity(burst ? 0 : 1)
        }
    }

    private func runAnim() {
        withAnimation(.easeOut(duration: 0.8)) { burst = true }
        for i in 1...5 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12 * Double(i)) {
                withAnimation(Theme.easePop) { starShown = i }
            }
        }
        // count-up
        let steps = max(total, 1)
        for s in 1...steps {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.76 / Double(steps) * Double(s)) {
                count = s
            }
        }
    }
}
