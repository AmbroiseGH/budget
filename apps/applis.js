/* =========================================================
   Les applis réunies dans Apps.
   Chaque appli garde ses données sous sa propre clé (localStorage), comme avant :
   Apps ne fait que les lire (pastilles, bandeau) et les sauvegarder ensemble.
   Pour ajouter une appli : une entrée ici, puis pont.js dans sa page (voir pont.js).

   Chargé par l'accueil d'Apps, et par pont.js dans chaque appli (pour la sauvegarde
   commune) : rien d'autre que window.AppsCatalogue n'est ajouté à la page.
   ========================================================= */
(function () {
  "use strict";
  if (window.AppsCatalogue) return;

  const nbCles = (o) => (o && typeof o === "object" && !Array.isArray(o) ? Object.keys(o).length : 0);
  const estObjet = (o) => !!o && typeof o === "object" && !Array.isArray(o);

  const APPLIS = [
    {
      id: "budget", nom: "Budget", dossier: "", cle: "budget.v1", couleur: "#16a36b",
      unite: ["mouvement", "mouvements"],
      valide: (d) => estObjet(d) && Array.isArray(d.mouvements),
      compter: (d) => d.mouvements.length,
      ancienne: { dossier: "budget", fichier: "budget.json" },
    },
    {
      id: "courses", nom: "Courses", dossier: "courses/", cle: "courses.v1", couleur: "#0d9466",
      unite: ["article", "articles"],
      valide: (d) => estObjet(d) && Array.isArray(d.articles) && Array.isArray(d.recurrents),
      compter: (d) => d.articles.length + d.recurrents.length,
      resume: (d) => `${pl(d.articles.length, "article")} sur la liste · ${pl(d.recurrents.length, "récurrent")}`,
    },
    {
      id: "habitudes", nom: "Habitudes", dossier: "habitudes/", cle: "habitudes.v1", couleur: "#ea5f12",
      unite: ["jour", "jours"],
      valide: (d) => estObjet(d) && Array.isArray(d.habitudes) && estObjet(d.jours),
      compter: (d) => nbCles(d.jours),
      ancienne: { dossier: "habit tracker", fichier: "habitudes.json" },
    },
    {
      id: "todo", nom: "Tâches", dossier: "todo/", cle: "todo.v1", couleur: "#2f6bff",
      unite: ["tâche", "tâches"],
      valide: (d) => estObjet(d) && Array.isArray(d.taches),
      compter: (d) => d.taches.length,
    },
    {
      id: "journal", nom: "Journal", dossier: "journal/", cle: "journal.v1", couleur: "#6a4ff0",
      unite: ["journée", "journées"],
      valide: (d) => estObjet(d) && estObjet(d.jours),
      compter: (d) => nbCles(d.jours) + (d.secret ? 1 : 0),
      resume: (d) => pl(nbCles(d.jours), "journée") + (d.secret ? " · journal secret" : ""),
      ancienne: { dossier: "journal", fichier: "journal.json" },
    },
    {
      id: "maxilla", nom: "Maxilla", dossier: "maxilla/", cle: "maxilla.v1", couleur: "#b39af7",
      unite: ["jour", "jours"],
      valide: (d) => estObjet(d) && estObjet(d.jours),
      compter: (d) => nbCles(d.jours),
      ancienne: { dossier: "maxilla", fichier: "maxilla.json" },
    },
    {
      id: "salle", nom: "Salle", dossier: "salle/", cle: "salle.v1", couleur: "#8b5cf6",
      unite: ["séance", "séances"],
      valide: (d) => estObjet(d) && Array.isArray(d.seances) && Array.isArray(d.exercices),
      compter: (d) => d.seances.length + (Array.isArray(d.modeles) ? d.modeles.length : 0),
      resume: (d) => `${pl(d.seances.filter((s) => s && s.fin).length, "séance")} · ${pl(Array.isArray(d.modeles) ? d.modeles.length : 0, "séance type", "séances types")}`,
      ancienne: { dossier: "salle", fichier: "salle.json" },
    },
  ];
  const APPLI = Object.fromEntries(APPLIS.map((a) => [a.id, a]));
  const APPLI_PAR_CLE = Object.fromEntries(APPLIS.map((a) => [a.cle, a]));

  function pl(n, un, plusieurs) {
    const f = new Intl.NumberFormat("fr-FR").format(n);
    return `${f} ${n > 1 ? plusieurs || un.split(" ").map((m) => (/[sx]$/.test(m) ? m : m + "s")).join(" ") : un}`;
  }

  // Les données d'une appli sur cet appareil : { brut, donnees, valide, n, resume }.
  function lireAppli(a) {
    let brut = null;
    try { brut = localStorage.getItem(a.cle); } catch (e) {}
    if (brut === null) return { brut: null, donnees: null, valide: false, n: 0, resume: "" };
    let d = null;
    try { d = JSON.parse(brut); } catch (e) {}
    const ok = a.valide(d);
    return { brut, donnees: ok ? d : null, valide: ok, n: ok ? a.compter(d) : 0, resume: ok ? resumeDe(a, d) : "illisible" };
  }
  function resumeDe(a, d) {
    if (!a.valide(d)) return "";
    return a.resume ? a.resume(d) : pl(a.compter(d), a.unite[0], a.unite[1]);
  }

  window.AppsCatalogue = { APPLIS, APPLI, APPLI_PAR_CLE, pl, lireAppli, resumeDe };
})();
