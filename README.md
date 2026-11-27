# Budget

Une app ultra simple pour suivre ses revenus, ses dépenses, ses livrets et son PEA.

**Ouvrir l'app : https://ambroisegh.github.io/budget/**

Aussi dans ce dépôt : la liste de **[Courses](courses/)**, à ouvrir sur https://ambroisegh.github.io/budget/courses/

## Apps : toutes les applis dans une seule

**Ouvrir Apps : https://ambroisegh.github.io/budget/apps/**

[Apps](apps/) réunit Budget, Courses, Habitudes, Tâches, Journal, Maxilla et Salle. Sur l'accueil, chaque appli s'ouvre en un toucher ; une pastille rouge dit ce qui reste à faire (tâches du jour, habitudes non cochées, journée pas encore notée…) et un bandeau qui défile en haut le résume. La roue en haut à droite ouvre les réglages : **une seule sauvegarde Google Drive** pour toutes les applis (`applications/apps/apps.json`).

Dans chaque appli ouverte depuis Apps, le bouton **‹ Apps** en haut (ou un glissé depuis le bord gauche de l'écran) ramène à l'accueil.

**Passer des anciennes applis à Apps, sans rien perdre** : sur iPhone, chaque icône de l'écran d'accueil a son propre stockage, donc Apps démarre vide.
1. Installe Apps : dans Safari, ouvre le lien ci-dessus, puis **Partager → Sur l'écran d'accueil**.
2. Ouvre une ancienne appli depuis son icône : un bandeau propose **Transférer vers Apps** → **Copier mes données**.
3. Dans Apps, touche la roue → **Coller les données copiées**. Recommence pour chaque appli.

Ou, si l'appli avait une sauvegarde Google Drive : Apps → roue → **Se connecter à Google** → **Restaurer…**, puis **Récupérer** sur chaque ancienne sauvegarde. Les anciennes applis gardent leurs données ; ne supprime leurs icônes qu'une fois tout vérifié dans Apps (supprimer une icône efface ses données).

## L'installer sur l'iPhone

1. Ouvre le lien ci-dessus dans **Safari**.
2. Touche le bouton **Partager** (le carré avec une flèche).
3. Choisis **Sur l'écran d'accueil**, puis **Ajouter**.

L'icône « Budget » apparaît sur ton écran d'accueil. L'app s'ouvre en plein écran, comme une vraie app, et fonctionne même sans connexion.

## Ce qu'elle fait

- **Accueil** : tape un montant, ajoute si tu veux un libellé et une catégorie, puis touche **Revenu** ou **Dépense**. Pour un revenu, l'app te demande s'il va sur le compte courant, le Livret A, le Livret Jeune ou le PEA, et crédite le compte choisi. Le résumé du mois et les derniers mouvements sont juste en dessous. Touche un mouvement pour le supprimer.
- **Comptes** : ton Livret A, ton Livret Jeune et ton PEA, avec leur plafond, et la courbe de ton épargne totale au fil du temps (1 mois, 3 mois, 1 an ou tout). Sur un livret, « Retirer » sort de l'argent : le solde et l'épargne du mois baissent d'autant. Pour le PEA, tu ajoutes tes achats d'actions (nom, nombre d'actions, prix) et tu mets à jour le cours pour voir ta plus-value.
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
- `apps/` : l'appli Apps. `applis.js` est la liste des applis (une nouvelle appli s'ajoute là), `app.js` l'accueil (pastilles, bandeau, réglages), `sauvegarde.js` la sauvegarde Google Drive commune, `pont.js` le lien inclus en bas de chaque appli (bouton « ‹ Apps », glissé depuis le bord, transfert depuis une ancienne appli). Chaque appli garde sa clé de stockage habituelle (`budget.v1`, `journal.v1`…).
