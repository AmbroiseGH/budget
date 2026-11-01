# Budget

Une app ultra simple pour suivre ses revenus, ses dépenses et son épargne.

**Ouvrir l'app : https://ambroisegh.github.io/budget/**

## L'installer sur l'iPhone

1. Ouvre le lien ci-dessus dans **Safari**.
2. Touche le bouton **Partager** (le carré avec une flèche).
3. Choisis **Sur l'écran d'accueil**, puis **Ajouter**.

L'icône « Budget » apparaît sur ton écran d'accueil. L'app s'ouvre en plein écran, comme une vraie app, et fonctionne même sans connexion.

## Ce qu'elle fait

- **Accueil** : tape un montant, ajoute si tu veux un libellé et une catégorie, puis touche **Revenu** ou **Dépense**. Le résumé du mois et les derniers mouvements sont juste en dessous. Touche un mouvement pour le supprimer.
- **Diagrammes** : la répartition des dépenses du mois par catégorie, et les revenus/dépenses des 6 derniers mois.
- **Épargne** : indique tes rentrées prévues du mois et choisis un niveau, Énorme (40 %), Grand (25 %), Moyen (15 %) ou Petit (5 %). L'app te dit combien mettre de côté et combien il te reste à dépenser.

## Tes données

Elles restent uniquement sur ton téléphone, dans Safari (aucun compte, aucun serveur). Pense à utiliser **Tout voir → Exporter** de temps en temps pour garder une copie de sauvegarde. Si tu supprimes l'icône de l'écran d'accueil ou effaces les données de Safari, elles sont perdues sans sauvegarde.

## Organisation du dépôt

- `index.html`, `style.css`, `app.js` : l'app web (sans dépendance, rien à compiler).
- `sw.js`, `manifest.webmanifest`, `icons/` : installation sur l'écran d'accueil et mode hors ligne. Quand tu modifies un fichier, change `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.
- `ios/` : la version native SwiftUI, à ouvrir avec Xcode (voir `ios/LISEZMOI.md`).
