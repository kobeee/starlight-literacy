import SwiftUI

// P12 · 间隔复习关（第四刀 · 复现的「时间维度」面）
// 教学法五步法第 5 步「复现」缺的那一面：按艾宾浩斯遗忘曲线，隔天/隔几天把学过的字再认一遍。
// （P06 小组练习已覆盖「本课结尾即时再认」；这里补「过几天还认得吗」。）
//
// 交互复用看图认字（P05）模式：给图(义)+老师念音 → 孩子从纯汉字候选里认出字形。
//   认得 → recordReview 推进遗忘曲线档位；零挫败：认不出温柔回放、错多了放过，永远给星。
// 入口：P01「今日复习 N 字」卡（dueReviewIDs 非空时出现）。复习是孩子学习内容，不过家长门。
struct P12ReviewView: View {
    @EnvironmentObject var model: AppModel

    @State private var queue: [String] = []      // 进页快照（recordReview 会改 dueReviewIDs，不能实时读）
    @State private var idx = 0
    @State private var remembered = 0             // 自己认出来的字数（放过的不算，但仍给星）
    @State private var options: [String] = []
    @State private var relax = 0
    @State private var solved = false
    @State private var wrongs = 0
    @State private var wrongId: String? = nil
    @State private var hint = "这个字，还认得吗？"
    @State private var showReplay = false

    private var finished: Bool { idx >= queue.count }
    private var charId: String { queue[min(idx, max(queue.count - 1, 0))] }
    private var char: StarChar { Unit01.char(charId) }
    private let cols = Array(repeating: GridItem(.flexible(), spacing: 14), count: 2)

    var body: some View {
        VStack(spacing: 0) {
            PageTopBar(title: "今日复习",
                       subtitle: finished ? "都认完啦" : "第 \(idx + 1) / \(queue.count) 个") { model.go(.map) }
            if finished { doneBody } else { reviewBody }
        }
        .background(Theme.paperCream.ignoresSafeArea())
        .animation(Theme.easePop, value: solved)
        .animation(Theme.easeWarm, value: wrongId)
        .animation(Theme.easeWarm, value: idx)
        .onAppear {
            if queue.isEmpty {
                queue = model.dueReviewIDs()
                if !queue.isEmpty { loadCurrent() }
            }
        }
    }

    // ── 复习中：逐字再认 ──────────────────────────────────
    @ViewBuilder private var reviewBody: some View {
        ScrollView {
            VStack(spacing: Theme.S.s5) {
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
                .padding(Theme.S.s4).frame(maxWidth: .infinity).warmCard(fill: char.color.soft)

                LazyVGrid(columns: cols, spacing: 14) {
                    ForEach(options, id: \.self) { id in optionCard(id) }
                }
            }
            .padding(Theme.S.s4)
        }
        .safeAreaInset(edge: .bottom) {
            DockedCTA(title: solved ? (idx + 1 >= queue.count ? "复习完啦 ★" : "下一个") : "认出它才能继续",
                      enabled: solved, icon: "arrow.right", pulse: true) { advance() }
        }
        .overlay { if showReplay { replayCard } }
    }

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
                Text("这个就是它，再记一次").font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
            }
            .padding(32).background(RoundedRectangle(cornerRadius: Theme.R.lg).fill(Theme.cardWarm))
            .shadow(color: Theme.textPrimary.opacity(0.15), radius: 20)
        }
        .transition(.opacity)
    }

    // ── 全部复习完：留存证据 + 庆祝 ─────────────────────────
    private var doneBody: some View {
        VStack(spacing: Theme.S.s5) {
            Spacer()
            Image(systemName: "checkmark.seal.fill").font(.system(size: 56)).foregroundStyle(Theme.honeyGold)
            Text("还记得！").font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.textPrimary)
            Text("隔了几天，你认出了 \(remembered) / \(queue.count) 个字")
                .font(.system(size: 16, weight: .semibold)).foregroundStyle(Theme.goldBrown)
                .multilineTextAlignment(.center)
            HStack(spacing: 8) {
                ForEach(0..<min(queue.count, 8), id: \.self) { _ in
                    Image(systemName: "star.fill").font(.system(size: 22)).foregroundStyle(Theme.honeyGold)
                }
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(Theme.S.s4)
        .safeAreaInset(edge: .bottom) {
            DockedCTA(title: "回学习地图", icon: "house.fill", pulse: true) { model.go(.map) }
        }
    }

    // ── 逻辑 ──────────────────────────────────────────────
    private func loadCurrent() {
        options = EtymologyAssets.buildOptions(charId, relax: relax)
        AudioService.shared.play(id: charId, kind: .char)
    }

    private func tap(_ id: String) {
        guard !solved else { return }
        if id == charId {
            solved = true
            if wrongs == 0 { remembered += 1 }   // 一次认出才算「还记得」
            hint = "对！还记得它"
            model.recordReview(charId)            // 推进遗忘曲线档位
            AudioService.shared.play(id: charId, kind: .char)
        } else {
            wrongId = id; wrongs += 1
            hint = wrongs >= 3 ? "再看看图，哪个字是它" : "再听一次，看看哪个字是它"
            AudioService.shared.play(id: charId, kind: .char)
            showReplay = true
            if wrongs >= 2 { relax = wrongs - 1 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                showReplay = false; wrongId = nil
                if wrongs >= 4 {                  // 零挫败：放过（仍推进档位，不卡复习）
                    solved = true
                    hint = "没关系，再记一次就好 →"
                    model.recordReview(charId)
                } else if relax > 0 {
                    options = EtymologyAssets.buildOptions(charId, relax: relax)
                }
            }
        }
    }

    private func advance() {
        idx += 1
        guard idx < queue.count else { return }   // 进入 finished/doneBody
        solved = false; wrongs = 0; relax = 0; wrongId = nil
        hint = "这个字，还认得吗？"
        loadCurrent()
    }
}
