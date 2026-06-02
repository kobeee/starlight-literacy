import SwiftUI

// 字源彩蛋 · 2026-05-29 教学法重审：从「每字必经的字源讲解页」降级为「仅象形字的收尾彩蛋」。
// 触发：只有真象形/可画物字在认读之后追加。
// 形态：实物 → 甲骨 → 今字 形变 + 微动效 + 一句话旁白；不做 mp4、不堆散文。
// 一身二用：给孩子加记忆锚点；给家长看「真象形不瞎编」（护城河，家长中心可回看）。
struct P03EtymologyView: View {
    @EnvironmentObject var model: AppModel
    let charId: String
    private var char: StarChar { Unit01.char(charId) }
    private var story: EtymologyAssets.Story { EtymologyAssets.story(charId) }

    @State private var stage = 0   // 0 实物 / 1 甲骨 / 2 今字（逐级点亮）

    var body: some View {
        VStack(spacing: 0) {
            StageTopBar(title: "原来它是这样来的", step: 1, char: char) { model.go(.recognize(charId)) }

            ScrollView {
                VStack(spacing: Theme.S.s6) {
                    // 形变三联：实物 → 甲骨 → 今字
                    HStack(alignment: .center, spacing: Theme.S.s2) {
                        morphCell(imageName: SceneAsset.imageName(charId), label: "真实的它", color: char.color.deep, active: stage >= 0)
                        arrow(active: stage >= 1)
                        morphCell(imageName: SceneAsset.oracleName(charId), glyph: char.char, label: char.etymology.source.rawValue, color: Theme.goldBrown, active: stage >= 1, template: true)
                        arrow(active: stage >= 2)
                        morphCell(glyph: char.char, label: "今天的字", color: Theme.textPrimary, active: stage >= 2)
                    }
                    .padding(Theme.S.s4)
                    .frame(maxWidth: .infinity)
                    .warmCard(fill: char.color.soft)

                    // 一句话旁白（少量文字；家长可读，孩子有老师念）
                    VStack(spacing: Theme.S.s2) {
                        Text(story.shape.isEmpty ? char.etymology.glyphHook : story.shape)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Theme.textPrimary)
                            .multilineTextAlignment(.center)
                        Button { AudioService.shared.play(id: charId, kind: .char) } label: {
                            Label("再听一遍", systemImage: "speaker.wave.2.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.goldBrown)
                        }
                    }
                    .padding(Theme.S.s4)
                    .frame(maxWidth: .infinity)

                }
                .padding(Theme.S.s4)
            }
        }
        .safeAreaInset(edge: .bottom) {
            DockedCTA(title: "去认一认 →") {
                model.go(model.routeAfterEtymology(charId))
            }
        }
        .background(Theme.paperCream.ignoresSafeArea())
        .onAppear { runMorph() }
    }

    private func morphCell(imageName: String? = nil, glyph: String? = nil,
                           label: String, color: Color, active: Bool, template: Bool = false) -> some View {
        VStack(spacing: 8) {
            ZStack {
                RoundedRectangle(cornerRadius: Theme.R.md)
                    .fill(Color.white.opacity(active ? 0.9 : 0.4))
                if let imageName {
                    Image(imageName)
                        .renderingMode(template ? .template : .original)
                        .resizable()
                        .scaledToFit()
                        .foregroundStyle(color)
                        .padding(template ? 12 : 4)
                }
                else if let glyph {
                    Text(glyph).font(.hanzi(40)).foregroundStyle(color)
                }
            }
            .frame(width: 78, height: 78)
            .overlay(RoundedRectangle(cornerRadius: Theme.R.md).stroke(color.opacity(0.3), lineWidth: 1))
            Text(label).font(.system(size: 11, weight: .semibold)).foregroundStyle(color)
        }
        .opacity(active ? 1 : 0.3)
        .scaleEffect(active ? 1 : 0.85)
    }

    private func arrow(active: Bool) -> some View {
        Image(systemName: "arrow.right")
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(active ? Theme.goldDeep : Theme.lineSoft)
    }

    private func runMorph() {
        stage = 0
        for s in 1...2 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.55 * Double(s)) {
                withAnimation(Theme.easePop) { stage = s }
            }
        }
    }
}
