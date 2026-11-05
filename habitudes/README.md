# Habitudes

Le suivi d'habitudes, dans le même style que les apps Budget et Courses. Les habitudes et le score du jour viennent du « Habit Tracker » Notion.

**Ouvrir l'app : https://ambroisegh.github.io/budget/habitudes/**

Pour l'installer sur l'iPhone : ouvre le lien dans **Safari**, touche **Partager**, puis **Sur l'écran d'accueil**.

## Ce qu'elle fait

- **Le jour** : touche une habitude pour la cocher. Le **score du jour** (en %) et l'anneau montrent où tu en es, avec des confettis pour une journée parfaite. Les flèches ‹ › permettent de revenir sur un jour passé pour le corriger.
- **Séries 🔥** : le nombre de jours d'affilée où l'habitude est faite. Tant que la journée n'est pas finie, la série d'hier reste valable. La carte « Séries » montre la série en cours et le record de chaque habitude.
- **Calendrier** : chaque jour est coloré selon le score (plus c'est orange, plus tu en as fait). Choisis une habitude dans la rangée du haut pour voir seulement les jours où tu l'as faite. Touche un jour pour voir le détail, puis « Modifier ce jour ».
- **Ajouter ou retirer des habitudes** : bouton sous la liste. Touche le nom d'une habitude pour le modifier. Un emoji est choisi tout seul (touche-le pour le changer), la flèche ↑ remonte une habitude. Une habitude retirée garde son historique si tu l'annules.
- **Sauvegarde** : « Exporter » crée un fichier `.json`, « Importer » le recharge (sert aussi à importer l'historique Notion).

Les données restent sur le téléphone (clé `habitudes.v1` du stockage de Safari). Quand tu modifies un fichier, change `VERSION` dans `habitudes/sw.js`.
