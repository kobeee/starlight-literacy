export const REQUIRED_COURSE_FIELDS = [
  "glyphHook",
  "lifeMapping",
  "structureFocus",
  "strokeGoal",
  "soundCue",
  "contrastTargets",
  "nativeLesson",
  "practiceChecks",
  "parentProof",
  "assetBrief",
  "videoPlan"
];

const videoNotPlanned = (reason) => ({
  status: "not-planned",
  reason,
  targetDuration: "4-6s",
  acceptance: [
    "0.8s 内出现字形钩子",
    "字形由代码或字体渲染",
    "final frame 可作为弱网复习卡",
    "通过 lint / inspect / render / 截图 review"
  ]
});

export const lessonDetails = {
  yi: {
    glyphHook: "一条平平的横线",
    lifeMapping: "从一条小路、一个苹果、一根木棒归纳出“一条”的感觉。",
    structureFocus: "横线数量：一条",
    strokeGoal: "从左到右画一条平稳的横线。",
    soundCue: "一个、一条、一根，都有一个平平的一。",
    contrastTargets: ["er", "san"],
    nativeLesson: {
      place: "阳光小院",
      title: "找「一」",
      cue: "看见一条小路，就能想起平平的“一”。",
      action: "找小路",
      props: ["小路", "苹果", "木棒"]
    },
    practiceChecks: {
      visual: "从一、二、三中辨认一条横线。",
      audio: "听“一个 / 一条 / 一根”选「一」。",
      meaning: "把生活里的单个物件和「一」连接。",
      review: "间隔后再次区分一、二、三。"
    },
    parentProof: "孩子能从一条小路、一根木棒里发现横线结构，再把它画出来。",
    assetBrief: {
      scene: "暖阳小院里的单条石子小路，旁边有一个苹果和一根木棒。",
      objects: ["single path", "apple", "wooden stick"],
      promptTags: ["line-count", "single-object", "warm-yard"]
    },
    videoPlan: {
      status: "legacy-sample-needs-redo",
      targetDuration: "4-6s",
      problem: "当前样片超过 8s 且依赖 Web Speech voiceCues，只作为历史参考。",
      firstFrameHook: "0.8s 内让小路收束成一条横线。",
      voiceCue: "一个苹果。一条小路。一根木棒。都是一。"
    }
  },
  er: {
    glyphHook: "上下一共两条横线",
    lifeMapping: "两块木板、两层台阶、两片云上下排好。",
    structureFocus: "横线数量：两条，上短下长",
    strokeGoal: "先画上面一条，再画下面一条。",
    soundCue: "上面一条，下面一条，两条就是二。",
    contrastTargets: ["yi", "san"],
    nativeLesson: {
      place: "花田木台",
      title: "数「二」",
      cue: "两块木板一上一下，像「二」站好了。",
      action: "数木板",
      props: ["木板", "台阶", "云朵"]
    },
    practiceChecks: {
      visual: "辨认两条横线，不被一条或三条干扰。",
      audio: "听“两个 / 第二”选「二」。",
      meaning: "把两个物件和两条线连接。",
      review: "与一、三混排复认。"
    },
    parentProof: "孩子能按上下顺序观察两条横线，理解数量和字形是一一对应的。",
    assetBrief: {
      scene: "花田边两块暖色木板上下摆放，形成清楚的二层关系。",
      objects: ["two wooden planks", "two steps", "two clouds"],
      promptTags: ["line-count", "two-level", "meadow"]
    },
    videoPlan: videoNotPlanned("等待「一」标准样片通过后再制作两条线范式。")
  },
  san: {
    glyphHook: "三条横线排成小队",
    lifeMapping: "三座小山、三条田埂、三层矮台从上到下排开。",
    structureFocus: "横线数量：三条，间距均匀",
    strokeGoal: "从上到下画三条横线。",
    soundCue: "三条线排整齐，就是三。",
    contrastTargets: ["yi", "er"],
    nativeLesson: {
      place: "小山坡",
      title: "摆「三」",
      cue: "三座小山排好队，帮我们记住「三」。",
      action: "摆小山",
      props: ["小山", "田埂", "矮台"]
    },
    practiceChecks: {
      visual: "辨认三条横线，观察数量和排列。",
      audio: "听“三个 / 三朵”选「三」。",
      meaning: "把三个生活物件和三条线连接。",
      review: "与一、二混排复认。"
    },
    parentProof: "孩子能区分一、二、三的横线数量，并开始观察长短和排列。",
    assetBrief: {
      scene: "三座圆润小山在暖阳下排成清楚的三层节奏。",
      objects: ["three hills", "three field ridges", "three low steps"],
      promptTags: ["line-count", "three-rhythm", "hillside"]
    },
    videoPlan: videoNotPlanned("等待「一」标准样片通过后再制作三条线范式。")
  },
  da: {
    glyphHook: "人张开手脚变大",
    lifeMapping: "孩子张开双臂、大树展开树冠，形成“大”的舒展感。",
    structureFocus: "撇捺展开与中心支撑",
    strokeGoal: "先站直，再向两边张开。",
    soundCue: "张开手臂，大大的大。",
    contrastTargets: ["ren", "tian", "xiao"],
    nativeLesson: {
      place: "大树旁",
      title: "张开「大」",
      cue: "身体张开，撇和捺也张开。",
      action: "张开手",
      props: ["张开手臂", "大树", "大伞"]
    },
    practiceChecks: {
      visual: "辨认撇捺张开的“大”。",
      audio: "听“大人 / 大树”选「大」。",
      meaning: "理解大小关系中的“大”。",
      review: "与人、天、小复认。"
    },
    parentProof: "孩子能用身体张开的动作记住“大”的撇捺结构。",
    assetBrief: {
      scene: "孩子在树下张开双臂，树冠也柔和展开。",
      objects: ["open arms", "big tree", "wide canopy"],
      promptTags: ["body-action", "big-small", "open-shape"]
    },
    videoPlan: videoNotPlanned("等待身体动作范式代表字「人」稳定后再评估。")
  },
  xiao: {
    glyphHook: "中间一竖，两边小点",
    lifeMapping: "小种子发芽，中间长高，两边冒出小叶。",
    structureFocus: "中心竖线与左右点",
    strokeGoal: "画中间一竖，再点两边。",
    soundCue: "中间一竖，两边小点，是小。",
    contrastTargets: ["da"],
    nativeLesson: {
      place: "小种子盆",
      title: "看「小」",
      cue: "小芽中间站起来，两边点一点。",
      action: "点小芽",
      props: ["小种子", "小脚印", "小花苞"]
    },
    practiceChecks: {
      visual: "辨认中竖和两点结构。",
      audio: "听“小手 / 小花”选「小」。",
      meaning: "理解大小对比中的“小”。",
      review: "与大复认。"
    },
    parentProof: "孩子能把小芽的中间和两边对应到“小”的字形。",
    assetBrief: {
      scene: "暖米纸面上的小花盆，一颗种子冒出中间新芽和两片小叶。",
      objects: ["seed sprout", "tiny footprints", "bud"],
      promptTags: ["big-small", "center-side", "sprout"]
    },
    videoPlan: videoNotPlanned("先保证 native micro-lesson。")
  },
  shang: {
    glyphHook: "一竖站着，短横在上面",
    lifeMapping: "气球升到架子上方，太阳在山上。",
    structureFocus: "上下位置：上方参照",
    strokeGoal: "先立一竖，再确认哪一笔在上面。",
    soundCue: "在上面，就是上。",
    contrastTargets: ["xia"],
    nativeLesson: {
      place: "云朵梯子",
      title: "看「上」",
      cue: "小气球升起来，停在上面。",
      action: "找上面",
      props: ["气球", "山上太阳", "高架"]
    },
    practiceChecks: {
      visual: "辨认上方短横和底线关系。",
      audio: "听“上面 / 上山”选「上」。",
      meaning: "理解上下空间关系。",
      review: "与下复认。"
    },
    parentProof: "孩子能用气球上升的空间关系解释“上”。",
    assetBrief: {
      scene: "热气球缓缓升到云朵上方，下面有清楚参照线。",
      objects: ["balloon", "cloud ladder", "sun above hill"],
      promptTags: ["position", "above", "sky"]
    },
    videoPlan: videoNotPlanned("先完成第 2 组 native micro-lesson。")
  },
  xia: {
    glyphHook: "一点落在竖线下面",
    lifeMapping: "雨滴从云朵下落，果子落到篮子里。",
    structureFocus: "上下位置：下方落点",
    strokeGoal: "先画横竖，再让一点落下来。",
    soundCue: "往下面落，就是下。",
    contrastTargets: ["shang"],
    nativeLesson: {
      place: "小雨棚",
      title: "看「下」",
      cue: "小雨滴从云下面落下来。",
      action: "接雨滴",
      props: ["雨滴", "篮子", "云朵"]
    },
    practiceChecks: {
      visual: "辨认落在下方的点。",
      audio: "听“下面 / 下雨”选「下」。",
      meaning: "理解向下和下方。",
      review: "与上复认。"
    },
    parentProof: "孩子能用雨滴下落解释“下”的位置关系。",
    assetBrief: {
      scene: "一朵云下面落下几颗温柔雨滴，底部有小篮子承接。",
      objects: ["raindrop", "basket", "cloud"],
      promptTags: ["position", "below", "rain"]
    },
    videoPlan: videoNotPlanned("先完成第 2 组 native micro-lesson。")
  },
  ren: {
    glyphHook: "两笔撑住，像人站稳",
    lifeMapping: "一个人两条腿站稳，也像小木架撑起来。",
    structureFocus: "撇捺支撑",
    strokeGoal: "先向左下，再向右下，站稳。",
    soundCue: "两笔靠一靠，站成一个人。",
    contrastTargets: ["da", "tian"],
    nativeLesson: {
      place: "花田小路",
      title: "站成「人」",
      cue: "两笔像两条腿，稳稳站住。",
      action: "站稳",
      props: ["人站立", "小木架", "两条腿"]
    },
    practiceChecks: {
      visual: "辨认撇捺支撑结构。",
      audio: "听“大人 / 小人”选「人」。",
      meaning: "把身体站立和字形连接。",
      review: "与大、天复认。"
    },
    parentProof: "孩子能把两笔支撑和人站稳的动作联系起来。",
    assetBrief: {
      scene: "小朋友站在花田小路上，两脚形成稳定支撑。",
      objects: ["standing child", "two legs", "wooden support"],
      promptTags: ["body-action", "support", "person"]
    },
    videoPlan: {
      status: "planned-after-yi",
      targetDuration: "4-6s",
      firstFrameHook: "两条腿站稳后收束成撇捺。",
      voiceCue: "两笔站稳，就是人。"
    }
  },
  kou: {
    glyphHook: "四边围成一个口",
    lifeMapping: "小口唱歌、方形窗、门口，都有围起来的形状。",
    structureFocus: "外框闭合",
    strokeGoal: "按顺序围出一个方口。",
    soundCue: "四边围起来，一个口。",
    contrastTargets: ["ri", "mu-eye"],
    nativeLesson: {
      place: "唱歌窗边",
      title: "围出「口」",
      cue: "小窗四边围起来，像一个口。",
      action: "围一圈",
      props: ["小口", "方窗", "门口"]
    },
    practiceChecks: {
      visual: "辨认闭合方框。",
      audio: "听“小口 / 门口”选「口」。",
      meaning: "理解口和入口的生活含义。",
      review: "与日、目复认。"
    },
    parentProof: "孩子能用四边围起来解释“口”的外框。",
    assetBrief: {
      scene: "暖阳小屋的方形窗户，窗边有唱歌的小表情物件。",
      objects: ["square window", "small mouth", "doorway"],
      promptTags: ["enclosure", "mouth", "window"]
    },
    videoPlan: videoNotPlanned("先完成框形范式 native lesson。")
  },
  shou: {
    glyphHook: "横线像手指，竖线像手腕",
    lifeMapping: "小手挥一挥，手掌和手指形成横竖关系。",
    structureFocus: "横竖组合",
    strokeGoal: "先看手指横线，再画中间竖线。",
    soundCue: "小手挥一挥，记住手。",
    contrastTargets: [],
    nativeLesson: {
      place: "小手工作台",
      title: "挥「手」",
      cue: "几条横线像手指，中间竖线把它们连起来。",
      action: "挥小手",
      props: ["手掌", "手指", "拍手"]
    },
    practiceChecks: {
      visual: "观察横线和竖线组合。",
      audio: "听“小手 / 拍手”选「手」。",
      meaning: "连接身体动作和字形。",
      review: "与身体类字复认。"
    },
    parentProof: "孩子能从手指和手腕观察到“手”的横竖结构。",
    assetBrief: {
      scene: "一只圆润小手在暖色桌面上挥动，手指清楚但不写实。",
      objects: ["child hand", "fingers", "clap"],
      promptTags: ["body", "hand", "gentle"]
    },
    videoPlan: videoNotPlanned("先完成身体器官 native lesson。")
  },
  ri: {
    glyphHook: "方框里有一横，像太阳住在窗里",
    lifeMapping: "太阳被方窗框住，中间一条光线。",
    structureFocus: "框内横线",
    strokeGoal: "围出方框，再画中间一横。",
    soundCue: "方框里一横，太阳的日。",
    contrastTargets: ["kou", "mu-eye"],
    nativeLesson: {
      place: "日出窗",
      title: "照亮「日」",
      cue: "太阳进了方框，中间留下一条光。",
      action: "点太阳",
      props: ["太阳", "方窗", "光线"]
    },
    practiceChecks: {
      visual: "辨认框内一横。",
      audio: "听“日出 / 日子”选「日」。",
      meaning: "连接太阳和日子。",
      review: "与口、目复认。"
    },
    parentProof: "孩子能说明“日”比“口”多了中间一横。",
    assetBrief: {
      scene: "金色太阳从方形窗内升起，中间有一条柔和光线。",
      objects: ["sun", "square frame", "light line"],
      promptTags: ["nature", "sun", "inside-line"]
    },
    videoPlan: videoNotPlanned("先完成自然象形 native lesson。")
  },
  yue: {
    glyphHook: "月亮弯弯，里面有两条光",
    lifeMapping: "月牙挂在暖色夜边，内侧两条光线帮助记形。",
    structureFocus: "外侧竖弯与内侧短横",
    strokeGoal: "先立外框，再补里面两条光。",
    soundCue: "弯弯月亮，藏着月。",
    contrastTargets: [],
    nativeLesson: {
      place: "晚霞月台",
      title: "看「月」",
      cue: "月亮弯弯，里面有两条小光。",
      action: "找月光",
      props: ["月牙", "月光", "晚霞"]
    },
    practiceChecks: {
      visual: "观察月的外侧和内横。",
      audio: "听“月亮 / 月光”选「月」。",
      meaning: "连接月亮与月光。",
      review: "与日等自然字复认。"
    },
    parentProof: "孩子能从月牙和内侧光线记住“月”的结构。",
    assetBrief: {
      scene: "暖色晚霞边的月牙，内侧两道柔和光线，不使用暗蓝紫夜景。",
      objects: ["crescent moon", "moonlight lines", "warm dusk"],
      promptTags: ["nature", "moon", "warm-dusk"]
    },
    videoPlan: videoNotPlanned("先完成自然象形 native lesson。")
  },
  shui: {
    glyphHook: "中间水流，左右分开",
    lifeMapping: "小溪从石头间分流，左右水花展开。",
    structureFocus: "中心竖线与左右分流",
    strokeGoal: "画中间水流，再向两边分开。",
    soundCue: "水流分开，变成水。",
    contrastTargets: [],
    nativeLesson: {
      place: "小溪边",
      title: "流成「水」",
      cue: "中间一条水流，左右轻轻分开。",
      action: "分水流",
      props: ["小溪", "石头", "水花"]
    },
    practiceChecks: {
      visual: "辨认中心和左右分流结构。",
      audio: "听“水流 / 喝水”选「水」。",
      meaning: "连接水流和字形。",
      review: "与自然字复认。"
    },
    parentProof: "孩子能把水流分开的动作对应到“水”的笔画。",
    assetBrief: {
      scene: "清亮小溪绕过石头，形成中间和左右分流。",
      objects: ["stream", "stones", "split water"],
      promptTags: ["nature", "water", "split-flow"]
    },
    videoPlan: videoNotPlanned("先完成自然象形 native lesson。")
  },
  huo: {
    glyphHook: "中间火苗，点撇往外跳",
    lifeMapping: "安全小火苗向上跳，左右小火星帮忙记结构。",
    structureFocus: "中心竖撇与左右点撇",
    strokeGoal: "画火苗向上，再点左右火星。",
    soundCue: "火苗往上跳，亮出火。",
    contrastTargets: [],
    nativeLesson: {
      place: "安全小炉",
      title: "点亮「火」",
      cue: "小火苗向上跳，旁边两点像火星。",
      action: "点火苗",
      props: ["火苗", "火星", "小炉"]
    },
    practiceChecks: {
      visual: "观察火的中心和左右火星。",
      audio: "听“火焰 / 火车”选「火」。",
      meaning: "理解火的安全场景和字形。",
      review: "与自然字复认。"
    },
    parentProof: "孩子能从火苗和火星观察到“火”的中心与两侧结构。",
    assetBrief: {
      scene: "安全、温暖的小火苗在小炉中跳动，无危险大火和烟花。",
      objects: ["small flame", "spark", "safe stove"],
      promptTags: ["nature", "fire", "safe"]
    },
    videoPlan: {
      status: "planned-after-yi",
      targetDuration: "4-6s",
      firstFrameHook: "火苗跳起后高亮中间和左右火星。",
      voiceCue: "火苗跳一跳，就是火。"
    }
  },
  shan: {
    glyphHook: "三座山峰站起来",
    lifeMapping: "中间高峰、两边小峰连成山。",
    structureFocus: "三竖与底部连接",
    strokeGoal: "先立山峰，再连到底部。",
    soundCue: "三座山峰，站成山。",
    contrastTargets: ["san"],
    nativeLesson: {
      place: "小山谷",
      title: "立起「山」",
      cue: "中间高，两边低，三座山峰站起来。",
      action: "立山峰",
      props: ["山峰", "山谷", "云雾"]
    },
    practiceChecks: {
      visual: "辨认三竖和底线。",
      audio: "听“大山 / 上山”选「山」。",
      meaning: "连接山峰轮廓和字形。",
      review: "与三复认，区分横线数量和竖峰结构。"
    },
    parentProof: "孩子能把三座山峰的轮廓归纳成“山”。",
    assetBrief: {
      scene: "三座圆润山峰，中间略高，两边较低，暖阳照在山谷上。",
      objects: ["three peaks", "valley", "soft mist"],
      promptTags: ["nature", "mountain", "three-peaks"]
    },
    videoPlan: {
      status: "planned-after-yi",
      targetDuration: "4-6s",
      firstFrameHook: "三座山峰从地面站起并收束为字形。",
      voiceCue: "三座山峰，站成山。"
    }
  },
  mu: {
    glyphHook: "树干一竖，树枝向两边伸",
    lifeMapping: "一棵树有树干和树枝，像“木”的横竖撇捺。",
    structureFocus: "中心竖、横枝、撇捺展开",
    strokeGoal: "先画树干，再伸出树枝。",
    soundCue: "树干和树枝，长成木。",
    contrastTargets: ["da", "tian"],
    nativeLesson: {
      place: "小树旁",
      title: "长出「木」",
      cue: "树干站中间，树枝往两边伸。",
      action: "伸树枝",
      props: ["树干", "树枝", "树叶"]
    },
    practiceChecks: {
      visual: "观察木的横竖撇捺。",
      audio: "听“木头 / 树木”选「木」。",
      meaning: "连接树和木。",
      review: "与大、天复认。"
    },
    parentProof: "孩子能用树干和树枝解释“木”的结构。",
    assetBrief: {
      scene: "一棵单独小树，树干清楚，树枝向左右伸展，不做森林大场面。",
      objects: ["tree trunk", "branches", "leaves"],
      promptTags: ["nature", "tree", "branch-shape"]
    },
    videoPlan: videoNotPlanned("先完成第 4 组 native micro-lesson。")
  },
  tu: {
    glyphHook: "一竖穿过两横，脚下是土",
    lifeMapping: "小芽从泥土里长出，地面有上下两层。",
    structureFocus: "一竖两横",
    strokeGoal: "先画中间竖，再画上下两横。",
    soundCue: "一竖两横，脚下是土。",
    contrastTargets: ["shi"],
    nativeLesson: {
      place: "泥土花盆",
      title: "站在「土」",
      cue: "小芽从土里长出来，一竖穿过两横。",
      action: "种小芽",
      props: ["泥土", "小芽", "地面"]
    },
    practiceChecks: {
      visual: "辨认一竖两横。",
      audio: "听“泥土 / 土地”选「土」。",
      meaning: "连接地面和泥土。",
      review: "与木等自然字复认。"
    },
    parentProof: "孩子能用小芽从土地里长出解释“土”的一竖两横。",
    assetBrief: {
      scene: "松软泥土中冒出嫩芽，地面上下两层清楚。",
      objects: ["soil", "sprout", "ground layers"],
      promptTags: ["nature", "soil", "vertical-through-lines"]
    },
    videoPlan: videoNotPlanned("先完成第 4 组 native micro-lesson。")
  },
  tian: {
    glyphHook: "四四方方一块地，中间十字是田埂",
    lifeMapping: "农田被田埂分成四块。",
    structureFocus: "外框与中间的十字",
    strokeGoal: "先画外面的方框，再写中间的十字。",
    soundCue: "四四方方一块地，中间一个十字，就是田。",
    contrastTargets: ["kou"],
    nativeLesson: {
      place: "金黄稻田",
      title: "看看「田」",
      cue: "方方的一块地，田埂画成十字，分成四小块。",
      action: "数田块",
      props: ["稻田", "田埂", "四块地"]
    },
    practiceChecks: {
      visual: "辨认方框中间有十字。",
      audio: "听“田地 / 稻田”选「田」。",
      meaning: "连接农田和方方的地。",
      review: "与口复认。"
    },
    parentProof: "孩子能说明「田」是方框里加十字田埂，和「口」的区别是中间多了十字。",
    assetBrief: {
      scene: "一块四方的金黄稻田，被田埂十字分成四小块。",
      objects: ["rice field", "cross field ridge", "four plots"],
      promptTags: ["square", "field", "cross-ridge"]
    },
    videoPlan: videoNotPlanned("先完成第 4 组 native micro-lesson。")
  },
  "mu-eye": {
    glyphHook: "方框里两横，像眼睛里面的线",
    lifeMapping: "一只温柔眼睛被方框归纳，里面有两条线。",
    structureFocus: "框内两横",
    strokeGoal: "围出方框，再画里面两横。",
    soundCue: "像一只眼睛，里面有横线。",
    contrastTargets: ["ri", "kou"],
    nativeLesson: {
      place: "眼睛观察窗",
      title: "看见「目」",
      cue: "眼睛里不只一条线，比“日”多一横。",
      action: "眨眼睛",
      props: ["眼睛", "观察窗", "两条线"]
    },
    practiceChecks: {
      visual: "辨认框内两横。",
      audio: "听“目光 / 目标”选「目」。",
      meaning: "连接眼睛和看见。",
      review: "与日、口复认。"
    },
    parentProof: "孩子能区分“目”和“日”：眼睛里的线更多。",
    assetBrief: {
      scene: "温柔绘本感眼睛和观察窗，避免写实眼球和医学结构。",
      objects: ["gentle eye", "observation window", "inside lines"],
      promptTags: ["body", "eye", "inside-lines"]
    },
    videoPlan: videoNotPlanned("先完成框形易混 native lesson。")
  },
  "er-ear": {
    glyphHook: "耳朵外形和里面的横线",
    lifeMapping: "小兔长耳朵，外轮廓和内侧线条帮忙记“耳”。",
    structureFocus: "外侧竖线与内侧横线",
    strokeGoal: "先画外边，再补里面的线。",
    soundCue: "耳朵旁边，记住耳。",
    contrastTargets: ["mu-eye"],
    nativeLesson: {
      place: "风铃耳朵",
      title: "听见「耳」",
      cue: "耳朵有外边，也有里面的线。",
      action: "听风铃",
      props: ["耳朵", "风铃", "小兔"]
    },
    practiceChecks: {
      visual: "辨认耳的外侧和内部横线。",
      audio: "听“耳朵 / 耳边”选「耳」。",
      meaning: "连接听觉和耳朵。",
      review: "与目复认，区分看和听。"
    },
    parentProof: "孩子能把耳朵轮廓和内侧线条对应到“耳”。",
    assetBrief: {
      scene: "小兔长耳朵听见风铃，耳朵轮廓清楚但不医学化。",
      objects: ["rabbit ear", "wind chime", "inner ear lines"],
      promptTags: ["body", "ear", "listening"]
    },
    videoPlan: videoNotPlanned("先完成身体器官 native lesson。")
  }
};
