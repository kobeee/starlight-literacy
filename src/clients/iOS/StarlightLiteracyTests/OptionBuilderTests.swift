import XCTest
@testable import StarlightLiteracy

// P05 看图认字 · 母题B 改造（2026-06-02）：候选是「字」、干扰项「混搭」、零挫败 relax 降级。
// 锁住三件事：① 默认放 1 个形近干扰逼孩子看字形；② relax 升级撤掉形近、保证仍可分辨；
//           ③ 候选恒含正确字、恒 4 个、确定性（同字同 relax 稳定）。
final class OptionBuilderTests: XCTestCase {

    // 「一」的形近字是 二/三（横线族）——旧坑的源头，正好验混搭。
    func testDefaultIncludesExactlyOneSimilar() {
        let opts = EtymologyAssets.buildOptions("yi", relax: 0)
        XCTAssertEqual(opts.count, 4, "恒 4 选 1")
        XCTAssertTrue(opts.contains("yi"), "必含正确字")
        let similar = Set(["er", "san"])
        let hit = opts.filter { similar.contains($0) }
        XCTAssertEqual(hit.count, 1, "默认恰好放 1 个形近，逼孩子看字形（不退回全形近老坑、也不全非形近空转）")
    }

    // relax≥1：形近名额清零，候选里不再有形近字 → 连错降难度后更好分辨（零挫败）。
    func testRelaxDropsSimilarDistractor() {
        let opts = EtymologyAssets.buildOptions("yi", relax: 1)
        XCTAssertEqual(opts.count, 4)
        XCTAssertTrue(opts.contains("yi"))
        XCTAssertFalse(opts.contains("er"), "relax 后撤掉形近 二")
        XCTAssertFalse(opts.contains("san"), "relax 后撤掉形近 三")
    }

    // relax 过渡稳定：非形近候选在 relax 前后保留（只换掉形近槽，不整盘洗牌、不让孩子困惑）。
    func testRelaxKeepsNonSimilarStable() {
        let base = Set(EtymologyAssets.buildOptions("yi", relax: 0)).subtracting(["yi", "er", "san"])
        let relaxed = Set(EtymologyAssets.buildOptions("yi", relax: 1))
        XCTAssertTrue(base.isSubset(of: relaxed), "relax 前的非形近候选应原样保留")
    }

    // 无形近字的字（如「手」contrastTargets 为空）：默认即全非形近，不报错、仍 4 选 1。
    func testCharWithoutSimilarStillBuilds() {
        let opts = EtymologyAssets.buildOptions("shou", relax: 0)
        XCTAssertEqual(opts.count, 4)
        XCTAssertTrue(opts.contains("shou"))
        XCTAssertEqual(Set(opts).count, 4, "无重复")
    }

    // 确定性：同字同 relax 多次调用结果一致（便于复习与断言）。
    func testDeterministic() {
        XCTAssertEqual(EtymologyAssets.buildOptions("ren", relax: 0),
                       EtymologyAssets.buildOptions("ren", relax: 0))
    }
}
