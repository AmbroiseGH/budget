# Maxilla

Ton défi de 180 jours : cinq exercices à cocher, une courbe qui monte à chaque journée parfaite, et tout le reste en fun facts. Même famille que Budget, Habitudes et Journal.

**Ouvrir l'app : https://ambroisegh.github.io/budget/maxilla/**

Pour l'installer sur l'iPhone : ouvre le lien dans **Safari**, touche **Partager**, puis **Sur l'écran d'accueil**.

## Le programme

| Exercice | Dose | Jours |
|---|---|---|
| MPR | 5 × 20 | du lundi au vendredi |
| Hard mewing | 5 × 10 s | du lundi au vendredi |
| Orbicularis oculi | 1 × 100 | chaque jour |
| Supine chin raises | 3 × 20 | lundi, mercredi, vendredi |
| Cardio | 40 min | mardi, jeudi |

Le week-end, seul l'orbicularis oculi est au programme.

## Ce qu'elle fait

- **Accueil** : le programme du jour, à cocher (son et vibration). Touche l'icône d'un exercice pour voir comment le faire, pourquoi, et les précautions. Les flèches à côté de « Aujourd'hui » servent à corriger un jour passé.
- **Fun facts** : tout ce qui ne fait pas partie du programme (mewing, hunter eyes, serrage, sourire, auriculaire, front, occipitalis, symétrie, skincare, nutrition et hormones) défile dans le bandeau de l'accueil. L'ampoule en haut à droite ouvre le fun fact du jour, et l'onglet **Lifestyle** les range par thème.
- **Défi 180 jours** : à signer d'un appui long. Chaque journée parfaite (tout le programme du jour coché) fait monter la courbe. Un exercice oublié la casse et la série repart de zéro, mais le défi continue jusqu'au jour 180. Courbe (zoom ou vue 6 mois), mur des 180 jours, jalons J7 → J180 fêtés à l'écran, note finale de S à D.
- **Progrès** : série, meilleure série, journées parfaites, calendrier (touche un jour pour le corriger), total de chaque exercice et réglages (prénom, sons et vibrations, sauvegarde).

## Les données

Elles restent sur le téléphone, sous la même clé que la première version (`maxilla.v1` du stockage de Safari). Les cases déjà cochées pour ces cinq exercices comptent toujours. Les anciennes données (XP, trophées, coffres, lifestyle coché, jours personnalisés) sont gardées telles quelles, simplement plus utilisées. Séries et courbe sont recalculées à partir des cases cochées.

Sauvegarde : **Progrès → Réglages → Sauvegarde GitHub** (même dépôt privé que les autres apps, fichier `maxilla.json`), ou **Exporter** pour un fichier `.json`.

## Changer le programme

Le programme est dans `contenu.js` (`PROGRAMMES`). Pour le changer sans toucher aux jours passés, ajoute une entrée datée (`depuis: "AAAA-MM-JJ"`) au lieu de modifier l'ancienne : chaque jour garde le programme en vigueur à sa date, donc la courbe ne change pas après coup. Une nouvelle dose se met dans `doses` de l'entrée (ex. chin raises à 3 × 20 depuis le 14 novembre 2026) : les totaux des jours passés gardent l'ancienne dose.

## Fichiers

- `contenu.js` : les exercices (consignes, pourquoi, précautions), le programme, les fun facts et les phrases du jour. C'est ici qu'on change un texte.
- `app.js` : l'app. `sons.js` : les sons, synthétisés (aucun fichier audio). `sauvegarde.js` : la sauvegarde GitHub commune aux apps.
- Police Plus Jakarta Sans (licence OFL) dans `fonts/`. Les icônes de l'app sont tirées du logo.
- Quand tu modifies un fichier, change `VERSION` dans `maxilla/sw.js`.
