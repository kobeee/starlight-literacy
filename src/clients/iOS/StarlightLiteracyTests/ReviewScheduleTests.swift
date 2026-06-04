import XCTest
@testable import StarlightLiteracy

// 第四刀 · 艾宾浩斯间隔复现（复现的「时间维度」面）· 2026-06-03
// 锁住：① 遗忘曲线档位/到期判定/毕业封顶（纯函数）；② 未学完的字不进复习队列；
//      ③ 到期判定吃时间（隔天才到期）；④ recordReview 推进档位 + 刷新「最近见到」→ 暂时移出队列；
//      ⑤ 走完全部间隔即巩固毕业、不再排；⑥ 留存证据计数正确（亮给家长的护城河感知层）。
@MainActor
final class ReviewScheduleTests: XCTestCase {

    override func setUp() {
        super.setUp()
        UserDefaults.standard.removeObject(forKey: "starlight.progress.v1")
    }

    private let day: TimeInterval = 86_400

    // ── 纯调度函数 ────────────────────────────────────────
    func testGraduateStageMatchesIntervals() {
        XCTAssertEqual(ReviewSchedule.graduateStage, ReviewSchedule.intervalsDays.count)
        XCTAssertFalse(ReviewSchedule.isGraduated(stage: ReviewSchedule.graduateStage - 1))
        XCTAssertTrue(ReviewSchedule.isGraduated(stage: ReviewSchedule.graduateStage))
    }

    func testDueDatePerStageAndGraduation() {
        let t = Date(timeIntervalSince1970: 1_000_000)
        XCTAssertEqual(ReviewSchedule.dueDate(stage: 0, since: t), t.addingTimeInterval(1 * day))
        XCTAssertEqual(ReviewSchedule.dueDate(stage: 1, since: t), t.addingTimeInterval(2 * day))
        XCTAssertEqual(ReviewSchedule.dueDate(stage: 4, since: t), t.addingTimeInterval(15 * day))
        XCTAssertNil(ReviewSchedule.dueDate(stage: ReviewSchedule.graduateStage, since: t),
                     "毕业档不再排复习")
    }

    func testIsDueBoundary() {
        let t = Date(timeIntervalSince1970: 2_000_000)
        XCTAssertFalse(ReviewSchedule.isDue(stage: 0, since: t, now: t.addingTimeInterval(day - 1)),
                       "差一秒不到期")
        XCTAssertTrue(ReviewSchedule.isDue(stage: 0, since: t, now: t.addingTimeInterval(day)),
                      "正好到点即到期")
    }

    func testAdvanceCapsAtGraduate() {
        var s = 0
        for _ in 0..<10 { s = ReviewSchedule.advance(stage: s) }
        XCTAssertEqual(s, ReviewSchedule.graduateStage, "推进封顶到毕业档，不越界")
    }

    // ── AppModel 集成 ─────────────────────────────────────
    func testUnpassedCharNeverDue() {
        let m = AppModel()
        XCTAssertTrue(m.dueReviewIDs(now: Date().addingTimeInterval(30 * day)).isEmpty,
                      "没学完的字永远不进复习队列")
    }

    func testSeededCharsDueOnlyAfterFirstInterval() {
        let m = AppModel()
        m.seedDebugProgress()                       // 全 20 字 passed，stage0，passedAt≈now
        let base = Date()
        XCTAssertTrue(m.dueReviewIDs(now: base).isEmpty, "刚学完当天不该到期")
        XCTAssertEqual(m.dueReviewIDs(now: base.addingTimeInterval(day + 60)).count,
                       Unit01.order.count, "过 1 天后全部到期")
    }

    func testRecordReviewAdvancesAndDefersChar() {
        let m = AppModel()
        m.seedDebugProgress()
        XCTAssertEqual(m.reviewStage["yi"], 0)
        m.recordReview("yi")
        XCTAssertEqual(m.reviewStage["yi"], 1, "复习成功推进一档")

        let t0 = Date()
        // stage1 间隔 2 天：过 1 天不该再到期，过 3 天才到期
        XCTAssertFalse(m.dueReviewIDs(now: t0.addingTimeInterval(day + 60)).contains("yi"),
                       "刚复习过的字 1 天内不再排")
        XCTAssertTrue(m.dueReviewIDs(now: t0.addingTimeInterval(3 * day)).contains("yi"),
                      "到下一档间隔后再次到期")
    }

    func testRetentionCountsForParent() {
        let m = AppModel()
        m.seedDebugProgress()
        XCTAssertEqual(m.reviewedCharCount, 0)
        XCTAssertEqual(m.masteredCharCount, 0)

        m.recordReview("yi"); m.recordReview("er")
        XCTAssertEqual(m.reviewedCharCount, 2, "复习过一轮即计入「隔天还认得」")

        // 把「yi」推到毕业
        for _ in 0..<ReviewSchedule.graduateStage { m.recordReview("yi") }
        XCTAssertEqual(m.reviewStage["yi"], ReviewSchedule.graduateStage)
        XCTAssertEqual(m.masteredCharCount, 1, "走完全部间隔即巩固毕业")
        XCTAssertFalse(m.dueReviewIDs(now: Date().addingTimeInterval(100 * day)).contains("yi"),
                       "毕业的字不再排复习")
    }
}
