import XCTest
@testable import StarlightLiteracy

// 第二刀 · 音→形绑定（2026-06-03）：认读页字形随念音「逐笔点亮」强依赖 hanzi-writer-data json。
// 缺一个字的 json → StrokeRevealGlyph 静默回退静态大字，丢掉本刀的音→形绑定价值且不报错。
// 用测试钉住：Unit-01 全 20 字必须有可用笔画数据，且 strokes 与 medians 笔数一致。
final class StrokeDataTests: XCTestCase {

    func testAllUnit01CharsHaveStrokeData() {
        for id in Unit01.order {
            let hanzi = Unit01.char(id).char
            guard let data = HanziData.load(char: hanzi) else {
                XCTFail("「\(hanzi)」(\(id)) 缺 hanzi-writer json → 逐笔点亮会回退静态字")
                continue
            }
            XCTAssertFalse(data.strokes.isEmpty, "「\(hanzi)」strokes 为空")
            XCTAssertEqual(data.strokes.count, data.medians.count,
                           "「\(hanzi)」strokes(\(data.strokes.count)) 与 medians(\(data.medians.count)) 笔数不一致")
        }
    }
}
