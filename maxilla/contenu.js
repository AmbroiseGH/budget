"use strict";

/* =========================================================
   Le contenu de la méthode Maxilla.
   Jours de la semaine : 0 = dimanche, 1 = lundi … 6 = samedi.
   ========================================================= */

const TOUS_LES_JOURS = [0, 1, 2, 3, 4, 5, 6];

/* ---------- Le défi : les exercices à cocher ----------
   L'id « squint » est celui de l'ancien squinting contrôlé : les cases déjà cochées restent valables. */
const EXERCICES = [
  {
    id: "mpr", icone: "pouce", nom: "MPR", long: "Mental Protuberance Resistance",
    presc: "5 × 20", unite: { par: 100, mot: "répétition" },
    pourquoi: [
      "Le MPR renforce les muscles suprahyoïdiens, sous le menton. Plus forts et plus toniques, ils remontent l'os hyoïde et dessinent l'angle entre le cou et la mâchoire.",
    ],
    etapes: [
      "Place tes pouces sous ton menton.",
      "Mains jointes comme en prière, la base des index appuyée contre l'avant du menton.",
      "Ouvre et ferme doucement la bouche contre la résistance de tes pouces.",
      "5 séries de 20, avec une pause entre les séries.",
      "Augmente la pression petit à petit, au fil des semaines.",
    ],
    attention: "Jamais de douleur ni de craquement dans la mâchoire (risque pour l'ATM, l'articulation de la mâchoire). Si ça craque, allège la pression.",
  },
  {
    id: "hardmew", icone: "langue", nom: "Hard mewing", long: "Langue pressée contre le palais",
    presc: "5 × 10 s", unite: { par: 50, mot: "seconde", duree: true },
    pourquoi: [
      "Presser fort la langue contre le palais pousse le maxillaire vers le haut et fait travailler les muscles sous la mâchoire.",
    ],
    etapes: [
      "Assis ou debout, le dos droit.",
      "Ferme la bouche et presse fermement toute la langue contre le palais.",
      "Tiens 10 secondes, jusqu'à sentir la brûlure musculaire.",
      "Relâche, puis recommence : 5 fois.",
    ],
  },
  {
    id: "squint", icone: "oeil", nom: "Orbicularis oculi", long: "Plissements contrôlés des yeux",
    presc: "1 × 100", unite: { par: 100, mot: "plissement" },
    pourquoi: [
      "L'orbicularis oculi est l'anneau de muscle autour de l'œil. Entraîné, il donne un regard plus intense et plus symétrique.",
    ],
    etapes: [
      "Plisse le bas des paupières de façon modérée, en gardant le front parfaitement lisse.",
      "Relâche, puis recommence.",
      "100 plissements d'affilée.",
      "Pour corser : pose deux doigts sur les coins externes des yeux et plisse contre cette résistance.",
    ],
  },
  {
    id: "chin", icone: "lit", nom: "Supine chin raises", long: "Élévations du menton, allongé sur le dos",
    presc: "5 × 20", unite: { par: 100, mot: "répétition" },
    pourquoi: [
      "Contracte les muscles sous la mâchoire, en insistant sur le recul du menton, sans faire travailler le cou de façon classique.",
    ],
    etapes: [
      "Échauffe ton cou : 10 à 20 étirements et flexions légères.",
      "Allonge-toi sur le dos, la tête qui dépasse légèrement du lit.",
      "Garde la langue contre le palais pendant tout l'exercice.",
      "Rentre lentement le menton comme pour faire un double menton, sans ramener la tête vers la poitrine.",
      "5 séries de 20.",
    ],
    attention: "Ne force pas et monte en charge doucement, pour ménager l'ATM (l'articulation de la mâchoire).",
  },
  {
    id: "cardio", icone: "coeur", nom: "Cardio", long: "Marche rapide, course, vélo, natation…",
    presc: "40 min", unite: { par: 40, mot: "minute", duree: true },
    pourquoi: [
      "Le cardio fait fondre le gras et réduit l'inflammation, qui empâtent les traits du visage.",
    ],
    etapes: [
      "40 minutes d'effort continu : marche rapide, course, vélo, natation, rameur…",
      "Coche quand tes 40 minutes sont faites.",
    ],
  },
];

/* ---------- Le programme ----------
   Pour changer de programme plus tard, ajoute une entrée avec sa date de départ :
   les jours passés gardent le programme qu'ils avaient, la courbe ne bouge pas après coup. */
const PROGRAMMES = [
  {
    depuis: "2026-11-10",
    plan: { mpr: TOUS_LES_JOURS, hardmew: TOUS_LES_JOURS, squint: TOUS_LES_JOURS, chin: [1, 3, 5], cardio: [2, 4] },
  },
];

/* ---------- Fun facts : tout le reste de la méthode ----------
   texte : la version complète (onglet Lifestyle). court : la version du bandeau qui défile. */
const FUN_FACTS = [
  {
    id: "bonus", nom: "Exercices bonus", icone: "etincelles",
    intro: "Les autres exercices de la méthode, à faire quand tu veux. Ils ne comptent pas pour le défi.",
    faits: [
      { titre: "Mewing", texte: "Garde la langue collée au palais, la pointe juste derrière les incisives, toute la journée. Selon la théorie des sutures, cette pression douce vers le haut stimulerait le maxillaire.", court: "Mewing : la langue au palais, juste derrière les incisives, toute la journée." },
      { titre: "Le regard « hunter eyes »", texte: "Un léger plissement du bas des paupières, front lisse, rend le regard plus intense. Tu peux le garder discrètement toute la journée.", court: "Un léger plissement des yeux, front lisse, rend le regard plus intense." },
      { titre: "Serrage avec résistance", texte: "Doigts sur les coins externes des yeux, tire doucement vers le haut et cligne contre la résistance, jusqu'à une légère brûlure.", court: "Cligner contre la résistance des doigts fait travailler l'orbiculaire plus fort." },
      { titre: "Le sourire sincère", texte: "Un vrai sourire plisse aussi les yeux : c'est l'orbiculaire qui fait la différence. Devant le miroir, entraîne-toi à sourire avec un léger plissement, pour un regard chaleureux.", court: "Un sourire sincère plisse aussi les yeux : c'est l'orbiculaire qui fait la différence." },
      { titre: "Auriculaire postérieur", texte: "Le petit muscle derrière l'oreille travaille avec le temporal. Contracte-le 5 secondes, 10 à 15 fois par jour, avec une légère résistance de la main.", court: "Le muscle derrière l'oreille se muscle aussi : 5 secondes, 10 à 15 fois par jour." },
      { titre: "Front relâché", texte: "Un front crispé remonte les sourcils. Devant le miroir, relâche complètement le front et tire doucement la queue des sourcils vers le bas : tu simules un « positive tilt ».", court: "Un front relâché évite de remonter les sourcils et aide le « positive tilt »." },
      { titre: "Occipitalis", texte: "À l'arrière du crâne, l'occipitalis tire le cuir chevelu vers l'arrière, avec le temporal. Contracte-le 5 secondes, une dizaine de fois.", court: "L'occipitalis, à l'arrière du crâne, tire le cuir chevelu vers l'arrière." },
    ],
  },
  {
    id: "symetrie", nom: "Symétrie du visage", icone: "balance",
    intro: "Un visage symétrique se construit au quotidien : mastication, sommeil et posture.",
    faits: [
      { titre: "Mastication alternée", texte: "Mâcher toujours du même côté fait travailler un côté de la mâchoire plus que l'autre. Alterne les deux côtés.", court: "Mâcher toujours du même côté muscle un côté de la mâchoire plus que l'autre." },
      { titre: "Aliments durs", texte: "Des aliments durs, mâchés longtemps, font travailler les masséters, les muscles de la mâchoire.", court: "Les aliments durs, mâchés longtemps, font travailler les masséters." },
      { titre: "Dormir sur le dos", texte: "Sur le ventre ou toujours du même côté, la même joue est écrasée des heures chaque nuit. Sur le dos, ton visage reste libre.", court: "Sur le dos, ton visage n'est pas écrasé contre l'oreiller pendant des heures." },
      { titre: "Posture", texte: "Une tête projetée vers l'avant efface le menton. Aligne la tête sur le cou : les oreilles au-dessus des épaules.", court: "Une tête projetée vers l'avant efface le menton : oreilles au-dessus des épaules." },
    ],
  },
  {
    id: "skincare", nom: "Skincare", icone: "goutte",
    intro: "Hydratation et écran solaire tous les jours, avec une routine minimaliste.",
    faits: [
      { titre: "2 litres d'eau", texte: "Bois au moins 2 litres d'eau par jour : l'hydratation est la base d'une belle peau.", court: "Au moins 2 litres d'eau par jour : la base d'une belle peau." },
      { titre: "Écran solaire", texte: "Le soleil est la première cause du vieillissement visible de la peau, et les UV traversent les nuages. Écran solaire tous les jours, même quand il fait gris.", court: "Les UV traversent les nuages : écran solaire tous les jours, même quand il fait gris." },
      { titre: "Routine minimaliste", texte: "Peu de produits, bien choisis : un nettoyant doux, un hydratant, un écran solaire. Une routine courte se tient plus facilement.", court: "Peu de produits, bien choisis : nettoyant doux, hydratant, écran solaire." },
      { titre: "Nettoyage", texte: "Nettoie ta peau deux fois par jour, matin et soir, avec un nettoyant doux.", court: "Nettoie ta peau matin et soir avec un nettoyant doux." },
      { titre: "Mains loin du visage", texte: "Tes mains déposent sébum et bactéries sur ta peau. Moins tu touches ton visage, mieux elle se porte.", court: "Tes mains déposent sébum et bactéries : ne touche pas ton visage." },
      { titre: "Taies et serviettes", texte: "Taies d'oreiller et serviettes accumulent sébum et bactéries. Lave-les et change-les souvent.", court: "Taies et serviettes accumulent sébum et bactéries : change-les souvent." },
    ],
  },
  {
    id: "nutrition", nom: "Nutrition et hormones", icone: "pomme",
    intro: "Booster l'IGF-1 naturellement et maîtriser l'insuline, pour la peau et la forme.",
    faits: [
      { groupe: "Booster l'IGF-1", titre: "Zéro sucre, zéro alcool", texte: "À supprimer définitivement : c'est la base de la méthode.", court: "Zéro sucre, zéro alcool : la base de la méthode." },
      { groupe: "Booster l'IGF-1", titre: "L'assiette", texte: "À chaque repas : des protéines complètes, des graisses saines et des glucides complexes.", court: "À chaque repas : protéines complètes, graisses saines, glucides complexes." },
      { groupe: "Booster l'IGF-1", titre: "Muscu lourde et HIIT", texte: "Musculation lourde en séries modérées, et du HIIT : les efforts intenses font grimper l'hormone de croissance.", court: "Muscu lourde et HIIT : les efforts intenses font grimper l'hormone de croissance." },
      { groupe: "Booster l'IGF-1", titre: "Sommeil", texte: "L'hormone de croissance est surtout libérée pendant le sommeil profond. Dors 7 à 9 heures.", court: "L'hormone de croissance est surtout libérée pendant le sommeil profond : dors 7 à 9 h." },
      { groupe: "Booster l'IGF-1", titre: "Lumière naturelle", texte: "La lumière du jour, surtout le matin, règle ton horloge interne et améliore ton sommeil.", court: "La lumière du matin règle ton horloge interne et améliore ton sommeil." },
      { groupe: "Booster l'IGF-1", titre: "Froid et chaud", texte: "Douche froide, sauna : les thérapies par le froid et le chaud font partie des leviers de la méthode pour optimiser l'IGF-1.", court: "Douche froide et sauna font partie des leviers de la méthode pour l'IGF-1." },
      { groupe: "Booster l'IGF-1", titre: "Compléments possibles", texte: "Colostrum, L-arginine, créatine, zinc, ashwagandha. Demande l'avis d'un médecin avant d'en prendre.", court: "Compléments cités par la méthode : colostrum, L-arginine, créatine, zinc, ashwagandha." },
      { groupe: "Booster l'IGF-1", titre: "Vie intime", texte: "Une activité sexuelle régulière fait aussi partie des leviers naturels de la méthode.", court: "Une activité sexuelle régulière fait partie des leviers naturels de la méthode." },
      { groupe: "Maîtriser l'insuline", titre: "Index glycémique bas", texte: "Privilégie les aliments à index glycémique bas : légumineuses, céréales complètes, légumes.", court: "Légumineuses, céréales complètes, légumes : un index glycémique bas." },
      { groupe: "Maîtriser l'insuline", titre: "Fibres", texte: "Les fibres ralentissent l'arrivée du sucre dans le sang.", court: "Les fibres ralentissent l'arrivée du sucre dans le sang." },
      { groupe: "Maîtriser l'insuline", titre: "Associer les macros", texte: "Protéines, graisses et glucides dans le même repas : la glycémie monte moins fort.", court: "Protéines, graisses et glucides dans le même repas : la glycémie monte moins fort." },
      { groupe: "Maîtriser l'insuline", titre: "Glucides après l'effort", texte: "Juste après l'entraînement, tes muscles captent mieux les glucides : c'est le meilleur moment pour en manger.", court: "Après l'entraînement, tes muscles captent mieux les glucides." },
    ],
  },
];

/* ---------- Phrases du jour (sous le bonjour) ---------- */
const PHRASES = [
  "Une habitude à la fois.",
  "La discipline sculpte ce que la génétique a ébauché.",
  "Chaque répétition est un coup de ciseau.",
  "Ton visage de dans 6 mois se construit aujourd'hui.",
  "Petit effort quotidien, grande transformation.",
  "La constance bat l'intensité.",
  "Tu n'as pas besoin de motivation. Tu as besoin d'une série.",
  "Un jour parfait de plus. Puis un autre.",
  "Ce que tu répètes, tu le deviens.",
  "Six mois, c'est court quand on avance chaque jour.",
  "Ne compte pas les jours, fais que les jours comptent.",
  "Les autres verront le résultat. Toi, tu connais le travail.",
];
