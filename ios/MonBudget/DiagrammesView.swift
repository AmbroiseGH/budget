import SwiftUI
import SwiftData
import Charts

struct DiagrammesView: View {
    @Query(sort: \Mouvement.date) private var mouvements: [Mouvement]
    @State private var mois = Date.now.debutDuMois

    private struct Part: Identifiable {
        let categorie: Categorie
        let total: Double
        var id: String { categorie.id }
    }

    private struct BilanMois: Identifiable {
        let mois: Date
        let revenus: Double
        let depenses: Double
        var id: Date { mois }
    }

    private var parts: [Part] {
        let depenses = mouvements.filter { !$0.estRevenu && $0.date.memeMois(mois) }
        return Dictionary(grouping: depenses) { $0.categorie ?? .autre }
            .map { Part(categorie: $0.key, total: $0.value.reduce(0) { $0 + $1.montant }) }
            .sorted { $0.total > $1.total }
    }

    private var sixMois: [BilanMois] {
        (0..<6).reversed().map { decalage in
            let m = mois.ajouterMois(-decalage)
            let duMois = mouvements.filter { $0.date.memeMois(m) }
            return BilanMois(mois: m, revenus: duMois.totalRevenus, depenses: duMois.totalDepenses)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    SelecteurMois(mois: $mois).carte()
                    repartition.carte()
                    evolution.carte()
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Diagrammes")
        }
    }

    private var repartition: some View {
        let parts = self.parts
        let total = parts.reduce(0) { $0 + $1.total }

        return VStack(alignment: .leading, spacing: 16) {
            Text("Répartition des dépenses")
                .font(.headline)

            if parts.isEmpty {
                ContentUnavailableView(
                    "Aucune dépense",
                    systemImage: "chart.pie",
                    description: Text("Les dépenses de ce mois apparaîtront ici.")
                )
            } else {
                Chart(parts) { p in
                    SectorMark(
                        angle: .value("Montant", p.total),
                        innerRadius: .ratio(0.62),
                        angularInset: 1.5
                    )
                    .cornerRadius(5)
                    .foregroundStyle(p.categorie.couleur)
                }
                .chartBackground { proxy in
                    GeometryReader { geo in
                        if let zone = proxy.plotFrame {
                            let cadre = geo[zone]
                            VStack(spacing: 2) {
                                Text("Total")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(total.eurosArrondis)
                                    .font(.title2.bold().monospacedDigit())
                            }
                            .position(x: cadre.midX, y: cadre.midY)
                        }
                    }
                }
                .frame(height: 240)

                VStack(spacing: 10) {
                    ForEach(parts) { p in
                        HStack(spacing: 10) {
                            Image(systemName: p.categorie.icone)
                                .foregroundStyle(p.categorie.couleur)
                                .frame(width: 24)
                            Text(p.categorie.rawValue)
                            Spacer()
                            Text(p.total.euros)
                                .monospacedDigit()
                            Text((p.total / total).formatted(.percent.precision(.fractionLength(0)).locale(localeFR)))
                                .foregroundStyle(.secondary)
                                .monospacedDigit()
                                .frame(width: 50, alignment: .trailing)
                        }
                        .font(.subheadline)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var evolution: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Revenus et dépenses sur 6 mois")
                .font(.headline)
            Chart(sixMois) { b in
                BarMark(x: .value("Mois", b.mois, unit: .month), y: .value("Montant", b.revenus))
                    .foregroundStyle(by: .value("Type", "Revenus"))
                    .position(by: .value("Type", "Revenus"))
                BarMark(x: .value("Mois", b.mois, unit: .month), y: .value("Montant", b.depenses))
                    .foregroundStyle(by: .value("Type", "Dépenses"))
                    .position(by: .value("Type", "Dépenses"))
            }
            .chartForegroundStyleScale(["Revenus": Color.green, "Dépenses": Color.red])
            .chartXAxis {
                AxisMarks(values: .stride(by: .month)) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated))
                }
            }
            .frame(height: 200)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
