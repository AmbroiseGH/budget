import Foundation
import SwiftData
import SwiftUI

/// Un revenu ou une dépense saisi depuis l'accueil.
@Model
final class Mouvement {
    var montant: Double
    var estRevenu: Bool
    var libelle: String
    var categorieBrute: String?
    var date: Date

    init(montant: Double, estRevenu: Bool, libelle: String = "", categorie: Categorie? = nil, date: Date = .now) {
        self.montant = montant
        self.estRevenu = estRevenu
        self.libelle = libelle
        self.categorieBrute = categorie?.rawValue
        self.date = date
    }

    var categorie: Categorie? {
        get { categorieBrute.flatMap { Categorie(rawValue: $0) } }
        set { categorieBrute = newValue?.rawValue }
    }

    var titre: String {
        if !libelle.isEmpty { return libelle }
        if let categorie { return categorie.rawValue }
        return estRevenu ? "Revenu" : "Dépense"
    }
}

/// Le plan d'épargne d'un mois donné (clé « 2026-11 »).
@Model
final class PlanMensuel {
    @Attribute(.unique) var mois: String
    var revenusPrevus: Double
    var niveauBrut: String

    init(mois: String, revenusPrevus: Double, niveau: NiveauEpargne) {
        self.mois = mois
        self.revenusPrevus = revenusPrevus
        self.niveauBrut = niveau.rawValue
    }

    var niveau: NiveauEpargne {
        get { NiveauEpargne(rawValue: niveauBrut) ?? .moyen }
        set { niveauBrut = newValue.rawValue }
    }
}

enum Categorie: String, CaseIterable, Identifiable {
    case courses = "Courses"
    case logement = "Logement"
    case transport = "Transport"
    case restaurant = "Restaurant"
    case loisirs = "Loisirs"
    case shopping = "Shopping"
    case sante = "Santé"
    case factures = "Factures"
    case salaire = "Salaire"
    case autre = "Autre"

    var id: String { rawValue }

    var icone: String {
        switch self {
        case .courses: "cart.fill"
        case .logement: "house.fill"
        case .transport: "car.fill"
        case .restaurant: "fork.knife"
        case .loisirs: "gamecontroller.fill"
        case .shopping: "bag.fill"
        case .sante: "cross.case.fill"
        case .factures: "doc.text.fill"
        case .salaire: "eurosign.circle.fill"
        case .autre: "ellipsis.circle.fill"
        }
    }

    var couleur: Color {
        switch self {
        case .courses: .orange
        case .logement: .brown
        case .transport: .blue
        case .restaurant: .pink
        case .loisirs: .purple
        case .shopping: .indigo
        case .sante: .mint
        case .factures: .teal
        case .salaire: .green
        case .autre: .gray
        }
    }
}

enum NiveauEpargne: String, CaseIterable, Identifiable {
    case enorme, grand, moyen, petit

    var id: String { rawValue }

    var nom: String {
        switch self {
        case .enorme: "Énorme"
        case .grand: "Grand"
        case .moyen: "Moyen"
        case .petit: "Petit"
        }
    }

    /// Part des rentrées d'argent à mettre de côté.
    var taux: Double {
        switch self {
        case .enorme: 0.40
        case .grand: 0.25
        case .moyen: 0.15
        case .petit: 0.05
        }
    }

    var icone: String {
        switch self {
        case .enorme: "flame.fill"
        case .grand: "star.fill"
        case .moyen: "leaf.fill"
        case .petit: "drop.fill"
        }
    }

    var couleur: Color {
        switch self {
        case .enorme: .purple
        case .grand: .blue
        case .moyen: .teal
        case .petit: .orange
        }
    }
}
