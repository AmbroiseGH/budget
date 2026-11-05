# Sauvegarde GitHub

Chaque app (Budget, Courses, Habitudes, Tâches, Journal) peut envoyer une copie de ses données dans **ton propre dépôt GitHub privé**. Si tu changes de téléphone, tu les récupères en un geste.

Tes données actuelles ne bougent pas : l'app ne remplace jamais ce qu'il y a sur ton téléphone sans te demander, et GitHub garde toutes les anciennes versions.

## 1. Créer le dépôt privé (une seule fois)

1. Va sur https://github.com/new
2. **Repository name** : `mes-donnees`
3. Coche **Private** (important : `budget` est public, pas celui-ci).
4. Coche **Add a README file**, puis **Create repository**.

## 2. Créer le jeton (une seule fois)

1. Va sur https://github.com/settings/personal-access-tokens/new
2. **Token name** : `Apps iPhone`
3. **Expiration** : la plus longue proposée (tu en recréeras un à l'expiration, l'app te préviendra).
4. **Repository access** : **Only select repositories**, puis choisis `mes-donnees`.
5. **Permissions → Repository permissions → Contents** : **Read and write**.
6. **Generate token**, puis copie le jeton (il commence par `github_pat_`). Garde-le dans une note privée : GitHub ne le remontre plus.

Ce jeton ne donne accès qu'à `mes-donnees`, rien d'autre sur ton compte.

## 3. Activer la sauvegarde dans chaque app

Ouvre chaque app **depuis l'icône de ton écran d'accueil** (c'est là que sont tes données), puis :

| App | Où |
|---|---|
| Budget | Accueil → **Tout voir** (à côté des derniers mouvements) → en bas, **☁️ Sauvegarde GitHub** |
| Courses | Récurrents → **Modifier** → **☁️ Sauvegarde GitHub** |
| Habitudes | **Ajouter ou retirer des habitudes** → **☁️ Sauvegarde GitHub** |
| Tâches | Planning → **Tout voir** → **☁️ Sauvegarde GitHub** |
| Journal | Onglet Journal → ⚙️ → **Sauvegarde GitHub** |

Colle le jeton, laisse `AmbroiseGH/mes-donnees`, touche **Connecter**. La première sauvegarde part tout de suite, puis l'app s'envoie toute seule quelques secondes après chaque changement.

Sur iPhone, chaque app de l'écran d'accueil a son propre stockage : il faut coller le jeton une fois dans chacune.

## Récupérer ses données

Dans **☁️ Sauvegarde GitHub**, touche **Restaurer depuis GitHub**. L'app te montre la date de la sauvegarde et demande confirmation. Une copie de ce qu'il y avait sur le téléphone est gardée : **Annuler la dernière restauration** la remet.

Si GitHub contient une version venue d'ailleurs (autre téléphone, Safari…), l'envoi automatique se met **en pause** au lieu de l'écraser, et l'app te laisse choisir : la récupérer ou la remplacer.

Tu peux aussi toujours **exporter un fichier de secours**.

## Pour le code

`sauvegarde.js` (racine) est copié tel quel dans `courses/`, `habitudes/`, `todo/` et `journal/`. Après une modification : `cp sauvegarde.js courses/ habitudes/ todo/ journal/` et change `VERSION` dans chaque `sw.js`. Chaque app écrit `<app>.json` dans le dépôt privé ; ses données locales gardent leur clé habituelle (`budget.v1`, `courses.v1`…).
