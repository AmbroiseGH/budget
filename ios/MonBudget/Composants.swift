import SwiftUI

extension View {
    /// Fond de carte arrondi utilisé partout dans l'app.
    func carte() -> some View {
        padding()
            .background(Color(.secondarySystemGroupedBackground),
                        in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

/// Léger effet d'enfoncement quand on appuie.
struct Appui: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct BoutonAjout: View {
    let titre: String
    let icone: String
    let couleur: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(titre, systemImage: icone)
                .font(.title3.weight(.bold))
                .foregroundStyle(Color.white)
                .frame(maxWidth: .infinity, minHeight: 60)
                .background(couleur, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(Appui())
    }
}

struct PastilleCategorie: View {
    let categorie: Categorie
    let estChoisie: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(categorie.rawValue, systemImage: categorie.icone)
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .foregroundStyle(estChoisie ? Color.white : categorie.couleur)
                .background(estChoisie ? categorie.couleur : categorie.couleur.opacity(0.12), in: Capsule())
        }
        .buttonStyle(Appui())
    }
}

struct LigneMouvement: View {
    let mouvement: Mouvement

    private var couleur: Color {
        mouvement.categorie?.couleur ?? (mouvement.estRevenu ? Color.green : Color.gray)
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: mouvement.categorie?.icone ?? (mouvement.estRevenu ? "plus" : "minus"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(couleur)
                .frame(width: 36, height: 36)
                .background(couleur.opacity(0.15), in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(mouvement.titre)
                    .lineLimit(1)
                Text(mouvement.date.formatted(.dateTime.day().month(.abbreviated).hour().minute().locale(localeFR)))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text((mouvement.estRevenu ? "+" : "−") + mouvement.montant.euros)
                .font(.body.weight(.semibold).monospacedDigit())
                .foregroundStyle(mouvement.estRevenu ? Color.green : Color.primary)
        }
    }
}

struct ResumeChiffre: View {
    let titre: String
    let valeur: Double
    let couleur: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(titre)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(valeur.eurosArrondis)
                .font(.headline.monospacedDigit())
                .foregroundStyle(couleur)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// « ‹  Novembre 2026  › » — toucher le nom du mois revient au mois en cours.
struct SelecteurMois: View {
    @Binding var mois: Date

    var body: some View {
        HStack {
            Button { withAnimation { mois = mois.ajouterMois(-1) } } label: {
                Image(systemName: "chevron.left").frame(width: 44, height: 44)
            }
            Spacer()
            Button { withAnimation { mois = Date.now.debutDuMois } } label: {
                Text(mois.nomMois).foregroundStyle(Color.primary)
            }
            Spacer()
            Button { withAnimation { mois = mois.ajouterMois(1) } } label: {
                Image(systemName: "chevron.right").frame(width: 44, height: 44)
            }
        }
        .font(.headline)
        .padding(.vertical, -8)
        .sensoryFeedback(.selection, trigger: mois)
    }
}
