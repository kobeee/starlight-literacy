import XCTest
@testable import StarlightLiteracy

// 护城河 #2 · 红线 §7.6 跟读真纠音 × 零挫败。
//
// 2026-06-03 止血重做：删假判分（旧版 scoreTier 用包络 cosine 假装判「像不像」，真机暴露没出声
// 也判 great「很像，真棒！」=假纠音哄孩子）。现在机器只判它做得准的事——detectVoice 判「有没有
// 出声」（归一前 rawPeak 绝对能量门），「像不像」交给耳朵 A/B 对听。
// 本测证明：① trimmedEnvelope 仍正确裁静音/归一，并额外报出 rawPeak；② detectVoice 出声/没出声分明。
final class FollowScoreTests: XCTestCase {

    private let sampleRate = 1000.0
    private let buckets = 56

    // 半正弦能量包：i∈[0,len) 取 sin(π·i/len)，两端低、中间高（峰在中）。
    private func hump(_ len: Int, amp: Float = 1) -> [Float] {
        (0..<len).map { amp * Float(sin(Double.pi * Double($0) / Double(len))) }
    }
    private func zeros(_ n: Int) -> [Float] { [Float](repeating: 0, count: n) }

    // ── trimmedEnvelope：裁静音 + 归一 + 峰在中 + 报 rawPeak ──
    func testTrimmedEnvelopeCutsSilenceNormalizesAndKeepsPeakCentered() {
        let humpLen = 300
        let samples = zeros(100) + hump(humpLen) + zeros(120)
        let (env, dur, _) = FollowRecorder.trimmedEnvelope(samples: samples, sampleRate: sampleRate, buckets: buckets)

        // dur 是语音区时长（≈包长/采样率），不含两头静音；门限会削掉边缘最弱的几个样本，给宽容差。
        XCTAssertEqual(dur, Double(humpLen) / sampleRate, accuracy: 30.0 / sampleRate,
                       "dur 应≈能量包时长、不含两头静音")
        // 归一：峰值桶应为 1
        XCTAssertEqual(env.max() ?? 0, 1, accuracy: 1e-4, "包络应归一到峰值 1")
        // 峰在中：半正弦最大值桶应落在中间附近
        let peakIdx = env.firstIndex(of: env.max() ?? 0) ?? -1
        XCTAssertTrue((buckets/2 - 12...buckets/2 + 12).contains(peakIdx),
                      "峰应在中间附近，实际桶 \(peakIdx)")
    }

    // rawPeak = 归一【前】的绝对峰值，detectVoice 靠它分出声/没出声（归一会抹掉绝对音量）。
    func testTrimmedEnvelopeReportsRawPeakBeforeNormalization() {
        let voiced = zeros(50) + hump(300, amp: 0.8) + zeros(50)
        let (_, _, peak) = FollowRecorder.trimmedEnvelope(samples: voiced, sampleRate: sampleRate, buckets: buckets)
        XCTAssertEqual(peak, 0.8, accuracy: 1e-4, "rawPeak 应是归一前的真实峰值 0.8")
    }

    // ── detectVoice：出声 vs 没出声 ────────────────────────
    // 真机最伤人场景的根治点：旧 cosine 会把「没出声」误判成「很像真棒」，现在没出声就是没出声。
    func testDetectVoiceThreshold() {
        XCTAssertTrue(FollowRecorder.detectVoice(rawPeak: 0.2), "正常说话峰值应判出声")
        XCTAssertTrue(FollowRecorder.detectVoice(rawPeak: FollowRecorder.voiceFloor), "恰在门限应判出声")
        XCTAssertFalse(FollowRecorder.detectVoice(rawPeak: 0), "纯静音应判没出声")
        XCTAssertFalse(FollowRecorder.detectVoice(rawPeak: 0.02), "安静底噪应判没出声")
    }

    // 真出声样本 → 经 trimmedEnvelope 取 rawPeak → detectVoice 判出声
    func testVoicedSampleDetected() {
        let voiced = zeros(50) + hump(300) + zeros(50)
        let (_, _, peak) = FollowRecorder.trimmedEnvelope(samples: voiced, sampleRate: sampleRate, buckets: buckets)
        XCTAssertTrue(FollowRecorder.detectVoice(rawPeak: peak), "正常出声应判 voiced")
    }

    // 没出声（只剩极弱底噪）→ rawPeak 低于门限 → 判没出声（绝不再误判成「很像」）
    func testSilentSampleNotDetected() {
        let quiet = (0..<500).map { Float(0.01 * sin(Double($0))) }   // |peak|≈0.01 < voiceFloor
        let (_, _, peak) = FollowRecorder.trimmedEnvelope(samples: quiet, sampleRate: sampleRate, buckets: buckets)
        XCTAssertFalse(FollowRecorder.detectVoice(rawPeak: peak), "安静没出声应判 silent，不许误判出声")
    }

    // 全静音兜底：不崩、dur 退回整段、rawPeak=0
    func testAllSilenceFallsBackGracefully() {
        let samples = zeros(500)
        let (env, dur, peak) = FollowRecorder.trimmedEnvelope(samples: samples, sampleRate: sampleRate, buckets: buckets)
        XCTAssertEqual(dur, Double(samples.count) / sampleRate, accuracy: 1e-6, "全静音应退回整段时长")
        XCTAssertEqual(env.max() ?? 0, 0, "全静音包络应全 0")
        XCTAssertEqual(peak, 0, "全静音 rawPeak 应为 0")
        XCTAssertFalse(FollowRecorder.detectVoice(rawPeak: peak), "全静音应判没出声")
    }
}
