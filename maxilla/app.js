"use strict";

/* =========================================================
   Maxilla : le programme glow-up.
   Les données restent sur le téléphone (localStorage « maxilla.v1»).
   Tout le reste (XP, niveaux, séries, courbe du défi) est recalculé
   à partir des cases cochées : rien ne peut se désynchroniser.
   ========================================================= */

const CLE = "maxilla.v1";
const DUREE_DEFI = 180;
const JALONS = [
  { j: 7, emoji: "🔥" }, { j: 30, emoji: "🥉" }, { j: 60, emoji: "🗿" }, { j: 90, emoji: "🥈" },
  { j: 120, emoji: "💎" }, { j: 150, emoji: "👑" }, { j: 180, emoji: "🥇" },
];
const XP_SECTION = 20, XP_PARFAIT = 50, XP_LS = 5, XP_LS_MOMENT = 3, XP_LS_TOUT = 25, XP_LINGE = 15;

const $ = (id) => document.getElementById(id);
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EX = Object.fromEntries(EXERCICES.map((e) => [e.id, e]));
const SEC = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
const LS_ITEMS = LIFESTYLE.flatMap((s) => s.items.map((it) => ({ ...it, sec: s })));
const LS_QUOTIDIENS = LS_ITEMS.filter((it) => it.type === "jour" || it.type === "double");
const TEXTE_RANG = { argile: "#fff", pierre: "#fff", bronze: "#fff", argent: "#334155", or: "#5a3700", marbre: "#4a4d5a", diamant: "#0b3a7a", apollon: "#3b2400" };
const nombre = new Intl.NumberFormat("fr-FR");
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const clone = (o) => JSON.parse(JSON.stringify(o));
const pluriel = (n, mot, mots = mot + "s") => `${nombre.format(n)} ${n > 1 ? mots : mot}`;
const virgule = (x) => x.toFixed(2).replace(".", ",");

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
const lundiDe = (k) => decaler(k, -((jourSem(k) + 6) % 7));
const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fmtJourMois = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const JOURS_NOMS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const JOURS_ABR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const ORDRE_SEMAINE = [1, 2, 3, 4, 5, 6, 0];

function nomDuJour(k) {
  const t = aujourdhui();
  if (k === t) return "Aujourd'hui";
  if (k === decaler(t, -1)) return "Hier";
  return majuscule(fmtCourt.format(dateDe(k)));
}

/* =========================================================
   Données
   ========================================================= */

const planDefaut = () => Object.fromEntries(EXERCICES.map((e) => [e.id, [...e.jours]]));
function neuf() {
  return {
    version: 1,
    jours: {},                                   // "AAAA-MM-JJ" → { ex: [ids], ls: [ids], coffre: {rarete, xp} }
    programme: [{ depuis: "2000-01-01", plan: planDefaut() }], // jours de chaque exercice, avec historique
    defi: null,                                  // { debut, signe }
    defisPasses: [],
    trophees: {},                                // id → jour débloqué
    records: {},                                 // id → secondes (exercices « jusqu'à la brûlure »)
    compteurs: { guidees: 0 },
    reglages: { sons: true },
    vu: { niveau: 1, casse: null },
  };
}
const objet = (o) => (o && typeof o === "object" && !Array.isArray(o) ? o : {});
function valide(d) {
  return !!d && typeof d === "object" && !Array.isArray(d) && !!d.jours && typeof d.jours === "object" && !Array.isArray(d.jours);
}
function completer(d) {
  const n = neuf();
  if (!Array.isArray(d.programme) || !d.programme.length || !d.programme.every((p) => p && p.depuis && p.plan)) d.programme = n.programme;
  d.programme.sort((a, b) => (a.depuis < b.depuis ? -1 : a.depuis > b.depuis ? 1 : 0));
  for (const p of d.programme) for (const e of EXERCICES) if (!Array.isArray(p.plan[e.id])) p.plan[e.id] = [...e.jours];
  if (!d.defi || typeof d.defi !== "object" || !/^20\d\d-\d\d-\d\d$/.test(d.defi.debut || "")) d.defi = null;
  if (!Array.isArray(d.defisPasses)) d.defisPasses = [];
  d.trophees = objet(d.trophees);
  d.records = objet(d.records);
  d.compteurs = { ...n.compteurs, ...objet(d.compteurs) };
  d.reglages = { ...n.reglages, ...objet(d.reglages) };
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
    j.ls = Array.isArray(j.ls) ? j.ls : [];
    d.jours[k] = j;
  }
  d.version = 1;
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
    toast("Impossible d'enregistrer", { couleur: "var(--rouge)", icone: "!" });
  }
}
function jourEcrit(k) {
  if (!donnees.jours[k]) donnees.jours[k] = { ex: [], ls: [] };
  return donnees.jours[k];
}
function nettoyer(k) {
  const d = donnees.jours[k];
  if (d && !d.ex.length && !d.ls.length && !d.coffre) delete donnees.jours[k];
}

/* =========================================================
   Programme : quels exercices tombent quel jour
   ========================================================= */

function planDu(k) {
  let p = donnees.programme[0].plan;
  for (const e of donnees.programme) { if (e.depuis <= k) p = e.plan; else break; }
  return p;
}
const estDu = (e, k) => (planDu(k)[e.id] || []).includes(jourSem(k));
const dus = (k) => EXERCICES.filter((e) => estDu(e, k));
const fait = (id, k) => !!donnees.jours[k]?.ex.includes(id);

function changerJours(id, jours) {
  const t = aujourdhui();
  const dernier = donnees.programme[donnees.programme.length - 1];
  let entree = dernier;
  if (dernier.depuis !== t) {
    entree = { depuis: t, plan: clone(dernier.plan) };
    donnees.programme.push(entree);
    donnees.programme.sort((a, b) => (a.depuis < b.depuis ? -1 : 1));
  }
  entree.plan[id] = ORDRE_SEMAINE.filter((j) => jours.includes(j));
  sauver();
}

function frequenceTexte(jours) {
  if (!jours.length) return "Hors programme";
  if (jours.length === 7) return "Chaque jour";
  return `${jours.length}× / semaine · ${ORDRE_SEMAINE.filter((j) => jours.includes(j)).map((j) => JOURS_ABR[j]).join(" ")}`;
}
function prochain(e, k) {
  for (let i = 1; i <= 7; i++) {
    const d = decaler(k, i);
    if (estDu(e, d)) return i === 1 ? "demain" : JOURS_NOMS[jourSem(d)];
  }
  return "aucun jour prévu";
}

function seancesDe(id) {
  let n = 0;
  for (const k in donnees.jours) if (donnees.jours[k].ex.includes(id)) n++;
  return n;
}
function palierDe(e, n = seancesDe(e.id)) {
  if (!e.paliers) return null;
  let i = 0;
  e.paliers.forEach((q, j) => { if (n >= q.des) i = j; });
  return { ...e.paliers[i], index: i, suivant: e.paliers[i + 1] || null, seances: n };
}
const prescription = (e) => (e.paliers ? palierDe(e).texte : e.presc);

// Série d'un exercice : séances prévues d'affilée faites. Un jour pas encore fait ne casse pas la série.
function serieEx(e, jusqua = aujourdhui()) {
  let n = 0;
  const debut = A ? A.debut : jusqua;
  for (let k = jusqua; k >= debut; k = decaler(k, -1)) {
    if (!estDu(e, k)) continue;
    if (fait(e.id, k)) n++;
    else if (k !== jusqua) break;
  }
  return n;
}
function recordEx(e) {
  let n = 0, max = 0;
  if (!A) return 0;
  for (let k = A.debut; k <= A.t; k = decaler(k, 1)) {
    if (!estDu(e, k)) continue;
    if (fait(e.id, k)) { n++; max = Math.max(max, n); } else if (k !== A.t) n = 0;
  }
  return max;
}

/* =========================================================
   Lifestyle
   ========================================================= */

function lsFait(it, k) {
  const d = donnees.jours[k];
  if (!d) return false;
  if (it.type === "double") return it.moments.every((m) => d.ls.includes(`${it.id}.${m}`));
  return d.ls.includes(it.id);
}
function lingeSemaine(k) {
  const t = aujourdhui();
  for (let j = lundiDe(k), i = 0; i < 7; i++, j = decaler(j, 1)) {
    if (j > t) break;
    if (donnees.jours[j]?.ls.includes("linge")) return j;
  }
  return null;
}
function xpLifestyle(k) {
  const d = donnees.jours[k];
  if (!d || !d.ls.length) return 0;
  let xp = 0, tous = true;
  for (const it of LS_QUOTIDIENS) {
    if (it.type === "jour") { if (d.ls.includes(it.id)) xp += XP_LS; else tous = false; }
    else for (const m of it.moments) { if (d.ls.includes(`${it.id}.${m}`)) xp += XP_LS_MOMENT; else tous = false; }
  }
  if (d.ls.includes("linge")) xp += XP_LINGE;
  if (tous) xp += XP_LS_TOUT;
  return xp;
}

/* =========================================================
   Analyse : XP, niveau, séries, défi (tout est recalculé)
   ========================================================= */

const coutNiveau = (n) => 100 + 50 * (n - 1);
function niveauDe(xp) {
  let n = 1, reste = xp;
  while (reste >= coutNiveau(n)) { reste -= coutNiveau(n); n++; }
  return { n, reste, cout: coutNiveau(n), pct: reste / coutNiveau(n) };
}
const xpPourNiveau = (n) => { let s = 0; for (let i = 1; i < n; i++) s += coutNiveau(i); return s; };
const rangDe = (n) => { let r = RANGS[0]; for (const x of RANGS) if (n >= x.des) r = x; return r; };
const multiplicateur = (chaine) => 1 + Math.min(chaine, 30) * 0.02;

let A = null;
function analyser() {
  const t = aujourdhui();
  const cles = Object.keys(donnees.jours).sort();
  let debut = cles.length ? cles[0] : t;
  if (donnees.defi && donnees.defi.debut < debut) debut = donnees.defi.debut;
  if (debut > t) debut = t;

  const J = {};
  let chaine = 0, record = 0, xp = 0, parfaits = 0, coches = 0, legendaires = 0, phenix = 0, casse = false, derniereCasse = null;
  const seances = Object.fromEntries(EXERCICES.map((e) => [e.id, 0]));
  const lsChaine = {}, lsRecord = {};
  for (const it of LS_QUOTIDIENS) { lsChaine[it.id] = 0; lsRecord[it.id] = 0; }

  for (let k = debut; k <= t; k = decaler(k, 1)) {
    const d = donnees.jours[k];
    const ex = d ? d.ex : [];
    const du = dus(k);
    const nbFaits = du.reduce((n, e) => n + (ex.includes(e.id) ? 1 : 0), 0);
    const parfait = du.length > 0 && nbFaits === du.length;
    const chaineAvant = chaine;
    const mult = multiplicateur(chaine);
    let base = 0;
    for (const id of ex) if (EX[id]) { base += EX[id].xp; seances[id]++; coches++; }
    let bonus = 0;
    for (const s of SECTIONS) {
      const ds = du.filter((e) => e.section === s.id);
      if (ds.length && ds.every((e) => ex.includes(e.id))) bonus += XP_SECTION;
    }
    if (parfait) bonus += XP_PARFAIT;
    const xpJour = Math.round((base + bonus) * mult) + xpLifestyle(k) + (d?.coffre?.xp || 0);
    if (d?.coffre?.rarete === "legendaire") legendaires++;
    xp += xpJour;

    if (parfait) { chaine++; parfaits++; if (casse) phenix = Math.max(phenix, chaine); }
    else if (k !== t) { if (chaine > 0) { casse = true; derniereCasse = { k, avant: chaine }; } chaine = 0; }
    record = Math.max(record, chaine);

    for (const it of LS_QUOTIDIENS) {
      if (lsFait(it, k)) { lsChaine[it.id]++; lsRecord[it.id] = Math.max(lsRecord[it.id], lsChaine[it.id]); }
      else if (k !== t) lsChaine[it.id] = 0;
    }
    J[k] = { parfait, dus: du.length, faits: nbFaits, chaine, chaineAvant, xp: xpJour, mult };
  }
  for (const tr of TROPHEES) if (donnees.trophees[tr.id]) xp += tr.xp;

  const res = { t, debut, J, serie: chaine, record, xp, parfaits, coches, legendaires, phenix, seances, lsChaine, lsRecord, derniereCasse };
  res.niv = niveauDe(xp);
  res.rang = rangDe(res.niv.n);
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

function statsTrophees(R) {
  return {
    coches: R.coches, parfaits: R.parfaits, record: R.record, phenix: R.phenix, legendaires: R.legendaires,
    defiSigne: !!(donnees.defi || donnees.defisPasses.length), defiJour: R.defi ? R.defi.faits : 0,
    seances: R.seances, guidees: donnees.compteurs.guidees, lsRecord: R.lsRecord, niveau: R.niv.n,
  };
}

// Recalcule tout, débloque les trophées et repère les montées de niveau.
// Renvoie les célébrations à afficher.
function actualiser() {
  A = analyser();
  const evts = [];
  for (let tour = 0; tour < 4; tour++) {
    const s = statsTrophees(A);
    const nouveaux = TROPHEES.filter((tr) => !donnees.trophees[tr.id] && tr.p(s)[0] >= tr.p(s)[1]);
    if (!nouveaux.length) break;
    for (const tr of nouveaux) { donnees.trophees[tr.id] = A.t; evts.push({ type: "trophee", tr }); }
    sauver();
    A = analyser();
  }
  if (A.niv.n > donnees.vu.niveau) {
    const ancien = rangDe(donnees.vu.niveau);
    donnees.vu.niveau = A.niv.n;
    sauver();
    evts.unshift({ type: "niveau", n: A.niv.n, nouveauRang: ancien.id !== A.rang.id ? A.rang : null });
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

const SVG_COCHE = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const SVG_CHEVRON = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
const SVG_JOUER = '<svg viewBox="0 0 24 24"><path class="plein" d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z"/></svg>';
const SVG_PRECEDENT = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';

function rejouer(elm, classe) {
  if (!elm) return;
  elm.classList.remove(classe);
  void elm.offsetWidth;
  elm.classList.add(classe);
  elm.addEventListener("animationend", () => elm.classList.remove(classe), { once: true });
}

const COULEURS_FETE = ["#ffffff", "#b59cff", "#5ff0ff", "#ffcf4a", "#ff7ab6", "#7cffc4"];
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
function etincelles(depuis, couleur) {
  if (reduit || !depuis) return;
  const r = depuis.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 10; i++) {
    const c = el("i", { class: "etincelle", style: `background:${i % 2 ? couleur : "#fff"}` });
    document.body.append(c);
    const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4, d = 22 + Math.random() * 18;
    c.animate([
      { transform: `translate(${cx}px, ${cy}px) scale(1)`, opacity: 1 },
      { transform: `translate(${cx + Math.cos(ang) * d}px, ${cy + Math.sin(ang) * d}px) scale(.2)`, opacity: 0 },
    ], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }).finished.then(() => c.remove());
  }
}
function flotterXP(depuis, xp, couleur = "var(--or)") {
  if (!depuis || !xp) return;
  const r = depuis.getBoundingClientRect();
  const f = el("span", { class: "xp-flottant", style: `left:${r.right - 70}px; top:${r.top + r.height / 2 - 12}px; color:${couleur}` }, `+${xp} XP`);
  document.body.append(f);
  f.animate([
    { transform: "translateY(6px) scale(.7)", opacity: 0 },
    { transform: "translateY(-8px) scale(1.08)", opacity: 1, offset: 0.25 },
    { transform: "translateY(-46px) scale(1)", opacity: 0 },
  ], { duration: reduit ? 900 : 1200, easing: "cubic-bezier(.2,.8,.2,1)" }).finished.then(() => f.remove());
}

let minuteurToast;
function toast(texte, { couleur = "var(--violet)", icone = "✓", action, surAction } = {}) {
  const t = $("toast");
  t.replaceChildren(
    el("span", { class: "ok", style: `background:${couleur}` }, icone),
    el("span", { class: "txt" }, texte),
    action ? el("button", { onclick: () => { t.classList.remove("visible"); surAction(); } }, action) : "",
  );
  t.classList.add("visible");
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove("visible"), action ? 4500 : 2400);
}

let compteurSvg = 0;
function emblemeSVG(r, niveau, { verrou = false } = {}) {
  const u = "e" + (++compteurSvg);
  const hex = (rad) => [0, 1, 2, 3, 4, 5].map((i) => { const a = (Math.PI / 3) * i - Math.PI / 2; return [50 + rad * Math.cos(a), 50 + rad * Math.sin(a)]; });
  const E = hex(46), I = hex(28);
  const pts = (P) => P.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(" ");
  const lum = [0.45, 0.2, -0.08, -0.36, -0.2, 0.18];
  const facettes = E.map((p, i) => {
    const q = E[(i + 1) % 6], b = I[(i + 1) % 6], a = I[i], v = lum[i];
    return `<polygon points="${pts([p, q, b, a])}" fill="${v > 0 ? "#fff" : "#000"}" fill-opacity="${Math.abs(v)}"/>`;
  }).join("");
  const veines = r.id === "marbre"
    ? `<path d="M24 34c10 6 14 18 26 22s20 14 26 12M34 70c6-4 12 0 18-4M58 30c4 6 2 10 8 14" fill="none" stroke="#7d808e" stroke-opacity=".55" stroke-width="1.1"/>` : "";
  const num = niveau != null
    ? `<text x="50" y="52" text-anchor="middle" dominant-baseline="central" class="emb-num" fill="${TEXTE_RANG[r.id]}" font-size="${String(niveau).length > 2 ? 21 : String(niveau).length > 1 ? 26 : 30}">${niveau}</text>` : "";
  return `<svg class="embleme rang-${r.id}${verrou ? " verrou" : ""}" viewBox="0 0 100 100" aria-hidden="true"><defs>
<linearGradient id="${u}a" x1=".15" y1="0" x2=".85" y2="1"><stop offset="0" stop-color="${r.c1}"/><stop offset=".5" stop-color="${r.c2}"/><stop offset="1" stop-color="${r.c3}"/></linearGradient>
<linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<polygon points="${pts(E)}" fill="url(#${u}a)"/>${facettes}
<polygon points="${pts(I)}" fill="url(#${u}a)"/><polygon points="${pts(I)}" fill="url(#${u}b)"/>${veines}
<polygon points="${pts(E)}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.3"/>
<polygon points="${pts(I)}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".8"/>${num}</svg>`;
}
function anneauSVG(pct, classe = "", r = 46) {
  const C = 2 * Math.PI * r;
  return `<svg class="anneau ${classe}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${r}" class="anneau-fond"/><circle cx="50" cy="50" r="${r}" class="anneau-arc" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - Math.max(0, Math.min(1, pct)))).toFixed(1)}"/></svg>`;
}

const COFFRE_SVG = `<svg viewBox="0 0 120 112" aria-hidden="true"><defs>
<linearGradient id="cf-bois" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a63ff"/><stop offset="1" stop-color="#3b1f95"/></linearGradient>
<linearGradient id="cf-or" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4b0"/><stop offset=".5" stop-color="#ffc21a"/><stop offset="1" stop-color="#c47a00"/></linearGradient>
<radialGradient id="cf-lueur"><stop offset="0" stop-color="#fff6c8"/><stop offset=".4" stop-color="#ffcf4a" stop-opacity=".7"/><stop offset="1" stop-color="#ffcf4a" stop-opacity="0"/></radialGradient></defs>
<ellipse class="cf-lueur" cx="60" cy="52" rx="56" ry="40" fill="url(#cf-lueur)"/>
<g class="cf-corps"><rect x="14" y="52" width="92" height="50" rx="9" fill="url(#cf-bois)"/>
<rect x="14" y="52" width="92" height="9" fill="url(#cf-or)"/><rect x="28" y="52" width="8" height="50" fill="url(#cf-or)"/><rect x="84" y="52" width="8" height="50" fill="url(#cf-or)"/>
<rect x="14" y="94" width="92" height="8" rx="4" fill="url(#cf-or)"/>
<rect x="51" y="58" width="18" height="22" rx="5" fill="url(#cf-or)"/><circle cx="60" cy="67" r="3" fill="#5a3500"/><rect x="58.8" y="68" width="2.4" height="7" rx="1" fill="#5a3500"/></g>
<g class="cf-couvercle"><path d="M14 54V40C14 24 32 12 60 12s46 12 46 28v14z" fill="url(#cf-bois)"/>
<path d="M14 54V46h92v8z" fill="url(#cf-or)"/><path d="M28 54V20.5c2.4-1.4 5-2.6 8-3.6V54zM84 54V16.9c3 1 5.6 2.2 8 3.6V54z" fill="url(#cf-or)"/>
<path d="M22 26c8-7 20-10 34-10.5" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/></g></svg>`;

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
   Onglet « Aujourd'hui »
   ========================================================= */

let jourVu = aujourdhui();
let vue = "jour";
let horsOuvert = false;

function rendreHeros() {
  const { niv, rang } = A;
  const mult = A.J[A.t] ? A.J[A.t].mult : 1;
  const h = $("heros");
  h.style.setProperty("--r1", rang.c1);
  h.style.setProperty("--r2", rang.c2);
  const D = A.defi;
  let defi;
  if (!D) {
    defi = el("button", { class: "heros-defi cta", onclick: () => allerA("defi") },
      el("span", { class: "hd-ico" }, "📈"),
      el("span", { class: "hd-txt" }, el("b", {}, "Lance ton défi 6 mois"), el("small", {}, "180 jours. Une courbe. Ne la casse pas.")),
      el("span", { class: "chevron", html: SVG_CHEVRON }));
  } else if (D.termine) {
    defi = el("button", { class: "heros-defi", onclick: () => allerA("defi") },
      el("span", { class: "hd-ico" }, "🏛️"),
      el("span", { class: "hd-txt" }, el("b", {}, `Défi terminé · note ${D.note}`), el("small", {}, `${D.parfaits} jours parfaits sur 180`)),
      el("span", { class: "chevron", html: SVG_CHEVRON }));
  } else {
    const barre = el("span", { class: "hd-barre" }, el("i", { style: `width:${(D.faits / DUREE_DEFI) * 100}%` }),
      ...D.cassures.map((c) => el("b", { style: `left:${((c.i + 0.5) / DUREE_DEFI) * 100}%` })));
    defi = el("button", { class: "heros-defi", onclick: () => allerA("defi") },
      el("span", { class: "hd-txt" },
        el("span", { class: "hd-ligne" }, el("b", {}, "Défi 6 mois"), el("span", { class: "hd-jour" }, "Jour ", el("b", {}, D.jour), " / 180")),
        barre),
      el("span", { class: "chevron", html: SVG_CHEVRON }));
  }
  h.replaceChildren(
    el("div", { class: "heros-haut" },
      el("button", { class: "heros-emb", onclick: () => allerA("progres"), "aria-label": `${rang.nom}, niveau ${niv.n}. Voir ta progression`, html: anneauSVG(niv.pct, "anneau-xp", 47) + emblemeSVG(rang, niv.n) }),
      el("div", { class: "heros-txt" },
        el("p", { class: "heros-rang" }, rang.nom),
        el("p", { class: "heros-niveau" }, "Niveau ", el("b", {}, niv.n)),
        el("div", { class: "xp", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": niv.cout, "aria-valuenow": niv.reste }, el("i", { style: `width:${(niv.pct * 100).toFixed(1)}%` })),
        el("p", { class: "xp-txt" }, el("span", {}, el("b", {}, nombre.format(niv.reste)), ` / ${nombre.format(niv.cout)} XP`),
          mult > 1 ? el("span", { class: "mult", title: "Bonus de série" }, `🔥 ×${virgule(mult)}`) : null),
      ),
    ),
    defi,
  );
}

function rendreBandeau() {
  const piste = $("bandeau-piste");
  const items = LS_ITEMS.map((it) => `${it.emoji} ${it.court}`);
  const bloc = () => el("span", { class: "bandeau-bloc" }, ...items.map((t) => el("span", { class: "bandeau-item" }, t)));
  piste.replaceChildren(bloc(), bloc());
  requestAnimationFrame(() => {
    const w = piste.firstChild.getBoundingClientRect().width;
    const duree = Math.max(40, w / 34);
    piste.style.animationDuration = `${duree}s`;
    piste.style.animationDelay = `${-(Math.random() * duree).toFixed(1)}s`;
  });
}

function ligneEx(e, k, { bonus = false } = {}) {
  const f = fait(e.id, k), s = serieEx(e, k), sec = SEC[e.section];
  return el("div", { class: "ligne" + (f ? " fait" : "") + (bonus ? " bonus" : ""), "data-id": e.id, style: `--c:${sec.couleur}` },
    el("button", {
      class: "ex", "aria-pressed": f ? "true" : "false", onclick: () => basculer(e.id, k),
      "aria-label": `${e.nom}${f ? ", fait" : ""}. ${bonus ? "Bonus" : prescription(e)}. Série : ${s}`,
    },
      el("span", { class: "coche", html: SVG_COCHE }),
      el("span", { class: "ex-emoji" }, e.emoji),
      el("span", { class: "ex-txt" }, el("b", {}, e.nom), el("small", {}, bonus ? `Prochaine : ${prochain(e, k)}` : prescription(e))),
      s ? el("span", { class: "ex-serie" + (f ? " chaude" : "") }, "🔥", el("span", {}, s)) : null,
    ),
    el("button", { class: "ex-info" + (e.coach ? " jouer" : ""), "aria-label": `${e.nom} : consignes${e.coach ? " et séance guidée" : ""}`, onclick: () => ouvrirFiche(e.id), html: e.coach ? SVG_JOUER : SVG_CHEVRON }),
  );
}

function sectionFaite(sid, k) {
  const ds = dus(k).filter((e) => e.section === sid);
  return ds.length > 0 && ds.every((e) => fait(e.id, k));
}

function rendreJour() {
  const t = A.t;
  if (jourVu > t) jourVu = t;
  $("date").textContent = majuscule(fmtLong.format(new Date()));
  $("serie-tete").textContent = A.serie;
  $("chip-serie").classList.toggle("eteint", A.serie === 0);
  $("chip-serie").classList.toggle("vif", !!A.J[t]?.parfait);
  $("chip-serie").setAttribute("aria-label", `Série : ${pluriel(A.serie, "jour parfait", "jours parfaits")} d'affilée`);
  rendreHeros();

  const titre = $("titre-jour");
  titre.textContent = nomDuJour(jourVu);
  titre.classList.toggle("passe", jourVu !== t);
  titre.setAttribute("aria-label", jourVu === t ? "Aujourd'hui" : `${fmtLong.format(dateDe(jourVu))}, revenir à aujourd'hui`);
  $("jour-suiv").disabled = jourVu === t;

  const du = dus(jourVu);
  const ex = donnees.jours[jourVu]?.ex || [];
  const n = du.filter((e) => ex.includes(e.id)).length;
  const parfait = du.length > 0 && n === du.length;
  $("compte-faits").textContent = n;
  $("compte-total").textContent = "/" + du.length;
  const seg = $("segments");
  seg.replaceChildren(...du.map((e) => el("i", { class: ex.includes(e.id) ? "on" : "", style: `--c:${SEC[e.section].couleur}` })));
  seg.classList.toggle("parfait", parfait);
  document.querySelector(".programme").classList.toggle("parfaite", parfait);

  const J = A.J[jourVu];
  let statut;
  if (!du.length) statut = "Repos : rien au programme ce jour-là.";
  else if (parfait) statut = jourVu === t ? "Journée parfaite ✨ La courbe monte." : "Journée parfaite ✨";
  else if (jourVu !== t) statut = `Il manque ${pluriel(du.length - n, "exercice")} : ce jour casse la série.`;
  else statut = `Encore ${pluriel(du.length - n, "exercice")} pour une journée parfaite`;
  const st = $("prog-statut");
  st.textContent = statut;
  st.className = "prog-statut" + (parfait ? " ok" : jourVu !== t && du.length ? " ko" : "");

  $("liste").replaceChildren(...SECTIONS.map((s) => {
    const ds = du.filter((e) => e.section === s.id);
    if (!ds.length) return null;
    const nf = ds.filter((e) => ex.includes(e.id)).length;
    return el("div", { class: "sec" + (nf === ds.length ? " complete" : ""), style: `--c:${s.couleur}` },
      el("div", { class: "sec-tete" },
        el("span", { class: "sec-num" }, s.num),
        el("span", { class: "sec-nom" }, el("b", {}, s.nom), el("small", {}, s.sous)),
        el("span", { class: "sec-compte" }, nf === ds.length ? "✓" : `${nf}/${ds.length}`)),
      ...ds.map((e) => ligneEx(e, jourVu)));
  }).filter(Boolean));

  const autres = EXERCICES.filter((e) => !du.includes(e));
  const hors = $("hors");
  if (!autres.length) hors.replaceChildren();
  else {
    const det = el("details", { open: horsOuvert },
      el("summary", {}, el("span", {}, el("b", {}, `Pas au programme ${jourVu === t ? "aujourd'hui" : "ce jour-là"}`), el("small", {}, `${pluriel(autres.length, "exercice")} en bonus, si tu veux`))),
      el("div", { class: "liste" }, ...autres.map((e) => ligneEx(e, jourVu, { bonus: true }))));
    det.addEventListener("toggle", () => { horsOuvert = det.open; });
    hors.replaceChildren(det);
  }

  const d = donnees.jours[jourVu];
  $("coffre-attente").hidden = !(parfait && !d?.coffre);

  const obj = prochainTrophee();
  const bo = $("objectif");
  bo.hidden = !obj;
  if (obj) {
    bo.replaceChildren(
      el("span", { class: "medaille" }, el("span", {}, obj.tr.emoji)),
      el("span", { class: "objectif-txt" },
        el("small", {}, "Prochain trophée"),
        el("b", {}, obj.tr.nom),
        el("span", { class: "mini-barre" }, el("i", { style: `width:${Math.round(obj.r * 100)}%` }))),
      el("span", { class: "objectif-val" }, el("b", {}, nombre.format(obj.v)), `/${nombre.format(obj.o)}`));
    bo.setAttribute("aria-label", `Prochain trophée : ${obj.tr.nom}, ${obj.tr.des}. ${obj.v} sur ${obj.o}`);
  }

  const nls = LS_QUOTIDIENS.length, fls = LS_QUOTIDIENS.filter((it) => lsFait(it, jourVu)).length;
  $("mini-ls").replaceChildren(
    el("span", { class: "mini-ls-anneau", html: anneauSVG(fls / nls, "anneau-ls") }, el("span", {}, "⚖️")),
    el("span", { class: "mini-ls-txt" }, el("b", {}, `Lifestyle ${jourVu === t ? "du jour" : "· " + nomDuJour(jourVu).toLowerCase()}`),
      el("small", {}, `${fls}/${nls} bonnes habitudes · +${xpLifestyle(jourVu)} XP`)),
    el("span", { class: "chevron", html: SVG_CHEVRON }));
}

// Le trophée le plus proche d'être débloqué : l'objectif « presque atteint » qui donne envie de continuer.
function prochainTrophee() {
  const s = statsTrophees(A);
  let mieux = null;
  for (const tr of TROPHEES) {
    if (donnees.trophees[tr.id]) continue;
    const [v, o] = tr.p(s);
    const r = Math.min(v, o) / o;
    if (!mieux || r > mieux.r) mieux = { tr, v: Math.min(v, o), o, r };
  }
  return mieux;
}

/* =========================================================
   Cocher un exercice
   ========================================================= */

const file = [];
let feteOuverte = false;

function basculer(id, k = jourVu) {
  Sons.debloquer();
  const e = EX[id];
  const avant = A.J[k] || { parfait: false, mult: 1 };
  const secAvant = sectionFaite(e.section, k);
  const d = jourEcrit(k);
  const i = d.ex.indexOf(id);
  const coche = i < 0;
  if (coche) d.ex.push(id); else d.ex.splice(i, 1);
  nettoyer(k);
  sauver();
  const evts = actualiser();
  const apres = A.J[k];
  const devientParfait = apres.parfait && !avant.parfait;
  rendre();
  if (coche) {
    Sons.coche((donnees.jours[k]?.ex.length || 1) - 1);
    vibrer();
    const secApres = sectionFaite(e.section, k);
    const gain = Math.round((e.xp + (secApres && !secAvant ? XP_SECTION : 0) + (devientParfait ? XP_PARFAIT : 0)) * apres.mult);
    const ligne = document.querySelector(`.vue.active .ligne[data-id="${id}"]`);
    if (ligne) {
      rejouer(ligne, "pop");
      etincelles(ligne.querySelector(".coche"), SEC[e.section].couleur);
      flotterXP(ligne, gain);
    }
    rejouer(document.querySelector("#heros .xp"), "brille");
    if (secApres && !secAvant && !devientParfait) {
      setTimeout(() => Sons.section(), 160);
      const s = SEC[e.section];
      toast(`${s.nom} terminé · +${XP_SECTION} XP de bonus`, { couleur: s.couleur, icone: s.num });
      rejouer(document.querySelector(`.sec[style*="${s.couleur}"]`), "eclat");
    }
  } else {
    Sons.decoche();
  }
  if (devientParfait) evts.unshift({ type: "parfait", k });
  file.push(...evts);
  setTimeout(montrerFetes, devientParfait ? 700 : 350);
}

/* =========================================================
   Fiche d'un exercice (consignes, jours, séance guidée)
   ========================================================= */

function ouvrirFiche(id) {
  const e = EX[id], sec = SEC[e.section], k = jourVu, t = aujourdhui();
  const f = fait(id, k);
  const pal = palierDe(e);
  let plan = [...(planDu(t)[id] || [])];
  const freq = el("span", { class: "pastille" }, frequenceTexte(plan));

  const choix = el("div", { class: "jours-choix", role: "group", "aria-label": "Jours au programme" },
    ...ORDRE_SEMAINE.map((j) => {
      const b = el("button", { "aria-pressed": plan.includes(j) ? "true" : "false", "aria-label": JOURS_NOMS[j] }, JOURS_ABR[j].slice(0, 1).toUpperCase() + JOURS_ABR[j].slice(1, 3));
      b.addEventListener("click", () => {
        plan = plan.includes(j) ? plan.filter((x) => x !== j) : [...plan, j];
        b.setAttribute("aria-pressed", plan.includes(j) ? "true" : "false");
        changerJours(id, plan);
        freq.textContent = frequenceTexte(planDu(t)[id]);
        vibrer();
        actualiser();
        rendre();
        toast("Programme mis à jour, à partir d'aujourd'hui");
      });
      return b;
    }));

  let blocPalier = null;
  if (pal) {
    const reste = pal.suivant ? pal.suivant.des - pal.seances : 0;
    const debut = e.paliers[pal.index].des;
    const pct = pal.suivant ? (pal.seances - debut) / (pal.suivant.des - debut) : 1;
    blocPalier = el("div", { class: "palier" },
      el("div", { class: "palier-ligne" }, el("b", {}, `Palier ${pal.index + 1}/${e.paliers.length}`), el("span", {}, pal.texte)),
      el("div", { class: "palier-barre" }, el("i", { style: `width:${Math.round(pct * 100)}%` })),
      el("p", {}, pal.suivant ? `Encore ${pluriel(reste, "séance")} pour passer à « ${pal.suivant.texte} ».` : "Dernier palier atteint. Garde la cadence."));
  }

  const record = donnees.records[id];
  const stats = el("div", { class: "fiche-stats" },
    el("div", {}, el("b", {}, nombre.format(seancesDe(id))), el("small", {}, "séances")),
    el("div", {}, el("b", {}, "🔥 " + serieEx(e)), el("small", {}, "série")),
    el("div", {}, el("b", {}, record ? `${record} s` : recordEx(e)), el("small", {}, record ? "record brûlure" : "record")));

  const libelleJour = k !== t ? ` (${nomDuJour(k).toLowerCase()})` : "";
  ouvrirFeuille([
    el("div", { class: "fiche-tete", style: `--c:${sec.couleur}` },
      el("span", { class: "fiche-emoji" }, e.emoji),
      el("div", {},
        el("p", { class: "fiche-sec" }, `${sec.num} · ${sec.nom}${e.groupe ? " · " + e.groupe : ""}`),
        el("h2", {}, e.nom),
        el("p", { class: "fiche-long" }, e.long))),
    el("div", { class: "pastilles" }, el("span", { class: "pastille fort" }, prescription(e)), freq, el("span", { class: "pastille or" }, `+${e.xp} XP`)),
    blocPalier,
    el("div", { class: "fiche-actions" },
      e.coach ? el("button", { class: "bouton-principal", onclick: () => { fermerFeuille(); setTimeout(() => lancerSeance(id), 280); }, html: `${SVG_JOUER}<span>Lancer la séance guidée</span>` }) : null,
      el("button", { class: e.coach ? "bouton-second" : "bouton-principal", onclick: () => { fermerFeuille(); setTimeout(() => basculer(id, k), 280); } },
        f ? `Décocher${libelleJour}` : `Marquer comme fait${libelleJour}`)),
    el("h3", {}, "Comment faire"),
    el("ol", { class: "etapes" }, ...e.etapes.map((x) => el("li", {}, x))),
    el("h3", {}, "Pourquoi"),
    ...e.pourquoi.map((x) => el("p", { class: "fiche-p" }, x)),
    e.attention ? el("div", { class: "attention" }, el("b", {}, "⚠️ Attention"), el("p", {}, e.attention)) : null,
    el("h3", {}, "Jours au programme"),
    choix,
    el("p", { class: "fiche-note" }, "Un changement compte à partir d'aujourd'hui : les jours passés gardent leur programme."),
    el("h3", {}, "Tes chiffres"),
    stats,
  ], { classe: "fiche" });
}

/* =========================================================
   Séance guidée (minuteur, tempo, chrono jusqu'à la brûlure)
   ========================================================= */

let S = null;
let verrouEcran = null;
const C_COACH = 2 * Math.PI * 86;

function construirePhases(e) {
  const c = e.coach, P = [{ type: "prep", duree: 5 }];
  if (c.type === "maintien") {
    for (let r = 1; r <= c.reps; r++) {
      P.push({ type: "tenir", duree: c.tenir, rep: r, total: c.reps });
      if (r < c.reps) P.push({ type: "repos", duree: c.repos, rep: r, total: c.reps });
    }
  } else if (c.type === "series") {
    const pal = palierDe(e);
    for (let s = 1; s <= pal.series; s++) {
      P.push({ type: "serie", reps: pal.reps, tempo: c.tempo, duree: pal.reps * c.tempo, serie: s, total: pal.series });
      if (s < pal.series) P.push({ type: "repos", duree: c.repos, serie: s, total: pal.series });
    }
  } else if (c.type === "brulure") {
    P.push({ type: "chrono" });
  }
  return P;
}

async function demanderVerrou() {
  try { verrouEcran = await navigator.wakeLock?.request("screen"); } catch (e) { verrouEcran = null; }
}
function libererVerrou() {
  try { verrouEcran?.release(); } catch (e) {}
  verrouEcran = null;
}

function lancerSeance(id) {
  Sons.debloquer();
  const e = EX[id];
  S = { e, k: jourVu, phases: construirePhases(e), i: 0, t0: 0, pauseA: null, bip: null, temps: null, fini: false, resultat: null };
  $("coach-titre").textContent = e.nom;
  $("coach").style.setProperty("--c", SEC[e.section].couleur);
  $("coach-pause").hidden = false;
  $("coach-passer").hidden = false;
  $("coach-pause").textContent = "Pause";
  const co = $("coach");
  co.hidden = false;
  document.body.classList.add("bloque");
  requestAnimationFrame(() => co.classList.add("ouvert"));
  demanderVerrou();
  entrerPhase(0);
  boucleCoach();
}

function entrerPhase(i) {
  S.i = i; S.t0 = performance.now(); S.bip = null; S.temps = null;
  const ph = S.phases[i];
  if (!ph) return finSeance();
  $("coach").dataset.phase = ph.type;
  $("coach-action").hidden = ph.type !== "chrono";
  $("coach-action").textContent = "🔥 Brûlure !";
  const pts = $("coach-points");
  const total = ph.total || 0;
  if (ph.type === "tenir" || ph.type === "repos" && ph.rep) {
    pts.replaceChildren(...Array.from({ length: total }, (_, j) => el("i", { class: j + 1 < ph.rep || (j + 1 === ph.rep && ph.type === "repos") ? "on" : j + 1 === ph.rep ? "encours" : "" })));
  } else if (ph.type === "serie" || ph.type === "repos") {
    pts.replaceChildren(...Array.from({ length: total }, (_, j) => el("i", { class: "large " + (j + 1 < ph.serie || (j + 1 === ph.serie && ph.type === "repos") ? "on" : j + 1 === ph.serie ? "encours" : "") })));
  } else pts.replaceChildren();
  if (i > 0) {
    if (ph.type === "repos") Sons.temps(false); else Sons.top();
    vibrer();
  }
}

function boucleCoach() {
  if (!S || S.fini) return;
  if (S.pauseA == null) majCoach();
  S.raf = requestAnimationFrame(boucleCoach);
}

function majCoach() {
  const ph = S.phases[S.i];
  if (!ph) return;
  const ecoule = (performance.now() - S.t0) / 1000;
  const c = S.e.coach;
  let gros = "", unite = "", phase = "", consigne = c.consigne, prog = 0;
  if (ph.type === "prep" || ph.type === "tenir" || ph.type === "repos") {
    const reste = Math.max(0, ph.duree - ecoule);
    const s = Math.ceil(reste);
    gros = s; unite = "s"; prog = Math.min(1, ecoule / ph.duree);
    if (ph.type === "prep") phase = "Prépare-toi";
    else if (ph.type === "tenir") phase = `Tiens ! · ${ph.rep}/${ph.total}`;
    else { phase = "Relâche"; consigne = ph.serie ? `Repos avant la série ${ph.serie + 1}/${ph.total}` : `Ensuite : ${ph.rep + 1}/${ph.total}`; }
    if (s >= 1 && s <= 3 && S.bip !== s && ph.type !== "repos") { S.bip = s; Sons.bip(); }
    if (reste <= 0) { entrerPhase(S.i + 1); return; }
  } else if (ph.type === "serie") {
    const r = Math.min(ph.reps, Math.floor(ecoule / ph.tempo) + 1);
    const demi = (ecoule % ph.tempo) < ph.tempo / 2 ? 0 : 1;
    gros = r; unite = `/${ph.reps}`; prog = Math.min(1, ecoule / ph.duree);
    phase = `Série ${ph.serie}/${ph.total}`;
    consigne = c.temps[demi];
    const cle = r * 2 + demi;
    if (S.temps !== cle) { S.temps = cle; if (cle > 2) Sons.temps(demi === 0); }
    if (ecoule >= ph.duree) { entrerPhase(S.i + 1); return; }
  } else if (ph.type === "chrono") {
    const s = Math.floor(ecoule);
    gros = s >= 60 ? `${Math.floor(s / 60)}:${deux(s % 60)}` : s;
    unite = s >= 60 ? "" : "s";
    const rec = donnees.records[S.e.id] || 0;
    prog = rec ? Math.min(1, ecoule / rec) : (ecoule % 60) / 60;
    phase = "Jusqu'à la brûlure";
    consigne = rec ? (ecoule > rec ? `Record battu ! (${rec} s)` : `Ton record : ${rec} s`) : c.consigne;
    if (rec && s === rec + 1 && S.bip !== "rec") { S.bip = "rec"; Sons.section(); }
  }
  const g = $("coach-gros");
  if (g.textContent !== String(gros)) { g.textContent = gros; if (ph.type !== "chrono") rejouer(g, "tic"); }
  $("coach-unite").textContent = unite;
  $("coach-phase").textContent = phase;
  $("coach-consigne").textContent = consigne;
  $("coach-arc").style.strokeDashoffset = (C_COACH * (1 - prog)).toFixed(1);
}

function pauseCoach(forcer) {
  if (!S || S.fini) return;
  const enPause = S.pauseA != null;
  if (forcer === true && enPause) return;
  if (enPause) { S.t0 += performance.now() - S.pauseA; S.pauseA = null; $("coach-pause").textContent = "Pause"; $("coach").classList.remove("en-pause"); }
  else { S.pauseA = performance.now(); $("coach-pause").textContent = "Reprendre"; $("coach").classList.add("en-pause"); }
}

function finSeance() {
  S.fini = true;
  cancelAnimationFrame(S.raf);
  libererVerrou();
  Sons.fin();
  vibrer();
  donnees.compteurs.guidees = (donnees.compteurs.guidees || 0) + 1;
  sauver();
  const co = $("coach");
  co.dataset.phase = "fin";
  $("coach-pause").hidden = true;
  $("coach-passer").hidden = true;
  $("coach-gros").textContent = "✓";
  $("coach-unite").textContent = "";
  $("coach-arc").style.strokeDashoffset = "0";
  $("coach-points").replaceChildren();
  $("coach-phase").textContent = "Séance terminée";
  const r = S.resultat;
  $("coach-consigne").textContent = r ? (r.nouveau ? `Nouveau record : ${r.s} s 🔥` : `${r.s} s · record : ${donnees.records[S.e.id]} s`) : "Bien joué. Chaque séance sculpte un peu plus.";
  const dejaFait = fait(S.e.id, S.k);
  const b = $("coach-action");
  b.hidden = false;
  b.textContent = dejaFait ? "Terminer" : `Valider · +${Math.round(S.e.xp * (A.J[S.k]?.mult || 1))} XP`;
  confettis($("coach-gros"), undefined, 40);
}

function brulure() {
  if (!S) return;
  if (S.fini) { fermerCoach(true); return; } // bouton « Valider » de l'écran de fin
  const ph = S.phases[S.i];
  if (ph?.type !== "chrono") return;
  const s =Math.max(1, Math.round((performance.now() - S.t0) / 1000));
  const ancien = donnees.records[S.e.id] || 0;
  const nouveau = s > ancien;
  if (nouveau) { donnees.records[S.e.id] = s; sauver(); }
  S.resultat = { s, nouveau };
  entrerPhase(S.i + 1);
}

function fermerCoach(valider = false) {
  if (!S) return;
  const { e, k, fini } = S;
  cancelAnimationFrame(S.raf);
  libererVerrou();
  S = null;
  const co = $("coach");
  co.classList.remove("ouvert", "en-pause");
  document.body.classList.remove("bloque");
  setTimeout(() => { if (!co.classList.contains("ouvert")) co.hidden = true; }, 350);
  if (valider && fini) {
    if (!fait(e.id, k)) setTimeout(() => basculer(e.id, k), 380);
    else { const evts = actualiser(); file.push(...evts); rendre(); setTimeout(montrerFetes, 400); }
  }
}

/* =========================================================
   Célébrations
   ========================================================= */

function montrerFetes() {
  if (feteOuverte || !file.length || S) return;
  const f = file.shift();
  feteOuverte = true;
  const fete = $("fete"), c = $("fete-contenu");
  c.replaceChildren();
  fete.className = "fete " + f.type;
  fete.hidden = false;
  document.body.classList.add("bloque");
  requestAnimationFrame(() => requestAnimationFrame(() => fete.classList.add("ouvert")));
  ({ parfait: feteParfait, niveau: feteNiveau, trophee: feteTrophee, casse: feteCasse, signe: feteSigne, coffre: feteParfait }[f.type] || (() => fermerFete()))(f, c);
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

function tirerCoffre(chaine) {
  const bonus = Math.min(chaine, 30) / 30;
  const pL = 0.02 + 0.04 * bonus, pE = 0.1 + 0.08 * bonus, pR = 0.28 + 0.07 * bonus;
  const r = Math.random();
  const i = r < pL ? 3 : r < pL + pE ? 2 : r < pL + pE + pR ? 1 : 0;
  const R = RARETES[i];
  return { i, R, xp: R.min + Math.floor(Math.random() * (R.max - R.min + 1)), phrase: PHRASES[Math.floor(Math.random() * PHRASES.length)] };
}

function feteParfait(f, c) {
  const k = f.k || aujourdhui();
  const J = A.J[k];
  const d = donnees.jours[k];
  if (f.type === "parfait") { Sons.parfait(); vibrer(); }
  const D = A.defi;
  const zone = el("div", { class: "coffre-zone" });
  const stats = el("div", { class: "fete-stats" },
    el("div", {}, el("b", {}, "🔥 " + (J?.chaine || 0)), el("small", {}, (J?.chaine || 0) > 1 ? "jours parfaits d'affilée" : "jour parfait")),
    D && !D.termine && k >= D.debut ? el("div", {}, el("b", {}, `J${D.jour}`), el("small", {}, "sur 180 · la courbe monte")) : el("div", {}, el("b", {}, `+${nombre.format(J?.xp || 0)}`), el("small", {}, "XP ce jour-là")));
  c.append(
    el("div", { class: "rayons", "aria-hidden": "true" }),
    el("p", { class: "fete-sur" }, k === aujourdhui() ? "Aujourd'hui" : nomDuJour(k)),
    el("h2", { class: "fete-titre" }, "Journée", el("br"), "parfaite"),
    stats,
    zone,
  );
  if (!d?.coffre && J?.parfait) {
    let coups = 0, ouvert = false;
    const boite = el("button", { class: "coffre", "aria-label": "Ouvrir le coffre (touche 3 fois)", html: COFFRE_SVG });
    const aide = el("p", { class: "coffre-aide" }, "Touche le coffre 3 fois pour l'ouvrir");
    boite.addEventListener("click", () => {
      if (ouvert) return;
      coups++;
      if (coups < 3) {
        Sons.coffreSecoue(); vibrer();
        rejouer(boite, coups === 1 ? "secoue" : "secoue-fort");
        aide.textContent = coups === 1 ? "Encore 2 fois…" : "Encore une fois !";
        return;
      }
      ouvert = true;
      const tir = tirerCoffre(A.serie);
      const dj = jourEcrit(k);
      dj.coffre = { rarete: tir.R.id, xp: tir.xp };
      sauver();
      Sons.coffre(tir.i); vibrer();
      boite.classList.add("ouvert", "r-" + tir.R.id);
      confettis(boite, [tir.R.couleur, "#ffffff", "#ffcf4a"], 50 + tir.i * 25);
      aide.remove();
      zone.append(el("div", { class: "butin r-" + tir.R.id, style: `--c:${tir.R.couleur}` },
        el("p", { class: "butin-rarete" }, tir.R.nom),
        el("p", { class: "butin-xp" }, `+${tir.xp} XP`),
        el("p", { class: "butin-phrase" }, `« ${tir.phrase} »`)));
      const evts = actualiser();
      file.push(...evts);
      c.append(boutonContinuer());
    });
    zone.append(boite, aide);
    const plusTard = el("button", { class: "fete-lien", onclick: fermerFete }, "Plus tard");
    c.append(plusTard);
    boite.addEventListener("click", () => { if (ouvert) plusTard.remove(); });
  } else {
    if (d?.coffre) {
      const R = RARETES.find((x) => x.id === d.coffre.rarete) || RARETES[0];
      zone.append(el("p", { class: "coffre-aide" }, `Coffre ouvert : ${R.nom.toLowerCase()}, +${d.coffre.xp} XP`));
    }
    c.append(boutonContinuer());
  }
  if (f.type === "parfait") setTimeout(() => confettis(c.querySelector(".fete-titre"), undefined, 70), 150);
}

function feteNiveau(f, c) {
  Sons.niveau(); vibrer();
  const r = rangDe(f.n);
  c.append(
    el("div", { class: "rayons or", "aria-hidden": "true" }),
    el("p", { class: "fete-sur" }, f.nouveauRang ? "Nouveau rang" : "Niveau supérieur"),
    el("div", { class: "fete-embleme", html: emblemeSVG(r, f.n) }),
    f.nouveauRang ? el("h2", { class: "fete-titre titre-rang", style: `--r1:${r.c1};--r2:${r.c2}` }, r.nom) : el("h2", { class: "fete-titre" }, "Niveau ", f.n),
    el("p", { class: "fete-texte" }, f.nouveauRang ? `Niveau ${f.n} atteint. Bienvenue au rang ${r.nom}.` : `Prochain niveau dans ${nombre.format(coutNiveau(f.n))} XP.`),
    boutonContinuer(),
  );
  setTimeout(() => confettis(c.querySelector(".fete-embleme"), [r.c1, r.c2, "#ffffff", "#ffcf4a"], 80), 450);
}

function feteTrophee(f, c) {
  Sons.trophee(); vibrer();
  c.append(
    el("div", { class: "rayons", "aria-hidden": "true" }),
    el("p", { class: "fete-sur" }, "Trophée débloqué"),
    el("div", { class: "medaille grande" }, el("span", {}, f.tr.emoji)),
    el("h2", { class: "fete-titre petit" }, f.tr.nom),
    el("p", { class: "fete-texte" }, f.tr.des),
    el("p", { class: "fete-xp" }, `+${f.tr.xp} XP`),
    boutonContinuer(),
  );
  setTimeout(() => confettis(c.querySelector(".medaille"), undefined, 50), 300);
}

function feteCasse(f, c) {
  Sons.casse(); vibrer();
  const hier = f.k === decaler(aujourdhui(), -1);
  c.append(
    el("div", { class: "fissure", "aria-hidden": "true", html: `<svg viewBox="0 0 200 120"><path class="fis-ligne" d="M10 96 L52 70 L74 78 L104 40"/><path class="fis-chute" d="M104 40 L112 64 L106 70 L118 104"/><path class="fis-eclat" d="M104 40l9-14M104 40l15 4M104 40l-6-15"/></svg>` }),
    el("p", { class: "fete-sur rouge" }, A.defi && !A.defi.termine ? "Défi 6 mois" : "Ta série"),
    el("h2", { class: "fete-titre" }, "La courbe", el("br"), "s'est cassée"),
    el("p", { class: "fete-texte" }, `${hier ? "Hier" : majuscule(fmtLong.format(dateDe(f.k)))}, une habitude a manqué. Ta série de ${pluriel(f.avant, "jour parfait", "jours parfaits")} repart de zéro.`),
    el("p", { class: "fete-texte doux" }, A.defi && !A.defi.termine ? `Le défi continue : il reste ${pluriel(A.defi.restants, "jour")}. Reconstruis ta courbe dès aujourd'hui.` : "Reconstruis-la dès aujourd'hui. Les phénix renaissent toujours."),
    el("button", { class: "fete-bouton rouge", onclick: fermerFete }, "Reconstruire"),
    el("button", { class: "fete-lien", onclick: () => { jourVu = f.k; fermerFete(); allerA("jour"); } }, "J'avais tout fait : corriger ce jour"),
  );
}

function feteSigne(f, c) {
  Sons.signature(); vibrer();
  const D = A.defi;
  c.append(
    el("div", { class: "rayons", "aria-hidden": "true" }),
    el("p", { class: "fete-sur" }, "Défi lancé"),
    el("h2", { class: "fete-titre" }, "Jour 1", el("br"), "sur 180"),
    el("p", { class: "fete-texte" }, `Arrivée le ${fmtDate.format(dateDe(D.fin))}. Chaque journée parfaite fait monter ta courbe. Une habitude manquée, et elle se casse.`),
    boutonContinuer("C'est parti"),
  );
  setTimeout(() => confettis(c.querySelector(".fete-titre"), undefined, 80), 200);
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
  if (!D) { v.replaceChildren(...pacte().filter(Boolean)); return; }

  const tete = el("header", { class: "tete" },
    el("p", { class: "sur-titre" }, D.termine ? "Défi terminé" : `Jour ${D.jour} sur 180 · arrivée le ${fmtJourMois.format(dateDe(D.fin))}`),
    el("h1", {}, "Défi 6 mois"));

  if (D.termine) {
    v.replaceChildren(tete,
      el("section", { class: "carte resultat" },
        el("p", { class: "etiquette" }, "Ta note finale"),
        el("p", { class: "note note-" + D.note }, D.note),
        el("p", {}, `${D.parfaits} jours parfaits sur 180 (${Math.round((D.parfaits / 180) * 100)} %) · meilleure série : ${pluriel(D.record, "jour")} · ${pluriel(D.cassures.length, "cassure")}`)),
      carteCourbe(D), carteMur(D),
      el("button", { class: "bouton-principal large", onclick: nouveauDefi }, "Lancer un nouveau défi"));
    return;
  }

  const pctParfaits = D.jour > 1 || D.aujourdhuiFait ? Math.round((D.parfaits / Math.max(1, D.faits)) * 100) : 0;
  v.replaceChildren(
    tete,
    carteCourbe(D),
    el("div", { class: "tuiles" },
      tuile("🔥", D.serie, "série en cours", "feu"),
      tuile("🏔️", D.record, "meilleure série"),
      tuile("✨", D.parfaits, `jours parfaits · ${pctParfaits} %`),
      tuile("⚡", D.cassures.length, D.cassures.length > 1 ? "cassures" : "cassure", D.cassures.length ? "rouge" : "")),
    carteMur(D),
    carteJalons(D),
    el("section", { class: "carte regles" },
      el("h2", {}, "Les règles"),
      el("p", {}, "✅ Un jour est parfait quand tout le programme de ce jour-là est coché."),
      el("p", {}, "📈 Chaque jour parfait fait monter ta courbe d'un cran."),
      el("p", {}, "💥 Un exercice oublié casse la courbe : ta série repart de zéro, mais le défi continue."),
      el("p", {}, "🎁 Chaque journée parfaite ouvre un coffre. Plus ta série est longue, plus il a de chances d'être rare.")),
    el("button", { class: "lien-danger", onclick: recommencerDefi }, "Recommencer le défi à zéro"),
  );
}

function tuile(ico, valeur, texte, classe = "") {
  return el("div", { class: "tuile " + classe }, el("span", { class: "tuile-ico" }, ico), el("b", {}, nombre.format(valeur)), el("small", {}, texte));
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
<defs><linearGradient id="c-trait" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9b7bff"/><stop offset="1" stop-color="#5ff0ff"/></linearGradient>
<linearGradient id="c-aire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ff0ff" stop-opacity=".28"/><stop offset="1" stop-color="#9b7bff" stop-opacity="0"/></linearGradient>
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
      el("div", {}, el("p", { class: "etiquette" }, "Ta courbe"), el("p", { class: "gros" }, D.serie, el("small", {}, D.serie > 1 ? " jours d'affilée" : " jour d'affilée"))),
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
      const pct = Math.min(1, D.faits / j.j);
      return el("div", { class: "jalon" + (ok ? " ok" : "") },
        el("span", { class: "jalon-medaille", html: (ok ? "" : anneauSVG(pct, "anneau-jalon")) }, el("span", {}, j.emoji)),
        el("b", {}, `J${j.j}`),
        el("small", {}, ok ? "atteint" : `dans ${j.j - D.faits} j`));
    })));
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
    ? el("p", { class: "aide" }, `Défis précédents : ${donnees.defisPasses.map((d) => `${d.parfaits} jours parfaits (série record ${d.record})`).join(" · ")}`) : null;
  return [
    el("header", { class: "tete" }, el("p", { class: "sur-titre" }, "Le défi"), el("h1", {}, "6 mois")),
    el("section", { class: "pacte" },
      el("div", { class: "pacte-chiffre", "aria-hidden": "true" }, "180"),
      el("p", { class: "pacte-sous" }, "jours pour sculpter ton visage"),
      el("div", { class: "pacte-regles" },
        el("p", {}, el("span", {}, "📈"), "Chaque journée parfaite fait monter ta courbe."),
        el("p", {}, el("span", {}, "💥"), "Une seule habitude manquée, et elle se casse."),
        el("p", {}, el("span", {}, "🎁"), "Coffres, jalons et trophées tout au long du chemin."),
        el("p", {}, el("span", {}, "🏛️"), `Arrivée le ${fmtDate.format(dateDe(decaler(aujourdhui(), DUREE_DEFI - 1)))}.`)),
      el("p", { class: "serment" }, "« Je m'engage à suivre mon programme chaque jour, pendant 180 jours. »"),
      b,
      el("p", { class: "aide" }, "Le défi commence aujourd'hui (jour 1).")),
    passes,
  ];
}

function signerDefi() {
  if (donnees.defi) return;
  donnees.defi = { debut: aujourdhui(), signe: new Date().toISOString() };
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
  sauver();
  actualiser();
  rendre();
}
function recommencerDefi() {
  if (!confirm("Recommencer le défi à zéro ?\n\nLa courbe actuelle est archivée et un nouveau défi de 180 jours pourra commencer. Tes exercices cochés, ton XP et tes trophées restent.")) return;
  archiverDefi();
  toast("Défi archivé. Signe le nouveau quand tu es prêt.");
}
function nouveauDefi() { archiverDefi(); }

/* =========================================================
   Onglet « Lifestyle »
   ========================================================= */

function basculerLs(cle, k = jourVu, elm) {
  Sons.debloquer();
  const avant = xpLifestyle(k);
  const d = jourEcrit(k);
  const i = d.ls.indexOf(cle);
  const coche = i < 0;
  if (coche) d.ls.push(cle); else d.ls.splice(i, 1);
  nettoyer(k);
  sauver();
  const evts = actualiser();
  const gain = xpLifestyle(k) - avant;
  rendre();
  if (coche) {
    Sons.coche(Math.min(10, (donnees.jours[k]?.ls.length || 1) - 1));
    vibrer();
    const cible = document.querySelector(`.vue.active [data-ls="${cle}"]`);
    if (cible) { rejouer(cible, "pop"); etincelles(cible.querySelector(".coche") || cible, "#4ee6c1"); flotterXP(cible, gain, "#7cffc4"); }
    const tous = LS_QUOTIDIENS.every((it) => lsFait(it, k));
    if (tous && gain >= XP_LS_TOUT) { setTimeout(() => Sons.section(), 160); toast(`Lifestyle parfait · +${XP_LS_TOUT} XP de bonus`, { couleur: "#4ee6c1", icone: "✨" }); }
  } else Sons.decoche();
  file.push(...evts);
  setTimeout(montrerFetes, 350);
}

function rendreLifestyle() {
  const v = $("vue-lifestyle");
  const k = jourVu, t = aujourdhui();
  const n = LS_QUOTIDIENS.length, f = LS_QUOTIDIENS.filter((it) => lsFait(it, k)).length;
  const meilleure = Object.entries(A.lsChaine).sort((a, b) => b[1] - a[1])[0];
  const itMeilleur = meilleure && meilleure[1] > 1 ? LS_ITEMS.find((x) => x.id === meilleure[0]) : null;

  const sections = LIFESTYLE.map((s) => {
    const groupes = s.groupes ? s.groupes.map((g, gi) => [g, s.items.filter((it) => it.groupe === gi)]) : [[null, s.items]];
    return el("section", { class: "carte ls-sec", style: `--c:${s.couleur}` },
      el("div", { class: "ls-tete" },
        el("span", { class: "ls-num" }, s.num),
        el("h2", {}, s.nom),
        el("span", { class: "ls-emoji" }, s.emoji)),
      el("p", { class: "ls-intro" }, s.intro),
      ...groupes.flatMap(([g, items]) => [
        g ? el("p", { class: "ls-groupe" }, g) : null,
        ...items.map((it) => itemLs(it, k)),
      ]));
  });

  v.replaceChildren(
    el("header", { class: "tete" }, el("p", { class: "sur-titre" }, "Deuxième partie"), el("h1", {}, "Lifestyle change")),
    el("section", { class: "carte ls-score" },
      el("span", { class: "ls-score-anneau", html: anneauSVG(f / n, "anneau-ls") }, el("b", {}, f), el("small", {}, `/${n}`)),
      el("div", {},
        el("p", { class: "etiquette" }, k === t ? "Aujourd'hui" : nomDuJour(k)),
        el("p", { class: "ls-score-titre" }, f === n ? "Lifestyle parfait ✨" : `${pluriel(n - f, "bonne habitude", "bonnes habitudes")} à cocher`),
        el("p", { class: "ls-score-sous" }, `+${xpLifestyle(k)} XP · bonus de ${XP_LS_TOUT} XP si tout est coché`),
        itMeilleur ? el("p", { class: "ls-score-sous" }, `Meilleure série en cours : ${itMeilleur.emoji} ${pluriel(meilleure[1], "jour")}`) : null)),
    ...sections,
    el("p", { class: "aide" }, "Le lifestyle rapporte de l'XP en bonus. Seuls les exercices comptent pour la courbe du défi."),
  );
}

function itemLs(it, k) {
  if (it.type === "info") {
    return el("div", { class: "ls-info" }, el("span", { class: "ls-ico" }, it.emoji), el("div", {}, el("b", {}, it.nom), el("p", {}, it.texte)));
  }
  if (it.type === "double") {
    const d = donnees.jours[k];
    const tout = lsFait(it, k);
    return el("div", { class: "ls-item double" + (tout ? " fait" : ""), "data-ls": it.id },
      el("span", { class: "ls-ico" }, it.emoji),
      el("span", { class: "ls-nom" }, it.nom, A.lsChaine[it.id] > 1 ? el("small", { class: "feu" }, `🔥 ${A.lsChaine[it.id]} jours d'affilée`) : null),
      el("span", { class: "moments" }, ...it.moments.map((m) => {
        const cle = `${it.id}.${m}`, on = !!d?.ls.includes(cle);
        return el("button", { class: "moment" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", "data-ls": cle, onclick: () => basculerLs(cle, k) },
          el("span", { class: "coche petite", html: SVG_COCHE }), m);
      })));
  }
  if (it.type === "semaine") {
    const jourFait = lingeSemaine(k);
    const on = !!jourFait;
    return el("button", {
      class: "ls-item" + (on ? " fait" : ""), "data-ls": it.id, "aria-pressed": on ? "true" : "false",
      onclick: () => {
        if (jourFait && jourFait !== k) { toast(`Déjà fait cette semaine (${JOURS_NOMS[jourSem(jourFait)]})`, { icone: "🧺" }); return; }
        basculerLs(it.id, k);
      },
    },
      el("span", { class: "coche", html: SVG_COCHE }),
      el("span", { class: "ls-ico" }, it.emoji),
      el("span", { class: "ls-nom" }, it.nom, el("small", {}, on ? `Fait cette semaine · ${JOURS_NOMS[jourSem(jourFait)]}` : "Une fois par semaine · +15 XP")));
  }
  const on = lsFait(it, k);
  const s = A.lsChaine[it.id];
  return el("button", { class: "ls-item" + (on ? " fait" : ""), "data-ls": it.id, "aria-pressed": on ? "true" : "false", onclick: () => basculerLs(it.id, k) },
    el("span", { class: "coche", html: SVG_COCHE }),
    el("span", { class: "ls-ico" }, it.emoji),
    el("span", { class: "ls-nom" }, it.nom, s > 1 ? el("small", { class: "feu" }, `🔥 ${s} jours d'affilée`) : null));
}

/* =========================================================
   Onglet « Progrès »
   ========================================================= */

let moisVu = aujourdhui().slice(0, 7);

function rendreProgres() {
  const v = $("vue-progres");
  const { niv, rang } = A;
  const iRang = RANGS.indexOf(rang);
  const suivant = RANGS[iRang + 1];
  const xpSuivant = suivant ? xpPourNiveau(suivant.des) - A.xp : 0;
  const s = statsTrophees(A);
  const nbTrophees = TROPHEES.filter((t) => donnees.trophees[t.id]).length;

  v.replaceChildren(
    el("header", { class: "tete" }, el("p", { class: "sur-titre" }, "Ta transformation"), el("h1", {}, "Progrès")),
    el("section", { class: "carte profil", style: `--r1:${rang.c1};--r2:${rang.c2}` },
      el("div", { class: "profil-emb", html: anneauSVG(niv.pct, "anneau-xp", 47) + emblemeSVG(rang, niv.n) }),
      el("p", { class: "profil-rang" }, rang.nom),
      el("p", { class: "profil-niveau" }, `Niveau ${niv.n} · ${nombre.format(A.xp)} XP au total`),
      el("div", { class: "xp" }, el("i", { style: `width:${(niv.pct * 100).toFixed(1)}%` })),
      el("p", { class: "profil-suivant" }, suivant ? `${suivant.nom} au niveau ${suivant.des} · encore ${nombre.format(Math.max(0, xpSuivant))} XP` : "Rang ultime atteint. Tu es une statue grecque."),
      el("div", { class: "profil-chiffres" },
        el("div", {}, el("b", {}, "🔥 " + A.serie), el("small", {}, "série")),
        el("div", {}, el("b", {}, A.record), el("small", {}, "record")),
        el("div", {}, el("b", {}, A.parfaits), el("small", {}, "jours parfaits")),
        el("div", {}, el("b", {}, nombre.format(A.coches)), el("small", {}, "exercices")))),

    el("section", { class: "carte" },
      el("div", { class: "carte-tete" }, el("h2", {}, "Les rangs"), el("span", { class: "doux-petit" }, `${iRang + 1} / ${RANGS.length}`)),
      el("div", { class: "rangs" }, ...RANGS.map((r, i) => el("div", { class: "rang" + (i <= iRang ? " ok" : "") + (i === iRang ? " actuel" : "") },
        el("span", { class: "rang-emb", html: emblemeSVG(r, null, { verrou: i > iRang }) }),
        el("b", {}, r.nom),
        el("small", {}, RANGS[i + 1] ? `niv. ${r.des}–${RANGS[i + 1].des - 1}` : `niv. ${r.des}+`))))),

    el("section", { class: "carte" },
      el("div", { class: "carte-tete" }, el("h2", {}, "Trophées"), el("span", { class: "doux-petit" }, `${nbTrophees} / ${TROPHEES.length}`)),
      el("div", { class: "trophees" }, ...TROPHEES.map((tr) => {
        const ok = !!donnees.trophees[tr.id];
        const [val, obj] = tr.p(s);
        return el("button", { class: "trophee" + (ok ? " ok" : ""), onclick: () => ficheTrophee(tr, ok, val, obj) },
          el("span", { class: "medaille" }, el("span", {}, tr.emoji)),
          el("b", {}, tr.nom),
          ok ? el("small", {}, `+${tr.xp} XP`) : el("span", { class: "mini-barre" }, el("i", { style: `width:${Math.min(100, (val / obj) * 100)}%` })));
      }))),

    carteCalendrier(),
    carteExercices(),
    carteReglages(),
  );
}

function ficheTrophee(tr, ok, val, obj) {
  ouvrirFeuille([
    el("div", { class: "fiche-trophee" + (ok ? " ok" : "") },
      el("span", { class: "medaille grande" }, el("span", {}, tr.emoji)),
      el("h2", {}, tr.nom),
      el("p", {}, tr.des),
      el("p", { class: "fete-xp" }, ok ? `Débloqué le ${fmtDate.format(dateDe(donnees.trophees[tr.id]))} · +${tr.xp} XP` : `${nombre.format(Math.min(val, obj))} / ${nombre.format(obj)} · +${tr.xp} XP à gagner`)),
  ]);
}

function carteCalendrier() {
  const [a, m] = moisVu.split("-").map(Number);
  const premier = new Date(a, m - 1, 1);
  const nbJours = new Date(a, m, 0).getDate();
  const decal = (premier.getDay() + 6) % 7;
  const t = aujourdhui();
  const cases = [];
  for (let i = 0; i < decal; i++) cases.push(el("span", { class: "cal-vide" }));
  let parfaitsMois = 0, joursMois = 0;
  for (let j = 1; j <= nbJours; j++) {
    const k = `${a}-${deux(m)}-${deux(j)}`;
    const J = A.J[k];
    let classe = "cal-jour";
    if (k > t) classe += " futur";
    else if (J && J.dus) {
      const r = J.faits / J.dus;
      if (J.parfait) { classe += " parfait"; parfaitsMois++; }
      else classe += r >= 0.66 ? " n3" : r >= 0.33 ? " n2" : r > 0 ? " n1" : " n0";
      if (k < t || J.parfait) joursMois++;
    }
    if (k === t) classe += " auj";
    if (k === jourVu && k !== t) classe += " vu";
    cases.push(el("button", { class: classe, disabled: k > t, "aria-label": `${fmtLong.format(dateDe(k))}${J?.parfait ? ", parfait" : ""}`, onclick: () => { jourVu = k; allerA("jour"); toast(`Tu modifies ${k === t ? "aujourd'hui" : fmtLong.format(dateDe(k))}`, { icone: "✎" }); } }, j));
  }
  const moisCle = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}`;
  return el("section", { class: "carte" },
    el("div", { class: "carte-tete" },
      el("h2", {}, "Calendrier"),
      el("div", { class: "nav-mois" },
        el("button", { class: "rond petit", "aria-label": "Mois précédent", html: SVG_PRECEDENT, onclick: () => { moisVu = moisCle(new Date(a, m - 2, 1)); rendreProgres(); } }),
        el("span", {}, majuscule(fmtMois.format(premier))),
        el("button", { class: "rond petit", "aria-label": "Mois suivant", html: SVG_CHEVRON, disabled: moisVu >= t.slice(0, 7), onclick: () => { moisVu = moisCle(new Date(a, m, 1)); rendreProgres(); } }))),
    el("div", { class: "cal-semaine", "aria-hidden": "true" }, ..."LMMJVSD".split("").map((x) => el("span", {}, x))),
    el("div", { class: "cal" }, ...cases),
    el("p", { class: "aide gauche" }, `${parfaitsMois} jour${parfaitsMois > 1 ? "s" : ""} parfait${parfaitsMois > 1 ? "s" : ""} ce mois-ci. Touche un jour pour le revoir ou le corriger.`));
}

function carteExercices() {
  const lignes = EXERCICES.map((e) => {
    const n = A.seances[e.id];
    let total = "";
    if (e.coach?.type === "series") {
      let reps = 0;
      for (let i = 0; i < n; i++) { const p = palierDe(e, i); reps += p.series * p.reps; }
      total = `${nombre.format(reps)} répétitions`;
    } else if (e.coach?.type === "maintien") {
      const sec = n * e.coach.reps * e.coach.tenir;
      total = sec >= 60 ? `${nombre.format(Math.round(sec / 60))} min de contraction` : `${sec} s de contraction`;
    } else if (e.coach?.type === "brulure") total = donnees.records[e.id] ? `record ${donnees.records[e.id]} s` : "pas encore de record";
    else if (e.id === "cardio") total = `${pluriel(n, "heure")} de cardio`;
    else total = pluriel(n, "jour");
    return el("button", { class: "stat-ex", style: `--c:${SEC[e.section].couleur}`, onclick: () => ouvrirFiche(e.id) },
      el("span", { class: "ex-emoji" }, e.emoji),
      el("span", { class: "ex-txt" }, el("b", {}, e.nom), el("small", {}, `${pluriel(n, "séance")} · ${total}`)),
      el("span", { class: "stat-serie" }, el("b", {}, "🔥 " + serieEx(e)), el("small", {}, `record ${recordEx(e)}`)));
  });
  return el("section", { class: "carte" },
    el("div", { class: "carte-tete" }, el("h2", {}, "Exercices"), el("span", { class: "doux-petit" }, "séances · série")),
    el("div", { class: "stats-ex" }, ...lignes));
}

function carteReglages() {
  const sons = el("button", { class: "reglage", role: "switch", "aria-checked": donnees.reglages.sons ? "true" : "false" },
    el("span", {}, "🔊"), el("span", { class: "reglage-txt" }, el("b", {}, "Sons et vibrations"), el("small", {}, "Le bouton silencieux de l'iPhone coupe aussi les sons")),
    el("span", { class: "interrupteur" }));
  sons.addEventListener("click", () => {
    donnees.reglages.sons = !donnees.reglages.sons;
    Sons.regler(donnees.reglages.sons);
    sauver();
    sons.setAttribute("aria-checked", donnees.reglages.sons ? "true" : "false");
    if (donnees.reglages.sons) { Sons.coche(4); vibrer(); }
  });
  return el("section", { class: "carte" },
    el("div", { class: "carte-tete" }, el("h2", {}, "Réglages")),
    el("div", { class: "reglages" },
      sons,
      el("button", { class: "reglage", onclick: () => window.Sauvegarde?.ouvrir() },
        el("span", {}, "☁️"), el("span", { class: "reglage-txt" }, el("b", {}, "Sauvegarde GitHub"), el("small", {}, "Envoi automatique vers ton dépôt privé")), el("span", { class: "chevron", html: SVG_CHEVRON })),
      el("button", { class: "reglage", onclick: () => window.Sauvegarde?.exporterFichier() },
        el("span", {}, "📤"), el("span", { class: "reglage-txt" }, el("b", {}, "Exporter"), el("small", {}, "Un fichier .json de toutes tes données")), el("span", { class: "chevron", html: SVG_CHEVRON })),
      el("button", { class: "reglage", onclick: () => $("fichier").click() },
        el("span", {}, "📥"), el("span", { class: "reglage-txt" }, el("b", {}, "Importer"), el("small", {}, "Recharger un fichier exporté")), el("span", { class: "chevron", html: SVG_CHEVRON })),
      el("button", { class: "reglage", onclick: remettreJours },
        el("span", {}, "🗓️"), el("span", { class: "reglage-txt" }, el("b", {}, "Programme d'origine"), el("small", {}, "Remettre les jours conseillés de chaque exercice")), el("span", { class: "chevron", html: SVG_CHEVRON }))),
    el("p", { class: "aide gauche" }, "Tes données restent sur ce téléphone. Pense à la sauvegarde GitHub ou à exporter de temps en temps."));
}

function remettreJours() {
  if (!confirm("Remettre les jours conseillés pour tous les exercices, à partir d'aujourd'hui ?")) return;
  const t = aujourdhui();
  const dernier = donnees.programme[donnees.programme.length - 1];
  if (dernier.depuis === t) dernier.plan = planDefaut();
  else donnees.programme.push({ depuis: t, plan: planDefaut() });
  donnees.programme.sort((a, b) => (a.depuis < b.depuis ? -1 : 1));
  sauver();
  actualiser();
  rendre();
  toast("Programme d'origine rétabli");
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
    toast("Ce fichier n'est pas une sauvegarde Maxilla", { couleur: "var(--rouge)", icone: "!" });
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
  $("chip-serie").addEventListener("click", () => allerA("defi"));
  $("bandeau").addEventListener("click", () => allerA("lifestyle"));
  $("mini-ls").addEventListener("click", () => allerA("lifestyle"));
  $("objectif").addEventListener("click", () => allerA("progres"));
  $("coffre-attente").addEventListener("click", () => { file.unshift({ type: "coffre", k: jourVu }); montrerFetes(); });
  for (const b of document.querySelectorAll(".onglets button")) b.addEventListener("click", () => { Sons.debloquer(); if (b.dataset.vue !== vue) allerA(b.dataset.vue); else window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("feuille").addEventListener("click", (e) => { if (e.target.closest("[data-fermer]")) fermerFeuille(); });
  $("coach-fermer").addEventListener("click", () => fermerCoach(false));
  $("coach-pause").addEventListener("click", () => pauseCoach());
  $("coach-passer").addEventListener("click", () => { if (S && !S.fini) entrerPhase(S.i + 1); });
  $("coach-action").addEventListener("click", brulure);
  $("fichier").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importer(f); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("feuille").hidden) fermerFeuille(); } });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (S && !S.fini) pauseCoach(true); }
    else { nouveauJour(); if (S && !S.fini) demanderVerrou(); }
  });
  setInterval(nouveauJour, 60000);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

demarrer();
