import SwiftUI

// 字源演化 + 看图认字资产 · 与 mh5v2 etymology-assets.js / imagecard-assets.js 同源
// 红线 §7.3：字源真讲；字源彩蛋只给可解释为具体可见之物的字，禁直映法牵强联想。
// iOS 真图资源在 Assets.xcassets: scene_* / oracle_*；生成脚本见 tools/ios-assets/generate-ios-image-assets.mjs。

struct Era: Identifiable {
    let id: String
    let label: String
    let subtitle: String
    let color: Color
}

enum EtymologyAssets {
    static let etymologyEggIds: Set<String> = [
        "ren", "kou", "shou", "ri", "yue", "shan", "shui",
        "huo", "mu", "mu-eye", "er-ear", "tian", "da", "tu"
    ]

    static func hasEtymologyEgg(_ id: String) -> Bool {
        etymologyEggIds.contains(id)
    }

    static let eras: [Era] = [
        Era(id: "oracle", label: "甲骨文", subtitle: "刻在龟甲上 · 三千多年前", color: Color(hex: 0x8B5E00)),
        Era(id: "bronze", label: "金文",   subtitle: "铸在青铜器上 · 两千多年前", color: Color(hex: 0xA0763C)),
        Era(id: "seal",   label: "小篆",   subtitle: "秦朝统一的字 · 两千年前", color: Color(hex: 0x7A6A55)),
        Era(id: "modern", label: "楷书",   subtitle: "我们今天写的字", color: Color(hex: 0x5D4A36))
    ]

    // 4 段叙事：origin 来源 / shape 古字像什么 / connect 与今字的连接 / observe 生活观察
    struct Story { let origin, shape, connect, observe: String }

    static let stories: [String: Story] = [
        "yi":   Story(origin: "刻在甲骨上的一根横线。", shape: "古人想表达「一个」，最简单的就是画一道。", connect: "三千年前一道横，今天还是这一横。", observe: "找一找：你手里的一支笔、一个苹果。"),
        "er":   Story(origin: "甲骨文上两道平行的横。", shape: "比「一」多一道，就是「二」。", connect: "横线从一道变两道，写法没变过。", observe: "你的两只手、两只眼睛。"),
        "san":  Story(origin: "甲骨文上整齐排的三道横。", shape: "再多加一道，就是「三」。", connect: "中国数字从最简单一二三开始。", observe: "三层楼、三个手指头。"),
        "ren":  Story(origin: "甲骨文画的是侧身站着的人。", shape: "古字一撇一捺，像人迈开两条腿。", connect: "两笔的「人」就是侧面剪影的简化。", observe: "看路边走路的人，腿一前一后。"),
        "kou":  Story(origin: "甲骨文画的是张开的嘴。", shape: "古字像一个方框，就是嘴的轮廓。", connect: "今天的「口」还保留方框形。", observe: "对着镜子张大嘴看看。"),
        "shou": Story(origin: "篆文画的是五指张开的手。", shape: "古字能数出五根手指。", connect: "今天的「手」上面三笔来自三根手指。", observe: "把你的小手伸开看看。"),
        "ri":   Story(origin: "甲骨文中间一个圆，里头一点。", shape: "圆是太阳的轮廓，中间加一点，告诉我们这是太阳。", connect: "为了好写，圆变成了方框。", observe: "中午抬头看天上的太阳。"),
        "yue":  Story(origin: "甲骨文画的是弯弯的月牙。", shape: "月亮不像太阳那么圆，常常是缺的。", connect: "「月」中间两横，是月亮里的纹路。", observe: "晚上看天上的月亮形状。"),
        "shan": Story(origin: "甲骨文画三座山峰起伏。", shape: "三个尖尖的山头并排。", connect: "今天的「山」中间一峰高，两边略矮。", observe: "远方一座连着一座的山。"),
        "shui": Story(origin: "甲骨文画的是流动的河。", shape: "中间一道主流，两边是小浪花。", connect: "「水」中间一竖钩就是主流。", observe: "下雨天看水从屋檐流下来。"),
        "huo":  Story(origin: "甲骨文画的是燃烧的火苗。", shape: "古字像几缕火舌往上窜。", connect: "今天的「火」两点就是飞出来的火星。", observe: "看锅下面的灶火怎么跳。"),
        "mu":   Story(origin: "甲骨文画的是一棵树。", shape: "上面是树枝，下面是树根。", connect: "「木」一横一竖一撇一捺正是这棵树。", observe: "你家附近最高的树。"),
        "mu-eye": Story(origin: "甲骨文画的是侧立的眼睛。", shape: "古字是一只眼睛立起来的样子。", connect: "「目」中间两横是眼皮和瞳仁。", observe: "对着镜子认真看你的眼睛。"),
        "er-ear": Story(origin: "甲骨文画的是耳朵的侧面。", shape: "古字像耳廓的弯弯曲线。", connect: "「耳」上下两横是耳骨和耳垂。", observe: "摸一下自己的耳朵形状。"),
        "tian": Story(origin: "甲骨文画的是被田埂分开的田地。", shape: "外框是地界，里面十字是田埂。", connect: "「田」就是俯视一块农田。", observe: "坐车经过乡下看田地。"),
        "da":   Story(origin: "甲骨文画的是张开手脚的人。", shape: "古人想说「大」就画一个人张得很开。", connect: "比「人」多一横，那一横就是张开的双臂。", observe: "张开双臂比一个「大」字。"),
        "xiao": Story(origin: "甲骨文用三个小点表示细小。", shape: "点点比线条更小，所以用点。", connect: "今天的「小」中间一竖两点。", observe: "看看米粒、沙子、芝麻。"),
        "shang":Story(origin: "甲骨文一长横在下，一短横在上。", shape: "短横指着上面的方向。", connect: "今天的「上」还保留指向上方的小横。", observe: "用手指头指天花板。"),
        "xia":  Story(origin: "甲骨文一长横在上，一短横在下。", shape: "短横指着下面的方向。", connect: "今天的「下」一竖一点指向地面。", observe: "用手指头指地板。"),
        "tu":   Story(origin: "甲骨文是地面上隆起的一堆土。", shape: "古字下面是地面，上面是土堆。", connect: "「土」就是地+土堆的轮廓。", observe: "院子里、花盆里的泥土。")
    ]

    static func story(_ id: String) -> Story {
        stories[id] ?? Story(origin: "", shape: "", connect: "", observe: "")
    }

    // 易混对照提示
    static func contrastTip(_ curId: String, _ otherId: String) -> String? {
        guard let cur = Unit01.byID[curId], let oth = Unit01.byID[otherId] else { return nil }
        return "「\(cur.char)」和「\(oth.char)」长得像，但\(cur.etymology.glyphHook)，\(oth.etymology.glyphHook)。"
    }

    // 4 选 1 候选构建 · 2026-06-02 母题B 改造：P05 候选是「字」不是「图」，孩子必须盯字形本身挑。
    // 干扰项「混搭」策略（避开两头老坑）：
    //   旧①「全形近」(一/二/三/土) → 既挫败又测不出（横线全一样）。
    //   旧②「全非形近」（配图连连看）→ 不用看字形也能过，「形」这一环空转。
    //   新：默认放 1 个形近字逼孩子看字形细节 + 其余非形近拉开梯度；
    //       零挫败时 relax>0 撤掉形近名额、换成非形近，连错也能分辨、保证过关。
    // relax：降级级数，每升一级少放一个形近干扰（由 P05 在孩子连错时调高）。
    // 确定性（seed + 顺序固定）：同字每次候选稳定，便于复习与单测断言。
    static func buildOptions(_ currentId: String, relax: Int = 0) -> [String] {
        let all = Unit01.order
        let cur = Unit01.byID[currentId]
        let contrast = (cur?.etymology.contrastTargets ?? []).filter { $0 != currentId }
        var nonSimilar = all.filter { $0 != currentId && !contrast.contains($0) }
        let seed = Int(currentId.unicodeScalars.first?.value ?? 0)

        var distractors: [String] = []
        // 形近名额：默认 1，relax 后递减到 0（零挫败降级）
        let similarQuota = max(0, 1 - relax)
        var similarPool = contrast
        while distractors.count < similarQuota && !similarPool.isEmpty {
            distractors.append(similarPool.removeFirst())   // 确定性取首个形近
        }
        // 其余补非形近，确定性 seed 取，拉开梯度
        var k = 0
        while distractors.count < 3 && !nonSimilar.isEmpty {
            let idx = (seed + k * 7) % nonSimilar.count
            distractors.append(nonSimilar.remove(at: idx))
            k += 1
        }
        // 兜底：非形近耗尽仍不够（极端），再补形近
        while distractors.count < 3 && !similarPool.isEmpty {
            distractors.append(similarPool.removeFirst())
        }
        return ([currentId] + distractors.prefix(3)).sorted()
    }
}
