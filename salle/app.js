"use strict";

/* =========================================================
   Salle : tes séances types, tes charges, ta progression.
   Les données restent sur le téléphone (localStorage « salle.v1 »).
   Records, séries de semaines, courbes et comparaisons avec la dernière
   fois sont recalculés à partir des séances enregistrées : rien ne peut
   se désynchroniser.
   ========================================================= */

const CLE = "salle.v1";
const $ = (id) => document.getElementById(id);
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const nombre = new Intl.NumberFormat("fr-FR");
const nombre1 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const nombre2 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pluriel = (n, mot, mots = mot + "s") => `${nombre.format(n)} ${n > 1 ? mots : mot}`;
const ico = (nom, classe = "") => `<svg class="ico ${classe}" aria-hidden="true"><use href="#i-${nom}"/></svg>`;
const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const borne = (v, a, b) => Math.min(b, Math.max(a, v));
const arrondi = (v) => Math.round(v * 100) / 100;
const sansAccents = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const alpha = (a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });

/* =========================================================
   Dates et formats
   ========================================================= */

const deux = (n) => String(n).padStart(2, "0");
const cleDe = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
const dateDe = (k) => { const [a, m, j] = k.split("-").map(Number); return new Date(a, m - 1, j); };
const decaler = (k, n) => { const d = dateDe(k); d.setDate(d.getDate() + n); return cleDe(d); };
const aujourdhui = () => cleDe(new Date());
const jourDe = (iso) => cleDe(new Date(iso));
const ecartJours = (a, b) => Math.round((dateDe(b) - dateDe(a)) / 86400000);
const lundiDe = (k) => { const d = dateDe(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return cleDe(d); };
const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtJourMois = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtJourSem = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

function quand(iso) {
  const n = ecartJours(jourDe(iso), aujourdhui());
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return "hier";
  if (n < 7) return `il y a ${n} jours`;
  return `le ${fmtCourt.format(new Date(iso))}`;
}
// Version courte, toujours relative : « il y a 9 jours », « il y a 3 semaines ».
function ilYA(iso) {
  const n = ecartJours(jourDe(iso), aujourdhui());
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return "hier";
  if (n < 14) return `il y a ${n} jours`;
  if (n < 60) return `il y a ${Math.round(n / 7)} semaines`;
  return `il y a ${Math.round(n / 30)} mois`;
}
const fmtKg = (v) => (v == null ? "" : nombre2.format(v));
const fmtSaisie = (v) => String(v).replace(".", ",");
const fmtSerie = (x) => (x.kg > 0 ? `${fmtKg(x.kg)} × ${x.reps}` : `PDC × ${x.reps}`);
const fmtTonnage = (kg) => (kg >= 10000 ? `${nombre1.format(kg / 1000)} t` : `${nombre.format(Math.round(kg))} kg`);
function fmtDuree(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${deux(m % 60)}`;
}
function fmtChrono(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
  return h ? `${h}:${deux(m)}:${deux(x)}` : `${m}:${deux(x)}`;
}
const fmtRepos = (s) => `${Math.floor(s / 60)}:${deux(s % 60)}`;
function fmtPct(p) {
  const r = Math.round(p);
  return r > 0 ? `+${r}\u202f%` : r < 0 ? `−${-r}\u202f%` : "="; // espace insécable : jamais « +5 » puis « % » à la ligne
}

/* =========================================================
   Exercices : groupes musculaires (devinés depuis le nom)
   ========================================================= */

const GROUPES = [
  { id: "pecs", nom: "Pectoraux" },
  { id: "dos", nom: "Dos" },
  { id: "epaules", nom: "Épaules" },
  { id: "bras", nom: "Bras" },
  { id: "jambes", nom: "Jambes" },
  { id: "abdos", nom: "Abdos" },
  { id: "autre", nom: "Autre" },
];
const nomGroupe = (id) => (GROUPES.find((g) => g.id === id) || GROUPES[GROUPES.length - 1]).nom;
// L'ordre compte : « leg extension » est d'abord des jambes, « extension triceps » des bras.
const MOTS_GROUPES = [
  [/leg ?ext|extensions? (des |de )?jambes|leg ?curl|ischio|quadri|squat|presse|fente|bulgare|mollet|cuisse|hip ?thrust|fessier|glute|adduct|abduct|roumain|jambes tendues|good ?morning|step ?up/, "jambes"],
  [/abdo|crunch|gainage|planche|releves? de (jambes|genoux)|russian|oblique|roue|ab ?wheel|sit.?up|hollow|dragon flag/, "abdos"],
  [/curl|biceps|triceps|barre au front|kick ?back|marteau|avant.?bras|poignet|extension|skull|dips? (aux|entre|sur) banc/, "bras"],
  [/militaire|epaule|elevation|laterale|oiseau|arnold|face ?pull|overhead|shoulder|developpe assis|shrug|trapeze|rotateur/, "epaules"],
  [/traction|tirage|rowing|\brow\b|souleve de terre|deadlift|pull.?down|pull.?up|dorsa|lombaire|t.?bar|chin.?up|superman/, "dos"],
  [/couche|\bpec|ecarte|butterfly|pompe|dips|chest|bench|incline|decline|pull.?over|developpe/, "pecs"],
];
function devinerGroupe(nom) {
  const n = sansAccents(nom);
  for (const [re, g] of MOTS_GROUPES) if (re.test(n)) return g;
  return "autre";
}
const IDEES = [
  "Développé couché", "Développé incliné haltères", "Dips", "Écarté à la poulie",
  "Tractions", "Tirage vertical", "Rowing barre", "Soulevé de terre",
  "Développé militaire", "Élévations latérales", "Face pull",
  "Curl haltères", "Curl marteau", "Extension triceps à la poulie",
  "Squat", "Presse à cuisses", "Fentes", "Leg curl", "Leg extension", "Hip thrust", "Mollets debout",
  "Crunch", "Relevés de jambes",
];

/* =========================================================
   Données
   ========================================================= */

function neuf() {
  return {
    version: 1,
    exercices: [],      // { id, nom, groupe, pas?, supprime? }
    modeles: [],        // séances types : { id, nom, items: [{ ex, series, repos }] }
    seances: [],        // séances terminées : { id, modele, nom, debut, fin, items: [{ ex, repos, series: [{ kg, reps }] }] }
    enCours: null,      // séance commencée : mêmes champs, séries { kg, reps, fait }, + repos { fin, duree }
    reglages: { objectif: 3, pas: 2.5, sons: true, ecran: true },
  };
}
const objet = (o) => (o && typeof o === "object" && !Array.isArray(o) ? o : {});
const tableau = (t) => (Array.isArray(t) ? t : []);
const nb = (v) => (typeof v === "number" && isFinite(v) ? v : null);
function valide(d) {
  return !!d && typeof d === "object" && !Array.isArray(d) && Array.isArray(d.seances) && Array.isArray(d.exercices);
}
function serieOk(x) {
  x = objet(x);
  const kg = nb(x.kg), reps = nb(x.reps);
  return { ...x, kg: kg !== null && kg >= 0 ? kg : null, reps: reps !== null && reps >= 0 ? Math.round(reps) : null };
}
function seanceOk(s) {
  return {
    ...s, nom: String(s.nom || "Séance"),
    items: tableau(s.items).filter((it) => it && it.ex).map((it) => ({
      ...it, repos: borne(Math.round(nb(it.repos) ?? 90), 0, 900), series: tableau(it.series).map(serieOk),
    })),
  };
}
// Complète sans jamais rien effacer d'utile : les champs inconnus restent tels quels.
function completer(d) {
  const n = neuf();
  d.reglages = { ...n.reglages, ...objet(d.reglages) };
  d.reglages.objectif = borne(Math.round(nb(d.reglages.objectif) ?? 3), 1, 7);
  if (!(nb(d.reglages.pas) > 0)) d.reglages.pas = 2.5;
  d.exercices = tableau(d.exercices).filter((e) => e && e.id && typeof e.nom === "string");
  for (const e of d.exercices) if (!GROUPES.some((g) => g.id === e.groupe)) e.groupe = devinerGroupe(e.nom);
  d.modeles = tableau(d.modeles).filter((m) => m && m.id).map((m) => ({
    ...m, nom: String(m.nom || "Séance"),
    items: tableau(m.items).filter((it) => it && it.ex).map((it) => ({
      ...it, series: borne(Math.round(nb(it.series) ?? 3), 1, 20), repos: borne(Math.round(nb(it.repos) ?? 90), 0, 900),
    })),
  }));
  d.seances = tableau(d.seances).filter((s) => s && s.id && s.debut).map(seanceOk);
  d.enCours = d.enCours && d.enCours.id && d.enCours.debut ? seanceOk(d.enCours) : null;
  if (!d.version) d.version = 1;
  return d;
}
// Ce que cette page a lu ou écrit en dernier : si le stockage change sans elle (restauration
// Google Drive, autre onglet), elle ne l'écrase pas avec ses anciennes données.
let dernierEcrit = null;
function charger() {
  let brut = null;
  try { brut = localStorage.getItem(CLE); } catch (e) {}
  dernierEcrit = brut;
  if (brut) {
    try { const d = JSON.parse(brut); if (valide(d)) return completer(d); } catch (e) {}
    // Jamais de perte : on garde le contenu illisible de côté avant de repartir de zéro.
    try { localStorage.setItem(CLE + ".illisible", brut); } catch (e) {}
  }
  return neuf();
}
let donnees = charger();
let attente = null;
function sauver() {
  clearTimeout(attente); attente = null;
  try {
    if (localStorage.getItem(CLE) !== dernierEcrit) { modifieAilleurs(); return false; }
    const json = JSON.stringify(donnees);
    localStorage.setItem(CLE, json);
    dernierEcrit = json;
    return true;
  } catch (e) {
    toast("Impossible d'enregistrer sur ce téléphone", { rouge: true, icone: "!" });
    return false;
  }
}
let rechargement = false;
function modifieAilleurs() {
  if (rechargement) return;
  rechargement = true;
  clearTimeout(attente); attente = null;
  toast("Tes données ont changé ailleurs : je les recharge", { icone: "↻" });
  setTimeout(() => location.reload(), 1500);
}
// Pendant la saisie au pavé : on regroupe les écritures (toujours faites avant de quitter l'app).
function sauverBientot() { clearTimeout(attente); attente = setTimeout(sauver, 500); }
function sauverSiBesoin() { if (attente) sauver(); }

const exo = (id) => donnees.exercices.find((e) => e.id === id) || { id, nom: "Exercice supprimé", groupe: "autre", supprime: true };
const exercicesVisibles = () => donnees.exercices.filter((e) => !e.supprime);
const modele = (id) => donnees.modeles.find((m) => m.id === id) || null;
const pasDe = (id) => { const e = donnees.exercices.find((x) => x.id === id); return e && e.pas > 0 ? e.pas : donnees.reglages.pas; };
const faite = (x) => !!x && x.reps > 0;
const serieVide = () => ({ kg: null, reps: null, fait: false });

function creerExercice(nom, groupe) {
  nom = majuscule(String(nom).trim().replace(/\s+/g, " ")).slice(0, 60);
  const n = sansAccents(nom);
  const ex = donnees.exercices.find((e) => sansAccents(e.nom) === n);
  if (ex) { if (ex.supprime) { delete ex.supprime; sauver(); } return ex; }
  const e = { id: nouvelId(), nom, groupe: groupe || devinerGroupe(nom), cree: new Date().toISOString() };
  donnees.exercices.push(e);
  sauver();
  return e;
}

/* =========================================================
   Analyse : records, meilleures séries, semaines (tout est recalculé)
   ========================================================= */

// 1RM estimé (formule d'Epley) : le poids qu'on pourrait soulever une seule fois.
const e1rm = (kg, reps) => (kg > 0 && reps > 0 ? (reps === 1 ? kg : kg * (1 + reps / 30)) : 0);
const RANG = { charge: 3, force: 2, reps: 1 };
const NOMS_RECORD = { charge: "Record de charge", force: "Record de force", reps: "Record de reps" };

function majMeilleurs(m, x) {
  const kg = x.kg || 0;
  if (kg > m.kg) m.kg = kg;
  const f = e1rm(kg, x.reps);
  if (f > m.e1rm) m.e1rm = f;
  if (kg === 0 && x.reps > m.reps0) m.reps0 = x.reps;
}
// Une série bat-elle les meilleures d'avant ? Plus lourd = record de charge ; plus fort à poids
// égal ou moindre = record de force (1RM estimé) ; au poids du corps = record de reps.
function typeRecord(x, m) {
  const kg = x.kg || 0;
  if (kg > 0) {
    if (kg > m.kg + 1e-9) return "charge";
    if (e1rm(kg, x.reps) > m.e1rm + 0.05) return "force";
    return null;
  }
  return m.reps0 > 0 && x.reps > m.reps0 ? "reps" : null;
}
const cleTop = (x) => e1rm(x.kg || 0, x.reps) * 1000 + x.reps;
function metriques(series) {
  let charge = 0, force = 0, volume = 0, reps = 0, total = 0, top = series[0];
  for (const x of series) {
    const kg = x.kg || 0;
    charge = Math.max(charge, kg);
    force = Math.max(force, e1rm(kg, x.reps));
    volume += kg * x.reps;
    reps = Math.max(reps, x.reps);
    total += x.reps;
    if (cleTop(x) > cleTop(top)) top = x;
  }
  return { charge, force, volume, reps, total, top };
}

let A = null;
function analyser() {
  const fins = donnees.seances.filter((s) => s.fin).sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0));
  const parEx = {}, courant = {}, records = [];
  for (const s of fins) {
    for (const it of s.items) {
      const series = it.series.filter(faite);
      if (!series.length) continue;
      const histo = !!courant[it.ex];
      const m = courant[it.ex] || (courant[it.ex] = { kg: 0, e1rm: 0, reps0: 0 });
      let meilleur = null;
      for (const x of series) {
        const t = histo ? typeRecord(x, m) : null;
        if (t && (!meilleur || RANG[t] > RANG[meilleur.type] || (RANG[t] === RANG[meilleur.type] && cleTop(x) > cleTop(meilleur))))
          meilleur = { ex: it.ex, seance: s.id, date: s.debut, type: t, kg: x.kg || 0, reps: x.reps };
        majMeilleurs(m, x);
      }
      if (meilleur) records.push(meilleur);
      (parEx[it.ex] = parEx[it.ex] || []).push({ s, date: s.debut, series, ...metriques(series) });
    }
  }
  const semaines = {}, jours = {};
  for (const s of fins) {
    const k = jourDe(s.debut), w = lundiDe(k);
    semaines[w] = (semaines[w] || 0) + 1;
    jours[k] = (jours[k] || 0) + 1;
  }
  return { fins, parEx, courant, records, semaines, jours, serie: serieSemaines(semaines), resumes: {} };
}

// Série de semaines où l'objectif est atteint. La semaine en cours ne casse rien tant qu'elle n'est pas finie.
function serieSemaines(sem) {
  const obj = donnees.reglages.objectif;
  const cette = lundiDe(aujourdhui());
  let actuelle = (sem[cette] || 0) >= obj ? 1 : 0;
  for (let w = decaler(cette, -7); (sem[w] || 0) >= obj; w = decaler(w, -7)) actuelle++;
  const cles = Object.keys(sem).sort();
  let record = 0, c = 0;
  if (cles.length) {
    for (let w = cles[0]; w <= cette; w = decaler(w, 7)) {
      if ((sem[w] || 0) >= obj) { c++; record = Math.max(record, c); } else if (w !== cette) c = 0;
    }
  }
  return { actuelle, record: Math.max(record, actuelle) };
}

function precedente(exId, avant, sauf) {
  const l = A.parEx[exId] || [];
  for (let i = l.length - 1; i >= 0; i--) if (l[i].s.id !== sauf && l[i].date < avant) return l[i];
  return null;
}
function meilleursAvant(exId, avant, sauf) {
  let m = null;
  for (const e of A.parEx[exId] || []) {
    if (e.s.id === sauf || e.date >= avant) continue;
    m = m || { kg: 0, e1rm: 0, reps0: 0 };
    for (const x of e.series) majMeilleurs(m, x);
  }
  return m;
}
// Vert : plus lourd, ou plus de reps au même poids. Rouge : plus léger, ou moins de reps au même poids.
function verdictDe(x, ref) {
  if (!ref || !(x.reps > 0)) return null;
  const kg = x.kg || 0, rkg = ref.kg || 0;
  if (kg > rkg + 1e-9) return "plus";
  if (kg < rkg - 1e-9) return "moins";
  return x.reps > ref.reps ? "plus" : x.reps < ref.reps ? "moins" : "egal";
}
function verdictKg(x, ref) {
  if (!ref || x.kg == null) return null;
  const kg = x.kg || 0, rkg = ref.kg || 0;
  return kg > rkg + 1e-9 ? "plus" : kg < rkg - 1e-9 ? "moins" : "egal";
}
const refDans = (prev, j) => (prev && prev.length ? prev[j] || prev[prev.length - 1] : null);

// Résumé d'une séance terminée (gardé en cache jusqu'au prochain recalcul).
function resumeSeance(s) {
  if (A.resumes[s.id]) return A.resumes[s.id];
  let tonnage = 0, series = 0, plus = 0, egal = 0, moins = 0;
  for (const it of s.items) {
    const prev = precedente(it.ex, s.debut, s.id);
    it.series.filter(faite).forEach((x, j) => {
      series++;
      tonnage += (x.kg || 0) * x.reps;
      const v = verdictDe(x, refDans(prev && prev.series, j));
      if (v === "plus") plus++; else if (v === "moins") moins++; else if (v === "egal") egal++;
    });
  }
  const duree = s.fin ? new Date(s.fin) - new Date(s.debut) : 0;
  const records = A.records.filter((r) => r.seance === s.id);
  return (A.resumes[s.id] = { tonnage, series, plus, egal, moins, duree, records });
}

function conseillee() {
  const ms = donnees.modeles.filter((m) => m.items.length);
  if (!ms.length) return null;
  const derniere = {};
  for (const s of A.fins) if (s.modele) derniere[s.modele] = s.debut;
  let choix = null;
  for (const m of ms) { const d = derniere[m.id] || ""; if (!choix || d < choix.d) choix = { m, d }; }
  if (choix.d && jourDe(choix.d) === aujourdhui()) return null; // déjà faite aujourd'hui : rien à conseiller
  return { m: choix.m, texte: choix.d ? ilYA(choix.d) : "jamais faite" };
}
function derniereDe(modeleId) {
  for (let i = A.fins.length - 1; i >= 0; i--) if (A.fins[i].modele === modeleId) return A.fins[i];
  return null;
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
  e.append(...enfants.flat(Infinity).filter((x) => x != null && x !== false).map((x) => (typeof x === "number" ? String(x) : x)));
  return e;
}
// Comme replaceChildren, mais ignore les trous (null, false) au lieu d'afficher « null ».
function remplir(noeud, ...enfants) {
  noeud.replaceChildren(...enfants.flat(Infinity).filter((x) => x != null && x !== false).map((x) => (typeof x === "number" ? String(x) : x)));
  return noeud;
}
function icone(nom, classe = "") {
  const t = document.createElement("template");
  t.innerHTML = ico(nom, classe);
  return t.content.firstChild;
}
function rejouer(elm, classe) {
  if (!elm) return;
  elm.classList.remove(classe);
  void elm.offsetWidth;
  elm.classList.add(classe);
  elm.addEventListener("animationend", () => elm.classList.remove(classe), { once: true });
}

const COULEURS_FETE = ["#3ddc84", "#ffffff", "#17b866", "#ffc53d", "#b8f5d0"];
const COULEURS_OR = ["#ffd66b", "#f5b400", "#fff2c4", "#ffffff", "#e0a100"];
function confettis(depuis, couleurs = COULEURS_FETE, n = 60) {
  if (reduit || !depuis) return;
  const r = depuis.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const c = el("i", { class: "confetti" + (i % 3 === 0 ? " rond" : ""), style: `background:${couleurs[i % couleurs.length]}` });
    document.body.append(c);
    const ang = Math.random() * Math.PI * 2, force = 80 + Math.random() * 170;
    const dx = Math.cos(ang) * force, dy = Math.sin(ang) * force - 120;
    const rot = (Math.random() - 0.5) * 1080;
    c.animate([
      { transform: `translate(${cx}px, ${cy}px) rotate(0) scale(.6)`, opacity: 1 },
      { transform: `translate(${cx + dx}px, ${cy + dy}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${cx + dx * 1.3}px, ${cy + dy + 440}px) rotate(${rot}deg) scale(.8)`, opacity: 0 },
    ], { duration: 1400 + Math.random() * 800, easing: "cubic-bezier(.25,.6,.4,1)" }).finished.then(() => c.remove(), () => c.remove());
  }
}
function etincelles(depuis, couleur = "#3ddc84") {
  if (reduit || !depuis) return;
  const r = depuis.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 10; i++) {
    const c = el("i", { class: "confetti rond", style: `background:${i % 2 ? couleur : "#fff"};width:6px;height:6px` });
    document.body.append(c);
    const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4, d = 24 + Math.random() * 18;
    c.animate([
      { transform: `translate(${cx}px, ${cy}px) scale(1)`, opacity: 1 },
      { transform: `translate(${cx + Math.cos(ang) * d}px, ${cy + Math.sin(ang) * d}px) scale(.2)`, opacity: 0 },
    ], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }).finished.then(() => c.remove(), () => c.remove());
  }
}
function flashRecord(type, x) {
  document.querySelector(".record-flash")?.remove();
  const f = el("div", { class: "record-flash", role: "status" }, icone("couronne"), el("b", {}, NOMS_RECORD[type] || "Nouveau record"), el("span", {}, fmtSerie(x)));
  document.body.append(f);
  setTimeout(() => f.remove(), 2000);
}

let minuteurToast;
function toast(texte, { rouge = false, or = false, icone: ic = "✓", action, surAction } = {}) {
  const t = $("toast");
  if (!$("fete").hidden) return; // le bilan dit déjà tout
  remplir(t,
    el("span", { class: "ok" + (rouge ? " rouge" : or ? " or" : "") }, ic),
    el("span", { class: "txt" }, texte),
    action ? el("button", { onclick: () => { t.classList.remove("visible"); surAction(); } }, action) : null,
  );
  t.classList.add("visible");
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove("visible"), action ? 5000 : 2400);
}

/* =========================================================
   Feuille du bas (avec pages empilées : retour en arrière possible)
   ========================================================= */

const Feuille = (() => {
  let pile = [], minuterie = null;
  const boite = () => $("feuille"), panneau = () => $("feuille-panneau");
  function dessiner(garder) {
    const haut = pile[pile.length - 1];
    const p = panneau(), y = p.scrollTop;
    p.className = "panneau" + (haut.classe ? " " + haut.classe : "");
    remplir(p, el("div", { class: "poignee" }), ...[haut.rendu()].flat(Infinity).filter(Boolean));
    p.scrollTop = garder ? y : haut.y || 0;
  }
  function montrer() {
    const b = boite();
    clearTimeout(minuterie);
    document.body.classList.add("bloque");
    // Encore visible (en train de se fermer) : on la rouvre tout de suite.
    if (!b.hidden) { b.classList.add("ouvert"); return; }
    b.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => { if (pile.length) b.classList.add("ouvert"); }));
  }
  function ouvrir(rendu, o = {}) {
    pile = [{ rendu, ...o }];
    dessiner();
    montrer();
    panneau().scrollTop = 0; // une fois visible : le navigateur peut avoir gardé la position d'une feuille fermée
  }
  function empiler(rendu, o = {}) {
    if (!pile.length) return ouvrir(rendu, o);
    pile[pile.length - 1].y = panneau().scrollTop;
    pile.push({ rendu, ...o });
    dessiner();
  }
  function retour() { if (pile.length <= 1) return fermer(); pile.pop(); dessiner(); }
  function rafraichir() { if (pile.length) dessiner(true); }
  function fermer() {
    const b = boite();
    pile = [];
    if (b.hidden) return;
    b.classList.remove("ouvert");
    if ($("fete").hidden) document.body.classList.remove("bloque");
    clearTimeout(minuterie);
    minuterie = setTimeout(() => { if (!pile.length) { b.hidden = true; remplir(panneau()); } }, 340);
  }
  return { ouvrir, empiler, retour, rafraichir, fermer, get ouverte() { return pile.length > 0; }, get profondeur() { return pile.length; } };
})();
const ouvrirOuEmpiler = (rendu, o) => (Feuille.ouverte ? Feuille.empiler(rendu, o) : Feuille.ouvrir(rendu, o));

function tete(titre, { action = null } = {}) {
  const retour = Feuille.profondeur > 1;
  return el("div", { class: "f-tete" },
    retour ? el("button", { class: "rond petit", "aria-label": "Retour", onclick: () => Feuille.retour() }, icone("retour")) : null,
    el("h2", {}, titre),
    action,
    retour ? null : el("button", { class: "rond petit", "aria-label": "Fermer", onclick: () => Feuille.fermer() }, icone("croix")));
}

function compteur({ valeur, min, max, pas = 1, format = String, nom = "", onchange }) {
  let v = valeur;
  const out = el("output", {}, format(v));
  const moins = el("button", { "aria-label": `${nom} : moins`, onclick: () => maj(v - pas) }, icone("moins"));
  const plus = el("button", { "aria-label": `${nom} : plus`, onclick: () => maj(v + pas) }, icone("plus"));
  function etat() { moins.disabled = v <= min; plus.disabled = v >= max; }
  function maj(n) {
    n = borne(n, min, max);
    if (n === v) return;
    v = n;
    out.textContent = format(v);
    etat();
    vibrer(6);
    onchange(v);
  }
  etat();
  return el("span", { class: "compteur" }, moins, out, plus);
}
function tuile(ic, valeur, legende, classeIco = "") {
  return el("div", { class: "tuile" }, icone(ic, classeIco), el("b", {}, valeur), el("span", {}, legende));
}
function anneau(n, obj, taille = 76) {
  const r = taille / 2 - 6, C = 2 * Math.PI * r, ratio = Math.min(1, n / obj);
  return el("div", { class: "anneau" + (n >= obj ? " atteint" : ""), style: `width:${taille}px;height:${taille}px` ,
    html: `<svg viewBox="0 0 ${taille} ${taille}"><circle class="piste" cx="${taille / 2}" cy="${taille / 2}" r="${r}"/><circle class="arc" cx="${taille / 2}" cy="${taille / 2}" r="${r}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - ratio)}"/></svg>` },
    el("span", { class: "anneau-txt" }, el("span", {}, String(n), el("small", {}, `/${obj}`))));
}
function badgePct(p) {
  const r = Math.round(p);
  return el("span", { class: "badge le-pct" + (r > 0 ? " vert" : r < 0 ? " rouge" : "") }, fmtPct(p));
}

/* =========================================================
   Onglet « Séance » (accueil)
   ========================================================= */

function rendreAccueil() {
  $("date-du-jour").textContent = majuscule(fmtLong.format(new Date()));
  rendreHeros();
  rendreSemaine();
  rendreDerniere();
  rendreRecords();
}

function compterSeries(s) {
  let faites = 0, total = 0;
  for (const it of s.items) for (const x of it.series) { total++; if (x.fait || faite(x) && s.fin) faites++; }
  return { faites, total };
}

function rendreHeros() {
  const h = $("heros");
  const ec = donnees.enCours;
  if (ec) {
    const c = compterSeries(ec);
    remplir(h, el("div", { class: "carte en-cours" },
      el("span", { class: "pastille vert" }, el("i", { class: "point-vif" }), "Séance en cours"),
      el("div", { class: "en-cours-ligne" },
        el("h2", {}, ec.nom),
        el("span", { class: "chrono", "data-chrono": ec.debut }, fmtChrono(Date.now() - new Date(ec.debut)))),
      el("p", { class: "aide", style: "margin:-6px 0 14px" }, c.faites ? `${pluriel(c.faites, "série")} sur ${c.total} ${c.faites > 1 ? "faites" : "faite"}` : `${pluriel(c.total, "série")} à faire`),
      el("button", { class: "bouton principal", onclick: () => ouvrirLogger() }, icone("lecture"), "Reprendre la séance")));
    return;
  }
  const c = conseillee();
  const n = donnees.modeles.length;
  remplir(h,
    el("button", { class: "gros-bouton", onclick: ouvrirChoix },
      el("span", { class: "plus-rond" }, icone("plus")),
      el("span", { class: "gb-txt" }, el("b", {}, "Nouvelle séance"),
        el("small", {}, n ? `${pluriel(n, "séance type", "séances types")} ${n > 1 ? "prêtes" : "prête"}` : "Crée ta première séance type")),
      icone("chevron")),
    c ? el("button", { class: "conseil", onclick: () => demarrer(c.m) },
      el("span", { class: "pastille" }, "Conseillée"),
      el("span", { class: "conseil-txt" }, el("b", {}, c.m.nom), ` · ${c.texte}`),
      el("span", { class: "lecture" }, icone("lecture"))) : null,
    !n && !A.fins.length ? bienvenue() : null);
}

function bienvenue() {
  return el("div", { class: "carte bienvenue" },
    el("h2", {}, "Bienvenue dans Salle"),
    el("ol", { class: "etapes" },
      el("li", {}, el("span", { class: "n" }, "1"), el("span", {}, el("b", {}, "Crée ta séance type"), " : ses exercices, le nombre de séries et le temps de repos.")),
      el("li", {}, el("span", { class: "n" }, "2"), el("span", {}, el("b", {}, "Chaque jour, « Nouvelle séance »"), " : choisis-la, il ne reste qu'à noter le poids et les reps.")),
      el("li", {}, el("span", { class: "n" }, "3"), el("span", {}, el("b", {}, "Bats la dernière fois"), " : tes chiffres d'avant sont en transparence. ",
        el("b", { class: "vert" }, "Vert"), " quand tu progresses, ", el("b", { class: "rouge" }, "rouge"), " quand tu fais moins."))),
    el("button", { class: "bouton principal", onclick: () => { ouvrirChoix(); editerModele(null); } }, icone("plus"), "Créer ma première séance"));
}

function rendreSemaine() {
  const b = $("bloc-semaine");
  if (!A.fins.length) { remplir(b); return; }
  const obj = donnees.reglages.objectif;
  const lundi = lundiDe(aujourdhui()), t = aujourdhui();
  const n = A.semaines[lundi] || 0;
  const S = A.serie;
  const jours = [];
  for (let i = 0; i < 7; i++) {
    const k = decaler(lundi, i), nb = A.jours[k] || 0;
    jours.push(el("div", {},
      el("span", {}, ["L", "M", "M", "J", "V", "S", "D"][i]),
      el("i", { class: [nb ? "fait" : "", k === t ? "auj" : "", k > t ? "futur" : ""].join(" ").trim() }, nb > 1 ? el("b", {}, `×${nb}`) : nb ? icone("coche") : null)));
  }
  remplir(b, el("div", { class: "carte semaine" },
    el("div", { class: "semaine-haut" },
      anneau(n, obj),
      el("div", { class: "semaine-txt" },
        el("b", {}, n >= obj ? (n > obj ? "Objectif dépassé" : "Objectif atteint") : `Encore ${pluriel(obj - n, "séance")}`),
        el("span", {}, `${pluriel(n, "séance")} sur ${obj} cette semaine`),
        S.actuelle > 0 ? el("span", { class: "flamme" }, icone("flamme"), `${pluriel(S.actuelle, "semaine")} d'affilée`)
          : S.record > 0 ? el("span", { class: "flamme" }, icone("flamme"), `Record : ${pluriel(S.record, "semaine")}`) : null)),
    el("div", { class: "jours" }, ...jours)));
}

function ligneSeance(s) {
  const r = resumeSeance(s);
  const d = new Date(s.debut);
  return el("button", { class: "ligne-seance", onclick: () => ouvrirSeance(s.id) },
    el("span", { class: "date-bloc" }, el("b", {}, String(d.getDate())), el("small", {}, fmtJourSem.format(d).replace(".", ""))),
    el("span", { class: "ls-txt" }, el("b", {}, s.nom),
      el("small", {}, [fmtDuree(r.duree), fmtTonnage(r.tonnage), pluriel(r.series, "série")].join(" · "))),
    el("span", { class: "ls-badges" },
      r.records.length ? el("span", { class: "badge or" }, icone("couronne"), String(r.records.length)) : null,
      r.plus ? el("span", { class: "badge vert" }, icone("haut"), String(r.plus)) : null,
      icone("chevron")));
}

function rendreDerniere() {
  const b = $("bloc-derniere");
  const s = A.fins[A.fins.length - 1];
  if (!s) { remplir(b); return; }
  remplir(b,
    el("p", { class: "titre-section" }, el("span", {}, "Dernière séance"), el("button", { onclick: () => allerA("progres") }, "Historique")),
    el("div", { class: "carte" }, ligneSeance(s)));
}

function ligneRecord(r) {
  return el("button", { class: "ligne-record", onclick: () => ouvrirExercice(r.ex) },
    el("span", { class: "medaille" }, icone("couronne")),
    el("span", { class: "lr-txt" }, el("b", {}, exo(r.ex).nom), el("small", {}, `${NOMS_RECORD[r.type]} · ${quand(r.date)}`)),
    el("span", { class: "lr-val" }, fmtSerie(r)));
}
function rendreRecords() {
  const b = $("bloc-records");
  const recs = A.records.slice(-4).reverse();
  if (!recs.length) { remplir(b); return; }
  remplir(b, el("p", { class: "titre-section" }, "Records récents"), el("div", { class: "carte" }, ...recs.map(ligneRecord)));
}

/* =========================================================
   Nouvelle séance : choisir une séance type
   ========================================================= */

function ouvrirChoix() {
  if (donnees.enCours) { ouvrirLogger(); return; }
  Feuille.ouvrir(rendreChoix);
}
function rendreChoix() {
  const ms = donnees.modeles;
  const c = conseillee();
  const cartes = ms.map((m) => {
    const d = derniereDe(m.id);
    const series = m.items.reduce((n, it) => n + it.series, 0);
    const conseil = c && c.m.id === m.id && ms.length > 1;
    return el("div", { class: "carte-modele" + (conseil ? " conseillee" : "") },
      el("button", { class: "cm-principal", onclick: () => demarrer(m), "aria-label": `Commencer ${m.nom}` },
        el("span", { class: "cm-txt" },
          conseil ? el("span", { class: "pastille encre" }, "Conseillée") : null,
          el("b", {}, m.nom),
          el("span", { class: "cm-ex" }, m.items.length ? m.items.map((it) => exo(it.ex).nom).join(" · ") : "Aucun exercice"),
          el("span", { class: "cm-meta" }, [pluriel(m.items.length, "exercice"), pluriel(series, "série"), d ? `dernière fois ${quand(d.debut)}` : "jamais faite"].join(" · ")))),
      el("button", { class: "cm-modif", "aria-label": `Modifier ${m.nom}`, onclick: () => editerModele(m.id) }, icone("crayon")),
      el("button", { class: "cm-go", "aria-label": `Commencer ${m.nom}`, onclick: () => demarrer(m) }, icone("lecture")));
  });
  return [
    tete("Quelle séance ?"),
    ms.length ? cartes : el("div", { class: "vide" },
      icone("haltere", "grand"),
      el("b", {}, "Pas encore de séance type"),
      el("p", {}, "Crée ta séance une fois (exercices, séries, repos) : chaque jour, il suffira de la choisir ici.")),
    el("div", { class: "choix-actions" },
      el("button", { class: "bouton" + (ms.length ? "" : " principal"), onclick: () => editerModele(null) }, icone("plus"), "Séance type"),
      el("button", { class: "bouton", onclick: () => demarrer(null) }, icone("haltere"), "Séance libre")),
  ];
}

/* =========================================================
   Séances types : créer, modifier
   ========================================================= */

function editerModele(id) {
  const m = id ? modele(id) : null;
  const etat = { id, nom: m ? m.nom : "", items: m ? m.items.map((it) => ({ ...it })) : [] };
  ouvrirOuEmpiler(() => rendreEditeur(etat));
}
function nomParDefaut() {
  const noms = new Set(donnees.modeles.map((m) => m.nom));
  for (let i = 0; i < 26; i++) { const n = `Séance ${String.fromCharCode(65 + i)}`; if (!noms.has(n)) return n; }
  return "Séance";
}
function rendreEditeur(etat) {
  const nom = el("input", {
    class: "champ", value: etat.nom, placeholder: "Ex. Push, Haut du corps, Jambes…", maxlength: "40",
    autocapitalize: "sentences", autocomplete: "off", enterkeyhint: "done",
    oninput: (e) => { etat.nom = e.target.value; },
    onkeydown: (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } },
  });
  const items = etat.items.map((it, i) => el("div", { class: "item-modele" },
    el("div", { class: "im-haut" },
      el("span", { class: "im-num" }, String(i + 1)),
      el("span", { class: "im-nom" }, exo(it.ex).nom),
      el("button", { class: "rond", "aria-label": "Monter", disabled: i === 0, onclick: () => { [etat.items[i - 1], etat.items[i]] = [etat.items[i], etat.items[i - 1]]; Feuille.rafraichir(); } }, icone("monter")),
      el("button", { class: "rond bas", "aria-label": "Descendre", disabled: i === etat.items.length - 1, onclick: () => { [etat.items[i + 1], etat.items[i]] = [etat.items[i], etat.items[i + 1]]; Feuille.rafraichir(); } }, icone("monter")),
      el("button", { class: "rond", "aria-label": `Retirer ${exo(it.ex).nom}`, onclick: () => { etat.items.splice(i, 1); Feuille.rafraichir(); } }, icone("croix"))),
    el("div", { class: "im-bas" },
      compteur({ valeur: it.series, min: 1, max: 12, nom: "Séries", format: (v) => pluriel(v, "série"), onchange: (v) => { it.series = v; } }),
      el("span", { class: "im-reglage" }, icone("chrono"),
        compteur({ valeur: it.repos, min: 0, max: 600, pas: 15, nom: "Repos", format: fmtRepos, onchange: (v) => { it.repos = v; } })))));
  return [
    tete(etat.id ? "Modifier la séance" : "Nouvelle séance type"),
    el("label", { class: "champ-etiquette" }, "Nom"), nom,
    el("p", { class: "champ-etiquette" }, etat.items.length ? `Exercices · ${etat.items.length}` : "Exercices"),
    etat.items.length ? el("div", { class: "bloc" }, ...items)
      : el("p", { class: "aide", style: "margin: 0 4px 4px" }, "Ajoute les exercices de cette séance, dans l'ordre où tu les fais. Tu régleras ensuite le nombre de séries et le repos de chacun."),
    el("button", { class: "bouton contour", style: "margin-top:10px", onclick: () => choisirExercices({
      titre: "Ajouter des exercices",
      deja: new Set(etat.items.map((it) => it.ex)),
      valider: (ids) => {
        for (const id of ids) etat.items.push({ ex: id, series: seriesHabituelles(id), repos: reposHabituel(id) });
        Feuille.retour();
      },
    }) }, icone("plus"), "Ajouter des exercices"),
    etat.id ? el("button", { class: "bouton danger", style: "margin-top:8px", onclick: () => supprimerModele(etat.id) }, "Supprimer cette séance type") : null,
    el("div", { class: "f-pied" }, el("button", { class: "bouton principal", onclick: () => enregistrerModele(etat) }, "Enregistrer")),
  ];
}
function seriesHabituelles(id) {
  const l = A.parEx[id];
  if (l && l.length) return borne(l[l.length - 1].series.length, 1, 12);
  for (const m of donnees.modeles) for (const it of m.items) if (it.ex === id) return it.series;
  return 3;
}
function reposHabituel(id) {
  for (const m of donnees.modeles) for (const it of m.items) if (it.ex === id) return it.repos;
  return 90;
}
function enregistrerModele(etat) {
  if (!etat.items.length) { toast("Ajoute au moins un exercice", { rouge: true, icone: "!" }); return; }
  const nom = etat.nom.trim().replace(/\s+/g, " ") || nomParDefaut();
  const items = etat.items.map((it) => ({ ex: it.ex, series: it.series, repos: it.repos }));
  if (etat.id && modele(etat.id)) Object.assign(modele(etat.id), { nom, items, maj: new Date().toISOString() });
  else donnees.modeles.push({ id: nouvelId(), nom, items, cree: new Date().toISOString() });
  sauver();
  Feuille.retour();
  rendre();
  toast(etat.id ? "Séance modifiée" : `« ${nom} » est prête`);
}
function supprimerModele(id) {
  const m = modele(id);
  if (!m || !confirm(`Supprimer la séance type « ${m.nom} » ?\n\nLes séances déjà faites restent dans ton historique.`)) return;
  const avant = JSON.stringify(donnees);
  donnees.modeles = donnees.modeles.filter((x) => x.id !== id);
  sauver();
  Feuille.retour();
  rendre();
  toast("Séance type supprimée", { action: "Annuler", surAction: () => restaurerInstantane(avant) });
}
function restaurerInstantane(avant) {
  donnees = completer(JSON.parse(avant));
  sauver();
  A = analyser();
  Feuille.fermer();
  rendre();
  toast("C'est annulé");
}

/* =========================================================
   Choisir des exercices (dans une séance type ou une séance)
   ========================================================= */

function choisirExercices(o) {
  const sel = { choisis: [], recherche: "" };
  ouvrirOuEmpiler(() => rendreSelecteur(o, sel));
}
function derniereFoisTexte(id) {
  const l = A.parEx[id];
  if (!l || !l.length) return nomGroupe(exo(id).groupe);
  const d = l[l.length - 1];
  return `${fmtSerie(d.top)} · ${quand(d.date)}`;
}
function rendreSelecteur(o, sel) {
  const liste = el("div");
  const pied = el("div", { class: "f-pied" });
  const champ = el("input", {
    type: "search", value: sel.recherche, placeholder: "Rechercher ou créer un exercice",
    autocomplete: "off", autocorrect: "off", spellcheck: "false", autocapitalize: "sentences", enterkeyhint: "done",
    oninput: (e) => { sel.recherche = e.target.value; majListe(); },
    onkeydown: (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const q = sel.recherche.trim();
      if (q && !exercicesVisibles().some((x) => sansAccents(x.nom) === sansAccents(q))) creer(q); else e.target.blur();
    },
  });
  function creer(nom) {
    nom = nom.trim();
    if (!nom) return;
    const e = creerExercice(nom);
    if (!o.deja.has(e.id) && !sel.choisis.includes(e.id)) sel.choisis.push(e.id);
    sel.recherche = "";
    champ.value = "";
    vibrer();
    majListe();
  }
  function ligne(e) {
    const deja = o.deja.has(e.id), choisi = sel.choisis.includes(e.id);
    return el("button", {
      class: `choix-ex${choisi ? " choisi" : ""}${deja ? " deja" : ""}`, disabled: deja,
      onclick: () => {
        if (choisi) sel.choisis = sel.choisis.filter((x) => x !== e.id); else sel.choisis.push(e.id);
        vibrer(6);
        majListe();
      },
    }, el("span", { class: "case" }, icone("coche")),
    el("span", { class: "ce-txt" }, el("b", {}, e.nom), el("small", {}, deja ? "Déjà dans la séance" : derniereFoisTexte(e.id))));
  }
  function majListe() {
    const q = sansAccents(sel.recherche);
    const tous = exercicesVisibles();
    const filtres = q ? tous.filter((e) => sansAccents(e.nom).includes(q)) : tous;
    const blocs = [];
    if (q && !tous.some((e) => sansAccents(e.nom) === q)) {
      const nom = majuscule(sel.recherche.trim().replace(/\s+/g, " "));
      blocs.push(el("div", { class: "bloc" }, el("button", { class: "choix-ex creer", onclick: () => creer(nom) },
        el("span", { class: "case" }, icone("plus")),
        el("span", { class: "ce-txt" }, el("b", {}, `Créer « ${nom} »`), el("small", {}, `Nouvel exercice · ${nomGroupe(devinerGroupe(nom))}`)))));
    }
    for (const g of GROUPES) {
      const l = filtres.filter((e) => e.groupe === g.id).sort(alpha);
      if (l.length) blocs.push(el("p", { class: "groupe-titre" }, g.nom), el("div", { class: "bloc" }, ...l.map(ligne)));
    }
    if (!tous.length && !q) {
      blocs.push(
        el("p", { class: "aide", style: "margin: 6px 4px 12px" }, "Tape le nom d'un exercice pour le créer (il ira aussi dans l'onglet Exercices), ou pars d'une idée :"),
        el("div", { class: "puces" }, ...IDEES.map((nom) => el("button", { class: "puce idee", onclick: () => creer(nom) }, icone("plus"), nom))));
    } else if (!q && tous.length < 8) {
      const restantes = IDEES.filter((nom) => !tous.some((e) => sansAccents(e.nom) === sansAccents(nom)));
      blocs.push(el("p", { class: "groupe-titre" }, "Idées"), el("div", { class: "puces" }, ...restantes.slice(0, 12).map((nom) => el("button", { class: "puce idee", onclick: () => creer(nom) }, icone("plus"), nom))));
    }
    remplir(liste, ...blocs);
    const n = sel.choisis.length;
    remplir(pied, el("button", { class: "bouton principal", disabled: !n, onclick: () => o.valider(sel.choisis.slice()) },
      n ? `Ajouter ${pluriel(n, "exercice")}` : "Choisis des exercices"));
  }
  majListe();
  return [tete(o.titre), el("label", { class: "recherche" }, icone("recherche"), champ), liste, pied];
}

/* =========================================================
   Séance en cours : saisie, pavé, repos
   ========================================================= */

let L = null; // { s, mode: "direct" | "edition", actif, refs, battus, original }

function demarrer(m) {
  if (donnees.enCours) { Feuille.fermer(); ouvrirLogger(); return; }
  if (m && !m.items.length) { editerModele(m.id); return; }
  const s = {
    id: nouvelId(), modele: m ? m.id : null, nom: m ? m.nom : "Séance libre",
    debut: new Date().toISOString(), fin: null,
    items: m ? m.items.map((it) => ({ ex: it.ex, repos: it.repos, series: Array.from({ length: it.series }, serieVide) })) : [],
  };
  donnees.enCours = s;
  sauver();
  Feuille.fermer();
  Sons.debloquer();
  vibrer();
  ouvrirLogger();
}

function ouvrirLogger(seance = donnees.enCours, mode = "direct") {
  if (!seance) return;
  L = { s: seance, mode, actif: null, refs: {}, battus: new Set(), original: mode === "edition" ? JSON.stringify(seance) : null };
  for (const it of seance.items) if (estBattu(it)) L.battus.add(it.ex);
  document.body.classList.add("en-seance");
  for (const v of document.querySelectorAll(".vue")) v.hidden = true;
  $("vue-seance").hidden = false;
  rendreLogger();
  window.scrollTo(0, 0);
  garderEcran(true);
}
function fermerLogger() {
  fermerPave(true);
  L = null;
  garderEcran(false);
  document.body.classList.remove("en-seance");
  $("vue-seance").hidden = true;
  $("repos").hidden = true;
  allerA(vue);
}

function refsDe(exId) {
  if (!L.refs[exId]) {
    const avant = L.mode === "direct" ? "9999" : L.s.debut;
    const p = precedente(exId, avant, L.s.id);
    L.refs[exId] = { prev: p ? p.series : null, date: p ? p.date : null, meilleurs: meilleursAvant(exId, avant, L.s.id) };
  }
  return L.refs[exId];
}
const refDe = (exId, j) => refDans(refsDe(exId).prev, j);
// Ce qui s'affiche en transparence : la même série la dernière fois, sinon la série d'avant aujourd'hui.
function fantomeDe(it, j) {
  const r = refDe(it.ex, j);
  if (r) return { kg: r.kg, reps: r.reps };
  for (let k = j - 1; k >= 0; k--) {
    const x = it.series[k];
    if (x.reps > 0 || x.kg != null) return { kg: x.kg, reps: x.reps };
  }
  return null;
}
// Couronnes : séries validées qui battent les meilleures d'avant (et les précédentes du jour).
function recordsDe(it) {
  const m0 = refsDe(it.ex).meilleurs;
  if (!m0) return [];
  const m = { ...m0 }, res = [];
  it.series.forEach((x, j) => {
    if (!(x.fait && x.reps > 0)) return;
    res[j] = typeRecord(x, m);
    majMeilleurs(m, x);
  });
  return res;
}
function estBattu(it) {
  if (!refsDe(it.ex).prev || !it.series.length || !it.series.every((x) => x.fait && x.reps > 0)) return false;
  let plus = 0;
  for (let j = 0; j < it.series.length; j++) {
    const v = verdictDe(it.series[j], refDe(it.ex, j));
    if (v === "moins") return false;
    if (v === "plus") plus++;
  }
  return plus > 0;
}
function compterVerdicts() {
  const c = { plus: 0, egal: 0, moins: 0, faites: 0, total: 0 };
  for (const it of L.s.items) it.series.forEach((x, j) => {
    c.total++;
    if (!x.fait) return;
    c.faites++;
    const v = verdictDe(x, refDe(it.ex, j));
    if (v) c[v]++;
  });
  return c;
}
function objectifDe(it) {
  const prev = refsDe(it.ex).prev;
  if (!prev) return null;
  const top = prev.reduce((a, x) => ((x.kg || 0) > (a.kg || 0) || ((x.kg || 0) === (a.kg || 0) && x.reps > a.reps) ? x : a));
  const kg = top.kg || 0;
  if (kg > 0) return `${fmtKg(kg)} × ${top.reps + 1} ou ${fmtKg(arrondi(kg + pasDe(it.ex)))} × ${top.reps}`;
  return `${top.reps + 1} reps au poids du corps`;
}

function rendreLogger() {
  const s = L.s, direct = L.mode === "direct";
  $("seance-nom").textContent = direct ? s.nom : `${s.nom} · modification`;
  $("seance-terminer").textContent = direct ? "Terminer" : "Enregistrer";
  const red = $("seance-reduire");
  remplir(red, icone(direct ? "replier" : "croix"));
  red.setAttribute("aria-label", direct ? "Revenir à l'accueil (la séance continue)" : "Annuler les modifications");
  majInfo();
  const pied = el("div", { class: "seance-pied" },
    !s.items.length ? el("div", { class: "vide seance-vide" }, icone("haltere", "grand"), el("b", {}, "Séance libre"),
      el("p", {}, "Ajoute tes exercices au fur et à mesure.")) : null,
    el("button", { class: "bouton contour", onclick: ajouterExercicesSeance }, icone("plus"), "Ajouter un exercice"),
    s.items.length ? el("button", { class: "bouton principal", onclick: direct ? terminer : enregistrerEdition }, direct ? "Terminer la séance" : "Enregistrer les modifications") : null,
    direct ? el("button", { class: "bouton danger", onclick: () => abandonner() }, "Abandonner la séance")
      : el("button", { class: "bouton danger", onclick: () => supprimerSeance(s.id, true) }, "Supprimer cette séance"));
  remplir($("seance-liste"), ...s.items.map((it, i) => carteExercice(it, i)), pied);
  majRepos();
}

function carteExercice(it, i) {
  const e = exo(it.ex);
  const r = refsDe(it.ex);
  const recs = recordsDe(it);
  const battu = estBattu(it);
  const objectif = objectifDe(it);
  return el("article", { class: "carte-ex" + (battu ? " battu" : ""), "data-i": i },
    el("div", { class: "ce-tete" },
      el("button", { class: "ce-nom", onclick: () => ouvrirExercice(it.ex) }, el("span", {}, e.nom), icone("chevron")),
      battu ? el("span", { class: "pastille vert" }, icone("haut"), "Battu") : null,
      el("button", { class: "rond petit nu", "aria-label": `Options pour ${e.nom}`, onclick: () => menuExercice(i) }, icone("points"))),
    el("div", { class: "ce-infos" },
      objectif ? el("span", { class: "ce-info" }, icone("cible"), "Objectif ", el("b", {}, objectif))
        : el("span", { class: "ce-info" }, icone("cible"), r.prev ? "" : "Première fois : note tes charges"),
      el("button", { class: "ce-info", "aria-label": "Régler le repos", onclick: () => reglerRepos(i) }, icone("chrono"), el("b", {}, fmtRepos(it.repos)))),
    el("div", { class: "entetes", "aria-hidden": "true" }, el("span"), el("span", {}, "kg"), el("span"), el("span", {}, "reps"), el("span")),
    ...it.series.map((x, j) => ligneSerie(it, i, j, recs[j])),
    el("div", { class: "ce-pied" },
      el("button", { onclick: () => ajouterSerie(i) }, icone("plus"), "Série"),
      it.series.length > 1 ? el("button", { onclick: () => retirerSerie(i) }, icone("moins"), "Retirer") : null));
}

function ligneSerie(it, i, j, rec) {
  const x = it.series[j];
  const f = fantomeDe(it, j);
  const ref = refDe(it.ex, j);
  const v = verdictDe(x, ref), vk = verdictKg(x, ref);
  const a = L.actif && L.actif.i === i && L.actif.j === j ? L.actif : null;
  const etiquette = x.fait ? `Série ${j + 1} faite (${fmtSerie({ kg: x.kg, reps: x.reps })}) : touche pour annuler` : `Valider la série ${j + 1}`;
  return el("div", { class: `ligne${x.fait ? " faite" : ""}${x.fait && v ? " v-" + v : ""}${rec ? " record" : ""}`, "data-i": i, "data-j": j },
    el("span", { class: "num" }, rec ? icone("couronne") : String(j + 1)),
    cellule(i, j, "kg", x, f, vk, a),
    el("span", { class: "fois" }, "×"),
    cellule(i, j, "reps", x, f, v, a),
    el("button", { class: "valider", "aria-label": etiquette, onclick: () => basculerSerie(i, j) },
      icone(x.fait ? (v === "plus" ? "haut" : v === "moins" ? "bas" : "coche") : "coche")));
}

function texteFantome(champ, f) {
  if (!f) return champ === "kg" ? "kg" : "reps";
  if (champ === "kg") return f.kg > 0 ? fmtKg(f.kg) : "PDC";
  return f.reps > 0 ? String(f.reps) : "reps";
}
function cellule(i, j, champ, x, f, verdict, a) {
  const actif = !!a && a.champ === champ;
  const val = x[champ];
  let contenu, aValeur = false;
  if (actif && a.texte !== "") { contenu = a.frais ? el("span", { class: "selection" }, a.texte) : a.texte; aValeur = true; }
  else if (!actif && val != null) { contenu = champ === "kg" && val === 0 ? el("span", { class: "petit" }, "PDC") : champ === "kg" ? fmtKg(val) : String(val); aValeur = true; }
  else if (!actif && champ === "kg" && x.fait) contenu = el("span", { class: "petit" }, "PDC");
  else { const t = texteFantome(champ, f); contenu = el("span", { class: "fantome" + (/^\d/.test(t) ? "" : " petit") }, t); }
  const couleur = aValeur && verdict && verdict !== "egal" ? " " + verdict : "";
  const nom = champ === "kg" ? "Charge" : "Répétitions";
  return el("button", {
    class: `cellule ${champ}${actif ? " actif" : ""}${couleur}`,
    "aria-label": `${nom}, série ${j + 1}${val != null ? ` : ${champ === "kg" ? fmtKg(val) + " kg" : val}` : f ? `, la dernière fois ${texteFantome(champ, f)}` : ""}`,
    onclick: () => ouvrirCellule(i, j, champ),
  }, contenu);
}

const ligneEl = (i, j) => document.querySelector(`#seance-liste .ligne[data-i="${i}"][data-j="${j}"]`);
function majLigne(i, j) {
  const it = L && L.s.items[i];
  const l = ligneEl(i, j);
  if (!it || !l || !it.series[j]) return;
  l.replaceWith(ligneSerie(it, i, j, recordsDe(it)[j]));
}
function majCarte(i) {
  const c = document.querySelector(`#seance-liste .carte-ex[data-i="${i}"]`);
  if (c && L.s.items[i]) c.replaceWith(carteExercice(L.s.items[i], i));
}
function majInfo() {
  if (!L) return;
  const c = compterVerdicts();
  const morceaux = [
    L.mode === "direct" ? el("span", { "data-chrono": L.s.debut }, fmtChrono(Date.now() - new Date(L.s.debut))) : majuscule(fmtCourt.format(new Date(L.s.debut))),
    ` · ${c.faites}/${pluriel(c.total, "série")}`,
  ];
  if (c.plus) morceaux.push(" · ", el("span", { class: "vert" }, `▲ ${c.plus}`));
  if (c.moins) morceaux.push(" ", el("span", { class: "rouge" }, `▼ ${c.moins}`));
  remplir($("seance-info"), ...morceaux);
}

/* ---------- Pavé numérique ---------- */

let minuteriePave = null;

function ouvrirCellule(i, j, champ) {
  Sons.debloquer();
  const ancien = L.actif;
  const x = L.s.items[i].series[j];
  L.actif = { i, j, champ, frais: true, texte: x[champ] != null ? (champ === "kg" ? fmtSaisie(x[champ]) : String(x[champ])) : "" };
  if (ancien && (ancien.i !== i || ancien.j !== j)) majLigne(ancien.i, ancien.j);
  majLigne(i, j);
  afficherPave();
}
function afficherPave() {
  const a = L.actif;
  if (!a) return;
  const it = L.s.items[a.i], e = exo(it.ex), kg = a.champ === "kg";
  const ref = refDe(it.ex, a.j);
  $("pave-titre").textContent = `${e.nom} · série ${a.j + 1}`;
  $("pave-aide").textContent = ref ? `Dernière fois (${quand(refsDe(it.ex).date)}) : ${fmtSerie(ref)}`
    : kg ? "Charge en kg (vide = poids du corps)" : "Nombre de répétitions";
  const pas = kg ? pasDe(it.ex) : 1;
  $("pave-moins").textContent = `−${kg ? fmtKg(pas) : 1}`;
  $("pave-plus").textContent = `+${kg ? fmtKg(pas) : 1}`;
  $("pave-moins").setAttribute("aria-label", kg ? `Enlever ${fmtKg(pas)} kg` : "Une répétition de moins");
  $("pave-plus").setAttribute("aria-label", kg ? `Ajouter ${fmtKg(pas)} kg` : "Une répétition de plus");
  const virgule = $("pave-virgule");
  virgule.disabled = !kg;
  virgule.textContent = kg ? "," : "";
  const suiv = $("pave-suivant");
  suiv.classList.toggle("valide", !kg);
  remplir(suiv, ...(kg ? ["Suivant"] : [icone("coche"), "Valider"]));
  const p = $("pave");
  clearTimeout(minuteriePave);
  if (p.hidden) {
    p.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => { if (L && L.actif) p.classList.add("ouvert"); }));
  } else p.classList.add("ouvert"); // il était en train de se fermer : on le garde
  requestAnimationFrame(() => {
    if (!L || !L.actif) return;
    $("vue-seance").style.paddingBottom = p.offsetHeight + 24 + "px";
    montrerLigne(L.actif.i, L.actif.j);
  });
}
function montrerLigne(i, j) {
  const l = ligneEl(i, j);
  if (!l) return;
  const r = l.getBoundingClientRect();
  const haut = document.querySelector(".seance-haut").getBoundingClientRect().bottom + 8;
  const bas = innerHeight - ($("pave").hidden ? 0 : $("pave").offsetHeight) - 12;
  const comportement = reduit ? "auto" : "smooth";
  if (r.bottom > bas) window.scrollBy({ top: r.bottom - bas, behavior: comportement });
  else if (r.top < haut) window.scrollBy({ top: r.top - haut, behavior: comportement });
}
function fermerPave(immediat) {
  const p = $("pave");
  const a = L && L.actif;
  if (L) L.actif = null;
  if (a) majLigne(a.i, a.j);
  sauverSiBesoin();
  p.classList.remove("ouvert");
  $("vue-seance").style.paddingBottom = "";
  clearTimeout(minuteriePave);
  if (immediat) p.hidden = true;
  else minuteriePave = setTimeout(() => { if (!p.classList.contains("ouvert")) p.hidden = true; }, 300);
}
function secouer(i, j) {
  rejouer(ligneEl(i, j), "secoue");
  Sons.erreur();
}

function touche(k) {
  const a = L && L.actif;
  if (!a) return;
  const it = L.s.items[a.i], x = it.series[a.j], kg = a.champ === "kg";
  vibrer(6);
  if (k === "fermer") { fermerPave(); return; }
  if (k === "suivant") { suivant(); return; }
  if (/^\d$/.test(k)) {
    let t = a.frais ? "" : a.texte;
    if (t === "0") t = "";
    const [ent, dec] = t.split(",");
    if (dec !== undefined ? dec.length >= 2 : ent.length >= 3) { secouer(a.i, a.j); return; }
    a.texte = t + k;
  } else if (k === "virgule") {
    if (!kg) return;
    const t = a.frais ? "" : a.texte;
    if (t.includes(",")) return;
    a.texte = (t || "0") + ",";
  } else if (k === "effacer") {
    a.texte = a.frais ? "" : a.texte.slice(0, -1);
  } else if (k === "plus" || k === "moins") {
    const pas = kg ? pasDe(it.ex) : 1;
    const f = fantomeDe(it, a.j);
    const base = x[a.champ] != null ? x[a.champ] : f && f[a.champ] != null ? f[a.champ] : 0;
    const n = Math.max(0, arrondi(base + (k === "plus" ? pas : -pas)));
    a.texte = kg ? fmtSaisie(n) : String(Math.round(n));
    enregistrerSaisie(true);
    return;
  } else return;
  enregistrerSaisie(false);
}
function enregistrerSaisie(frais) {
  const a = L.actif, x = L.s.items[a.i].series[a.j];
  a.frais = frais;
  const t = a.texte.replace(",", ".").replace(/\.$/, "");
  const v = t === "" ? null : Number(t);
  x[a.champ] = v == null || !isFinite(v) ? null : a.champ === "reps" ? Math.round(v) : v;
  if (x.fait && !(x.reps > 0)) x.fait = false; // une série validée dont on efface les reps n'est plus faite
  sauverBientot();
  majLigne(a.i, a.j);
  majInfo();
}
function suivant() {
  const a = L.actif, it = L.s.items[a.i], x = it.series[a.j];
  const f = fantomeDe(it, a.j);
  if (a.champ === "kg") {
    if (x.kg == null && f && f.kg != null) x.kg = f.kg;
    L.actif = { i: a.i, j: a.j, champ: "reps", frais: true, texte: x.reps != null ? String(x.reps) : "" };
    sauverBientot();
    majLigne(a.i, a.j);
    afficherPave();
    return;
  }
  if (!(x.reps > 0)) {
    if (f && f.reps > 0) x.reps = f.reps;
    else { secouer(a.i, a.j); return; }
  }
  if (x.kg == null && f && f.kg != null) x.kg = f.kg;
  const deja = x.fait;
  x.fait = true;
  let k = a.j + 1;
  while (k < it.series.length && it.series[k].fait) k++;
  L.actif = null;
  apresValidation(a.i, a.j, deja);
  if (k < it.series.length) ouvrirCellule(a.i, k, "kg"); else fermerPave();
}

// Bouton ✓ : sans rien taper, on refait la même chose que la dernière fois.
function basculerSerie(i, j) {
  Sons.debloquer();
  const it = L.s.items[i], x = it.series[j];
  if (x.fait) {
    x.fait = false;
    sauver();
    majCarte(i);
    majInfo();
    vibrer(6);
    return;
  }
  const f = fantomeDe(it, j);
  if (!(x.reps > 0)) {
    if (f && f.reps > 0) { x.reps = f.reps; if (x.kg == null && f.kg != null) x.kg = f.kg; }
    else { ouvrirCellule(i, j, x.kg == null ? "kg" : "reps"); return; }
  } else if (x.kg == null && f && f.kg != null) x.kg = f.kg;
  x.fait = true;
  if (L.actif && L.actif.i === i && L.actif.j === j) fermerPave(true);
  apresValidation(i, j, false);
}

function apresValidation(i, j, deja) {
  const it = L.s.items[i], x = it.series[j];
  sauver();
  majCarte(i);
  majInfo();
  const l = ligneEl(i, j);
  rejouer(l, "pop");
  if (deja || L.mode !== "direct") return;
  const rec = recordsDe(it)[j];
  const v = verdictDe(x, refDe(it.ex, j));
  if (rec) {
    Sons.record();
    vibrer(30);
    flashRecord(rec, x);
    confettis(l, COULEURS_OR, 50);
  } else {
    Sons.serie(v, Math.max(0, compterVerdicts().plus - 1));
    vibrer(v === "plus" ? 18 : 10);
    if (v === "plus" && l) etincelles(l.querySelector(".valider"));
  }
  if (!L.battus.has(it.ex) && estBattu(it)) {
    L.battus.add(it.ex);
    setTimeout(() => toast(`${exo(it.ex).nom} : la dernière fois est battue`, { icone: "▲" }), rec ? 1500 : 250);
  }
  const reste = L.s.items.some((y) => y.series.some((z) => !z.fait));
  if (reste) lancerRepos(it.repos);
  else { L.s.repos = null; majRepos(); setTimeout(() => toast("Toutes les séries sont faites : touche Terminer"), rec ? 2000 : 400); }
}

function ajouterSerie(i) {
  const it = L.s.items[i];
  it.series.push(serieVide());
  sauver();
  majCarte(i);
  majInfo();
  vibrer(6);
}
function retirerSerie(i) {
  const it = L.s.items[i];
  if (it.series.length <= 1) return;
  const x = it.series[it.series.length - 1];
  if (x.reps > 0 && !confirm(`Retirer la série ${it.series.length} (${fmtSerie(x)}) ?`)) return;
  if (L.actif && L.actif.i === i && L.actif.j === it.series.length - 1) fermerPave(true);
  it.series.pop();
  sauver();
  majCarte(i);
  majInfo();
}

function reglerRepos(i) {
  const it = L.s.items[i];
  Feuille.ouvrir(() => [
    tete("Temps de repos"),
    el("p", { class: "f-sous" }, exo(it.ex).nom),
    el("div", { class: "bloc", style: "padding:18px;display:flex;justify-content:center" },
      compteur({ valeur: it.repos, min: 0, max: 600, pas: 15, nom: "Repos", format: fmtRepos, onchange: (v) => { it.repos = v; sauver(); majCarte(i); } })),
    el("p", { class: "aide centre", style: "margin-top:12px" }, "Le minuteur démarre tout seul quand tu valides une série. À 0:00, il ne se lance pas."),
    el("div", { class: "f-pied" }, el("button", { class: "bouton principal", onclick: () => Feuille.fermer() }, "OK")),
  ]);
}

function menuExercice(i) {
  const it = L.s.items[i], e = exo(it.ex), n = L.s.items.length;
  const deplacer = (d) => {
    const s = L.s.items;
    [s[i], s[i + d]] = [s[i + d], s[i]];
    sauver();
    Feuille.fermer();
    rendreLogger();
  };
  const lien = (ic, titre, sous, action, classe = "") => el("button", { class: "reglage " + classe, onclick: action },
    icone(ic), el("span", { class: "reglage-txt" }, el("b", {}, titre), sous ? el("small", {}, sous) : null));
  Feuille.ouvrir(() => [
    tete(e.nom),
    el("div", { class: "bloc" },
      lien("courbe", "Voir la progression", "Courbe, records et historique", () => ouvrirExercice(it.ex)),
      i > 0 ? lien("monter", "Faire plus tôt", "Monter d'un cran dans la séance", () => deplacer(-1)) : null,
      i < n - 1 ? el("button", { class: "reglage", onclick: () => deplacer(1) }, icone("monter", "retourne"), el("span", { class: "reglage-txt" }, el("b", {}, "Faire plus tard"), el("small", {}, "Descendre d'un cran"))) : null,
      lien("croix", "Retirer de cette séance", "La séance type ne change pas", () => {
        if (it.series.some((x) => x.reps > 0) && !confirm(`Retirer ${e.nom} de la séance ? Ses séries notées seront perdues.`)) return;
        L.s.items.splice(i, 1);
        if (L.actif) L.actif = null;
        fermerPave(true);
        sauver();
        Feuille.fermer();
        rendreLogger();
      })),
  ]);
}

function ajouterExercicesSeance() {
  fermerPave(true);
  choisirExercices({
    titre: "Ajouter à la séance",
    deja: new Set(L.s.items.map((it) => it.ex)),
    valider: (ids) => {
      const debut = L.s.items.length;
      for (const id of ids) L.s.items.push({ ex: id, repos: reposHabituel(id), series: Array.from({ length: seriesHabituelles(id) }, serieVide) });
      sauver();
      Feuille.fermer();
      rendreLogger();
      setTimeout(() => document.querySelector(`#seance-liste .carte-ex[data-i="${debut}"]`)?.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "center" }), 60);
    },
  });
}

/* ---------- Repos ---------- */

function lancerRepos(sec) {
  if (!sec || !L || L.mode !== "direct") return;
  L.s.repos = { fin: Date.now() + sec * 1000, duree: sec };
  sauver();
  majRepos();
}
function majRepos() {
  const b = $("repos");
  const r = L && L.mode === "direct" ? L.s.repos : null;
  if (!r) { b.hidden = true; b.classList.remove("fini"); return; }
  const reste = r.fin - Date.now();
  if (reste <= 0) {
    if (!r.sonne) {
      r.sonne = true;
      sauverBientot();
      if (-reste < 20000) { Sons.repos(); vibrer(60); }
      b.classList.add("fini");
    }
    if (-reste > 6000) { L.s.repos = null; sauverBientot(); b.hidden = true; b.classList.remove("fini"); return; }
    $("repos-titre").textContent = "Repos fini";
    $("repos-temps").textContent = "C'est reparti";
    $("repos-barre").style.transform = "scaleX(1)";
    $("repos-moins").hidden = $("repos-plus").hidden = true;
    $("repos-passer").textContent = "OK";
    b.hidden = false;
    return;
  }
  b.hidden = false;
  b.classList.remove("fini");
  $("repos-moins").hidden = $("repos-plus").hidden = false;
  $("repos-passer").textContent = "Passer";
  $("repos-titre").textContent = "Repos";
  $("repos-temps").textContent = fmtRepos(Math.ceil(reste / 1000));
  $("repos-barre").style.transform = `scaleX(${borne(reste / (r.duree * 1000), 0, 1)})`;
}
function ajusterRepos(d) {
  const r = L && L.s.repos;
  if (!r || r.sonne) return;
  r.fin = Math.max(Date.now() + 1000, r.fin + d * 1000);
  r.duree = Math.max(r.duree, Math.ceil((r.fin - Date.now()) / 1000));
  sauver();
  majRepos();
  vibrer(6);
}

/* ---------- Écran allumé pendant la séance ---------- */

let verrou = null;
async function garderEcran(oui) {
  try {
    if (oui && L && L.mode === "direct" && donnees.reglages.ecran && "wakeLock" in navigator && document.visibilityState === "visible") {
      if (!verrou) {
        verrou = await navigator.wakeLock.request("screen");
        verrou.addEventListener("release", () => { verrou = null; });
      }
    } else if (verrou) {
      const v = verrou; verrou = null;
      await v.release();
    }
  } catch (e) { verrou = null; }
}

/* ---------- Terminer, abandonner, modifier ---------- */

function nettoyer(s) {
  const { repos, ...reste } = s;
  return {
    ...reste,
    items: s.items
      .map((it) => ({ ...it, series: it.series.filter((x) => x.reps > 0).map(({ fait, ...x }) => x) }))
      .filter((it) => it.series.length),
  };
}
function terminer() {
  fermerPave(true);
  const s = L.s;
  let faites = 0, vides = 0;
  for (const it of s.items) for (const x of it.series) { if (x.reps > 0) faites++; else vides++; }
  if (!faites) {
    if (confirm("Aucune série notée pour l'instant.\n\nAbandonner cette séance ?")) abandonner(true);
    return;
  }
  if (vides && !confirm(`${pluriel(vides, "série")} sans répétitions : ${vides > 1 ? "elles ne seront pas enregistrées" : "elle ne sera pas enregistrée"}.\n\nTerminer la séance ?`)) return;
  const structure = s.items.map((it) => ({ ex: it.ex, series: it.series.length, repos: it.repos }));
  const finie = nettoyer({ ...s, fin: new Date().toISOString() });
  donnees.seances.push(finie);
  donnees.enCours = null;
  if (!sauver()) return;
  A = analyser();
  vue = "accueil";
  fermerLogger();
  montrerBilan(finie, structure);
}
function abandonner(sansConfirmer) {
  const s = L.s;
  const n = s.items.reduce((t, it) => t + it.series.filter((x) => x.reps > 0).length, 0);
  if (!sansConfirmer && !confirm(n ? `Abandonner la séance ?\n\n${n > 1 ? `Les ${n} séries notées seront perdues.` : "La série notée sera perdue."}` : "Abandonner cette séance ?")) return;
  donnees.enCours = null;
  sauver();
  fermerLogger();
  toast("Séance abandonnée", { action: "Annuler", surAction: () => { donnees.enCours = s; sauver(); ouvrirLogger(); } });
}
function modifierSeance(id) {
  const s = donnees.seances.find((x) => x.id === id);
  if (!s) return;
  const copie = JSON.parse(JSON.stringify(s));
  for (const it of copie.items) for (const x of it.series) x.fait = x.reps > 0;
  Feuille.fermer();
  ouvrirLogger(copie, "edition");
}
function enregistrerEdition() {
  fermerPave(true);
  const propre = nettoyer(L.s);
  if (!propre.items.length) {
    if (confirm("Il n'y a plus aucune série dans cette séance.\n\nLa supprimer ?")) supprimerSeance(L.s.id, true);
    return;
  }
  const idx = donnees.seances.findIndex((x) => x.id === propre.id);
  if (idx >= 0) donnees.seances[idx] = propre; else donnees.seances.push(propre);
  sauver();
  A = analyser();
  fermerLogger();
  toast("Séance modifiée");
}
function annulerEdition() {
  if (L.original !== JSON.stringify(L.s) && !confirm("Quitter sans enregistrer les modifications ?")) return;
  fermerLogger();
}
function supprimerSeance(id, depuisLogger) {
  const s = donnees.seances.find((x) => x.id === id);
  if (!s || !confirm(`Supprimer la séance « ${s.nom} » du ${fmtCourt.format(new Date(s.debut))} ?`)) return;
  const avant = JSON.stringify(donnees);
  donnees.seances = donnees.seances.filter((x) => x.id !== id);
  sauver();
  A = analyser();
  Feuille.fermer();
  if (depuisLogger && L) fermerLogger(); else rendre();
  toast("Séance supprimée", { action: "Annuler", surAction: () => restaurerInstantane(avant) });
}

/* ---------- Bilan de fin de séance ---------- */

function phraseBilan(r) {
  const comp = r.plus + r.egal + r.moins;
  if (!comp) return "Première fois avec ces exercices : la prochaine fois, tes chiffres d'aujourd'hui seront en transparence. À battre !";
  if (!r.plus && !r.moins) return "Pareil que la dernière fois. La prochaine, ajoute une rep ou un peu de poids !";
  if (r.plus && !r.moins) return ["Tu as battu la dernière fois sur ", el("b", {}, pluriel(r.plus, "série")), r.plus === comp ? ". Toutes, sans exception." : ", et rien en dessous."];
  if (r.plus >= r.moins) return ["Tu as battu la dernière fois sur ", el("b", {}, pluriel(r.plus, "série")), ` sur ${comp}.`];
  if (r.plus) return [el("b", {}, pluriel(r.plus, "série")), ` en progrès, ${r.moins} en dessous : jour sans, l'important c'est d'être venu.`];
  return "Séance plus dure que la dernière : ça arrive. L'important, c'est d'être venu.";
}
function montrerBilan(s, structure) {
  const r = resumeSeance(s);
  const m = s.modele ? modele(s.modele) : null;
  let prec = null;
  for (let i = A.fins.length - 1; i >= 0; i--) { const x = A.fins[i]; if (x.id !== s.id && x.modele && x.modele === s.modele && x.debut < s.debut) { prec = x; break; } }
  const tPrec = prec ? resumeSeance(prec).tonnage : 0;
  const delta = prec && tPrec > 0 ? (r.tonnage / tPrec - 1) * 100 : null;
  const obj = donnees.reglages.objectif;
  const n = A.semaines[lundiDe(jourDe(s.debut))] || 0;
  const recs = r.records;
  const badge = recs.length ? ["or", "trophee"] : r.plus ? ["vert", "haut"] : ["", "coche"];
  const change = m && !(m.items.length === structure.length && m.items.every((it, i) => it.ex === structure[i].ex && it.series === structure[i].series && it.repos === structure[i].repos));

  let blocModele = null;
  if (change) {
    const b = el("button", { class: "bouton", onclick: () => {
      m.items = structure.map((x) => ({ ...x }));
      m.maj = new Date().toISOString();
      sauver();
      b.disabled = true;
      remplir(b, icone("coche"), `« ${m.nom} » mise à jour`);
    } }, icone("boucle"), `Garder ces changements dans « ${m.nom} »`);
    blocModele = [el("p", { class: "aide", style: "margin-top:18px" }, "Tu as changé les exercices, les séries ou le repos de cette séance type :"), b];
  } else if (!m && structure.length) {
    const champ = el("input", { class: "champ", placeholder: "Nom de la séance type", maxlength: "40", autocapitalize: "sentences", enterkeyhint: "done" });
    const zone = el("div", { class: "nom-modele", hidden: true }, champ, el("button", { class: "bouton principal", onclick: () => {
      const nom = champ.value.trim() || nomParDefaut();
      const id = nouvelId();
      donnees.modeles.push({ id, nom, items: structure.map((x) => ({ ...x })), cree: new Date().toISOString() });
      const ss = donnees.seances.find((x) => x.id === s.id);
      if (ss) { ss.modele = id; ss.nom = nom; }
      sauver();
      A = analyser();
      zone.replaceWith(el("p", { class: "aide centre", style: "margin-top:12px" }, `« ${nom} » est dans tes séances types ✓`));
      ouvre.remove();
    } }, "Créer"));
    const ouvre = el("button", { class: "bouton", onclick: () => { ouvre.hidden = true; zone.hidden = false; champ.focus(); } }, icone("plus"), "En faire une séance type");
    blocModele = [ouvre, zone];
  }

  remplir($("fete-contenu"),
    el("div", { class: `fete-badge ${badge[0]}` }, icone(badge[1])),
    el("p", { class: "fete-sur" }, "Séance terminée"),
    el("h2", {}, s.nom),
    el("p", { class: "fete-phrase" }, phraseBilan(r)),
    el("div", { class: "tuiles trois" },
      tuile("chrono", fmtDuree(r.duree), "de séance"),
      tuile("haltere", fmtTonnage(r.tonnage), delta != null && Math.round(delta) > 0 ? `soulevés · ${fmtPct(delta)}` : "soulevés", delta != null && Math.round(delta) > 0 ? "vert" : ""),
      r.plus
        ? tuile("haut", String(r.plus), r.plus > 1 ? "séries en progrès" : "série en progrès", "vert")
        : tuile("coche", String(r.series), r.series > 1 ? "séries notées" : "série notée")),
    recs.length ? el("div", { class: "fete-bloc" }, el("p", { class: "titre-section" }, recs.length > 1 ? `${recs.length} records` : "Nouveau record"), el("div", { class: "carte" }, ...recs.map(ligneRecord))) : null,
    el("div", { class: "carte fete-bloc fete-semaine" },
      anneau(n, obj, 60),
      el("div", { class: "semaine-txt" },
        el("b", {}, n >= obj ? (n === obj ? "Objectif de la semaine atteint" : "Objectif de la semaine dépassé") : `${n} sur ${obj} cette semaine`),
        el("span", {}, A.serie.actuelle > 0 ? `${pluriel(A.serie.actuelle, "semaine")} d'affilée à ton objectif` : `Encore ${pluriel(obj - n, "séance")} pour ton objectif`))),
    blocModele,
    el("button", { class: "bouton principal", onclick: fermerBilan }, "Continuer"));
  const f = $("fete");
  $("toast").classList.remove("visible");
  f.hidden = false;
  f.scrollTop = 0;
  document.body.classList.add("bloque");
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("ouvert")));
  Sons.fin();
  vibrer(30);
  if (recs.length || r.plus) setTimeout(() => confettis(document.querySelector(".fete-badge"), recs.length ? COULEURS_OR.concat(COULEURS_FETE) : COULEURS_FETE, 80), 350);
  rendre();
}
function fermerBilan() {
  const f = $("fete");
  f.classList.remove("ouvert");
  document.body.classList.remove("bloque");
  setTimeout(() => { f.hidden = true; remplir($("fete-contenu")); }, 320);
  rendre();
}

/* =========================================================
   Onglet « Exercices » et fiche d'un exercice
   ========================================================= */

function etincelle(vals) {
  const w = 64, h = 28, n = vals.length;
  const min = Math.min(...vals), max = Math.max(...vals), e = max - min || 1;
  const pts = vals.map((v, i) => [(i / (n - 1)) * (w - 4) + 2, h - 3 - ((v - min) / e) * (h - 6)]);
  const tendance = vals[n - 1] > vals[0] ? "var(--vert-vif)" : vals[n - 1] < vals[0] ? "var(--rouge)" : "var(--pale)";
  const der = pts[n - 1];
  return el("span", { html: `<svg class="etincelle-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="M${pts.map((p) => p.join(",")).join("L")}" style="stroke:${tendance}"/><circle cx="${der[0]}" cy="${der[1]}" r="3.5" style="fill:${tendance}"/></svg>` });
}
const estPDC = (l) => l.length > 0 && l.every((x) => x.charge === 0);

function ligneExercice(e) {
  const l = A.parEx[e.id] || [];
  const der = l[l.length - 1];
  const cle = estPDC(l) ? "reps" : "force";
  const vals = l.map((x) => x[cle]);
  const pct = vals.length > 1 && vals[0] > 0 ? (vals[vals.length - 1] / vals[0] - 1) * 100 : null;
  return el("button", { class: "ligne-ex", onclick: () => ouvrirExercice(e.id) },
    el("span", { class: "le-txt" }, el("b", {}, e.nom), el("small", {}, der ? `${fmtSerie(der.top)} · ${quand(der.date)}` : "Pas encore fait")),
    el("span", { class: "le-droite" }, vals.length > 1 ? etincelle(vals.slice(-12)) : null, pct != null ? badgePct(pct) : null, icone("chevron", "fleche")));
}
function rendreExercices() {
  const q = sansAccents($("recherche-ex").value);
  const tous = exercicesVisibles();
  const l = $("liste-ex");
  $("recherche-ex").closest(".recherche").hidden = !tous.length;
  if (!tous.length) {
    remplir(l, el("div", { class: "carte vide" },
      icone("haltere", "grand"),
      el("b", {}, "Aucun exercice pour l'instant"),
      el("p", {}, "Crée tes exercices ici : ils te seront proposés quand tu composes une séance."),
      el("button", { class: "bouton principal", onclick: () => editerExercice(null) }, icone("plus"), "Créer un exercice")),
      el("p", { class: "titre-section" }, "Ou ajoute-les d'un geste"),
      el("div", { class: "puces" }, ...IDEES.map((nom) => el("button", { class: "puce idee", onclick: () => { creerExercice(nom); vibrer(); rendreExercices(); toast(`${nom} ajouté`); } }, icone("plus"), nom))));
    return;
  }
  const filtres = q ? tous.filter((e) => sansAccents(e.nom).includes(q)) : tous;
  const blocs = [];
  for (const g of GROUPES) {
    const ex = filtres.filter((e) => e.groupe === g.id).sort(alpha);
    if (ex.length) blocs.push(el("p", { class: "titre-section" }, el("span", {}, g.nom), el("span", {}, String(ex.length))), el("div", { class: "carte" }, ...ex.map(ligneExercice)));
  }
  if (!blocs.length) {
    const nom = majuscule($("recherche-ex").value.trim());
    blocs.push(el("p", { class: "aide centre", style: "margin:24px 0 14px" }, `Aucun exercice ne s'appelle « ${nom} ».`),
      el("button", { class: "bouton", onclick: () => editerExercice(null, nom) }, icone("plus"), `Créer « ${nom} »`));
  }
  remplir(l, ...blocs);
}

function editerExercice(id, nomInitial = "") {
  const e = id ? exo(id) : null;
  const etat = { nom: e ? e.nom : nomInitial, groupe: e ? e.groupe : devinerGroupe(nomInitial), groupeChoisi: !!e, pas: e && e.pas > 0 ? e.pas : null };
  ouvrirOuEmpiler(() => rendreEditeurEx(id, etat));
}
function rendreEditeurEx(id, etat) {
  const puces = el("div", { class: "puces" });
  const majPuces = () => remplir(puces, ...GROUPES.map((g) => el("button", {
    class: "puce" + (etat.groupe === g.id ? " choisie" : ""),
    onclick: () => { etat.groupe = g.id; etat.groupeChoisi = true; majPuces(); },
  }, g.nom)));
  majPuces();
  const pas = el("div", { class: "puces" });
  const majPas = () => remplir(pas, ...[null, 1, 1.25, 2, 2.5, 5].map((v) => el("button", {
    class: "puce" + (etat.pas === v ? " choisie" : ""),
    onclick: () => { etat.pas = v; majPas(); },
  }, v === null ? `Réglage général (${fmtKg(donnees.reglages.pas)} kg)` : `${fmtKg(v)} kg`)));
  majPas();
  const champ = el("input", {
    class: "champ", value: etat.nom, placeholder: "Ex. Développé couché haltères", maxlength: "60",
    autocapitalize: "sentences", autocomplete: "off", enterkeyhint: "done",
    oninput: (ev) => { etat.nom = ev.target.value; if (!etat.groupeChoisi) { etat.groupe = devinerGroupe(etat.nom); majPuces(); } },
    onkeydown: (ev) => { if (ev.key === "Enter") { ev.preventDefault(); ev.target.blur(); } },
  });
  return [
    tete(id ? "Modifier l'exercice" : "Nouvel exercice"),
    el("label", { class: "champ-etiquette" }, "Nom"), champ,
    el("p", { class: "champ-etiquette" }, "Groupe musculaire"), puces,
    el("p", { class: "champ-etiquette" }, "Boutons − et + du pavé"), pas,
    id ? el("button", { class: "bouton danger", style: "margin-top:20px", onclick: () => supprimerExercice(id) }, "Supprimer cet exercice") : null,
    el("div", { class: "f-pied" }, el("button", { class: "bouton principal", onclick: () => enregistrerExercice(id, etat) }, id ? "Enregistrer" : "Créer l'exercice")),
  ];
}
function enregistrerExercice(id, etat) {
  const nom = majuscule(etat.nom.trim().replace(/\s+/g, " ")).slice(0, 60);
  if (!nom) { toast("Donne un nom à l'exercice", { rouge: true, icone: "!" }); return; }
  const autre = donnees.exercices.find((e) => e.id !== id && !e.supprime && sansAccents(e.nom) === sansAccents(nom));
  if (autre) { toast("Cet exercice existe déjà", { rouge: true, icone: "!" }); return; }
  if (id) {
    const e = donnees.exercices.find((x) => x.id === id);
    if (e) { e.nom = nom; e.groupe = etat.groupe; if (etat.pas) e.pas = etat.pas; else delete e.pas; }
  } else {
    const e = creerExercice(nom, etat.groupe);
    e.groupe = etat.groupe;
    if (etat.pas) e.pas = etat.pas;
  }
  sauver();
  Feuille.retour();
  if (L) rendreLogger(); else rendre();
  toast(id ? "Exercice modifié" : `${nom} ajouté`);
}
function supprimerExercice(id) {
  const e = donnees.exercices.find((x) => x.id === id);
  if (!e) return;
  if (donnees.enCours && donnees.enCours.items.some((it) => it.ex === id)) { toast("Il est dans ta séance en cours : retire-le d'abord", { rouge: true, icone: "!" }); return; }
  const histo = (A.parEx[id] || []).length;
  const ms = donnees.modeles.filter((m) => m.items.some((it) => it.ex === id));
  const msg = `Supprimer « ${e.nom} » ?` +
    (ms.length ? `\n\nIl sera retiré de ${ms.length > 1 ? "ces séances types" : "la séance type"} : ${ms.map((m) => m.nom).join(", ")}.` : "") +
    (histo ? `\n\nTes ${pluriel(histo, "séance")} passées avec cet exercice restent dans ton historique.` : "");
  if (!confirm(msg)) return;
  const avant = JSON.stringify(donnees);
  for (const m of ms) m.items = m.items.filter((it) => it.ex !== id);
  if (histo || donnees.seances.some((s) => s.items.some((it) => it.ex === id))) e.supprime = true;
  else donnees.exercices = donnees.exercices.filter((x) => x.id !== id);
  sauver();
  A = analyser();
  Feuille.fermer();
  rendre();
  toast("Exercice supprimé", { action: "Annuler", surAction: () => restaurerInstantane(avant) });
}

// Courbe lissée sans dépassement (interpolation monotone de Fritsch-Carlson).
function cheminLisse(pts) {
  const n = pts.length;
  if (n < 2) return "";
  if (n === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;
  const dx = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1].x - pts[i].x; m[i] = (pts[i + 1].y - pts[i].y) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

const METRIQUES = {
  force: { nom: "Force", unite: "kg", legende: "1RM estimé : le poids que tu pourrais soulever une fois, d'après ta meilleure série", fmt: (v) => nombre1.format(Math.round(v * 2) / 2) },
  charge: { nom: "Charge", unite: "kg", legende: "Ta charge la plus lourde de la séance", fmt: (v) => fmtKg(v) },
  volume: { nom: "Volume", unite: "kg", legende: "Tout ce que tu as soulevé sur l'exercice (poids × reps)", fmt: (v) => nombre.format(Math.round(v)) },
  reps: { nom: "Reps max", unite: "reps", legende: "Ta meilleure série au poids du corps", fmt: (v) => nombre.format(v) },
  total: { nom: "Reps totales", unite: "reps", legende: "Toutes tes répétitions de la séance", fmt: (v) => nombre.format(v) },
};
let metriqueVue = "force";

function courbe(l, cle, largeur) {
  const M = METRIQUES[cle];
  const W = Math.round(largeur), H = 200, gauche = 8, droite = 44, hautP = 22, basP = 28;
  const vals = l.map((x) => x[cle]);
  const n = vals.length;
  let min = Math.min(...vals), max = Math.max(...vals);
  // Lignes de repère : min, milieu arrondi (pas de « 9,5 reps »), max ; une seule si tout est égal.
  const pasGrille = cle === "reps" || cle === "total" || cle === "volume" ? 1 : 0.5;
  const milieu = Math.round((min + max) / 2 / pasGrille) * pasGrille;
  const niveaux = max === min ? [min] : milieu > min && milieu < max ? [min, milieu, max] : [min, max];
  if (max === min) { min = min - Math.max(1, min * 0.1); max = max + Math.max(1, max * 0.1); }
  const marge = (max - min) * 0.12;
  const y0 = min - marge, y1 = max + marge;
  const X = (i) => (n === 1 ? (gauche + W - droite) / 2 : gauche + (i / (n - 1)) * (W - gauche - droite));
  const Y = (v) => hautP + (1 - (v - y0) / (y1 - y0)) * (H - hautP - basP);
  const pts = vals.map((v, i) => ({ x: +X(i).toFixed(1), y: +Y(v).toFixed(1) }));
  const hausse = vals[n - 1] > vals[0], baisse = vals[n - 1] < vals[0];
  const coul = hausse ? "var(--vert-vif)" : baisse ? "var(--rouge)" : "var(--encre)";
  // Points records : chaque séance qui dépasse toutes les précédentes.
  const records = [];
  let mx = -Infinity;
  vals.forEach((v, i) => { if (i > 0 && v > mx + 1e-9) records.push(i); mx = Math.max(mx, v); });
  const grille = niveaux.map((v) => {
    const y = Y(v).toFixed(1);
    return `<line class="grille" x1="${gauche}" x2="${W - droite + 6}" y1="${y}" y2="${y}"/><text class="etiq" x="${W}" y="${(+y + 4).toFixed(1)}" text-anchor="end">${M.fmt(v)}</text>`;
  }).join("");
  const dates = (n === 1 ? [0] : n < 5 ? [0, n - 1] : [0, Math.round((n - 1) / 2), n - 1]).map((i) =>
    `<text class="etiq" x="${pts[i].x}" y="${H - 6}" text-anchor="${n === 1 ? "middle" : i === 0 ? "start" : i === n - 1 ? "end" : "middle"}">${fmtJourMois.format(new Date(l[i].date))}</text>`).join("");
  const chemin = cheminLisse(pts);
  const aire = n > 1 ? `<path d="${chemin}L${pts[n - 1].x},${H - basP}L${pts[0].x},${H - basP}Z" fill="url(#degrade-courbe)"/>` : "";
  const montrerTous = n <= 24;
  const points = pts.map((p, i) => {
    if (records.includes(i)) return `<circle class="pt-record" cx="${p.x}" cy="${p.y}" r="${i === n - 1 ? 6.5 : 5}"/>`;
    if (i === n - 1) return `<circle class="pt pt-dernier" cx="${p.x}" cy="${p.y}" r="6" style="stroke:${coul}"/>`;
    return montrerTous ? `<circle class="pt" cx="${p.x}" cy="${p.y}" r="3.6" style="stroke:${coul}"/>` : "";
  }).join("");
  const svg = `<svg class="courbe" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Courbe ${M.nom}">
    <defs><linearGradient id="degrade-courbe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${coul};stop-opacity:.22"/><stop offset="1" style="stop-color:${coul};stop-opacity:0"/></linearGradient></defs>
    ${grille}${aire}${n > 1 ? `<path class="trait" d="${chemin}" style="stroke:${coul}"/>` : ""}
    <line class="repere" x1="0" x2="0" y1="${hautP - 8}" y2="${H - basP}" visibility="hidden"/>
    ${points}${dates}</svg>`;
  const cadre = el("div", { class: "cadre-courbe", html: svg });
  const bulle = el("div", { class: "bulle", hidden: true });
  cadre.append(bulle);
  const s = cadre.querySelector("svg"), repere = s.querySelector(".repere");
  let minuterie;
  const montrer = (ev) => {
    const r = s.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    let i = 0;
    for (let k = 1; k < n; k++) if (Math.abs(pts[k].x - x) < Math.abs(pts[i].x - x)) i = k;
    const p = pts[i], e = l[i];
    repere.setAttribute("x1", p.x); repere.setAttribute("x2", p.x); repere.setAttribute("visibility", "visible");
    bulle.hidden = false;
    remplir(bulle, el("b", {}, `${M.fmt(vals[i])} ${M.unite}`), `${fmtCourt.format(new Date(e.date))} · ${fmtSerie(e.top)}`);
    const px = (p.x / W) * r.width;
    bulle.style.left = `${borne(px, 70, r.width - 70)}px`;
    bulle.style.top = `${(p.y / H) * r.height}px`;
    clearTimeout(minuterie);
    minuterie = setTimeout(() => { bulle.hidden = true; repere.setAttribute("visibility", "hidden"); }, 2600);
  };
  s.addEventListener("pointerdown", montrer);
  s.addEventListener("pointermove", (ev) => { if (ev.pointerType === "mouse" || ev.buttons) montrer(ev); });
  return cadre;
}

function ouvrirExercice(id) {
  ouvrirOuEmpiler(() => rendreExercice(id), { classe: "haut" });
}
function rendreExercice(id) {
  const e = exo(id);
  const l = A.parEx[id] || [];
  const pdc = estPDC(l);
  const cles = pdc ? ["reps", "total"] : ["force", "charge", "volume"];
  if (!cles.includes(metriqueVue)) metriqueVue = cles[0];
  const M = METRIQUES[metriqueVue];
  // Largeur réelle du panneau (max 560 px, 18 px de marge de chaque côté) : le texte du graphique garde sa taille.
  const largeur = Math.min(window.innerWidth || 390, 560) - 36 + 8;
  const modifier = e.supprime ? null : el("button", { class: "rond petit", "aria-label": "Modifier l'exercice", onclick: () => editerExercice(id) }, icone("crayon"));
  const haut = [tete(e.nom, { action: modifier }), el("p", { class: "f-sous" }, `${nomGroupe(e.groupe)}${l.length ? " · " + pluriel(l.length, "séance") : ""}`)];
  if (!l.length) {
    return [...haut, el("div", { class: "courbe-vide" }, "Pas encore de série pour cet exercice.", el("br"), "Ajoute-le à une séance : ta courbe de progression apparaîtra ici dès la deuxième fois.")];
  }
  const vals = l.map((x) => x[metriqueVue]);
  const der = vals[vals.length - 1];
  const pct = vals.length > 1 && vals[0] > 0 ? (der / vals[0] - 1) * 100 : null;
  const segments = el("div", { class: "segments", role: "tablist" }, ...cles.map((k) => el("button", {
    class: k === metriqueVue ? "actif" : "", role: "tab", "aria-selected": k === metriqueVue ? "true" : "false",
    onclick: () => { metriqueVue = k; Feuille.rafraichir(); },
  }, METRIQUES[k].nom)));
  const meilleur = (cle) => l.reduce((a, x) => (x[cle] > a[cle] ? x : a));
  const tuiles = pdc
    ? [tuile("couronne", `${meilleur("reps").reps}`, "reps max en une série", "or"), tuile("haut", nombre.format(meilleur("total").total), "reps sur une séance"), tuile("calendrier", String(l.length), l.length > 1 ? "séances" : "séance")]
    : [tuile("couronne", `${fmtKg(meilleur("charge").charge)} kg`, "charge max", "or"), tuile("courbe", `${METRIQUES.force.fmt(meilleur("force").force)} kg`, "1RM estimé"), tuile("haltere", fmtTonnage(meilleur("volume").volume), "meilleur volume")];
  // Historique : chaque série comparée à la séance d'avant, couronne si record.
  const lignes = [];
  let m = null;
  l.forEach((x, k) => {
    const prev = k > 0 ? l[k - 1].series : null;
    const mm = m ? { ...m } : null;
    const puces = x.series.map((y, j) => {
      const v = verdictDe(y, refDans(prev, j));
      const rec = mm ? typeRecord(y, mm) : null;
      if (mm) majMeilleurs(mm, y);
      return el("span", { class: `serie-puce${v && v !== "egal" ? " " + v : ""}${rec ? " record" : ""}` }, rec ? icone("couronne") : null, fmtSerie(y));
    });
    m = m || { kg: 0, e1rm: 0, reps0: 0 };
    for (const y of x.series) majMeilleurs(m, y);
    lignes.push(el("button", { class: "histo-ex", style: "width:100%;text-align:left", onclick: () => ouvrirSeance(x.s.id) },
      el("span", { class: "he-date" }, fmtCourt.format(new Date(x.date))), el("span", { class: "he-series" }, ...puces)));
  });
  return [
    ...haut,
    segments,
    el("div", { class: "titre-courbe" },
      el("div", {}, el("div", { class: "gros" }, M.fmt(der), el("small", {}, M.unite)), el("p", { class: "legende-courbe" }, M.legende)),
      pct != null ? badgePct(pct) : null),
    l.length > 1 ? courbe(l, metriqueVue, largeur) : el("div", { class: "courbe-vide" }, "Encore une séance avec cet exercice et ta courbe démarre."),
    pct != null ? el("p", { class: "aide centre", style: "margin-top:6px" }, `${fmtPct(pct)} depuis ta première fois, ${fmtJourMois.format(new Date(l[0].date))}`) : null,
    el("p", { class: "titre-section" }, "Records"),
    el("div", { class: "tuiles trois" }, ...tuiles),
    el("p", { class: "titre-section" }, "Historique"),
    el("div", { class: "carte" }, ...lignes.reverse()),
  ];
}

/* =========================================================
   Détail d'une séance passée
   ========================================================= */

function ouvrirSeance(id) {
  ouvrirOuEmpiler(() => rendreSeanceDetail(id), { classe: "haut" });
}
function rendreSeanceDetail(id) {
  const s = donnees.seances.find((x) => x.id === id);
  if (!s) return [tete("Séance introuvable"), el("p", { class: "aide" }, "Elle a peut-être été supprimée.")];
  const r = resumeSeance(s);
  const d = new Date(s.debut);
  const blocs = s.items.map((it) => {
    const prev = precedente(it.ex, s.debut, s.id);
    const m0 = meilleursAvant(it.ex, s.debut, s.id);
    const m = m0 ? { ...m0 } : null;
    const puces = it.series.filter(faite).map((x, j) => {
      const v = verdictDe(x, refDans(prev && prev.series, j));
      const rec = m ? typeRecord(x, m) : null;
      if (m) majMeilleurs(m, x);
      return el("span", { class: `serie-puce${v && v !== "egal" ? " " + v : ""}${rec ? " record" : ""}` }, rec ? icone("couronne") : null, fmtSerie(x));
    });
    return el("button", { class: "ligne-ex", onclick: () => ouvrirExercice(it.ex) },
      el("span", { class: "le-txt" }, el("b", {}, exo(it.ex).nom), el("span", { class: "he-series", style: "margin-top:8px" }, ...puces)),
      icone("chevron", "fleche"));
  });
  return [
    tete(s.nom),
    el("p", { class: "f-sous" }, `${majuscule(fmtLong.format(d))} · ${fmtHeure.format(d)}`),
    el("div", { class: "tuiles trois" },
      tuile("chrono", fmtDuree(r.duree), "de séance"),
      tuile("haltere", fmtTonnage(r.tonnage), "soulevés"),
      tuile(r.records.length ? "couronne" : "haut", r.records.length ? String(r.records.length) : String(r.plus), r.records.length ? (r.records.length > 1 ? "records" : "record") : r.plus > 1 ? "séries en progrès" : "série en progrès", r.records.length ? "or" : "")),
    el("p", { class: "titre-section" }, "Exercices"),
    el("div", { class: "carte" }, ...blocs),
    el("div", { class: "choix-actions" },
      el("button", { class: "bouton", onclick: () => modifierSeance(id) }, icone("crayon"), "Modifier"),
      el("button", { class: "bouton", style: "color:var(--rouge)", onclick: () => supprimerSeance(id) }, icone("poubelle"), "Supprimer")),
  ];
}

/* =========================================================
   Onglet « Progrès »
   ========================================================= */

let semainesAffichees = 8;
function titreSemaine(w) {
  const cette = lundiDe(aujourdhui());
  if (w === cette) return "Cette semaine";
  if (w === decaler(cette, -7)) return "La semaine dernière";
  return `Semaine du ${fmtJourMois.format(dateDe(w))}`;
}
function graphiqueSemaines() {
  const obj = donnees.reglages.objectif;
  const cette = lundiDe(aujourdhui());
  const ws = Array.from({ length: 12 }, (_, i) => decaler(cette, -7 * (11 - i)));
  const ns = ws.map((w) => A.semaines[w] || 0);
  const max = Math.max(obj, ...ns);
  const atteintes = ns.filter((n) => n >= obj).length;
  return el("div", { class: "carte barres" },
    el("div", { class: "barres-graphe" },
      ...ws.map((w, i) => el("div", {
        class: `barre${ns[i] >= obj ? " atteint" : ""}${w === cette ? " cette" : ""}`,
        style: `height:${Math.max(4, (ns[i] / max) * 100)}%`,
        title: `${titreSemaine(w)} : ${pluriel(ns[i], "séance")}`,
      }, ns[i] ? el("b", {}, String(ns[i])) : null)),
      el("div", { class: "barres-objectif", style: `bottom:${(obj / max) * 100}%` })),
    el("div", { class: "barres-axe" }, ...ws.map((w, i) => el("span", {}, i % 4 === 3 ? `${dateDe(w).getDate()}/${dateDe(w).getMonth() + 1}` : ""))),
    el("div", { class: "barres-legende" }, el("span", {}, el("i"), `Objectif : ${obj} par semaine`), el("span", {}, `${atteintes}/12 réussies`)));
}
function rendreProgres() {
  const v = $("vue-progres");
  const tete = el("header", { class: "tete" },
    el("div", {}, el("p", { class: "sur-titre" }, "Ta régularité"), el("h1", {}, "Progrès")),
    el("button", { class: "rond", "aria-label": "Réglages et sauvegarde", onclick: ouvrirReglages }, icone("reglages")));
  const fins = A.fins;
  if (!fins.length) {
    remplir(v, tete, el("div", { class: "carte vide" }, icone("courbe", "grand"), el("b", {}, "Tes progrès arriveront ici"),
      el("p", {}, "Termine ta première séance : ta régularité, tes records et ton historique s'afficheront ici.")));
    return;
  }
  const total = fins.reduce((t, s) => t + resumeSeance(s).tonnage, 0);
  const S = A.serie;
  const groupes = new Map();
  for (let i = fins.length - 1; i >= 0; i--) {
    const w = lundiDe(jourDe(fins[i].debut));
    if (!groupes.has(w)) groupes.set(w, []);
    groupes.get(w).push(fins[i]);
  }
  const obj = donnees.reglages.objectif;
  const histo = [];
  let k = 0;
  for (const [w, ss] of groupes) {
    if (k++ >= semainesAffichees) break;
    histo.push(el("div", { class: "semaine-titre" }, el("span", {}, titreSemaine(w)), el("span", { class: "badge" + (ss.length >= obj ? " vert" : "") }, `${ss.length}/${obj}`)),
      el("div", { class: "carte" }, ...ss.map(ligneSeance)));
  }
  remplir(v,
    tete,
    el("div", { class: "tuiles" },
      tuile("haltere", nombre.format(fins.length), fins.length > 1 ? "séances" : "séance"),
      tuile("flamme", String(S.actuelle), `${S.actuelle > 1 ? "semaines" : "semaine"} d'affilée · record ${S.record}`, "flamme-ico"),
      tuile("couronne", String(A.records.length), A.records.length > 1 ? "records battus" : "record battu", "or"),
      tuile("courbe", fmtTonnage(total), "soulevés au total")),
    el("p", { class: "titre-section" }, "12 dernières semaines"),
    graphiqueSemaines(),
    el("p", { class: "titre-section" }, "Historique"),
    ...histo,
    groupes.size > semainesAffichees ? el("button", { class: "bouton plus-ancien", onclick: () => { semainesAffichees += 8; rendreProgres(); } }, "Voir plus ancien") : null);
}

/* =========================================================
   Réglages et sauvegarde
   ========================================================= */

function ouvrirReglages() { Feuille.ouvrir(rendreReglages); }
function rendreReglages() {
  const R = donnees.reglages;
  const lien = (ic, titre, sous, action) => el("button", { class: "reglage", onclick: action },
    icone(ic), el("span", { class: "reglage-txt" }, el("b", {}, titre), el("small", {}, sous)), icone("chevron", "fleche"));
  const inter = (ic, titre, sous, cle, apres) => el("label", { class: "reglage" },
    icone(ic), el("span", { class: "reglage-txt" }, el("b", {}, titre), el("small", {}, sous)),
    el("span", { class: "inter" }, el("input", { type: "checkbox", checked: R[cle], onchange: (e) => { R[cle] = e.target.checked; sauver(); if (apres) apres(); } }), el("i")));
  const pas = el("div", { class: "puces", style: "padding: 0 16px 16px" });
  const majPas = () => remplir(pas, ...[1, 1.25, 2, 2.5, 5].map((v) => el("button", {
    class: "puce" + (R.pas === v ? " choisie" : ""), onclick: () => { R.pas = v; sauver(); majPas(); },
  }, `${fmtKg(v)} kg`)));
  majPas();
  return [
    tete("Réglages"),
    el("div", { class: "bloc" },
      el("div", { class: "reglage" }, icone("cible"), el("span", { class: "reglage-txt" }, el("b", {}, "Objectif"), el("small", {}, "Séances par semaine")),
        compteur({ valeur: R.objectif, min: 1, max: 7, nom: "Objectif", format: (v) => String(v), onchange: (v) => { R.objectif = v; sauver(); A = analyser(); rendre(); } })),
      el("div", {}, el("div", { class: "reglage" }, icone("haltere"), el("span", { class: "reglage-txt" }, el("b", {}, "Boutons − et + du pavé"), el("small", {}, "De combien la charge change d'un geste"))), pas),
      inter("son", "Sons et vibrations", "Séries validées, records, fin du repos", "sons", () => Sons.regler(R.sons)),
      inter("ecran", "Écran allumé", "Pendant la séance, l'écran ne se met pas en veille", "ecran")),
    el("p", { class: "titre-section" }, "Sauvegarde"),
    el("div", { class: "bloc" },
      lien("nuage", "Google Drive", localStorage.getItem("apps.v1") !== null ? "Une seule sauvegarde pour toutes tes applis, dans Apps" : "Une copie chaque jour dans ton Drive", () => { sauverSiBesoin(); Feuille.fermer(); window.Drive?.ouvrir(); }),
      lien("exporter", "Exporter", "Un fichier .json de toutes tes données", exporter),
      lien("importer", "Importer", "Recharger un fichier exporté", () => $("fichier").click())),
    el("p", { class: "titre-section" }, "Les couleurs de la séance"),
    el("div", { class: "bloc legende" },
      el("div", {}, el("span", { class: "echantillon", style: "color:var(--fantome)" }, "8"), el("span", {}, el("b", {}, "En transparence"), " : ce que tu as fait la dernière fois. Touche ✓ sans rien taper pour refaire pareil.")),
      el("div", {}, el("span", { class: "echantillon vert" }, "9"), el("span", {}, el("b", {}, "Vert"), " : plus lourd que la dernière fois, ou plus de reps au même poids.")),
      el("div", {}, el("span", { class: "echantillon rouge" }, "7"), el("span", {}, el("b", {}, "Rouge"), " : plus léger, ou moins de reps au même poids.")),
      el("div", {}, el("span", { class: "echantillon" }, "8"), el("span", {}, el("b", {}, "Normal"), " : pareil que la dernière fois.")),
      el("div", {}, el("span", { class: "echantillon or" }, icone("couronne")), el("span", {}, el("b", {}, "Couronne"), " : record battu (charge, 1RM estimé ou reps)."))),
    el("p", { class: "aide centre", style: "margin-top:18px" }, "Tes données restent sur ce téléphone. Active Google Drive pour en garder une copie chaque jour."),
  ];
}

async function exporter() {
  sauverSiBesoin();
  const paquet = { app: "salle", cle: CLE, version: 1, date: new Date().toISOString(), donnees };
  const nom = `salle-${aujourdhui()}.json`;
  const fichier = new File([JSON.stringify(paquet, null, 1)], nom, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) { await navigator.share({ files: [fichier], title: "Salle" }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const url = URL.createObjectURL(fichier);
  const a = el("a", { href: url, download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Fichier exporté");
}
async function importer(fichier) {
  try {
    const brut = JSON.parse(await fichier.text());
    const d = brut && brut.donnees && (brut.app === "salle" || brut.cle === CLE) ? brut.donnees : brut;
    if (!valide(d)) throw new Error("format");
    const n = d.seances.length;
    if (!confirm(`Remplacer les données de Salle par ce fichier (${pluriel(n, "séance")}) ?\n\nUne copie des données actuelles est gardée sur ce téléphone.`)) return;
    try { localStorage.setItem(CLE + ".avant-import", JSON.stringify({ date: new Date().toISOString(), donnees })); } catch (e) {
      alert("Impossible de garder une copie des données actuelles : import annulé."); return;
    }
    donnees = completer(d);
    sauver();
    A = analyser();
    Feuille.fermer();
    if (L) fermerLogger(); else rendre();
    toast("Données importées");
  } catch (e) {
    toast("Ce fichier n'est pas une sauvegarde Salle", { rouge: true, icone: "!" });
  }
}

/* =========================================================
   Navigation et démarrage
   ========================================================= */

let vue = "accueil";
function rendre() {
  if (L) return;
  if (vue === "accueil") rendreAccueil();
  else if (vue === "exercices") rendreExercices();
  else rendreProgres();
}
function allerA(nom) {
  vue = nom;
  if (L) return;
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

// Toutes les secondes ou presque : chronos de séance et minuteur de repos.
function tictac() {
  for (const c of document.querySelectorAll("[data-chrono]")) c.textContent = fmtChrono(Date.now() - new Date(c.dataset.chrono));
  if (L) majRepos();
}

let jourAffiche = aujourdhui();
function demarrerApp() {
  Sons.regler(donnees.reglages.sons);
  A = analyser();

  for (const b of document.querySelectorAll(".onglets button")) b.addEventListener("click", () => {
    Sons.debloquer();
    if (b.dataset.vue !== vue) allerA(b.dataset.vue); else window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("bouton-reglages").addEventListener("click", ouvrirReglages);
  $("bouton-nouvel-ex").addEventListener("click", () => editerExercice(null, $("recherche-ex").value.trim()));
  $("recherche-ex").addEventListener("input", rendreExercices);
  $("feuille").addEventListener("click", (e) => { if (e.target.closest("[data-fermer]")) Feuille.fermer(); });
  $("seance-reduire").addEventListener("click", () => { if (L && L.mode === "edition") annulerEdition(); else fermerLogger(); });
  $("seance-terminer").addEventListener("click", () => { if (L && L.mode === "edition") enregistrerEdition(); else terminer(); });
  $("repos-moins").addEventListener("click", () => ajusterRepos(-15));
  $("repos-plus").addEventListener("click", () => ajusterRepos(15));
  $("repos-passer").addEventListener("click", () => { if (L) { L.s.repos = null; sauver(); majRepos(); } });
  for (const b of $("pave").querySelectorAll("[data-k]")) b.addEventListener("click", () => touche(b.dataset.k));
  $("fichier").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importer(f); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (!$("fete").hidden) fermerBilan(); else if (Feuille.ouverte) Feuille.fermer(); else if (L && L.actif) fermerPave(); return; }
    // Au clavier d'ordinateur, le pavé suit aussi les touches.
    if (!L || !L.actif || Feuille.ouverte || e.target.closest("input")) return;
    const k = /^\d$/.test(e.key) ? e.key : e.key === "," || e.key === "." ? "virgule" : e.key === "Backspace" ? "effacer" : e.key === "Enter" || e.key === "Tab" ? "suivant" : null;
    if (k) { e.preventDefault(); touche(k); }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { sauverSiBesoin(); return; }
    if (L) { garderEcran(true); majRepos(); majInfo(); }
    if (aujourdhui() !== jourAffiche) { jourAffiche = aujourdhui(); A = analyser(); rendre(); }
  });
  window.addEventListener("pagehide", sauverSiBesoin);
  // Un autre onglet a modifié les données : on recharge plutôt que de travailler sur une vieille copie.
  window.addEventListener("storage", (e) => { if (e.key === CLE && e.newValue !== dernierEcrit) modifieAilleurs(); });
  document.addEventListener("pointerdown", () => Sons.debloquer(), { once: true });
  setInterval(tictac, 250);

  allerA("accueil");
  // Séance commencée il y a moins de 6 heures : on y retourne directement.
  if (donnees.enCours && Date.now() - new Date(donnees.enCours.debut) < 6 * 3600 * 1000) ouvrirLogger();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

demarrerApp();
