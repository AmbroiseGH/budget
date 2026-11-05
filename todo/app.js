"use strict";

/* =========================================================
   Données (restent sur le téléphone)
   ========================================================= */

const CLE = "todo.v1";
const $ = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = (s) => s.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Mots-clés → emoji (les plus précis d'abord)
const EMOJIS = [
  ["appel", "📞"], ["telephon", "📞"], ["rappeler", "📞"], ["anniv", "🎂"], ["cadeau", "🎁"], ["dentiste", "🦷"],
  ["medecin", "🩺"], ["docteur", "🩺"], ["kine", "🩺"], ["generaliste", "🩺"], ["pharmacie", "💊"], ["medic", "💊"], ["minoxidil", "💊"],
  ["rdv", "📅"], ["rendez", "📅"], ["reunion", "📅"], ["acheter", "🛍️"], ["courses", "🛒"], ["lessive", "🧺"], ["linge", "🧺"],
  ["vaisselle", "🍽️"], ["menage", "🧹"], ["sol", "🧹"], ["aspirateur", "🧹"], ["nettoy", "🧹"], ["ranger", "🧹"], ["cire", "🧹"],
  ["poubelle", "🗑️"], ["imprimer", "🖨️"], ["impression", "🖨️"], ["salle", "🏋️"], ["sport", "🏋️"], ["muscu", "🏋️"], ["courir", "🏃"],
  ["footing", "🏃"], ["running", "🏃"], ["banque", "🏦"], ["fortuneo", "🏦"], ["virement", "🏦"], ["pea", "📈"], ["impot", "🏦"],
  ["payer", "💳"], ["facture", "💳"], ["loyer", "🏠"], ["mail", "✉️"], ["ecrire", "✉️"], ["lettre", "✉️"], ["vendre", "🏷️"],
  ["vinted", "🏷️"], ["leboncoin", "🏷️"], ["crous", "📄"], ["bourse", "📄"], ["dossier", "📄"], ["papier", "📄"], ["certif", "📄"],
  ["formulaire", "📄"], ["caf", "📄"], ["assurance", "📄"], ["maaf", "📄"], ["roneo", "📚"], ["reviser", "📚"], ["revision", "📚"],
  ["cours", "📚"], ["exam", "📚"], ["partiel", "📚"], ["fiche", "📚"], ["devoir", "📚"], ["ongle", "💅"], ["rasage", "🪒"],
  ["raser", "🪒"], ["coiffeur", "💈"], ["cheveux", "💈"], ["cuisine", "🍳"], ["repas", "🍳"], ["voiture", "🚗"], ["garage", "🚗"],
  ["train", "🚆"], ["billet", "🎫"], ["voyage", "✈️"], ["valise", "🧳"], ["colis", "📦"], ["poste", "📦"], ["lire", "📖"], ["livre", "📖"],
  ["ecouter", "🎧"], ["podcast", "🎧"], ["photo", "📸"], ["reflexion", "🧘"], ["mediter", "🧘"], ["evaluation", "🧠"], ["plante", "🪴"],
  ["arroser", "🪴"], ["chercher", "🚶"], ["recuperer", "🚶"], ["demander", "💬"], ["logo", "🎨"], ["dessin", "🎨"], ["code", "💻"],
  ["ordi", "💻"], ["claude", "🤖"], ["mamie", "👵"], ["papi", "👴"], ["maman", "👩"], ["papa", "👨"],
];
function emojiPour(nom) {
  const n = " " + norm(nom);
  for (const [cle, e] of EMOJIS) if (n.includes(" " + cle)) return e;
  return "📝";
}

function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE));
    if (d && Array.isArray(d.taches)) return d;
  } catch (e) {}
  return { taches: [] };
}
const donnees = charger();
donnees.emojis ||= {}; // emojis choisis à la main, par nom de tâche
const emojiChoisi = (nom) => donnees.emojis[norm(nom)] || emojiPour(nom);
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(donnees)); window.Sauvegarde?.signaler(); } catch (e) { toast("Impossible d'enregistrer", { couleur: "var(--rouge)", icone: "!" }); }
}
const tache = (id) => donnees.taches.find((t) => t.id === id);

/* =========================================================
   Dates (jours au format AAAA-MM-JJ, heure locale)
   ========================================================= */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const versDate = (j) => { const [a, m, d] = j.split("-").map(Number); return new Date(a, m - 1, d); };
const plus = (j, n) => { const d = versDate(j); d.setDate(d.getDate() + n); return iso(d); };
const ecart = (j) => Math.round((versDate(j) - versDate(aujourdhui())) / 86400000);
const aujourdhui = () => iso(new Date());
const fmt = (opts) => new Intl.DateTimeFormat("fr-FR", opts);
const F_LONG = fmt({ weekday: "long", day: "numeric", month: "long" });
const F_COURT = fmt({ weekday: "short", day: "numeric", month: "short" });
const F_JOUR = fmt({ weekday: "long" });
const F_JS = fmt({ weekday: "short" });
const F_DM = fmt({ day: "numeric", month: "short" });

// « Aujourd'hui », « Demain », « Samedi », « Samedi 15 novembre »
function nomJour(j, { long = false } = {}) {
  const k = ecart(j);
  if (k === 0) return "Aujourd'hui";
  if (k === 1) return "Demain";
  if (k === -1) return "Hier";
  if (k > 1 && k < 7 && !long) return majuscule(F_JOUR.format(versDate(j)));
  return majuscule(F_LONG.format(versDate(j)));
}
// pour les toasts : « pour demain », « pour samedi »
function pourJour(j) {
  const k = ecart(j);
  if (k === 0) return "pour aujourd'hui";
  if (k === 1) return "pour demain";
  if (k > 1 && k < 7) return "pour " + F_JOUR.format(versDate(j));
  return "pour le " + F_DM.format(versDate(j)).replace(".", "");
}

// pour « Reportée à … » : « à demain », « à samedi », « au 15 nov »
function aJour(j) {
  const k = ecart(j);
  if (k === 0) return "à aujourd'hui";
  if (k === 1) return "à demain";
  if (k > 1 && k < 7) return "à " + F_JOUR.format(versDate(j));
  return "au " + F_DM.format(versDate(j)).replace(".", "");
}

let jourChoisi = aujourdhui();

/* =========================================================
   Petits outils DOM et animations
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
const SVG_COCHE = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const SVG_POUBELLE = '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
const SVG_CAL = '<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>';
const SVG_FLECHE = '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ressort = "cubic-bezier(.2,1.35,.4,1)";
const doux = "cubic-bezier(.2,.8,.2,1)";

function rejouer(elm, classe) {
  if (!elm) return;
  elm.classList.remove(classe);
  void elm.offsetWidth;
  elm.classList.add(classe);
  elm.addEventListener("animationend", () => elm.classList.remove(classe), { once: true });
}

// Un emoji qui vole d'un point à un autre en arc
function envoler(emoji, depart, arrivee) {
  if (reduit || !depart || !arrivee) return Promise.resolve();
  const v = el("span", { class: "volant" }, emoji);
  document.body.append(v);
  const x0 = depart.left + depart.width / 2 - 11, y0 = depart.top + depart.height / 2 - 11;
  const x1 = arrivee.left + arrivee.width / 2 - 11, y1 = arrivee.top + arrivee.height / 2 - 11;
  const haut = Math.min(y0, y1) - 90;
  const a = v.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 0 },
    { transform: `translate(${x0}px, ${y0 - 10}px) scale(1.5)`, opacity: 1, offset: 0.12 },
    { transform: `translate(${(x0 + x1) / 2}px, ${haut}px) scale(1.7) rotate(-15deg)`, offset: 0.5 },
    { transform: `translate(${x1}px, ${y1}px) scale(.8) rotate(0)`, opacity: 0.9 },
  ], { duration: 650, easing: "cubic-bezier(.45,.05,.35,1)" });
  return a.finished.then(() => v.remove(), () => v.remove());
}

function confettis(depuis) {
  if (reduit) return;
  const couleurs = ["#ffffff", "#60a5fa", "#fbbf24", "#a78bfa", "#f472b6", "#34d399"];
  const r = depuis.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 46; i++) {
    const c = el("i", { class: "confetti", style: `background:${couleurs[i % couleurs.length]}` });
    document.body.append(c);
    const ang = Math.random() * Math.PI * 2, force = 70 + Math.random() * 130;
    const dx = Math.cos(ang) * force, dy = Math.sin(ang) * force - 90;
    const rot = (Math.random() - 0.5) * 1080;
    c.animate([
      { transform: `translate(${cx}px, ${cy}px) rotate(0) scale(.6)`, opacity: 1 },
      { transform: `translate(${cx + dx}px, ${cy + dy}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${cx + dx * 1.3}px, ${cy + dy + 380}px) rotate(${rot}deg) scale(.8)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 700, easing: "cubic-bezier(.25,.6,.4,1)" }).finished.then(() => c.remove());
  }
}

let minuteurToast;
function toast(texte, { couleur = "var(--accent)", icone = "✓", action, surAction } = {}) {
  const t = $("toast");
  t.replaceChildren(
    el("span", { class: "ok", style: `background:${couleur}` }, icone),
    el("span", { class: "txt" }, texte),
    action ? el("button", { onclick: () => { t.classList.remove("visible"); surAction(); } }, action) : null,
  );
  t.classList.add("visible");
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove("visible"), action ? 4000 : 2200);
}

/* =========================================================
   Liste du jour choisi (rendu avec animations de déplacement)
   ========================================================= */

const liste = $("liste");
const elements = new Map(); // id → élément
let premierRendu = true;

function creerTache(id) {
  const e = el("div", { class: "article", role: "listitem", "data-id": id },
    el("div", { class: "fond-demain", html: SVG_FLECHE + "Demain" }),
    el("div", { class: "fond-suppr", html: SVG_POUBELLE + "Supprimer" }),
    el("div", { class: "rangee" },
      el("span", { class: "coche", html: SVG_COCHE }),
      el("button", { class: "emoji", "aria-label": "Changer l'emoji" }),
      el("span", { class: "infos" }, el("span", { class: "nom" }), el("span", { class: "quand" })),
      el("button", { class: "btn-jour", "aria-label": "Changer le jour", html: SVG_CAL }),
    ),
  );
  activerGlisser(e);
  return e;
}
function majTache(e, t, retard) {
  e.classList.toggle("fait", t.fait);
  e.classList.toggle("retard", retard);
  e.querySelector(".emoji").textContent = t.emoji;
  e.querySelector(".nom").textContent = t.nom;
  const q = e.querySelector(".quand");
  q.textContent = retard ? "En retard · " + F_COURT.format(versDate(t.jour)).replace(/\./g, "") : "";
  q.classList.toggle("rouge", retard);
  e.querySelector(".rangee").setAttribute("aria-label", `${t.nom}${retard ? ", en retard" : ""}${t.fait ? ", terminée" : ""}`);
}

function creerSeparateur(id) {
  const e = el("div", { class: "separateur", "data-id": id }, el("span"));
  if (id === "sep-retard") { e.classList.add("rouge"); e.append(el("button", { onclick: toutAujourdhui }, "Tout à aujourd'hui")); }
  else { e.classList.add("calme"); e.append(el("button", { onclick: effacerFaites }, "Effacer")); }
  return e;
}

function tachesDuJour(j) {
  const auj = aujourdhui();
  const retard = j === auj ? donnees.taches.filter((t) => !t.fait && t.jour < auj).sort((a, b) => a.jour.localeCompare(b.jour) || a.ajout - b.ajout) : [];
  const aFaire = donnees.taches.filter((t) => !t.fait && t.jour === j).sort((a, b) => a.ajout - b.ajout);
  const faites = donnees.taches.filter((t) => t.fait && t.jour === j).sort((a, b) => (b.faitA || 0) - (a.faitA || 0));
  return { retard, aFaire, faites };
}

function rendre() {
  const { retard, aFaire, faites } = tachesDuJour(jourChoisi);

  // FLIP : on retient où était chaque élément
  const avant = new Map();
  for (const [id, e] of elements) avant.set(id, e.getBoundingClientRect().top);

  const ordre = [];
  if (retard.length) { ordre.push({ id: "sep-retard" }); retard.forEach((t) => ordre.push({ t, retard: true })); }
  if (retard.length && aFaire.length) ordre.push({ id: "sep-jour" });
  aFaire.forEach((t) => ordre.push({ t }));
  if (faites.length) { ordre.push({ id: "sep-faites" }); faites.forEach((t) => ordre.push({ t })); }
  for (const o of ordre) if (o.t) o.id = o.t.id;

  const nouveaux = new Set();
  const garder = new Set(ordre.map((o) => o.id));
  for (const [id, e] of elements) if (!garder.has(id)) { e.remove(); elements.delete(id); }

  ordre.forEach((o, i) => {
    let e = elements.get(o.id);
    if (!e) {
      e = o.t ? creerTache(o.id) : o.id === "sep-jour" ? el("div", { class: "separateur", "data-id": "sep-jour" }, el("span")) : creerSeparateur(o.id);
      elements.set(o.id, e); nouveaux.add(o.id);
    }
    if (o.id === "sep-retard") e.firstChild.textContent = `En retard · ${retard.length}`;
    else if (o.id === "sep-jour") e.firstChild.textContent = `Aujourd'hui · ${aFaire.length}`;
    else if (o.id === "sep-faites") e.firstChild.textContent = `Terminées · ${faites.length}`;
    else majTache(e, o.t, !!o.retard);
    if (liste.children[i] !== e) liste.insertBefore(e, liste.children[i] || null);
  });

  if (!reduit) {
    for (const [id, e] of elements) {
      if (nouveaux.has(id)) {
        if (!premierRendu) e.animate([{ opacity: 0, transform: "translateY(-12px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: ressort });
        else e.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 450, delay: 40 * [...elements.keys()].indexOf(id), easing: doux, fill: "backwards" });
      } else {
        const dy = avant.get(id) - e.getBoundingClientRect().top;
        if (Math.abs(dy) > 1) e.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 480, easing: doux });
      }
    }
  }
  premierRendu = false;

  const rien = ordre.length === 0;
  $("vide").hidden = !rien;
  $("astuce").hidden = rien;
  if (rien) majVide();
  majEntete(aFaire.length, faites.length, retard.length);
  rendreJours();
}

function majVide() {
  const k = ecart(jourChoisi);
  const fini = k === 0 && donnees.taches.some((t) => t.fait && t.jour === jourChoisi);
  $("vide-ico").textContent = k === 0 ? "☀️" : k > 0 ? "🗓️" : "🌙";
  $("vide-titre").textContent = k === 0 ? "Rien de prévu aujourd'hui" : k === 1 ? "Rien de prévu demain"
    : k > 1 && k < 7 ? `Rien de prévu ${F_JOUR.format(versDate(jourChoisi))}` : k > 0 ? "Rien de prévu ce jour-là" : "Rien ce jour-là";
  $("vide-texte").textContent = fini ? "" : k >= 0
    ? "Écris une tâche ci-dessus pour la planifier ici."
    : "Ce jour est passé, mais tu peux encore y noter quelque chose.";
}

let dejaFini = false, dernierTitre = "";
function majEntete(reste, faites, retard) {
  const total = reste + faites, pct = total ? Math.round((faites / total) * 100) : 0;
  const titre = nomJour(jourChoisi);
  const h2 = $("titre-jour");
  if (titre !== dernierTitre) { h2.textContent = titre; if (dernierTitre) rejouer(h2, "change"); dernierTitre = titre; }
  const sousTitre = ecart(jourChoisi) > 1 && ecart(jourChoisi) < 7 ? F_DM.format(versDate(jourChoisi)).replace(".", "") + " · " : "";
  const r = retard ? ` · <b>${retard}</b> en retard` : "";
  $("compteur").innerHTML = sousTitre + (!total ? (retard ? `<b>${retard}</b> en retard` : "Aucune tâche")
    : !reste ? `Tout est fait 🎉${r}`
    : `<b>${faites}</b> tâche${faites > 1 ? "s" : ""} sur <b>${total}</b> terminée${faites > 1 ? "s" : ""}${r}`);
  $("pct").textContent = pct + "%";
  $("arc").style.strokeDashoffset = 113.1 * (1 - pct / 100);
  $("jauge").style.width = pct + "%";
  const fini = total > 0 && reste === 0 && retard === 0;
  if (fini && !dejaFini && !premierRendu && !changementDeJour) {
    rejouer(document.querySelector(".encart"), "fini");
    setTimeout(() => confettis($("arc").closest(".anneau")), 250);
  }
  dejaFini = fini;
}

/* =========================================================
   Actions sur les tâches
   ========================================================= */

function ajouter(texte, jour = jourChoisi, source) {
  const nom = majuscule(texte.trim().replace(/\s+/g, " "));
  if (!nom) return;
  const t = { id: uid(), nom, emoji: emojiChoisi(nom), jour, fait: false, ajout: Date.now() };
  donnees.taches.push(t);
  sauver();
  const depart = source?.getBoundingClientRect();
  rendre();
  if (jour !== aujourdhui()) {
    const pill = document.querySelector(`.jour[data-jour="${jour}"]`) || document.querySelector(".jour.autre");
    if (depart && pill) envoler(t.emoji, depart, pill.getBoundingClientRect()).then(() => rejouer(pill, "recoit"));
    else rejouer(pill, "recoit");
  }
  return t;
}

function basculer(id) {
  const t = tache(id);
  if (!t) return;
  const auj = aujourdhui();
  t.fait = !t.fait;
  if (t.fait) {
    t.faitA = Date.now();
    // une tâche en retard faite aujourd'hui compte pour aujourd'hui
    if (t.jour < auj && jourChoisi === auj) { t.jourPrevu = t.jour; t.jour = auj; }
  } else t.ajout = Date.now();
  sauver();
  const e = elements.get(id);
  e.classList.toggle("fait", t.fait);
  if (t.fait) rejouer(e, "coche-anim");
  clearTimeout(e._attente);
  // on laisse la coche se dessiner avant de déplacer la tâche
  e._attente = setTimeout(rendre, reduit ? 0 : 320);
}

function replier(e) {
  if (reduit) return Promise.resolve();
  const h = e.offsetHeight;
  return e.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 280, easing: doux, fill: "forwards" }).finished;
}

async function supprimer(id) {
  const i = donnees.taches.findIndex((x) => x.id === id);
  if (i < 0) return;
  const e = elements.get(id);
  if (e) await replier(e);
  const [t] = donnees.taches.splice(i, 1);
  sauver();
  if (e) { elements.delete(id); e.remove(); }
  rendre();
  toast(`${t.nom} supprimée`, { couleur: "var(--rouge)", icone: "✕", action: "Annuler", surAction: () => { donnees.taches.push(t); sauver(); rendre(); } });
}

// Déplace une tâche vers un autre jour
async function planifier(id, jour, { replie = true, annuler = true } = {}) {
  const t = tache(id);
  if (!t || t.jour === jour) return;
  const ancien = t.jour;
  const e = elements.get(id);
  const depart = e?.querySelector(".emoji").getBoundingClientRect();
  const part = jour !== jourChoisi && !(jourChoisi === aujourdhui() && jour < jourChoisi && !t.fait);
  if (e && part && replie) await replier(e);
  t.jour = jour;
  t.ajout = Date.now();
  sauver();
  if (e && part) { elements.delete(id); e.remove(); }
  rendre();
  const pill = document.querySelector(`.jour[data-jour="${jour}"]`) || document.querySelector(".jour.autre");
  if (pill) { if (depart && depart.width) envoler(t.emoji, depart, pill.getBoundingClientRect()).then(() => rejouer(pill, "recoit")); else rejouer(pill, "recoit"); }
  if (annuler) toast(`Reportée ${aJour(jour)}`, { icone: "→", action: "Annuler", surAction: () => planifier(id, ancien, { annuler: false }) });
}

function toutAujourdhui() {
  const auj = aujourdhui();
  const retard = donnees.taches.filter((t) => !t.fait && t.jour < auj);
  if (!retard.length) return;
  const avant = retard.map((t) => [t, t.jour]);
  retard.forEach((t) => { t.jour = auj; });
  sauver();
  rendre();
  toast(`${retard.length} tâche${retard.length > 1 ? "s" : ""} mise${retard.length > 1 ? "s" : ""} à aujourd'hui`, { icone: "→", action: "Annuler", surAction: () => { avant.forEach(([t, j]) => (t.jour = j)); sauver(); rendre(); } });
}

async function effacerFaites() {
  const faites = donnees.taches.filter((t) => t.fait && t.jour === jourChoisi);
  if (!faites.length) return;
  const sep = elements.get("sep-faites");
  await Promise.all([...faites.map((t) => elements.get(t.id)), sep].map((e, k) => new Promise((ok) => setTimeout(() => replier(e).then(ok), k * 35))));
  donnees.taches = donnees.taches.filter((t) => !faites.includes(t));
  sauver();
  for (const t of faites) { elements.get(t.id)?.remove(); elements.delete(t.id); }
  sep?.remove(); elements.delete("sep-faites");
  rendre();
  toast(`${faites.length} tâche${faites.length > 1 ? "s" : ""} effacée${faites.length > 1 ? "s" : ""}`, { action: "Annuler", surAction: () => { donnees.taches.push(...faites); sauver(); rendre(); } });
}

// Clic, glisser à droite pour reporter, à gauche pour supprimer
function activerGlisser(e) {
  const rangee = e.querySelector(".rangee"), fondS = e.querySelector(".fond-suppr"), fondD = e.querySelector(".fond-demain");
  let x0 = 0, y0 = 0, dx = 0, actif = false, glisse = false, pointeur = null;
  const peutReporter = () => !tache(e.dataset.id)?.fait;
  rangee.addEventListener("pointerdown", (ev) => {
    if (ev.button > 0) return;
    x0 = ev.clientX; y0 = ev.clientY; dx = 0; actif = true; glisse = false; pointeur = ev.pointerId;
  });
  rangee.addEventListener("pointermove", (ev) => {
    if (!actif || ev.pointerId !== pointeur) return;
    const ddx = ev.clientX - x0, ddy = ev.clientY - y0;
    if (!glisse) {
      if (Math.abs(ddy) > 10 && Math.abs(ddy) > Math.abs(ddx)) { actif = false; return; }
      if (Math.abs(ddx) > 10) { glisse = true; rangee.setPointerCapture(pointeur); }
      else return;
    }
    dx = peutReporter() ? ddx : Math.min(0, ddx);
    const a = Math.abs(dx);
    const resist = Math.sign(dx) * (a > 120 ? 120 + (a - 120) * 0.5 : a);
    rangee.style.transform = `translateX(${resist}px)`;
    fondS.style.opacity = dx < 0 ? Math.min(1, -dx / 90) : 0;
    fondD.style.opacity = dx > 0 ? Math.min(1, dx / 90) : 0;
  });
  const remettre = () => {
    rangee.animate([{ transform: rangee.style.transform }, { transform: "none" }], { duration: 380, easing: ressort });
    for (const f of [fondS, fondD]) { f.animate([{ opacity: f.style.opacity || 0 }, { opacity: 0 }], { duration: 250 }); f.style.opacity = ""; }
    rangee.style.transform = "";
  };
  const fin = () => {
    if (!actif) return;
    actif = false;
    if (!glisse) return;
    e._glisse = true; setTimeout(() => (e._glisse = false), 50);
    const id = e.dataset.id;
    if (dx < -90) {
      rangee.animate([{ transform: rangee.style.transform }, { transform: "translateX(-110%)" }], { duration: 220, easing: "ease-in", fill: "forwards" })
        .finished.then(() => supprimer(id));
    } else if (dx > 90) {
      const t = tache(id);
      const base = t.jour < aujourdhui() ? aujourdhui() : t.jour;
      rangee.animate([{ transform: rangee.style.transform }, { transform: "translateX(110%)" }], { duration: 220, easing: "ease-in", fill: "forwards" })
        .finished.then(() => planifier(id, plus(base, 1)));
    } else remettre();
  };
  rangee.addEventListener("pointerup", fin);
  rangee.addEventListener("pointercancel", () => { actif = false; glisse = false; rangee.style.transform = ""; fondS.style.opacity = ""; fondD.style.opacity = ""; });
  rangee.addEventListener("click", (ev) => {
    if (e._glisse) return;
    const t = tache(e.dataset.id);
    if (!t) return;
    if (ev.target.closest(".btn-jour")) ouvrirPlanifier(t.id);
    else if (ev.target.closest(".emoji")) ouvrirEmojis(t.nom, t.emoji);
    else basculer(t.id);
  });
}

/* =========================================================
   Saisie
   ========================================================= */

function brancherSaisie(form, input, apercu, bouton, surAjout) {
  let dernier = apercu.textContent;
  const defaut = dernier;
  input.addEventListener("input", () => {
    const v = input.value.trim();
    bouton.disabled = !v;
    const e = v ? emojiChoisi(v) : defaut;
    if (e !== dernier) { apercu.textContent = e; rejouer(apercu, "saut"); dernier = e; }
  });
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    surAjout(v, apercu);
    input.value = "";
    input.dispatchEvent(new Event("input"));
  });
}

brancherSaisie($("form-ajout"), $("saisie"), $("apercu-emoji"), $("btn-ajout"), (v, apercu) => {
  const t = ajouter(v, jourChoisi, apercu);
  if (t && jourChoisi !== aujourdhui()) toast(`Prévue ${pourJour(jourChoisi)}`, { icone: "📅" });
});

/* =========================================================
   Planning (dock du bas)
   ========================================================= */

const NB_JOURS = 14;
let joursPremier = true;
function rendreJours() {
  const zone = $("jours"), auj = aujourdhui();
  const dates = Array.from({ length: NB_JOURS }, (_, i) => plus(auj, i));
  const horsBande = !dates.includes(jourChoisi);
  const cle = auj;
  if (zone.dataset.cle !== cle) {
    zone.dataset.cle = cle;
    const input = el("input", { type: "date", "aria-label": "Choisir une autre date" });
    input.addEventListener("change", () => { if (input.value) choisirJour(input.value); });
    zone.replaceChildren(
      ...dates.map((j, i) => el("button", { class: "jour" + (i === 0 ? " auj" : "") + (joursPremier ? " entree" : ""), role: "tab", "data-jour": j, style: joursPremier ? `animation-delay:${0.25 + i * 0.03}s` : null, onclick: (ev) => { rejouer(ev.currentTarget, "tape"); choisirJour(j); } },
        el("span", { class: "js" }, i === 0 ? "Auj." : F_JS.format(versDate(j)).replace(".", "")),
        el("span", { class: "jn" }, String(versDate(j).getDate())),
        el("span", { class: "points" }))),
      el("label", { class: "jour autre" + (joursPremier ? " entree" : ""), role: "tab", style: joursPremier ? `animation-delay:${0.25 + NB_JOURS * 0.03}s` : null },
        el("span", { class: "js" }, "Autre"), el("span", { class: "jn" }, "＋"), el("span", { class: "points" }), input),
    );
    joursPremier = false;
    zone.querySelectorAll(".entree").forEach((b) => b.addEventListener("animationend", () => { b.classList.remove("entree"); b.style.animationDelay = ""; }, { once: true }));
  }
  const retard = donnees.taches.some((t) => !t.fait && t.jour < auj);
  for (const b of zone.querySelectorAll(".jour[data-jour]")) {
    const j = b.dataset.jour;
    const restent = donnees.taches.filter((t) => t.jour === j && !t.fait).length;
    const faites = donnees.taches.filter((t) => t.jour === j && t.fait).length;
    const p = b.querySelector(".points");
    p.replaceChildren(...(restent > 3 ? [el("b", {}, String(restent))]
      : restent ? Array.from({ length: restent }, () => el("i"))
      : faites ? [el("i", { class: "ok" })] : []));
    b.classList.toggle("choisi", j === jourChoisi);
    b.classList.toggle("retard", j === auj && retard);
    b.setAttribute("aria-selected", j === jourChoisi);
    b.setAttribute("aria-label", `${nomJour(j, { long: true })}${restent ? `, ${restent} à faire` : ""}`);
  }
  const autre = zone.querySelector(".autre");
  autre.classList.toggle("choisi", horsBande);
  autre.querySelector("input").value = horsBande ? jourChoisi : "";
  autre.querySelector(".js").textContent = horsBande ? F_JS.format(versDate(jourChoisi)).replace(".", "") : "Autre";
  autre.querySelector(".jn").textContent = horsBande ? String(versDate(jourChoisi).getDate()) : "＋";
  autre.querySelector(".points").replaceChildren(...(horsBande ? donnees.taches.filter((t) => t.jour === jourChoisi && !t.fait).slice(0, 3).map(() => el("i")) : []));
  autre.setAttribute("aria-label", horsBande ? nomJour(jourChoisi, { long: true }) : "Choisir une autre date");
}

let changementDeJour = false;
function choisirJour(j) {
  if (j === jourChoisi) return;
  const versLaDroite = j > jourChoisi;
  jourChoisi = j;
  // on reconstruit la liste pour le nouveau jour
  for (const e of elements.values()) e.remove();
  elements.clear();
  changementDeJour = true;
  rendre();
  changementDeJour = false;
  if (!reduit) liste.animate([{ opacity: 0, transform: `translateX(${versLaDroite ? 24 : -24}px)` }, { opacity: 1, transform: "none" }], { duration: 380, easing: doux });
  document.querySelector(`.jour[data-jour="${j}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  $("saisie").placeholder = j === aujourdhui() ? "Ajouter une tâche…" : `Ajouter ${pourJour(j)}…`;
}

/* =========================================================
   Feuille « Planifier » (changer le nom ou le jour)
   ========================================================= */

function ouvrirFeuille() {
  const f = $("feuille");
  $("feuille-panneau").scrollTop = 0;
  f.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("ouverte")));
}

function ouvrirPlanifier(id) {
  const t = tache(id);
  if (!t) return;
  const panneau = $("feuille-panneau"), auj = aujourdhui();
  let jour = t.jour;
  const champ = el("input", { type: "text", value: t.nom, enterkeyhint: "done", "aria-label": "Nom de la tâche" });
  const apercu = el("button", { type: "button", class: "apercu", "aria-label": "Changer l'emoji", onclick: () => ouvrirEmojis(t.nom, t.emoji, () => ouvrirPlanifier(id)) }, t.emoji);
  const form = el("form", { class: "ajout champ", autocomplete: "off", onsubmit: (ev) => { ev.preventDefault(); champ.blur(); } }, apercu, champ);

  const options = [0, 1, 2, 3, 4, 5, 6].map((k) => plus(auj, k));
  const lundi = plus(auj, ((8 - versDate(auj).getDay()) % 7) || 7);
  if (!options.includes(lundi)) options.push(lundi);
  const grille = el("div", { class: "choix-jours" });
  const autreInput = el("input", { type: "date", "aria-label": "Autre date" });
  const autre = el("label", {}, el("b", {}, "Autre date"), el("span"), autreInput);
  const marquer = () => {
    grille.querySelectorAll("button").forEach((b) => b.classList.toggle("choisi", b.dataset.jour === jour));
    const hors = !options.includes(jour);
    autre.classList.toggle("choisi", hors);
    autre.querySelector("span").textContent = hors ? F_COURT.format(versDate(jour)).replace(/\./g, "") : "📅";
    autreInput.value = jour;
  };
  autreInput.addEventListener("change", () => { if (autreInput.value) { jour = autreInput.value; marquer(); } });
  grille.append(...options.map((j) => {
    const k = ecart(j);
    const titre = k === 0 ? "Aujourd'hui" : k === 1 ? "Demain" : j === lundi && k >= 7 ? "Lundi pro." : majuscule(F_JOUR.format(versDate(j)));
    return el("button", { type: "button", "data-jour": j, onclick: () => { jour = j; marquer(); } },
      el("b", {}, titre), el("span", {}, F_DM.format(versDate(j)).replace(".", "")));
  }), autre);
  marquer();

  const enregistrer = () => {
    const nom = majuscule(champ.value.trim().replace(/\s+/g, " "));
    let change = false;
    if (nom && nom !== t.nom) {
      // l'emoji suit le nouveau nom, sauf s'il avait été choisi à la main
      if (t.emoji === emojiChoisi(t.nom) && !donnees.emojis[norm(t.nom)]) t.emoji = emojiChoisi(nom);
      t.nom = nom;
      change = true;
    }
    fermerFeuille();
    if (jour !== t.jour) setTimeout(() => planifier(id, jour), 250);
    else if (change) { sauver(); rendre(); }
  };

  panneau.replaceChildren(
    el("div", { class: "poignee" }),
    el("h3", {}, "Planifier"),
    el("p", { class: "sous" }, t.jour < auj && !t.fait ? `Prévue ${nomJour(t.jour, { long: true }).toLowerCase()}, toujours à faire.` : "Change le nom ou le jour de cette tâche."),
    form,
    el("p", { class: "titre-groupe" }, "Pour quel jour ?"),
    grille,
    el("div", { class: "boutons-feuille" },
      el("button", { class: "principal", onclick: enregistrer }, "Enregistrer"),
      el("button", { class: "danger", onclick: () => { fermerFeuille(); setTimeout(() => supprimer(id), 250); } }, "Supprimer la tâche")),
  );
  ouvrirFeuille();
}

/* =========================================================
   Feuille « Tout voir » (à venir et terminées)
   ========================================================= */

let ongletVue = "venir";
function ouvrirToutVoir() {
  const panneau = $("feuille-panneau"), auj = aujourdhui();
  const corps = el("div");
  const restantes = donnees.taches.filter((t) => !t.fait);
  const retard = restantes.filter((t) => t.jour < auj);
  const duJour = donnees.taches.filter((t) => t.jour === auj);
  const aVenir = restantes.filter((t) => t.jour > auj);

  const ligne = (t, surClic) => el("button", { class: "ligne-tache" + (t.fait ? " fait" : ""), onclick: surClic },
    t.fait ? el("span", { class: "coche-mini", html: SVG_COCHE }) : null,
    el("span", { class: "emoji" }, t.emoji), el("b", {}, t.nom), t.fait ? null : el("span", { class: "fleche" }, "›"));
  const aller = (j) => () => { fermerFeuille(); setTimeout(() => choisirJour(j), 200); };

  const remplir = () => {
    onglets.querySelectorAll("button").forEach((b) => b.classList.toggle("actif", b.dataset.o === ongletVue));
    const blocs = [];
    if (ongletVue === "venir") {
      if (retard.length) {
        blocs.push(el("div", { class: "groupe-titre rouge" }, el("span", {}, `En retard · ${retard.length}`),
          el("button", { onclick: () => { toutAujourdhui(); fermerFeuille(); } }, "Tout à aujourd'hui")));
        retard.sort((a, b) => a.jour.localeCompare(b.jour)).forEach((t) => blocs.push(ligne(t, aller(auj))));
      }
      const jours = [...new Set(restantes.filter((t) => t.jour >= auj).map((t) => t.jour))].sort();
      for (const j of jours) {
        const ts = restantes.filter((t) => t.jour === j).sort((a, b) => a.ajout - b.ajout);
        blocs.push(el("div", { class: "groupe-titre" }, el("span", {}, nomJour(j, { long: ecart(j) > 1 })), el("span", {}, String(ts.length))));
        ts.forEach((t) => blocs.push(ligne(t, aller(j))));
      }
      if (!blocs.length) blocs.push(el("p", { class: "vide-feuille" }, "Aucune tâche à venir. Profite ! 🌿"));
    } else {
      const faites = donnees.taches.filter((t) => t.fait).sort((a, b) => b.jour.localeCompare(a.jour) || (b.faitA || 0) - (a.faitA || 0)).slice(0, 80);
      let dernier = "";
      for (const t of faites) {
        if (t.jour !== dernier) { dernier = t.jour; blocs.push(el("div", { class: "groupe-titre" }, el("span", {}, nomJour(t.jour, { long: true })))); }
        blocs.push(ligne(t, (ev) => {
          t.fait = false; t.ajout = Date.now();
          if (t.jour < auj) t.jour = t.jourPrevu && t.jourPrevu >= auj ? t.jourPrevu : t.jour;
          sauver(); rendre();
          replier(ev.currentTarget).then(remplir);
          toast(`${t.nom} remise à faire`, { icone: "↺" });
        }));
      }
      if (!blocs.length) blocs.push(el("p", { class: "vide-feuille" }, "Les tâches terminées apparaîtront ici."));
    }
    corps.replaceChildren(...blocs);
  };

  const onglets = el("div", { class: "onglets", role: "tablist" },
    el("button", { "data-o": "venir", role: "tab", onclick: () => { ongletVue = "venir"; remplir(); } }, "À venir"),
    el("button", { "data-o": "faites", role: "tab", onclick: () => { ongletVue = "faites"; remplir(); } }, "Terminées"));

  const faitesAuj = duJour.filter((t) => t.fait).length;
  panneau.replaceChildren(
    el("div", { class: "poignee" }),
    el("h3", {}, "Toutes mes tâches"),
    el("div", { class: "stats" },
      el("div", { class: "stat" }, el("b", {}, `${faitesAuj}/${duJour.length}`), el("span", {}, "aujourd'hui")),
      el("div", { class: "stat" }, el("b", {}, String(aVenir.length)), el("span", {}, "à venir")),
      el("div", { class: "stat" }, el("b", { style: retard.length ? "color:var(--rouge)" : null }, String(retard.length)), el("span", {}, "en retard"))),
    el("p", { class: "titre-groupe" }, " "),
    onglets, corps,
    el("button", { class: "secondaire", onclick: () => { fermerFeuille(); setTimeout(() => window.Sauvegarde?.ouvrir(), 250); } }, "☁️ Sauvegarde GitHub"),
    el("button", { class: "secondaire", onclick: fermerFeuille }, "Fermer"),
  );
  remplir();
  ouvrirFeuille();
}

/* =========================================================
   Feuille « Choisir un emoji »
   ========================================================= */

const CHOIX_EMOJIS = [
  ["Tous les jours", "📝✅⭐📌🔔⏰📅🗓️💡🎯🔥✨"],
  ["Maison", "🧹🧺🧽🍽️🗑️🛒🛍️🍳🪴🛏️🔧🔑🏠📦"],
  ["Études et travail", "📚📖✏️🖊️📄🗂️🖨️💻📧✉️🎓🧠📊🎨"],
  ["Santé et sport", "🏋️🏃🚴🧘🦷🩺💊💅🪒💈🧴😴🥗💧"],
  ["Gens et sorties", "📞💬👵👴👩👨👫🎂🎁🎉🍻☕🎬🎧"],
  ["Argent et papiers", "🏦💳💶📈🧾🏷️📮✈️🚆🚗🎫🧳"],
];

function premierEmoji(texte) {
  const t = texte.trim();
  if (!t) return "";
  if (window.Intl?.Segmenter) return [...new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(t)][0].segment;
  return [...t][0];
}
const graphemes = (s) => window.Intl?.Segmenter ? [...new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(s)].map((x) => x.segment) : [...s];

function changerEmoji(nom, emoji) {
  const n = norm(nom);
  donnees.emojis[n] = emoji;
  for (const t of donnees.taches) if (norm(t.nom) === n) t.emoji = emoji;
  sauver();
  rendre();
  for (const t of donnees.taches) {
    const e = norm(t.nom) === n && elements.get(t.id);
    if (e && !reduit) e.querySelector(".emoji").animate([{ transform: "scale(.3) rotate(-30deg)" }, { transform: "none" }], { duration: 500, easing: ressort });
  }
}

function ouvrirEmojis(nom, actuel, retour) {
  const panneau = $("feuille-panneau");
  const grand = el("div", { class: "emoji-actuel" }, actuel);
  const choisir = (e, bouton) => {
    grand.textContent = e;
    rejouer(grand, "saut");
    panneau.querySelectorAll(".grille-emojis button.choisi").forEach((b) => b.classList.remove("choisi"));
    bouton?.classList.add("choisi");
    changerEmoji(nom, e);
    setTimeout(() => (retour ? retour() : fermerFeuille()), 320);
  };
  const champ = el("input", { type: "text", placeholder: "Ou tape un emoji…", "aria-label": "Emoji au clavier", enterkeyhint: "done" });
  const bouton = el("button", { class: "btn-plus", type: "submit", "aria-label": "Valider", disabled: true, html: SVG_COCHE });
  champ.addEventListener("input", () => { bouton.disabled = !/\p{Extended_Pictographic}/u.test(champ.value); });
  const form = el("form", { class: "ajout ajout-emoji", autocomplete: "off", onsubmit: (ev) => {
    ev.preventDefault();
    const e = premierEmoji(champ.value);
    if (/\p{Extended_Pictographic}/u.test(e)) choisir(e);
  } }, el("span", { class: "apercu", "aria-hidden": "true" }, "⌨️"), champ, bouton);

  panneau.replaceChildren(
    el("div", { class: "poignee" }),
    el("div", { class: "tete-emoji" }, grand, el("div", { style: "min-width:0" }, el("h3", {}, nom), el("p", { class: "sous" }, "Choisis l'emoji de cette tâche."))),
    ...CHOIX_EMOJIS.map(([titre, liste]) => [
      el("p", { class: "titre-groupe" }, titre),
      el("div", { class: "grille-emojis" }, graphemes(liste).map((e) =>
        el("button", { class: e === actuel ? "choisi" : null, "aria-label": e, onclick: (ev) => choisir(e, ev.currentTarget) }, e))),
    ]).flat(),
    form,
    el("button", { class: "secondaire", onclick: () => { delete donnees.emojis[norm(nom)]; choisir(emojiPour(nom)); } }, "Emoji automatique"),
  );
  ouvrirFeuille();
}

function fermerFeuille() {
  const f = $("feuille");
  document.activeElement?.blur();
  f.classList.remove("ouverte");
  setTimeout(() => { if (!f.classList.contains("ouverte")) f.hidden = true; }, 400);
}
$("feuille").addEventListener("click", (e) => { if (e.target.hasAttribute("data-fermer")) fermerFeuille(); });
$("tout-voir").addEventListener("click", ouvrirToutVoir);

/* =========================================================
   Démarrage
   ========================================================= */

let jourAffiche = aujourdhui();
function majDate() {
  $("date").textContent = F_LONG.format(new Date());
}
// Si l'app reste ouverte après minuit, on passe au nouveau jour
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const auj = aujourdhui();
  if (auj === jourAffiche) return;
  const etaitAujourdhui = jourChoisi === jourAffiche;
  jourAffiche = auj;
  majDate();
  if (etaitAujourdhui || jourChoisi < auj) choisirJour(auj);
  else rendre();
});

majDate();
rendre();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
