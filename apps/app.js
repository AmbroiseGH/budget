"use strict";

/* =========================================================
   Apps : l'accueil qui réunit toutes les applis.
   - une icône par appli, avec une pastille rouge (ce qui reste à faire) ;
   - un bandeau qui défile avec ce qu'il reste à faire aujourd'hui ;
   - la roue des réglages : sauvegarde Google Drive commune, récupération des données.
   Les applis s'ouvrent dans Apps et y gardent leurs données, chacune sous sa clé.
   La présence de « apps.v1 » dit aux applis qu'elles tournent dans Apps (voir pont.js).
   ========================================================= */

const CLE = "apps.v1";
const $ = (id) => document.getElementById(id);
const BASE = new URL("../", location.href).href;
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const autonome = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const lienDe = (a) => BASE + a.dossier;
const iconeDe = (a) => BASE + a.dossier + "icons/icon-180.png";

/* ---------- Réglages d'Apps ---------- */
function lireReglages() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(CLE)); } catch (e) {}
  if (!r || typeof r !== "object" || Array.isArray(r)) r = { version: 1, cree: new Date().toISOString() };
  if (typeof r.prenom !== "string") r.prenom = "";
  if (!r.vu || typeof r.vu !== "object") r.vu = {};
  return r;
}
let reglages = lireReglages();
function sauverReglages() {
  try { localStorage.setItem(CLE, JSON.stringify(reglages)); } catch (e) {}
}
sauverReglages();

/* ---------- Dates (AAAA-MM-JJ, heure locale) ---------- */
const deux = (n) => String(n).padStart(2, "0");
const cleDe = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
const dateDe = (k) => { const [a, m, j] = k.split("-").map(Number); return new Date(a, m - 1, j); };
const lundiDe = (k) => { const d = dateDe(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return cleDe(d); };
const jourDeIso = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : cleDe(d); };
const moisDeIso = (iso) => jourDeIso(iso).slice(0, 7);
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "long" });
const liste = (noms) => noms.join(" · ");

/* =========================================================
   Ce qui reste à faire, appli par appli
   Chaque fonction reçoit les données de l'appli et renvoie
   { pastille, infos: [phrases du bandeau] }.
   ========================================================= */

const ETATS = {
  // Une pastille tant que rien n'est noté aujourd'hui (ou jusqu'à ce que Budget soit ouvert),
  // une autre quand le bilan du mois dernier attend d'être lu.
  budget(d, c) {
    const noteAujourdhui = d.mouvements.some((m) => m && jourDeIso(m.date) === c.t);
    let pastille = 0;
    const infos = [];
    if (!noteAujourdhui) {
      if (c.vu.budget !== c.t) pastille++;
      infos.push(c.heure >= 18 ? "As-tu noté tes dépenses d'aujourd'hui ?" : "Pense à noter tes dépenses au fil de la journée");
    }
    const prec = new Date(); prec.setDate(1); prec.setMonth(prec.getMonth() - 1);
    const cle = `${prec.getFullYear()}-${deux(prec.getMonth() + 1)}`;
    if (d.bilanVu !== cle && d.mouvements.some((m) => m && moisDeIso(m.date) === cle)) {
      pastille++;
      const mois = fmtMois.format(prec);
      infos.push(`Ton bilan ${/^[aeiou]/i.test(mois) ? "d'" : "de "}${mois} est prêt`);
    }
    return { pastille, infos };
  },

  // Les articles encore à prendre.
  courses(d) {
    return { pastille: d.articles.filter((a) => a && !a.fait).length, infos: [] };
  },

  // Les habitudes pas encore cochées aujourd'hui.
  habitudes(d, c) {
    const faits = new Set(Array.isArray(d.jours[c.t]) ? d.jours[c.t] : []);
    const reste = d.habitudes.filter((h) => h && !faits.has(h.id));
    return {
      pastille: reste.length,
      infos: reste.length ? [`${reste.length > 1 ? `Encore ${reste.length} habitudes` : "Encore 1 habitude"} : ${liste(reste.map((h) => h.nom))}`] : [],
    };
  },

  // Les tâches prévues aujourd'hui ou en retard.
  todo(d, c) {
    const a = d.taches.filter((x) => x && !x.fait && typeof x.jour === "string" && x.jour <= c.t);
    const retard = a.filter((x) => x.jour < c.t).length;
    return {
      pastille: a.length,
      infos: a.length ? [`${pl(a.length, "tâche")} pour aujourd'hui${retard ? ` (dont ${retard} en retard)` : ""} : ${liste(a.map((x) => x.nom))}`] : [],
    };
  },

  // Les exercices du jour pas encore cochés (le programme vient de maxilla/contenu.js).
  maxilla(d, c) {
    if (typeof PROGRAMMES === "undefined" || typeof EXERCICES === "undefined") return null;
    const t = c.t, js = dateDe(t).getDay();
    let plan = PROGRAMMES[0].plan;
    for (const p of PROGRAMMES) { if (p.depuis <= t) plan = p.plan; else break; }
    const dose = (e) => {
      let x = e.presc;
      for (const p of PROGRAMMES) { if (p.depuis > t) break; if (p.doses && p.doses[e.id] && p.doses[e.id].presc) x = p.doses[e.id].presc; }
      return x;
    };
    const faits = (d.jours[t] && Array.isArray(d.jours[t].ex)) ? d.jours[t].ex : [];
    const reste = EXERCICES.filter((e) => (plan[e.id] || []).includes(js) && !faits.includes(e.id));
    return { pastille: reste.length, infos: reste.length ? [`Maxilla : ${liste(reste.map((e) => `${e.nom} ${dose(e)}`))}`] : [] };
  },

  // La journée à noter (elle se termine à 3 h du matin, comme dans Journal).
  journal(d, c) {
    if (d.jours[c.tJournal]) return { pastille: 0, infos: [] };
    const soir = c.heure >= 18 || c.heure < 3;
    return { pastille: 1, infos: [soir ? "Note ta journée dans Journal" : "Ce soir, pense à noter ta journée dans Journal"] };
  },

  // Les séances qui manquent pour l'objectif de la semaine (ou la séance commencée).
  salle(d, c) {
    const modeles = Array.isArray(d.modeles) ? d.modeles : [];
    if (!d.seances.length && !modeles.length && !d.enCours) return { pastille: 0, infos: [] };
    if (d.enCours) return { pastille: 1, infos: [`Ta séance ${d.enCours.nom ? `« ${d.enCours.nom} » ` : ""}est en cours dans Salle`] };
    const obj = Math.min(7, Math.max(1, Math.round(Number(d.reglages && d.reglages.objectif) || 3)));
    const fins = d.seances.filter((s) => s && s.fin && s.debut);
    const lundi = lundiDe(c.t);
    const n = fins.filter((s) => lundiDe(jourDeIso(s.debut) || c.t) === lundi).length;
    const reste = Math.max(0, obj - n);
    const infos = [];
    if (reste && !fins.some((s) => jourDeIso(s.debut) === c.t)) {
      // Séance conseillée : la séance type faite il y a le plus longtemps (comme dans Salle).
      const derniere = {};
      for (const s of fins) if (s.modele && (!derniere[s.modele] || s.debut > derniere[s.modele])) derniere[s.modele] = s.debut;
      let conseil = null;
      for (const m of modeles) if (m && Array.isArray(m.items) && m.items.length && (!conseil || (derniere[m.id] || "") < (derniere[conseil.id] || ""))) conseil = m;
      infos.push(`Encore ${pl(reste, "séance")} cette semaine${conseil && conseil.nom ? ` · conseillée : ${conseil.nom}` : ""}`);
    }
    return { pastille: reste, infos };
  },
};
// Ordre du bandeau : ce que Frank a demandé d'abord, puis le reste de la journée.
const ORDRE_BANDEAU = ["habitudes", "maxilla", "todo", "salle", "journal", "budget"];

function calculer() {
  const maintenant = new Date();
  const c = { t: cleDe(maintenant), heure: maintenant.getHours(), vu: reglages.vu || {} };
  const dj = new Date(maintenant); if (c.heure < 3) dj.setDate(dj.getDate() - 1);
  c.tJournal = cleDe(dj);
  return APPLIS.map((a) => {
    const l = lireAppli(a);
    let e = null;
    if (l.valide) { try { e = ETATS[a.id](l.donnees, c); } catch (err) { e = null; } }
    return { a, l, present: l.valide && l.n > 0, pastille: e ? e.pastille : 0, infos: e ? e.infos : [] };
  });
}

/* =========================================================
   Petits outils DOM
   ========================================================= */

function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  e.append(...enfants.flat().filter((x) => x != null && x !== false));
  return e;
}

let minuteurToast = 0;
function toast(texte, { erreur = false, duree = 3200 } = {}) {
  const t = $("toast");
  t.textContent = texte;
  t.classList.toggle("erreur", erreur);
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add("visible"));
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => { t.classList.remove("visible"); setTimeout(() => { t.hidden = true; }, 300); }, duree);
}

const SVG = {
  nuage: '<svg viewBox="0 0 24 24"><path d="M7 18.5h10.2a4.3 4.3 0 0 0 .6-8.56A6 6 0 0 0 6.2 9.2 4.7 4.7 0 0 0 7 18.5z"/></svg>',
  coche: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  alerte: '<svg viewBox="0 0 24 24"><path d="M12 8v5M12 16.5h.01"/><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
  fleche: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
};

/* =========================================================
   Accueil
   ========================================================= */

let derniersEtats = [];
let signature = "";

function rendre(force = false) {
  reglages = lireReglages();
  const etats = calculer();
  derniersEtats = etats;
  rendreEntete();
  const sig = JSON.stringify(etats.map((e) => [e.a.id, e.pastille, e.infos, e.present])) + new Date().getHours();
  if (force || sig !== signature) {
    signature = sig;
    rendreGrille(etats);
    rendreBandeau(etats);
  }
  $("bienvenue").hidden = etats.some((e) => e.present || e.l.brut !== null);
  rendreEtatSauvegarde();
}

function rendreEntete() {
  const maintenant = new Date(), h = maintenant.getHours();
  $("date").textContent = majuscule(fmtLong.format(maintenant));
  let prenom = reglages.prenom;
  if (!prenom) {
    try { prenom = (JSON.parse(localStorage.getItem("maxilla.v1")) || {}).reglages.prenom || ""; } catch (e) { prenom = ""; }
  }
  $("salut").textContent = `${h >= 18 || h < 5 ? "Bonsoir" : "Bonjour"}${prenom ? " " + prenom.trim() : ""}`;
}

function rendreGrille(etats) {
  $("grille").replaceChildren(...etats.map((e) => {
    const n = e.pastille;
    return el("a", { class: "appli", href: lienDe(e.a), "data-id": e.a.id, style: `--c:${e.a.couleur}`,
      "aria-label": `${e.a.nom}${n ? `, ${n} à faire` : ""}` },
      el("span", { class: "icone" },
        el("img", { src: iconeDe(e.a), alt: "", width: "64", height: "64", decoding: "async" }),
        n ? el("span", { class: "pastille", "aria-hidden": "true" }, n > 99 ? "99+" : String(n)) : null),
      el("span", { class: "nom" }, e.a.nom));
  }));
}

/* ---------- Le bandeau qui défile ---------- */
function rendreBandeau(etats) {
  const infos = [];
  for (const id of ORDRE_BANDEAU) {
    const e = etats.find((x) => x.a.id === id);
    if (e) for (const t of e.infos) infos.push({ a: e.a, t });
  }
  if (!infos.length) {
    const h = new Date().getHours();
    if (!etats.some((e) => e.present)) infos.push({ t: "Bienvenue dans Apps · touche la roue pour récupérer tes données" });
    else infos.push({ t: h >= 18 ? "Tout est fait pour aujourd'hui. Belle soirée ✨" : "Tout est fait pour l'instant. Belle journée ✨" });
  }
  const groupe = () => el("span", { class: "groupe" }, infos.map(({ a, t }) => a
    ? el("a", { class: "info", href: lienDe(a) }, el("img", { src: iconeDe(a), alt: a.nom, width: "18", height: "18" }), el("span", {}, t))
    : el("span", { class: "info" }, el("span", { class: "logo-mini", "aria-hidden": "true" }, el("i"), el("i"), el("i"), el("i")), el("span", {}, t))));
  const piste = $("piste");
  piste.classList.remove("anime");
  piste.replaceChildren(groupe());
  $("defile").setAttribute("aria-label", "À faire : " + infos.map((x) => (x.a ? x.a.nom + ", " : "") + x.t).join(". "));
  requestAnimationFrame(() => {
    const g = piste.firstElementChild;
    if (!g || reduit) return;
    const largeur = g.getBoundingClientRect().width;
    if (largeur <= $("defile").clientWidth - 8) return; // tout tient : pas besoin de défiler
    const copie = groupe();
    copie.setAttribute("aria-hidden", "true");
    copie.querySelectorAll("a").forEach((x) => x.setAttribute("tabindex", "-1"));
    piste.append(copie);
    piste.style.setProperty("--duree", `${Math.max(8, largeur / 34)}s`);
    piste.classList.add("anime");
  });
}
// Le doigt posé sur le bandeau le met en pause (pour lire, ou toucher une ligne).
(() => {
  const d = $("defile");
  let reprise = 0;
  d.addEventListener("pointerdown", () => { clearTimeout(reprise); d.classList.add("pause"); });
  const relacher = () => { clearTimeout(reprise); reprise = setTimeout(() => d.classList.remove("pause"), 1400); };
  d.addEventListener("pointerup", relacher);
  d.addEventListener("pointercancel", relacher);
  d.addEventListener("pointerleave", relacher);
})();

/* ---------- L'état de la sauvegarde, en bas de l'accueil ---------- */
function rendreEtatSauvegarde() {
  const p = $("etat-sauvegarde");
  const D = window.AppsDrive;
  const present = derniersEtats.some((e) => e.present);
  let texte = "", classe = "";
  if (!D) texte = "";
  else if (!D.connecte()) texte = present ? "Active la sauvegarde Google Drive" : "";
  else {
    const e = D.etat();
    if (e.pause) { texte = "Sauvegarde Google Drive en pause · voir"; classe = "alerte"; }
    else if (e.erreur) { texte = e.erreur; classe = "alerte"; }
    else if (e.date) texte = `Sauvegardé sur Google Drive ${D.quand(e.date)}`;
    else texte = "Google Drive connecté";
  }
  p.hidden = !texte;
  p.className = "etat-sauvegarde " + classe;
  p.replaceChildren(el("span", { class: "ico", html: classe ? SVG.alerte : SVG.nuage }), el("span", {}, texte));
}
$("etat-sauvegarde").addEventListener("click", () => ouvrirReglages("drive"));

function sauvegarderAuBesoin() {
  if (!window.AppsDrive) return;
  AppsDrive.auBesoin().then((r) => { rendreEtatSauvegarde(); if (!$("feuille").hidden) rendreDrive(); return r; });
}

/* =========================================================
   Réglages (la roue en haut à droite)
   ========================================================= */

let infoDrive = null; // { texte, erreur } : message affiché dans la carte Google Drive
let sauvegardesTrouvees = null; // null : pas encore cherché ; [] : rien trouvé

function ouvrirReglages(section) {
  const f = $("feuille");
  rendreReglages();
  f.hidden = false;
  document.body.classList.add("bloque");
  requestAnimationFrame(() => {
    f.classList.add("ouverte");
    const cible = section && $("r-" + section);
    if (cible) setTimeout(() => cible.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" }), reduit ? 0 : 260);
  });
}
function fermerReglages() {
  const f = $("feuille");
  f.classList.remove("ouverte");
  document.body.classList.remove("bloque");
  setTimeout(() => { f.hidden = true; }, reduit ? 0 : 280);
  rendre(true);
}
$("reglages").addEventListener("click", () => ouvrirReglages());
$("fermer").addEventListener("click", fermerReglages);
$("feuille").addEventListener("click", (e) => { if (e.target === $("feuille")) fermerReglages(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("feuille").hidden) fermerReglages(); });

function rendreReglages() {
  rendreDrive();
  rendreDonnees();
  $("prenom").value = reglages.prenom || "";
  $("r-installer").hidden = autonome();
}

/* ---------- Google Drive ---------- */
function bouton(texte, action, classe = "") {
  return el("button", { class: "btn " + classe, type: "button", onclick: async (ev) => {
    const b = ev.currentTarget;
    if (b.disabled) return;
    b.disabled = true;
    try { await action(b); } finally { b.disabled = false; }
  } }, texte);
}
const demander = (texte) => Promise.resolve(confirm(texte));

function rendreDrive() {
  const zone = $("drive-carte");
  const D = window.AppsDrive;
  const enfants = [];
  if (!D.connecte()) {
    enfants.push(
      el("p", { class: "texte" }, "Une seule copie de toutes tes applis dans ton Google Drive (dossier ", el("b", {}, "applications › apps"), "). Elle se met à jour toute seule quand tu ouvres Apps."),
      bouton("Se connecter à Google", async () => {
        try { await D.connecter(); } catch (e) { infoDrive = { texte: e.message, erreur: true }; rendreDrive(); }
      }, "plein"),
      el("p", { class: "aide" }, "Déjà une sauvegarde (de Apps ou de tes anciennes applis) ? Connecte-toi : tu pourras la récupérer ici."));
  } else {
    const e = D.etat();
    enfants.push(el("div", { class: "lignes" },
      ligneInfo("Compte", D.compte() || "Google Drive"),
      ligneInfo("Dernière sauvegarde", e.date ? majuscule(D.quand(e.date)) : "Pas encore")));
    if (e.pause === "conflit") {
      enfants.push(el("div", { class: "alerte" },
        el("p", {}, el("b", {}, "La sauvegarde Google Drive vient d'un autre appareil"), " (ou de Safari au lieu de l'app). Pour ne rien écraser, l'envoi automatique est en pause."),
        el("div", { class: "boutons" },
          bouton("La récupérer ici", () => chercherEtAfficher(true), "plein"),
          bouton("La remplacer par ce téléphone", async () => {
            if (!confirm("Remplacer la sauvegarde Google Drive par les données de ce téléphone ?\n\n(Google Drive garde ses anciennes versions quelque temps.)")) return;
            await envoyerMaintenant(true);
          }))));
    } else if (e.pause === "baisse") {
      enfants.push(el("div", { class: "alerte" },
        el("p", {}, el("b", {}, e.raison || "Moins de données ici que dans la sauvegarde"), ". Pour ne rien perdre, l'envoi automatique est en pause."),
        el("div", { class: "boutons" },
          bouton("Récupérer la sauvegarde", () => chercherEtAfficher(true), "plein"),
          bouton("Sauvegarder quand même", async () => {
            if (!confirm("Remplacer la sauvegarde Google Drive par les données de ce téléphone, même s'il en a moins ?")) return;
            await envoyerMaintenant(true);
          }))));
    } else if (e.erreur) {
      enfants.push(el("p", { class: "message erreur" }, e.erreur));
    }
    enfants.push(el("div", { class: "boutons" },
      e.pause ? null : bouton("Sauvegarder maintenant", () => envoyerMaintenant(false), "plein"),
      bouton("Restaurer…", () => chercherEtAfficher(false))));
    if (sauvegardesTrouvees) enfants.push(listeSauvegardes());
    enfants.push(el("button", { class: "lien discret", type: "button", onclick: () => {
      if (!confirm("Déconnecter Google Drive de Apps ? Tes données restent sur ce téléphone et sur Google Drive.")) return;
      D.deconnecter(); sauvegardesTrouvees = null; infoDrive = null; rendreDrive(); rendreEtatSauvegarde();
    } }, "Se déconnecter de Google"));
  }
  if (infoDrive) enfants.splice(D.connecte() ? 1 : 0, 0, el("p", { class: "message" + (infoDrive.erreur ? " erreur" : "") }, infoDrive.texte));
  zone.replaceChildren(...enfants);
}
const ligneInfo = (t, v) => el("div", { class: "ligne-info" }, el("span", {}, t), el("b", {}, v));

async function envoyerMaintenant(forcer) {
  try {
    const r = await AppsDrive.envoyer({ forcer });
    infoDrive = { texte: r === "envoye" ? "Sauvegardé ✓" : "Rien de nouveau à envoyer" };
  } catch (e) {
    infoDrive = { texte: e.code === 409 ? "Une sauvegarde d'un autre appareil est sur Google Drive : choisis quoi faire ci-dessous." : e.message, erreur: e.code !== 409 };
  }
  rendreDrive();
  rendreEtatSauvegarde();
}

async function chercherEtAfficher(silencieux) {
  try {
    sauvegardesTrouvees = await AppsDrive.chercherSauvegardes();
    if (!sauvegardesTrouvees.length) infoDrive = { texte: "Aucune sauvegarde trouvée sur Google Drive pour l'instant." };
    else if (!silencieux) infoDrive = null;
  } catch (e) { infoDrive = { texte: e.message, erreur: true }; }
  rendreDrive();
}

function listeSauvegardes() {
  return el("div", { class: "sauvegardes" }, sauvegardesTrouvees.map((s) => {
    const a = s.type === "ancienne" ? APPLI[s.app] : null;
    const titre = a ? a.nom : "Toutes les applis";
    const detail = [a ? "ancienne appli" : "Apps", AppsDrive.quand(s.date), s.nb != null && a ? pl(s.nb, a.unite[0], a.unite[1]) : null].filter(Boolean).join(" · ");
    return el("div", { class: "sauvegarde" },
      a ? el("img", { src: iconeDe(a), alt: "" }) : el("span", { class: "logo-mini", "aria-hidden": "true" }, el("i"), el("i"), el("i"), el("i")),
      el("div", { class: "txt" }, el("b", {}, titre), el("small", {}, detail)),
      bouton(a ? "Récupérer" : "Restaurer", async () => {
        try {
          const ok = a ? await AppsDrive.restaurerAncienne(s.id, s.app, demander) : await AppsDrive.restaurerApps(s.id, demander);
          if (!ok) return;
          infoDrive = { texte: a ? `${a.nom} récupéré ✓` : "Sauvegarde restaurée ✓" };
          toast(a ? `${a.nom} récupéré ✓` : "Toutes tes applis sont restaurées ✓");
          sauvegardesTrouvees = await AppsDrive.chercherSauvegardes().catch(() => sauvegardesTrouvees);
        } catch (e) { infoDrive = { texte: e.message, erreur: true }; }
        rendreReglages();
        rendre(true);
      }, "petit"));
  }));
}

/* ---------- Tes données dans Apps ---------- */
function rendreDonnees() {
  $("donnees-liste").replaceChildren(...APPLIS.map((a) => {
    const l = lireAppli(a);
    const vide = l.brut === null;
    return el("div", { class: "donnee" + (vide ? " vide" : "") },
      el("img", { src: iconeDe(a), alt: "" }),
      el("div", { class: "txt" }, el("b", {}, a.nom), el("small", {}, vide ? "Rien pour l'instant" : l.valide ? l.resume : "Données illisibles")),
      vide ? el("span", { class: "etiquette" }, "À récupérer") : el("span", { class: "ok", html: SVG.coche, "aria-label": "Présent" }));
  }));
}

/* ---------- Transfert depuis une ancienne appli (copier-coller) ---------- */
$("coller").addEventListener("click", async () => {
  let texte = "";
  try { if (navigator.clipboard && navigator.clipboard.readText) texte = await navigator.clipboard.readText(); } catch (e) {}
  if (texte && texte.includes("apps-transfert")) { importerTransfert(texte); return; }
  const z = $("zone-coller");
  z.hidden = false;
  z.value = "";
  z.focus();
  if (texte) toast("Le presse-papiers ne contient pas de transfert. Copie-le à nouveau depuis l'ancienne appli.", { erreur: true, duree: 4200 });
});
$("zone-coller").addEventListener("input", () => {
  const v = $("zone-coller").value;
  if (v.includes("apps-transfert")) { importerTransfert(v); $("zone-coller").value = ""; $("zone-coller").hidden = true; }
});

function importerTransfert(texte) {
  let o = null;
  try { o = JSON.parse(texte.slice(texte.indexOf("{"), texte.lastIndexOf("}") + 1)); } catch (e) {}
  if (!o || o.type !== "apps-transfert" || !o.cles || typeof o.cles !== "object") {
    toast("Ce n'est pas un transfert complet. Copie-le à nouveau depuis l'ancienne appli.", { erreur: true, duree: 4200 });
    return;
  }
  const faits = [];
  for (const [cle, brut] of Object.entries(o.cles)) {
    const a = APPLI_PAR_CLE[cle];
    if (!a || typeof brut !== "string") continue;
    let d = null;
    try { d = JSON.parse(brut); } catch (e) {}
    if (!a.valide(d)) { toast(`Les données de ${a.nom} sont incomplètes : rien n'est changé.`, { erreur: true }); continue; }
    const ici = lireAppli(a);
    if (ici.brut === brut) { faits.push(`${a.nom} déjà à jour`); continue; }
    if (ici.brut !== null && (ici.n > 0 || !ici.valide)) {
      const ok = confirm(
        `Remplacer les données de ${a.nom} dans Apps par celles de l'ancienne appli ?\n\n` +
        `Ancienne appli : ${resumeDe(a, d)}${o.date ? ` (copiées ${AppsDrive.quand(o.date)})` : ""}\n` +
        `Dans Apps : ${ici.valide ? ici.resume : "données illisibles"}\n\n` +
        "Une copie des données actuelles d'Apps est gardée sur ce téléphone.");
      if (!ok) continue;
    }
    try {
      if (ici.brut !== null) localStorage.setItem(`${cle}.avant-restauration`, JSON.stringify({ date: new Date().toISOString(), brut: ici.brut }));
      localStorage.setItem(cle, brut);
      faits.push(`${a.nom} récupéré (${resumeDe(a, d)})`);
    } catch (e) {
      toast(`Impossible d'écrire ${a.nom} sur ce téléphone (mémoire pleine ?)`, { erreur: true });
    }
  }
  if (faits.length) toast(faits.join(" · ") + " ✓", { duree: 4200 });
  rendreDonnees();
  rendre(true);
  sauvegarderAuBesoin();
}

/* ---------- Prénom ---------- */
$("prenom").addEventListener("input", () => {
  reglages = lireReglages();
  reglages.prenom = $("prenom").value.slice(0, 40);
  sauverReglages();
  rendreEntete();
});

/* ---------- Bienvenue (Apps encore vide) ---------- */
$("bienvenue-drive").addEventListener("click", () => ouvrirReglages("drive"));
$("bienvenue-transfert").addEventListener("click", () => ouvrirReglages("transfert"));

/* =========================================================
   Démarrage
   ========================================================= */

rendre(true);

const retour = window.AppsDrive && AppsDrive.retour();
if (retour) {
  // Retour de la connexion Google : on montre le résultat dans les réglages.
  ouvrirReglages("drive");
  infoDrive = { texte: "Connexion à Google…" };
  rendreDrive();
  retour.then(async (r) => {
    AppsDrive.finRetour();
    infoDrive = { texte: r.info, erreur: !!r.erreur };
    if (!r.erreur && AppsDrive.connecte()) {
      try { sauvegardesTrouvees = await AppsDrive.chercherSauvegardes(); } catch (e) {}
    }
    rendreDrive();
    rendreEtatSauvegarde();
  });
} else {
  if (location.hash === "#sauvegarde") ouvrirReglages("drive");
  setTimeout(sauvegarderAuBesoin, 1500);
}
if (location.hash) history.replaceState(history.state, "", location.pathname);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  rendre();
  setTimeout(sauvegarderAuBesoin, 1200);
});
window.addEventListener("pageshow", (e) => { if (e.persisted) { rendre(true); setTimeout(sauvegarderAuBesoin, 1200); } });
window.addEventListener("online", () => setTimeout(sauvegarderAuBesoin, 1500));
setInterval(() => { if (document.visibilityState === "visible") rendre(); }, 60000);
window.addEventListener("resize", () => rendreBandeau(derniersEtats));

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
