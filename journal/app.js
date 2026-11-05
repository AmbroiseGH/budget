"use strict";

/* =========================================================
   Données (restent sur le téléphone)
   ========================================================= */

const CLE = "journal.v1";
const $ = (id) => document.getElementById(id);

function valide(d) {
  return !!d && typeof d === "object" && !!d.jours && typeof d.jours === "object" &&
    Object.entries(d.jours).every(([k, j]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && j && Number.isInteger(j.h) && j.h >= 0 && j.h <= 8);
}
function nettoyer(jours) {
  const propre = {};
  for (const [k, j] of Object.entries(jours)) {
    propre[k] = { h: j.h, note: typeof j.note === "string" ? j.note.slice(0, 20000) : "", maj: Number(j.maj) || Date.now() };
  }
  return propre;
}
function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE));
    if (valide(d)) return { jours: nettoyer(d.jours), sons: d.sons !== false };
  } catch (e) {}
  return { jours: {}, sons: true };
}
let donnees = charger();
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(donnees)); window.Sauvegarde?.signaler(); }
  catch (e) { toast("Impossible d'enregistrer sur ce téléphone", { icone: "!" }); }
}

/* =========================================================
   Dates (AAAA-MM-JJ, heure locale)
   ========================================================= */

const deux = (n) => String(n).padStart(2, "0");
const cleDe = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
const dateDe = (k) => { const [a, m, j] = k.split("-").map(Number); return new Date(a, m - 1, j); };
const decaler = (k, n) => { const d = dateDe(k); d.setDate(d.getDate() + n); return cleDe(d); };
const ecart = (a, b) => Math.round((dateDe(b) - dateDe(a)) / 864e5);
// La journée se termine à 3 h du matin : à 1 h, on note encore celle qui vient de finir.
function aujourdhui() {
  const d = new Date();
  if (d.getHours() < 3) d.setDate(d.getDate() - 1);
  return cleDe(d);
}
const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtJourMois = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const fmtMoisSeul = new Intl.DateTimeFormat("fr-FR", { month: "long" });
const fmtMoisCourt = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

function nomDuJour(k) {
  const t = aujourdhui();
  if (k === t) return "Aujourd'hui";
  if (k === decaler(t, -1)) return "Hier";
  return majuscule(fmtLong.format(dateDe(k)));
}
const moyenne = (cles) => cles.reduce((s, k) => s + donnees.jours[k].h, 0) / cles.length;

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
  e.append(...enfants.flat().filter((x) => x != null && x !== false && x !== ""));
  return e;
}
function rejouer(elm, classe) {
  if (!elm) return;
  elm.classList.remove(classe);
  void elm.offsetWidth;
  elm.classList.add(classe);
  elm.addEventListener("animationend", () => elm.classList.remove(classe), { once: true });
}
const SVG_COCHE = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const SVG_PLUME = '<svg viewBox="0 0 24 24"><path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="M13.5 7.5l3 3"/></svg>';
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const borne = (v, a, b) => Math.min(b, Math.max(a, v));

let minuteurToast;
function toast(texte, { medaillonDe, icone = "✓", action, surAction } = {}) {
  const t = $("toast");
  const ico = medaillonDe != null ? el("span", { class: "ok", html: medaillon(medaillonDe) }) : el("span", { class: "ok texte" }, icone);
  t.replaceChildren(ico, el("span", { class: "txt" }, texte),
    action ? el("button", { onclick: () => { t.classList.remove("visible"); surAction(); } }, action) : "");
  t.classList.add("visible");
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove("visible"), action ? 4500 : 2300);
}

/* =========================================================
   Couleurs : mélange dans l'espace OKLab (dégradés sans gris sale)
   ========================================================= */

const versRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const delin = (c) => Math.round(borne(c <= 0.0031308 ? 12.92 * c : 1.055 * Math.cbrt(c) ** (3 / 2.4) - 0.055, 0, 1) * 255);
function versLab(hex) {
  const [r, g, b] = versRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function depuisLab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [delin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), delin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), delin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}
const melange = (a, b, t) => depuisLab([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
const texteRgb = ([r, g, b]) => `rgb(${r} ${g} ${b})`;
const hexRgb = (rgb) => "#" + rgb.map((c) => deux(c.toString(16))).join("");
const LAB = {
  clair: CIELS_CLAIR.map((c) => c.map(versLab)),
  sombre: CIELS_SOMBRE.map((c) => c.map(versLab)),
  accents: ACCENTS.map(versLab),
  rose: versLab("#ffaca0"), blanc: versLab("#ffffff"),
};
const modeSombre = matchMedia("(prefers-color-scheme: dark)");
let sombre = modeSombre.matches;

/* =========================================================
   Le ciel vivant
   ========================================================= */

const calques = [];
function creerCiel() {
  let html = "";
  for (let i = 0; i < 74; i++) {
    const t = (1 + Math.random() ** 2.2 * 1.9).toFixed(2);
    html += `<i style="left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 74).toFixed(2)}%;--t:${t}px;--d:${(2 + Math.random() * 3.6).toFixed(2)}s;--r:${(-Math.random() * 6).toFixed(2)}s"></i>`;
  }
  for (let i = 0; i < 6; i++) {
    html += `<i class="grande" style="left:${(6 + Math.random() * 88).toFixed(2)}%;top:${(3 + Math.random() * 46).toFixed(2)}%;--t:${(12 + Math.random() * 9).toFixed(1)}px;--d:${(2.6 + Math.random() * 3).toFixed(2)}s;--r:${(-Math.random() * 5).toFixed(2)}s"></i>`;
  }
  $("etoiles").innerHTML = html;
  let grains = "";
  for (let i = 0; i < 22; i++) {
    grains += `<i style="left:${(Math.random() * 100).toFixed(2)}%;--t:${(3 + Math.random() * 7).toFixed(1)}px;--d:${(10 + Math.random() * 10).toFixed(1)}s;--r:${(-Math.random() * 20).toFixed(1)}s;--dx:${(Math.random() * 60 - 30).toFixed(0)}px"></i>`;
  }
  $("poussiere").innerHTML = grains;
  $("astres").innerHTML = HUMEURS.map((h, i) => `<div class="astre eteint" data-i="${i}">${dessinAstre(i)}</div>`).join("");
  calques.push(...$("astres").querySelectorAll(".astre"));
}

let dernierTheme = "", minuteurTheme = 0;
function appliquerCiel(v) {
  const pal = sombre ? LAB.sombre : LAB.clair;
  const i = borne(Math.floor(v), 0, 7), t = borne(v - i, 0, 1);
  const st = document.documentElement.style;
  const haut = melange(pal[i][0], pal[i + 1][0], t);
  st.setProperty("--ciel-haut", texteRgb(haut));
  st.setProperty("--ciel-milieu", texteRgb(melange(pal[i][1], pal[i + 1][1], t)));
  st.setProperty("--ciel-bas", texteRgb(melange(pal[i][2], pal[i + 1][2], t)));
  st.setProperty("--accent-ciel", texteRgb(melange(LAB.accents[i], LAB.accents[i + 1], t)));
  const etoiles = $("etoiles");
  etoiles.style.opacity = lerp(ETOILES[i], ETOILES[i + 1], t).toFixed(3);
  etoiles.style.setProperty("--teinte", texteRgb(melange(LAB.rose, LAB.blanc, borne(v, 0, 1))));
  $("poussiere").style.opacity = lerp(POUSSIERE[i], POUSSIERE[i + 1], t).toFixed(3);
  calques.forEach((c, k) => {
    const w = 1 - Math.abs(v - k);
    if (w <= 0.002) { c.classList.add("eteint"); return; }
    c.classList.remove("eteint");
    const d = w * w * (3 - 2 * w);
    c.style.opacity = d.toFixed(3);
    c.style.transform = `scale(${(0.84 + 0.16 * d).toFixed(3)})`;
  });
  document.body.classList.toggle("jour", !sombre && v >= 4.5);
  // Couleur de la barre de Safari : mise à jour sans s'emballer
  const hex = hexRgb(haut);
  if (hex !== dernierTheme && !minuteurTheme) {
    minuteurTheme = setTimeout(() => {
      minuteurTheme = 0;
      dernierTheme = getComputedStyle(document.documentElement).getPropertyValue("--ciel-haut").trim();
      $("couleur-theme").setAttribute("content", dernierTheme.startsWith("rgb") ? hexRgb(dernierTheme.match(/\d+/g).map(Number)) : dernierTheme);
    }, 160);
  }
}

// Une étoile filante, de temps en temps, les nuits claires
function etoileFilante(forcer = false) {
  if (reduit || document.hidden || ongletActif !== "aujourdhui") return;
  if (!forcer && !(valeur > 1.6 && valeur < 4.4)) return;
  const f = el("i", { class: "filante" });
  const a = (18 + Math.random() * 22) * Math.PI / 180, dist = 260 + Math.random() * 200;
  f.style.left = (30 + Math.random() * 65) + "vw";
  f.style.top = (3 + Math.random() * 28) + "vh";
  const rot = `rotate(${(-a * 180 / Math.PI).toFixed(1)}deg)`;
  $("etoiles").append(f);
  f.animate([
    { transform: `translate(0, 0) ${rot} scaleX(.2)`, opacity: 0 },
    { opacity: 1, offset: 0.25 },
    { transform: `translate(${(-Math.cos(a) * dist).toFixed(0)}px, ${(Math.sin(a) * dist).toFixed(0)}px) ${rot} scaleX(1)`, opacity: 0 },
  ], { duration: 1000 + Math.random() * 500, easing: "cubic-bezier(.3,.1,.5,1)" }).finished.then(() => f.remove(), () => f.remove());
}
setInterval(() => { if (Math.random() < 0.45) etoileFilante(); }, 6500);

/* =========================================================
   Sons (Web Audio) et retour haptique
   ========================================================= */

let audio = null, tamponEtoile = null, chargementSon = null;
function preparerAudio() {
  if (!donnees.sons) return;
  try {
    if (!audio) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      audio = new C();
    }
    if (audio.state === "suspended") audio.resume();
    if (!tamponEtoile && !chargementSon) {
      chargementSon = fetch("sons/etoile.mp3").then((r) => r.arrayBuffer())
        .then((b) => new Promise((ok, ko) => audio.decodeAudioData(b, ok, ko)))
        .then((t) => { tamponEtoile = t; })
        .catch(() => { chargementSon = null; });
    }
  } catch (e) {}
}
// Une note de verre à chaque cran : grave pour les lunes, aiguë pour les soleils (la mineur pentatonique)
const GAMME = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
function noteCran(i) {
  if (!donnees.sons || !audio || audio.state !== "running") return;
  const t = audio.currentTime, g = audio.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.045, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  g.connect(audio.destination);
  [[1, 1], [2.01, 0.22], [3.02, 0.06]].forEach(([mult, vol]) => {
    const o = audio.createOscillator(), gg = audio.createGain();
    o.type = "sine"; o.frequency.value = GAMME[i] * mult; gg.gain.value = vol;
    o.connect(gg).connect(g); o.start(t); o.stop(t + 0.55);
  });
}
// Le scintillement d'étoile (Soundza), plus grave sous la lune, plus clair au soleil
function sonEtoile(i) {
  if (!donnees.sons || !audio || !tamponEtoile) return;
  try {
    const s = audio.createBufferSource(), g = audio.createGain();
    s.buffer = tamponEtoile;
    s.playbackRate.value = [0.78, 0.82, 0.87, 0.93, 1, 1.04, 1.08, 1.12, 1.17][i];
    g.gain.value = 0.4;
    s.connect(g).connect(audio.destination);
    s.start();
  } catch (e) {}
}
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let interrupteurHaptique = null;
function haptique() {
  try { navigator.vibrate?.(8); } catch (e) {}
  if (!IOS) return;
  try {
    // Sur iPhone (iOS 18+), basculer un interrupteur natif déclenche un léger retour haptique.
    if (!interrupteurHaptique) {
      interrupteurHaptique = el("label", { class: "haptique", "aria-hidden": "true" }, el("input", { type: "checkbox", switch: true, tabindex: "-1" }));
      document.body.append(interrupteurHaptique);
    }
    interrupteurHaptique.click();
  } catch (e) {}
}

/* =========================================================
   Le curseur d'humeur
   ========================================================= */

const curseur = $("curseur"), pouce = $("pouce");
const MARGE = 20;
let valeur = 4;          // position affichée (continue)
let cran = 4;            // humeur choisie (0 à 8)
let cranAffiche = -1;
let largeur = 0, gauche = 0;
let animCurseur = 0;

function mesurer() {
  const r = curseur.getBoundingClientRect();
  largeur = r.width; gauche = r.left;
  placerCrans();
}
const positionX = (v) => MARGE + (v / 8) * Math.max(0, largeur - 2 * MARGE);
const valeurDepuisX = (x) => borne(((x - gauche - MARGE) / Math.max(1, largeur - 2 * MARGE)) * 8, 0, 8);

function placerCrans() {
  const c = $("crans");
  if (!c.children.length) c.innerHTML = HUMEURS.map(() => '<i class="cran"></i>').join("");
  [...c.children].forEach((e, k) => { e.style.left = `${positionX(k) - 12}px`; });
}

function placer(v) {
  valeur = v;
  pouce.style.transform = `translateX(${positionX(v).toFixed(1)}px)`;
  appliquerCiel(v);
  const r = Math.round(v);
  if (r !== cranAffiche) {
    cranAffiche = r;
    pouce.innerHTML = medaillon(r);
    $("nom-humeur").textContent = HUMEURS[r].nom;
    $("nom-astre").textContent = HUMEURS[r].astre;
    rejouer(document.querySelector(".libelle"), "change");
    [...$("crans").children].forEach((e, k) => e.classList.toggle("proche", k === r));
  }
}

function allerA(cible, vitesse = 9) {
  cancelAnimationFrame(animCurseur);
  if (reduit) { placer(cible); return; }
  let avant = performance.now();
  const pas = (t) => {
    const dt = Math.min(0.05, (t - avant) / 1000);
    avant = t;
    const d = cible - valeur;
    if (Math.abs(d) < 0.003) { placer(cible); return; }
    placer(valeur + d * (1 - Math.exp(-dt * vitesse)));
    animCurseur = requestAnimationFrame(pas);
  };
  animCurseur = requestAnimationFrame(pas);
}

function choisir(r, { son = true } = {}) {
  if (r === cran) return;
  cran = r;
  curseur.setAttribute("aria-valuenow", r);
  curseur.setAttribute("aria-valuetext", `${HUMEURS[r].nom}, ${HUMEURS[r].astre.toLowerCase()}`);
  if (son) { haptique(); noteCran(r); }
  majBouton();
}

let tire = false, glisse = false, departX = 0;
curseur.addEventListener("pointerdown", (e) => {
  if (e.button > 0) return;
  preparerAudio();
  mesurer();
  tire = true; glisse = false; departX = e.clientX;
  try { curseur.setPointerCapture(e.pointerId); } catch (err) {}
  curseur.classList.add("tire");
  const surPouce = Math.abs(positionX(valeur) - (e.clientX - gauche)) < 26;
  if (surPouce) { glisse = true; cancelAnimationFrame(animCurseur); }
  else { const r = Math.round(valeurDepuisX(e.clientX)); choisir(r); allerA(r); }
});
curseur.addEventListener("pointermove", (e) => {
  if (!tire) return;
  if (!glisse && Math.abs(e.clientX - departX) < 5) return;
  glisse = true;
  cancelAnimationFrame(animCurseur);
  const v = valeurDepuisX(e.clientX);
  placer(v);
  choisir(Math.round(v));
});
function finTire() {
  if (!tire) return;
  tire = false;
  curseur.classList.remove("tire");
  allerA(cran, 14);
}
curseur.addEventListener("pointerup", finTire);
curseur.addEventListener("pointercancel", finTire);
curseur.addEventListener("lostpointercapture", finTire);
curseur.addEventListener("keydown", (e) => {
  const pas = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -2, PageUp: 2 }[e.key];
  let r = null;
  if (pas) r = borne(cran + pas, 0, 8);
  else if (e.key === "Home") r = 0;
  else if (e.key === "End") r = 8;
  if (r == null) return;
  e.preventDefault();
  choisir(r);
  allerA(r);
});

/* =========================================================
   L'écran du jour
   ========================================================= */

let jourEdite = aujourdhui();
let ongletActif = "aujourdhui";

function allerAuJour(k, { anime = true } = {}) {
  jourEdite = k;
  const e = donnees.jours[k];
  const cible = e ? e.h : 4;
  choisir(cible, { son: false });
  rendreJour();
  if (anime) allerA(cible); else placer(cible);
}

function rendreJour() {
  const k = jourEdite, t = aujourdhui();
  const hier = decaler(t, -1);
  $("date-jour").textContent = k === t ? fmtLong.format(dateDe(k)) : k === hier ? `Hier · ${fmtLong.format(dateDe(k))}` : fmtLong.format(dateDe(k));
  $("question").textContent = k === t ? "Comment était ta journée ?" : "Comment était cette journée ?";
  $("retour-auj").hidden = k === t;
  $("jour-suiv").disabled = k >= t;
  majBouton();
}

function majBouton() {
  const e = donnees.jours[jourEdite];
  const b = $("enregistrer");
  if (!e) {
    b.className = "bouton-ciel";
    b.textContent = jourEdite === aujourdhui() ? "Enregistrer ma journée" : "Enregistrer cette journée";
  } else if (e.h === cran) {
    b.className = "bouton-ciel fait";
    b.innerHTML = SVG_COCHE + "Journée enregistrée";
  } else {
    b.className = "bouton-ciel";
    b.textContent = `Changer pour « ${HUMEURS[cran].nom} »`;
  }
  rendreApres();
  $("soutien").hidden = !(e && e.h === 0 && cran === 0);
}

// Ce qui apparaît une fois la journée notée : la note (facultative)
function rendreApres() {
  const zone = $("apres");
  const e = donnees.jours[jourEdite];
  if (!e) { zone.hidden = true; zone.replaceChildren(); return; }
  const etaitCache = zone.hidden;
  zone.hidden = false;
  const note = e.note
    ? el("button", { class: "apercu-note verre-ciel", onclick: ouvrirNote, "aria-label": "Modifier ta note" },
        el("span", {}, "Ta note"), el("p", {}, e.note))
    : el("button", { class: "ecrire verre-ciel", onclick: ouvrirNote, html: `${SVG_PLUME}Écrire un mot sur ta journée <small>· facultatif</small>` });
  zone.replaceChildren(note, el("button", { class: "effacer-jour", onclick: effacerJour }, "Effacer cette journée"));
  if (!etaitCache) zone.style.animation = "none";
  else zone.style.animation = "";
}

$("enregistrer").addEventListener("click", () => {
  const ancien = donnees.jours[jourEdite];
  if (ancien && ancien.h === cran) return;
  preparerAudio();
  donnees.jours[jourEdite] = { h: cran, note: ancien?.note || "", maj: Date.now() };
  sauver();
  sonEtoile(cran);
  haptique();
  celebrer(cran);
  majBouton();
  toast(ancien ? `Changée pour « ${HUMEURS[cran].nom} »` : `${HUMEURS[cran].astre} · journée enregistrée`, { medaillonDe: cran });
});

function effacerJour() {
  const k = jourEdite, ancien = donnees.jours[k];
  if (!ancien) return;
  delete donnees.jours[k];
  sauver();
  allerAuJour(k);
  toast("Journée effacée", {
    icone: "↺", action: "Annuler",
    surAction: () => { donnees.jours[k] = ancien; sauver(); if (jourEdite === k) allerAuJour(k); },
  });
}

// Feu d'artifice d'étoiles autour de l'astre
function celebrer(i) {
  rejouer($("astres"), "fete");
  if (reduit) return;
  const r = $("astres").getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const taille = r.width * 0.56;
  const onde = el("div", { class: "onde" });
  onde.style.cssText = `left:${cx - taille / 2}px;top:${cy - taille / 2}px;width:${taille}px;height:${taille}px`;
  document.body.append(onde);
  onde.animate([{ transform: "scale(.6)", opacity: 0.95 }, { transform: "scale(2.2)", opacity: 0 }], { duration: 1150, easing: "cubic-bezier(.2,.8,.2,1)" })
    .finished.then(() => onde.remove(), () => onde.remove());
  const n = i >= 5 ? 24 : 15;
  for (let k = 0; k < n; k++) {
    const s = 8 + Math.random() * 13;
    const e = el("div", { class: "eclat", html: `<svg viewBox="-10 -10 20 20"><path d="${etoile4(0, 0, 10)}" fill="${k % 3 ? "#ffffff" : ACCENTS[i]}"/></svg>` });
    e.style.width = e.style.height = `${s}px`;
    document.body.append(e);
    const ang = Math.random() * Math.PI * 2, d = r.width * (0.32 + Math.random() * 0.5);
    const x0 = cx - s / 2, y0 = cy - s / 2, monte = i >= 5 ? 0 : -50;
    e.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.2)`, opacity: 0 },
      { opacity: 1, offset: 0.18 },
      { transform: `translate(${x0 + Math.cos(ang) * d}px, ${y0 + Math.sin(ang) * d + monte}px) scale(1) rotate(${Math.round((Math.random() - 0.5) * 200)}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 800, delay: Math.random() * 140, easing: "cubic-bezier(.15,.7,.3,1)" })
      .finished.then(() => e.remove(), () => e.remove());
  }
  if (i <= 4) setTimeout(() => etoileFilante(true), 250);
}

$("jour-prec").addEventListener("click", () => allerAuJour(decaler(jourEdite, -1)));
$("jour-suiv").addEventListener("click", () => { if (jourEdite < aujourdhui()) allerAuJour(decaler(jourEdite, 1)); });
$("retour-auj").addEventListener("click", () => allerAuJour(aujourdhui()));

/* =========================================================
   La note du jour (page plein écran, le clavier ne cache rien)
   ========================================================= */

const INVITES = [
  "Qu'est-ce qui a été si lourd ?", "Qu'est-ce qui t'a pesé ?", "Qu'est-ce qui n'allait pas ?",
  "Qu'est-ce qui aurait pu être mieux ?", "Qu'est-ce qui a marqué ta journée ?", "Qu'est-ce qui t'a fait sourire ?",
  "Qu'est-ce qui a rendu ta journée belle ?", "Qu'est-ce qui l'a rendue superbe ?", "Raconte ce moment incroyable !",
];
let jourNote = null, texteInitial = "";

function ouvrirNote() {
  const e = donnees.jours[jourEdite];
  if (!e) return;
  jourNote = jourEdite;
  const p = $("page-note");
  const ciel = (sombre ? CIELS_SOMBRE : CIELS_CLAIR)[e.h];
  p.querySelector(".page-note-ciel").style.background = `linear-gradient(180deg, ${ciel[0]}, ${ciel[1]} 58%, ${ciel[2]})`;
  p.classList.toggle("jour", !sombre && e.h >= 5);
  $("note-medaillon").innerHTML = medaillon(e.h);
  $("note-titre").textContent = `${nomDuJour(jourNote)} · ${HUMEURS[e.h].nom}`;
  $("note-invite").textContent = INVITES[e.h];
  const zone = $("texte-note");
  zone.value = texteInitial = e.note || "";
  p.classList.remove("ferme");
  p.hidden = false;
  rejouer(p, "ouvre");
  zone.focus({ preventScroll: true });
}
function fermerNote() {
  const p = $("page-note");
  if (p.hidden) return;
  $("texte-note").blur();
  p.classList.add("ferme");
  setTimeout(() => { p.hidden = true; p.classList.remove("ferme"); }, reduit ? 0 : 290);
}
$("note-ok").addEventListener("click", () => {
  const e = donnees.jours[jourNote];
  const texte = $("texte-note").value.trim();
  if (e && texte !== (e.note || "")) {
    e.note = texte;
    e.maj = Date.now();
    sauver();
    toast(texte ? "Note enregistrée" : "Note retirée", { medaillonDe: e.h });
  }
  fermerNote();
  majBouton();
});
$("note-annuler").addEventListener("click", () => {
  const v = $("texte-note").value;
  if (v.trim() && v !== texteInitial && !confirm("Abandonner ce que tu viens d'écrire ?")) return;
  fermerNote();
});

/* =========================================================
   Journal : calendrier et notes du mois
   ========================================================= */

let moisAffiche = aujourdhui().slice(0, 7);

function rendreJournal() {
  const [a, m] = moisAffiche.split("-").map(Number);
  const premier = new Date(a, m - 1, 1);
  const t = aujourdhui();
  $("titre-mois").textContent = fmtMois.format(premier);
  $("mois-suiv").disabled = moisAffiche >= t.slice(0, 7);
  const cases = [];
  const decalage = (premier.getDay() + 6) % 7;
  for (let i = 0; i < decalage; i++) cases.push(el("span", { class: "case hors", "aria-hidden": "true" }));
  const nb = new Date(a, m, 0).getDate();
  for (let j = 1; j <= nb; j++) {
    const k = `${a}-${deux(m)}-${deux(j)}`;
    const e = donnees.jours[k];
    const futur = k > t;
    const b = el("button", {
      class: `case${e ? " notee" : ""}${e?.note ? " ecrit" : ""}${k === t ? " auj" : ""}${futur ? " futur" : ""}`,
      disabled: futur,
      "aria-label": `${fmtLong.format(dateDe(k))}${e ? ` : ${HUMEURS[e.h].nom}${e.note ? ", avec une note" : ""}` : ", pas encore notée"}`,
      onclick: () => ouvrirJour(k),
    });
    if (e) b.insertAdjacentHTML("beforeend", medaillon(e.h));
    b.append(el("span", { class: "num" }, String(j)));
    cases.push(b);
  }
  $("grille").replaceChildren(...cases);

  const cles = Object.keys(donnees.jours).filter((k) => k.startsWith(moisAffiche)).sort().reverse();
  const resume = $("resume-mois");
  if (cles.length) {
    const r = Math.round(moyenne(cles));
    resume.innerHTML = `<span><b>${pluriel(cles.length, "journée")}</b> ${cles.length > 1 ? "notées" : "notée"}</span><span>· en moyenne</span>${medaillon(r)}<b>${HUMEURS[r].nom}</b>`;
  } else {
    resume.textContent = moisAffiche === t.slice(0, 7) ? "Aucune journée notée ce mois-ci pour l'instant" : "Aucune journée notée ce mois-là";
  }
  const liste = $("entrees");
  if (!cles.length) {
    liste.replaceChildren(el("div", { class: "vide", html: `${medaillon(4)}<b>Rien d'écrit ce mois-ci</b><span>Note ta journée dans l'onglet Aujourd'hui, puis ajoute un mot si tu veux.</span>` }));
  } else {
    liste.replaceChildren(...cles.map((k, i) => {
      const e = donnees.jours[k];
      const b = el("button", { class: "entree", onclick: () => ouvrirJour(k), style: `animation-delay:${Math.min(i, 8) * 30}ms` });
      b.innerHTML = medaillon(e.h);
      b.append(el("div", { class: "txt" },
        el("div", { class: "ligne1" }, el("span", { class: "h" }, HUMEURS[e.h].nom), el("span", { class: "d" }, majuscule(fmtCourt.format(dateDe(k))))),
        e.note ? el("p", {}, e.note) : el("p", { class: "vide-note" }, "Pas de note")));
      return b;
    }));
  }
}
function ouvrirJour(k) {
  changerOnglet("aujourdhui");
  allerAuJour(k);
}
$("mois-prec").addEventListener("click", () => { moisAffiche = decaler(`${moisAffiche}-01`, -1).slice(0, 7); rendreJournal(); });
$("mois-suiv").addEventListener("click", () => {
  const [a, m] = moisAffiche.split("-").map(Number);
  const suivant = cleDe(new Date(a, m, 1)).slice(0, 7);
  if (suivant <= aujourdhui().slice(0, 7)) { moisAffiche = suivant; rendreJournal(); }
});

/* =========================================================
   Bilan : moyennes, courbe, répartition, jours de la semaine
   ========================================================= */

let periode = 30;
const NS = "http://www.w3.org/2000/svg";
const couleurs = () => (sombre ? DIVERGENT.sombre : DIVERGENT.clair);
const nomHumeur = (moy) => HUMEURS[borne(Math.round(moy), 0, 8)].nom;

function rendreBilan() {
  if (ongletActif !== "bilan") return;
  rendreTuiles();
  const fin = aujourdhui(), debut = decaler(fin, -(periode - 1));
  const cles = Object.keys(donnees.jours).filter((k) => k >= debut && k <= fin).sort();
  rendreCourbe(cles, debut, fin);
  rendreRepartition(cles);
  rendreSemaine(cles);
  rendreSeries();
}

function tuile(id, titre, cles, avant, nomAvant) {
  const t = $(id);
  if (!cles.length) {
    t.innerHTML = `<div class="tuile-tete"><span class="etiq">${titre}</span>${medaillon(4)}</div><b class="nom rien">Pas encore de journée notée</b>`;
    return;
  }
  const moy = moyenne(cles), r = Math.round(moy);
  let delta = "";
  if (avant.length) {
    const d = moy - moyenne(avant);
    delta = Math.abs(d) < 0.15 ? `<p class="delta"><span class="fl">＝</span>Comme en ${nomAvant}</p>`
      : d > 0 ? `<p class="delta"><span class="fl haut">▲</span>Mieux qu'en ${nomAvant}</p>`
      : `<p class="delta"><span class="fl bas">▼</span>Moins bien qu'en ${nomAvant}</p>`;
  }
  t.innerHTML = `<div class="tuile-tete"><span class="etiq">${titre}</span>${medaillon(r)}</div>
    <b class="nom">${HUMEURS[r].nom}</b>
    <div class="jauge" role="img" aria-label="Moyenne entre ${HUMEURS[Math.floor(moy)].nom} et ${HUMEURS[Math.ceil(moy)].nom}"><i style="left:${(moy / 8) * 100}%"></i></div>
    <p class="compte">${pluriel(cles.length, "journée")} ${cles.length > 1 ? "notées" : "notée"}</p>${delta}`;
}
function rendreTuiles() {
  const t = aujourdhui();
  const mois = t.slice(0, 7), annee = t.slice(0, 4);
  const moisAvant = decaler(`${mois}-01`, -1).slice(0, 7), anneeAvant = String(Number(annee) - 1);
  const toutes = Object.keys(donnees.jours);
  tuile("tuile-mois", majuscule(fmtMoisSeul.format(dateDe(t))), toutes.filter((k) => k.startsWith(mois)),
    toutes.filter((k) => k.startsWith(moisAvant)), fmtMoisSeul.format(dateDe(`${moisAvant}-01`)));
  tuile("tuile-annee", `Année ${annee}`, toutes.filter((k) => k.startsWith(annee)), toutes.filter((k) => k.startsWith(anneeAvant)), anneeAvant);
}

// Courbe monotone (ne dépasse jamais les points : elle reste entre lune de sang et soleil radieux)
function cheminLisse(p) {
  const n = p.length;
  if (n === 1) return "";
  const f = (v) => v.toFixed(1);
  if (n === 2) return `M${f(p[0][0])} ${f(p[0][1])}L${f(p[1][0])} ${f(p[1][1])}`;
  const dx = [], s = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1][0] - p[i][0]; s[i] = (p[i + 1][1] - p[i][1]) / dx[i]; }
  m[0] = s[0]; m[n - 1] = s[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (s[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / s[i], b = m[i + 1] / s[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * s[i]; m[i + 1] = k * b * s[i]; }
  }
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    d += `C${f(p[i][0] + dx[i] / 3)} ${f(p[i][1] + (m[i] * dx[i]) / 3)} ${f(p[i + 1][0] - dx[i] / 3)} ${f(p[i + 1][1] - (m[i + 1] * dx[i]) / 3)} ${f(p[i + 1][0])} ${f(p[i + 1][1])}`;
  }
  return d;
}

function bulle(boite) {
  let b = boite.querySelector(".bulle");
  if (!b) { b = el("div", { class: "bulle", "aria-hidden": "true" }); boite.append(b); }
  return b;
}
function montrerBulle(boite, x, y, { niveau, titre, detail, note }) {
  const b = bulle(boite);
  b.replaceChildren(el("div", { class: "bv", html: medaillon(niveau) }), el("div", { class: "bd" }, detail));
  b.firstChild.append(document.createTextNode(titre));
  if (note) b.append(el("div", { class: "bn" }, note));
  const w = boite.clientWidth;
  const largeurBulle = Math.min(220, Math.max(120, b.offsetWidth || 160));
  b.style.left = `${borne(x, largeurBulle / 2 - 4, w - largeurBulle / 2 + 4)}px`;
  b.style.top = `${Math.max(y, 54)}px`;
  b.classList.add("visible");
}
function cacherBulle(boite) { boite.querySelector(".bulle")?.classList.remove("visible"); }

function tableAccessible(titre, lignes, [ta, tb] = ["Date", "Humeur"]) {
  return `<div class="sr"><table><caption>${titre}</caption><thead><tr><th>${ta}</th><th>${tb}</th></tr></thead><tbody>${lignes.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</tbody></table></div>`;
}

function rendreCourbe(cles, debut, fin) {
  const boite = $("courbe");
  const C = couleurs();
  const W = Math.max(260, boite.clientWidth || 320), H = 214;
  const m = { g: 30, d: 10, h: 12, b: 26 };
  const pw = W - m.g - m.d, ph = H - m.h - m.b;
  const n = Math.max(1, ecart(debut, fin));
  const X = (x) => m.g + (x / n) * pw;
  const Y = (y) => m.h + ((4 - y) / 8) * ph;
  const hebdo = periode > 90;

  let pts;
  if (!hebdo) {
    pts = cles.map((k) => ({ x: ecart(debut, k), y: donnees.jours[k].h - 4, k, niveau: donnees.jours[k].h, note: donnees.jours[k].note }));
    // Sur 3 mois, la ligne suit la tendance sur 5 jours ; chaque journée reste un petit point
    for (const p of pts) {
      const voisins = pts.filter((q) => Math.abs(q.x - p.x) <= 2);
      p.ly = periode === 90 ? voisins.reduce((a, q) => a + q.y, 0) / voisins.length : p.y;
    }
  } else {
    const sem = new Map();
    for (const k of cles) {
      const w = Math.floor(ecart(debut, k) / 7);
      if (!sem.has(w)) sem.set(w, []);
      sem.get(w).push(k);
    }
    pts = [...sem.entries()].sort((a, b) => a[0] - b[0]).map(([w, ks]) => {
      const moy = moyenne(ks);
      return { x: Math.min(n, w * 7 + 3), y: moy - 4, ly: moy - 4, k: decaler(debut, w * 7), niveau: Math.round(moy), nb: ks.length };
    });
  }
  const sous = $("sous-courbe");
  sous.innerHTML = cles.length
    ? `${pluriel(cles.length, "journée")} ${cles.length > 1 ? "notées" : "notée"} · en moyenne <b>${nomHumeur(moyenne(cles))}</b>${hebdo ? " · moyenne par semaine" : periode === 90 ? " · tendance sur 5 jours" : ""}`
    : "Aucune journée notée sur cette période";

  // Repères : soleil radieux en haut, aube au milieu, lune de sang en bas
  let svg = `<defs>
    <linearGradient id="cg-ligne" gradientUnits="userSpaceOnUse" x1="0" y1="${Y(4)}" x2="0" y2="${Y(-4)}">
      <stop offset="0" stop-color="${C[8]}"/><stop offset=".25" stop-color="${C[6]}"/><stop offset=".5" stop-color="${C[4]}"/><stop offset=".75" stop-color="${C[2]}"/><stop offset="1" stop-color="${C[0]}"/>
    </linearGradient>
    <linearGradient id="cg-aire" gradientUnits="userSpaceOnUse" x1="0" y1="${Y(4)}" x2="0" y2="${Y(-4)}">
      <stop offset="0" stop-color="${C[8]}" stop-opacity=".3"/><stop offset=".5" stop-color="${C[4]}" stop-opacity="0"/><stop offset="1" stop-color="${C[0]}" stop-opacity=".3"/>
    </linearGradient>
  </defs>`;
  for (const y of [4, 2, -2, -4]) svg += `<line class="grille-l" x1="${m.g}" x2="${W - m.d}" y1="${Y(y)}" y2="${Y(y)}"/>`;
  svg += `<line class="base-l" x1="${m.g}" x2="${W - m.d}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  for (const [y, i] of [[4, 8], [0, 4], [-4, 0]]) svg += `<svg x="2" y="${Y(y) - 9}" width="18" height="18" viewBox="0 0 64 64"><use href="#m${i}"/></svg>`;

  // Axe du temps
  const ticks = [];
  if (periode === 30) for (let d = 0; d <= 28; d += 7) ticks.push([n - d, fmtJourMois.format(dateDe(decaler(fin, -d)))]);
  else {
    for (let d = 0; d <= n; d++) {
      const k = decaler(debut, d);
      if (k.endsWith("-01")) ticks.push([d, hebdo ? majuscule(fmtMoisCourt.format(dateDe(k))).charAt(0) : fmtMoisCourt.format(dateDe(k))]);
    }
  }
  for (const [x, t] of ticks) svg += `<text x="${X(x)}" y="${H - 6}" text-anchor="middle">${t}</text>`;

  // Segments (on coupe la courbe quand il manque plus d'une semaine)
  const trou = hebdo ? 21 : 7;
  const segments = [];
  for (const p of pts) {
    const dernier = segments.at(-1);
    if (dernier && p.x - dernier.at(-1).x <= trou) dernier.push(p);
    else segments.push([p]);
  }
  for (const seg of segments) {
    const xy = seg.map((p) => [X(p.x), Y(p.ly)]);
    if (xy.length === 1) continue;
    const ligne = cheminLisse(xy);
    svg += `<path d="${ligne}L${xy.at(-1)[0].toFixed(1)} ${Y(0)}L${xy[0][0].toFixed(1)} ${Y(0)}Z" fill="url(#cg-aire)"/>`;
    svg += `<path d="${ligne}" fill="none" stroke="url(#cg-ligne)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const points = !hebdo && periode === 30;
  for (const seg of segments) {
    for (const p of seg) {
      if (points || seg.length === 1) svg += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="4" fill="${C[p.niveau]}" stroke="var(--surface)" stroke-width="2"/>`;
      else if (!hebdo) svg += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="2.2" fill="${C[p.niveau]}" opacity=".5"/>`;
    }
  }
  svg += `<line class="croix" x1="0" x2="0" y1="${m.h}" y2="${H - m.b}" visibility="hidden"/><circle class="repere" r="6" fill="var(--surface)" stroke-width="3" visibility="hidden"/>`;
  svg += `<rect class="zone-tactile" x="${m.g - 6}" y="0" width="${pw + 12}" height="${H}"/>`;

  boite.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Courbe de ton humeur sur ${periode === 30 ? "30 jours" : periode === 90 ? "3 mois" : "12 mois"}">${svg}</svg>` +
    (pts.length < 2 ? `<div class="vide-graph">Note au moins deux journées pour voir ta courbe se dessiner ✦</div>` : "") +
    tableAccessible("Humeur par jour", pts.map((p) => [hebdo ? `Semaine du ${fmtJourMois.format(dateDe(p.k))}` : fmtLong.format(dateDe(p.k)), HUMEURS[p.niveau].nom]));
  if (!pts.length) return;

  // Survol au doigt : la croix trouve le jour le plus proche
  const s = boite.querySelector("svg"), croix = s.querySelector(".croix"), repere = s.querySelector(".repere");
  let choisi = -1;
  const montrer = (idx) => {
    choisi = idx;
    const p = pts[idx], x = X(p.x), y = Y(p.y);
    croix.setAttribute("x1", x); croix.setAttribute("x2", x); croix.setAttribute("visibility", "visible");
    repere.setAttribute("cx", x); repere.setAttribute("cy", y); repere.setAttribute("stroke", C[p.niveau]); repere.setAttribute("visibility", "visible");
    const echelle = boite.clientWidth / W;
    montrerBulle(boite, x * echelle, y * echelle, hebdo
      ? { niveau: p.niveau, titre: nomHumeur(p.y + 4), detail: `Semaine du ${fmtJourMois.format(dateDe(p.k))} · ${pluriel(p.nb, "jour")}` }
      : { niveau: p.niveau, titre: HUMEURS[p.niveau].nom, detail: majuscule(fmtCourt.format(dateDe(p.k))), note: p.note });
  };
  const cacher = () => { choisi = -1; croix.setAttribute("visibility", "hidden"); repere.setAttribute("visibility", "hidden"); cacherBulle(boite); };
  const proche = (ev) => {
    const r = s.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    let best = 0, dist = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(X(p.x) - x); if (d < dist) { dist = d; best = i; } });
    return best;
  };
  let minuteur;
  s.addEventListener("pointerdown", (ev) => { clearTimeout(minuteur); montrer(proche(ev)); });
  s.addEventListener("pointermove", (ev) => { if (ev.pointerType === "mouse" || ev.buttons) montrer(proche(ev)); });
  s.addEventListener("pointerleave", (ev) => { if (ev.pointerType === "mouse") cacher(); });
  s.addEventListener("pointerup", (ev) => { if (ev.pointerType !== "mouse") { clearTimeout(minuteur); minuteur = setTimeout(cacher, 2600); } });
  boite.tabIndex = 0;
  boite.onkeydown = (ev) => {
    if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
      ev.preventDefault();
      montrer(borne((choisi < 0 ? pts.length : choisi) + (ev.key === "ArrowRight" ? 1 : -1), 0, pts.length - 1));
    } else if (ev.key === "Escape") cacher();
  };
  boite.onblur = cacher;
}

// Barres avec un bout arrondi (côté valeur) et un pied carré (côté ligne de base)
function barre(x, y0, y1, l, r = 4) {
  const h = Math.abs(y1 - y0);
  if (h < 0.5) return "";
  r = Math.min(r, h, l / 2);
  if (y1 < y0) return `M${x} ${y0}V${y1 + r}Q${x} ${y1} ${x + r} ${y1}H${x + l - r}Q${x + l} ${y1} ${x + l} ${y1 + r}V${y0}Z`;
  return `M${x} ${y0}V${y1 - r}Q${x} ${y1} ${x + r} ${y1}H${x + l - r}Q${x + l} ${y1} ${x + l} ${y1 - r}V${y0}Z`;
}

function rendreRepartition(cles) {
  const boite = $("repartition");
  const C = couleurs();
  const comptes = Array(9).fill(0);
  cles.forEach((k) => comptes[donnees.jours[k].h]++);
  const total = cles.length, max = Math.max(1, ...comptes);
  const W = Math.max(260, boite.clientWidth || 320), H = 156;
  const m = { g: 2, d: 2, h: 20, b: 34 };
  const pw = W - m.g - m.d, ph = H - m.h - m.b, base = m.h + ph;
  const slot = pw / 9, l = Math.min(22, slot * 0.6);
  const iMax = comptes.indexOf(Math.max(...comptes));
  $("sous-repartition").innerHTML = total
    ? `Le plus fréquent : <b>${HUMEURS[iMax].nom}</b>, ${pluriel(comptes[iMax], "jour")} sur ${total}`
    : "Aucune journée notée sur cette période";
  let svg = `<line class="base-l" x1="${m.g}" x2="${W - m.d}" y1="${base}" y2="${base}"/>`;
  comptes.forEach((c, i) => {
    const x = m.g + slot * i + (slot - l) / 2, cx = m.g + slot * i + slot / 2;
    const y = base - (c / max) * ph;
    if (c) svg += `<path class="barre" data-i="${i}" d="${barre(x, base, y, l)}" fill="${C[i]}"/>`;
    if (c && i === iMax) svg += `<text class="fort" x="${cx}" y="${y - 6}" text-anchor="middle">${c}</text>`;
    svg += `<svg x="${cx - 11}" y="${base + 8}" width="22" height="22" viewBox="0 0 64 64"><use href="#m${i}"/></svg>`;
    svg += `<rect class="zone-tactile" data-i="${i}" x="${m.g + slot * i}" y="0" width="${slot}" height="${H}"/>`;
  });
  boite.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Répartition de tes humeurs">${svg}</svg>` +
    tableAccessible("Nombre de jours par humeur", comptes.map((c, i) => [HUMEURS[i].nom, pluriel(c, "jour")]), ["Humeur", "Jours"]);
  const s = boite.querySelector("svg");
  let minuteur;
  const montrer = (i) => {
    s.querySelectorAll(".barre").forEach((b) => b.classList.toggle("estompe", Number(b.dataset.i) !== i));
    const echelle = boite.clientWidth / W;
    const y = comptes[i] ? base - (comptes[i] / max) * ph : base;
    montrerBulle(boite, (m.g + slot * i + slot / 2) * echelle, y * echelle, {
      niveau: i, titre: HUMEURS[i].nom,
      detail: total ? `${pluriel(comptes[i], "jour")} · ${Math.round((comptes[i] / total) * 100)} %` : "Aucun jour",
    });
  };
  const cacher = () => { s.querySelectorAll(".barre").forEach((b) => b.classList.remove("estompe")); cacherBulle(boite); };
  s.addEventListener("pointerover", (ev) => { const i = ev.target.dataset?.i; if (i != null && ev.pointerType === "mouse") montrer(Number(i)); });
  s.addEventListener("pointerdown", (ev) => { const i = ev.target.dataset?.i; if (i != null) { clearTimeout(minuteur); montrer(Number(i)); } });
  s.addEventListener("pointerup", (ev) => { if (ev.pointerType !== "mouse") { clearTimeout(minuteur); minuteur = setTimeout(cacher, 2400); } });
  s.addEventListener("pointerleave", (ev) => { if (ev.pointerType === "mouse") cacher(); });
}

function rendreSemaine(cles) {
  const boite = $("semaine");
  const C = couleurs();
  const sommes = Array(7).fill(0), nb = Array(7).fill(0);
  cles.forEach((k) => { const j = (dateDe(k).getDay() + 6) % 7; sommes[j] += donnees.jours[k].h; nb[j]++; });
  const moy = sommes.map((s, j) => (nb[j] ? s / nb[j] : null));
  const W = Math.max(260, boite.clientWidth || 320), H = 168;
  const m = { g: 2, d: 2, h: 16, b: 26 };
  const pw = W - m.g - m.d, ph = H - m.h - m.b, base = m.h + ph / 2;
  const slot = pw / 7, l = Math.min(24, slot * 0.5);
  const Y = (v) => base - ((v - 4) / 4) * (ph / 2);
  const avecDonnees = moy.map((v, j) => [v, j]).filter(([v]) => v != null);
  const assez = cles.length >= 5 && avecDonnees.length >= 2;
  let iMax = -1, iMin = -1;
  if (assez) {
    iMax = avecDonnees.reduce((a, b) => (b[0] > a[0] ? b : a))[1];
    iMin = avecDonnees.reduce((a, b) => (b[0] < a[0] ? b : a))[1];
  }
  $("sous-semaine").innerHTML = assez && moy[iMax] - moy[iMin] >= 0.3
    ? `Plus lumineux : <b>le ${JOURS_SEMAINE[iMax]}</b> · plus sombre : <b>le ${JOURS_SEMAINE[iMin]}</b>`
    : assez ? "Tes journées se ressemblent d'un jour à l'autre" : "Encore quelques journées à noter pour comparer";
  let svg = `<line class="base-l" x1="${m.g}" x2="${W - m.d}" y1="${base}" y2="${base}"/>`;
  svg += `<line class="grille-l" x1="${m.g}" x2="${W - m.d}" y1="${m.h}" y2="${m.h}"/><line class="grille-l" x1="${m.g}" x2="${W - m.d}" y1="${m.h + ph}" y2="${m.h + ph}"/>`;
  moy.forEach((v, j) => {
    const x = m.g + slot * j + (slot - l) / 2, cx = m.g + slot * j + slot / 2;
    if (v != null) {
      svg += `<path class="barre" data-i="${j}" d="${barre(x, base, Y(v), l)}" fill="${C[borne(Math.round(v), 0, 8)]}"/>`;
      if (j === iMax && assez) svg += `<text class="fort" x="${cx}" y="${v >= 4 ? Y(v) - 6 : base - 6}" text-anchor="middle">${nomHumeur(v)}</text>`;
    }
    svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle"${v == null ? ' opacity=".45"' : ""}>${"LMMJVSD"[j]}</text>`;
    svg += `<rect class="zone-tactile" data-i="${j}" x="${m.g + slot * j}" y="0" width="${slot}" height="${H}"/>`;
  });
  boite.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Humeur moyenne selon le jour de la semaine">${svg}</svg>` +
    tableAccessible("Humeur moyenne par jour de la semaine", moy.map((v, j) => [JOURS_SEMAINE[j], v == null ? "pas de donnée" : nomHumeur(v)]), ["Jour", "Humeur moyenne"]);
  const s = boite.querySelector("svg");
  let minuteur;
  const montrer = (j) => {
    s.querySelectorAll(".barre").forEach((b) => b.classList.toggle("estompe", Number(b.dataset.i) !== j));
    const echelle = boite.clientWidth / W, v = moy[j];
    montrerBulle(boite, (m.g + slot * j + slot / 2) * echelle, (v == null ? base : Math.min(Y(v), base)) * echelle, v == null
      ? { niveau: 4, titre: majuscule(JOURS_SEMAINE[j]), detail: "Pas encore de journée notée" }
      : { niveau: borne(Math.round(v), 0, 8), titre: nomHumeur(v), detail: `${majuscule(JOURS_SEMAINE[j])} · ${pluriel(nb[j], "journée")}` });
  };
  const cacher = () => { s.querySelectorAll(".barre").forEach((b) => b.classList.remove("estompe")); cacherBulle(boite); };
  s.addEventListener("pointerover", (ev) => { const j = ev.target.dataset?.i; if (j != null && ev.pointerType === "mouse") montrer(Number(j)); });
  s.addEventListener("pointerdown", (ev) => { const j = ev.target.dataset?.i; if (j != null) { clearTimeout(minuteur); montrer(Number(j)); } });
  s.addEventListener("pointerup", (ev) => { if (ev.pointerType !== "mouse") { clearTimeout(minuteur); minuteur = setTimeout(cacher, 2400); } });
  s.addEventListener("pointerleave", (ev) => { if (ev.pointerType === "mouse") cacher(); });
}

function rendreSeries() {
  const t = aujourdhui();
  // Aujourd'hui ne casse pas la série tant que la journée n'est pas finie
  let k = donnees.jours[t] ? t : decaler(t, -1), serie = 0;
  while (donnees.jours[k]) { serie++; k = decaler(k, -1); }
  const cles = Object.keys(donnees.jours).sort();
  let record = 0, courant = 0, prec = null;
  for (const c of cles) { courant = prec && ecart(prec, c) === 1 ? courant + 1 : 1; record = Math.max(record, courant); prec = c; }
  $("series").replaceChildren(
    el("div", { class: "serie" }, el("b", {}, String(serie)), el("span", {}, serie > 1 ? "jours d'affilée" : "jour d'affilée")),
    el("div", { class: "serie" }, el("b", {}, String(record)), el("span", {}, "meilleure série")),
    el("div", { class: "serie" }, el("b", {}, String(cles.length)), el("span", {}, cles.length > 1 ? "jours notés" : "jour noté")),
  );
}

document.querySelectorAll(".filtres button").forEach((b) => b.addEventListener("click", () => {
  periode = Number(b.dataset.periode);
  document.querySelectorAll(".filtres button").forEach((x) => { const a = x === b; x.classList.toggle("actif", a); x.setAttribute("aria-pressed", a); });
  rendreBilan();
}));

/* =========================================================
   Réglages, sauvegarde
   ========================================================= */

function ouvrirReglages() {
  const nb = Object.keys(donnees.jours).length;
  const sons = el("button", {
    class: "reglage", role: "switch", "aria-checked": String(donnees.sons),
    onclick: (ev) => {
      donnees.sons = !donnees.sons;
      sauver();
      ev.currentTarget.setAttribute("aria-checked", String(donnees.sons));
      if (donnees.sons) { preparerAudio(); setTimeout(() => sonEtoile(6), 200); }
    },
  }, el("span", { class: "ico" }, "✨"), el("span", { class: "t" }, "Sons", el("small", {}, "Notes de verre et scintillement d'étoile")), el("span", { class: "interrupteur" }));
  ouvrirFeuille(
    el("h3", {}, "Réglages"),
    el("p", { class: "sous" }, nb ? `${pluriel(nb, "journée")} dans ton journal` : "Ton journal est encore vide"),
    sons,
    el("button", { class: "reglage", onclick: exporter }, el("span", { class: "ico" }, "📤"), el("span", { class: "t" }, "Exporter mon journal", el("small", {}, "Une copie de sauvegarde à garder"))),
    el("button", { class: "reglage", onclick: () => $("fichier").click() }, el("span", { class: "ico" }, "📥"), el("span", { class: "t" }, "Importer une sauvegarde", el("small", {}, "Remplace le journal de ce téléphone"))),
    el("button", { class: "reglage", onclick: () => { fermerFeuille(); setTimeout(() => window.Sauvegarde?.ouvrir(), 250); } }, el("span", { class: "ico" }, "☁️"), el("span", { class: "t" }, "Sauvegarde GitHub", el("small", {}, "Copie automatique dans ton dépôt privé"))),
    el("p", { class: "petit-texte" }, "Ton journal reste sur ce téléphone. Il n'est envoyé que dans ton propre dépôt GitHub privé, si tu actives la sauvegarde GitHub. Scintillement : « Distant Star Sparkle », Soundza (soundza.com)."),
  );
}
$("ouvrir-reglages").addEventListener("click", ouvrirReglages);

async function exporter() {
  const nom = `journal-${aujourdhui()}.json`;
  const fichier = new File([JSON.stringify(donnees, null, 1)], nom, { type: "application/json" });
  try {
    if (navigator.canShare?.({ files: [fichier] })) { await navigator.share({ files: [fichier], title: "Journal" }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = el("a", { href: URL.createObjectURL(fichier), download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
$("fichier").addEventListener("change", async (ev) => {
  const f = ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!valide(d)) throw new Error("format");
    const n = Object.keys(d.jours).length;
    if (!confirm(`Remplacer ton journal par celui du fichier ?\n${pluriel(n, "journée")}`)) return;
    donnees = { jours: nettoyer(d.jours), sons: d.sons !== false };
    sauver(); fermerFeuille(); toutRendre();
    toast(`Importé · ${pluriel(n, "journée")}`);
  } catch (e) {
    toast("Ce fichier n'est pas une sauvegarde du Journal", { icone: "!" });
  }
});

function ouvrirFeuille(...contenu) {
  const panneau = $("feuille-panneau"), f = $("feuille");
  panneau.replaceChildren(el("div", { class: "poignee" }), ...contenu);
  panneau.scrollTop = 0;
  f.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("ouverte")));
}
function fermerFeuille() {
  const f = $("feuille");
  f.classList.remove("ouverte");
  setTimeout(() => { if (!f.classList.contains("ouverte")) f.hidden = true; }, 400);
}
$("feuille").addEventListener("click", (e) => { if (e.target.hasAttribute("data-fermer")) fermerFeuille(); });

/* =========================================================
   Onglets et démarrage
   ========================================================= */

function changerOnglet(nom) {
  if (nom === ongletActif) {
    if (nom === "aujourdhui" && jourEdite !== aujourdhui()) allerAuJour(aujourdhui());
    return;
  }
  ongletActif = nom;
  document.querySelectorAll(".onglet").forEach((s) => s.classList.toggle("actif", s.id === nom));
  document.querySelectorAll(".tabbar button").forEach((b) => {
    const a = b.dataset.onglet === nom;
    b.classList.toggle("actif", a);
    b.setAttribute("aria-selected", String(a));
  });
  document.body.classList.toggle("sur-jour", nom === "aujourdhui");
  window.scrollTo(0, 0);
  if (nom === "aujourdhui") { mesurer(); placer(valeur); }
  if (nom === "journal") rendreJournal();
  if (nom === "bilan") rendreBilan();
}
document.querySelectorAll(".tabbar button").forEach((b) => b.addEventListener("click", () => changerOnglet(b.dataset.onglet)));

function toutRendre() {
  if (!donnees.jours[jourEdite] || jourEdite === aujourdhui()) allerAuJour(jourEdite);
  rendreJour();
  rendreJournal();
  rendreBilan();
}

// Démarrage : le ciel se lève de l'aube jusqu'à l'humeur du jour
document.body.insertAdjacentHTML("afterbegin", spriteMedaillons());
creerCiel();
mesurer();
placer(4);
cran = -1;
choisir(4, { son: false });
rendreJour();
const deja = donnees.jours[jourEdite];
if (deja && deja.h !== 4) setTimeout(() => { choisir(deja.h, { son: false }); allerA(deja.h, 5); }, 380);
else choisir(deja ? deja.h : 4, { son: false });

let resizeMinuteur;
window.addEventListener("resize", () => {
  mesurer(); placer(valeur);
  clearTimeout(resizeMinuteur);
  resizeMinuteur = setTimeout(rendreBilan, 150);
});
const changementTheme = () => { sombre = modeSombre.matches; appliquerCiel(valeur); rendreBilan(); };
if (modeSombre.addEventListener) modeSombre.addEventListener("change", changementTheme);
else modeSombre.addListener?.(changementTheme);

// Après minuit (3 h), on passe à la nouvelle journée
let dernierJour = aujourdhui();
document.addEventListener("visibilitychange", () => {
  document.body.classList.toggle("cache", document.hidden);
  if (document.visibilityState !== "visible" || aujourdhui() === dernierJour) return;
  const etaitAujourdhui = jourEdite === dernierJour;
  dernierJour = aujourdhui();
  if (etaitAujourdhui) allerAuJour(dernierJour);
  else rendreJour();
  if (ongletActif === "journal") rendreJournal();
  rendreBilan();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
