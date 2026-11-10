"use strict";

/* =========================================================
   Maxilla : le défi de 180 jours, une habitude à la fois.
   Les données restent sur le téléphone (localStorage « maxilla.v1 »).
   Séries, courbe du défi et chiffres sont recalculés à partir des
   cases cochées : rien ne peut se désynchroniser.
   Les données de la première version (XP, trophées, coffres,
   lifestyle coché…) sont gardées telles quelles, simplement plus affichées.
   ========================================================= */

const CLE = "maxilla.v1";
const DUREE_DEFI = 180;
const JALONS = [
  { j: 7, nom: "Première semaine", texte: "Une semaine dans le défi. Les habitudes commencent à s'installer." },
  { j: 30, nom: "Premier mois", texte: "Un mois de défi : ton visage travaille depuis 30 jours." },
  { j: 60, nom: "Deux mois", texte: "Deux mois de défi : un tiers du chemin est fait." },
  { j: 90, nom: "Mi-parcours", texte: "La moitié du défi est derrière toi." },
  { j: 120, nom: "Quatre mois", texte: "Quatre mois de défi. Plus que deux." },
  { j: 150, nom: "Cinq mois", texte: "La dernière ligne droite : encore 30 jours." },
  { j: 180, nom: "Défi accompli", texte: "180 jours : le défi est bouclé." },
];

const $ = (id) => document.getElementById(id);
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EX = Object.fromEntries(EXERCICES.map((e) => [e.id, e]));
const nombre = new Intl.NumberFormat("fr-FR");
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pluriel = (n, mot, mots = mot + "s") => `${nombre.format(n)} ${n > 1 ? mots : mot}`;
const ico = (nom, classe = "") => `<svg class="ico ${classe}" aria-hidden="true"><use href="#i-${nom}"/></svg>`;

// Les fun facts, mélangés d'une section à l'autre (un de chaque, à tour de rôle).
const FAITS = (() => {
  const files = FUN_FACTS.map((s) => s.faits.map((f) => ({ ...f, sec: s })));
  const res = [];
  for (let i = 0; files.some((f) => i < f.length); i++) for (const f of files) if (f[i]) res.push(f[i]);
  return res;
})();

/* =========================================================
   Dates (jours au format AAAA-MM-JJ, heure locale)
   ========================================================= */

const deux = (n) => String(n).padStart(2, "0");
const cleDe = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
const dateDe = (k) => { const [a, m, j] = k.split("-").map(Number); return new Date(a, m - 1, j); };
const decaler = (k, n) => { const d = dateDe(k); d.setDate(d.getDate() + n); return cleDe(d); };
const ecart = (a, b) => Math.round((dateDe(b) - dateDe(a)) / 86400000);
const aujourdhui = () => cleDe(new Date());
const jourSem = (k) => dateDe(k).getDay();
const numeroJour = (k) => Math.round(dateDe(k).getTime() / 86400000);
const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fmtJourMois = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const JOURS_ABR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const ORDRE_SEMAINE = [1, 2, 3, 4, 5, 6, 0];

function nomDuJour(k) {
  const t = aujourdhui();
  if (k === t) return "Aujourd'hui";
  if (k === decaler(t, -1)) return "Hier";
  return majuscule(fmtCourt.format(dateDe(k)));
}
function joursTexte(jours = []) {
  if (jours.length === 7) return "Chaque jour";
  if (!jours.length) return "Aucun jour";
  return ORDRE_SEMAINE.filter((j) => jours.includes(j)).map((j) => majuscule(JOURS_ABR[j])).join(" · ");
}

/* =========================================================
   Données
   ========================================================= */

function neuf() {
  return {
    version: 1,
    jours: {},                           // "AAAA-MM-JJ" → { ex: [ids des exercices cochés] }
    defi: null,                          // { debut, signe }
    defisPasses: [],
    reglages: { sons: true, prenom: "" },
    vu: { casse: null, jalon: 0, fact: null },
  };
}
const objet = (o) => (o && typeof o === "object" && !Array.isArray(o) ? o : {});
function valide(d) {
  return !!d && typeof d === "object" && !Array.isArray(d) && !!d.jours && typeof d.jours === "object" && !Array.isArray(d.jours);
}
// Complète sans jamais rien effacer : les champs inconnus (ceux de la première version) restent.
function completer(d) {
  const n = neuf();
  if (!d.defi || typeof d.defi !== "object" || !/^20\d\d-\d\d-\d\d$/.test(d.defi.debut || "")) d.defi = null;
  if (!Array.isArray(d.defisPasses)) d.defisPasses = [];
  d.reglages = { ...n.reglages, ...objet(d.reglages) };
  if (typeof d.reglages.prenom !== "string") d.reglages.prenom = "";
  d.vu = { ...n.vu, ...objet(d.vu) };
  for (const k of Object.keys(d.jours)) {
    // Une clé qui n'est pas une vraie date est mise de côté (gardée, mais ignorée par les calculs).
    if (!/^(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(k)) {
      d.joursIgnores = { ...objet(d.joursIgnores), [k]: d.jours[k] };
      delete d.jours[k];
      continue;
    }
    const j = objet(d.jours[k]);
    j.ex = Array.isArray(j.ex) ? j.ex : [];
    d.jours[k] = j;
  }
  if (!d.version) d.version = 1;
  return d;
}
function charger() {
  let brut = null;
  try { brut = localStorage.getItem(CLE); } catch (e) {}
  if (brut) {
    try { const d = JSON.parse(brut); if (valide(d)) return completer(d); } catch (e) {}
    // Jamais de perte : on garde le contenu illisible de côté avant de repartir de zéro.
    try { localStorage.setItem(CLE + ".illisible", brut); } catch (e) {}
  }
  return neuf();
}
let donnees = charger();
function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(donnees));
    window.Sauvegarde?.signaler();
  } catch (e) {
    toast("Impossible d'enregistrer", { rouge: true, icone: "!" });
  }
}
function jourEcrit(k) {
  if (!donnees.jours[k]) donnees.jours[k] = { ex: [] };
  return donnees.jours[k];
}
// Un jour vide est retiré, sauf s'il garde des données de la première version.
function nettoyer(k) {
  const d = donnees.jours[k];
  if (d && !d.ex.length && Object.keys(d).every((c) => c === "ex" || (Array.isArray(d[c]) && !d[c].length))) delete donnees.jours[k];
}

/* =========================================================
   Programme : quels exercices tombent quel jour
   ========================================================= */

function planDu(k) {
  let p = PROGRAMMES[0].plan;
  for (const e of PROGRAMMES) { if (e.depuis <= k) p = e.plan; else break; }
  return p;
}
const estDu = (e, k) => (planDu(k)[e.id] || []).includes(jourSem(k));
const dus = (k) => EXERCICES.filter((e) => estDu(e, k));
const fait = (id, k) => !!donnees.jours[k]?.ex.includes(id);

function totalTexte(e, n) {
  const u = e.unite, total = n * u.par;
  if (!u.duree) return pluriel(total, u.mot);
  if (u.mot === "seconde") {
    if (total < 60) return pluriel(total, "seconde") + " de contraction";
    const m = Math.floor(total / 60), s = total % 60;
    return `${m} min${s ? ` ${deux(s)} s` : ""} de contraction`;
  }
  if (total < 60) return `${total} min de cardio`;
  const h = Math.floor(total / 60), m = total % 60;
  return `${h} h${m ? ` ${deux(m)}` : ""} de cardio`;
}

/* =========================================================
   Analyse : séries et défi (tout est recalculé)
   ========================================================= */

let A = null;
function analyser() {
  const t = aujourdhui();
  const cles = Object.keys(donnees.jours).sort();
  let debut = cles.length ? cles[0] : t;
  if (donnees.defi && donnees.defi.debut < debut) debut = donnees.defi.debut;
  if (debut > t) debut = t;

  const J = {};
  let chaine = 0, record = 0, parfaits = 0, coches = 0, derniereCasse = null;
  const seances = Object.fromEntries(EXERCICES.map((e) => [e.id, 0]));
  for (let k = debut; k <= t; k = decaler(k, 1)) {
    const ex = donnees.jours[k]?.ex || [];
    const du = dus(k);
    const nbFaits = du.reduce((n, e) => n + (ex.includes(e.id) ? 1 : 0), 0);
    const parfait = du.length > 0 && nbFaits === du.length;
    for (const id of ex) if (EX[id]) { seances[id]++; coches++; }
    if (parfait) { chaine++; parfaits++; }
    else if (k !== t) { if (chaine > 0) derniereCasse = { k, avant: chaine }; chaine = 0; } // aujourd'hui, pas encore fini, ne casse rien
    record = Math.max(record, chaine);
    J[k] = { parfait, dus: du.length, faits: nbFaits, chaine };
  }
  const res = { t, debut, J, serie: chaine, record, parfaits, coches, seances, derniereCasse };
  res.defi = analyserDefi(res);
  return res;
}

function analyserDefi(R) {
  const D = donnees.defi;
  if (!D) return null;
  const t = R.t, fin = decaler(D.debut, DUREE_DEFI - 1);
  const termine = t > fin;
  const jour = Math.max(1, Math.min(ecart(D.debut, t) + 1, DUREE_DEFI));
  const points = [], cassures = [];
  let c = 0, record = 0, parfaits = 0;
  for (let i = 0; i < DUREE_DEFI; i++) {
    const k = decaler(D.debut, i);
    if (k > t) break;
    if (R.J[k]?.parfait) { c++; parfaits++; record = Math.max(record, c); points.push({ i, k, y: c, etat: "parfait" }); }
    else if (k === t) points.push({ i, k, y: c, etat: "encours" });
    else { cassures.push({ i, k, avant: c }); points.push({ i, k, y: 0, avant: c, etat: "casse" }); c = 0; }
  }
  const aujourdhuiFait = !!R.J[t]?.parfait;
  const faits = termine ? DUREE_DEFI : jour - 1 + (aujourdhuiFait ? 1 : 0);
  const restants = termine ? 0 : DUREE_DEFI - jour + (aujourdhuiFait ? 0 : 1);
  const pct = parfaits / DUREE_DEFI;
  const note = pct >= 0.95 ? "S" : pct >= 0.85 ? "A" : pct >= 0.7 ? "B" : pct >= 0.5 ? "C" : "D";
  return { debut: D.debut, fin, termine, jour, points, cassures, serie: c, record, parfaits, faits, restants, possible: c + restants, aujourdhuiFait, note };
}

// Recalcule tout et repère les jalons du défi tout juste atteints. Renvoie les célébrations à afficher.
function actualiser() {
  A = analyser();
  const evts = [];
  const D = A.defi;
  if (D) {
    const atteint = JALONS.filter((j) => D.faits >= j.j).pop();
    if (atteint && atteint.j > (donnees.vu.jalon || 0)) {
      donnees.vu.jalon = atteint.j;
      sauver();
      if (D.faits - atteint.j <= 2) evts.push({ type: "jalon", jalon: atteint }); // trop ancien : on ne fête pas après coup
    }
  }
  return evts;
}

/* =========================================================
   Petits outils DOM, effets
   ========================================================= */

function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  e.append(...enfants.flat().filter((x) => x != null && x !== false).map((x) => (typeof x === "number" ? String(x) : x)));
  return e;
}

function rejouer(elm, classe) {
  if (!elm) return;
  elm.classList.remove(classe);
  void elm.offsetWidth;
  elm.classList.add(classe);
  elm.addEventListener("animationend", () => elm.classList.remove(classe), { once: true });
}

const COULEURS_FETE = ["#ffffff", "#c8b2fc", "#e4d8ff", "#9f86f2", "#f2edff"];
function confettis(depuis, couleurs = COULEURS_FETE, n = 60) {
  if (reduit || !depuis) return;
  const r = depuis.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const c = el("i", { class: "confetti" + (i % 3 === 0 ? " rond" : ""), style: `background:${couleurs[i % couleurs.length]}` });
    document.body.append(c);
    const ang = Math.random() * Math.PI * 2, force = 80 + Math.random() * 160;
    const dx = Math.cos(ang) * force, dy = Math.sin(ang) * force - 110;
    const rot = (Math.random() - 0.5) * 1080;
    c.animate([
      { transform: `translate(${cx}px, ${cy}px) rotate(0) scale(.6)`, opacity: 1 },
      { transform: `translate(${cx + dx}px, ${cy + dy}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${cx + dx * 1.3}px, ${cy + dy + 420}px) rotate(${rot}deg) scale(.8)`, opacity: 0 },
    ], { duration: 1400 + Math.random() * 800, easing: "cubic-bezier(.25,.6,.4,1)" }).finished.then(() => c.remove());
  }
}
function etincelles(depuis) {
  if (reduit || !depuis) return;
  const r = depuis.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 10; i++) {
    const c = el("i", { class: "etincelle", style: `background:${i % 2 ? "#c8b2fc" : "#fff"}` });
    document.body.append(c);
    const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4, d = 22 + Math.random() * 18;
    c.animate([
      { transform: `translate(${cx}px, ${cy}px) scale(1)`, opacity: 1 },
      { transform: `translate(${cx + Math.cos(ang) * d}px, ${cy + Math.sin(ang) * d}px) scale(.2)`, opacity: 0 },
    ], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }).finished.then(() => c.remove());
  }
}

let minuteurToast;
function toast(texte, { rouge = false, icone = "✓", action, surAction } = {}) {
  const t = $("toast");
  t.replaceChildren(
    el("span", { class: "ok" + (rouge ? " rouge" : "") }, icone),
    el("span", { class: "txt" }, texte),
    action ? el("button", { onclick: () => { t.classList.remove("visible"); surAction(); } }, action) : "",
  );
  t.classList.add("visible");
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove("visible"), action ? 4500 : 2400);
}

/* =========================================================
   Feuille du bas
   ========================================================= */

function ouvrirFeuille(contenu, { classe = "" } = {}) {
  const f = $("feuille"), p = $("feuille-panneau");
  p.className = "panneau " + classe;
  p.replaceChildren(el("div", { class: "poignee" }), ...[contenu].flat().filter(Boolean));
  p.scrollTop = 0;
  f.hidden = false;
  document.body.classList.add("bloque");
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("ouvert")));
}
function fermerFeuille() {
  const f = $("feuille");
  if (f.hidden) return;
  f.classList.remove("ouvert");
  document.body.classList.remove("bloque");
  setTimeout(() => { if (!f.classList.contains("ouvert")) f.hidden = true; }, 320);
}

/* =========================================================
   Onglet « Accueil »
   ========================================================= */

let jourVu = aujourdhui();
let vue = "jour";

const phraseDuJour = (k) => PHRASES[numeroJour(k) % PHRASES.length];
const factDuJour = (k) => numeroJour(k) % FAITS.length;

function rendreJour() {
  const t = A.t;
  if (jourVu > t) jourVu = t;
  const h = new Date().getHours();
  const prenom = donnees.reglages.prenom.trim();
  $("salut").textContent = `${h >= 18 || h < 4 ? "Bonsoir" : "Bonjour"}${prenom ? ", " + prenom : ""}`;
  $("devise").textContent = phraseDuJour(t);
  $("point-fact").hidden = donnees.vu.fact === t;

  rendreHeros();
  $("stats").replaceChildren(
    el("button", { class: "stat", onclick: () => allerA("defi") },
      el("span", { html: ico("flamme") }),
      el("span", { class: "stat-txt" }, el("small", {}, "Série actuelle"), el("b", {}, pluriel(A.serie, "jour")))),
    el("button", { class: "stat", onclick: () => allerA("progres") },
      el("span", { html: ico("check") }),
      el("span", { class: "stat-txt" }, el("small", {}, "Jours parfaits"), el("b", {}, nombre.format(A.parfaits)))));

  const titre = $("titre-jour");
  titre.textContent = nomDuJour(jourVu);
  titre.classList.toggle("passe", jourVu !== t);
  titre.setAttribute("aria-label", jourVu === t ? "Aujourd'hui" : `${fmtLong.format(dateDe(jourVu))}, revenir à aujourd'hui`);
  $("jour-suiv").disabled = jourVu === t;

  const du = dus(jourVu);
  $("liste").replaceChildren(...du.map((e) => ligneEx(e, jourVu)));
  const autres = EXERCICES.filter((e) => !du.includes(e));
  $("hors").replaceChildren(
    autres.length ? el("span", {}, `Pas ${jourVu === t ? "aujourd'hui" : "ce jour-là"} : `,
      ...autres.map((e, i) => [i ? ", " : "", el("b", {}, e.nom), ` (${joursTexte(planDu(jourVu)[e.id]).toLowerCase()})`]).flat(), ".") : null,
    el("span", {}, "Touche l'icône d'un exercice pour voir comment le faire."));
}

function rendreHeros() {
  const t = A.t, k = jourVu, D = A.defi;
  const du = dus(k);
  const n = du.filter((e) => fait(e.id, k)).length;
  const parfait = du.length > 0 && n === du.length;
  const passe = k !== t;
  let pastille, titre, sous, bouton, action;
  if (passe) {
    pastille = "Correction";
    titre = majuscule(fmtLong.format(dateDe(k)));
    sous = parfait ? "Journée parfaite" : "Coche ce que tu avais fait ce jour-là";
    bouton = "Revenir à aujourd'hui";
    action = () => { jourVu = t; rendre(); };
  } else {
    pastille = !D ? "Aujourd'hui" : D.termine ? `Défi terminé · note ${D.note}` : `Défi · jour ${D.jour} / 180`;
    titre = "Programme du jour";
    sous = `${majuscule(fmtLong.format(dateDe(k)))} · ${pluriel(du.length, "exercice")}`;
    bouton = !D ? "Lancer le défi 180 jours" : D.termine ? "Voir ma note" : "Voir ma courbe";
    action = () => allerA("defi");
  }
  const pct = du.length ? (n / du.length) * 100 : 0;
  $("heros").replaceChildren(
    el("div", { class: "heros-illu", html: illustration(D) }),
    el("span", { class: "pastille-lavande" }, pastille),
    el("h2", {}, titre),
    el("p", { class: "heros-sous" }, sous),
    el("div", { class: "heros-prog" },
      el("span", { class: "piste", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": du.length, "aria-valuenow": n, "aria-label": "Exercices terminés" },
        el("i", { style: `width:${pct.toFixed(1)}%` })),
      el("span", { class: "heros-compte" + (parfait ? " parfait" : "") }, parfait ? "Journée parfaite" : `${n} / ${du.length} terminés`)),
    el("button", { class: "bouton-lavande", onclick: action }, el("span", {}, bouton), el("span", { html: ico("chevron") })));
  $("heros").classList.toggle("parfait", parfait);
}

// En haut à droite de la carte : les derniers jours de la courbe du défi, sinon une courbe qui monte.
function illustration(D) {
  const pts = D && !D.termine ? D.points.slice(-12) : null;
  if (!pts || pts.length < 3) return ico("courbe", "illu-ico");
  const W = 96, H = 60, max = Math.max(4, ...pts.map((p) => p.y));
  const x = (i) => 4 + (i / (pts.length - 1)) * (W - 8);
  const y = (v) => H - 6 - (v / max) * (H - 14);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(" ");
  const der = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d} L${x(pts.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H}Z" class="illu-aire"/><path d="${d}" class="illu-trait"/><circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(der.y).toFixed(1)}" r="4" class="illu-point"/></svg>`;
}

function ligneEx(e, k) {
  const f = fait(e.id, k);
  return el("div", { class: "ligne" + (f ? " fait" : ""), "data-id": e.id },
    el("button", { class: "ligne-ico", "aria-label": `${e.nom} : comment faire`, onclick: () => ouvrirFiche(e.id), html: ico(e.icone) }),
    el("button", { class: "ligne-corps", role: "checkbox", "aria-checked": f ? "true" : "false", "aria-label": `${e.nom}, ${e.presc}`, onclick: () => basculer(e.id, k) },
      el("span", { class: "ligne-txt" }, el("b", {}, e.nom), el("small", {}, e.presc)),
      el("span", { class: "case", html: ico("coche") })));
}

function rendreBandeau() {
  const piste = $("bandeau-piste");
  const bloc = () => el("span", { class: "bandeau-bloc" }, ...FAITS.map((f) => el("span", { class: "bandeau-item" }, f.court)));
  piste.replaceChildren(bloc(), bloc());
  requestAnimationFrame(() => {
    const w = piste.firstChild.getBoundingClientRect().width;
    const duree = Math.max(60, w / 30);
    piste.style.animationDuration = `${duree}s`;
    piste.style.animationDelay = `${-(((numeroJour(aujourdhui()) * 0.37) % 1) * duree).toFixed(1)}s`;
  });
}

/* =========================================================
   Cocher un exercice
   ========================================================= */

const file = [];
let feteOuverte = false;

function basculer(id, k = jourVu) {
  Sons.debloquer();
  const avant = !!A.J[k]?.parfait;
  const d = jourEcrit(k);
  const i = d.ex.indexOf(id);
  const coche = i < 0;
  if (coche) d.ex.push(id); else d.ex.splice(i, 1);
  nettoyer(k);
  sauver();
  const evts = actualiser();
  const devientParfait = !!A.J[k]?.parfait && !avant;
  rendre();
  if (coche) {
    Sons.coche(Math.max(0, dus(k).filter((e) => fait(e.id, k)).length - 1));
    vibrer();
    const ligne = document.querySelector(`.vue.active .ligne[data-id="${id}"]`);
    if (ligne) { rejouer(ligne, "pop"); etincelles(ligne.querySelector(".case")); }
    rejouer(document.querySelector("#heros .piste"), "brille");
  } else {
    Sons.decoche();
  }
  if (devientParfait) evts.unshift({ type: "parfait", k });
  file.push(...evts);
  setTimeout(montrerFetes, devientParfait ? 650 : 300);
}

/* =========================================================
   Fiche d'un exercice, fun fact du jour
   ========================================================= */

function ouvrirFiche(id) {
  const e = EX[id], k = jourVu, t = aujourdhui();
  const f = fait(id, k);
  const lib = k !== t ? ` (${nomDuJour(k).toLowerCase()})` : "";
  ouvrirFeuille([
    el("div", { class: "fiche-tete" },
      el("span", { class: "fiche-ico", html: ico(e.icone) }),
      el("div", {}, el("h2", {}, e.nom), el("p", { class: "fiche-long" }, e.long))),
    el("div", { class: "pastilles" },
      el("span", { class: "pastille forte" }, e.presc),
      el("span", { class: "pastille" }, joursTexte(planDu(t)[id]))),
    el("button", { class: "bouton-lavande", onclick: () => { fermerFeuille(); setTimeout(() => basculer(id, k), 280); } },
      el("span", {}, f ? `Décocher${lib}` : `Marquer comme fait${lib}`)),
    el("h3", {}, "Comment faire"),
    el("ol", { class: "etapes" }, ...e.etapes.map((x) => el("li", {}, x))),
    el("h3", {}, "Pourquoi"),
    ...e.pourquoi.map((x) => el("p", { class: "fiche-p" }, x)),
    e.attention ? el("div", { class: "attention" }, el("b", {}, "Attention"), el("p", {}, e.attention)) : null,
    el("p", { class: "fiche-note" }, `Depuis le début : ${pluriel(A.seances[id], "séance")} · ${totalTexte(e, A.seances[id])}.`),
  ], { classe: "fiche" });
}

function ouvrirFact(i = factDuJour(aujourdhui())) {
  const t = aujourdhui();
  if (donnees.vu.fact !== t) { donnees.vu.fact = t; sauver(); $("point-fact").hidden = true; }
  const zone = el("div", { class: "fact" });
  const montrer = () => {
    const f = FAITS[i];
    zone.replaceChildren(
      el("p", { class: "fact-sec" }, el("span", { html: ico(f.sec.icone) }), f.groupe ? `${f.sec.nom} · ${f.groupe}` : f.sec.nom),
      el("h2", {}, f.titre),
      el("p", { class: "fact-texte" }, f.texte));
    rejouer(zone, "entree");
  };
  montrer();
  ouvrirFeuille([
    el("span", { class: "pastille-lavande" }, "Le savais-tu ?"),
    zone,
    el("div", { class: "fiche-actions" },
      el("button", { class: "bouton-second", onclick: () => { i = (i + 1 + Math.floor(Math.random() * (FAITS.length - 1))) % FAITS.length; montrer(); } },
        el("span", { html: ico("encore") }), "Un autre"),
      el("button", { class: "bouton-lavande", onclick: () => { fermerFeuille(); allerA("lifestyle"); } }, el("span", {}, "Tous les fun facts"))),
  ], { classe: "fiche-fact" });
}

/* =========================================================
   Célébrations
   ========================================================= */

function montrerFetes() {
  if (feteOuverte || !file.length) return;
  const f = file.shift();
  feteOuverte = true;
  const fete = $("fete"), c = $("fete-contenu");
  c.replaceChildren();
  fete.className = "fete " + f.type;
  fete.hidden = false;
  document.body.classList.add("bloque");
  requestAnimationFrame(() => requestAnimationFrame(() => fete.classList.add("ouvert")));
  ({ parfait: feteParfait, jalon: feteJalon, casse: feteCasse, signe: feteSigne }[f.type] || (() => fermerFete()))(f, c);
  setTimeout(() => c.querySelector(".fete-bouton")?.focus({ preventScroll: true }), 400);
}
function fermerFete() {
  const fete = $("fete");
  fete.classList.remove("ouvert");
  document.body.classList.remove("bloque");
  setTimeout(() => {
    fete.hidden = true;
    feteOuverte = false;
    rendre();
    montrerFetes();
  }, 380);
}
const boutonContinuer = (texte = "Continuer") => el("button", { class: "fete-bouton", onclick: fermerFete }, texte);
const chiffre = (valeur, texte) => el("div", {}, el("b", {}, valeur), el("small", {}, texte));

function feteParfait(f, c) {
  const k = f.k || aujourdhui();
  const D = A.defi;
  const serie = k === A.t ? A.J[k]?.chaine || 0 : A.serie;
  Sons.parfait(); vibrer();
  c.append(
    el("div", { class: "fete-anneau", html: `<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="fa-fond" cx="60" cy="60" r="52"/><circle class="fa-arc" cx="60" cy="60" r="52"/><path class="fa-coche" d="M39 61.5l14 14 29-31"/></svg>` }),
    el("p", { class: "fete-sur" }, k === A.t ? "Aujourd'hui" : majuscule(fmtLong.format(dateDe(k)))),
    el("h2", { class: "fete-titre" }, "Journée parfaite"),
    el("p", { class: "fete-texte" }, D && !D.termine && k >= D.debut ? "Tout le programme est coché : ta courbe monte d'un cran." : "Tout le programme est coché."),
    el("div", { class: "fete-stats" },
      chiffre(pluriel(serie, "jour"), k === A.t ? "de série" : "de série actuelle"),
      D && !D.termine ? chiffre(`${D.jour} / 180`, "jours de défi") : chiffre(nombre.format(A.parfaits), A.parfaits > 1 ? "journées parfaites" : "journée parfaite")),
    boutonContinuer(),
  );
  setTimeout(() => confettis(c.querySelector(".fete-anneau"), undefined, 70), 500);
}

function feteJalon(f, c) {
  Sons.jalon(); vibrer();
  const D = A.defi;
  c.append(
    el("div", { class: "fete-medaille", html: ico("drapeau") }),
    el("p", { class: "fete-sur" }, "Jalon atteint"),
    el("h2", { class: "fete-titre" }, f.jalon.nom),
    el("p", { class: "fete-texte" }, f.jalon.texte),
    D ? el("div", { class: "fete-stats" },
      chiffre(pluriel(D.serie, "jour"), "de série"),
      chiffre(nombre.format(D.parfaits), D.parfaits > 1 ? "journées parfaites" : "journée parfaite")) : null,
    boutonContinuer(),
  );
  setTimeout(() => confettis(c.querySelector(".fete-medaille"), undefined, 70), 300);
}

function feteCasse(f, c) {
  Sons.casse(); vibrer();
  const hier = f.k === decaler(aujourdhui(), -1);
  const D = A.defi;
  c.append(
    el("div", { class: "fissure", "aria-hidden": "true", html: `<svg viewBox="0 0 200 120"><path class="fis-ligne" d="M10 100 L46 78 L72 84 L104 42"/><path class="fis-chute" d="M104 42 L112 66 L106 72 L118 106"/><path class="fis-eclat" d="M104 42l9-14M104 42l15 4M104 42l-6-15"/></svg>` }),
    el("p", { class: "fete-sur rouge" }, D && !D.termine ? "Défi 180 jours" : "Ta série"),
    el("h2", { class: "fete-titre" }, "La courbe s'est cassée"),
    el("p", { class: "fete-texte" }, `${hier ? "Hier" : majuscule(fmtLong.format(dateDe(f.k)))}, un exercice a manqué. Ta série de ${pluriel(f.avant, "jour parfait", "jours parfaits")} repart de zéro.`),
    el("p", { class: "fete-texte doux" }, D && !D.termine ? `Le défi continue : il reste ${pluriel(D.restants, "jour")}. Reconstruis ta courbe dès aujourd'hui.` : "Reconstruis-la dès aujourd'hui."),
    el("button", { class: "fete-bouton rouge", onclick: fermerFete }, "Je repars"),
    el("button", { class: "fete-lien", onclick: () => { jourVu = f.k; fermerFete(); allerA("jour"); } }, "J'avais tout fait : corriger ce jour"),
  );
}

function feteSigne(f, c) {
  Sons.signature(); vibrer();
  const D = A.defi;
  c.append(
    el("div", { class: "fete-medaille", html: ico("courbe") }),
    el("p", { class: "fete-sur" }, "Défi lancé"),
    el("h2", { class: "fete-titre" }, "Jour 1 sur 180"),
    el("p", { class: "fete-texte" }, `Arrivée le ${fmtDate.format(dateDe(D.fin))}. Chaque journée parfaite fait monter ta courbe. Un exercice oublié, et elle se casse.`),
    boutonContinuer("C'est parti"),
  );
  setTimeout(() => confettis(c.querySelector(".fete-medaille"), undefined, 80), 250);
}

function verifierCasse() {
  const dc = A.derniereCasse;
  if (!dc) return;
  if (donnees.vu.casse && dc.k <= donnees.vu.casse) return;
  donnees.vu.casse = dc.k;
  sauver();
  if (ecart(dc.k, A.t) > 14) return; // trop ancien : on ne dramatise pas
  file.unshift({ type: "casse", k: dc.k, avant: dc.avant });
}

/* =========================================================
   Onglet « Défi »
   ========================================================= */

function rendreDefi() {
  const v = $("vue-defi");
  const D = A.defi;
  if (!D) { v.replaceChildren(...pacte()); return; }

  const tete = el("header", { class: "tete" },
    el("p", { class: "sur-titre" }, D.termine ? "Défi terminé" : `Jour ${D.jour} sur 180 · arrivée le ${fmtJourMois.format(dateDe(D.fin))}`),
    el("h1", {}, "Défi 180 jours"));

  if (D.termine) {
    v.replaceChildren(tete,
      el("section", { class: "carte resultat" },
        el("p", { class: "etiquette" }, "Ta note finale"),
        el("p", { class: "note note-" + D.note }, D.note),
        el("p", {}, `${D.parfaits} journées parfaites sur 180 (${Math.round((D.parfaits / 180) * 100)} %) · meilleure série : ${pluriel(D.record, "jour")} · ${pluriel(D.cassures.length, "cassure")}`)),
      carteCourbe(D), carteMur(D),
      el("button", { class: "bouton-lavande", onclick: archiverDefi }, el("span", {}, "Lancer un nouveau défi")));
    return;
  }

  const pctParfaits = D.faits ? Math.round((D.parfaits / D.faits) * 100) : 0;
  v.replaceChildren(
    tete,
    carteCourbe(D),
    el("div", { class: "tuiles" },
      tuile("flamme", D.serie, D.serie > 1 ? "jours de série" : "jour de série"),
      tuile("sommet", D.record, "meilleure série"),
      tuile("check", D.parfaits, `jour${D.parfaits > 1 ? "s" : ""} parfait${D.parfaits > 1 ? "s" : ""} · ${pctParfaits} %`),
      tuile("eclair", D.cassures.length, D.cassures.length > 1 ? "cassures" : "cassure", D.cassures.length ? "rouge" : "")),
    carteMur(D),
    carteJalons(D),
    carteProgramme(),
    carteRegles(),
    el("button", { class: "lien-danger", onclick: recommencerDefi }, "Recommencer le défi à zéro"),
  );
}

function tuile(icone, valeur, texte, classe = "") {
  return el("div", { class: "tuile " + classe }, el("span", { html: ico(icone) }), el("b", {}, nombre.format(valeur)), el("small", {}, texte));
}

// La courbe du défi. « Zoom » cadre le chemin parcouru (et suit le défi), « 6 mois » montre les 180 jours.
let vueCourbe = "zoom";
function carteCourbe(D) {
  const W = 340, H = 220, pl = 30, pr = 14, pt = 16, pb = 28, n = DUREE_DEFI;
  const zoom = vueCourbe === "zoom" && !D.termine;
  const X = zoom ? Math.min(n, Math.max(30, Math.ceil((D.jour + 12) / 10) * 10)) : n;
  const x = (j) => pl + (Math.min(j, X) / X) * (W - pl - pr);
  const y = (v) => H - pb - (Math.min(v, X) / X) * (H - pt - pb);
  const f = (v) => v.toFixed(1);
  const segs = [];
  let cur = [[0, 0]];
  const chutes = [], fissures = [], manques = [];
  let fin = [0, 0];
  for (const p of D.points) {
    if (p.etat === "parfait") { cur.push([p.i + 1, p.y]); fin = [p.i + 1, p.y]; }
    else if (p.etat === "casse") {
      segs.push(cur);
      if (p.avant > 0) { chutes.push([p.i, p.avant, p.i + 1, 0]); fissures.push([p.i, p.avant]); }
      else manques.push(p.i);
      cur = [[p.i + 1, 0]];
      fin = [p.i + 1, 0];
    }
  }
  segs.push(cur);
  const pasY = X <= 30 ? 10 : X <= 60 ? 20 : X <= 120 ? 40 : 60;
  const pasX = X <= 60 ? 10 : X <= 120 ? 20 : 30;
  const chemin = (s) => s.map((q, j) => `${j ? "L" : "M"}${f(x(q[0]))} ${f(y(q[1]))}`).join(" ");
  const aire = (s) => s.length < 2 ? "" : `${chemin(s)} L${f(x(s[s.length - 1][0]))} ${f(y(0))} L${f(x(s[0][0]))} ${f(y(0))} Z`;
  let grille = "", graduations = `<text x="${f(x(0))}" y="${H - 8}" class="c-axe">J1</text>`;
  for (let v = 0; v <= X; v += pasY) grille += `<line x1="${pl}" x2="${W - pr}" y1="${f(y(v))}" y2="${f(y(v))}" class="c-grille"/><text x="${pl - 6}" y="${f(y(v))}" class="c-axe" text-anchor="end" dominant-baseline="central">${v}</text>`;
  for (let j = pasX; j <= X; j += pasX) graduations += `<text x="${f(x(j))}" y="${H - 8}" class="c-axe" text-anchor="${j === X ? "end" : "middle"}">J${j}</text>`;
  const ideal = `<line x1="${f(x(0))}" y1="${f(y(0))}" x2="${f(x(X))}" y2="${f(y(X))}" class="c-ideal"/>`;
  const finFantome = Math.min(X, fin[1] + (X - fin[0]));
  const fantome = D.termine ? "" : `<line x1="${f(x(fin[0]))}" y1="${f(y(fin[1]))}" x2="${f(x(X))}" y2="${f(y(finFantome))}" class="c-fantome"/><circle cx="${f(x(X))}" cy="${f(y(finFantome))}" r="3.5" class="c-fantome-pt"/>`;
  const chutesSvg = chutes.map(([a, v, b, w]) => `<path d="M${f(x(a))} ${f(y(v))} L${f(x(b))} ${f(y(w))}" class="c-chute"/>`).join("");
  const r = zoom ? 7 : 5.5;
  const fissuresSvg = fissures.map(([a, v]) => {
    const cx = x(a), cy = y(v), k = r / 7;
    return `<g class="c-fissure"><circle cx="${f(cx)}" cy="${f(cy)}" r="${r}"/><path d="M${f(cx - 3.5 * k)} ${f(cy - 5 * k)} L${f(cx + 1 * k)} ${f(cy - 0.5 * k)} L${f(cx - 1.8 * k)} ${f(cy + 1.2 * k)} L${f(cx + 3.5 * k)} ${f(cy + 5.5 * k)}"/></g>`;
  }).join("");
  const manquesSvg = manques.map((i) => `<circle cx="${f(x(i + 0.5))}" cy="${f(y(0))}" r="2.2" class="c-manque"/>`).join("");
  const maintenant = D.termine ? "" : `<g class="c-maintenant"><circle cx="${f(x(fin[0]))}" cy="${f(y(fin[1]))}" r="9" class="c-halo"/><circle cx="${f(x(fin[0]))}" cy="${f(y(fin[1]))}" r="4.5" class="c-point"/></g>`;
  const svg = `<svg class="courbe" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe du défi : série de ${D.serie} jours, ${D.cassures.length} cassures">
<defs><linearGradient id="c-aire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8b2fc" stop-opacity=".32"/><stop offset="1" stop-color="#c8b2fc" stop-opacity="0"/></linearGradient>
<filter id="c-flou" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>
${grille}${graduations}${ideal}${fantome}
${segs.map((s) => `<path d="${aire(s)}" fill="url(#c-aire)"/>`).join("")}
${segs.map((s) => s.length > 1 ? `<path d="${chemin(s)}" class="c-lueur" filter="url(#c-flou)"/><path d="${chemin(s)}" class="c-trait"/>` : "").join("")}
${chutesSvg}${manquesSvg}${fissuresSvg}${maintenant}</svg>`;

  const carte = el("section", { class: "carte carte-courbe" });
  const bascule = D.termine ? null : el("div", { class: "bascule", role: "group", "aria-label": "Échelle de la courbe" },
    ...[["zoom", "Zoom"], ["tout", "6 mois"]].map(([v, txt]) => el("button", {
      "aria-pressed": vueCourbe === v ? "true" : "false",
      onclick: () => { if (vueCourbe === v) return; vueCourbe = v; carte.replaceWith(carteCourbe(D)); },
    }, txt)));
  carte.append(
    el("div", { class: "courbe-tete" },
      el("div", {}, el("p", { class: "etiquette" }, "Ta courbe"), el("p", { class: "gros" }, D.serie, el("small", {}, D.serie > 1 ? "jours d'affilée" : "jour d'affilée"))),
      D.termine ? null : el("div", { class: "possible" }, el("p", { class: "etiquette" }, "Encore possible"), el("p", {}, el("b", {}, D.possible), " / 180"))),
    el("div", { class: "courbe-svg", html: svg }),
    el("div", { class: "legende-courbe" },
      el("span", {}, el("i", { class: "l-trait" }), "ta série"),
      el("span", {}, el("i", { class: "l-ideal" }), "parcours parfait"),
      D.termine ? null : el("span", {}, el("i", { class: "l-fantome" }), "si tu ne casses plus"),
      el("span", {}, el("i", { class: "l-fissure" }), "cassure")),
    bascule);
  return carte;
}

function carteMur(D) {
  const etats = new Map(D.points.map((p) => [p.i, p.etat]));
  const jalons = new Set(JALONS.map((j) => j.j - 1));
  const cases = [];
  for (let i = 0; i < DUREE_DEFI; i++) {
    const etat = etats.get(i) || "futur";
    const k = decaler(D.debut, i);
    cases.push(el("button", {
      class: `brique ${etat}${jalons.has(i) ? " jalon" : ""}`,
      "aria-label": `Jour ${i + 1}, ${fmtJourMois.format(dateDe(k))} : ${etat === "parfait" ? "parfait" : etat === "casse" ? "cassé" : etat === "encours" ? "en cours" : "à venir"}`,
      disabled: etat === "futur",
      onclick: () => { jourVu = k; allerA("jour"); },
    }));
  }
  return el("section", { class: "carte" },
    el("div", { class: "carte-tete" }, el("h2", {}, "Le mur des 180 jours"), el("span", { class: "doux-petit" }, `${D.parfaits} / 180`)),
    el("div", { class: "mur" }, ...cases),
    el("p", { class: "aide gauche" }, "Une brique par jour, remplie quand la journée est parfaite. Touche une brique pour revoir ce jour."));
}

function carteJalons(D) {
  return el("section", { class: "carte" },
    el("div", { class: "carte-tete" }, el("h2", {}, "Jalons"), el("span", { class: "doux-petit" }, `${JALONS.filter((j) => D.faits >= j.j).length} / ${JALONS.length}`)),
    el("div", { class: "jalons" }, ...JALONS.map((j) => {
      const ok = D.faits >= j.j;
      const prochain = !ok && JALONS.find((x) => D.faits < x.j) === j;
      const pct = Math.min(1, D.faits / j.j);
      return el("div", { class: "jalon" + (ok ? " ok" : "") + (prochain ? " prochain" : ""), title: j.nom },
        el("span", { class: "jalon-rond", style: `--p:${(pct * 100).toFixed(1)}%`, html: ico(ok ? "coche" : "drapeau") }),
        el("b", {}, `J${j.j}`),
        el("small", {}, ok ? "atteint" : prochain ? `dans ${j.j - D.faits} j` : "\u00a0"));
    })),
    el("p", { class: "aide gauche" }, (() => {
      const pr = JALONS.find((x) => D.faits < x.j);
      return pr ? `Prochain jalon : ${pr.nom.toLowerCase()}, dans ${pluriel(pr.j - D.faits, "jour")}.` : "Tous les jalons sont atteints.";
    })()));
}

function carteProgramme() {
  const t = aujourdhui();
  return el("section", { class: "carte" },
    el("div", { class: "carte-tete" }, el("h2", {}, "Ton programme"), el("span", { class: "doux-petit" }, pluriel(EXERCICES.length, "exercice"))),
    el("div", { class: "prog-liste" }, ...EXERCICES.map((e) => el("button", { class: "prog-ligne", onclick: () => ouvrirFiche(e.id) },
      el("span", { class: "tuile-ico", html: ico(e.icone) }),
      el("span", { class: "prog-txt" }, el("b", {}, e.nom), el("small", {}, joursTexte(planDu(t)[e.id]))),
      el("span", { class: "prog-presc" }, e.presc)))));
}

function carteRegles() {
  const regle = (icone, texte) => el("p", {}, el("span", { html: ico(icone) }), texte);
  return el("section", { class: "carte regles" },
    el("h2", {}, "Les règles"),
    regle("check", "Une journée est parfaite quand tout le programme du jour est coché."),
    regle("courbe", "Chaque journée parfaite fait monter ta courbe d'un cran."),
    regle("eclair", "Un exercice oublié casse la courbe : ta série repart de zéro, mais le défi continue jusqu'au jour 180."),
    regle("etoile", "À l'arrivée, une note de S à D selon ta part de journées parfaites."));
}

function pacte() {
  const b = el("button", { class: "signer" }, el("span", { class: "signer-rempli" }), el("span", { class: "signer-txt" }, "Maintiens pour signer"));
  let debut = null, raf = null;
  const DUREE = 1600;
  const maj = () => {
    const p = Math.min(1, (performance.now() - debut) / DUREE);
    b.style.setProperty("--p", p.toFixed(3));
    if (p >= 1) { debut = null; b.classList.remove("appui"); signerDefi(); return; }
    raf = requestAnimationFrame(maj);
  };
  const go = (ev) => {
    if (ev.button > 0) return;
    ev.preventDefault();
    Sons.debloquer();
    debut = performance.now();
    b.classList.add("appui");
    vibrer();
    raf = requestAnimationFrame(maj);
  };
  const stop = () => {
    if (debut == null) return;
    cancelAnimationFrame(raf);
    debut = null;
    b.classList.remove("appui");
    b.style.setProperty("--p", 0);
  };
  b.addEventListener("pointerdown", go);
  ["pointerup", "pointerleave", "pointercancel"].forEach((t) => b.addEventListener(t, stop));
  b.addEventListener("contextmenu", (e) => e.preventDefault());
  b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); signerDefi(); } });

  const passes = donnees.defisPasses.length
    ? el("p", { class: "aide" }, `Défis précédents : ${donnees.defisPasses.map((d) => `${d.parfaits} journées parfaites (meilleure série : ${d.record})`).join(" · ")}`) : null;
  const regle = (icone, texte) => el("p", {}, el("span", { html: ico(icone) }), texte);
  return [
    el("header", { class: "tete" }, el("p", { class: "sur-titre" }, "Le défi"), el("h1", {}, "180 jours")),
    el("section", { class: "pacte" },
      el("span", { class: "pastille-lavande" }, "Défi 6 mois"),
      el("div", { class: "pacte-chiffre", "aria-hidden": "true" }, "180"),
      el("p", { class: "pacte-sous" }, "jours pour sculpter ton visage"),
      el("div", { class: "pacte-regles" },
        regle("courbe", "Chaque journée parfaite fait monter ta courbe."),
        regle("eclair", "Un seul exercice oublié, et elle se casse."),
        regle("drapeau", "Des jalons tout au long du chemin, et une note à l'arrivée."),
        regle("calendrier", `Arrivée le ${fmtDate.format(dateDe(decaler(aujourdhui(), DUREE_DEFI - 1)))}.`)),
      el("p", { class: "serment" }, "« Je m'engage à suivre mon programme chaque jour, pendant 180 jours. »"),
      b,
      el("p", { class: "aide" }, "Le défi commence aujourd'hui (jour 1).")),
    carteProgramme(),
    passes,
  ].filter(Boolean);
}

function signerDefi() {
  if (donnees.defi) return;
  donnees.defi = { debut: aujourdhui(), signe: new Date().toISOString() };
  donnees.vu.jalon = 0;
  sauver();
  const evts = actualiser();
  file.unshift({ type: "signe" });
  file.push(...evts);
  rendre();
  montrerFetes();
}

function archiverDefi() {
  const D = A.defi;
  if (!D) return;
  donnees.defisPasses.push({ debut: D.debut, fin: D.termine ? D.fin : decaler(aujourdhui(), -1), parfaits: D.parfaits, record: D.record, cassures: D.cassures.length, note: D.termine ? D.note : null });
  donnees.defi = null;
  donnees.vu.jalon = 0;
  sauver();
  actualiser();
  rendre();
}
function recommencerDefi() {
  if (!confirm("Recommencer le défi à zéro ?\n\nLa courbe actuelle est archivée et un nouveau défi de 180 jours pourra commencer. Tes exercices cochés restent.")) return;
  archiverDefi();
  toast("Défi archivé. Signe le nouveau quand tu es prêt.");
}

/* =========================================================
   Onglet « Lifestyle » : les fun facts
   ========================================================= */

const sectionsOuvertes = new Set();
function rendreLifestyle() {
  const v = $("vue-lifestyle");
  let i = factDuJour(aujourdhui());
  const zone = el("div", { class: "fact" });
  const montrer = () => {
    const f = FAITS[i];
    zone.replaceChildren(
      el("p", { class: "fact-sec" }, el("span", { html: ico(f.sec.icone) }), f.groupe ? `${f.sec.nom} · ${f.groupe}` : f.sec.nom),
      el("h2", {}, f.titre),
      el("p", { class: "fact-texte" }, f.texte));
  };
  montrer();
  const duJour = el("section", { class: "heros heros-fact" },
    el("span", { class: "pastille-lavande" }, "Fun fact du jour"),
    zone,
    el("button", { class: "bouton-second", onclick: () => { i = (i + 1 + Math.floor(Math.random() * (FAITS.length - 1))) % FAITS.length; montrer(); rejouer(zone, "entree"); } },
      el("span", { html: ico("encore") }), "Un autre"));

  v.replaceChildren(
    el("header", { class: "tete" }, el("p", { class: "sur-titre" }, "Les fun facts de la méthode"), el("h1", {}, "Lifestyle")),
    duJour,
    ...FUN_FACTS.map((s) => {
      let groupe = null;
      const det = el("details", { class: "carte ff-sec", open: sectionsOuvertes.has(s.id) },
        el("summary", { class: "ff-tete" },
          el("span", { class: "tuile-ico", html: ico(s.icone) }),
          el("span", { class: "ff-titre" }, el("b", {}, s.nom), el("small", {}, pluriel(s.faits.length, "fun fact"))),
          el("span", { class: "ff-chevron", html: ico("chevron") })),
        el("p", { class: "ff-intro" }, s.intro),
        ...s.faits.flatMap((f) => {
          const titreGroupe = f.groupe && f.groupe !== groupe ? el("p", { class: "ff-groupe" }, (groupe = f.groupe)) : null;
          return [titreGroupe, el("div", { class: "ff" }, el("b", {}, f.titre), el("p", {}, f.texte))];
        }));
      det.addEventListener("toggle", () => { if (det.open) sectionsOuvertes.add(s.id); else sectionsOuvertes.delete(s.id); });
      return det;
    }),
    el("p", { class: "aide" }, "Les fun facts ne comptent pas pour le défi : seuls les 5 exercices font monter la courbe."),
  );
}

/* =========================================================
   Onglet « Progrès »
   ========================================================= */

let moisVu = aujourdhui().slice(0, 7);

function rendreProgres() {
  $("vue-progres").replaceChildren(
    el("header", { class: "tete" }, el("p", { class: "sur-titre" }, "Ta transformation"), el("h1", {}, "Progrès")),
    el("div", { class: "tuiles" },
      tuile("flamme", A.serie, A.serie > 1 ? "jours de série" : "jour de série"),
      tuile("sommet", A.record, "meilleure série"),
      tuile("check", A.parfaits, A.parfaits > 1 ? "journées parfaites" : "journée parfaite"),
      tuile("coche", A.coches, A.coches > 1 ? "exercices cochés" : "exercice coché")),
    carteCalendrier(),
    carteExercices(),
    carteReglages(),
  );
}

function carteCalendrier() {
  const [a, m] = moisVu.split("-").map(Number);
  const premier = new Date(a, m - 1, 1);
  const nbJours = new Date(a, m, 0).getDate();
  const decal = (premier.getDay() + 6) % 7;
  const t = aujourdhui();
  const cases = [];
  for (let i = 0; i < decal; i++) cases.push(el("span", { class: "cal-vide" }));
  let parfaitsMois = 0;
  for (let j = 1; j <= nbJours; j++) {
    const k = `${a}-${deux(m)}-${deux(j)}`;
    const J = A.J[k];
    let classe = "cal-jour";
    if (k > t) classe += " futur";
    else if (J && J.dus) {
      if (J.parfait) { classe += " parfait"; parfaitsMois++; }
      else if (k < t) classe += J.faits ? " partiel" : " rate";
    }
    if (k === t) classe += " auj";
    if (k === jourVu && k !== t) classe += " vu";
    cases.push(el("button", {
      class: classe, disabled: k > t,
      "aria-label": `${fmtLong.format(dateDe(k))}${J?.parfait ? ", parfait" : ""}`,
      onclick: () => { jourVu = k; allerA("jour"); if (k !== t) toast(`Tu corriges ${fmtLong.format(dateDe(k))}`, { icone: "✎" }); },
    }, j));
  }
  const moisCle = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}`;
  return el("section", { class: "carte" },
    el("div", { class: "carte-tete" },
      el("h2", {}, "Calendrier"),
      el("div", { class: "nav-mois" },
        el("button", { class: "rond", "aria-label": "Mois précédent", html: ico("retour"), onclick: () => { moisVu = moisCle(new Date(a, m - 2, 1)); rendreProgres(); } }),
        el("span", {}, majuscule(fmtMois.format(premier))),
        el("button", { class: "rond", "aria-label": "Mois suivant", html: ico("chevron"), disabled: moisVu >= t.slice(0, 7), onclick: () => { moisVu = moisCle(new Date(a, m, 1)); rendreProgres(); } }))),
    el("div", { class: "cal-semaine", "aria-hidden": "true" }, ..."LMMJVSD".split("").map((x) => el("span", {}, x))),
    el("div", { class: "cal" }, ...cases),
    el("p", { class: "aide gauche" }, `${pluriel(parfaitsMois, "journée parfaite", "journées parfaites")} ce mois-ci. Touche un jour pour le revoir ou le corriger.`));
}

function carteExercices() {
  return el("section", { class: "carte" },
    el("div", { class: "carte-tete" }, el("h2", {}, "Exercices"), el("span", { class: "doux-petit" }, "depuis le début")),
    el("div", { class: "prog-liste" }, ...EXERCICES.map((e) => {
      const n = A.seances[e.id];
      return el("button", { class: "prog-ligne", onclick: () => ouvrirFiche(e.id) },
        el("span", { class: "tuile-ico", html: ico(e.icone) }),
        el("span", { class: "prog-txt" }, el("b", {}, e.nom), el("small", {}, totalTexte(e, n))),
        el("span", { class: "prog-presc" }, pluriel(n, "séance")));
    })));
}

function carteReglages() {
  const sons = el("button", { class: "reglage", role: "switch", "aria-checked": donnees.reglages.sons ? "true" : "false" },
    el("span", { class: "tuile-ico", html: ico("son") }),
    el("span", { class: "reglage-txt" }, el("b", {}, "Sons et vibrations"), el("small", {}, "Le bouton silencieux de l'iPhone coupe aussi les sons")),
    el("span", { class: "interrupteur" }));
  sons.addEventListener("click", () => {
    donnees.reglages.sons = !donnees.reglages.sons;
    Sons.regler(donnees.reglages.sons);
    sauver();
    sons.setAttribute("aria-checked", donnees.reglages.sons ? "true" : "false");
    if (donnees.reglages.sons) { Sons.coche(2); vibrer(); }
  });
  const champ = el("input", { class: "champ", type: "text", value: donnees.reglages.prenom, maxlength: "24", placeholder: "Facultatif", autocomplete: "given-name", "aria-label": "Ton prénom" });
  champ.addEventListener("change", () => { donnees.reglages.prenom = champ.value.trim().slice(0, 24); sauver(); toast("Prénom enregistré"); });
  const lien = (icone, titre, texte, action) => el("button", { class: "reglage", onclick: action },
    el("span", { class: "tuile-ico", html: ico(icone) }),
    el("span", { class: "reglage-txt" }, el("b", {}, titre), el("small", {}, texte)),
    el("span", { class: "chevron", html: ico("chevron") }));
  return el("section", { class: "carte" },
    el("div", { class: "carte-tete" }, el("h2", {}, "Réglages")),
    el("div", { class: "reglages" },
      el("label", { class: "reglage" },
        el("span", { class: "tuile-ico", html: ico("personne") }),
        el("span", { class: "reglage-txt" }, el("b", {}, "Ton prénom"), el("small", {}, "Pour le bonjour de l'accueil")),
        champ),
      sons,
      lien("nuage", "Sauvegarde GitHub", "Envoi automatique vers ton dépôt privé", () => window.Sauvegarde?.ouvrir()),
      lien("exporter", "Exporter", "Un fichier .json de toutes tes données", () => window.Sauvegarde?.exporterFichier()),
      lien("importer", "Importer", "Recharger un fichier exporté", () => $("fichier").click())),
    el("p", { class: "aide gauche" }, "Tes données restent sur ce téléphone. Pense à la sauvegarde GitHub ou à exporter de temps en temps."));
}

async function importer(fichier) {
  try {
    const texte = await fichier.text();
    const brut = JSON.parse(texte);
    const d = brut && brut.donnees && (brut.app === "maxilla" || brut.cle === CLE) ? brut.donnees : brut;
    if (!valide(d)) throw new Error("format");
    const n = Object.keys(d.jours).length;
    if (!confirm(`Remplacer les données de Maxilla par ce fichier (${pluriel(n, "jour")}) ?\n\nUne copie des données actuelles est gardée sur ce téléphone.`)) return;
    try { localStorage.setItem(CLE + ".avant-import", JSON.stringify({ date: new Date().toISOString(), donnees })); } catch (e) {
      alert("Impossible de garder une copie des données actuelles : import annulé."); return;
    }
    donnees = completer(d);
    sauver();
    actualiser();
    rendre();
    toast("Données importées");
  } catch (e) {
    toast("Ce fichier n'est pas une sauvegarde Maxilla", { rouge: true, icone: "!" });
  }
}

/* =========================================================
   Navigation et démarrage
   ========================================================= */

function rendre() {
  if (vue === "jour") rendreJour();
  else if (vue === "defi") rendreDefi();
  else if (vue === "lifestyle") rendreLifestyle();
  else if (vue === "progres") rendreProgres();
}

function allerA(nom) {
  if (nom === "progres" && vue !== "progres") moisVu = jourVu.slice(0, 7);
  vue = nom;
  for (const v of document.querySelectorAll(".vue")) {
    const actif = v.id === "vue-" + nom;
    v.hidden = !actif;
    v.classList.toggle("active", actif);
  }
  for (const b of document.querySelectorAll(".onglets button")) {
    const actif = b.dataset.vue === nom;
    b.classList.toggle("actif", actif);
    if (actif) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  }
  rendre();
  window.scrollTo(0, 0);
  rejouer(document.querySelector(".vue.active"), "entree");
}

function nouveauJour() {
  const t = aujourdhui();
  if (A && A.t !== t) {
    if (jourVu === A.t) jourVu = t;
    const evts = actualiser();
    verifierCasse();
    file.push(...evts);
    rendreBandeau();
    rendre();
    montrerFetes();
  }
}

function demarrer() {
  Sons.regler(donnees.reglages.sons);
  const evts = actualiser();
  verifierCasse();
  file.push(...evts);
  rendreBandeau();
  rendre();
  setTimeout(montrerFetes, 600);

  $("jour-prec").addEventListener("click", () => { jourVu = decaler(jourVu, -1); rendre(); });
  $("jour-suiv").addEventListener("click", () => { if (jourVu < aujourdhui()) { jourVu = decaler(jourVu, 1); rendre(); } });
  $("titre-jour").addEventListener("click", () => { jourVu = aujourdhui(); rendre(); });
  $("bouton-fact").addEventListener("click", () => { Sons.debloquer(); ouvrirFact(); });
  $("bandeau").addEventListener("click", () => allerA("lifestyle"));
  for (const b of document.querySelectorAll(".onglets button")) b.addEventListener("click", () => { Sons.debloquer(); if (b.dataset.vue !== vue) allerA(b.dataset.vue); else window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("feuille").addEventListener("click", (e) => { if (e.target.closest("[data-fermer]")) fermerFeuille(); });
  $("fichier").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importer(f); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("feuille").hidden) fermerFeuille(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) nouveauJour(); });
  setInterval(nouveauJour, 60000);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

demarrer();
