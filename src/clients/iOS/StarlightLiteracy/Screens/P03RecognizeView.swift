import SwiftUI

// P03 · 认读绑定（主路径第 1 步）· 2026-05-29 教学法重审
// 第一性：幼儿音义已有、缺的只是「形」。把新符号挂到已有音义上 = 满屏实物图 + 大字浮现 + 自动念音。
// 铁律：图+音为主、文字几乎清零；进页自动播老师音（主通道不是装饰）；点一点重播。
struct P03RecognizeView: View {
    @EnvironmentObject var model: AppModel
    let charId: String
    private var char: StarChar { Unit01.char(charId) }
    @State private var pulse = false
    @State private var revealToken = 0       // 每次念音 +1，驱动字形逐笔点亮
    @State private var lastDuration = 0.8    // 念音时长，逐笔节奏对齐它

    var body: some View {
        VStack(spacing: 0) {
            StageTopBar(title: "看一看 听一听", step: 1, char: char) { model.go(.unit) }

            // 认读场景卡：放进 ScrollView（与其余页一致，safeAreaInset 才会正确给 CTA 预留空间，
            // 不会像 maxHeight:.infinity 那样铺到 CTA 后面）。containerRelativeFrame 让卡片在可视区
            // 垂直居中保持 hero 感；喇叭挂卡片真实底边、永远不被 CTA 切。
            ScrollView {
                Button { replay() } label: {
                    VStack(spacing: Theme.S.s5) {
                        SceneAssetImage(id: charId, maxSide: 260)
                            .scaleEffect(pulse ? 1.04 : 1)

                        // 音→形绑定：念音一响，字形随音逐笔点亮（不再是静态大字）
                        StrokeRevealGlyph(charId: charId, hanzi: char.char,
                                          color: char.color, size: 168,
                                          playToken: revealToken, revealDuration: lastDuration)

                        Text(char.pinyin)
                            .font(.pinyin(34))
                            .foregroundStyle(char.color.deep)
                    }
                    .padding(Theme.S.s6)
                    .frame(maxWidth: .infinity)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.R.lg, style: .continuous)
                            .fill(LinearGradient(colors: [char.color.soft, Theme.cardWarm],
                                                 startPoint: .top, endPoint: .bottom))
                    )
                    // 自动播 + 可点重播的喇叭提示（右上角脉冲）：挂卡片右上角，永不与底部 CTA 抢位
                    .overlay(alignment: .topTrailing) {
                        Image(systemName: "speaker.wave.3.fill")
                            .font(.system(size: 26))
                            .foregroundStyle(Theme.honeyGold)
                            .padding(16)
                            .background(Circle().fill(Color.white.opacity(0.85)))
                            .scaleEffect(pulse ? 1.12 : 1)
                            .shadow(color: Theme.honeyGold.opacity(0.4), radius: pulse ? 14 : 6)
                            .padding(Theme.S.s5)
                    }
                }
                .buttonStyle(.plain)
                .padding(Theme.S.s4)
            }
        }
        .safeAreaInset(edge: .bottom) {
            DockedCTA(title: "认识它啦", icon: "arrow.right", pulse: true) {
                model.markRecognized(charId)
                model.go(model.routeAfterRecognize(charId))
            }
        }
        .background(Theme.paperCream.ignoresSafeArea())
        .onAppear {
            replay()
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) { pulse = true }
        }
    }

    // 念音 + 触发逐笔点亮同帧发生 = 音形同步
    private func replay() {
        if let d = AudioService.shared.play(id: charId, kind: .char), d > 0 { lastDuration = d }
        revealToken += 1
    }
}

// 认读 / 看图认字共用的「实物场景图」。
// 指事字（一二三上下小）只作为生活承载图，不进入字源彩蛋（方案 §4.2）。
enum SceneAsset {
    static func imageName(_ id: String) -> String { "scene_\(slug(id))" }
    static func oracleName(_ id: String) -> String? {
        EtymologyAssets.hasEtymologyEgg(id) ? "oracle_\(slug(id))" : nil
    }
    static func slug(_ id: String) -> String { id.replacingOccurrences(of: "-", with: "_") }
}

struct SceneAssetImage: View {
    let id: String
    let maxSide: CGFloat

    var body: some View {
        Image(SceneAsset.imageName(id))
            .resizable()
            .scaledToFit()
            .frame(maxWidth: maxSide, maxHeight: maxSide)
            .accessibilityHidden(true)
    }
}
