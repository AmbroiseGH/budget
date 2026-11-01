"use strict";

/* ---------- Données de référence ---------- */

const CATEGORIES = [
  { id: "Courses", ico: "🛒", c: "#ff9500" },
  { id: "Logement", ico: "🏠", c: "#a2845e" },
  { id: "Transport", ico: "🚗", c: "#007aff" },
  { id: "Restaurant", ico: "🍽️", c: "#ff2d55" },
  { id: "Loisirs", ico: "🎮", c: "#af52de" },
  { id: "Shopping", ico: "🛍️", c: "#5856d6" },
  { id: "Santé", ico: "💊", c: "#00c7be" },
  { id: "Factures", ico: "📄", c: "#30b0c7" },
  { id: "Salaire", ico: "💶", c: "#34c759" },
  { id: "Autre", ico: "✨", c: "#8e8e93" },
];
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const NIVEAUX = [
  { id: "enorme", nom: "Énorme", taux: 0.40, ico: "🔥", c: "#af52de" },
  { id: "grand", nom: "Grand", taux: 0.25, ico: "⭐", c: "#007aff" },
  { id: "moyen", nom: "Moyen", taux: 0.15, ico: "🌿", c: "#30b0a0" },
  { id: "petit", nom: "Petit", taux: 0.05, ico: "💧", c: "#ff9500" },
];
const NIV = Object.fromEntries(NIVEAUX.map((n) => [n.id, n]));

/* ---------- Stockage (sur l'appareil) ---------- */

const CLE = "budget.v1";
let donnees = charger();

function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE));
    if (d && Array.isArray(d.mouvements)) return { mouvements: d.mouvements, plans: d.plans || {} };
  } catch (e) { /* données absentes ou illisibles */ }
  return { mouvements: [], plans: {} };
}

function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(donnees)); } catch (e) { toast("Impossible d'enregistrer", false); }
}

// Demande au navigateur de ne pas effacer les données.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- Outils ---------- */

const fmtEuros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const fmtEurosRond = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });
const fmtSaisie = new Intl.NumberFormat("fr-FR", { useGrouping: false, maximumFractionDigits: 2 });
const euros = (v) => fmtEuros.format(v);
const eurosRond = (v) => fmtEurosRond.format(v);

function lireMontant(texte) {
  const v = Number(String(texte).replace(/[\s  ]/g, "").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
}

const debutMois = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const ajouterMois = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const cleMois = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const memeMois = (iso, mois) => cleMois(new Date(iso)) === cleMois(mois);
function nomMois(d) {
  const t = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const dateCourte = (iso) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const duMois = (mois) => donnees.mouvements.filter((m) => memeMois(m.date, mois));
const somme = (liste) => liste.reduce((s, m) => s + m.montant, 0);
const revenus = (liste) => somme(liste.filter((m) => m.estRevenu));
const depenses = (liste) => somme(liste.filter((m) => !m.estRevenu));
const tries = () => [...donnees.mouvements].sort((a, b) => b.date.localeCompare(a.date));

const $ = (id) => document.getElementById(id);
function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const x of enfants.flat()) if (x != null) e.append(x);
  return e;
}

let minuteurToast;
function toast(texte, positif = true) {
  const t = $("toast");
  t.textContent = "✓ " + texte;
  t.style.background = positif ? "var(--vert)" : "var(--rouge)";
  t.classList.add("visible");
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove("visible"), 2000);
}

function ligneMouvement(m) {
  const cat = m.categorie ? CAT[m.categorie] : null;
  const couleur = cat ? cat.c : m.estRevenu ? "var(--vert)" : "#8e8e93";
  const titre = m.libelle || (cat ? cat.id : m.estRevenu ? "Revenu" : "Dépense");
  return el("li", { class: "ligne", onclick: () => supprimer(m, titre) },
    el("span", { class: "pastille", style: `--c:${couleur}` }, cat ? cat.ico : m.estRevenu ? "＋" : "−"),
    el("div", { class: "infos" },
      el("div", { class: "titre" }, titre),
      el("div", { class: "date" }, dateCourte(m.date))),
    el("span", { class: "valeur" + (m.estRevenu ? " txt-vert" : "") }, (m.estRevenu ? "+" : "−") + euros(m.montant)));
}

function supprimer(m, titre) {
  if (!confirm(`Supprimer « ${titre} » (${euros(m.montant)}) ?`)) return;
  donnees.mouvements = donnees.mouvements.filter((x) => x.id !== m.id);
  sauver();
  toutAfficher();
  toast("Mouvement supprimé", false);
}

function selecteurMois(conteneur, getMois, setMois) {
  conteneur.replaceChildren(
    el("button", { class: "fleche", "aria-label": "Mois précédent", onclick: () => setMois(ajouterMois(getMois(), -1)) }, "‹"),
    el("button", { onclick: () => setMois(debutMois(new Date())) }, nomMois(getMois())),
    el("button", { class: "fleche", "aria-label": "Mois suivant", onclick: () => setMois(ajouterMois(getMois(), 1)) }, "›"));
}

/* ---------- Onglets ---------- */

document.querySelectorAll(".tabbar button").forEach((b) =>
  b.addEventListener("click", () => {
    document.activeElement && document.activeElement.blur();
    document.querySelectorAll(".tabbar button").forEach((x) => x.classList.toggle("actif", x === b));
    document.querySelectorAll(".onglet").forEach((s) => s.classList.toggle("actif", s.id === b.dataset.onglet));
    window.scrollTo(0, 0);
  }));

/* ---------- Accueil ---------- */

const champMontant = $("montant");
const champLibelle = $("libelle");
let categorieChoisie = null;

function ajusterLargeur(input) {
  const n = Math.max(1, input.value.length);
  input.style.width = `${n * 0.62 + 0.3}em`;
}

function afficherChips() {
  $("chips").replaceChildren(...CATEGORIES.map((c) =>
    el("button", {
      class: "chip" + (categorieChoisie === c.id ? " choisi" : ""),
      style: `--c:${c.c}`,
      "aria-pressed": String(categorieChoisie === c.id),
      onclick: () => { categorieChoisie = categorieChoisie === c.id ? null : c.id; afficherChips(); },
    }, `${c.ico} ${c.id}`)));
}

function majBoutons() {
  const ok = lireMontant(champMontant.value) !== null;
  $("btn-revenu").disabled = !ok;
  $("btn-depense").disabled = !ok;
}

champMontant.addEventListener("input", () => {
  // Garde uniquement chiffres et un séparateur décimal.
  let v = champMontant.value.replace(/[^\d.,]/g, "").replace(".", ",");
  const i = v.indexOf(",");
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, "").slice(0, 2);
  champMontant.value = v.slice(0, 10);
  ajusterLargeur(champMontant);
  majBoutons();
});
champLibelle.addEventListener("keydown", (e) => { if (e.key === "Enter") champLibelle.blur(); });

function ajouter(estRevenu) {
  const montant = lireMontant(champMontant.value);
  if (montant === null) return;
  donnees.mouvements.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    montant,
    estRevenu,
    libelle: champLibelle.value.trim(),
    categorie: categorieChoisie,
    date: new Date().toISOString(),
  });
  sauver();
  champMontant.value = "";
  champLibelle.value = "";
  categorieChoisie = null;
  champMontant.blur();
  champLibelle.blur();
  ajusterLargeur(champMontant);
  majBoutons();
  afficherChips();
  toutAfficher();
  toast(estRevenu ? `Revenu de ${euros(montant)} enregistré` : `Dépense de ${euros(montant)} enregistrée`, estRevenu);
}
$("btn-revenu").addEventListener("click", () => ajouter(true));
$("btn-depense").addEventListener("click", () => ajouter(false));

function afficherAccueil() {
  const maintenant = new Date();
  const ceMois = duMois(maintenant);
  const r = revenus(ceMois), d = depenses(ceMois);
  $("solde-mois").textContent = nomMois(maintenant);
  $("solde-revenus").textContent = eurosRond(r);
  $("solde-depenses").textContent = eurosRond(d);
  $("solde-total").textContent = eurosRond(r - d);

  const liste = tries().slice(0, 5);
  $("derniers").replaceChildren(...liste.map(ligneMouvement));
  $("vide-accueil").hidden = liste.length > 0;
  $("tout-voir").hidden = liste.length === 0;
}

/* ---------- Historique ---------- */

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
    donnees = { mouvements: d.mouvements, plans: d.plans || {} };
    sauver();
    toutAfficher();
    toast("Sauvegarde importée");
  } catch (err) {
    toast("Fichier de sauvegarde invalide", false);
  }
});

/* ---------- Diagrammes ---------- */

let moisDiagrammes = debutMois(new Date());

function afficherDiagrammes() {
  selecteurMois(document.querySelector('[data-mois="diagrammes"]'), () => moisDiagrammes,
    (m) => { moisDiagrammes = m; afficherDiagrammes(); });

  // Anneau de répartition
  const parCat = new Map();
  for (const m of duMois(moisDiagrammes).filter((m) => !m.estRevenu)) {
    const k = m.categorie || "Autre";
    parCat.set(k, (parCat.get(k) || 0) + m.montant);
  }
  const parts = [...parCat.entries()].map(([id, total]) => ({ cat: CAT[id] || CAT.Autre, total })).sort((a, b) => b.total - a.total);
  const total = parts.reduce((s, p) => s + p.total, 0);

  if (!parts.length) {
    $("donut").innerHTML = '<div class="vide"><div class="icone">🍩</div>Aucune dépense ce mois-ci.</div>';
    $("legende").replaceChildren();
  } else {
    const R = 80, C = 2 * Math.PI * R, ecart = parts.length > 1 ? 2.5 : 0;
    let offset = 0;
    const arcs = parts.map((p) => {
      const longueur = (p.total / total) * C;
      const arc = `<circle r="${R}" cx="100" cy="100" fill="none" stroke="${p.cat.c}" stroke-width="30"
        stroke-dasharray="${Math.max(longueur - ecart, 0.1)} ${C}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"/>`;
      offset += longueur;
      return arc;
    }).join("");
    $("donut").innerHTML = `<svg viewBox="0 0 200 200" role="img" aria-label="Répartition des dépenses">${arcs}</svg>
      <div class="centre"><small>Total</small><strong>${eurosRond(total)}</strong></div>`;
    $("legende").replaceChildren(...parts.map((p) => el("li", {},
      el("span", {}, p.cat.ico),
      el("span", { class: "nom" }, p.cat.id),
      el("span", { class: "val" }, euros(p.total)),
      el("span", { class: "pct" }, fmtPct.format(p.total / total)))));
  }

  // Barres sur 6 mois
  const mois = Array.from({ length: 6 }, (_, i) => ajouterMois(moisDiagrammes, i - 5));
  const bilans = mois.map((m) => { const l = duMois(m); return { m, r: revenus(l), d: depenses(l) }; });
  const max = Math.max(1, ...bilans.flatMap((b) => [b.r, b.d]));
  const L = 320, H = 150, bas = 20, largeurGroupe = L / 6, barre = 16;
  const h = (v) => (v / max) * (H - bas - 10);
  const barres = bilans.map((b, i) => {
    const x = i * largeurGroupe + largeurGroupe / 2;
    const nom = b.m.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
    return `<rect x="${x - barre - 1}" y="${H - bas - h(b.r)}" width="${barre}" height="${h(b.r)}" rx="3" fill="var(--vert)"/>
      <rect x="${x + 1}" y="${H - bas - h(b.d)}" width="${barre}" height="${h(b.d)}" rx="3" fill="var(--rouge)"/>
      <text x="${x}" y="${H - 4}" text-anchor="middle">${nom}</text>`;
  }).join("");
  $("barres").innerHTML = `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Revenus et dépenses sur 6 mois">
    <line x1="0" x2="${L}" y1="${H - bas}" y2="${H - bas}" stroke="var(--separateur)"/>${barres}
    <text x="0" y="8">${eurosRond(max)}</text></svg>`;
}

/* ---------- Épargne ---------- */

let moisEpargne = debutMois(new Date());
const champRevenus = $("revenus-prevus");

// Sans réglage pour ce mois, on reprend ceux du dernier mois configuré.
function planAffiche() {
  const cle = cleMois(moisEpargne);
  if (donnees.plans[cle]) return donnees.plans[cle];
  const precedents = Object.keys(donnees.plans).filter((k) => k < cle).sort();
  const p = precedents.length ? donnees.plans[precedents[precedents.length - 1]] : null;
  return { revenus: p ? p.revenus : 0, niveau: p ? p.niveau : "moyen" };
}

function modifierPlan(changement) {
  const cle = cleMois(moisEpargne);
  donnees.plans[cle] = { ...planAffiche(), ...changement };
  sauver();
}

champRevenus.addEventListener("input", () => {
  let v = champRevenus.value.replace(/[^\d.,]/g, "").replace(".", ",");
  const i = v.indexOf(",");
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, "").slice(0, 2);
  champRevenus.value = v.slice(0, 10);
  ajusterLargeur(champRevenus);
  modifierPlan({ revenus: lireMontant(v) || 0 });
  afficherEpargne(false);
});

$("utiliser-recus").addEventListener("click", () => {
  const recus = revenus(duMois(moisEpargne));
  modifierPlan({ revenus: recus });
  afficherEpargne(true);
});

function afficherEpargne(rechargerChamp = true) {
  selecteurMois(document.querySelector('[data-mois="epargne"]'), () => moisEpargne,
    (m) => { moisEpargne = m; afficherEpargne(true); });

  const plan = planAffiche();
  const niveau = NIV[plan.niveau] || NIV.moyen;
  if (rechargerChamp) {
    champRevenus.value = plan.revenus ? fmtSaisie.format(plan.revenus) : "";
    ajusterLargeur(champRevenus);
  }

  const l = duMois(moisEpargne);
  const recus = revenus(l);
  const bouton = $("utiliser-recus");
  bouton.hidden = !(recus > 0 && recus !== plan.revenus);
  bouton.textContent = `Utiliser mes revenus enregistrés (${euros(recus)})`;

  $("niveaux").replaceChildren(...NIVEAUX.map((n) => el("button", {
    class: "niveau" + (n.id === niveau.id ? " choisi" : ""),
    style: `--c:${n.c}`,
    "aria-pressed": String(n.id === niveau.id),
    onclick: () => { modifierPlan({ niveau: n.id }); afficherEpargne(false); },
  }, el("span", { class: "ico" }, n.ico), el("b", {}, n.nom), el("span", {}, `${fmtPct.format(n.taux)} des rentrées`))));

  const res = $("resultat");
  if (!plan.revenus) {
    res.innerHTML = '<p class="aide">Indique tes rentrées d\'argent prévues pour savoir combien mettre de côté ce mois-ci.</p>';
    return;
  }
  const aEpargner = Math.round(plan.revenus * niveau.taux);
  const budget = plan.revenus - aEpargner;
  const depense = depenses(l);
  const reste = budget - depense;
  const part = budget > 0 ? Math.min(1, depense / budget) : 1;
  res.innerHTML = `
    <small>À mettre de côté</small>
    <div class="grand" style="color:${niveau.c}">${eurosRond(aEpargner)}</div>
    <small>${niveau.nom} · ${fmtPct.format(niveau.taux)} de ${eurosRond(plan.revenus)}</small>
    <hr>
    <div class="ligne-res"><span>Budget pour tes dépenses</span><span>${euros(budget)}</span></div>
    <div class="ligne-res"><span>Déjà dépensé</span><span>${euros(depense)}</span></div>
    <div class="ligne-res"><span>Reste à dépenser</span><span style="font-weight:700;${reste < 0 ? "color:var(--rouge)" : ""}">${euros(reste)}</span></div>
    <div class="jauge"><div style="width:${part * 100}%;background:${reste < 0 ? "var(--rouge)" : niveau.c}"></div></div>
    ${reste < 0 ? `<p class="alerte">Attention : tu dépasses ton budget de ${euros(-reste)}.</p>` : ""}`;
}

/* ---------- Démarrage ---------- */

function toutAfficher() {
  afficherAccueil();
  afficherDiagrammes();
  afficherEpargne(document.activeElement !== champRevenus);
  if (!$("historique").hidden) afficherHistorique();
}

afficherChips();
ajusterLargeur(champMontant);
toutAfficher();

// Le mois change pendant que l'app reste ouverte.
document.addEventListener("visibilitychange", () => { if (!document.hidden) toutAfficher(); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
