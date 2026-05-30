import XCTest
import CoreGraphics
@testable import StarlightLiteracy

// 护城河 #1 · 红线 §7.4 写字真判定（B6 复杂字手感）：
// 折笔（横折 / 竖折）的「折」不能被绕过。fixture 用真实 hanzi-writer-data 折笔的
// 屏幕空间 median（300pt 画布，由 HanziTransform 换算），证明：
//  - 认真沿折线描（含手抖）→ 判过（零挫败不误杀）
//  - 折笔直接斜拉一条直线（不拐弯）→ 被 skip-corner 拦（不许蒙混）
//  - 直笔斜拉本就该过 → corner 规则不误伤
// 背景：离线全字量化（/tmp/b6/judge_probe.py）发现旧 judge 仅看「点到折线平均距离」，
// 口/山/日/月/水/火/田/目 等 8 处折笔可被对角斜拉蒙混（avg 20~35 < pathTol 48）。
@MainActor
final class CurvedStrokeJudgeTests: XCTestCase {

    private let size: CGFloat = 300

    // 真实横折 A（田 第 2 笔，curv≈116）：长横到右上，再竖折向下
    private let foldA: [CGPoint] = [
        (76.2, 121.8), (87.6, 126.6), (151.6, 118.1), (210.3, 106.7), (218.5, 106.7),
        (227.6, 112.0), (232.6, 117.6), (224.4, 179.5), (216.1, 223.3), (212.2, 233.9),
        (206.8, 241.1), (206.3, 257.3)
    ].map { CGPoint(x: $0.0, y: $0.1) }

    // 真实横折 B（目 第 2 笔，curv≈84）：另一道横折，竖段更长
    private let foldB: [CGPoint] = [
        (103.8, 97.1), (111.0, 100.6), (116.3, 100.1), (182.9, 87.6), (190.6, 92.1),
        (196.5, 98.5), (199.1, 245.6), (195.4, 256.8), (174.7, 250.9)
    ].map { CGPoint(x: $0.0, y: $0.1) }

    // 直横（无折角，对照组）
    private let heng: [CGPoint] = [
        CGPoint(x: 50, y: 150), CGPoint(x: 150, y: 150), CGPoint(x: 250, y: 150)
    ]

    // 沿 median 逐段密集采样 + 小幅手抖，模拟孩子认真描红
    private func traceAlong(_ med: [CGPoint], jitter: CGFloat, perSeg: Int = 8) -> [CGPoint] {
        var pts: [CGPoint] = []
        var n = 0
        for k in 0..<(med.count - 1) {
            let a = med[k], b = med[k + 1]
            for j in 0..<perSeg {
                let f = CGFloat(j) / CGFloat(perSeg)
                pts.append(CGPoint(x: a.x + (b.x - a.x) * f + jitter * sin(CGFloat(n) * 0.9),
                                   y: a.y + (b.y - a.y) * f + jitter * cos(CGFloat(n) * 0.7)))
                n += 1
            }
        }
        pts.append(med.last!)
        return pts
    }

    // 从起点直接斜拉一条直线到终点（跳过所有拐点）—— 作弊 / 乱画
    private func straightDrag(_ med: [CGPoint], n: Int = 40) -> [CGPoint] {
        let a = med.first!, b = med.last!
        return (0...n).map { i in
            let f = CGFloat(i) / CGFloat(n)
            return CGPoint(x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f)
        }
    }

    func testFoldATraceAlongPasses() {
        let r = StrokeJudge.judge(user: traceAlong(foldA, jitter: 12), median: foldA, size: size)
        XCTAssertTrue(r.ok, "认真沿横折描应判过，reason=\(r.reason)")
    }

    func testFoldAStraightCheatRejected() {
        let r = StrokeJudge.judge(user: straightDrag(foldA), median: foldA, size: size)
        XCTAssertFalse(r.ok, "横折斜拉蒙混不应判过")
        XCTAssertEqual(r.reason, "skip-corner", "应被折角必经规则拦下，而非其它原因")
    }

    func testFoldBTraceAlongPasses() {
        let r = StrokeJudge.judge(user: traceAlong(foldB, jitter: 12), median: foldB, size: size)
        XCTAssertTrue(r.ok, "认真沿横折描应判过，reason=\(r.reason)")
    }

    func testFoldBStraightCheatRejected() {
        let r = StrokeJudge.judge(user: straightDrag(foldB), median: foldB, size: size)
        XCTAssertFalse(r.ok, "横折斜拉蒙混不应判过")
        XCTAssertEqual(r.reason, "skip-corner")
    }

    func testStraightStrokeStillPasses() {
        // 直笔斜拉本就是正确轨迹，corner 规则不能误伤
        let r = StrokeJudge.judge(user: straightDrag(heng), median: heng, size: size)
        XCTAssertTrue(r.ok, "直横斜拉应判过，reason=\(r.reason)")
    }
}
