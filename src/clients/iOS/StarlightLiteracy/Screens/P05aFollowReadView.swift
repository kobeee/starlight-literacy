import SwiftUI

// P05a 跟读纠音 · 护城河 #2
// 红线 §7.6：每字必须录音对比，不能只放音。听老师 → 录自己 → 双波形对比 + 启发式三档反馈。
// 未录音前「去认字」CTA 禁用 —— 不可绕过。零挫败：解码失败也算已录，永远给鼓励。
struct P05aFollowReadView: View {
    @EnvironmentObject var model: AppModel
    let charId: String
    @StateObject private var rec = FollowRecorder()
    @State private var ring: CGFloat = 1   // 录音倒计时环进度（1→0 随 maxRecordDuration 走完）

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
                                    .multilineTextAlignment(.leading)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .padding(.horizontal, 16).padding(.vertical, 10)
                            .background(RoundedRectangle(cornerRadius: Theme.R.md).fill(tierColor(tier).opacity(0.16)))
                            .transition(.scale.combined(with: .opacity))
                        } else {
                            Text("先听老师读，再点圆钮，自己大声说一遍")
                                .font(.system(size: 14)).foregroundStyle(Theme.textTertiary)
                        }
                    }
                    .padding(Theme.S.s4)
                    .warmCard()

                    // 操作区：大圆钮单点录音（居中）+ 下方 A/B 对听（听老师 / 听自己）
                    // 2026-06-03 止血重做：录音从「按住说话」改单点 + 倒计时环（调研：幼龄禁持续按压）；
                    // 「像不像」不再机器假判，交给耳朵——出声后引导孩子/家长用下面两个按钮对比听。
                    VStack(spacing: Theme.S.s4) {
                        recordCircle

                        HStack(spacing: Theme.S.s3) {
                            Button { rec.playTeacher(id: charId) } label: {
                                Label("听老师", systemImage: "speaker.wave.2.fill")
                            }.buttonStyle(GhostCTA())

                            Button { rec.playUser() } label: {
                                Label("听自己", systemImage: "play.circle.fill")
                            }
                            .buttonStyle(GhostCTA())
                            .disabled(!rec.hasRecorded)
                            .opacity(rec.hasRecorded ? 1 : 0.4)
                        }

                        if rec.passed {
                            Label("点上面两个，听听你和老师哪里不一样", systemImage: "ear.fill")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Theme.skyDeep)
                        }
                    }

                    if rec.permissionDenied {
                        Text("没有麦克风权限也没关系，我们用示意波形帮你过关～")
                            .font(.system(size: 13)).foregroundStyle(Theme.goldBrown)
                            .multilineTextAlignment(.center)
                    }
                    Text("你的声音只在本机和老师声音做波形对比，不上传。")
                        .font(.system(size: 12)).foregroundStyle(Theme.textTertiary)
                        .multilineTextAlignment(.center)
                }
                .padding(Theme.S.s4)
            }
        }
        .safeAreaInset(edge: .bottom) {
            DockedCTA(
                title: rec.passed ? "去写一写" : "先跟读一遍",
                enabled: rec.passed, icon: "arrow.right", pulse: true
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

    // 大圆钮单点录音 + 倒计时环（2026-06-03）：点一下开始、到 maxRecordDuration 自动停（也可再点停）。
    // 未录前外圈光晕呼吸引导（替代旧版丑手指 TapHintHand）；录音时变红 + 白色倒计时环走完。
    private var recordCircle: some View {
        let recording = rec.phase == .recording
        return Button { rec.tapRecord() } label: {
            ZStack {
                if !recording && !rec.passed {
                    PulseHalo(color: Theme.honeyGold, size: 108)
                }
                Circle()
                    .fill(recording ? Theme.petalDeep : Theme.honeyGold)
                    .frame(width: 92, height: 92)
                    .shadow(color: (recording ? Theme.petalDeep : Theme.honeyGold).opacity(0.4), radius: 10, y: 4)
                if recording {
                    Circle()
                        .trim(from: 0, to: ring)
                        .stroke(Color.white, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                        .frame(width: 92, height: 92)
                        .rotationEffect(.degrees(-90))
                }
                Image(systemName: recording ? "stop.fill" : "mic.fill")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(width: 116, height: 116)
            .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .animation(Theme.easePop, value: recording)
        .onChange(of: recording) { _, isRec in
            if isRec { ring = 1; withAnimation(.linear(duration: rec.maxRecordDuration)) { ring = 0 } }
            else { ring = 1 }
        }
    }

    // voiced 出声了 → 金星正反馈；silent 没出声 → 中性耳朵图标引导再说（不羞辱、不报错色）。
    private func tierIcon(_ t: String) -> String {
        switch t { case "voiced": "star.fill"; default: "ear.fill" }
    }
    private func tierColor(_ t: String) -> Color {
        switch t { case "voiced": Theme.honeyGold; default: Theme.skyDeep }
    }
}
