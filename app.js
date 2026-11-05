"use strict";

/* =========================================================
   Données de référence
   ========================================================= */

const CATEGORIES = [
  { id: "Courses", ico: "🛒", c: "#f59e0b" },
  { id: "Logement", ico: "🏠", c: "#a16207" },
  { id: "Transport", ico: "🚗", c: "#3b82f6" },
  { id: "Restaurant", ico: "🍽️", c: "#ec4899" },
  { id: "Loisirs", ico: "🎮", c: "#8b5cf6" },
  { id: "Shopping", ico: "🛍️", c: "#6366f1" },
  { id: "Santé", ico: "💊", c: "#14b8a6" },
  { id: "Factures", ico: "📄", c: "#0ea5e9" },
  { id: "Salaire", ico: "💶", c: "#10b981" },
  { id: "Autre", ico: "✨", c: "#94a3b8" },
];
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// Tranches d'épargne (en % des rentrées) : 1–9 petit, 10–29 moyen, 30–49 grand, 50+ énorme.
const TRANCHES = [
  { id: "aucune", nom: "Aucune", min: 0, max: 0, ico: "⚪", c: "#94a3b8", preset: 0 },
  { id: "petit", nom: "Petit", min: 1, max: 9, ico: "💧", c: "#f59e0b", preset: 5 },
  { id: "moyen", nom: "Moyen", min: 10, max: 29, ico: "🌿", c: "#10b981", preset: 15 },
  { id: "grand", nom: "Grand", min: 30, max: 49, ico: "⭐", c: "#3b82f6", preset: 35 },
  { id: "enorme", nom: "Énorme", min: 50, max: 100, ico: "🔥", c: "#8b5cf6", preset: 50 },
];
function tranche(pct) {
  const p = Math.round(pct);
  let t = TRANCHES[0];
  for (const x of TRANCHES) if (p >= x.min) t = x;
  return t;
}
// Anciens niveaux fixes, convertis en pourcentage pour garder les réglages déjà faits.
const ANCIENS_TAUX = { petit: 5, moyen: 15, grand: 25, enorme: 40 };

// Plafonds réglementaires (versements pour le PEA).
const COMPTES = [
  { id: "livretA", nom: "Livret A", ico: "🏦", plafond: 22950, c: "#ea580c", clair: "#fb923c", grad: "linear-gradient(135deg,#ee7a32 0%,#c2410c 60%,#9a3412 100%)" },
  { id: "livretJeune", nom: "Livret Jeune", ico: "🌱", plafond: 1600, c: "#0e7490", clair: "#22d3ee", grad: "linear-gradient(135deg,#0ea5b7 0%,#0e7490 55%,#155e75 100%)" },
  { id: "pea", nom: "PEA", ico: "📈", plafond: 150000, c: "#7c3aed", clair: "#c4a5ff", grad: "linear-gradient(135deg,#a06bff 0%,#7c3aed 50%,#4c1d95 100%)" },
];
const CPT = Object.fromEntries(COMPTES.map((c) => [c.id, c]));

/* =========================================================
   Stockage (uniquement sur l'appareil)
   ========================================================= */

const CLE = "budget.v1";
let donnees = normaliser(lireStockage());

function lireStockage() {
  try { return JSON.parse(localStorage.getItem(CLE)); } catch (e) { return null; }
}

function normaliser(d) {
  d = d && typeof d === "object" ? d : {};
  const c = d.comptes || {};
  return {
    mouvements: Array.isArray(d.mouvements) ? d.mouvements : [],
    plans: Object.fromEntries(Object.entries(d.plans || {}).map(([k, p]) => [k, {
      revenus: Number(p && p.revenus) || 0,
      pct: Number.isFinite(p && p.pct) ? p.pct : (ANCIENS_TAUX[p && p.niveau] ?? 15),
    }])),
    bilanVu: d.bilanVu || null,
    comptes: {
      livretA: { solde: Number(c.livretA && c.livretA.solde) || 0 },
      livretJeune: { solde: Number(c.livretJeune && c.livretJeune.solde) || 0 },
      pea: {
        especes: Number(c.pea && c.pea.especes) || 0,
        lignes: Array.isArray(c.pea && c.pea.lignes) ? c.pea.lignes : [],
      },
    },
  };
}

function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(donnees)); } catch (e) { toast("Impossible d'enregistrer", "var(--depense)"); }
}

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* =========================================================
   Outils
   ========================================================= */

const fmtEuros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const fmtEurosRond = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });
const fmtPct1 = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const fmtNombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });
const fmtSaisie = new Intl.NumberFormat("fr-FR", { useGrouping: false, maximumFractionDigits: 4 });
const euros = (v) => fmtEuros.format(v);
const eurosRond = (v) => fmtEurosRond.format(Math.round(v));
const eurosSigne = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + euros(Math.abs(v));
const arrondi = (v) => Math.round(v * 100) / 100;

function lireNombre(texte, decimales = 2) {
  const v = Number(String(texte).replace(/[\s  ]/g, "").replace(",", "."));
  if (!Number.isFinite(v) || v < 0) return null;
  const f = 10 ** decimales;
  return Math.round(v * f) / f;
}
const lireMontant = (t) => { const v = lireNombre(t); return v && v > 0 ? v : null; };
const texteSaisie = (v) => (v ? fmtSaisie.format(v) : "");

// Garde uniquement des chiffres et une virgule (n décimales maximum).
function nettoyerSaisie(input, decimales = 2) {
  let v = input.value.replace(/[^\d.,]/g, "").replace(".", ",");
  const i = v.indexOf(",");
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, "").slice(0, decimales);
  input.value = v.slice(0, 12);
}

const debutMois = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const ajouterMois = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const cleMois = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const memeMois = (iso, mois) => cleMois(new Date(iso)) === cleMois(mois);
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const nomMois = (d) => majuscule(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
const dateCourte = (iso) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const duMois = (mois) => donnees.mouvements.filter((m) => memeMois(m.date, mois));
const somme = (liste) => liste.reduce((s, m) => s + m.montant, 0);
// Un retrait d'un livret n'est ni un revenu ni une dépense : il réduit seulement l'épargne.
const revenus = (liste) => somme(liste.filter((m) => m.estRevenu));
const depenses = (liste) => somme(liste.filter((m) => !m.estRevenu && !m.retrait));
const places = (liste) => somme(liste.filter((m) => m.estRevenu && m.compte));
const retraits = (liste) => somme(liste.filter((m) => m.retrait));
const epargneNette = (liste) => places(liste) - retraits(liste);
const tries = () => [...donnees.mouvements].sort((a, b) => b.date.localeCompare(a.date));
const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const $ = (id) => document.getElementById(id);
function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const x of enfants.flat(Infinity)) if (x != null && x !== false) e.append(x);
  return e;
}

// Fait défiler un nombre jusqu'à sa nouvelle valeur.
function compter(elm, valeur, fmt = eurosRond) {
  const depart = Number(elm.dataset.v || 0);
  elm.dataset.v = valeur;
  if (depart === valeur || matchMedia("(prefers-reduced-motion: reduce)").matches) { elm.textContent = fmt(valeur); return; }
  const t0 = performance.now(), duree = 700;
  const pas = (t) => {
    const k = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - k, 3);
    elm.textContent = fmt(depart + (valeur - depart) * e);
    if (k < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

let minuteurToast;
function toast(texte, couleur = "var(--revenu)") {
  const t = $("toast");
  t.replaceChildren(el("span", { class: "ok", style: `background:${couleur}` }, "✓"), texte);
  t.classList.add("visible");
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove("visible"), 2200);
}

/* =========================================================
   Comptes : valeurs et mouvements d'argent
   ========================================================= */

const valeurLigne = (l) => l.quantite * (l.cours || l.pru);
const investiLigne = (l) => l.quantite * l.pru;
function valeurCompte(id) {
  const c = donnees.comptes[id];
  if (id === "pea") return c.especes + c.lignes.reduce((s, l) => s + valeurLigne(l), 0);
  return c.solde;
}
function crediter(id, montant) {
  const c = donnees.comptes[id];
  if (!c) return;
  if (id === "pea") c.especes = Math.max(0, arrondi(c.especes + montant));
  else c.solde = Math.max(0, arrondi(c.solde + montant));
}

/* =========================================================
   Feuille du bas
   ========================================================= */

let construireFeuille = null;
function ouvrirFeuille(construire) {
  construireFeuille = construire;
  const f = $("feuille");
  rafraichirFeuille();
  f.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("ouverte")));
}
function rafraichirFeuille() {
  if (!construireFeuille) return;
  const panneau = $("feuille-panneau");
  const defilement = panneau.scrollTop;
  panneau.replaceChildren(el("div", { class: "poignee" }), ...[construireFeuille()].flat(Infinity).filter((x) => x != null && x !== false));
  panneau.scrollTop = defilement;
}
function fermerFeuille() {
  const f = $("feuille");
  document.activeElement && document.activeElement.blur();
  f.classList.remove("ouverte");
  construireFeuille = null;
  setTimeout(() => { if (!construireFeuille) f.hidden = true; }, 350);
}
$("feuille").addEventListener("click", (e) => { if (e.target.hasAttribute("data-fermer")) fermerFeuille(); });

/* =========================================================
   Onglets
   ========================================================= */

document.querySelectorAll(".tabbar button").forEach((b) =>
  b.addEventListener("click", () => {
    document.activeElement && document.activeElement.blur();
    document.querySelectorAll(".tabbar button").forEach((x) => x.classList.toggle("actif", x === b));
    document.querySelectorAll(".onglet").forEach((s) => s.classList.toggle("actif", s.id === b.dataset.onglet));
    window.scrollTo(0, 0);
    if (b.dataset.onglet === "diagrammes") afficherDiagrammes();
  }));

function selecteurMois(conteneur, getMois, setMois) {
  conteneur.replaceChildren(
    el("button", { class: "fleche", "aria-label": "Mois précédent", onclick: () => setMois(ajouterMois(getMois(), -1)) }, "‹"),
    el("button", { onclick: () => setMois(debutMois(new Date())) }, nomMois(getMois())),
    el("button", { class: "fleche", "aria-label": "Mois suivant", onclick: () => setMois(ajouterMois(getMois(), 1)) }, "›"));
}

/* =========================================================
   Accueil
   ========================================================= */

const champMontant = $("montant");
const champLibelle = $("libelle");
let categorieChoisie = null;

function ajusterLargeur(input) {
  input.style.width = `${Math.max(1, input.value.length) * 0.6 + 0.15}em`;
}

function afficherChips() {
  $("chips").replaceChildren(...CATEGORIES.map((c) =>
    el("button", {
      class: "chip" + (categorieChoisie === c.id ? " choisi" : ""),
      style: `--c:${c.c}`,
      "aria-pressed": String(categorieChoisie === c.id),
      onclick: () => { categorieChoisie = categorieChoisie === c.id ? null : c.id; afficherChips(); },
    }, el("span", { class: "emo" }, c.ico), c.id)));
}

function majBoutons() {
  const ok = lireMontant(champMontant.value) !== null;
  $("btn-revenu").disabled = !ok;
  $("btn-depense").disabled = !ok;
}

champMontant.addEventListener("input", () => { nettoyerSaisie(champMontant); ajusterLargeur(champMontant); majBoutons(); });
champLibelle.addEventListener("keydown", (e) => { if (e.key === "Enter") champLibelle.blur(); });

function enregistrer(estRevenu, compte = null) {
  const montant = lireMontant(champMontant.value);
  if (montant === null) return;
  donnees.mouvements.push({
    id: nouvelId(), montant, estRevenu, compte,
    libelle: champLibelle.value.trim(),
    categorie: categorieChoisie,
    date: new Date().toISOString(),
  });
  if (compte) crediter(compte, montant);
  sauver();

  champMontant.value = "";
  champLibelle.value = "";
  categorieChoisie = null;
  champMontant.blur(); champLibelle.blur();
  ajusterLargeur(champMontant); majBoutons(); afficherChips();
  toutAfficher();

  if (!estRevenu) toast(`Dépense de ${euros(montant)} enregistrée`, "var(--depense)");
  else if (compte) toast(`${euros(montant)} placés sur ${CPT[compte].nom}`, CPT[compte].c);
  else toast(`Revenu de ${euros(montant)} enregistré`);
}

// Un revenu : on demande où il va.
$("btn-revenu").addEventListener("click", () => {
  const montant = lireMontant(champMontant.value);
  if (montant === null) return;
  document.activeElement && document.activeElement.blur();
  ouvrirFeuille(() => [
    el("h3", {}, "Où va ce revenu ?"),
    el("p", { class: "sous" }, `${euros(montant)} à répartir sur l'un de tes comptes.`),
    el("div", { class: "choix" },
      el("button", { class: "option", style: "--grad:linear-gradient(135deg,#12b981,#047857)", onclick: () => { fermerFeuille(); enregistrer(true, null); } },
        el("span", { class: "ico-opt" }, "💳"),
        el("span", { class: "txt" }, el("b", {}, "Compte courant"), el("span", {}, "Pour tes dépenses du mois")),
        el("span", { class: "fl" }, "›")),
      COMPTES.map((c) => el("button", { class: "option", style: `--grad:${c.grad}`, onclick: () => { fermerFeuille(); enregistrer(true, c.id); } },
        el("span", { class: "ico-opt" }, c.ico),
        el("span", { class: "txt" }, el("b", {}, c.nom), el("span", {}, `Actuellement ${euros(valeurCompte(c.id))}`)),
        el("span", { class: "fl" }, "›")))),
  ]);
});
$("btn-depense").addEventListener("click", () => enregistrer(false));

function ligneMouvement(m) {
  if (m.retrait) {
    const c = CPT[m.compte] || { nom: "compte", c: "#94a3b8", ico: "🏦" };
    const titre = m.libelle || `Retrait ${c.nom}`;
    return el("li", { class: "ligne", onclick: () => supprimer(m, titre) },
      el("span", { class: "pastille", style: `--c:${c.c}` }, "↩️"),
      el("div", { class: "infos" },
        el("div", { class: "titre" }, titre),
        el("div", { class: "meta" }, dateCourte(m.date), el("span", { class: "badge", style: `--c:${c.c}` }, `← ${c.nom}`))),
      el("span", { class: "valeur retire" }, "−" + euros(m.montant)));
  }
  const cat = m.categorie ? CAT[m.categorie] : null;
  const compte = m.compte ? CPT[m.compte] : null;
  const couleur = cat ? cat.c : m.estRevenu ? "#10b981" : "#94a3b8";
  const titre = m.libelle || (cat ? cat.id : m.estRevenu ? "Revenu" : "Dépense");
  return el("li", { class: "ligne", onclick: () => supprimer(m, titre) },
    el("span", { class: "pastille", style: `--c:${couleur}` }, cat ? cat.ico : m.estRevenu ? "💶" : "💸"),
    el("div", { class: "infos" },
      el("div", { class: "titre" }, titre),
      el("div", { class: "meta" }, dateCourte(m.date),
        compte && el("span", { class: "badge", style: `--c:${compte.c}` }, `→ ${compte.nom}`))),
    el("span", { class: "valeur" + (m.estRevenu ? " plus" : "") }, (m.estRevenu ? "+" : "−") + euros(m.montant)));
}

function supprimer(m, titre) {
  const compte = m.compte ? CPT[m.compte] : null;
  const detail = !compte ? "" : m.retrait
    ? `\nLe montant sera remis sur ton ${compte.nom}.`
    : `\nLe montant sera aussi retiré de ton ${compte.nom}.`;
  if (!confirm(`Supprimer « ${titre} » (${euros(m.montant)}) ?${detail}`)) return;
  donnees.mouvements = donnees.mouvements.filter((x) => x.id !== m.id);
  if (compte) crediter(compte.id, m.retrait ? m.montant : -m.montant);
  sauver();
  toutAfficher();
  toast("Mouvement supprimé", "var(--depense)");
}

function afficherAccueil() {
  const maintenant = new Date();
  const h = maintenant.getHours();
  $("salut").textContent = (h < 5 ? "Bonne nuit" : h < 18 ? "Bonjour" : "Bonsoir") + " 👋";
  $("titre-accueil").textContent = majuscule(maintenant.toLocaleDateString("fr-FR", { month: "long" }));

  const ceMois = duMois(maintenant);
  const r = revenus(ceMois), d = depenses(ceMois);
  compter($("hero-solde"), r - d);
  compter($("hero-revenus"), r);
  compter($("hero-depenses"), d);

  const liste = tries().slice(0, 5);
  $("derniers").replaceChildren(...liste.map(ligneMouvement));
  $("vide-accueil").hidden = liste.length > 0;
  $("tout-voir").hidden = liste.length === 0;
}

/* =========================================================
   Comptes
   ========================================================= */

function afficherComptes() {
  const valeurs = COMPTES.map((c) => ({ c, v: valeurCompte(c.id) }));
  const total = valeurs.reduce((s, x) => s + x.v, 0);
  compter($("total-epargne"), total);
  const ceMois = duMois(new Date());
  const net = epargneNette(ceMois), sorti = retraits(ceMois);
  $("epargne-mois-comptes").textContent = `Épargné ce mois-ci : ${eurosSigne(net)}${sorti ? ` (dont ${euros(sorti)} retirés)` : ""}`;

  $("barre-repartition").replaceChildren(...(total > 0
    ? valeurs.filter((x) => x.v > 0).map((x) => el("i", { style: `flex-grow:${x.v};background:${x.c.clair}` }))
    : []));
  $("legende-comptes").replaceChildren(...valeurs.map((x) => el("span", {},
    el("i", { style: `background:${x.c.clair}` }),
    `${x.c.nom} ${total > 0 ? fmtPct.format(x.v / total) : ""}`)));

  $("liste-comptes").replaceChildren(...valeurs.map(({ c, v }) => {
    let detail, jauge = null;
    if (c.id === "pea") {
      const p = donnees.comptes.pea;
      const investi = p.lignes.reduce((s, l) => s + investiLigne(l), 0);
      const pv = p.lignes.reduce((s, l) => s + valeurLigne(l) - investiLigne(l), 0);
      const nbActions = p.lignes.reduce((s, l) => s + l.quantite, 0);
      detail = el("div", { class: "detail" },
        p.lignes.length
          ? `${fmtNombre.format(nbActions)} action${nbActions > 1 ? "s" : ""} · ${p.lignes.length} ligne${p.lignes.length > 1 ? "s" : ""}`
          : "Aucune action pour l'instant",
        p.lignes.length && investi > 0 ? el("span", { class: "pv" }, `${eurosSigne(pv)} (${fmtPct1.format(pv / investi)})`) : null);
    } else {
      detail = el("div", { class: "detail" }, `Plafond ${eurosRond(c.plafond)} · ${fmtPct.format(Math.min(1, v / c.plafond))} rempli`);
      jauge = el("div", { class: "jauge-plafond" }, el("i", { style: `width:${Math.min(100, (v / c.plafond) * 100)}%` }));
    }
    return el("button", { class: "compte", style: `--grad:${c.grad};--c:${c.c}`, onclick: () => (c.id === "pea" ? ouvrirPEA() : ouvrirLivret(c.id)) },
      el("div", { class: "haut" },
        el("span", { class: "nom-compte" }, el("span", { class: "ico-compte" }, c.ico), c.nom),
        el("span", { class: "chevron" }, "›")),
      el("div", { class: "solde" }, euros(v)),
      detail, jauge);
  }));
}

function champNombre({ valeur, placeholder = "0", decimales = 2, surSaisie }) {
  const input = el("input", { class: "champ", type: "text", inputmode: "decimal", placeholder, autocomplete: "off" });
  input.value = texteSaisie(valeur);
  input.addEventListener("input", () => { nettoyerSaisie(input, decimales); surSaisie && surSaisie(lireNombre(input.value, decimales) || 0); });
  return input;
}

function placementsVers(id) {
  return tries().filter((m) => m.compte === id).slice(0, 5);
}

function ouvrirLivret(id) {
  const c = CPT[id];
  ouvrirFeuille(() => {
    const liste = placementsVers(id);
    const solde = donnees.comptes[id].solde;
    const montantRetrait = champNombre({ valeur: 0 });
    const motif = el("input", { class: "champ", type: "text", placeholder: "Motif (facultatif)", autocomplete: "off", enterkeyhint: "done" });
    const retirer = () => {
      const v = lireMontant(montantRetrait.value);
      if (!v) { toast("Indique le montant à retirer", "var(--depense)"); return; }
      if (v > donnees.comptes[id].solde + 0.001) { toast(`Il n'y a que ${euros(donnees.comptes[id].solde)} sur ce compte`, "var(--depense)"); return; }
      donnees.mouvements.push({
        id: nouvelId(), montant: v, estRevenu: false, retrait: true, compte: id,
        libelle: motif.value.trim(), categorie: null, date: new Date().toISOString(),
      });
      crediter(id, -v);
      sauver();
      toutAfficher();
      rafraichirFeuille();
      toast(`${euros(v)} retirés du ${c.nom}`, c.c);
    };
    return [
      el("h3", {}, `${c.ico} ${c.nom}`),
      el("p", { class: "sous" }, `${euros(solde)} sur le compte · plafond de ${eurosRond(c.plafond)}.`),
      el("div", { class: "carte-retrait", style: `--c:${c.c}` },
        el("b", {}, "↩️ Retirer de l'argent"),
        el("p", { class: "aide" }, "Le montant baisse sur ce compte et dans ton épargne du mois."),
        el("div", { class: "form" },
          el("label", {}, "Montant à retirer (€)", montantRetrait),
          motif,
          el("button", { class: "bouton-retrait", onclick: retirer }, "Retirer"))),
      el("div", { class: "section-titre" }, "Corriger le solde"),
      el("div", { class: "form" },
        el("label", {}, "Montant actuel sur le compte (€)",
          champNombre({ valeur: solde, surSaisie: (v) => { donnees.comptes[id].solde = v; sauver(); afficherComptes(); } }))),
      el("p", { class: "aide" }, "Une correction ici ne compte pas dans ton épargne du mois. Pour sortir de l'argent, utilise « Retirer »."),
      liste.length ? el("div", { class: "section-titre" }, "Derniers mouvements du compte") : null,
      liste.length ? el("ul", { class: "liste" }, liste.map(ligneMouvement)) : null,
      el("div", { style: "height:16px" }),
      el("button", { class: "principal", onclick: () => fermerFeuille() }, "Terminé"),
    ];
  });
}

let ligneEnEdition = null; // null = vue PEA, "nouvelle" = achat, sinon id d'une ligne

function ouvrirPEA() {
  ligneEnEdition = null;
  ouvrirFeuille(construirePEA);
}

function construirePEA() {
  const p = donnees.comptes.pea;
  if (ligneEnEdition === "nouvelle") return formulaireAchat();
  if (ligneEnEdition) return formulaireLigne(p.lignes.find((l) => l.id === ligneEnEdition));

  const valeurTitres = p.lignes.reduce((s, l) => s + valeurLigne(l), 0);
  const investi = p.lignes.reduce((s, l) => s + investiLigne(l), 0);
  const pv = valeurTitres - investi;
  return [
    el("h3", {}, "📈 PEA"),
    el("p", { class: "sous" }, `Valeur totale ${euros(valeurCompte("pea"))}`),
    el("div", { class: "resume-pea" },
      el("div", {}, el("small", {}, "Titres"), el("b", {}, eurosRond(valeurTitres))),
      el("div", {}, el("small", {}, "Investi"), el("b", {}, eurosRond(investi))),
      el("div", {}, el("small", {}, "Plus-value"), el("b", { class: pv >= 0 ? "pos" : "neg" }, eurosSigne(Math.round(pv)).replace(",00", "")))),
    el("div", { class: "form", style: "margin-top:12px" },
      el("label", {}, "Espèces disponibles sur le PEA (€)",
        champNombre({ valeur: p.especes, surSaisie: (v) => { p.especes = v; sauver(); afficherComptes(); } }))),
    el("div", { class: "section-titre" }, "Mes actions"),
    p.lignes.length
      ? p.lignes.map((l) => {
        const val = valeurLigne(l), ecart = val - investiLigne(l);
        return el("button", { class: "ligne-pea", onclick: () => { ligneEnEdition = l.id; rafraichirFeuille(); } },
          el("div", { class: "infos" }, el("b", {}, l.nom), el("span", {}, `${fmtNombre.format(l.quantite)} × ${euros(l.cours || l.pru)}`)),
          el("div", { class: "droite" }, el("b", {}, euros(val)),
            el("span", { class: ecart >= 0 ? "pos" : "neg" }, `${eurosSigne(ecart)} · ${fmtPct1.format(investiLigne(l) ? ecart / investiLigne(l) : 0)}`)));
      })
      : el("p", { class: "aide" }, "Ajoute tes achats d'actions ou d'ETF pour suivre ton PEA."),
    el("div", { style: "height:8px" }),
    el("button", { class: "principal", onclick: () => { ligneEnEdition = "nouvelle"; rafraichirFeuille(); } }, "＋ Ajouter un achat d'actions"),
  ];
}

function formulaireAchat() {
  const p = donnees.comptes.pea;
  const nom = el("input", { class: "champ", type: "text", placeholder: "ex. ETF MSCI World", autocomplete: "off", list: "titres-pea" });
  const quantite = champNombre({ valeur: 0, decimales: 4 });
  const prix = champNombre({ valeur: 0, decimales: 4 });
  const caseEspeces = el("input", { type: "checkbox", checked: p.especes > 0 });
  const total = el("p", { class: "aide" }, "");
  const majTotal = () => {
    const t = (lireNombre(quantite.value, 4) || 0) * (lireNombre(prix.value, 4) || 0);
    total.textContent = t ? `Montant de l'achat : ${euros(t)}` : "";
  };
  quantite.addEventListener("input", majTotal);
  prix.addEventListener("input", majTotal);

  const valider = () => {
    const n = nom.value.trim();
    const q = lireNombre(quantite.value, 4), pu = lireNombre(prix.value, 4);
    if (!n || !q || !pu) { toast("Indique le nom, le nombre d'actions et le prix", "var(--depense)"); return; }
    // Même titre déjà détenu : on additionne et on recalcule le prix de revient moyen.
    const existante = p.lignes.find((l) => l.nom.toLowerCase() === n.toLowerCase());
    if (existante) {
      const qTotale = existante.quantite + q;
      existante.pru = Math.round(((existante.quantite * existante.pru + q * pu) / qTotale) * 10000) / 10000;
      existante.quantite = qTotale;
      existante.cours = pu;
    } else {
      p.lignes.push({ id: nouvelId(), nom: n, quantite: q, pru: pu, cours: pu });
    }
    if (caseEspeces.checked) p.especes = Math.max(0, arrondi(p.especes - q * pu));
    sauver();
    ligneEnEdition = null;
    rafraichirFeuille();
    afficherComptes();
    toast(`${fmtNombre.format(q)} × ${n} ajouté${q > 1 ? "s" : ""}`, CPT.pea.c);
  };

  return [
    el("h3", {}, "Nouvel achat"),
    el("p", { class: "sous" }, "Si tu possèdes déjà ce titre, les actions s'ajoutent à ta ligne."),
    el("datalist", { id: "titres-pea" }, p.lignes.map((l) => el("option", { value: l.nom }))),
    el("div", { class: "form" },
      el("label", {}, "Nom de l'action ou de l'ETF", nom),
      el("div", { class: "deux" },
        el("label", {}, "Nombre d'actions", quantite),
        el("label", {}, "Prix unitaire (€)", prix)),
      el("label", { style: "display:flex;align-items:center;gap:10px;color:var(--texte);font-weight:600;font-size:14px" },
        caseEspeces, `Payé avec les espèces du PEA (${euros(p.especes)})`),
      total,
      el("button", { class: "principal", onclick: valider }, "Ajouter l'achat"),
      el("button", { class: "secondaire", onclick: () => { ligneEnEdition = null; rafraichirFeuille(); } }, "Annuler")),
  ];
}

function formulaireLigne(l) {
  if (!l) { ligneEnEdition = null; return construirePEA(); }
  const p = donnees.comptes.pea;
  const nom = el("input", { class: "champ", type: "text", autocomplete: "off" });
  nom.value = l.nom;
  const quantite = champNombre({ valeur: l.quantite, decimales: 4 });
  const pru = champNombre({ valeur: arrondi(l.pru), decimales: 4 });
  const cours = champNombre({ valeur: l.cours || l.pru, decimales: 4 });

  const valider = () => {
    const q = lireNombre(quantite.value, 4), pr = lireNombre(pru.value, 4), co = lireNombre(cours.value, 4);
    if (!nom.value.trim() || !q || !pr) { toast("Nom, nombre d'actions et prix d'achat requis", "var(--depense)"); return; }
    Object.assign(l, { nom: nom.value.trim(), quantite: q, pru: pr, cours: co || pr });
    sauver(); ligneEnEdition = null; rafraichirFeuille(); afficherComptes();
    toast(`${l.nom} mis à jour`, CPT.pea.c);
  };
  const supprimerLigne = () => {
    if (!confirm(`Retirer ${l.nom} de ton PEA ?`)) return;
    p.lignes = p.lignes.filter((x) => x.id !== l.id);
    sauver(); ligneEnEdition = null; rafraichirFeuille(); afficherComptes();
  };

  return [
    el("h3", {}, l.nom),
    el("p", { class: "sous" }, "Mets à jour le cours pour suivre ta plus-value."),
    el("div", { class: "form" },
      el("label", {}, "Nom", nom),
      el("label", {}, "Nombre d'actions", quantite),
      el("div", { class: "deux" },
        el("label", {}, "Prix d'achat moyen (€)", pru),
        el("label", {}, "Cours actuel (€)", cours)),
      el("button", { class: "principal", onclick: valider }, "Enregistrer"),
      el("button", { class: "secondaire", onclick: () => { ligneEnEdition = null; rafraichirFeuille(); } }, "Retour"),
      el("button", { class: "danger", onclick: supprimerLigne }, "Retirer cette ligne")),
  ];
}

/* =========================================================
   Historique et sauvegarde
   ========================================================= */

$("tout-voir").addEventListener("click", () => { $("historique").hidden = false; afficherHistorique(); });
$("fermer-historique").addEventListener("click", () => { $("historique").hidden = true; });

function afficherHistorique() {
  const groupes = new Map();
  for (const m of tries()) {
    const k = cleMois(new Date(m.date));
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(m);
  }
  $("historique-liste").replaceChildren(...[...groupes.entries()].flatMap(([k, liste]) => {
    const [a, mo] = k.split("-").map(Number);
    return [el("div", { class: "groupe-titre" }, nomMois(new Date(a, mo - 1, 1))),
      el("ul", { class: "liste" }, liste.map(ligneMouvement))];
  }));
}

$("exporter").addEventListener("click", async () => {
  const nom = `budget-${new Date().toISOString().slice(0, 10)}.json`;
  const fichier = new File([JSON.stringify(donnees, null, 2)], nom, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
    try { await navigator.share({ files: [fichier], title: nom }); } catch (e) { /* annulé */ }
  } else {
    const a = el("a", { href: URL.createObjectURL(fichier), download: nom });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
});
$("importer").addEventListener("click", () => $("fichier-import").click());
$("fichier-import").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.mouvements)) throw new Error("format");
    if (!confirm(`Remplacer tes données par cette sauvegarde (${d.mouvements.length} mouvements) ?`)) return;
    donnees = normaliser(d);
    sauver();
    toutAfficher();
    toast("Sauvegarde importée");
  } catch (err) {
    toast("Fichier de sauvegarde invalide", "var(--depense)");
  }
});

/* =========================================================
   Graphiques
   ========================================================= */

let moisDiagrammes = debutMois(new Date());

function afficherDiagrammes() {
  selecteurMois(document.querySelector('[data-mois="diagrammes"]'), () => moisDiagrammes,
    (m) => { moisDiagrammes = m; afficherDiagrammes(); });

  const parCat = new Map();
  for (const m of duMois(moisDiagrammes).filter((m) => !m.estRevenu && !m.retrait)) {
    const k = m.categorie && CAT[m.categorie] ? m.categorie : "Autre";
    parCat.set(k, (parCat.get(k) || 0) + m.montant);
  }
  const parts = [...parCat.entries()].map(([id, total]) => ({ cat: CAT[id], total })).sort((a, b) => b.total - a.total);
  const total = parts.reduce((s, p) => s + p.total, 0);

  if (!parts.length) {
    $("donut").innerHTML = '<div class="vide"><div class="vide-ico">🍩</div>Aucune dépense ce mois-ci.</div>';
    $("legende").replaceChildren();
  } else {
    const R = 78, C = 2 * Math.PI * R, ecart = parts.length > 1 ? 4 : 0;
    let offset = 0;
    const arcs = parts.map((p) => {
      const longueur = (p.total / total) * C;
      const a = { c: p.cat.c, l: Math.max(longueur - ecart, 0.5), o: -offset };
      offset += longueur;
      return a;
    });
    $("donut").innerHTML = `<svg viewBox="0 0 200 200" role="img" aria-label="Répartition des dépenses">
      <circle r="${R}" cx="100" cy="100" fill="none" stroke="var(--surface-2)" stroke-width="22"/>
      ${arcs.map((a) => `<circle class="arc" r="${R}" cx="100" cy="100" fill="none" stroke="${a.c}" stroke-width="22" stroke-linecap="${parts.length > 1 ? "round" : "butt"}"
        stroke-dasharray="0 ${C}" data-l="${a.l}" stroke-dashoffset="${a.o}" transform="rotate(-90 100 100)"/>`).join("")}
      </svg><div class="centre-donut"><small>Dépenses</small><strong>${eurosRond(total)}</strong></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() =>
      $("donut").querySelectorAll(".arc").forEach((c) => c.setAttribute("stroke-dasharray", `${c.dataset.l} ${C}`))));
    $("legende").replaceChildren(...parts.map((p) => el("li", { style: `--c:${p.cat.c}` },
      el("span", { class: "emo" }, p.cat.ico),
      el("span", { class: "nom" }, p.cat.id),
      el("span", { class: "barre-pct" }, el("i", { style: `width:${(p.total / total) * 100}%` })),
      el("span", { class: "val" }, `${eurosRond(p.total)} · ${fmtPct.format(p.total / total)}`))));
  }

  const mois = Array.from({ length: 6 }, (_, i) => ajouterMois(moisDiagrammes, i - 5));
  const bilans = mois.map((m) => { const l = duMois(m); return { m, r: revenus(l), d: depenses(l) }; });
  const max = Math.max(1, ...bilans.flatMap((b) => [b.r, b.d]));
  const L = 320, H = 160, bas = 22, haut = 14, largeurGroupe = L / 6, barre = 14;
  const h = (v) => Math.max(v > 0 ? 3 : 0, (v / max) * (H - bas - haut));
  const grilles = [0.5, 1].map((k) => {
    const y = H - bas - k * (H - bas - haut);
    return `<line x1="0" x2="${L}" y1="${y}" y2="${y}" stroke="var(--ligne)" stroke-dasharray="3 4"/>
      <text x="${L}" y="${y - 4}" text-anchor="end">${eurosRond(max * k)}</text>`;
  }).join("");
  const barres = bilans.map((b, i) => {
    const x = i * largeurGroupe + largeurGroupe / 2;
    const nom = b.m.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
    const courant = cleMois(b.m) === cleMois(moisDiagrammes);
    return `<rect x="${x - barre - 2}" y="${H - bas - h(b.r)}" width="${barre}" height="${h(b.r)}" rx="5" fill="url(#gR)" style="animation-delay:${i * 50}ms"/>
      <rect x="${x + 2}" y="${H - bas - h(b.d)}" width="${barre}" height="${h(b.d)}" rx="5" fill="url(#gD)" style="animation-delay:${i * 50 + 25}ms"/>
      <text x="${x}" y="${H - 5}" text-anchor="middle" style="${courant ? "fill:var(--texte);font-weight:800" : ""}">${nom}</text>`;
  }).join("");
  $("barres").innerHTML = `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Revenus et dépenses sur 6 mois">
    <defs>
      <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#059669"/></linearGradient>
      <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#e11d48"/></linearGradient>
    </defs>
    ${grilles}<line x1="0" x2="${L}" y1="${H - bas}" y2="${H - bas}" stroke="var(--ligne)"/>${barres}</svg>`;
}

/* =========================================================
   Épargne
   ========================================================= */

let moisEpargne = debutMois(new Date());
const champRevenus = $("revenus-prevus");
const curseur = $("curseur");

// Sans réglage pour un mois, on reprend ceux du dernier mois configuré avant lui.
function planPour(mois) {
  const cle = cleMois(mois);
  if (donnees.plans[cle]) return donnees.plans[cle];
  const precedents = Object.keys(donnees.plans).filter((k) => k < cle).sort();
  const p = precedents.length ? donnees.plans[precedents[precedents.length - 1]] : null;
  return { revenus: p ? p.revenus : 0, pct: p ? p.pct : 15 };
}
const planAffiche = () => planPour(moisEpargne);
function modifierPlan(changement) {
  donnees.plans[cleMois(moisEpargne)] = { ...planAffiche(), ...changement };
  sauver();
}

champRevenus.addEventListener("input", () => {
  nettoyerSaisie(champRevenus);
  ajusterLargeur(champRevenus);
  modifierPlan({ revenus: lireMontant(champRevenus.value) || 0 });
  afficherEpargne(false);
});
$("utiliser-recus").addEventListener("click", () => {
  modifierPlan({ revenus: revenus(duMois(moisEpargne)) });
  afficherEpargne(true);
});
curseur.addEventListener("input", () => {
  modifierPlan({ pct: Number(curseur.value) });
  afficherEpargne(false);
});

// Piste du curseur : les zones colorées, plus vives jusqu'à la valeur choisie.
const FOND_ZONES = "linear-gradient(90deg, #94a3b8 0 1%, #f59e0b 1% 10%, #10b981 10% 30%, #3b82f6 30% 50%, #8b5cf6 50% 100%)";

function afficherCurseur(pct) {
  const t = tranche(pct);
  curseur.value = String(pct);
  curseur.style.setProperty("--p", `${pct}%`);
  curseur.style.setProperty("--c", t.c);
  $("pct-affiche").textContent = `${pct} %`;
  $("pct-affiche").style.color = t.c;
  const badge = $("badge-tranche");
  badge.textContent = `${t.ico} ${t.nom}`;
  badge.style.setProperty("--c", t.c);
  $("zones").replaceChildren(...TRANCHES.slice(1).map((z) => el("button", {
    class: "zone" + (z.id === t.id ? " active" : ""),
    style: `--c:${z.c}`,
    onclick: () => { modifierPlan({ pct: z.preset }); afficherEpargne(false); },
  }, el("b", {}, z.nom), el("small", {}, z.id === "enorme" ? "50 % et +" : `${z.min} – ${z.max} %`))));
}

function afficherEpargne(rechargerChamp = true) {
  selecteurMois(document.querySelector('[data-mois="epargne"]'), () => moisEpargne,
    (m) => { moisEpargne = m; afficherEpargne(true); });

  const plan = planAffiche();
  const t = tranche(plan.pct);
  if (rechargerChamp) { champRevenus.value = texteSaisie(plan.revenus); ajusterLargeur(champRevenus); }
  afficherCurseur(plan.pct);

  const l = duMois(moisEpargne);
  const recus = revenus(l);
  const bouton = $("utiliser-recus");
  bouton.hidden = !(recus > 0 && recus !== plan.revenus);
  bouton.textContent = `Utiliser mes revenus enregistrés (${euros(recus)})`;

  const aEpargner = Math.round(plan.revenus * plan.pct / 100);
  $("montant-curseur").textContent = plan.revenus
    ? `soit ${eurosRond(aEpargner)} à mettre de côté sur ${eurosRond(plan.revenus)}`
    : "Indique tes rentrées prévues pour voir le montant.";

  const res = $("resultat");
  if (!plan.revenus) {
    res.innerHTML = '<div class="vide"><div class="vide-ico">🎯</div>Indique tes rentrées d\'argent prévues pour savoir combien mettre de côté ce mois-ci.</div>';
    return;
  }
  const epargne = epargneNette(l);
  const sorti = retraits(l);
  const budget = plan.revenus - aEpargner;
  const depense = depenses(l);
  const reste = budget - depense;
  const partDepense = budget > 0 ? Math.min(1, depense / budget) : 1;
  const progres = aEpargner > 0 ? Math.max(0, Math.min(1, epargne / aEpargner)) : 0;
  const R = 80, C = 2 * Math.PI * R;

  res.innerHTML = `
    <div class="anneau">
      <svg viewBox="0 0 200 200">
        <defs><linearGradient id="gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c}" stop-opacity=".55"/><stop offset="1" stop-color="${t.c}"/></linearGradient></defs>
        <circle r="${R}" cx="100" cy="100" fill="none" stroke="var(--surface-2)" stroke-width="16"/>
        <circle id="arc-epargne" r="${R}" cx="100" cy="100" fill="none" stroke="url(#gA)" stroke-width="16" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
      </svg>
      <div class="centre-anneau"><small>Épargné / objectif</small><div class="grand">${eurosRond(epargne)}</div>
        <small>sur ${eurosRond(aEpargner)} · ${fmtPct.format(progres)}</small></div>
    </div>
    <p class="aide">${epargne > 0 || sorti > 0
      ? `Placé ce mois-ci : <b style="color:var(--texte)">${euros(places(l))}</b>${sorti ? ` · retiré : <b style="color:var(--texte)">${euros(sorti)}</b>` : ""}`
      : "Place tes revenus sur un livret ou ton PEA pour remplir l'anneau."}
      ${progres >= 1 ? "<br>🎉 Objectif atteint !" : ""}</p>
    <hr>
    <div class="ligne-res"><span>Rentrées prévues</span><span>${euros(plan.revenus)}</span></div>
    <div class="ligne-res"><span>Objectif d'épargne (${t.ico} ${t.nom}, ${plan.pct} %)</span><span>${euros(aEpargner)}</span></div>
    <div class="ligne-res"><span>Reste à épargner</span><span>${euros(Math.max(0, aEpargner - epargne))}</span></div>
    <div class="ligne-res"><span>Budget pour tes dépenses</span><span>${euros(budget)}</span></div>
    <div class="ligne-res"><span>Déjà dépensé</span><span>${euros(depense)}</span></div>
    <div class="ligne-res"><span>Reste à dépenser</span><span style="font-weight:800;${reste < 0 ? "color:var(--depense)" : ""}">${euros(reste)}</span></div>
    <div class="jauge"><div style="width:${partDepense * 100}%;background:${reste < 0 ? "var(--depense)" : `linear-gradient(90deg, ${t.c}99, ${t.c})`}"></div></div>
    ${reste < 0 ? `<p class="alerte">Attention : tu dépasses ton budget de ${euros(-reste)}.</p>` : ""}`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const arc = $("arc-epargne");
    if (arc) arc.setAttribute("stroke-dashoffset", String(C * (1 - progres)));
  }));
}

/* =========================================================
   Historique des mois (bilans et série)
   ========================================================= */

function bilanMois(mois) {
  const l = duMois(mois);
  const r = revenus(l), d = depenses(l), ep = epargneNette(l);
  const pctReel = r > 0 ? (Math.max(0, ep) / r) * 100 : 0;
  const plan = planPour(mois);
  const objectif = plan.revenus ? Math.round(plan.revenus * plan.pct / 100) : 0;
  return {
    mois, l, r, d, ep, pctReel, plan, objectif,
    tranche: tranche(pctReel),
    // Mois réussi : on a épargné plus qu'on n'a dépensé.
    reussi: ep > 0 && ep > d,
    enCours: cleMois(mois) === cleMois(new Date()),
  };
}

function premierMois() {
  if (!donnees.mouvements.length) return debutMois(new Date());
  const plusAncien = donnees.mouvements.reduce((a, m) => (m.date < a ? m.date : a), donnees.mouvements[0].date);
  return debutMois(new Date(plusAncien));
}

function moisConnus() {
  const liste = [];
  const debut = premierMois();
  for (let m = debutMois(new Date()); m >= debut; m = ajouterMois(m, -1)) liste.push(m);
  return liste;
}

function series() {
  const mois = moisConnus().slice(1); // mois terminés, du plus récent au plus ancien
  let actuelle = 0;
  for (const m of mois) { if (bilanMois(m).reussi) actuelle++; else break; }
  let record = 0, cours = 0;
  for (const m of [...mois].reverse()) { cours = bilanMois(m).reussi ? cours + 1 : 0; record = Math.max(record, cours); }
  return { actuelle, record };
}

let bilanOuvert = null; // null = liste, sinon clé du mois affiché

function ouvrirBilans(cle = null) {
  bilanOuvert = cle;
  $("bilans").hidden = false;
  $("bilans").scrollTop = 0;
  if (cle) { donnees.bilanVu = cle; sauver(); afficherBandeauBilan(); }
  afficherBilans();
}
$("ouvrir-bilans").addEventListener("click", () => ouvrirBilans());
$("fermer-bilans").addEventListener("click", () => {
  if (bilanOuvert) { bilanOuvert = null; afficherBilans(); $("bilans").scrollTop = 0; }
  else $("bilans").hidden = true;
});

function badgeTranche(b) {
  const t = b.tranche;
  return el("span", { class: "badge-tranche petit-badge", style: `--c:${t.c}` }, `${t.ico} ${t.nom} · ${Math.round(b.pctReel)} %`);
}

function afficherBilans() {
  const contenu = $("bilans-contenu");
  $("titre-bilans").textContent = bilanOuvert ? "Bilan du mois" : "Historique";
  $("fermer-bilans").textContent = bilanOuvert ? "‹ Historique" : "‹ Retour";
  if (bilanOuvert) {
    const [a, mo] = bilanOuvert.split("-").map(Number);
    contenu.replaceChildren(...detailBilan(bilanMois(new Date(a, mo - 1, 1))).filter((x) => x != null));
    return;
  }

  const { actuelle, record } = series();
  const courant = bilanMois(debutMois(new Date()));
  const cartes = moisConnus().map((m) => {
    const b = bilanMois(m);
    return el("button", { class: "fiche-mois" + (b.reussi ? " reussi" : ""), onclick: () => ouvrirBilans(cleMois(m)) },
      el("div", { class: "fiche-haut" },
        el("b", {}, nomMois(m)),
        b.enCours ? el("span", { class: "etiquette" }, "En cours") : b.reussi ? el("span", { class: "flamme" }, "🔥") : null),
      el("div", { class: "fiche-chiffres" },
        el("span", {}, el("small", {}, "Épargné"), el("strong", { class: b.ep > 0 ? "pos" : "" }, eurosSigne(b.ep))),
        el("span", {}, el("small", {}, "Dépensé"), el("strong", {}, euros(b.d))),
        el("span", { class: "chev" }, "›")),
      badgeTranche(b));
  });

  contenu.replaceChildren(
    el("div", { class: "carte-serie" + (actuelle ? " active" : "") },
      el("div", { class: "serie-flamme" }, actuelle ? "🔥" : "🌱"),
      el("div", {},
        el("small", {}, "Série en cours"),
        el("div", { class: "serie-nombre" }, `${actuelle} mois`),
        el("p", {}, actuelle
          ? `${actuelle > 1 ? `${actuelle} mois de suite` : "Le mois dernier"} tu as épargné plus que tu n'as dépensé.`
          : "Épargne plus que tu ne dépenses sur un mois pour lancer ta série."),
        record > actuelle ? el("p", { class: "record" }, `Record : ${record} mois`) : null)),
    el("p", { class: "aide" }, courant.reussi
      ? `${nomMois(courant.mois)} : en bonne voie, tu as épargné ${euros(courant.ep)} pour ${euros(courant.d)} dépensés.`
      : `${nomMois(courant.mois)} : pour prolonger ta série, épargne plus que tes dépenses (${euros(courant.d)} pour l'instant).`),
    el("div", { class: "groupe-titre" }, "Tous les mois"),
    el("div", { class: "fiches" }, cartes));
}

function detailBilan(b) {
  const t = b.tranche;
  const parCat = new Map();
  for (const m of b.l.filter((m) => !m.estRevenu && !m.retrait)) {
    const k = m.categorie && CAT[m.categorie] ? m.categorie : "Autre";
    parCat.set(k, (parCat.get(k) || 0) + m.montant);
  }
  const top = [...parCat.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3);
  const atteint = b.objectif > 0 ? Math.max(0, b.ep) / b.objectif : 0;

  return [
    el("h1", { class: "titre-bilan" }, nomMois(b.mois)),
    b.enCours ? el("p", { class: "aide" }, "Mois en cours : ce bilan se complète au fil des jours.") : null,
    el("div", { class: "verdict" + (b.reussi ? " reussi" : "") },
      el("span", { class: "verdict-ico" }, b.reussi ? "🔥" : b.ep > 0 ? "🙂" : "💤"),
      el("div", {},
        el("b", {}, b.reussi ? "Mois réussi" : b.ep > 0 ? "Bien, mais pas de série" : "Pas d'épargne ce mois-ci"),
        el("p", {}, b.reussi
          ? `Tu as épargné ${euros(b.ep)}, plus que tes ${euros(b.d)} de dépenses.`
          : b.ep > 0
            ? `Tu as épargné ${euros(b.ep)}, mais dépensé ${euros(b.d)}.`
            : "Aucun revenu placé sur tes comptes ce mois-là."))),
    el("div", { class: "tuiles" },
      el("div", { class: "tuile" }, el("small", {}, "Revenus"), el("strong", { class: "pos" }, euros(b.r))),
      el("div", { class: "tuile" }, el("small", {}, "Dépenses"), el("strong", { class: "neg" }, euros(b.d))),
      el("div", { class: "tuile" }, el("small", {}, "Épargné"), el("strong", {}, eurosSigne(b.ep))),
      el("div", { class: "tuile" }, el("small", {}, "Solde"), el("strong", {}, eurosSigne(b.r - b.d)))),
    el("div", { class: "carte" },
      el("h2", {}, "Tranche d'épargne du mois"),
      el("div", { class: "tranche-ligne" },
        el("span", { class: "tranche-ico", style: `--c:${t.c}` }, t.ico),
        el("div", {},
          el("b", { style: `color:${t.c}` }, t.nom),
          el("p", { class: "aide", style: "margin:2px 0 0" }, b.r > 0
            ? `Tu as épargné ${fmtPct.format(b.pctReel / 100)} de tes revenus.`
            : "Aucun revenu enregistré ce mois-là."))),
      el("div", { class: "regle" },
        el("div", { class: "regle-piste", style: `background:${FOND_ZONES}` }),
        el("i", { class: "regle-repere", style: `left:${Math.min(100, b.pctReel)}%` })),
      el("div", { class: "regle-legende" }, [[0, "0"], [10, "10"], [30, "30"], [50, "50"], [100, "100 %"]].map(([p, t]) => el("span", { style: `left:${p}%` }, t)))),
    b.objectif > 0 ? el("div", { class: "carte" },
      el("h2", {}, "Objectif"),
      el("div", { class: "ligne-res" }, el("span", {}, `Visé (${tranche(b.plan.pct).nom}, ${b.plan.pct} %)`), el("span", {}, euros(b.objectif))),
      el("div", { class: "ligne-res" }, el("span", {}, "Réalisé"), el("span", {}, `${euros(Math.max(0, b.ep))} · ${fmtPct.format(atteint)}`)),
      el("div", { class: "jauge" }, el("div", { style: `width:${Math.min(1, atteint) * 100}%;background:${atteint >= 1 ? "var(--revenu)" : t.c}` })),
      atteint >= 1 ? el("p", { class: "aide" }, "🎉 Objectif atteint !") : null) : null,
    top.length ? el("div", { class: "carte" },
      el("h2", {}, "Plus grosses dépenses"),
      el("ul", { class: "legende" }, top.map(([id, v]) => el("li", { style: `--c:${CAT[id].c}` },
        el("span", { class: "emo" }, CAT[id].ico),
        el("span", { class: "nom" }, id),
        el("span", { class: "barre-pct" }, el("i", { style: `width:${(v / b.d) * 100}%` })),
        el("span", { class: "val" }, eurosRond(v)))))) : null,
    el("p", { class: "aide centre" }, `${b.l.length} mouvement${b.l.length > 1 ? "s" : ""} enregistré${b.l.length > 1 ? "s" : ""}`),
  ];
}

// Au début d'un mois, l'accueil propose le bilan du mois écoulé.
function afficherBandeauBilan() {
  const precedent = ajouterMois(debutMois(new Date()), -1);
  const cle = cleMois(precedent);
  const b = bilanMois(precedent);
  const bandeau = $("bandeau-bilan");
  const montrer = b.l.length > 0 && donnees.bilanVu !== cle;
  bandeau.hidden = !montrer;
  if (montrer) {
    bandeau.replaceChildren(
      el("span", { class: "bandeau-ico" }, b.reussi ? "🔥" : "📊"),
      el("span", { class: "bandeau-txt" },
        el("b", {}, `Ton bilan de ${precedent.toLocaleDateString("fr-FR", { month: "long" })} est prêt`),
        el("small", {}, `${t0(b)}`)),
      el("span", { class: "fl" }, "›"));
    bandeau.onclick = () => ouvrirBilans(cle);
  }
}
const t0 = (b) => `${b.tranche.ico} Tranche ${b.tranche.nom} · épargné ${eurosSigne(b.ep)}`;

/* =========================================================
   Démarrage
   ========================================================= */

function toutAfficher() {
  afficherAccueil();
  afficherComptes();
  afficherDiagrammes();
  afficherEpargne(document.activeElement !== champRevenus);
  afficherBandeauBilan();
  if (!$("historique").hidden) afficherHistorique();
  if (!$("bilans").hidden) afficherBilans();
}

afficherChips();
ajusterLargeur(champMontant);
toutAfficher();

document.addEventListener("visibilitychange", () => { if (!document.hidden) toutAfficher(); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
