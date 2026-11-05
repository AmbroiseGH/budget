# Budget

Une app ultra simple pour suivre ses revenus, ses dépenses, ses livrets et son PEA.

**Ouvrir l'app : https://ambroisegh.github.io/budget/**

## L'installer sur l'iPhone

1. Ouvre le lien ci-dessus dans **Safari**.
2. Touche le bouton **Partager** (le carré avec une flèche).
3. Choisis **Sur l'écran d'accueil**, puis **Ajouter**.

L'icône « Budget » apparaît sur ton écran d'accueil. L'app s'ouvre en plein écran, comme une vraie app, et fonctionne même sans connexion.

## Ce qu'elle fait

- **Accueil** : tape un montant, ajoute si tu veux un libellé et une catégorie, puis touche **Revenu** ou **Dépense**. Pour un revenu, l'app te demande s'il va sur le compte courant, le Livret A, le Livret Jeune ou le PEA, et crédite le compte choisi. Le résumé du mois et les derniers mouvements sont juste en dessous. Touche un mouvement pour le supprimer.
- **Comptes** : ton Livret A, ton Livret Jeune et ton PEA, avec leur plafond. Sur un livret, « Retirer » sort de l'argent : le solde et l'épargne du mois baissent d'autant. Pour le PEA, tu ajoutes tes achats d'actions (nom, nombre d'actions, prix) et tu mets à jour le cours pour voir ta plus-value.
- **Graphiques** : la répartition des dépenses du mois par catégorie, et les revenus/dépenses des 6 derniers mois.
- **Épargne** : indique tes rentrées prévues du mois et règle la part à épargner avec le curseur (0 à 100 %) : Petit de 1 à 9 %, Moyen de 10 à 29 %, Grand de 30 à 49 %, Énorme à partir de 50 %. L'app te dit combien mettre de côté et combien il te reste à dépenser.

- **Corriger l'épargne** : dans Épargne, « Modifier l'épargne du mois » permet de changer le montant ou le compte d'un placement ou d'un retrait, de le supprimer, ou d'ajouter une épargne oubliée. Les soldes des comptes suivent.
- **Historique** (bouton sur l'accueil) : le bilan de chaque mois, la tranche d'épargne atteinte et ta série 🔥 de mois où tu as épargné plus que tu n'as dépensé.

## Tes données

Elles restent uniquement sur ton téléphone, dans Safari (aucun compte, aucun serveur). Pense à utiliser **Tout voir → Exporter** de temps en temps pour garder une copie de sauvegarde. Si tu supprimes l'icône de l'écran d'accueil ou effaces les données de Safari, elles sont perdues sans sauvegarde.

## Organisation du dépôt

- `index.html`, `style.css`, `app.js` : l'app web (sans dépendance, rien à compiler).
- `fonts/` : police Plus Jakarta Sans (licence OFL), hébergée avec l'app.
- `sw.js`, `manifest.webmanifest`, `icons/` : installation sur l'écran d'accueil et mode hors ligne. Quand tu modifies un fichier, change `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.
- `ios/` : la version native SwiftUI, à ouvrir avec Xcode (voir `ios/LISEZMOI.md`).
