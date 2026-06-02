import Foundation

// Unit-01 · 启蒙第一课 · 20 字 · 免费完整体验
// 字源真象形/真会意（红线 §7.3），删除直映法残留。与 mh5v2 data/units.js 同源。
enum Unit01 {
    static let unit = Unit(
        id: "unit-01",
        title: "启蒙第一课",
        subtitle: "20 个最基础的象形字 · 完全免费",
        tier: .free,
        charIds: order,
        groups: [
            Array(order[0..<5]), Array(order[5..<10]),
            Array(order[10..<15]), Array(order[15..<20])
        ]
    )

    static let order = [
        "yi", "er", "san", "ren", "kou",
        "shou", "ri", "yue", "shan", "shui",
        "huo", "mu", "mu-eye", "er-ear", "tian",
        "da", "xiao", "shang", "xia", "tu"
    ]

    static let characters: [StarChar] = [
        c("yi", "一", "yī", 1, "一个的一", .指事, "一条平平的横，表示「一」这个数", "一根木棒、一条小路，单独一样东西。", ["er","san"], .gold),
        c("er", "二", "èr", 2, "两个的二", .指事, "两条横线上下排好，表示「二」", "上下两片木板，两层台阶。", ["yi","san"], .sky),
        c("san", "三", "sān", 3, "三个的三", .指事, "三条横线整齐排开，表示「三」", "三层台阶、三条田埂。", ["yi","er"], .grass),
        c("ren", "人", "rén", 2, "人民的人", .象形, "一个人侧身站立的剪影，双腿叉开", "看人走路时双腿一前一后，就是「人」的形状。", ["da"], .apricot),
        c("kou", "口", "kǒu", 3, "开口的口", .象形, "张开的嘴的形状，方方的口", "嘴巴张开像个小方框。", ["tian"], .petal),
        c("shou", "手", "shǒu", 4, "小手的手", .象形, "五指张开的手掌", "数自己的手指：一、二、三、四、五。", [], .gold, .篆文),
        c("ri", "日", "rì", 4, "日子的日", .象形, "圆圆的太阳中间有一点", "抬头看天上的太阳，圆圆的。", ["yue","mu-eye"], .apricot),
        c("yue", "月", "yuè", 4, "月亮的月", .象形, "弯弯的月亮的形状", "晚上看天上的月牙，弯弯的。", ["ri"], .sky),
        c("shan", "山", "shān", 3, "高山的山", .象形, "三座山峰起伏的轮廓", "远处的山一座连一座。", [], .grass),
        c("shui", "水", "shuǐ", 4, "流水的水", .象形, "中间一条主流，两侧是浪花的水", "河水流动，中间深两边浅。", ["huo"], .sky),
        c("huo", "火", "huǒ", 4, "火苗的火", .象形, "燃起的火苗向上窜的形状", "篝火的火苗向上跳。", ["shui"], .apricot),
        c("mu", "木", "mù", 4, "木头的木", .象形, "一棵树：上面树枝下面树根", "院子里的树，上面有枝下面有根。", [], .grass),
        c("mu-eye", "目", "mù", 5, "眼目的目", .象形, "眼睛的形状（古字是侧立的眼）", "对着镜子看自己的眼睛。", ["ri"], .mint),
        c("er-ear", "耳", "ěr", 6, "耳朵的耳", .象形, "侧面看的耳朵的形状", "摸摸自己的耳朵，弯弯的。", [], .petal),
        c("tian", "田", "tián", 5, "田地的田", .象形, "四四方方一块地，中间十字是田埂", "农田被田埂分成四块。", ["kou"], .grass),
        c("da", "大", "dà", 3, "大小的大", .象形, "一个人张开双臂双腿（区别于「人」的合腿）", "张开胳膊比划「这么大」。", ["xiao","ren"], .petal),
        c("xiao", "小", "xiǎo", 3, "大小的小", .指事, "三个小点表示「细小」", "沙子、米粒、小水滴。", ["da"], .gold),
        c("shang", "上", "shàng", 3, "上下的上", .指事, "一条长横上面加一短横，指向上方", "手指头指向天花板。", ["xia"], .sky),
        c("xia", "下", "xià", 3, "上下的下", .指事, "一条长横下面加一短横，指向下方", "手指头指向地板。", ["shang"], .mint),
        c("tu", "土", "tǔ", 3, "泥土的土", .象形, "地面上隆起的一小块土堆", "院子里的土堆、花盆里的土。", [], .apricot)
    ]

    static let byID = Dictionary(uniqueKeysWithValues: characters.map { ($0.id, $0) })

    static func char(_ id: String) -> StarChar { byID[id] ?? characters[0] }

    static func next(after id: String) -> StarChar? {
        guard let i = order.firstIndex(of: id), i + 1 < order.count else { return nil }
        return byID[order[i + 1]]
    }

    static func groupIndex(of id: String) -> Int {
        for (gi, g) in unit.groups.enumerated() where g.contains(id) { return gi }
        return 0
    }

    // source 默认 .甲骨文（多数字真有甲骨字形）；个别字（如「手」甲骨无清晰独体形）按真出处覆盖，
    // 不强行标「甲骨文」——红线 §7.3 字源真讲。UI 字源时代标签由该 source 驱动。
    private static func c(_ id: String, _ char: String, _ pinyin: String, _ strokes: Int, _ phrase: String,
                          _ type: EtymologyType, _ hook: String, _ life: String,
                          _ contrast: [String], _ color: ColorToken,
                          _ source: EtymologySource = .甲骨文) -> StarChar {
        StarChar(id: id, char: char, pinyin: pinyin,
                 etymology: Etymology(type: type, source: source, glyphHook: hook, lifeMapping: life, contrastTargets: contrast),
                 strokes: strokes, phrase: phrase, color: color)
    }
}

// 一期单元清单 stub：Unit-01 落地，Unit-02~87 占位（显式标记待生产，不伪装成成品）
struct PlaceholderUnit: Identifiable {
    let id: String; let title: String; let charCount: Int
}
enum Phase1 {
    static let placeholderUnits: [PlaceholderUnit] = (2...12).map {
        PlaceholderUnit(id: String(format: "unit-%02d", $0), title: "第 \($0) 单元", charCount: 15)
    }
    static let totalUnitsPlanned = 87
    static let totalCharsPlanned = 1300
}
