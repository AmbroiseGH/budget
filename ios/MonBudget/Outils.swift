import Foundation

let localeFR = Locale(identifier: "fr_FR")

extension Double {
    /// « 12,50 € »
    var euros: String {
        formatted(.currency(code: "EUR").locale(localeFR))
    }

    /// « 13 € »
    var eurosArrondis: String {
        formatted(.currency(code: "EUR").precision(.fractionLength(0)).locale(localeFR))
    }

    /// Valeur affichée dans un champ de saisie (vide si zéro).
    var texteSaisie: String {
        self == 0 ? "" : formatted(.number.grouping(.never).precision(.fractionLength(0...2)).locale(localeFR))
    }
}

/// Lit un montant tapé au clavier (« 12,5 », « 12.50 », « 1 200 »). Renvoie nil si invalide ou nul.
func lireMontant(_ texte: String) -> Double? {
    let propre = texte
        .replacingOccurrences(of: " ", with: "")
        .replacingOccurrences(of: "\u{00A0}", with: "")
        .replacingOccurrences(of: "\u{202F}", with: "")
        .replacingOccurrences(of: ",", with: ".")
    guard let valeur = Double(propre), valeur > 0, valeur.isFinite else { return nil }
    return (valeur * 100).rounded() / 100
}

extension Date {
    var debutDuMois: Date {
        Calendar.current.dateInterval(of: .month, for: self)?.start ?? self
    }

    func ajouterMois(_ n: Int) -> Date {
        Calendar.current.date(byAdding: .month, value: n, to: self) ?? self
    }

    func memeMois(_ autre: Date) -> Bool {
        Calendar.current.isDate(self, equalTo: autre, toGranularity: .month)
    }

    /// « 2026-11 »
    var cleMois: String {
        let c = Calendar.current.dateComponents([.year, .month], from: self)
        return String(format: "%04d-%02d", c.year ?? 0, c.month ?? 0)
    }

    /// « Novembre 2026 »
    var nomMois: String {
        let texte = formatted(.dateTime.month(.wide).year().locale(localeFR))
        return texte.prefix(1).uppercased() + texte.dropFirst()
    }
}

extension Array where Element == Mouvement {
    var totalRevenus: Double { filter(\.estRevenu).reduce(0) { $0 + $1.montant } }
    var totalDepenses: Double { filter { !$0.estRevenu }.reduce(0) { $0 + $1.montant } }
}
