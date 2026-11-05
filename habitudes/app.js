"use strict";

/* =========================================================
   Données (restent sur le téléphone)
   ========================================================= */

const CLE = "habitudes.v1";
const $ = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = (s) => s.toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Les habitudes du tracker Notion, dans le même ordre
const DEPART = [
  ["reveil", "Réveil 5h", "⏰"], ["sommeil", "8h de sommeil", "😴"], ["meditation", "Méditation 10 min", "🧘"],
  ["eau", "Boire 2 L d'eau", "💧"], ["muscu", "Musculation", "🏋️"], ["lecture", "Lire 5 pages", "📖"],
  ["podcast", "30 min de podcast", "🎧"], ["deepwork", "Deepwork", "🧠"], ["pas", "10 000 pas", "👟"], ["dessin", "Dessin", "🎨"],
];

// Mots-clés → emoji pour une nouvelle habitude
const EMOJIS = [
  ["douche froide", "🚿"], ["reveil", "⏰"], ["lever", "⏰"], ["sommeil", "😴"], ["dormir", "😴"], ["sieste", "😴"], ["medit", "🧘"],
  ["yoga", "🧘"], ["respir", "🌬️"], ["eau", "💧"], ["muscu", "🏋️"], ["sport", "🏋️"], ["pompe", "💪"], ["abdo", "💪"], ["gainage", "💪"],
  ["etire", "🤸"], ["courir", "🏃"], ["course", "🏃"], ["running", "🏃"], ["velo", "🚴"], ["natation", "🏊"], ["piscine", "🏊"],
  ["marche", "🚶"], ["pas", "👟"], ["lire", "📖"], ["lecture", "📖"], ["livre", "📖"], ["podcast", "🎧"], ["deepwork", "🧠"],
  ["travail", "💼"], ["etude", "📚"], ["reviser", "📚"], ["cours", "📚"], ["dessin", "🎨"], ["peinture", "🎨"], ["journal", "✍️"],
  ["ecrire", "✍️"], ["ecriture", "✍️"], ["gratitude", "🙏"], ["priere", "🙏"], ["fruit", "🍎"], ["legume", "🥦"], ["cuisine", "🍳"],
  ["sucre", "🍬"], ["alcool", "🍷"], ["cigarette", "🚭"], ["tabac", "🚭"], ["ecran", "📵"], ["telephone", "📵"], ["reseaux", "📵"],
  ["anglais", "🗣️"], ["langue", "🗣️"], ["espagnol", "🗣️"], ["guitare", "🎸"], ["piano", "🎹"], ["musique", "🎵"], ["menage", "🧹"],
  ["ranger", "🧹"], ["vitamine", "💊"], ["medicament", "💊"], ["epargne", "💰"], ["budget", "💰"], ["code", "💻"], ["programm", "💻"],
  ["appeler", "📞"], ["famille", "❤️"], ["skin", "🧴"], ["dent", "🪥"], ["plante", "🪴"], ["jardin", "🪴"],
];
function emojiPour(nom) {
  const n = " " + norm(nom);
  for (const [cle, e] of EMOJIS) if (n.includes(" " + cle)) return e;
  return "✨";
}

function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE));
    if (valide(d)) return d;
  } catch (e) {}
  return { habitudes: DEPART.map(([id, nom, emoji]) => ({ id, nom, emoji })), jours: {} };
}
function valide(d) {
  return d && Array.isArray(d.habitudes) && d.habitudes.every((h) => h && h.id && h.nom) && d.jours && typeof d.jours === "object";
}
let donnees = charger();
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(donnees)); } catch (e) { toast("Impossible d'enregistrer", { couleur: "var(--rouge)", icone: "!" }); }
}

/* =========================================================
   Dates (jours au format AAAA-MM-JJ, heure locale)
   ========================================================= */

const deux = (n) => String(n).padStart(2, "0");
const cleDe = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
const dateDe = (k) => { const [a, m, j] = k.split("-").map(Number); return new Date(a, m - 1, j); };
const decaler = (k, n) => { const d = dateDe(k); d.setDate(d.getDate() + n); return cleDe(d); };
const aujourdhui = () => cleDe(new Date());
const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function nomDuJour(k) {
  const t = aujourdhui();
  if (k === t) return "Aujourd'hui";
  if (k === decaler(t, -1)) return "Hier";
  return majuscule(fmtCourt.format(dateDe(k)));
}

/* =========================================================
   Calculs : score du jour et séries
   ========================================================= */

const fait = (id, k) => !!donnees.jours[k]?.includes(id);
const faitsDuJour = (k) => donnees.habitudes.filter((h) => fait(h.id, k)).length;
const scoreDuJour = (k) => (donnees.habitudes.length ? Math.round((faitsDuJour(k) / donnees.habitudes.length) * 100) : 0);

// Série : jours d'affilée où l'habitude est faite, jusqu'au jour donné.
// Si elle n'est pas (encore) faite ce jour-là, la série d'hier reste valable.
function serie(id, jusqua = aujourdhui()) {
  let k = fait(id, jusqua) ? jusqua : decaler(jusqua, -1), n = 0;
  while (fait(id, k)) { n++; k = decaler(k, -1); }
  return n;
}
function record(id) {
  const jours = new Set(Object.keys(donnees.jours).filter((k) => fait(id, k)));
  let max = 0;
  for (const k of jours) {
    if (jours.has(decaler(k, -1))) continue; // pas le début d'une série
    let n = 0, j = k;
    while (jours.has(j)) { n++; j = decaler(j, 1); }
    max = Math.max(max, n);
  }
  return max;
}

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
const SVG_PLUS = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const SVG_MOINS = '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>';
const SVG_HAUT = '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ressort = "cubic-bezier(.2,1.35,.4,1)";

function rejouer(elm, classe) {
  if (!elm) return;
  elm.classList.remove(classe);
  void elm.offsetWidth;
  elm.classList.add(classe);
  elm.addEventListener("animationend", () => elm.classList.remove(classe), { once: true });
}

function confettis(depuis) {
  if (reduit) return;
  const couleurs = ["#ffffff", "#fb923c", "#fbbf24", "#f43f5e", "#facc15", "#fdba74"];
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
    action ? el("button", { onclick: () => { t.classList.remove("visible"); surAction(); } }, action) : "",
  );
  t.classList.add("visible");
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove("visible"), action ? 4000 : 2200);
}

/* =========================================================
   Le jour : score + liste des habitudes
   ========================================================= */

let jour = aujourdhui();
let premierRendu = true;

function rendreJour() {
  const t = aujourdhui();
  if (jour > t) jour = t;
  const titre = $("titre-jour");
  titre.textContent = nomDuJour(jour);
  titre.classList.toggle("passe", jour !== t);
  titre.setAttribute("aria-label", jour === t ? "Aujourd'hui" : `${fmtLong.format(dateDe(jour))}, revenir à aujourd'hui`);
  $("jour-suiv").disabled = jour === t;

  const liste = $("liste");
  liste.replaceChildren(...donnees.habitudes.map((h, i) => {
    const f = fait(h.id, jour), s = serie(h.id, jour);
    const b = el("button", {
      class: "habitude" + (f ? " fait" : ""), role: "listitem", "data-id": h.id, "aria-pressed": f ? "true" : "false",
      style: premierRendu ? `animation-delay:${0.05 + i * 0.035}s` : "animation:none",
      "aria-label": `${h.nom}${f ? ", fait" : ""}. Série : ${s} jour${s > 1 ? "s" : ""}`,
      onclick: () => basculer(h.id),
    },
      el("span", { class: "coche", html: SVG_COCHE }),
      el("span", { class: "emoji" }, h.emoji),
      el("span", { class: "nom" }, h.nom),
      el("span", { class: "serie" + (s ? (f ? " chaude" : "") : " froide") }, "🔥", el("span", {}, String(s))),
    );
    return b;
  }));
  $("vide").hidden = donnees.habitudes.length > 0;
  majEntete();
  premierRendu = false;
}

function majEntete() {
  const total = donnees.habitudes.length, n = faitsDuJour(jour), pct = scoreDuJour(jour);
  $("score").textContent = pct;
  $("compteur").innerHTML = total === 0 ? "Ajoute une habitude pour commencer"
    : n === total ? "Journée parfaite ✨" : `<b>${n}</b> sur ${total} habitude${total > 1 ? "s" : ""}`;
  $("jauge").style.width = pct + "%";
  $("arc").style.strokeDashoffset = String(113.1 * (1 - pct / 100));
  $("flamme").classList.toggle("eteint", n === 0);
}

function basculer(id) {
  const liste = (donnees.jours[jour] ||= []);
  const i = liste.indexOf(id);
  const avant = scoreDuJour(jour);
  if (i >= 0) liste.splice(i, 1); else liste.push(id);
  if (!liste.length) delete donnees.jours[jour];
  sauver();
  rendreJour();
  rendreCalendrier();
  rendreSeries();
  const ligne = $("liste").querySelector(`[data-id="${id}"]`);
  rejouer(ligne, "coche-anim");
  if (i < 0) {
    rejouer(ligne?.querySelector(".serie"), "pop");
    rejouer($("flamme"), "saut");
    if (scoreDuJour(jour) === 100 && avant < 100) {
      const encart = document.querySelector(".encart");
      rejouer(encart, "fini");
      confettis($("flamme"));
      toast("Journée parfaite !", { icone: "🔥" });
    }
  }
}

$("jour-prec").addEventListener("click", () => { jour = decaler(jour, -1); rendreJour(); rendreCalendrier(); });
$("jour-suiv").addEventListener("click", () => { if (jour < aujourdhui()) { jour = decaler(jour, 1); rendreJour(); rendreCalendrier(); } });
$("titre-jour").addEventListener("click", () => { if (jour !== aujourdhui()) { jour = aujourdhui(); rendreJour(); rendreCalendrier(); } });

/* =========================================================
   Calendrier
   ========================================================= */

let mois = (() => { const d = new Date(); return { a: d.getFullYear(), m: d.getMonth() }; })();
let filtre = "tout";
let calPremier = true;

function niveau(k) {
  if (filtre !== "tout") return fait(filtre, k) ? 4 : 0;
  const p = scoreDuJour(k);
  return p === 0 ? 0 : p === 100 ? 4 : p >= 67 ? 3 : p >= 34 ? 2 : 1;
}

function rendreFiltres() {
  if (filtre !== "tout" && !donnees.habitudes.some((h) => h.id === filtre)) filtre = "tout";
  const zone = $("filtres");
  zone.replaceChildren(
    el("button", { class: "filtre" + (filtre === "tout" ? " actif" : ""), role: "tab", "aria-selected": String(filtre === "tout"), onclick: () => choisirFiltre("tout") }, "Toutes"),
    ...donnees.habitudes.map((h) => el("button", {
      class: "filtre" + (filtre === h.id ? " actif" : ""), role: "tab", "aria-selected": String(filtre === h.id), onclick: () => choisirFiltre(h.id),
    }, h.emoji, " ", h.nom)),
  );
}
function choisirFiltre(f) {
  filtre = f;
  rendreFiltres();
  calPremier = true;
  rendreCalendrier();
  $("filtres").querySelector(".actif")?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduit ? "auto" : "smooth" });
}

function rendreCalendrier() {
  const t = aujourdhui();
  const premier = new Date(mois.a, mois.m, 1);
  const nbJours = new Date(mois.a, mois.m + 1, 0).getDate();
  const decal = (premier.getDay() + 6) % 7; // lundi en premier
  $("titre-mois").textContent = fmtMois.format(premier);
  const maintenant = new Date();
  $("mois-suiv").disabled = mois.a > maintenant.getFullYear() || (mois.a === maintenant.getFullYear() && mois.m >= maintenant.getMonth());

  const cases = [];
  for (let i = 0; i < decal; i++) cases.push(el("span", { class: "jour vide-case" }));
  let parfaits = 0, sommeScores = 0, joursPasses = 0, faitsHab = 0;
  for (let j = 1; j <= nbJours; j++) {
    const k = cleDe(new Date(mois.a, mois.m, j));
    const futur = k > t;
    const n = futur ? 0 : niveau(k);
    if (!futur) {
      joursPasses++;
      sommeScores += scoreDuJour(k);
      if (scoreDuJour(k) === 100 && donnees.habitudes.length) parfaits++;
      if (filtre !== "tout" && fait(filtre, k)) faitsHab++;
    }
    const nom = fmtLong.format(dateDe(k));
    cases.push(el("button", {
      class: `jour${n ? " n" + n : ""}${k === t ? " aujourdhui" : ""}${futur ? " futur" : ""}${k === jour && k !== t ? " choisi" : ""}`,
      style: calPremier ? `animation-delay:${(decal + j) * 0.008}s` : "animation:none",
      "aria-label": futur ? nom : `${nom} : ${filtre === "tout" ? scoreDuJour(k) + " %" : fait(filtre, k) ? "fait" : "pas fait"}`,
      disabled: futur, onclick: () => ouvrirJour(k),
    }, String(j)));
  }
  $("grille").replaceChildren(...cases);
  calPremier = false;

  const stat = (val, txt) => el("div", { class: "stat" }, el("b", {}, val), el("span", {}, txt));
  const bilan = $("bilan-mois");
  if (filtre === "tout") {
    bilan.replaceChildren(
      stat(String(parfaits), parfaits > 1 ? "jours parfaits" : "jour parfait"),
      stat((joursPasses ? Math.round(sommeScores / joursPasses) : 0) + " %", "score moyen"),
      stat(String(Math.max(0, ...donnees.habitudes.map((h) => serie(h.id)))), "meilleure série"),
    );
  } else {
    bilan.replaceChildren(
      stat(String(faitsHab), faitsHab > 1 ? "jours faits" : "jour fait"),
      stat((joursPasses ? Math.round((faitsHab / joursPasses) * 100) : 0) + " %", "du mois"),
      stat(String(record(filtre)), "record"),
    );
  }
}

$("mois-prec").addEventListener("click", () => { mois = mois.m === 0 ? { a: mois.a - 1, m: 11 } : { a: mois.a, m: mois.m - 1 }; calPremier = true; rendreCalendrier(); });
$("mois-suiv").addEventListener("click", () => { mois = mois.m === 11 ? { a: mois.a + 1, m: 0 } : { a: mois.a, m: mois.m + 1 }; calPremier = true; rendreCalendrier(); });

// Feuille : ce que j'ai fait tel jour
function ouvrirJour(k) {
  const total = donnees.habitudes.length, n = faitsDuJour(k);
  ouvrirFeuille(
    el("h3", {}, fmtLong.format(dateDe(k))),
    el("p", { class: "sous" }, total ? `Score ${scoreDuJour(k)} % · ${n} sur ${total} habitude${total > 1 ? "s" : ""}` : "Aucune habitude"),
    el("div", { class: "detail" }, donnees.habitudes.map((h) => {
      const f = fait(h.id, k);
      return el("div", { class: "ligne-detail" + (f ? " fait" : "") }, el("span", { class: "emoji" }, h.emoji), el("span", {}, h.nom), el("span", { class: "etat" }, f ? "✓ Fait" : "—"));
    })),
    el("button", { class: "principal", onclick: () => {
      jour = k; rendreJour(); rendreCalendrier(); fermerFeuille();
      window.scrollTo({ top: 0, behavior: reduit ? "auto" : "smooth" });
    } }, k === aujourdhui() ? "Cocher aujourd'hui" : "Modifier ce jour"),
    el("button", { class: "secondaire", onclick: fermerFeuille }, "Fermer"),
  );
}

/* =========================================================
   Séries
   ========================================================= */

function rendreSeries() {
  const lignes = donnees.habitudes.map((h) => ({ h, s: serie(h.id), r: record(h.id) }))
    .sort((a, b) => b.s - a.s || b.r - a.r);
  const zone = $("series");
  zone.replaceChildren(...lignes.map(({ h, s, r }) => el("div", { class: "ligne-serie" },
    el("span", { class: "emoji" }, h.emoji),
    el("div", { class: "milieu" }, el("div", { class: "nom" }, h.nom), el("div", { class: "barre" }, el("i", { "data-l": String(r ? (s / r) * 100 : 0) }))),
    el("div", { class: "chiffres" }, el("b", {}, `🔥 ${s}`), el("span", {}, `record ${r}`)),
  )));
  if (!lignes.length) zone.append(el("p", { class: "doux-petit centre" }, "Aucune habitude pour l'instant."));
  requestAnimationFrame(() => zone.querySelectorAll(".barre i").forEach((i) => (i.style.width = i.dataset.l + "%")));
}

/* =========================================================
   Feuille « Modifier les habitudes »
   ========================================================= */

function ouvrirGestion() {
  const champ = el("input", { type: "text", placeholder: "Nouvelle habitude…", enterkeyhint: "done", "aria-label": "Nouvelle habitude", maxlength: "40" });
  const apercu = el("span", { class: "apercu", "aria-hidden": "true" }, "✨");
  const bouton = el("button", { class: "btn-plus", type: "submit", "aria-label": "Ajouter l'habitude", disabled: true, html: SVG_PLUS });
  const gestion = el("div", { class: "gestion" });
  let dernier = "✨";
  champ.addEventListener("input", () => {
    bouton.disabled = !champ.value.trim();
    const e = champ.value.trim() ? emojiPour(champ.value) : "✨";
    if (e !== dernier) { dernier = e; apercu.textContent = e; rejouer(apercu, "saut"); }
  });
  const form = el("form", { class: "ajout", autocomplete: "off", onsubmit: (ev) => {
    ev.preventDefault();
    const nom = majuscule(champ.value.trim().replace(/\s+/g, " "));
    if (!nom) return;
    if (donnees.habitudes.some((h) => norm(h.nom) === norm(nom))) { toast(`${nom} est déjà là`, { couleur: "var(--doux)", icone: "i" }); return; }
    donnees.habitudes.push({ id: uid(), nom, emoji: emojiPour(nom) });
    sauver(); toutRendre(); remplir();
    champ.value = ""; bouton.disabled = true; apercu.textContent = dernier = "✨";
    gestion.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    toast(`${nom} ajoutée`);
  } }, apercu, champ, bouton);

  // Le nom se modifie directement : touche-le, écris, puis « OK »
  const champNom = (h) => {
    const c = el("input", { class: "nom-edit", type: "text", value: h.nom, maxlength: "40", enterkeyhint: "done", "aria-label": `Renommer ${h.nom}`, autocomplete: "off" });
    const valider = () => {
      const nom = majuscule(c.value.trim().replace(/\s+/g, " "));
      if (nom === h.nom) { c.value = h.nom; return; }
      if (!nom) { c.value = h.nom; return; }
      if (donnees.habitudes.some((x) => x !== h && norm(x.nom) === norm(nom))) {
        toast(`${nom} existe déjà`, { couleur: "var(--doux)", icone: "i" }); c.value = h.nom; return;
      }
      h.nom = nom; c.value = nom; c.setAttribute("aria-label", `Renommer ${nom}`);
      sauver(); toutRendre();
      toast("Nom modifié", { icone: "✎" });
    };
    c.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); c.blur(); } if (ev.key === "Escape") { c.value = h.nom; c.blur(); } });
    c.addEventListener("blur", valider);
    return c;
  };

  const remplir = () => {
    gestion.replaceChildren(...donnees.habitudes.map((h, i) => el("div", { class: "ligne-gestion" },
      el("button", { class: "emoji", "aria-label": `Changer l'emoji de ${h.nom}`, onclick: () => ouvrirEmojis(h) }, h.emoji),
      champNom(h),
      el("button", { class: "petit-btn", "aria-label": `Monter ${h.nom}`, disabled: i === 0, html: SVG_HAUT, onclick: () => {
        donnees.habitudes.splice(i - 1, 0, donnees.habitudes.splice(i, 1)[0]);
        sauver(); toutRendre(); remplir();
      } }),
      el("button", { class: "petit-btn moins", "aria-label": `Retirer ${h.nom}`, html: SVG_MOINS, onclick: () => {
        donnees.habitudes.splice(i, 1);
        sauver(); toutRendre(); remplir();
        toast(`${h.nom} retirée`, { couleur: "var(--rouge)", icone: "✕", action: "Annuler", surAction: () => {
          donnees.habitudes.splice(Math.min(i, donnees.habitudes.length), 0, h);
          sauver(); toutRendre(); if (!$("feuille").hidden) remplir();
        } });
      } }),
    )));
    if (!donnees.habitudes.length) gestion.append(el("p", { class: "sous centre" }, "Aucune habitude pour l'instant."));
  };

  ouvrirFeuille(
    el("h3", {}, "Mes habitudes"),
    el("p", { class: "sous" }, "Touche un nom pour le modifier. Ajoute, retire ou remonte une habitude : ton historique est gardé."),
    form, gestion,
    el("button", { class: "principal", onclick: fermerFeuille }, "Terminé"),
    el("p", { class: "titre-groupe" }, "Sauvegarde"),
    el("div", { class: "duo" },
      el("button", { class: "secondaire", onclick: exporter }, "Exporter"),
      el("button", { class: "secondaire", onclick: () => $("fichier").click() }, "Importer")),
  );
  remplir();
}

/* Choisir un emoji */
const CHOIX_EMOJIS = "⏰😴🧘💧🏋️💪🏃🚶👟🚴🏊🤸📖📚🎧🧠💼✍️🎨🎸🎹🎵🗣️💻🍎🥦🥗🍳🚭📵🍬🍷🚿🧴🪥💊🧹🪴🙏❤️💰⭐✨🔥🌅🌙";
function premierEmoji(texte) {
  const t = texte.trim();
  if (!t) return "";
  if (window.Intl?.Segmenter) return [...new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(t)][0].segment;
  return [...t][0];
}
function decouper(liste) {
  return window.Intl?.Segmenter ? [...new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(liste)].map((s) => s.segment) : [...liste];
}
function ouvrirEmojis(h) {
  const grand = el("div", { class: "emoji-actuel" }, h.emoji);
  const choisir = (e, bouton) => {
    grand.textContent = e;
    rejouer(grand, "saut");
    document.querySelectorAll(".grille-emojis button.choisi").forEach((b) => b.classList.remove("choisi"));
    bouton?.classList.add("choisi");
    h.emoji = e;
    sauver(); toutRendre();
    setTimeout(ouvrirGestion, 320);
  };
  const champ = el("input", { type: "text", placeholder: "Ou tape un emoji…", "aria-label": "Emoji au clavier", enterkeyhint: "done" });
  const bouton = el("button", { class: "btn-plus", type: "submit", "aria-label": "Valider", disabled: true, html: SVG_COCHE });
  champ.addEventListener("input", () => { bouton.disabled = !/\p{Extended_Pictographic}/u.test(champ.value); });
  const form = el("form", { class: "ajout ajout-emoji", autocomplete: "off", onsubmit: (ev) => {
    ev.preventDefault();
    const e = premierEmoji(champ.value);
    if (/\p{Extended_Pictographic}/u.test(e)) choisir(e);
  } }, el("span", { class: "apercu", "aria-hidden": "true" }, "⌨️"), champ, bouton);

  ouvrirFeuille(
    el("div", { class: "tete-emoji" }, grand, el("div", {}, el("h3", {}, h.nom), el("p", { class: "sous" }, "Choisis l'emoji de cette habitude."))),
    el("div", { class: "grille-emojis" }, decouper(CHOIX_EMOJIS).map((e) =>
      el("button", { class: e === h.emoji ? "choisi" : null, "aria-label": e, onclick: (ev) => choisir(e, ev.currentTarget) }, e))),
    form,
    el("button", { class: "secondaire", onclick: ouvrirGestion }, "Retour"),
  );
}

/* Exporter / importer (fichier JSON) */
async function exporter() {
  const nom = `habitudes-${aujourdhui()}.json`;
  const texte = JSON.stringify(donnees, null, 1);
  const fichier = new File([texte], nom, { type: "application/json" });
  try {
    if (navigator.canShare?.({ files: [fichier] })) { await navigator.share({ files: [fichier], title: "Habitudes" }); return; }
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
    const nbJours = Object.keys(d.jours).length;
    if (!confirm(`Remplacer tes habitudes par celles du fichier ?\n${d.habitudes.length} habitudes · ${nbJours} jours d'historique`)) return;
    donnees = { habitudes: d.habitudes.map((h) => ({ id: String(h.id), nom: String(h.nom), emoji: h.emoji || emojiPour(h.nom) })), jours: d.jours };
    sauver(); fermerFeuille(); toutRendre();
    toast(`Importé · ${nbJours} jours`);
  } catch (e) {
    toast("Ce fichier n'est pas une sauvegarde Habitudes", { couleur: "var(--rouge)", icone: "!" });
  }
});

/* Feuille du bas */
function ouvrirFeuille(...contenu) {
  const panneau = $("feuille-panneau"), f = $("feuille");
  panneau.replaceChildren(el("div", { class: "poignee" }), ...contenu);
  panneau.scrollTop = 0;
  f.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("ouverte")));
}
function fermerFeuille() {
  const f = $("feuille");
  document.activeElement?.blur();
  f.classList.remove("ouverte");
  setTimeout(() => { if (!f.classList.contains("ouverte")) f.hidden = true; }, 400);
}
$("feuille").addEventListener("click", (e) => { if (e.target.hasAttribute("data-fermer")) fermerFeuille(); });
$("gerer").addEventListener("click", ouvrirGestion);

/* =========================================================
   Démarrage
   ========================================================= */

function toutRendre() {
  rendreJour();
  rendreFiltres();
  rendreCalendrier();
  rendreSeries();
}

$("date").textContent = fmtLong.format(new Date());
toutRendre();

// Si l'app reste ouverte après minuit, on passe au nouveau jour
let dernierJour = aujourdhui();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || aujourdhui() === dernierJour) return;
  if (jour === dernierJour) jour = aujourdhui();
  dernierJour = aujourdhui();
  $("date").textContent = fmtLong.format(new Date());
  toutRendre();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
