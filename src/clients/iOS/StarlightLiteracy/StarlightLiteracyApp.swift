import SwiftUI

@main
struct StarlightLiteracyApp: App {
    @StateObject private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
                .preferredColorScheme(.light)
                .tint(Theme.honeyGold)
        }
    }
}
