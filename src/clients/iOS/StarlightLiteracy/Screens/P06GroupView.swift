import SwiftUI

// P06 · 单元结组复习
// 老师念、孩子点：每组 5 字逐个点对 → 进度展示 → 全组完成跳 P07 庆祝
// 零挫败：点错只提示再听，不扣分、不阻断。
struct P06GroupView: View {
    @EnvironmentObject var model: AppModel
    private var unit: Unit { model.unit }

    @State private var groupIdx = 0
    @State private var seqPos = 0            // 当前组内目标序号
    @State private var hint = "老师念，你来点"
    @State private var correctId: String? = nil
    @State private var wrongId: String? = nil

    private var group: [String] { unit.groups[min(groupIdx, unit.groups.count - 1)] }
    private var targetId: String { group[min(seqPos, group.count - 1)] }
    private var groupDone: Bool { seqPos >= group.count }
    private let cols = Array(repeating: GridItem(.flexible(), spacing: 12), count: 3)

    var body: some View {
        VStack(spacing: 0) {
            PageTopBar(title: "第 \(groupIdx + 1) 组 · 复习",
                       subtitle: "\(groupIdx + 1) / \(unit.groups.count) 组") { model.go(.map) }
            ScrollView {
                VStack(spacing: Theme.S.s5) {
                    HStack {
                        Text("老师念，你来点").font(.system(size: 16, weight: .semibold)).foregroundStyle(Theme.textSecondary)
                        Spacer()
                        Button { AudioService.shared.play(id: targetId, kind: .char) } label: {
                            Label("再听", systemImage: "speaker.wave.2.fill")
                                .font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.goldBrown)
                                .padding(.horizontal, 12).padding(.vertical, 7)
                                .background(Capsule().fill(Theme.goldPaper))
                        }
                    }

                    LazyVGrid(columns: cols, spacing: 12) {
                        ForEach(group, id: \.self) { id in card(id) }
                    }

                    Text(hint).font(.system(size: 15, weight: .medium))
                        .foregroundStyle(groupDone ? Theme.successDeep : Theme.textSecondary)
                }
                .padding(Theme.S.s4)
            }
        }
        .safeAreaInset(edge: .bottom) {
            DockedCTA(title: ctaTitle, enabled: groupDone, icon: "arrow.right", pulse: true) { advanceGroup() }
        }
        .background(Theme.paperCream.ignoresSafeArea())
        .animation(Theme.easeWarm, value: correctId)
        .animation(Theme.easeWarm, value: wrongId)
        .onAppear { speak() }
    }

    private func card(_ id: String) -> some View {
        let c = Unit01.char(id)
        let isCorrect = correctId == id
        let isWrong = wrongId == id
        return Button { tap(id) } label: {
            VStack(spacing: 2) {
                Text(c.char).font(.hanzi(32)).foregroundStyle(Theme.textPrimary)
                Text(c.pinyin).font(.pinyin(12)).foregroundStyle(c.color.deep)
            }
            .frame(maxWidth: .infinity).padding(.vertical, 16)
            .background(RoundedRectangle(cornerRadius: Theme.R.md)
                .fill(isCorrect ? Theme.successSoft : isWrong ? Theme.petalSoft : c.color.soft))
            .overlay(RoundedRectangle(cornerRadius: Theme.R.md)
                .stroke(isCorrect ? Theme.successDeep : isWrong ? Theme.petalDeep : .clear, lineWidth: 2))
        }
        .disabled(groupDone)
    }

    private var ctaTitle: String {
        if !groupDone { return "点对这一组才能过" }
        return groupIdx + 1 >= unit.groups.count ? "全过啦 → 领星 ★" : "这一组过 → 下一组"
    }

    private func speak() { AudioService.shared.play(id: targetId, kind: .char) }

    private func tap(_ id: String) {
        guard !groupDone else { return }
        if id == targetId {
            correctId = id; wrongId = nil; hint = "对！"
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                correctId = nil
                seqPos += 1
                if seqPos < group.count { hint = "继续"; speak() }
                else { hint = "这一组过啦 \(group.count)/\(group.count)" }
            }
        } else {
            wrongId = id; hint = "再听一次老师，看看是哪个"
            speak()
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) { wrongId = nil }
        }
    }

    private func advanceGroup() {
        if groupIdx + 1 >= unit.groups.count { model.go(.celebrate); return }
        groupIdx += 1; seqPos = 0; hint = "老师念，你来点"
        speak()
    }
}
