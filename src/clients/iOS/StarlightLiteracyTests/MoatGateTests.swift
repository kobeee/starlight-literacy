import XCTest
@testable import StarlightLiteracy

// 护城河断言 · 2026-05-29 教学法重审后新顺序门：认读 → 认字 → 跟读 → 写（写=完成）。
// 顺序门是系统级不可绕过边界，不是「按钮置灰」表演——绕过 UI 直接调用模型也无法跳步通过。
@MainActor
final class MoatGateTests: XCTestCase {

    private var firstChar: String { Unit01.order.first ?? "yi" }

    override func setUp() {
        super.setUp()
        // 进度持久化（C3）会污染测试，每次清空。
        UserDefaults.standard.removeObject(forKey: "starlight.progress.v1")
    }

    // 门 1：没认读，认字不可记。
    func testIdentifyBlockedBeforeRecognize() {
        let m = AppModel()
        let id = firstChar
        XCTAssertFalse(m.canEnterImageCard(id))
        m.markIdentified(id, stars: 3)            // 直接调用，企图跳过认读
        XCTAssertFalse(m.identifiedIDs.contains(id), "未认读不应记认字")
    }

    // 门 2：没认字，跟读不可记。
    func testFollowBlockedBeforeIdentify() {
        let m = AppModel()
        let id = firstChar
        m.markRecognized(id)
        XCTAssertFalse(m.canEnterFollow(id))
        m.markFollowed(id)                        // 直接调用，企图跳过认字
        XCTAssertFalse(m.followedIDs.contains(id), "未认字不应记跟读")
    }

    // 门 3：没跟读，写完不可通过。
    func testWriteBlockedBeforeFollow() {
        let m = AppModel()
        let id = firstChar
        m.markRecognized(id)
        m.markIdentified(id, stars: 3)
        XCTAssertFalse(m.canEnterWriting(id))
        m.markWritten(id)                         // 直接调用，企图跳过跟读
        XCTAssertFalse(m.passedIDs.contains(id), "未跟读不应写完通过")
        XCTAssertEqual(m.starsByChar[id] ?? 0, 0)
    }

    // 合法顺序：认读 → 认字 → 跟读 → 写，逐门解锁；星级取自认字表现。
    func testLegitimateSequenceUnlocks() {
        let m = AppModel()
        let id = firstChar

        m.markRecognized(id)
        XCTAssertTrue(m.canEnterImageCard(id))

        m.markIdentified(id, stars: 2)
        XCTAssertTrue(m.identifiedIDs.contains(id))
        XCTAssertTrue(m.canEnterFollow(id))

        m.markFollowed(id)
        XCTAssertTrue(m.followedIDs.contains(id))
        XCTAssertTrue(m.canEnterWriting(id))

        m.markWritten(id)
        XCTAssertTrue(m.passedIDs.contains(id))
        XCTAssertEqual(m.starsByChar[id], 2, "完成星级应取自看图认字表现")
    }

    // 星数取最大值（零挫败：重学不降星）。
    func testStarsKeepMax() {
        let m = AppModel()
        let id = firstChar
        m.markRecognized(id)
        m.markIdentified(id, stars: 1); m.markFollowed(id); m.markWritten(id)
        XCTAssertEqual(m.starsByChar[id], 1)

        m.markIdentified(id, stars: 3); m.markWritten(id)   // 重学，认字拿 3 星
        XCTAssertEqual(m.starsByChar[id], 3)

        m.markIdentified(id, stars: 2); m.markWritten(id)   // 再学，得 2 星
        XCTAssertEqual(m.starsByChar[id], 3, "不应被较低星数覆盖")
    }

    // 门是每字独立的，不是一个全局布尔。
    func testGatesArePerCharacter() {
        let m = AppModel()
        let ids = Array(Unit01.order.prefix(2))
        guard ids.count == 2 else { return XCTFail("Unit01 至少 2 字") }
        m.markRecognized(ids[0]); m.markIdentified(ids[0], stars: 3)
        XCTAssertTrue(m.canEnterFollow(ids[0]))
        XCTAssertFalse(m.canEnterImageCard(ids[1]), "第二字未认读，门不应被第一字打开")
    }

    // 调试种子（仅 -uiTest 启动参数触发）应把整单元置满。
    func testSeedDebugProgressFillsUnit() {
        let m = AppModel()
        m.seedDebugProgress()
        XCTAssertEqual(m.passedIDs.count, Unit01.order.count)
        XCTAssertTrue(m.unitComplete)
        XCTAssertEqual(m.earnedStars, Unit01.order.count * 3)
    }
}
