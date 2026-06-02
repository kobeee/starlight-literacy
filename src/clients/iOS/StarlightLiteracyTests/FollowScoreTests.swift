import XCTest
@testable import StarlightLiteracy

// 护城河 #2 · 红线 §7.6 跟读真纠音（双波形真对比）× 零挫败（永远给星、不羞辱）。
// 真机 bug #2：点按式录音两头裹静音 → durRatio 失真 + 包络落点错位 → 读对了也一直「再试一次」。
// 本测证明修法：① trimmedEnvelope 掐头去尾静音 + 语音区时间归一；
//             ② scoreTier 只由形状 cosine 决定、快慢不降档、最低档说鼓励语不羞辱。
final class FollowScoreTests: XCTestCase {

    private let sampleRate = 1000.0
    private let buckets = 56

    // 半正弦能量包：i∈[0,len) 取 sin(π·i/len)，两端低、中间高（峰在中）。
    private func hump(_ len: Int, amp: Float = 1) -> [Float] {
        (0..<len).map { amp * Float(sin(Double.pi * Double($0) / Double(len))) }
    }
    private func zeros(_ n: Int) -> [Float] { [Float](repeating: 0, count: n) }

    // ① trimmedEnvelope：前后补零 + 中间能量包 → dur≈包长、归一、峰在中
    func testTrimmedEnvelopeCutsSilenceNormalizesAndKeepsPeakCentered() {
        let humpLen = 300
        let samples = zeros(100) + hump(humpLen) + zeros(120)
        let (env, dur) = FollowRecorder.trimmedEnvelope(samples: samples, sampleRate: sampleRate, buckets: buckets)

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

    // ② 同一发音 → great
    func testIdenticalEnvelopeIsGreat() {
        let samples = zeros(50) + hump(300) + zeros(50)
        let (env, dur) = FollowRecorder.trimmedEnvelope(samples: samples, sampleRate: sampleRate, buckets: buckets)
        let s = FollowRecorder.scoreTier(teacher: env, user: env, teacherDur: dur, userDur: dur)
        XCTAssertEqual(s.tier, "great")
    }

    // ② 录音落点错位（两头静音长度不同）→ 裁剪 + 时间归一后仍 great（证 bug 修了）
    func testMisalignedSilenceStillGreatAfterTrim() {
        let teacherSamples = zeros(50)  + hump(300) + zeros(50)   // 老师：少量前导静音
        let userSamples    = zeros(400) + hump(300) + zeros(20)   // 用户：点按式大段前导静音 + 同样的发音
        let (tEnv, tDur) = FollowRecorder.trimmedEnvelope(samples: teacherSamples, sampleRate: sampleRate, buckets: buckets)
        let (uEnv, uDur) = FollowRecorder.trimmedEnvelope(samples: userSamples, sampleRate: sampleRate, buckets: buckets)
        let s = FollowRecorder.scoreTier(teacher: tEnv, user: uEnv, teacherDur: tDur, userDur: uDur)
        XCTAssertEqual(s.tier, "great", "裁剪静音 + 时间归一后，错位的同款发音应判 great，而不是旧版的最低档")
    }

    // ② 没出声 / 空录音（孩子愣住没念）→ encourage，且 tips 绝不含羞辱/重来语
    // 这正是真机 bug #2 最伤人的场景：旧代码会一路「再试一次/仔细听」，新代码必须只给鼓励。
    func testSilentUserEncouragesWithoutShaming() {
        let teacherSamples = zeros(50) + hump(300) + zeros(50)
        let userSamples = zeros(400)                  // 没出声：包络全 0 → cos=0
        let (tEnv, tDur) = FollowRecorder.trimmedEnvelope(samples: teacherSamples, sampleRate: sampleRate, buckets: buckets)
        let (uEnv, uDur) = FollowRecorder.trimmedEnvelope(samples: userSamples, sampleRate: sampleRate, buckets: buckets)
        let s = FollowRecorder.scoreTier(teacher: tEnv, user: uEnv, teacherDur: tDur, userDur: uDur)
        XCTAssertEqual(s.tier, "encourage", "没出声应落最低档 encourage（cos=0）")
        let joined = s.tips.joined()
        for shaming in ["再试一次", "重来", "仔细听", "不对", "错"] {
            XCTAssertFalse(joined.contains(shaming), "最低档不许出现羞辱/重来语，实际：\(joined)")
        }
        XCTAssertFalse(s.tips.isEmpty, "应给鼓励语")
        XCTAssertEqual(s.tips.first, "录到啦！再跟老师对对看～", "主反馈必须是鼓励语")
    }

    // ② durRatio 极端（读太慢）→ 形状对就不降档，仍 great（快慢只柔性提示）
    func testExtremeDurRatioDoesNotDowngradeGreat() {
        let samples = zeros(50) + hump(300) + zeros(50)
        let (env, dur) = FollowRecorder.trimmedEnvelope(samples: samples, sampleRate: sampleRate, buckets: buckets)
        // 同样的包络（cos=1），但把 userDur 拉到老师 10 倍
        let s = FollowRecorder.scoreTier(teacher: env, user: env, teacherDur: dur, userDur: dur * 10)
        XCTAssertEqual(s.tier, "great", "形状一致时，durRatio 再极端也不该把 great 降档")
    }

    // 全静音兜底：不崩、dur 退回整段、tier 不报错（cos=0 → encourage）
    func testAllSilenceFallsBackGracefully() {
        let samples = zeros(500)
        let (env, dur) = FollowRecorder.trimmedEnvelope(samples: samples, sampleRate: sampleRate, buckets: buckets)
        XCTAssertEqual(dur, Double(samples.count) / sampleRate, accuracy: 1e-6, "全静音应退回整段时长")
        XCTAssertEqual(env.max() ?? 0, 0, "全静音包络应全 0")
    }
}
