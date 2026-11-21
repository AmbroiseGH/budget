# Sauvegarde Google Drive

Budget, Habitudes, Journal et Maxilla rangent chaque jour une copie de leurs données dans ton Google Drive :

```
applications/
├── budget/          budget.json
├── habit tracker/   habitudes.json
├── journal/         journal.json
└── maxilla/         maxilla.json
```

Chaque copie remplace celle de la veille (Google Drive garde quand même les anciennes versions quelque temps : clic droit sur le fichier → **Gérer les versions**).

Tes données actuelles ne bougent pas : l'app ne remplace jamais ce qu'il y a sur ton téléphone sans te demander, et elle n'écrase pas une sauvegarde venue d'un autre appareil (elle se met en pause et te laisse choisir).

> **Quand part la sauvegarde ?** À la première ouverture de l'app chaque jour (ou quand tu y reviens). Un iPhone ne laisse pas une app web tourner en arrière-plan : si tu n'ouvres pas une app un jour, elle n'a rien changé, donc la copie de la veille reste juste.

Il faut d'abord créer un « identifiant » Google, une seule fois (environ 5 minutes, plus simple sur ordinateur).

## 1. Créer le projet

1. Va sur https://console.cloud.google.com/projectcreate (connecté avec ton compte Google).
2. **Nom du projet** : `Mes applications`, puis **Créer**.
3. En haut de la page, vérifie que le projet **Mes applications** est bien sélectionné.

## 2. Activer Google Drive

1. Va sur https://console.cloud.google.com/apis/library/drive.googleapis.com
2. Touche **Activer**.

## 3. Écran de connexion

1. Va sur https://console.cloud.google.com/auth/overview et touche **Commencer**.
2. **Nom de l'application** : `Mes applications`. **Adresse e-mail d'assistance** : la tienne. **Suivant**.
3. **Audience** : **Externe**. **Suivant**.
4. **Coordonnées** : ton e-mail. **Suivant**, coche l'accord, puis **Créer**.
5. Va dans **Audience** (menu de gauche) et touche **Publier l'application**, puis **Confirmer**.
   C'est important : sinon Google coupe la connexion tous les 7 jours. Aucune validation n'est demandée, car les apps ne demandent que l'accès aux fichiers qu'elles créent elles-mêmes.

## 4. Créer l'identifiant

1. Va dans **Clients** (menu de gauche) → **Créer un client**.
2. **Type d'application** : **Application Web**. **Nom** : `Apps iPhone`.
3. **Origines JavaScript autorisées** → **Ajouter un URI** : `https://ambroisegh.github.io`
4. **URI de redirection autorisés** → ajoute ces 4 adresses (une par ligne, avec le `/` final) :
   ```
   https://ambroisegh.github.io/budget/
   https://ambroisegh.github.io/budget/habitudes/
   https://ambroisegh.github.io/budget/journal/
   https://ambroisegh.github.io/budget/maxilla/
   ```
5. **Créer**. Google affiche l'**ID client** (finit par `.apps.googleusercontent.com`) et le **Code secret du client** (commence par `GOCSPX-`).
   **Copie les deux dans une note privée** (ou touche **Télécharger le JSON**) : Google ne remontre plus le code secret ensuite.

Ne partage pas le code secret. Il reste uniquement sur ton téléphone, jamais dans le dépôt public.

## 5. Connecter chaque app

Ouvre chaque app **depuis son icône sur l'écran d'accueil** (c'est là que sont tes données), puis :

| App | Où |
|---|---|
| Budget | Accueil → **Tout voir** (à côté des derniers mouvements) → **☁️ Sauvegarde Google Drive** |
| Habitudes | **Ajouter ou retirer des habitudes** → **☁️ Sauvegarde Google Drive** |
| Journal | Onglet Journal → ⚙️ → **Sauvegarde Google Drive** |
| Maxilla | Onglet Progrès → Réglages → **Google Drive** |

Colle l'ID client et le code secret, touche **Se connecter à Google**, choisis ton compte et touche **Continuer** / **Autoriser**. Tu reviens dans l'app et la première sauvegarde part tout de suite.

Sur iPhone, chaque app de l'écran d'accueil a son propre stockage : il faut faire cette connexion une fois dans chacune des 4 apps.

## Récupérer ses données

Dans **☁️ Sauvegarde Google Drive**, touche **Restaurer depuis Google Drive**. L'app montre la date de la sauvegarde et demande confirmation. Une copie de ce qu'il y avait sur le téléphone est gardée : **Annuler la dernière restauration** la remet.

Si la sauvegarde de Google Drive vient d'ailleurs (autre téléphone, Safari au lieu de l'app), ou contient bien plus de données que le téléphone, l'envoi automatique se met **en pause** au lieu de l'écraser, et l'app te laisse choisir.

## Si quelque chose bloque

- **« redirect_uri_mismatch »** : l'adresse de retour n'est pas dans la liste de l'étape 4. Le panneau de l'app affiche l'adresse exacte à ajouter.
- **« Active Google Drive API »** : refais l'étape 2.
- **« La connexion à Google a expiré »** : vérifie l'étape 3.5 (application publiée), puis touche **Se reconnecter** dans l'app.

## Pour le code

`drive.js` (racine) est copié tel quel dans `habitudes/`, `journal/` et `maxilla/`. Après une modification : `cp drive.js habitudes/ journal/ maxilla/` et change `VERSION` dans chaque `sw.js`. Les données locales gardent leur clé habituelle (`budget.v1`, `habitudes.v1`…) ; la connexion est dans `drive.config`, l'état de chaque app dans `drive.etat.<app>`.
