import SwiftUI

// P05a 跟读纠音 · 护城河 #2
// 红线 §7.6：每字必须录音对比，不能只放音。听老师 → 录自己 → 双波形对比 + 启发式三档反馈。
// 未录音前「去认字」CTA 禁用 —— 不可绕过。零挫败：解码失败也算已录，永远给鼓励。
struct P05aFollowReadView: View {
    @EnvironmentObject var model: AppModel
    let charId: String
    @StateObject private var rec = FollowRecorder()

    private var char: StarChar { Unit01.char(charId) }

    var body: some View {
        VStack(spacing: 0) {
            StageTopBar(title: "跟读一遍", step: 3, char: char) { model.go(.imageCard(charId)) }

            ScrollView {
                VStack(spacing: Theme.S.s5) {
                    // 字 + 组词
                    VStack(spacing: Theme.S.s2) {
                        Text(char.char).font(.hanzi(64)).foregroundStyle(Theme.textPrimary)
                        Text(char.pinyin).font(.pinyin(24)).foregroundStyle(char.color.deep)
                        Text(char.phrase).font(.system(size: 17, weight: .medium)).foregroundStyle(Theme.textSecondary)
                    }
                    .padding(Theme.S.s5)
                    .frame(maxWidth: .infinity)
                    .warmCard(fill: char.color.soft)

                    // 双波形对比
                    VStack(spacing: Theme.S.s3) {
                        DualWaveform(teacher: rec.teacherEnv, user: rec.userEnv)
                            .frame(height: 140)
                            .background(RoundedRectangle(cornerRadius: Theme.R.md).fill(Color.white))
                            .overlay(RoundedRectangle(cornerRadius: Theme.R.md).stroke(Theme.lineSoft, lineWidth: 1.5))

                        if let tier = rec.tier {
                            HStack(spacing: 8) {
                                Image(systemName: tierIcon(tier)).foregroundStyle(tierColor(tier))
                                Text(rec.tips.first ?? "").font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.textPrimary)
                            }
                            .padding(.horizontal, 16).padding(.vertical, 10)
                            .background(Capsule().fill(tierColor(tier).opacity(0.16)))
                            .transition(.scale.combined(with: .opacity))
                        } else {
                            Text("先听老师读，再按住录下你的声音")
                                .font(.system(size: 14)).foregroundStyle(Theme.textTertiary)
                        }
                    }
                    .padding(Theme.S.s4)
                    .warmCard()

                    // 操作区：听老师 / 录音 / 听自己
                    HStack(spacing: Theme.S.s3) {
                        Button { rec.playTeacher(id: charId) } label: {
                            Label("听老师", systemImage: "speaker.wave.2.fill")
                        }.buttonStyle(GhostCTA())

                        Button { rec.toggleRecord() } label: {
                            Label(rec.phase == .recording ? "停止" : "录我的",
                                  systemImage: rec.phase == .recording ? "stop.circle.fill" : "mic.circle.fill")
                        }
                        .buttonStyle(RecordCTA(recording: rec.phase == .recording, color: char.color))

                        Button { rec.playUser() } label: {
                            Label("听自己", systemImage: "play.circle.fill")
                        }
                        .buttonStyle(GhostCTA())
                        .disabled(!rec.hasRecorded)
                        .opacity(rec.hasRecorded ? 1 : 0.4)
                    }

                    if rec.permissionDenied {
                        Text("没有麦克风权限也没关系，点「录我的」我们用示意波形帮你过关～")
                            .font(.system(size: 13)).foregroundStyle(Theme.goldBrown)
                            .multilineTextAlignment(.center)
                    }
                    Text("你的声音只在本机和老师声音做波形对比，不上传。")
                        .font(.system(size: 12)).foregroundStyle(Theme.textTertiary)
                        .multilineTextAlignment(.center)
                }
                .padding(Theme.S.s4)
                .padding(.bottom, 96)
            }
        }
        .overlay(alignment: .bottom) {
            DockedCTA(
                title: rec.hasRecorded ? "去写一写 →" : "先跟读一遍",
                enabled: rec.hasRecorded
            ) {
                model.markFollowed(charId)
                model.go(model.routeAfterFollow(charId))
            }
        }
        .background(Theme.paperCream.ignoresSafeArea())
        .animation(Theme.easePop, value: rec.tier)
        .onAppear {
            rec.loadTeacher(id: charId)
            AudioService.shared.play(id: charId, kind: .char)   // A6 语音主通道：进页自动念
        }
    }

    private func tierIcon(_ t: String) -> String {
        switch t { case "great": "star.fill"; case "ok": "hand.thumbsup.fill"; default: "arrow.clockwise.circle.fill" }
    }
    private func tierColor(_ t: String) -> Color {
        switch t { case "great": Theme.honeyGold; case "ok": Theme.successDeep; default: Theme.skyDeep }
    }
}

// 录音主按钮：录音时脉冲红点，平时用本字主色
struct RecordCTA: ButtonStyle {
    var recording: Bool
    var color: ColorToken
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .bold, design: .rounded))
            .foregroundStyle(recording ? .white : Theme.goldBrown)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: Theme.R.pill, style: .continuous)
                    .fill(recording ? Theme.petalDeep : Theme.honeyGold)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(Theme.easePop, value: configuration.isPressed)
    }
}
