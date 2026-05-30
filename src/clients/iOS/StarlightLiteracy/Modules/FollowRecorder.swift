import AVFoundation
import SwiftUI

// 跟读双波形对比引擎 · 护城河 #2 · 与 mh5v2 modules/follow-record.js 同源
// 红线 §7.6：每字必须录音对比，不接 ASR（科学决策，数据驱动二阶段）。
// 启发式 3 维：时长比 / 总能量比 / 包络 cosine → great / ok / try-again。
@MainActor
final class FollowRecorder: ObservableObject {
    enum Phase { case idle, recording, scored }
    @Published var phase: Phase = .idle
    @Published var teacherEnv: [Float] = []
    @Published var userEnv: [Float] = []
    @Published var tier: String? = nil          // great / ok / try-again
    @Published var tips: [String] = []
    @Published var permissionDenied = false
    @Published var teacherLoaded = false

    var hasRecorded: Bool { phase == .scored && !userEnv.isEmpty }

    private var recorder: AVAudioRecorder?
    private var recURL: URL?
    private var teacherDur: Double = 0
    private var userDur: Double = 0
    private var player: AVAudioPlayer?

    private let buckets = 56

    // ── 老师音轨包络 ─────────────────────────────────────
    func loadTeacher(id: String) {
        guard let url = AudioService.shared.url(id: id, kind: .char) else { return }
        if let (env, dur) = Self.envelope(url: url, buckets: buckets) {
            teacherEnv = env; teacherDur = dur; teacherLoaded = true
        }
    }

    func playTeacher(id: String) {
        configureSession()
        guard let url = AudioService.shared.url(id: id, kind: .char) else { return }
        player = try? AVAudioPlayer(contentsOf: url); player?.play()
    }

    // ── 录音 ─────────────────────────────────────────────
    func toggleRecord() {
        switch phase {
        case .recording: stop()
        default: requestAndStart()
        }
    }

    private func requestAndStart() {
        AVAudioApplication.requestRecordPermission { [weak self] granted in
            Task { @MainActor in
                guard let self else { return }
                if granted { self.start() } else { self.fallbackWithoutMic() }
            }
        }
    }

    // C2：拒权也兑现"没麦克风也能过关"——合成示意波形 + 置 .scored，让顺序门可解、CTA 可达。
    // 不伪装成真打分：tier 固定 ok、提示明说用了示意波形（零挫败 + 不骗）。
    private func fallbackWithoutMic() {
        permissionDenied = true
        userEnv = (0..<buckets).map { 0.35 + 0.35 * Float(abs(sin(Double($0) * 0.5))) }
        userDur = max(teacherDur, 1)
        phase = .scored
        tier = "ok"
        tips = ["没有麦克风也没关系，先用示意波形帮你过关～"]
    }

    private func configureSession() {
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try? s.setActive(true)
    }

    private func start() {
        configureSession()
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("follow-\(UUID().uuidString).m4a")
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue
        ]
        recorder = try? AVAudioRecorder(url: url, settings: settings)
        recURL = url
        recorder?.record()
        phase = .recording
        tier = nil; tips = []
    }

    private func stop() {
        recorder?.stop()
        phase = .scored
        guard let url = recURL, let (env, dur) = Self.envelope(url: url, buckets: buckets) else {
            // 录音解码失败也不卡死：给最低档但仍算已录（零挫败）
            userEnv = [Float](repeating: 0.1, count: buckets); userDur = 1
            score(); return
        }
        userEnv = env; userDur = dur
        score()
    }

    func playUser() {
        guard let url = recURL else { return }
        configureSession()
        player = try? AVAudioPlayer(contentsOf: url); player?.play()
    }

    // ── 启发式打分（与 follow-record.js scoreHeuristic 同源）──
    private func score() {
        var t: [String] = []
        let durRatio = teacherDur > 0 ? userDur / teacherDur : 1
        if durRatio < 0.5 { t.append("再慢一点点～") }
        else if durRatio > 2.0 { t.append("再快一点试试") }

        let userEnergy = userEnv.reduce(0, +)
        let teacherEnergy = teacherEnv.reduce(0, +)
        if teacherEnergy > 0 && userEnergy / teacherEnergy < 0.3 { t.append("再大声一点～") }

        var dot: Float = 0, mt: Float = 0, mu: Float = 0
        let n = min(teacherEnv.count, userEnv.count)
        for i in 0..<n { dot += teacherEnv[i] * userEnv[i]; mt += teacherEnv[i] * teacherEnv[i]; mu += userEnv[i] * userEnv[i] }
        let cos = (mt > 0 && mu > 0) ? dot / (mt.squareRoot() * mu.squareRoot()) : 0

        let resolved: String
        if cos > 0.65 && t.isEmpty { resolved = "great"; t.append("很像，真棒！") }
        else if cos > 0.35 { resolved = "ok"; t.append("差不多啦，再来一次更好～") }
        else { resolved = "try-again"; if t.isEmpty { t.append("仔细听听老师，再来一次") } }
        tier = resolved; tips = t
    }

    func reset() { phase = .idle; userEnv = []; tier = nil; tips = []; recURL = nil }

    // ── 包络抽样（peak per bucket，归一化）────────────────
    nonisolated static func envelope(url: URL, buckets: Int) -> (env: [Float], dur: Double)? {
        guard let file = try? AVAudioFile(forReading: url) else { return nil }
        let format = file.processingFormat
        let frameCount = AVAudioFrameCount(file.length)
        guard frameCount > 0, let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return nil }
        do { try file.read(into: buf) } catch { return nil }
        guard let ch = buf.floatChannelData?[0] else { return nil }
        let n = Int(buf.frameLength)
        guard n > 0 else { return nil }
        let bucketSize = max(1, n / buckets)
        var env = [Float](repeating: 0, count: buckets)
        for i in 0..<buckets {
            var maxV: Float = 0
            let start = i * bucketSize
            let end = min(start + bucketSize, n)
            var j = start
            while j < end { let v = abs(ch[j]); if v > maxV { maxV = v }; j += 1 }
            env[i] = maxV
        }
        let peak = env.max() ?? 0
        if peak > 0 { for i in 0..<buckets { env[i] /= peak } }
        let dur = Double(n) / format.sampleRate
        return (env, dur)
    }
}

// 双波形画布：上 teacher（蜂蜜金），下 user（薄荷绿）
struct DualWaveform: View {
    let teacher: [Float]
    let user: [Float]
    var body: some View {
        Canvas { ctx, size in
            let W = size.width, H = size.height, mid = H / 2
            // 中线
            var midline = Path(); midline.move(to: CGPoint(x: 0, y: mid)); midline.addLine(to: CGPoint(x: W, y: mid))
            ctx.stroke(midline, with: .color(Theme.goldDeep.opacity(0.35)), style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
            func draw(_ env: [Float], _ color: Color, up: Bool) {
                guard !env.isEmpty else { return }
                let w = W / CGFloat(env.count)
                for i in 0..<env.count {
                    let h = CGFloat(env[i]) * (H / 2 - 4)
                    let x = CGFloat(i) * w
                    let rect = CGRect(x: x + 1, y: up ? mid - h : mid + 2, width: max(w - 2, 1), height: max(h, 1))
                    ctx.fill(Path(roundedRect: rect, cornerRadius: 1.5), with: .color(color))
                }
            }
            draw(teacher, Theme.honeyGold.opacity(0.9), up: true)
            draw(user, Theme.mintDeep.opacity(0.9), up: false)
            ctx.draw(Text("老师").font(.system(size: 11, weight: .semibold)).foregroundColor(Theme.goldBrown),
                     at: CGPoint(x: 18, y: 12))
            ctx.draw(Text("你").font(.system(size: 11, weight: .semibold)).foregroundColor(Theme.mintDeep),
                     at: CGPoint(x: 14, y: H - 12))
        }
    }
}
