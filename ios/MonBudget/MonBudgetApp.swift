import SwiftUI
import SwiftData

@main
struct MonBudgetApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [Mouvement.self, PlanMensuel.self])
    }
}

struct ContentView: View {
    var body: some View {
        TabView {
            AccueilView()
                .tabItem { Label("Accueil", systemImage: "house.fill") }
            DiagrammesView()
                .tabItem { Label("Diagrammes", systemImage: "chart.pie.fill") }
            EpargneView()
                .tabItem { Label("Épargne", systemImage: "banknote.fill") }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Mouvement.self, PlanMensuel.self], inMemory: true)
}
