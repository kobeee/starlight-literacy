import XCTest
@testable import StarlightLiteracy

// 第三刀 · 家长门（母题 C 合规）· 2026-06-03
// 红线 §1 付费透明 / 防误扣：付费方案、家长中心入口必须先过家长验证门，防孩子一指直达。
// 锁住：① 算术题答案恒 = a×b、操作数在范围内；② 未验证时 requestGated 拦在门外（不跳页）；
//      ③ 通过后放行待跳页 + 本会话不再拦；④ 取消不跳页。
@MainActor
final class ParentGateTests: XCTestCase {

    override func setUp() {
        super.setUp()
        UserDefaults.standard.removeObject(forKey: "starlight.progress.v1")
    }

    // 算术挑战：答案恒为乘积，操作数 3...9（不会出现 ×0/×1 的送分题）。
    func testChallengeAnswerIsProduct() {
        for _ in 0..<200 {
            let c = ParentChallenge.make()
            XCTAssertEqual(c.answer, c.a * c.b)
            XCTAssertTrue((3...9).contains(c.a) && (3...9).contains(c.b), "操作数应在 3...9")
        }
    }

    // 未验证：付费入口被拦，停在门外、不直接跳付费页。
    func testGatedRouteBlockedBeforeVerify() {
        let m = AppModel()
        XCTAssertFalse(m.parentVerified)
        m.requestGated(.purchase)
        XCTAssertEqual(m.pendingGate, .purchase, "未验证应挂起为待放行，不直接跳页")
        XCTAssertEqual(m.route, .map, "未验证不应跳到付费页")
    }

    // 通过门：放行待跳页 + 标记本会话已验证 + 清空挂起。
    func testPassGateNavigatesAndUnlocks() {
        let m = AppModel()
        m.requestGated(.parentCenter)
        m.passGate()
        XCTAssertTrue(m.parentVerified)
        XCTAssertNil(m.pendingGate)
        XCTAssertEqual(m.route, .parentCenter)
    }

    // 本会话验证过后，再点付费入口直接放行、不再弹门。
    func testVerifiedSessionSkipsGate() {
        let m = AppModel()
        m.requestGated(.parentCenter); m.passGate()
        m.requestGated(.purchase)
        XCTAssertNil(m.pendingGate, "已验证会话不应再挂门")
        XCTAssertEqual(m.route, .purchase, "已验证应直接放行")
    }

    // 取消：不跳页、清空挂起。
    func testCancelGateDoesNotNavigate() {
        let m = AppModel()
        m.requestGated(.purchase)
        m.cancelGate()
        XCTAssertNil(m.pendingGate)
        XCTAssertEqual(m.route, .map)
        XCTAssertFalse(m.parentVerified)
    }
}
