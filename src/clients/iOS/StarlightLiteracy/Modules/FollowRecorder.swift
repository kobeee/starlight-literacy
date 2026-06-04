import AVFoundation
import SwiftUI

// 跟读引擎 · 护城河 #2 · 与 mh5v2 modules/follow-record.js 同源
// 红线 §7.6：每字必须录音对比，不接 ASR（科学决策，数据驱动二阶段）。
//
// 2026-06-03 止血重做（删假判分）：旧版用包络 cosine 假装判「像不像」分 great/ok/encourage，
// 但真机暴露——没出声/底噪时平包络与老师驼峰 cosine 天然偏高 > 0.6，会判「很像，真棒！」，
// 是假纠音哄孩子、踩穿红线 §7.6。根因：不接 ASR 时包络 cosine 根本分不清「读对/瞎读/没读」。
// 校准方案（不钟摆，见 跟读真纠音与零挫败的矛盾）：机器只做它做得准的事——
//   ① detectVoice 判「有没有出声」（绝对能量门，可靠）；
//   ② 「像不像」交还耳朵——A/B 双波形对听，孩子/家长自己听老师 vs 自己。
//   出声 → 给星 + 引导对听（不声称判了音准）；没出声 → 温柔引导再说一遍（不算错、不羞辱、
//   不挡死）；连续没出声 silentBailout 次兜底放行（零挫败：卡关降难度保证过关）。
@MainActor
final class FollowRecorder: ObservableObject {
    enum Phase { case idle, recording, scored }
    @Published var phase: Phase = .idle
    @Published var teacherEnv: [Float] = []
    @Published var userEnv: [Float] = []
    @Published var tier: String? = nil          // "voiced" 出声了 / "silent" 没出声
    @Published var tips: [String] = []
    @Published var passed = false               // 出声 or 兜底放行 → 顺序门可解、CTA 可达
    @Published var permissionDenied = false
    @Published var teacherLoaded = false

    var hasRecorded: Bool { phase == .scored && !userEnv.isEmpty }

    private var silentStreak = 0                // 连续没出声次数，达 silentBailout 兜底放行
    private let silentBailout = 3

    private var recorder: AVAudioRecorder?
    private var recURL: URL?
    private var teacherDur: Double = 0
    private var userDur: Double = 0
    private var player: AVAudioPlayer?

    private let buckets = 56

    // ── 老师音轨包络 ─────────────────────────────────────
    func loadTeacher(id: String) {
        guard let url = AudioService.shared.url(id: id, kind: .char) else { return }
        if let (env, dur, _) = Self.envelope(url: url, buckets: buckets) {
            teacherEnv = env; teacherDur = dur; teacherLoaded = true
        }
    }

    func playTeacher(id: String) {
        configureSession()
        guard let url = AudioService.shared.url(id: id, kind: .char) else { return }
        player = try? AVAudioPlayer(contentsOf: url); player?.play()
    }

    // ── 录音 ─────────────────────────────────────────────
    // 单点录音（2026-06-03，调研：幼龄禁持续按压/多点手势，改大圆钮单点开始 → 倒计时环自动停）：
    // 点一下开始，到 maxRecordDuration 自动停（也可再点一下手动停）。比「按住说话」更适合 5 岁——
    // 不要求按住不松手的精细动作，像点一下就能说话。
    private var autoStopTask: Task<Void, Never>?
    let maxRecordDuration: Double = 4.0   // 跟读一个字/词够用；UI 倒计时环按这个时长走。真机可调。

    func tapRecord() {
        switch phase {
        case .recording: stop()
        default: requestAndStart()
        }
    }

    private func requestAndStart() {
        AVAudioApplication.requestRecordPermission { [weak self] granted in
            Task { @MainActor in
                guard let self else { return }
                if granted { self.start() }
                else { self.fallbackWithoutMic() }
            }
        }
    }

    // C2：拒权也兑现"没麦克风也能过关"——合成示意波形 + 放行（passed），不挡顺序门。
    private func fallbackWithoutMic() {
        permissionDenied = true
        userEnv = (0..<buckets).map { 0.35 + 0.35 * Float(abs(sin(Double($0) * 0.5))) }
        userDur = max(teacherDur, 1)
        phase = .scored
        tier = "voiced"
        passed = true
        tips = ["没有麦克风也没关系，先帮你过关～"]
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
        // 倒计时自动停：到点没手动停也会停，孩子不必盯着停止按钮。
        let dur = maxRecordDuration
        autoStopTask?.cancel()
        autoStopTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(dur * 1_000_000_000))
            guard let self, self.phase == .recording else { return }
            self.stop()
        }
    }

    private func stop() {
        autoStopTask?.cancel(); autoStopTask = nil
        recorder?.stop()
        phase = .scored
        guard let url = recURL, let r = Self.envelope(url: url, buckets: buckets) else {
            // 录音解码失败也不卡死：当作没出声走 score（零挫败兜底在 score 里）
            userEnv = [Float](repeating: 0.1, count: buckets); userDur = 1
            score(rawPeak: 0); return
        }
        userEnv = r.env; userDur = r.dur
        score(rawPeak: r.rawPeak)
    }

    func playUser() {
        guard let url = recURL else { return }
        configureSession()
        player = try? AVAudioPlayer(contentsOf: url); player?.play()
    }

    // 出声 → 给星 + 引导对听；没出声 → 温柔引导，连续 silentBailout 次兜底放行（零挫败）。
    private func score(rawPeak: Float) {
        if Self.detectVoice(rawPeak: rawPeak) {
            silentStreak = 0
            tier = "voiced"; passed = true
            tips = ["录好啦！点上面「听老师」「听自己」，对比听听看～"]
        } else {
            silentStreak += 1
            if silentStreak >= silentBailout {
                tier = "voiced"; passed = true       // 实在录不到也放行，绝不卡死
                tips = ["没关系，先往下走，下次大声跟着老师读一遍会更棒～"]
            } else {
                tier = "silent"; passed = false
                tips = ["还没听到你的声音，凑近一点，跟着老师大声说一遍～"]
            }
        }
    }

    // ── 出声检测（纯函数，可单测）─────────────────────────
    // 只判「有没有出声」这件机器做得准的事：录音绝对峰值是否显著高于底噪。
    // 用归一【前】的 rawPeak——归一化会抹掉绝对音量（正是旧 cosine 误判「没出声也很像」的根源）。
    // voiceFloor 是经验门限：正常说话峰值通常 > 0.1、安静底噪 < 0.02。⚠️真机需用真麦标定此值。
    nonisolated static let voiceFloor: Float = 0.05
    nonisolated static func detectVoice(rawPeak: Float) -> Bool { rawPeak >= voiceFloor }

    func reset() {
        autoStopTask?.cancel(); autoStopTask = nil
        phase = .idle; userEnv = []; tier = nil; tips = []; passed = false; silentStreak = 0; recURL = nil
    }

    // ── 包络抽样：读音频 → 委托 trimmedEnvelope ──────────
    nonisolated static func envelope(url: URL, buckets: Int) -> (env: [Float], dur: Double, rawPeak: Float)? {
        guard let file = try? AVAudioFile(forReading: url) else { return nil }
        let format = file.processingFormat
        let frameCount = AVAudioFrameCount(file.length)
        guard frameCount > 0, let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return nil }
        do { try file.read(into: buf) } catch { return nil }
        guard let ch = buf.floatChannelData?[0] else { return nil }
        let n = Int(buf.frameLength)
        guard n > 0 else { return nil }
        let samples = Array(UnsafeBufferPointer(start: ch, count: n))
        return trimmedEnvelope(samples: samples, sampleRate: format.sampleRate, buckets: buckets)
    }

    // ── 掐头去尾静音 + 语音区重采样归一（纯函数，可单测）──
    // 点按式录音两头裹静音是真 bug 之源：含静音的总时长让 durRatio 失真、落点错位让 cosine 掉档。
    // 噪声门限 peak*0.08 切出纯语音区 [first,last]（全静音则退回整段），dur 改为语音区时长；
    // 语音区重采样到 buckets 桶（peak per bucket）+ 归一 → 老师/用户都时间归一后比形状。
    nonisolated static func trimmedEnvelope(samples: [Float], sampleRate: Double, buckets: Int) -> (env: [Float], dur: Double, rawPeak: Float) {
        let n = samples.count
        guard n > 0, buckets > 0 else { return ([Float](repeating: 0, count: max(buckets, 0)), 0, 0) }
        var peak: Float = 0
        for v in samples { let a = abs(v); if a > peak { peak = a } }
        let gate = peak * 0.08
        var first = 0, last = n - 1
        if peak > 0 {
            while first < n && abs(samples[first]) <= gate { first += 1 }
            while last > first && abs(samples[last]) <= gate { last -= 1 }
        }
        if first >= last { first = 0; last = n - 1 }       // 全静音兜底：退回整段
        let voiceLen = last - first + 1
        let dur = Double(voiceLen) / sampleRate
        var env = [Float](repeating: 0, count: buckets)
        let bucketSize = max(1, voiceLen / buckets)
        for b in 0..<buckets {
            var maxV: Float = 0
            let start = first + b * bucketSize
            let end = min(start + bucketSize, last + 1)
            var j = start
            while j < end { let a = abs(samples[j]); if a > maxV { maxV = a }; j += 1 }
            env[b] = maxV
        }
        let envPeak = env.max() ?? 0
        if envPeak > 0 { for i in 0..<buckets { env[i] /= envPeak } }
        return (env, dur, peak)   // peak = 归一前的绝对峰值，供 detectVoice 判出声
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
