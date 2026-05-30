import SwiftUI

// 真笔顺引擎 · 复用 hanzi-writer-data（strokes SVG 轮廓 + medians 笔画中线）
// 红线 §7.4 写字真判定：拒绝"乱画也判对"。用户轨迹对 median 做容差 + 顺序 + 方向比对，
// 零挫败：错 3 次显示 hint，错 5 次自动放过当前笔。超越手搓直线段。

struct HanziData: Decodable {
    let strokes: [String]        // 每笔的 SVG 轮廓路径（data 空间 0~1024，Y 向上）
    let medians: [[[Double]]]    // 每笔的中线点序列

    static func load(char: String) -> HanziData? {
        guard let url = Bundle.main.url(forResource: char, withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let parsed = try? JSONDecoder().decode(HanziData.self, from: data) else { return nil }
        return parsed
    }
}

// data 空间 → 屏幕空间：scale + Y 翻转（hanzi-writer 规范 translate(p, S-p) scale(s,-s)）
struct HanziTransform {
    let size: CGFloat
    let padding: CGFloat
    var scale: CGFloat { (size - padding * 2) / 1024 }
    func point(_ dx: Double, _ dy: Double) -> CGPoint {
        CGPoint(x: padding + scale * dx, y: (size - padding) - scale * dy)
    }
    func median(_ pts: [[Double]]) -> [CGPoint] { pts.map { point($0[0], $0[1]) } }
}

// 极简 SVG path 解析（hanzi-writer-data 仅用绝对 M/L/Q/C/Z）
enum SVGPath {
    static func path(from d: String, t: HanziTransform) -> Path {
        var path = Path()
        let tokens = d.split(whereSeparator: { $0 == " " || $0 == "," || $0 == "\n" }).map(String.init)
        var i = 0
        var cmd = ""
        func num() -> Double { let v = Double(tokens[i]) ?? 0; i += 1; return v }
        while i < tokens.count {
            let tk = tokens[i]
            if let f = tk.first, "MLQCZmlqcz".contains(f) { cmd = tk; i += 1 } // 命令
            switch cmd {
            case "M": let x = num(); let y = num(); path.move(to: t.point(x, y))
            case "L": let x = num(); let y = num(); path.addLine(to: t.point(x, y))
            case "Q":
                let cx = num(); let cy = num(); let x = num(); let y = num()
                path.addQuadCurve(to: t.point(x, y), control: t.point(cx, cy))
            case "C":
                let c1x = num(); let c1y = num(); let c2x = num(); let c2y = num(); let x = num(); let y = num()
                path.addCurve(to: t.point(x, y), control1: t.point(c1x, c1y), control2: t.point(c2x, c2y))
            case "Z", "z": path.closeSubpath(); if i < tokens.count && tokens[i] == cmd { i += 1 }
            default: i += 1
            }
        }
        return path
    }
}

// ── 笔顺判定 ──────────────────────────────────────────────
enum StrokeJudge {
    static func dist(_ a: CGPoint, _ b: CGPoint) -> CGFloat { hypot(a.x - b.x, a.y - b.y) }

    // 点到折线最近距离
    static func distToPolyline(_ p: CGPoint, _ poly: [CGPoint]) -> CGFloat {
        guard poly.count > 1 else { return poly.first.map { dist(p, $0) } ?? .infinity }
        var best = CGFloat.infinity
        for k in 0..<(poly.count - 1) {
            best = min(best, distToSegment(p, poly[k], poly[k + 1]))
        }
        return best
    }
    static func distToSegment(_ p: CGPoint, _ a: CGPoint, _ b: CGPoint) -> CGFloat {
        let dx = b.x - a.x, dy = b.y - a.y
        let len2 = dx * dx + dy * dy
        if len2 == 0 { return dist(p, a) }
        var tt = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
        tt = max(0, min(1, tt))
        return dist(p, CGPoint(x: a.x + tt * dx, y: a.y + tt * dy))
    }

    struct Result { let ok: Bool; let reason: String }

    // 用户轨迹 user vs 期望 median，tolerance 随画布大小缩放（leniency ≈ 1.5）
    static func judge(user: [CGPoint], median: [CGPoint], size: CGFloat) -> Result {
        guard user.count >= 2, median.count >= 2 else { return Result(ok: false, reason: "too-short") }
        // 用户笔画长度过短（点一下）直接拒
        let userLen = polylineLength(user)
        let medLen = polylineLength(median)
        if userLen < medLen * 0.35 && medLen > size * 0.12 {
            return Result(ok: false, reason: "too-short-length")
        }
        let startTol = size * 0.22   // 起笔/收笔容差
        let pathTol  = size * 0.16   // 沿线平均容差
        // 方向：起点贴 median 起点、终点贴 median 终点，优于反向
        let fwd = dist(user.first!, median.first!) + dist(user.last!, median.last!)
        let bwd = dist(user.first!, median.last!) + dist(user.last!, median.first!)
        if bwd < fwd { return Result(ok: false, reason: "reversed") }
        if dist(user.first!, median.first!) > startTol { return Result(ok: false, reason: "bad-start") }
        if dist(user.last!, median.last!) > startTol { return Result(ok: false, reason: "bad-end") }
        // 沿线贴合度：用户点到 median 折线的平均距离
        let avg = user.map { distToPolyline($0, median) }.reduce(0, +) / CGFloat(user.count)
        if avg > pathTol { return Result(ok: false, reason: "off-track") }
        // 折笔必经拐点：median 内部若有明显折角（离首尾连线 > pathTol，如横折/竖折的「折」），
        // 用户轨迹必须经过其附近，否则就是「横折直接斜拉一条线」蒙混（红线 §7.4 真判定）。
        // 零挫败：容差仍用 pathTol，认真沿线描必然经过；只有跳过折角的斜拉才被拦。
        if median.count >= 3 {
            let a = median.first!, b = median.last!
            for k in 1..<(median.count - 1) {
                let corner = median[k]
                if distToSegment(corner, a, b) > pathTol {
                    let nearest = user.map { dist($0, corner) }.min() ?? .infinity
                    if nearest > pathTol { return Result(ok: false, reason: "skip-corner") }
                }
            }
        }
        return Result(ok: true, reason: "ok")
    }

    static func polylineLength(_ pts: [CGPoint]) -> CGFloat {
        guard pts.count > 1 else { return 0 }
        var s: CGFloat = 0
        for k in 0..<(pts.count - 1) { s += dist(pts[k], pts[k + 1]) }
        return s
    }
}

// 描红会话状态（每字独立）：当前笔、各笔完成、错次计数、零挫败降级
@MainActor
final class WritingSession: ObservableObject {
    let charId: String
    let hanzi: String
    let data: HanziData?
    @Published var currentStroke = 0
    @Published var completedStrokes: [Int] = []      // 已完成笔索引
    @Published var missesOnCurrent = 0
    @Published var showHint = false                   // 错 3 次显示
    @Published var lastFeedback: String? = nil
    @Published var autoPassed: Set<Int> = []          // 被零挫败放过的笔

    init(charId: String, hanzi: String) {
        self.charId = charId; self.hanzi = hanzi
        self.data = HanziData.load(char: hanzi)
    }

    var strokeCount: Int { data?.medians.count ?? 0 }
    var isComplete: Bool { strokeCount > 0 && completedStrokes.count >= strokeCount }

    func medianPoints(_ index: Int, t: HanziTransform) -> [CGPoint] {
        guard let d = data, index < d.medians.count else { return [] }
        return t.median(d.medians[index])
    }

    // 提交一笔用户轨迹
    func submit(user: [CGPoint], size: CGFloat, t: HanziTransform) {
        guard !isComplete, currentStroke < strokeCount else { return }
        let median = medianPoints(currentStroke, t: t)
        let r = StrokeJudge.judge(user: user, median: median, size: size)
        if r.ok {
            advance(passed: false)
        } else {
            missesOnCurrent += 1
            if missesOnCurrent >= 3 { showHint = true }
            if missesOnCurrent >= 5 {                 // 零挫败：自动放过
                autoPassed.insert(currentStroke)
                lastFeedback = "老师帮你描好这一笔啦，继续～"
                advance(passed: true)
            } else {
                lastFeedback = feedbackFor(r.reason)
            }
        }
    }

    private func advance(passed: Bool) {
        completedStrokes.append(currentStroke)
        if !passed { lastFeedback = "这一笔很棒！" }
        currentStroke += 1
        missesOnCurrent = 0
        showHint = false
    }

    private func feedbackFor(_ reason: String) -> String {
        switch reason {
        case "skip-corner": "这一笔要拐个弯哦，跟着灰线描～"
        case "reversed": "方向反啦，跟着箭头从头描～"
        case "bad-start": "从这一笔的起点开始哦"
        case "off-track": "再贴着灰线描一描～"
        case "too-short-length", "too-short": "把这一笔画完整一点～"
        default: "再试一次，慢慢来"
        }
    }

    func reset() {
        currentStroke = 0; completedStrokes = []; missesOnCurrent = 0
        showHint = false; lastFeedback = nil; autoPassed = []
    }
}
