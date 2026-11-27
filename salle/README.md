# Salle

Ton carnet de musculation : tes séances types, les charges et répétitions de chaque série (ou la durée tenue, pour le gainage), et tout ce qu'il faut pour battre la dernière fois. Thème violet et noir, façon jeu d'arcade. Même famille que Budget, Habitudes, Journal et Maxilla, et rangée dans **Apps**.

**Ouvrir l'app : https://ambroisegh.github.io/budget/salle/**

Pour l'installer sur l'iPhone : ouvre le lien dans **Safari**, touche **Partager**, puis **Sur l'écran d'accueil**.

## Chaque jour

1. **Nouvelle séance** : l'app propose tes séances types (la « Conseillée » est celle que tu n'as pas faite depuis le plus longtemps).
2. Tes chiffres de la dernière fois sont **en transparence** dans chaque case : tu sais toujours ce que tu dois faire.
3. Touche une case et tape la charge puis les reps sur le pavé (**Suivant**, puis **Valider**). Sans rien taper, **✓** refait exactement la même chose que la dernière fois.
   - **Maintiens une case puis glisse vers le bas** : sa charge, ses reps ou sa durée vont dans les séries suivantes de l'exercice (les cases visées s'allument pendant le geste, et **Annuler** apparaît juste après). Un glissé rapide fait juste défiler la page.
   - **Exercice au temps** (gainage, chaise, suspension…) : tape la durée (1 3 0 pour 1:30) ou touche **▶** pour le chrono : décompte 3-2-1, puis **Stop** quand tu lâches. La durée est notée et la série validée. S'il y a un temps à battre, l'anneau passe au vert dès que tu le dépasses.
4. Le minuteur de repos démarre tout seul à chaque série validée (−15 s, +15 s, Passer). L'écran reste allumé pendant la séance.
5. **Terminer** : le bilan (durée, tonnage, séries en progrès, records, objectif de la semaine).

## Les couleurs

| Couleur | Quand |
|---|---|
| En transparence | Ce que tu as fait la dernière fois |
| **Vert** | Plus lourd que la dernière fois, plus de reps au même poids, ou tenu plus longtemps |
| **Rouge** | Plus léger, moins de reps au même poids, ou tenu moins longtemps |
| Normal | Pareil que la dernière fois |
| **Couronne dorée** | Record battu : charge la plus lourde, 1RM estimé (Epley), reps au poids du corps ou temps le plus long |

Au-dessus de chaque exercice, **Objectif** propose la surcharge progressive du jour : une rep de plus, la même chose avec un cran de charge en plus, ou quelques secondes de plus pour un exercice au temps.

## Ce qu'elle fait

- **Séance** : nouvelle séance, séance conseillée, objectif de la semaine (3 séances par défaut) avec la série de semaines tenues 🔥, dernière séance et records récents. Les séances types se créent et se modifient depuis **Nouvelle séance** (crayon) : exercices dans l'ordre, nombre de séries et temps de repos de chacun. Une **séance libre** peut devenir une séance type à la fin.
- **Exercices** : ta bibliothèque, rangée par groupe musculaire, avec la mini-courbe et le progrès de chacun. Un exercice créé ici (ou en tapant son nom pendant une séance) est proposé partout ensuite. Chacun se note en **Charge × reps** ou **Au temps** (« Gainage », « Planche », « Chaise »… sont reconnus tout seuls ; le type ne change plus une fois des séries notées). Touche un exercice pour sa **courbe** (force, charge, volume ; reps pour le poids du corps ; temps max et temps total pour un exercice au temps), ses records et tout son historique.
- **Progrès** : séances, semaines d'affilée, records battus, tonnage total, les 12 dernières semaines et l'historique complet. Touche une séance pour la revoir, la modifier ou la supprimer.
- **Réglages** (bouton en haut à droite) : objectif par semaine, cran des boutons − et + du pavé (2,5 kg par défaut, réglable aussi par exercice, 5 s pour un exercice au temps), sons et vibrations, écran allumé, Google Drive, exporter et importer, et le rappel des couleurs et des gestes.

## Les données

Elles restent sur le téléphone, dans le stockage de Safari, sous la clé `salle.v1` (rien de partagé avec les autres apps du site). Une série au temps y est notée en secondes (`sec`), et l'exercice porte `type: "temps"` ; les données d'avant restent lues telles quelles. La petite clé `salle.astuce-glisser` retient seulement combien de fois l'astuce du glissé a été montrée.

Sauvegarde : **Séance → Réglages → Google Drive** (une copie par jour dans `applications/salle/salle.json`, voir [GOOGLE-DRIVE.md](../GOOGLE-DRIVE.md)), ou **Exporter** pour un fichier `.json`. Un import garde une copie des données d'avant dans `salle.v1.avant-import`. Si les données enregistrées sont illisibles, elles sont gardées dans `salle.v1.illisible` au lieu d'être effacées.

## Fichiers

- `index.html`, `style.css`, `app.js` : l'app (sans dépendance, rien à compiler). `sons.js` : les sons, synthétisés (aucun fichier audio).
- `drive.js` : la sauvegarde Google Drive commune aux apps (copie de celui de la racine).
- Police Plus Jakarta Sans (licence OFL) dans `fonts/`.
- Quand tu modifies un fichier, change `VERSION` dans `salle/sw.js` (et dans `apps/sw.js` si tu changes l'icône, que Apps garde en cache).
