import SwiftUI

// P03 · 认读绑定（主路径第 1 步）· 2026-05-29 教学法重审
// 第一性：幼儿音义已有、缺的只是「形」。把新符号挂到已有音义上 = 满屏实物图 + 大字浮现 + 自动念音。
// 铁律：图+音为主、文字几乎清零；进页自动播老师音（主通道不是装饰）；点一点重播。
struct P03RecognizeView: View {
    @EnvironmentObject var model: AppModel
    let charId: String
    private var char: StarChar { Unit01.char(charId) }
    @State private var pulse = false

    var body: some View {
        VStack(spacing: 0) {
            StageTopBar(title: "看一看 听一听", step: 1, char: char) { model.go(.unit) }

            // 满屏认读场景：实物图 + 大字浮现叠加 + 拼音
            Button { replay() } label: {
                ZStack {
                    RoundedRectangle(cornerRadius: Theme.R.lg, style: .continuous)
                        .fill(LinearGradient(colors: [char.color.soft, Theme.cardWarm],
                                             startPoint: .top, endPoint: .bottom))

                    VStack(spacing: Theme.S.s5) {
                        SceneAssetImage(id: charId, maxSide: 260)
                            .scaleEffect(pulse ? 1.04 : 1)

                        // 大字浮现在图上
                        Text(char.char)
                            .font(.hanzi(120))
                            .foregroundStyle(Theme.textPrimary)
                            .shadow(color: char.color.deep.opacity(0.25), radius: 8, y: 3)

                        Text(char.pinyin)
                            .font(.pinyin(34))
                            .foregroundStyle(char.color.deep)
                    }
                    .padding(Theme.S.s6)

                    // 自动播 + 可点重播的喇叭提示（右下角脉冲）
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Image(systemName: "speaker.wave.3.fill")
                                .font(.system(size: 26))
                                .foregroundStyle(Theme.honeyGold)
                                .padding(16)
                                .background(Circle().fill(Color.white.opacity(0.85)))
                                .scaleEffect(pulse ? 1.12 : 1)
                                .shadow(color: Theme.honeyGold.opacity(0.4), radius: pulse ? 14 : 6)
                        }
                    }
                    .padding(Theme.S.s5)
                }
            }
            .buttonStyle(.plain)
            .padding(Theme.S.s4)
        }
        .overlay(alignment: .bottom) {
            DockedCTA(title: "认识它啦 →") {
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

    private func replay() { AudioService.shared.play(id: charId, kind: .char) }
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
