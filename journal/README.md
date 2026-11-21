# Journal

Le journal d'humeur, dans la famille des apps Budget et Courses.

**Ouvrir l'app : https://ambroisegh.github.io/budget/journal/**

Pour l'installer sur l'iPhone : ouvre le lien dans **Safari**, touche **Partager**, puis **Sur l'écran d'accueil**.

## Ce qu'elle fait

- **Aujourd'hui** : fais glisser le curseur (ou touche un cran) d'« Insupportable » à « Incroyable ». Le ciel change avec toi : lune de sang, lune d'orage, croissant de lune, demi-lune, aube (neutre), puis soleil doux, beau soleil, grand soleil et soleil radieux. Touche **Enregistrer ma journée** et une pluie d'étoiles confirme. Tu peux ensuite **écrire un mot** sur ta journée (facultatif), le modifier, ou effacer la journée (avec **Annuler**). Les flèches en haut servent à noter un jour passé. La journée change à 3 h du matin, pour pouvoir noter sa soirée après minuit.
- **Journal** (le journal secret, protégé par un code à 6 chiffres) : une pousse d'arbre sous un dôme d'énergie, ta paix intérieure. Touche **Écrire** : une fenêtre rouge et nébuleuse s'ouvre, celle des pensées qui te préoccupent. Écris ce que tu as sur le cœur puis **Encapsuler** : ta pensée est enfermée dans une bulle qui flotte librement dans la nébuleuse. Touche une bulle pour la relire, fais-la glisser ou lance-la, ou **Laisse-la partir** (avec **Annuler**). Le bouton en haut à droite montre tes pensées en liste. À chaque pensée encapsulée, la pousse grandit un peu : jeune pousse, arbrisseau, jeune arbre, arbre, arbre en fleurs, puis arbre de lumière.
- **Calendrier** : le calendrier du mois avec l'astre de chaque jour (un point signale un mot écrit), la moyenne du mois et la liste des notes. Touche un jour pour le noter ou relire ta note. La roue dentée ouvre les réglages : sons, export et import d'une sauvegarde.
- **Bilan** : la moyenne du mois et de l'année (comparée au mois et à l'année d'avant), ta courbe d'humeur sur 30 jours, 3 mois (tendance sur 5 jours) ou 12 mois (moyenne par semaine), la répartition des humeurs, le jour de la semaine le plus lumineux et tes séries de jours notés. Touche un graphique pour voir le détail.

Quand une journée est notée « Insupportable », un petit message rappelle que le 3114 répond jour et nuit (il est dans `index.html`, bloc `soutien`).

Les données restent sur le téléphone (clé `journal.v1` du stockage de Safari). Quand tu modifies un fichier, change `VERSION` dans `journal/sw.js`.

### Le journal secret

- Les pensées sont chiffrées sur le téléphone (AES-GCM 256 bits, clé tirée du code par PBKDF2-SHA-256, 600 000 tours). Seul le coffre chiffré est enregistré, dans `donnees.secret` de `journal.v1` : il voyage donc avec l'export, l'import et la sauvegarde Google Drive, toujours chiffré. Le code n'est enregistré nulle part.
- Le code ne peut pas être récupéré. **Oublié ?** permet de repartir avec un nouveau code : l'ancien coffre n'est pas effacé, il est rangé dans `donnees.secretArchives`, et **Retrouver mes pensées d'avant** (dans les réglages du jardin) le rouvre si l'ancien code revient. La pousse garde sa croissance.
- Un import ou une restauration Google Drive ne fait jamais perdre le coffre de ce téléphone : il est gardé, ou rangé dans les archives s'il est différent.
- Après 5 codes faux, le clavier se bloque 30 s, puis de plus en plus longtemps (15 min au plus). Le jardin se referme quand on change d'onglet ou quand l'app reste en arrière-plan plus de 45 s ; un brouillon en cours est gardé, chiffré.
- Propre à ce téléphone : `journal.verrou` (essais ratés) et `journal.jardin` (croissance déjà montrée).
- Fichiers : `jardin.js` (la pousse et le dôme, dessinés en SVG), `pensees.js` (code, chiffrement, nébuleuse, bulles), `jardin.css`, `images/nebuleuse.webp`.

Crédits : polices Plus Jakarta Sans et Instrument Serif (licence OFL, dans `fonts/`), sons « Distant Star Sparkle », « Healing Pop » (une pensée encapsulée) et « Soft Poof » (une pensée qui s'envole) de [Soundza](https://soundza.com).
