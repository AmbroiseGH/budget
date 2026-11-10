# Maxilla

Le programme glow-up : jaw training, eye area, cardio et lifestyle, avec séries, niveaux, coffres et un défi de 6 mois. Même famille que Budget, Habitudes et Journal, mais en mode « jeu », sombre et lumineux.

**Ouvrir l'app : https://ambroisegh.github.io/budget/maxilla/**

Pour l'installer sur l'iPhone : ouvre le lien dans **Safari**, touche **Partager**, puis **Sur l'écran d'accueil**.

## Ce qu'elle fait

- **Aujourd'hui** : le programme du jour, rangé en trois parties (I. Jaw training, II. Eye area, III. Cardio). Touche un exercice pour le cocher : son, vibration, étincelles et XP. Le bouton à droite ouvre la fiche (consignes, pourquoi, précautions, jours au programme) et, quand il y a un ▶, la **séance guidée**. Les exercices qui ne tombent pas ce jour-là sont dans « Pas au programme », en bonus.
- **Séance guidée** : minuteur pour les exercices tenus (hard mewing 10 × 10 s, auriculaire 12 × 5 s, occipitalis 10 × 5 s), tempo « ouvre / ferme » pour les séries (MPR, chin raises) et chrono « jusqu'à la brûlure » avec record (squinting, serrage).
- **Paliers** : les chin raises montent de 2 × 10 à 5 × 25 au fil des séances, le MPR passe d'une pression légère à ferme.
- **Bandeau lifestyle** : les conseils lifestyle défilent en continu sur l'accueil. Touche-le pour ouvrir l'onglet.
- **Défi 6 mois** : à signer (appui long). Chaque journée parfaite (tout le programme du jour coché) fait monter la courbe ; un exercice oublié la casse et la série repart de zéro, mais le défi continue jusqu'au jour 180. Courbe avec zoom ou vue 6 mois, « mur des 180 jours », jalons J7 → J180, note finale de S à D.
- **Gamification** : XP par exercice, bonus de section et de journée parfaite, multiplicateur de série (jusqu'à ×1,6 à 30 jours), 8 rangs (Argile → Apollon), 25 trophées, un coffre à ouvrir à chaque journée parfaite (commun, rare, épique ou légendaire : plus la série est longue, plus il a de chances d'être rare), et le prochain trophée affiché sur l'accueil.
- **Lifestyle change** : symétrie du visage, skincare, nutrition et hormones. Les bonnes habitudes se cochent chaque jour (XP en bonus, séries par habitude) ; elles ne comptent pas pour la courbe du défi.
- **Progrès** : rang et XP, les rangs, les trophées, le calendrier (touche un jour pour le corriger), les chiffres de chaque exercice (séances, répétitions, temps de contraction) et les réglages.

## Les données

Elles restent sur le téléphone (clé `maxilla.v1` du stockage de Safari). Tout le reste (XP, niveaux, séries, courbe) est recalculé à partir des cases cochées. Sauvegarde : **Progrès → Réglages → Sauvegarde GitHub** (même dépôt privé que les autres apps, fichier `maxilla.json`), ou **Exporter** pour un fichier `.json`.

Changer les jours d'un exercice ne modifie que les jours à venir : les jours passés gardent leur programme, donc la courbe ne change pas après coup.

## Fichiers

- `contenu.js` : la méthode (exercices, consignes, fréquences, lifestyle, rangs, trophées, phrases des coffres). C'est ici qu'on change un texte ou une fréquence par défaut.
- `app.js` : l'app. `sons.js` : les sons, synthétisés (aucun fichier audio). `sauvegarde.js` : la sauvegarde GitHub commune aux apps.
- Polices Plus Jakarta Sans et Unbounded (licence OFL) dans `fonts/`.
- Quand tu modifies un fichier, change `VERSION` dans `maxilla/sw.js`.
