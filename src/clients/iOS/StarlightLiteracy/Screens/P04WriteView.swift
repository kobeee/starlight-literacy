import SwiftUI

// P04 写字描红 · 护城河 #1
// 真笔顺判定（hanzi-writer-data medians）+ 双窗（演示 + 描红）+ 零挫败降级。
// 未完成 quiz 前「去跟读」CTA 禁用 —— 不可绕过。
struct P04WriteView: View {
    @EnvironmentObject var model: AppModel
    let charId: String
    @StateObject private var session: WritingSession

    init(charId: String) {
        self.charId = charId
        let c = Unit01.char(charId)
        _session = StateObject(wrappedValue: WritingSession(charId: charId, hanzi: c.char))
    }

    private var char: StarChar { Unit01.char(charId) }

    // 写字是主路径最后一步：写完 → 下一字（回认读）或本单元学完去复习
    private var writtenCTATitle: String {
        if let next = Unit01.next(after: charId) { return "下一字「\(next.char)」 →" }
        return "本单元学完，去复习 →"
    }

    var body: some View {
        let done = session.isComplete
        VStack(spacing: 0) {
            StageTopBar(title: "写一写", step: 4, char: char) { model.go(.followRead(charId)) }

            ScrollView {
                VStack(spacing: Theme.S.s5) {
                    // 演示窗 + 进度
                    HStack(alignment: .top, spacing: Theme.S.s4) {
                        VStack(spacing: 6) {
                            Text("看老师写").font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.textSecondary)
                            DemoWriterView(session: session, color: char.color)
                                .frame(width: 132, height: 132)
                        }
                        VStack(alignment: .leading, spacing: Theme.S.s2) {
                            Text(char.char).font(.hanzi(52)).foregroundStyle(Theme.textPrimary)
                            Text(char.pinyin).font(.pinyin(20)).foregroundStyle(char.color.deep)
                            Label("\(session.strokeCount) 笔", systemImage: "pencil.and.outline")
                                .font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
                            ProgressDots(total: session.strokeCount, done: session.completedStrokes.count, color: char.color)
                        }
                        Spacer()
                    }
                    .padding(Theme.S.s4)
                    .warmCard()

                    // 描红窗
                    VStack(spacing: Theme.S.s3) {
                        Text(done ? "写完啦，真棒！" : "用手指在格子里描第 \(min(session.currentStroke + 1, session.strokeCount)) 笔")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(done ? Theme.successDeep : Theme.textSecondary)
                        TraceCanvas(session: session, color: char.color)
                            .frame(width: 300, height: 300)
                        if let fb = session.lastFeedback {
                            Text(fb).font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Theme.goldBrown)
                                .padding(.horizontal, 14).padding(.vertical, 8)
                                .background(Capsule().fill(Theme.goldPaper))
                                .transition(.scale.combined(with: .opacity))
                        }
                        HStack(spacing: Theme.S.s3) {
                            Button { session.reset() } label: {
                                Label("重写", systemImage: "arrow.counterclockwise")
                            }.buttonStyle(GhostCTA())
                            Button { AudioService.shared.play(id: charId, kind: .char) } label: {
                                Label("听读音", systemImage: "speaker.wave.2.fill")
                            }.buttonStyle(GhostCTA())
                        }
                    }
                    .padding(Theme.S.s4)
                    .warmCard()
                }
                .padding(Theme.S.s4)
                .padding(.bottom, 96)
            }
        }
        .overlay(alignment: .bottom) {
            DockedCTA(
                title: done ? writtenCTATitle : "先把字描完",
                enabled: done
            ) {
                model.markWritten(charId)
                model.go(model.routeAfterWriting(charId))
            }
        }
        .background(Theme.paperCream.ignoresSafeArea())
        .animation(Theme.easePop, value: session.lastFeedback)
        .animation(Theme.easeWarm, value: session.completedStrokes.count)
    }
}

// ── 主描红画布 ────────────────────────────────────────────
private struct TraceCanvas: View {
    @ObservedObject var session: WritingSession
    let color: ColorToken
    @State private var current: [CGPoint] = []
    private let size: CGFloat = 300
    private var t: HanziTransform { HanziTransform(size: size, padding: 14) }

    var body: some View {
        ZStack {
            TianGrid(size: size)
            Canvas { ctx, _ in
                guard let data = session.data else { return }
                // 各笔轮廓
                for s in 0..<data.strokes.count {
                    let p = SVGPath.path(from: data.strokes[s], t: t)
                    if session.completedStrokes.contains(s) {
                        let c: Color = session.autoPassed.contains(s) ? color.soft : color.deep
                        ctx.fill(p, with: .color(c))
                    } else {
                        ctx.fill(p, with: .color(Theme.lineSoft.opacity(0.85)))
                    }
                }
                // 当前笔中线导引（虚线 + 起点）
                if session.currentStroke < session.strokeCount {
                    let med = session.medianPoints(session.currentStroke, t: t)
                    if med.count > 1 {
                        var guide = Path(); guide.addLines(med)
                        let dash: [CGFloat] = session.showHint ? [2, 6] : [6, 7]
                        ctx.stroke(guide, with: .color(Theme.goldDeep.opacity(session.showHint ? 0.9 : 0.5)),
                                   style: StrokeStyle(lineWidth: session.showHint ? 5 : 3, lineCap: .round, dash: dash))
                        if let start = med.first {
                            ctx.fill(Path(ellipseIn: CGRect(x: start.x - 7, y: start.y - 7, width: 14, height: 14)),
                                     with: .color(Theme.goldDeep))
                        }
                    }
                }
                // 用户正在描的笔
                if current.count > 1 {
                    var up = Path(); up.addLines(current)
                    ctx.stroke(up, with: .color(color.deep),
                               style: StrokeStyle(lineWidth: 16, lineCap: .round, lineJoin: .round))
                }
            }
            .frame(width: size, height: size)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { v in current.append(v.location) }
                    .onEnded { _ in
                        session.submit(user: current, size: size, t: t)
                        current = []
                    }
            )
        }
        .frame(width: size, height: size)
        .background(RoundedRectangle(cornerRadius: Theme.R.md).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: Theme.R.md).stroke(Theme.lineSoft, lineWidth: 1.5))
    }
}

// ── 演示窗（逐笔 trace 动画）────────────────────────────────
private struct DemoWriterView: View {
    @ObservedObject var session: WritingSession
    let color: ColorToken
    private let size: CGFloat = 132
    private var t: HanziTransform { HanziTransform(size: size, padding: 8) }
    @State private var stroke = 0
    @State private var progress: CGFloat = 0
    @State private var timer: Timer?

    var body: some View {
        ZStack {
            TianGrid(size: size)
            Canvas { ctx, _ in
                guard let data = session.data else { return }
                for s in 0..<data.strokes.count {
                    let p = SVGPath.path(from: data.strokes[s], t: t)
                    if s < stroke { ctx.fill(p, with: .color(color.deep)) }
                    else { ctx.fill(p, with: .color(Theme.lineSoft.opacity(0.7))) }
                }
                // 当前笔沿 median trace
                if stroke < (session.data?.medians.count ?? 0) {
                    let med = session.medianPoints(stroke, t: t)
                    if med.count > 1 {
                        var path = Path(); path.addLines(med)
                        let trimmed = path.trimmedPath(from: 0, to: progress)
                        ctx.stroke(trimmed, with: .color(color.deep),
                                   style: StrokeStyle(lineWidth: 7, lineCap: .round, lineJoin: .round))
                    }
                }
            }
        }
        .frame(width: size, height: size)
        .background(RoundedRectangle(cornerRadius: Theme.R.sm).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: Theme.R.sm).stroke(Theme.lineSoft, lineWidth: 1))
        .onAppear { startDemo() }
        .onDisappear { timer?.invalidate() }
        .onTapGesture { startDemo() }
    }

    private func startDemo() {
        timer?.invalidate()
        stroke = 0; progress = 0
        let count = session.data?.medians.count ?? 0
        guard count > 0 else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 0.03, repeats: true) { _ in
            Task { @MainActor in
                progress += 0.04
                if progress >= 1 {
                    progress = 0
                    stroke += 1
                    if stroke >= count {
                        timer?.invalidate()
                        // 停 1s 后回放
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { startDemo() }
                    }
                }
            }
        }
    }
}

// ── 田字格 ────────────────────────────────────────────────
struct TianGrid: View {
    let size: CGFloat
    var body: some View {
        Canvas { ctx, _ in
            let r = CGRect(x: 0, y: 0, width: size, height: size)
            ctx.stroke(Path(roundedRect: r.insetBy(dx: 1, dy: 1), cornerRadius: 6),
                       with: .color(Theme.petalDeep.opacity(0.35)), lineWidth: 1.5)
            var cross = Path()
            cross.move(to: CGPoint(x: size / 2, y: 0)); cross.addLine(to: CGPoint(x: size / 2, y: size))
            cross.move(to: CGPoint(x: 0, y: size / 2)); cross.addLine(to: CGPoint(x: size, y: size / 2))
            ctx.stroke(cross, with: .color(Theme.petalDeep.opacity(0.28)),
                       style: StrokeStyle(lineWidth: 1, dash: [5, 5]))
        }
        .frame(width: size, height: size)
    }
}

struct ProgressDots: View {
    let total: Int; let done: Int; let color: ColorToken
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<max(total, 1), id: \.self) { i in
                Circle().fill(i < done ? color.deep : Theme.lineSoft).frame(width: 7, height: 7)
            }
        }
    }
}
