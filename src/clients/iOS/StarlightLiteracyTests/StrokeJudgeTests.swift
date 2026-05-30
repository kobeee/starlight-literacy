import XCTest
import CoreGraphics
@testable import StarlightLiteracy

// 护城河 #1 · 红线 §7.4 写字真判定：拒绝「乱画也判对」。
// 用合成几何（一根水平笔，像「一」）直接喂判定器，证明：
// 正确描红过、点一下不过、反向不过、乱画不过；并验证零挫败 5 次自动放过。
@MainActor
final class StrokeJudgeTests: XCTestCase {

    private let size: CGFloat = 300
    // 一根水平中线：(50,150) → (250,150)
    private let median: [CGPoint] = [
        CGPoint(x: 50, y: 150), CGPoint(x: 150, y: 150), CGPoint(x: 250, y: 150)
    ]

    // 沿中线均匀采样，带小幅抖动，模拟孩子描红
    private func tracedAlong(jitter: CGFloat = 3) -> [CGPoint] {
        stride(from: 0.0, through: 1.0, by: 0.1).map { f in
            CGPoint(x: 50 + 200 * f, y: 150 + (f.truncatingRemainder(dividingBy: 0.2) < 0.1 ? jitter : -jitter))
        }
    }

    func testCorrectTracePasses() {
        let r = StrokeJudge.judge(user: tracedAlong(), median: median, size: size)
        XCTAssertTrue(r.ok, "贴着中线描应判过，实际 reason=\(r.reason)")
    }

    func testTapIsRejected() {
        // 点一下：两点几乎重合 —— 这正是「乱画也判对」要拦的
        let tap = [CGPoint(x: 50, y: 150), CGPoint(x: 52, y: 150)]
        let r = StrokeJudge.judge(user: tap, median: median, size: size)
        XCTAssertFalse(r.ok)
        XCTAssertEqual(r.reason, "too-short-length")
    }

    func testReversedStrokeRejected() {
        let reversed = Array(tracedAlong().reversed())
        let r = StrokeJudge.judge(user: reversed, median: median, size: size)
        XCTAssertFalse(r.ok)
        XCTAssertEqual(r.reason, "reversed")
    }

    func testOffTrackScribbleRejected() {
        // 竖着乱画一道，起点离中线起点很远
        let scribble = stride(from: 0.0, through: 1.0, by: 0.1).map {
            CGPoint(x: 150, y: 50 + 200 * $0)
        }
        let r = StrokeJudge.judge(user: scribble, median: median, size: size)
        XCTAssertFalse(r.ok, "竖向乱画不应判过")
    }

    func testWanderingOffTrackRejected() {
        // 起点、终点都对（不算 bad-start/bad-end/reversed），但整笔鼓成一个大弧，
        // 平均偏离远超容差 —— 这才是真正的「没贴线」。单点抖动不算，平均说话。
        let u = stride(from: 0.0, through: 1.0, by: 0.1).map { f -> CGPoint in
            CGPoint(x: 50 + 200 * f, y: 150 + 95 * sin(Double.pi * f))
        }
        let r = StrokeJudge.judge(user: u, median: median, size: size)
        XCTAssertFalse(r.ok)
        XCTAssertEqual(r.reason, "off-track")
    }

    // 零挫败降级：连错 5 次，当前笔自动放过，且记入 autoPassed（视觉用浅色）。
    func testZeroFrustrationAutoPassAfterFiveMisses() throws {
        guard let yi = Unit01.order.first else { return XCTFail("缺 Unit01") }
        let session = WritingSession(charId: yi, hanzi: Unit01.char(yi).char)
        guard session.strokeCount > 0 else {
            // 测试环境未打包字形 JSON 时跳过（CI 主机 bundle 差异），不误报失败
            throw XCTSkip("字形 JSON 未在测试 bundle，跳过会话级零挫败检查")
        }
        let t = HanziTransform(size: 300, padding: 14)
        let tap = [CGPoint(x: 0, y: 0), CGPoint(x: 1, y: 1)]   // 必然判错
        for _ in 0..<3 { session.submit(user: tap, size: 300, t: t) }
        XCTAssertTrue(session.showHint, "错 3 次应显示提示")
        XCTAssertFalse(session.completedStrokes.contains(0), "还没到放过阈值")
        for _ in 0..<2 { session.submit(user: tap, size: 300, t: t) }
        XCTAssertTrue(session.autoPassed.contains(0), "错 5 次应自动放过当前笔")
        XCTAssertTrue(session.completedStrokes.contains(0))
    }
}
