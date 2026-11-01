import SwiftUI
import SwiftData

struct AccueilView: View {
    @Environment(\.modelContext) private var contexte
    @Query(sort: \Mouvement.date, order: .reverse) private var mouvements: [Mouvement]

    @State private var montantTexte = ""
    @State private var libelle = ""
    @State private var categorie: Categorie?
    @State private var confirmation: Confirmation?
    @State private var compteurAjouts = 0
    @FocusState private var champActif: Champ?

    private enum Champ { case montant, libelle }

    private struct Confirmation: Equatable {
        let id = UUID()
        let texte: String
        let estRevenu: Bool
    }

    private var montant: Double? { lireMontant(montantTexte) }
    private var duMois: [Mouvement] { mouvements.filter { $0.date.memeMois(.now) } }
    private var derniers: [Mouvement] { Array(mouvements.prefix(5)) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    carteSaisie
                    carteSolde
                    carteDerniers
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Accueil")
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Terminé") { champActif = nil }
                }
            }
            .overlay(alignment: .top) { bandeau }
            .sensoryFeedback(.success, trigger: compteurAjouts)
        }
    }

    // MARK: Saisie

    private var carteSaisie: some View {
        VStack(spacing: 16) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                TextField("0", text: $montantTexte)
                    .keyboardType(.decimalPad)
                    .focused($champActif, equals: .montant)
                    .multilineTextAlignment(.trailing)
                    .fixedSize()
                Text("€")
                    .foregroundStyle(.secondary)
            }
            .font(.system(size: 56, weight: .bold, design: .rounded))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .contentShape(Rectangle())
            .onTapGesture { champActif = .montant }

            TextField("Libellé (facultatif)", text: $libelle)
                .focused($champActif, equals: .libelle)
                .submitLabel(.done)
                .padding(12)
                .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Categorie.allCases) { c in
                        PastilleCategorie(categorie: c, estChoisie: categorie == c) {
                            withAnimation(.snappy) { categorie = (categorie == c) ? nil : c }
                        }
                    }
                }
            }
            .sensoryFeedback(.selection, trigger: categorie)

            HStack(spacing: 12) {
                BoutonAjout(titre: "Revenu", icone: "plus.circle.fill", couleur: .green) {
                    ajouter(estRevenu: true)
                }
                BoutonAjout(titre: "Dépense", icone: "minus.circle.fill", couleur: .red) {
                    ajouter(estRevenu: false)
                }
            }
            .disabled(montant == nil)
            .opacity(montant == nil ? 0.4 : 1)
        }
        .carte()
    }

    private func ajouter(estRevenu: Bool) {
        guard let montant else { return }
        let nouveau = Mouvement(
            montant: montant,
            estRevenu: estRevenu,
            libelle: libelle.trimmingCharacters(in: .whitespacesAndNewlines),
            categorie: categorie
        )
        contexte.insert(nouveau)

        montantTexte = ""
        libelle = ""
        categorie = nil
        champActif = nil
        compteurAjouts += 1

        let message = estRevenu
            ? "Revenu de \(montant.euros) enregistré"
            : "Dépense de \(montant.euros) enregistrée"
        let c = Confirmation(texte: message, estRevenu: estRevenu)
        withAnimation(.spring) { confirmation = c }
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(2))
            if confirmation == c {
                withAnimation { confirmation = nil }
            }
        }
    }

    @ViewBuilder private var bandeau: some View {
        if let confirmation {
            Label(confirmation.texte, systemImage: "checkmark.circle.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(confirmation.estRevenu ? Color.green : Color.red, in: Capsule())
                .shadow(color: .black.opacity(0.15), radius: 6, y: 3)
                .padding(.top, 8)
                .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    // MARK: Résumé du mois

    private var carteSolde: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(Date.now.nomMois)
                .font(.headline)
            HStack {
                ResumeChiffre(titre: "Revenus", valeur: duMois.totalRevenus, couleur: .green)
                ResumeChiffre(titre: "Dépenses", valeur: duMois.totalDepenses, couleur: .red)
                ResumeChiffre(titre: "Solde", valeur: duMois.totalRevenus - duMois.totalDepenses, couleur: .primary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .carte()
    }

    // MARK: Derniers mouvements

    private var carteDerniers: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Derniers mouvements")
                    .font(.headline)
                Spacer()
                if !mouvements.isEmpty {
                    NavigationLink("Tout voir") { ListeMouvementsView() }
                        .font(.subheadline)
                }
            }
            if mouvements.isEmpty {
                Text("Tape un montant puis touche Revenu ou Dépense.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 8)
            } else {
                VStack(spacing: 0) {
                    ForEach(derniers) { m in
                        LigneMouvement(mouvement: m)
                            .padding(.vertical, 8)
                            .contentShape(Rectangle())
                            .contextMenu {
                                Button("Supprimer", systemImage: "trash", role: .destructive) {
                                    withAnimation { contexte.delete(m) }
                                }
                            }
                        if m.id != derniers.last?.id {
                            Divider()
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .carte()
    }
}

/// Historique complet, regroupé par mois. Glisser vers la gauche pour supprimer.
struct ListeMouvementsView: View {
    @Environment(\.modelContext) private var contexte
    @Query(sort: \Mouvement.date, order: .reverse) private var mouvements: [Mouvement]

    private struct Groupe: Identifiable {
        let mois: Date
        let elements: [Mouvement]
        var id: Date { mois }
    }

    private var groupes: [Groupe] {
        let parMois = Dictionary(grouping: mouvements) { $0.date.debutDuMois }
        return parMois.keys.sorted(by: >).map { Groupe(mois: $0, elements: parMois[$0] ?? []) }
    }

    var body: some View {
        List {
            ForEach(groupes) { groupe in
                Section(groupe.mois.nomMois) {
                    ForEach(groupe.elements) { m in
                        LigneMouvement(mouvement: m)
                    }
                    .onDelete { positions in
                        for i in positions { contexte.delete(groupe.elements[i]) }
                    }
                }
            }
        }
        .navigationTitle("Mouvements")
        .navigationBarTitleDisplayMode(.inline)
    }
}
