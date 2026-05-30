import SwiftUI

// 路由根 · 每字五步链路（认读→[象形彩蛋]→认字→跟读→写）+ 单元收尾（组练→庆祝→结果）+ 商业/家长入口
// 顺序门由 AppModel 把守：没认读不能认字、没认字不能跟读、没跟读不能写完通过（红线护城河）。
struct RootView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        ZStack {
            Theme.paperCream.ignoresSafeArea()
            content
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .opacity))
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.route {
        case .map:                 P01MapView()
        case .unit:                P02UnitView()
        case .recognize(let id):   P03RecognizeView(charId: id)
        case .etymology(let id):   P03EtymologyView(charId: id)
        case .writing(let id):     P04WriteView(charId: id)
        case .followRead(let id):  P05aFollowReadView(charId: id)
        case .imageCard(let id):   P05ImageCardView(charId: id)
        case .group:               P06GroupView()
        case .celebrate:           P07CelebrateView()
        case .result:              P08ResultView()
        case .purchase:            P09PurchaseView()
        case .treasury:            P10TreasuryView()
        case .parentCenter:        P11ParentView()
        }
    }
}
