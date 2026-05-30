import SwiftUI

// P05 · 动手指认 / 看图认字（主路径第 2 步）· 2026-05-29 教学法重审
// 改造点（偏离 #10）：
//   1. 题干「不印答案字」——改语音出题：进页自动念，点喇叭重听；只问「哪个是它」不写出字。
//   2. 候选「配真实图为主」——每张卡大图 + 字，做图字绑定再认。
//   3. 干扰项「不再全用形近字」——见 EtymologyAssets.buildOptions 新策略。
// 零挫败：错答 3s 教学回放；错 4 次放过。星级 0 错 3★ / 1-2 错 2★ / ≥3 错 1★（永远 ≥1）。
// 星级存入模型（markIdentified），写字步终结为 starsByChar。完成 → 跟读 P05a。
struct P05ImageCardView: View {
    @EnvironmentObject var model: AppModel
    let charId: String
    private var char: StarChar { Unit01.char(charId) }
    private var options: [String] { EtymologyAssets.buildOptions(charId) }

    @State private var solved = false
    @State private var wrongs = 0
    @State private var wrongId: String? = nil
    @State private var hint = "听一听，点出它"
    @State private var showReplay = false

    private let cols = Array(repeating: GridItem(.flexible(), spacing: 14), count: 2)

    var body: some View {
        VStack(spacing: 0) {
            StageTopBar(title: "认一认", step: 2, char: char) { model.go(.recognize(charId)) }
            ScrollView {
                VStack(spacing: Theme.S.s5) {
                    // 语音出题：大喇叭 + 提示，不写出答案字
                    Button { AudioService.shared.play(id: charId, kind: .char) } label: {
                        HStack(spacing: Theme.S.s3) {
                            Image(systemName: "speaker.wave.3.fill").font(.system(size: 30))
                                .foregroundStyle(Theme.honeyGold)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("听一听").font(.system(size: 14)).foregroundStyle(Theme.textTertiary)
                                Text(hint).font(.system(size: 18, weight: .bold))
                                    .foregroundStyle(solved ? Theme.successDeep : Theme.textPrimary)
                            }
                            Spacer()
                            Text("点我重听").font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Theme.goldBrown)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(Capsule().fill(Theme.goldPaper))
                        }
                        .padding(Theme.S.s4)
                        .frame(maxWidth: .infinity)
                        .warmCard(fill: char.color.soft)
                    }
                    .buttonStyle(.plain)

                    LazyVGrid(columns: cols, spacing: 14) {
                        ForEach(options, id: \.self) { id in optionCard(id) }
                    }
                }
                .padding(Theme.S.s4)
                .padding(.bottom, 96)
            }
        }
        .overlay(alignment: .bottom) {
            DockedCTA(title: ctaTitle, enabled: solved) { proceed() }
        }
        .overlay { if showReplay { replayCard } }
        .background(Theme.paperCream.ignoresSafeArea())
        .animation(Theme.easePop, value: solved)
        .animation(Theme.easeWarm, value: wrongId)
        .onAppear { AudioService.shared.play(id: charId, kind: .char) }   // A6 语音主通道：进页自动念
    }

    // 候选卡：大图为主 + 字
    private func optionCard(_ id: String) -> some View {
        let c = Unit01.char(id)
        let isCorrect = solved && id == charId
        let isWrong = wrongId == id
        return Button { tap(id) } label: {
            VStack(spacing: 8) {
                SceneAssetImage(id: id, maxSide: 88)
                Text(c.char).font(.hanzi(28)).foregroundStyle(Theme.textPrimary)
            }
            .frame(maxWidth: .infinity).frame(height: 150).padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: Theme.R.md)
                .fill(isCorrect ? Theme.successSoft : isWrong ? Theme.petalSoft : Theme.cardWarm))
            .overlay(RoundedRectangle(cornerRadius: Theme.R.md)
                .stroke(isCorrect ? Theme.successDeep : isWrong ? Theme.petalDeep : Theme.lineSoft,
                        lineWidth: isCorrect || isWrong ? 2 : 1))
        }
        .disabled(solved)
    }

    private var replayCard: some View {
        ZStack {
            Color.black.opacity(0.2).ignoresSafeArea()
            VStack(spacing: 10) {
                SceneAssetImage(id: charId, maxSide: 120)
                Text(char.char).font(.hanzi(56)).foregroundStyle(Theme.textPrimary)
                Text("再听一次老师，3 秒后继续").font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
            }
            .padding(32).background(RoundedRectangle(cornerRadius: Theme.R.lg).fill(Theme.cardWarm))
            .shadow(color: Theme.textPrimary.opacity(0.15), radius: 20)
        }
        .transition(.opacity)
    }

    private var ctaTitle: String { solved ? "去跟读 →" : "点出它才能继续" }

    private func tap(_ id: String) {
        guard !solved else { return }
        if id == charId {
            solved = true
            hint = "对啦！就是它"
            AudioService.shared.play(id: charId, kind: .char)
        } else {
            wrongId = id
            wrongs += 1
            hint = wrongs >= 3 ? "再听一次老师怎么读" : "再听一次，看看哪个是它"
            AudioService.shared.play(id: charId, kind: .char)
            showReplay = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                showReplay = false
                wrongId = nil
                if wrongs >= 4 {          // 零挫败：放过
                    solved = true
                    hint = "老师让你过 →"
                }
            }
        }
    }

    private func proceed() {
        let stars = wrongs == 0 ? 3 : (wrongs <= 2 ? 2 : 1)
        model.markIdentified(charId, stars: stars)
        model.go(model.routeAfterImageCard(charId))
    }
}
