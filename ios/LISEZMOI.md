# Budget, l'app iPhone de suivi de tes finances

Une app native iPhone (SwiftUI, iOS 17 ou plus récent) avec trois onglets.

- **Accueil** : tape un montant, ajoute si tu veux un libellé et une catégorie, puis touche **Revenu** ou **Dépense**. Un bandeau confirme l'ajout. En dessous, le résumé du mois (revenus, dépenses, solde) et tes derniers mouvements. Appui long sur un mouvement pour le supprimer, ou « Tout voir » pour l'historique complet (glisser vers la gauche pour supprimer).
- **Diagrammes** : un anneau de répartition des dépenses du mois par catégorie (avec montants et pourcentages) et un graphique revenus/dépenses sur 6 mois. Les flèches changent de mois, toucher le nom du mois revient au mois en cours.
- **Épargne** : indique les rentrées d'argent prévues pour le mois et choisis un niveau. L'app calcule ce qu'il faut mettre de côté, ton budget de dépenses, ce que tu as déjà dépensé et ce qu'il te reste. Les réglages d'un mois sont repris automatiquement le mois suivant.

| Niveau | Part épargnée |
|---|---|
| Énorme | 40 % |
| Grand | 25 % |
| Moyen | 15 % |
| Petit | 5 % |

Les pourcentages se changent dans `MonBudget/Modeles.swift` (propriété `taux`).

Toutes les données restent sur ton iPhone (SwiftData), sans compte ni connexion internet.

## Installer l'app sur ton iPhone

Il te faut un Mac avec **Xcode 16 ou plus récent** (gratuit sur l'App Store) et un câble pour l'iPhone. Un identifiant Apple gratuit suffit.

1. Décompresse le dossier et ouvre `MonBudget.xcodeproj` (double-clic).
2. Dans Xcode, menu **Xcode → Settings → Accounts**, ajoute ton identifiant Apple si ce n'est pas déjà fait.
3. Clique sur le projet **MonBudget** dans la colonne de gauche, puis l'onglet **Signing & Capabilities**. Dans **Team**, choisis ton nom (« Personal Team »). Si Xcode signale que l'identifiant est déjà pris, remplace `com.frank.monbudget` par quelque chose d'unique, par exemple `com.tonprenom.budget`.
4. Branche ton iPhone, déverrouille-le et accepte « Faire confiance à cet ordinateur ».
5. Sur l'iPhone, active le **Mode développeur** : Réglages → Confidentialité et sécurité → Mode développeur (l'iPhone redémarre).
6. En haut de la fenêtre Xcode, choisis ton iPhone comme destination, puis clique sur ▶︎ (ou Cmd + R).
7. Au premier lancement, l'iPhone peut bloquer l'app : Réglages → Général → VPN et gestion de l'appareil → touche ton identifiant → **Faire confiance**.

Avec un identifiant Apple gratuit, l'installation reste valable 7 jours : il suffit de rebrancher l'iPhone et de relancer ▶︎ pour la renouveler (tes données sont conservées). Avec un compte développeur payant (99 €/an), elle dure un an et tu peux passer par TestFlight.

Tu peux aussi tester l'app sans iPhone en choisissant un simulateur (par ex. « iPhone 16 ») comme destination.
