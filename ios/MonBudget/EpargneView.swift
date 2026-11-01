import SwiftUI
import SwiftData

struct EpargneView: View {
    @Environment(\.modelContext) private var contexte
    @Query(sort: \PlanMensuel.mois) private var plans: [PlanMensuel]
    @Query private var mouvements: [Mouvement]

    @State private var mois = Date.now.debutDuMois
    @State private var revenusTexte = ""
    @FocusState private var saisieActive: Bool

    private var cle: String { mois.cleMois }
    private var plan: PlanMensuel? { plans.first { $0.mois == cle } }
    /// Sans plan pour ce mois, on reprend les réglages du dernier mois configuré.
    private var planPrecedent: PlanMensuel? { plans.last { $0.mois < cle } }

    private var revenusPrevus: Double { plan?.revenusPrevus ?? planPrecedent?.revenusPrevus ?? 0 }
    private var niveau: NiveauEpargne { plan?.niveau ?? planPrecedent?.niveau ?? .moyen }

    private var duMois: [Mouvement] { mouvements.filter { $0.date.memeMois(mois) } }
    private var aEpargner: Double { (revenusPrevus * niveau.taux).rounded() }
    private var budgetDepenses: Double { revenusPrevus - aEpargner }
    private var dejaDepense: Double { duMois.totalDepenses }
    private var resteADepenser: Double { budgetDepenses - dejaDepense }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    SelecteurMois(mois: $mois).carte()
                    carteRevenus
                    carteNiveaux
                    carteResultat
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Épargne")
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Terminé") { saisieActive = false }
                }
            }
            .onAppear { chargerTexte() }
            .onChange(of: mois) { chargerTexte() }
            .onChange(of: revenusTexte) { _, nouveau in
                let valeur = lireMontant(nouveau) ?? 0
                if valeur != revenusPrevus {
                    planModifiable().revenusPrevus = valeur
                }
            }
        }
    }

    private func chargerTexte() {
        revenusTexte = revenusPrevus.texteSaisie
    }

    private func planModifiable() -> PlanMensuel {
        if let plan { return plan }
        let nouveau = PlanMensuel(mois: cle, revenusPrevus: revenusPrevus, niveau: niveau)
        contexte.insert(nouveau)
        return nouveau
    }

    // MARK: Rentrées prévues

    private var carteRevenus: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Rentrées d'argent prévues")
                .font(.headline)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                TextField("0", text: $revenusTexte)
                    .keyboardType(.decimalPad)
                    .focused($saisieActive)
                    .fixedSize()
                Text("€")
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .font(.system(size: 40, weight: .bold, design: .rounded))
            .contentShape(Rectangle())
            .onTapGesture { saisieActive = true }

            let recus = duMois.totalRevenus
            if recus > 0 && recus != revenusPrevus {
                Button {
                    revenusTexte = recus.texteSaisie
                } label: {
                    Label("Utiliser mes revenus enregistrés (\(recus.euros))", systemImage: "arrow.down.circle")
                }
                .font(.subheadline)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .carte()
    }

    // MARK: Niveau

    private var carteNiveaux: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Niveau d'épargne du mois")
                .font(.headline)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(NiveauEpargne.allCases) { n in
                    let choisi = niveau == n
                    Button {
                        withAnimation(.snappy) { planModifiable().niveau = n }
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Image(systemName: n.icone)
                                .font(.title2)
                            Text(n.nom)
                                .font(.headline)
                            Text(n.taux.formatted(.percent.locale(localeFR)) + " des rentrées")
                                .font(.caption)
                                .opacity(0.85)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .foregroundStyle(choisi ? Color.white : n.couleur)
                        .background(choisi ? n.couleur : n.couleur.opacity(0.12),
                                    in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(Appui())
                }
            }
        }
        .carte()
        .sensoryFeedback(.selection, trigger: niveau)
    }

    // MARK: Résultat

    private var carteResultat: some View {
        VStack(spacing: 16) {
            if revenusPrevus == 0 {
                Text("Indique tes rentrées d'argent prévues pour savoir combien mettre de côté ce mois-ci.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            } else {
                VStack(spacing: 4) {
                    Text("À mettre de côté")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(aEpargner.eurosArrondis)
                        .font(.system(size: 48, weight: .bold, design: .rounded).monospacedDigit())
                        .foregroundStyle(niveau.couleur)
                        .contentTransition(.numericText())
                    Text("\(niveau.nom) · \(niveau.taux.formatted(.percent.locale(localeFR))) de \(revenusPrevus.eurosArrondis)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Divider()

                VStack(spacing: 8) {
                    ligne("Budget pour tes dépenses", budgetDepenses)
                    ligne("Déjà dépensé", dejaDepense)
                    ligne("Reste à dépenser", resteADepenser,
                          couleur: resteADepenser < 0 ? .red : .primary, gras: true)
                }

                ProgressView(value: min(dejaDepense, max(budgetDepenses, 0)), total: max(budgetDepenses, 1))
                    .tint(resteADepenser < 0 ? Color.red : niveau.couleur)

                if resteADepenser < 0 {
                    Text("Attention : tu dépasses ton budget de \((-resteADepenser).euros).")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .carte()
    }

    private func ligne(_ titre: String, _ valeur: Double, couleur: Color = .primary, gras: Bool = false) -> some View {
        HStack {
            Text(titre)
                .foregroundStyle(.secondary)
            Spacer()
            Text(valeur.euros)
                .monospacedDigit()
                .fontWeight(gras ? .bold : .regular)
                .foregroundStyle(couleur)
        }
        .font(.subheadline)
    }
}
