import Foundation

// 艾宾浩斯间隔复习调度（第四刀 · 复现的「时间维度」）
// 教学法五步法第 5 步「复现」= 在新情境再遇见这个字。P06 已覆盖「本课结尾即时再认」那一面；
// 这里补「按遗忘曲线的间隔重认」那一面（隔天/隔几天再认前面学过的字，调研 §二4）。
//
// 设计取舍（2026-06-03 用户拍板 C「间隔复习入口·不推送」）：
//   · 不做本地推送通知（打扰 + 权限风险，留二阶段）——靠孩子/家长自然回到 app 时给出「今日复习」入口。
//   · 单 Unit-01 范围内靠 -uiTest -fastForwardDays N 快进时间演示「隔天到期」。
//
// 纯函数、无副作用、可单测；不依赖 AppModel / 时间「现在」由调用方传入。
enum ReviewSchedule {
    // 每一轮复习成功后，到下一轮的间隔（天）。经典艾宾浩斯近似：1→2→4→7→15。
    // stage 含义 = 已完成的复习轮次：0 = 刚学完(passedAt)还没复习过；intervalsDays[stage] = 到下次复习的天数。
    static let intervalsDays: [Int] = [1, 2, 4, 7, 15]

    // 走完全部间隔即「巩固毕业」，不再排复习（留存证据给家长看）。
    static var graduateStage: Int { intervalsDays.count }   // = 5

    static func isGraduated(stage: Int) -> Bool { stage >= graduateStage }

    /// 该字下一次该复习的时刻；返回 nil = 已巩固毕业，不再排。
    /// since = 上次见到这个字的时刻（初学=passedAt，复习后=lastReviewAt）。
    static func dueDate(stage: Int, since: Date) -> Date? {
        guard stage >= 0, stage < intervalsDays.count else { return nil }
        return since.addingTimeInterval(Double(intervalsDays[stage]) * 86_400)
    }

    /// 到了复习时间（now 已过 dueDate）且尚未毕业。
    static func isDue(stage: Int, since: Date, now: Date) -> Bool {
        guard let due = dueDate(stage: stage, since: since) else { return false }
        return now >= due
    }

    /// 复习成功后推进一档（封顶到毕业档，不越界）。
    static func advance(stage: Int) -> Int {
        min(stage + 1, graduateStage)
    }
}
