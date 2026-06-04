import SwiftUI

// P05 · 动手指认 / 看图认字（主路径第 2 步）· 2026-06-02 母题B 改造
// 病灶（孩子视角走查）：旧版题干=语音、候选=实物图+字 → 孩子靠「图义连连看」音→图匹配，
//   全程不看汉字，「字形」这一环空转（和 1 岁就会的看图能力没区别）。
// 改造（教学法 §3 step2 既有 pattern「拖字到对应图 / 音挑字」，非翻案，只是切到更强的那个 pattern）：
//   题干 = 实物图(义) + 老师念音；候选 = 纯汉字，孩子必须盯字形本身挑出来 → 这一步才真测「形」。
//   干扰项「混搭」：默认 1 形近逼看字形细节 + 其余非形近拉梯度；连错则 relax 撤形近降难度（零挫败）。
//   顶栏 revealChar:false 不挂答案字，堵送分漏洞。
// 零挫败：错答 3s 教学回放；错 4 次放过。星级 0 错 3★ / 1-2 错 2★ / ≥3 错 1★（永远 ≥1）。
// 星级存入模型（markIdentified），写字步终结为 starsByChar。完成 → 跟读 P05a。
struct P05ImageCardView: View {
    @EnvironmentObject var model: AppModel
    let charId: String
    private var char: StarChar { Unit01.char(charId) }

    @State private var options: [String] = []
    @State private var relax = 0
    @State private var solved = false
    @State private var wrongs = 0
    @State private var wrongId: String? = nil
    @State private var hint = "听一听，这是哪个字？"
    @State private var showReplay = false

    private let cols = Array(repeating: GridItem(.flexible(), spacing: 14), count: 2)

    var body: some View {
        VStack(spacing: 0) {
            StageTopBar(title: "认一认", step: 2, char: char, revealChar: false) { model.go(.recognize(charId)) }
            ScrollView {
                VStack(spacing: Theme.S.s5) {
                    // 题干：实物图（义）+ 老师念音。不写出答案字——孩子靠图+音知道「是什么」，
                    // 再去下面候选里挑「哪个字形是它」，逼出对字形的主动提取。
                    VStack(spacing: Theme.S.s3) {
                        SceneAssetImage(id: charId, maxSide: 132)
                        Button { AudioService.shared.play(id: charId, kind: .char) } label: {
                            HStack(spacing: Theme.S.s2) {
                                Image(systemName: "speaker.wave.3.fill").font(.system(size: 22))
                                    .foregroundStyle(Theme.honeyGold)
                                Text("点我再听一次").font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.goldBrown)
                            }
                            .padding(.horizontal, 16).padding(.vertical, 9)
                            .background(Capsule().fill(Theme.goldPaper))
                        }
                        .buttonStyle(.plain)
                        Text(hint).font(.system(size: 16, weight: .bold))
                            .foregroundStyle(solved ? Theme.successDeep : Theme.textSecondary)
                    }
                    .padding(Theme.S.s4)
                    .frame(maxWidth: .infinity)
                    .warmCard(fill: char.color.soft)

                    // 候选：纯汉字卡（字形是唯一判断依据，不再放图）
                    LazyVGrid(columns: cols, spacing: 14) {
                        ForEach(options, id: \.self) { id in optionCard(id) }
                    }
                }
                .padding(Theme.S.s4)
            }
        }
        .safeAreaInset(edge: .bottom) {
            DockedCTA(title: ctaTitle, enabled: solved, icon: "arrow.right", pulse: true) { proceed() }
        }
        .overlay { if showReplay { replayCard } }
        .background(Theme.paperCream.ignoresSafeArea())
        .animation(Theme.easePop, value: solved)
        .animation(Theme.easeWarm, value: wrongId)
        .onAppear {
            if options.isEmpty { options = EtymologyAssets.buildOptions(charId, relax: relax) }
            AudioService.shared.play(id: charId, kind: .char)   // A6 语音主通道：进页自动念
        }
    }

    // 候选卡：纯汉字（孩子盯字形挑）
    private func optionCard(_ id: String) -> some View {
        let c = Unit01.char(id)
        let isCorrect = solved && id == charId
        let isWrong = wrongId == id
        return Button { tap(id) } label: {
            Text(c.char).font(.hanzi(64)).foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity).frame(height: 132)
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
                Text("这个就是它，再认一次").font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
            }
            .padding(32).background(RoundedRectangle(cornerRadius: Theme.R.lg).fill(Theme.cardWarm))
            .shadow(color: Theme.textPrimary.opacity(0.15), radius: 20)
        }
        .transition(.opacity)
    }

    private var ctaTitle: String { solved ? "去跟读" : "点出它才能继续" }

    private func tap(_ id: String) {
        guard !solved else { return }
        if id == charId {
            solved = true
            hint = "对啦！就是它"
            AudioService.shared.play(id: charId, kind: .char)
        } else {
            wrongId = id
            wrongs += 1
            hint = wrongs >= 3 ? "再看看老师给的图，哪个字是它" : "再听一次，看看哪个字是它"
            AudioService.shared.play(id: charId, kind: .char)
            showReplay = true
            // 零挫败降级：连错就撤掉形近干扰，候选更好分辨（教学回放结束后换上）
            if wrongs >= 2 { relax = wrongs - 1 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                showReplay = false
                wrongId = nil
                if wrongs >= 4 {          // 零挫败：放过
                    solved = true
                    hint = "老师让你过 →"
                } else if relax > 0 {
                    options = EtymologyAssets.buildOptions(charId, relax: relax)
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
