"use strict";

/* =========================================================
   Le contenu de la méthode : exercices, lifestyle, rangs, trophées.
   Jours de la semaine : 0 = dimanche, 1 = lundi … 6 = samedi.
   ========================================================= */

const TOUS_LES_JOURS = [0, 1, 2, 3, 4, 5, 6];

const SECTIONS = [
  { id: "machoire", num: "I", nom: "Jaw training", sous: "Mâchoire, menton, langue", couleur: "#9b7bff" },
  { id: "regard", num: "II", nom: "Eye area", sous: "Regard et sourcils", couleur: "#37dcff" },
  { id: "cardio", num: "III", nom: "Cardio", sous: "Gras et inflammation", couleur: "#ff6b7d" },
];

// coach : la séance guidée.
//   maintien : reps × tenir s, repos s entre deux.
//   series   : séries × reps au tempo (s par répétition), repos s entre deux séries.
//   brulure  : chrono jusqu'à la brûlure, avec record.
const EXERCICES = [
  {
    id: "mpr", section: "machoire", emoji: "👍", nom: "MPR", long: "Mental Protuberance Resistance",
    jours: [1, 3, 5], xp: 30,
    paliers: [
      { des: 0, texte: "5 × 20 · pression légère", series: 5, reps: 20 },
      { des: 6, texte: "5 × 20 · pression modérée", series: 5, reps: 20 },
      { des: 15, texte: "5 × 20 · pression ferme", series: 5, reps: 20 },
    ],
    coach: { type: "series", tempo: 2.4, repos: 40, temps: ["Ouvre…", "Ferme…"], consigne: "Ouvre et ferme la bouche contre tes pouces" },
    pourquoi: [
      "Développe la mâchoire vers l'avant et remonte l'os hyoïde. Aide à corriger les déséquilibres musculaires du cou et améliore la posture de la tête, pour une mâchoire sculptée et affinée.",
      "Le MPR cible les muscles suprahyoïdiens, au-dessus de l'os hyoïde. Renforcés, ils deviennent plus forts et plus « tendus » : ils soulèvent naturellement l'os hyoïde vers une position plus haute et stable, sans effort conscient.",
      "Comme un bodybuilder dont le muscle est si développé qu'il ne se relâche plus complètement : c'est le but recherché pour les muscles du cou. Cette élévation dessine le cou et la mâchoire.",
    ],
    etapes: [
      "Place tes pouces sous ton menton.",
      "Mains jointes comme en prière, la base des index appuyée contre l'avant du menton pour plus de stabilité.",
      "Ouvre et ferme doucement la bouche contre la résistance modérée de tes pouces.",
      "Enchaîne les séries (5 × 20 pour commencer) avec des pauses entre les séries.",
      "Augmente la pression progressivement au fil des semaines.",
    ],
    attention: "Jamais de douleur ni de craquement dans la mâchoire : attention au risque de trouble de l'ATM (articulation temporo-mandibulaire). Si ça craque, allège la pression.",
  },
  {
    id: "chin", section: "machoire", emoji: "🛏️", nom: "Supine chin raises", long: "Élévations du menton, allongé sur le dos",
    jours: [2, 6], xp: 30,
    paliers: [
      { des: 0, texte: "2 × 10 · débutant", series: 2, reps: 10 },
      { des: 6, texte: "3 × 15", series: 3, reps: 15 },
      { des: 12, texte: "4 × 20", series: 4, reps: 20 },
      { des: 18, texte: "5 × 25 · tu peux passer à 3 fois par semaine", series: 5, reps: 25 },
    ],
    coach: { type: "series", tempo: 3, repos: 45, temps: ["Rentre le menton…", "Relâche…"], consigne: "Double menton, langue au palais" },
    pourquoi: [
      "Contracte spécifiquement les muscles suprahyoïdiens, sous la mâchoire, sans faire travailler le cou de manière classique : on insiste sur le recul du menton.",
    ],
    etapes: [
      "Échauffe ton cou avant : 10 à 20 étirements et flexions légères.",
      "Allonge-toi sur le dos, la tête qui dépasse légèrement du lit ou du banc pour bouger librement.",
      "Garde la langue posée contre le palais pendant tout l'exercice.",
      "Fais des flexions lentes du cou en cherchant à « faire un ou plusieurs doubles mentons », sans ramener la tête vers la poitrine.",
      "Ne relève pas le cou de manière classique : insiste sur le recul du menton.",
    ],
    attention: "N'augmente pas trop vite, pour éviter les problèmes d'ATM. Progression : de 2 × 10 deux fois par semaine jusqu'à 5 × 25, 2 à 3 fois par semaine.",
  },
  {
    id: "hardmew", section: "machoire", emoji: "👅", nom: "Hard mewing", long: "Langue pressée contre le palais",
    jours: TOUS_LES_JOURS, xp: 20,
    presc: "10 × 10 s",
    coach: { type: "maintien", reps: 10, tenir: 10, repos: 5, consigne: "Presse fort la langue contre le palais" },
    pourquoi: [
      "Renforce la pression de la langue vers le haut sur le maxillaire, jusqu'à la brûlure musculaire.",
    ],
    etapes: [
      "Assis ou debout, dos droit.",
      "Ferme la bouche et presse fermement la langue contre le palais.",
      "Maintiens la pression 10 secondes, jusqu'à ressentir la brûlure musculaire.",
      "Répète 10 fois.",
    ],
  },
  {
    id: "mewing", section: "machoire", emoji: "🗿", nom: "Mewing", long: "Langue au palais, en continu",
    jours: TOUS_LES_JOURS, xp: 10,
    presc: "Toute la journée",
    pourquoi: [
      "Favorise une pression vers le haut sur le maxillaire, qui stimulerait son développement selon la théorie des sutures osseuses, et influence indirectement la position de la mâchoire.",
    ],
    etapes: [
      "Garde la langue en contact avec le palais, juste derrière les incisives.",
      "En continu, toute la journée : coche quand tu l'as tenu aujourd'hui.",
    ],
  },
  {
    id: "squint", section: "regard", groupe: "Orbicularis oculi", emoji: "🦅", nom: "Squinting contrôlé", long: "Plissement des yeux, front lisse",
    jours: [2, 4, 6], xp: 15,
    presc: "Jusqu'à la brûlure",
    coach: { type: "brulure", consigne: "Plisse les yeux, front lisse" },
    pourquoi: [
      "L'orbicularis oculi forme un anneau autour de l'œil : il contrôle le clignement, le plissement des yeux et l'expression des émotions par le regard.",
      "Entraîné, il améliore la symétrie du visage (un facteur clé d'attractivité), la capacité à transmettre des émotions sincères et le charisme, en renforçant le contact visuel.",
    ],
    etapes: [
      "Plisse les yeux de manière modérée en gardant le front lisse (pas de rides de froncement).",
      "Continue jusqu'à la brûlure musculaire.",
      "Dans la journée, garde discrètement cet engagement du regard.",
      "Objectif : un regard expressif, sans paraître fatigué ni crispé.",
    ],
  },
  {
    id: "serrage", section: "regard", groupe: "Orbicularis oculi", emoji: "😣", nom: "Serrage avec résistance", long: "Clignements contre les doigts",
    jours: [2, 4, 6], xp: 15,
    presc: "Légère brûlure",
    coach: { type: "brulure", consigne: "Cligne contre la pression des doigts" },
    pourquoi: [
      "Renforce l'orbicularis oculi contre une résistance, pour un regard plus tonique et plus symétrique.",
    ],
    etapes: [
      "Ferme fortement les yeux, les doigts posés sur les coins externes des yeux, en tirant doucement vers le haut.",
      "Résiste à ce tiraillement en clignant contre la pression des doigts.",
      "Un œil à la fois ou les deux en même temps.",
      "Répète jusqu'à ressentir une légère brûlure musculaire.",
    ],
  },
  {
    id: "miroir", section: "regard", groupe: "Orbicularis oculi", emoji: "🪞", nom: "Contrôle d'expression", long: "Sourire au miroir",
    jours: [2, 4, 6], xp: 10,
    presc: "Devant le miroir",
    pourquoi: [
      "Entraîne la coordination musculaire et aide à maîtriser l'expression « chaude » et engageante du regard.",
    ],
    etapes: [
      "Devant un miroir, entraîne-toi à sourire avec un léger plissement des yeux.",
      "Cherche un regard chaleureux et engageant, sans crispation.",
    ],
  },
  {
    id: "temporal", section: "regard", groupe: "Temporalis", emoji: "👂", nom: "Auriculaire postérieur", long: "Tire les sourcils vers l'arrière",
    jours: TOUS_LES_JOURS, xp: 15,
    presc: "12 × 5 s",
    coach: { type: "maintien", reps: 12, tenir: 5, repos: 3, consigne: "Contracte derrière les oreilles" },
    pourquoi: [
      "Renforce le temporalis : le muscle auriculaire postérieur, derrière l'oreille, tire les sourcils vers l'arrière.",
    ],
    etapes: [
      "Contracte le muscle auriculaire postérieur, derrière l'oreille.",
      "Maintiens la contraction 5 secondes, répète 10 à 15 fois par jour.",
      "Place les mains pour appliquer une légère résistance : c'est plus efficace.",
    ],
  },
  {
    id: "frontalis", section: "regard", groupe: "Temporalis", emoji: "😌", nom: "Relâcher le frontalis", long: "Front détendu, positive tilt",
    jours: TOUS_LES_JOURS, xp: 10,
    presc: "Devant le miroir",
    pourquoi: [
      "Un front relâché évite de tirer les sourcils vers le haut et aide le « positive tilt » du regard.",
    ],
    etapes: [
      "Devant un miroir, pratique la détente totale du muscle frontal.",
      "Tire doucement vers le bas les extrémités des sourcils avec les doigts, pour simuler le « positive tilt » sans activer le frontalis.",
    ],
  },
  {
    id: "occipital", section: "regard", groupe: "Temporalis", emoji: "💆", nom: "Activer l'occipitalis", long: "Cuir chevelu tiré vers l'arrière",
    jours: TOUS_LES_JOURS, xp: 15,
    presc: "10 × 5 s",
    coach: { type: "maintien", reps: 10, tenir: 5, repos: 3, consigne: "Contracte le cuir chevelu vers l'arrière" },
    pourquoi: [
      "Travaille avec le temporalis pour tirer le haut du visage vers l'arrière.",
    ],
    etapes: [
      "Assis, concentre ton attention sur la contraction du cuir chevelu vers l'arrière.",
      "Tiens 5 secondes, répète une dizaine de fois.",
    ],
  },
  {
    id: "cardio", section: "cardio", emoji: "🏃", nom: "Cardio 1 h", long: "Marche rapide, course, vélo…",
    jours: TOUS_LES_JOURS, xp: 40,
    presc: "1 heure",
    pourquoi: [
      "Idéalement 1 heure de cardio par jour : pour perdre du gras et réduire l'inflammation, qui empâtent les traits du visage.",
    ],
    etapes: [
      "Une heure d'effort continu : marche rapide, course, vélo, natation, rameur…",
      "Coche quand ton heure est faite.",
    ],
  },
];

/* ---------- Lifestyle change ----------
   type : "jour" (à cocher chaque jour), "double" (matin + soir), "semaine" (1 fois par semaine), "info" (à savoir). */
const LIFESTYLE = [
  {
    id: "symetrie", num: "I", nom: "Symétrie du visage", emoji: "⚖️", couleur: "#4ee6c1",
    intro: "Un visage symétrique se construit au quotidien : mastication, sommeil et posture.",
    items: [
      { id: "mastication", type: "jour", emoji: "🦷", nom: "Mastiquer en alternant les deux côtés", court: "Mastique en alternant les deux côtés" },
      { id: "dur", type: "jour", emoji: "🥕", nom: "Mâcher des aliments durs, longtemps", court: "Mâche des aliments durs, longtemps" },
      { id: "dos", type: "jour", emoji: "🛌", nom: "Dormir sur le dos", court: "Dors sur le dos" },
      { id: "posture", type: "jour", emoji: "🧍", nom: "Posture : tête et cou alignés", court: "Corrige ta posture : tête et cou alignés" },
    ],
  },
  {
    id: "skincare", num: "II", nom: "Skincare", emoji: "🧴", couleur: "#ff8fc7",
    intro: "Hydratation primordiale et écran solaire tous les jours pour prévenir le vieillissement. Une routine de produits minimaliste.",
    items: [
      { id: "eau", type: "jour", emoji: "💧", nom: "2 L d'eau minimum", court: "Bois 2 L d'eau minimum par jour" },
      { id: "spf", type: "jour", emoji: "🧴", nom: "Écran solaire", court: "Écran solaire tous les jours" },
      { id: "nettoyage", type: "double", moments: ["Matin", "Soir"], emoji: "🫧", nom: "Nettoyer sa peau, nettoyant doux", court: "Nettoie ta peau 2 fois par jour avec un nettoyant doux" },
      { id: "touche", type: "jour", emoji: "✋", nom: "Ne pas toucher son visage", court: "Ne touche pas ton visage" },
      { id: "linge", type: "semaine", emoji: "🧺", nom: "Laver ou changer serviettes et taies", court: "Lave et change souvent serviettes et oreillers" },
      { id: "routine", type: "info", emoji: "🧪", nom: "Routine minimaliste", texte: "Peu de produits, bien choisis : nettoyant doux, hydratant, écran solaire.", court: "Routine de produits minimaliste" },
    ],
  },
  {
    id: "nutrition", num: "III", nom: "Nutrition et hormones", emoji: "⚡", couleur: "#ffc23d",
    intro: "Booster l'IGF-1 naturellement et maîtriser l'insuline, pour la peau et la forme.",
    groupes: ["1 · Booster l'IGF-1 naturellement", "2 · Maîtriser l'insuline (peau et forme)"],
    items: [
      { id: "sucre", groupe: 0, type: "jour", emoji: "🍬", nom: "Zéro sucre", court: "Supprime le sucre, définitivement" },
      { id: "alcool", groupe: 0, type: "jour", emoji: "🍷", nom: "Zéro alcool", court: "Supprime l'alcool, définitivement" },
      { id: "proteines", groupe: 0, type: "jour", emoji: "🥩", nom: "Protéines complètes, bonnes graisses, glucides complexes", court: "Protéines complètes, graisses saines, glucides complexes" },
      { id: "muscu", groupe: 0, type: "jour", emoji: "🏋️", nom: "Musculation lourde (séries modérées) ou HIIT", court: "Musculation lourde en séries modérées, et du HIIT" },
      { id: "sommeil", groupe: 0, type: "jour", emoji: "😴", nom: "Sommeil de 7 à 9 h", court: "Dors 7 à 9 heures" },
      { id: "lumiere", groupe: 0, type: "jour", emoji: "☀️", nom: "Lumière naturelle", court: "Expose-toi à la lumière naturelle" },
      { id: "froid", groupe: 0, type: "jour", emoji: "🧊", nom: "Thérapie froid / chaud", court: "Thérapies froid / chaud pour optimiser l'IGF-1" },
      { id: "complements", groupe: 0, type: "info", emoji: "💊", nom: "Compléments possibles", texte: "Colostrum, L-arginine, créatine, zinc, ashwagandha.", court: "Compléments possibles : colostrum, L-arginine, créatine, zinc, ashwagandha" },
      { id: "intime", groupe: 0, type: "info", emoji: "❤️", nom: "Activité sexuelle régulière", texte: "Elle fait aussi partie des leviers naturels de l'IGF-1.", court: "Activité sexuelle régulière" },
      { id: "ig", groupe: 1, type: "jour", emoji: "📉", nom: "Repas à indice glycémique bas, riches en fibres", court: "Alimentation à faible indice glycémique, riche en fibres" },
      { id: "macros", groupe: 1, type: "jour", emoji: "🍽️", nom: "Associer les macronutriments", court: "Associe les macronutriments à chaque repas" },
      { id: "glucides", groupe: 1, type: "info", emoji: "🍚", nom: "Glucides après l'entraînement", texte: "C'est là que la sensibilité à l'insuline est la meilleure.", court: "Glucides après l'entraînement : meilleure sensibilité à l'insuline" },
    ],
  },
];

/* ---------- Rangs (un emblème par rang) ---------- */
const RANGS = [
  { id: "argile", nom: "Argile", des: 1, c1: "#e2b48a", c2: "#8a5532", c3: "#5a3218" },
  { id: "pierre", nom: "Pierre", des: 5, c1: "#d3d9e2", c2: "#7d8594", c3: "#454b57" },
  { id: "bronze", nom: "Bronze", des: 10, c1: "#ffc48a", c2: "#c46a2b", c3: "#6e3511" },
  { id: "argent", nom: "Argent", des: 15, c1: "#ffffff", c2: "#aeb9c9", c3: "#5f6b7d" },
  { id: "or", nom: "Or", des: 20, c1: "#fff1a8", c2: "#f2b51c", c3: "#9a6200" },
  { id: "marbre", nom: "Marbre", des: 28, c1: "#ffffff", c2: "#dcdde4", c3: "#8d8f9c" },
  { id: "diamant", nom: "Diamant", des: 36, c1: "#e3fdff", c2: "#5fd8ff", c3: "#1563c9" },
  { id: "apollon", nom: "Apollon", des: 45, c1: "#fff6c2", c2: "#ffc21a", c3: "#7b4dff" },
];

/* ---------- Trophées ---------- */
// t(s) reçoit les statistiques calculées ; p(s) donne [valeur, objectif] pour la barre de progression.
const TROPHEES = [
  { id: "premier-pas", emoji: "👣", nom: "Premier pas", des: "Coche ton premier exercice", xp: 20, p: (s) => [s.coches, 1] },
  { id: "parfait", emoji: "✨", nom: "Journée parfaite", des: "Termine tout le programme d'un jour", xp: 50, p: (s) => [s.parfaits, 1] },
  { id: "serie-3", emoji: "🔥", nom: "En chauffe", des: "3 jours parfaits d'affilée", xp: 50, p: (s) => [s.record, 3] },
  { id: "serie-7", emoji: "🔥", nom: "Une semaine de feu", des: "7 jours parfaits d'affilée", xp: 100, p: (s) => [s.record, 7] },
  { id: "serie-14", emoji: "⚡", nom: "Quinze jours", des: "14 jours parfaits d'affilée", xp: 150, p: (s) => [s.record, 14] },
  { id: "serie-30", emoji: "💎", nom: "Un mois de fer", des: "30 jours parfaits d'affilée", xp: 300, p: (s) => [s.record, 30] },
  { id: "serie-60", emoji: "🗿", nom: "Statue", des: "60 jours parfaits d'affilée", xp: 500, p: (s) => [s.record, 60] },
  { id: "serie-100", emoji: "👑", nom: "Centurion", des: "100 jours parfaits d'affilée", xp: 800, p: (s) => [s.record, 100] },
  { id: "serie-180", emoji: "🏛️", nom: "Apollon", des: "180 jours parfaits d'affilée", xp: 1500, p: (s) => [s.record, 180] },
  { id: "engage", emoji: "✍️", nom: "Engagé", des: "Signe le défi 6 mois", xp: 50, p: (s) => [s.defiSigne ? 1 : 0, 1] },
  { id: "defi-30", emoji: "🥉", nom: "Premier mois", des: "Atteins le jour 30 du défi", xp: 150, p: (s) => [s.defiJour, 30] },
  { id: "defi-90", emoji: "🥈", nom: "Mi-parcours", des: "Atteins le jour 90 du défi", xp: 400, p: (s) => [s.defiJour, 90] },
  { id: "defi-180", emoji: "🥇", nom: "Défi accompli", des: "Va au bout des 6 mois", xp: 1000, p: (s) => [s.defiJour, 180] },
  { id: "mpr-25", emoji: "🦴", nom: "Mâchoire d'acier", des: "25 séances de MPR", xp: 150, p: (s) => [s.seances.mpr, 25] },
  { id: "chin-25", emoji: "🗡️", nom: "Menton sculpté", des: "25 séances de chin raises", xp: 150, p: (s) => [s.seances.chin, 25] },
  { id: "mew-30", emoji: "👅", nom: "Langue de fer", des: "30 jours de hard mewing", xp: 150, p: (s) => [s.seances.hardmew, 30] },
  { id: "regard-25", emoji: "🦅", nom: "Hunter eyes", des: "25 séances de squinting", xp: 150, p: (s) => [s.seances.squint, 25] },
  { id: "cardio-30", emoji: "🏃", nom: "Machine", des: "30 heures de cardio", xp: 200, p: (s) => [s.seances.cardio, 30] },
  { id: "coach-10", emoji: "🎧", nom: "Coaché", des: "10 séances guidées terminées", xp: 100, p: (s) => [s.guidees, 10] },
  { id: "eau-7", emoji: "💧", nom: "Hydraté", des: "2 L d'eau, 7 jours d'affilée", xp: 75, p: (s) => [s.lsRecord.eau, 7] },
  { id: "sucre-14", emoji: "🍬", nom: "Zéro sucre", des: "14 jours sans sucre d'affilée", xp: 150, p: (s) => [s.lsRecord.sucre, 14] },
  { id: "jackpot", emoji: "🌟", nom: "Jackpot", des: "Ouvre un coffre légendaire", xp: 100, p: (s) => [s.legendaires, 1] },
  { id: "phenix", emoji: "🐦‍🔥", nom: "Phénix", des: "7 jours parfaits juste après une cassure", xp: 150, p: (s) => [s.phenix, 7] },
  { id: "niveau-10", emoji: "⭐", nom: "Niveau 10", des: "Atteins le rang Bronze", xp: 100, p: (s) => [s.niveau, 10] },
  { id: "niveau-25", emoji: "🌠", nom: "Niveau 25", des: "Monte jusqu'au niveau 25", xp: 250, p: (s) => [s.niveau, 25] },
];

/* ---------- Coffres et phrases ---------- */
const RARETES = [
  { id: "commun", nom: "Commun", min: 25, max: 40, couleur: "#a9b3c7" },
  { id: "rare", nom: "Rare", min: 60, max: 90, couleur: "#37dcff" },
  { id: "epique", nom: "Épique", min: 120, max: 160, couleur: "#b07bff" },
  { id: "legendaire", nom: "Légendaire", min: 300, max: 300, couleur: "#ffc21a" },
];

const PHRASES = [
  "La discipline sculpte ce que la génétique a ébauché.",
  "Chaque répétition est un coup de ciseau.",
  "Les résultats viennent à ceux qui ne cassent pas la chaîne.",
  "Ton visage de dans 6 mois se construit aujourd'hui.",
  "Petit effort quotidien, grande transformation.",
  "Le marbre ne devient statue qu'avec de la patience.",
  "Tu n'as pas besoin de motivation. Tu as besoin d'une série.",
  "Un jour parfait de plus. Puis un autre.",
  "La constance bat l'intensité.",
  "Les autres verront le résultat. Toi, tu connais le travail.",
  "Garde la langue au palais et les yeux sur l'objectif.",
  "Le plus dur, c'est de commencer. Tu l'as déjà fait.",
  "Ce que tu répètes, tu le deviens.",
  "Six mois, c'est court quand on avance chaque jour.",
  "Ne compte pas les jours, fais que les jours comptent.",
  "La meilleure version de ton visage t'attend au jour 180.",
];
