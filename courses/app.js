"use strict";

/* =========================================================
   Données (restent sur le téléphone)
   ========================================================= */

const CLE = "courses.v1";
const $ = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = (s) => s.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Mots-clés → emoji (les plus précis d'abord)
const EMOJIS = [
  ["pomme de terre", "🥔"], ["patate", "🥔"], ["papier toilette", "🧻"], ["essuie", "🧻"], ["sopalin", "🧻"], ["mouchoir", "🧻"],
  ["liquide vaisselle", "🧽"], ["eponge", "🧽"], ["lessive", "🧺"], ["adoucissant", "🧺"], ["savon", "🧼"], ["gel douche", "🧴"],
  ["shampo", "🧴"], ["creme", "🧴"], ["dentifrice", "🪥"], ["brosse a dent", "🪥"], ["couche", "👶"], ["sac poubelle", "🗑️"], ["poubelle", "🗑️"],
  ["vinaigre", "🫙"], ["lait", "🥛"], ["baguette", "🥖"], ["pain", "🍞"], ["croissant", "🥐"], ["brioche", "🥐"], ["oeuf", "🥚"],
  ["beurre", "🧈"], ["fromage", "🧀"], ["emmental", "🧀"], ["comte", "🧀"], ["yaourt", "🥣"], ["yogourt", "🥣"], ["cereale", "🥣"],
  ["pate", "🍝"], ["spaghetti", "🍝"], ["riz", "🍚"], ["cafe", "☕"], ["the", "🍵"], ["eau", "💧"], ["jus", "🧃"], ["soda", "🥤"],
  ["coca", "🥤"], ["vin", "🍷"], ["biere", "🍺"], ["pomme", "🍎"], ["poire", "🍐"], ["banane", "🍌"], ["orange", "🍊"], ["clementine", "🍊"],
  ["citron", "🍋"], ["fraise", "🍓"], ["raisin", "🍇"], ["cerise", "🍒"], ["peche", "🍑"], ["ananas", "🍍"], ["melon", "🍈"], ["pasteque", "🍉"],
  ["kiwi", "🥝"], ["mangue", "🥭"], ["avocat", "🥑"], ["tomate", "🍅"], ["carotte", "🥕"], ["salade", "🥬"], ["epinard", "🥬"], ["chou", "🥬"],
  ["brocoli", "🥦"], ["legume", "🥦"], ["concombre", "🥒"], ["courgette", "🥒"], ["poivron", "🫑"], ["aubergine", "🍆"], ["oignon", "🧅"],
  ["echalote", "🧅"], ["ail", "🧄"], ["champignon", "🍄"], ["mais", "🌽"], ["haricot", "🫘"], ["lentille", "🫘"], ["fruit", "🍎"],
  ["poulet", "🍗"], ["dinde", "🍗"], ["steak", "🥩"], ["boeuf", "🥩"], ["viande", "🥩"], ["porc", "🥩"], ["jambon", "🥓"], ["lardon", "🥓"],
  ["bacon", "🥓"], ["saucisse", "🌭"], ["saumon", "🐟"], ["thon", "🐟"], ["poisson", "🐟"], ["crevette", "🦐"], ["pizza", "🍕"],
  ["burger", "🍔"], ["frite", "🍟"], ["chocolat", "🍫"], ["nutella", "🍫"], ["biscuit", "🍪"], ["gateau", "🍰"], ["bonbon", "🍬"],
  ["glace", "🍨"], ["sucre", "🧂"], ["sel", "🧂"], ["poivre", "🧂"], ["farine", "🌾"], ["huile", "🫒"], ["olive", "🫒"], ["miel", "🍯"],
  ["confiture", "🍯"], ["moutarde", "🫙"], ["ketchup", "🍅"], ["mayo", "🫙"], ["sauce", "🫙"], ["conserve", "🥫"], ["soupe", "🥫"],
  ["croquette", "🐾"], ["chat", "🐾"], ["chien", "🐾"], ["pile", "🔋"], ["ampoule", "💡"], ["fleur", "💐"], ["sac", "🛍️"],
];
function emojiPour(nom) {
  const n = " " + norm(nom);
  for (const [cle, e] of EMOJIS) if (n.includes(" " + cle)) return e;
  return "🛒";
}

const RECURRENTS_DEPART = ["Lait", "Pain", "Œufs", "Beurre", "Pâtes", "Café", "Fruits", "Papier toilette"];

function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE));
    if (d && Array.isArray(d.articles) && Array.isArray(d.recurrents)) return d;
  } catch (e) {}
  return { articles: [], recurrents: RECURRENTS_DEPART.map((nom) => ({ id: uid(), nom, emoji: emojiPour(nom) })) };
}
const donnees = charger();
donnees.emojis ||= {}; // emojis choisis à la main, par nom d'aliment
const emojiChoisi = (nom) => donnees.emojis[norm(nom)] || emojiPour(nom);
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(donnees)); } catch (e) { toast("Impossible d'enregistrer", { couleur: "var(--rouge)", icone: "!" }); }
}

// "2 lait", "lait x2", "3× pommes" → { nom, qte }
function lireSaisie(texte) {
  let t = texte.trim().replace(/\s+/g, " "), qte = 1, m;
  if ((m = t.match(/^(\d{1,3})\s*[x×]?\s+(.+)$/i))) { qte = +m[1]; t = m[2]; }
  else if ((m = t.match(/^(.+?)\s*[x×]\s*(\d{1,3})$/i))) { t = m[1]; qte = +m[2]; }
  return { nom: majuscule(t), qte: Math.max(1, Math.min(999, qte)) };
}

const trouverArticle = (nom) => donnees.articles.find((a) => norm(a.nom) === norm(nom));
const trouverRecurrent = (nom) => donnees.recurrents.find((r) => norm(r.nom) === norm(nom));

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
const SVG_ETOILE = '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';
const SVG_PLUS = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const SVG_MOINS = '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>';
const SVG_POUBELLE = '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
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
    { transform: `translate(${x1}px, ${y1}px) scale(1) rotate(0)`, opacity: 1 },
  ], { duration: 650, easing: "cubic-bezier(.45,.05,.35,1)" });
  return a.finished.then(() => v.remove(), () => v.remove());
}

function confettis(depuis) {
  if (reduit) return;
  const couleurs = ["#ffffff", "#34d399", "#fbbf24", "#22d3ee", "#f472b6", "#a3e635"];
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
   Liste de courses (rendu avec animations de déplacement)
   ========================================================= */

const liste = $("liste");
const elements = new Map(); // id → élément
let premierRendu = true;

function creerArticle(id) {
  const e = el("div", { class: "article", role: "listitem", "data-id": id },
    el("div", { class: "fond-suppr", html: SVG_POUBELLE + "Supprimer" }),
    el("div", { class: "rangee" },
      el("span", { class: "coche", html: SVG_COCHE }),
      el("button", { class: "emoji", "aria-label": "Changer l'emoji" }),
      el("span", { class: "infos" }, el("span", { class: "nom" }), el("span", { class: "qte" })),
      el("button", { class: "etoile", "aria-label": "Garder en récurrent", html: SVG_ETOILE }),
    ),
  );
  activerGlisser(e);
  return e;
}
function majArticle(e, a) {
  e.classList.toggle("fait", a.fait);
  e.querySelector(".emoji").textContent = a.emoji;
  e.querySelector(".nom").textContent = a.nom;
  const q = e.querySelector(".qte");
  q.textContent = "×" + a.qte;
  q.hidden = a.qte < 2;
  const et = e.querySelector(".etoile");
  const rec = !!trouverRecurrent(a.nom);
  et.classList.toggle("on", rec);
  et.setAttribute("aria-label", rec ? "Retirer des récurrents" : "Garder en récurrent");
  e.querySelector(".rangee").setAttribute("aria-label", `${a.nom}${a.qte > 1 ? ", " + a.qte : ""}${a.fait ? ", dans le panier" : ""}`);
}

function creerSeparateur() {
  return el("div", { class: "separateur", "data-id": "sep" },
    el("span"),
    el("button", { onclick: viderPanier }, "Vider le panier"));
}

function rendre() {
  const aPrendre = donnees.articles.filter((a) => !a.fait).sort((x, y) => y.ajout - x.ajout);
  const panier = donnees.articles.filter((a) => a.fait).sort((x, y) => y.faitA - x.faitA);

  // FLIP : on retient où était chaque élément
  const avant = new Map();
  for (const [id, e] of elements) avant.set(id, e.getBoundingClientRect().top);

  const ordre = [];
  for (const a of aPrendre) ordre.push(a);
  if (panier.length) ordre.push({ id: "sep" });
  for (const a of panier) ordre.push(a);

  const nouveaux = new Set();
  const garder = new Set(ordre.map((o) => o.id));
  for (const [id, e] of elements) if (!garder.has(id)) { e.remove(); elements.delete(id); }

  ordre.forEach((o, i) => {
    let e = elements.get(o.id);
    if (!e) { e = o.id === "sep" ? creerSeparateur() : creerArticle(o.id); elements.set(o.id, e); nouveaux.add(o.id); }
    if (o.id === "sep") e.firstChild.textContent = `Dans le panier · ${panier.length}`;
    else majArticle(e, o);
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

  $("vide").hidden = donnees.articles.length > 0;
  $("astuce").hidden = donnees.articles.length === 0;
  majEntete(aPrendre.length, panier.length);
  rendreRecurrents();
}

let dejaFini = false;
function majEntete(reste, faits) {
  const total = reste + faits, pct = total ? Math.round((faits / total) * 100) : 0;
  $("compteur").innerHTML = !total ? "Rien à acheter pour l'instant"
    : !reste ? "Tout est dans le panier 🎉"
    : `<b>${reste}</b> à prendre${faits ? ` · <b>${faits}</b> dans le panier` : ""}`;
  $("pct").textContent = pct + "%";
  $("arc").style.strokeDashoffset = 113.1 * (1 - pct / 100);
  $("jauge").style.width = pct + "%";
  const fini = total > 0 && reste === 0;
  if (fini && !dejaFini && !premierRendu) {
    const encart = document.querySelector(".encart");
    rejouer(encart, "fini");
    setTimeout(() => confettis($("arc").closest(".anneau")), 250);
  }
  dejaFini = fini;
}

function ajouter(texte, { emoji, source } = {}) {
  const { nom, qte } = typeof texte === "string" ? lireSaisie(texte) : texte;
  if (!nom) return;
  let a = trouverArticle(nom), existait = !!a;
  if (a) {
    if (a.fait) { a.fait = false; a.qte = qte; a.ajout = Date.now(); }
    else a.qte += qte;
  } else {
    a = { id: uid(), nom, qte, emoji: emoji || trouverRecurrent(nom)?.emoji || emojiChoisi(nom), fait: false, ajout: Date.now() };
    donnees.articles.push(a);
  }
  sauver();
  const departRect = source?.getBoundingClientRect();
  rendre();
  const e = elements.get(a.id);
  if (existait) { rejouer(e, "flash"); rejouer(e.querySelector(".qte"), "pop"); }
  if (departRect) {
    const cible = e.querySelector(".emoji").getBoundingClientRect();
    const visible = cible.top > 0 && cible.bottom < document.querySelector(".dock").getBoundingClientRect().top;
    const arrivee = visible ? cible : document.querySelector(".encart-tete").getBoundingClientRect();
    e.querySelector(".emoji").style.opacity = visible && !existait ? "0" : "";
    envoler(a.emoji, departRect, arrivee).then(() => {
      const em = e.querySelector(".emoji");
      em.style.opacity = "";
      em.animate([{ transform: "scale(1.35)" }, { transform: "none" }], { duration: 400, easing: ressort });
    });
  }
  return { a, existait };
}

function basculer(id) {
  const a = donnees.articles.find((x) => x.id === id);
  if (!a) return;
  a.fait = !a.fait;
  if (a.fait) a.faitA = Date.now(); else a.ajout = Date.now();
  sauver();
  const e = elements.get(id);
  e.classList.toggle("fait", a.fait);
  if (a.fait) rejouer(e, "coche-anim");
  clearTimeout(e._attente);
  // on laisse la coche se dessiner avant de déplacer l'article
  e._attente = setTimeout(rendre, reduit ? 0 : 320);
}

function replier(e) {
  if (reduit) return Promise.resolve();
  const h = e.offsetHeight;
  return e.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 280, easing: doux, fill: "forwards" }).finished;
}

async function supprimer(id) {
  const i = donnees.articles.findIndex((x) => x.id === id);
  if (i < 0) return;
  const e = elements.get(id);
  await replier(e);
  const [a] = donnees.articles.splice(i, 1);
  sauver();
  elements.delete(id); e.remove();
  rendre();
  toast(`${a.nom} supprimé`, { couleur: "var(--rouge)", icone: "✕", action: "Annuler", surAction: () => { donnees.articles.push(a); sauver(); rendre(); } });
}

async function viderPanier() {
  const faits = donnees.articles.filter((a) => a.fait);
  if (!faits.length) return;
  const sep = elements.get("sep");
  await Promise.all([...faits.map((a) => elements.get(a.id)), sep].map((e, k) => new Promise((ok) => setTimeout(() => replier(e).then(ok), k * 35))));
  donnees.articles = donnees.articles.filter((a) => !a.fait);
  sauver();
  for (const a of faits) { elements.get(a.id)?.remove(); elements.delete(a.id); }
  sep?.remove(); elements.delete("sep");
  rendre();
  toast(`Panier vidé · ${faits.length} article${faits.length > 1 ? "s" : ""}`, { action: "Annuler", surAction: () => { donnees.articles.push(...faits); sauver(); rendre(); } });
}

function basculerRecurrent(nom, emoji, bouton) {
  const r = trouverRecurrent(nom);
  if (r) {
    donnees.recurrents = donnees.recurrents.filter((x) => x !== r);
    toast(`${nom} retiré des récurrents`, { couleur: "var(--doux)", icone: "☆" });
  } else {
    donnees.recurrents.push({ id: uid(), nom, emoji });
    toast(`${nom} ajouté aux récurrents`, { couleur: "#f5b301", icone: "★" });
    if (bouton) rejouer(bouton, "anim");
  }
  sauver();
  rendre();
}

// Clic, glisser pour supprimer
function activerGlisser(e) {
  const rangee = e.querySelector(".rangee"), fond = e.querySelector(".fond-suppr");
  let x0 = 0, y0 = 0, dx = 0, actif = false, glisse = false, pointeur = null;
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
    dx = Math.min(0, ddx);
    const resist = dx < -120 ? -120 + (dx + 120) * 0.5 : dx;
    rangee.style.transform = `translateX(${resist}px)`;
    fond.style.opacity = Math.min(1, -dx / 90);
  });
  const fin = () => {
    if (!actif) return;
    actif = false;
    if (!glisse) return;
    e._glisse = true; setTimeout(() => (e._glisse = false), 50);
    if (dx < -90) {
      rangee.animate([{ transform: rangee.style.transform }, { transform: "translateX(-110%)" }], { duration: 220, easing: "ease-in", fill: "forwards" })
        .finished.then(() => supprimer(e.dataset.id));
    } else {
      rangee.animate([{ transform: rangee.style.transform }, { transform: "none" }], { duration: 380, easing: ressort });
      fond.animate([{ opacity: fond.style.opacity }, { opacity: 0 }], { duration: 250 });
      rangee.style.transform = ""; fond.style.opacity = "";
    }
  };
  rangee.addEventListener("pointerup", fin);
  rangee.addEventListener("pointercancel", () => { actif = false; glisse = false; rangee.style.transform = ""; fond.style.opacity = ""; });
  rangee.addEventListener("click", (ev) => {
    if (e._glisse) return;
    const id = e.dataset.id, a = donnees.articles.find((x) => x.id === id);
    if (!a) return;
    const et = ev.target.closest(".etoile");
    if (et) basculerRecurrent(a.nom, a.emoji, et);
    else if (ev.target.closest(".emoji")) ouvrirEmojis(a.nom, a.emoji);
    else basculer(id);
  });
}

/* =========================================================
   Saisie
   ========================================================= */

function brancherSaisie(form, input, apercu, bouton, surAjout) {
  let dernier = "🛒";
  input.addEventListener("input", () => {
    const v = input.value.trim();
    bouton.disabled = !v;
    const e = v ? emojiChoisi(lireSaisie(v).nom) : "🛒";
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

brancherSaisie($("form-ajout"), $("saisie"), $("apercu-emoji"), $("btn-ajout"), (v) => {
  const { a, existait } = ajouter(v);
  if (!existait && !trouverRecurrent(a.nom)) {
    toast(`${a.nom} ajouté`, { action: "★ Récurrent", surAction: () => basculerRecurrent(a.nom, a.emoji, elements.get(a.id)?.querySelector(".etoile")) });
  }
});

/* =========================================================
   Récurrents (dock du bas)
   ========================================================= */

let recPremier = true;
function rendreRecurrents() {
  const zone = $("recurrents");
  const cle = donnees.recurrents.map((r) => r.id + r.emoji).join();
  if (zone.dataset.cle !== cle) {
    zone.dataset.cle = cle;
    zone.replaceChildren(...donnees.recurrents.map((r, i) => {
      const b = el("button", { class: "rec", "data-id": r.id, style: recPremier ? `animation-delay:${0.25 + i * 0.04}s` : "animation:none" },
        el("span", { class: "e" }, r.emoji), el("span", { class: "n" }, r.nom), el("span", { class: "p", "aria-hidden": "true", html: SVG_PLUS }));
      b.addEventListener("click", () => {
        rejouer(b, "tape");
        ajouter({ nom: r.nom, qte: 1 }, { emoji: r.emoji, source: b.querySelector(".e") });
      });
      return b;
    }));
    if (!donnees.recurrents.length) zone.append(el("p", { class: "rec-vide" }, "Touche ☆ sur un article ou « Modifier » pour en ajouter."));
    recPremier = false;
  }
  for (const b of zone.querySelectorAll(".rec")) {
    const r = donnees.recurrents.find((x) => x.id === b.dataset.id);
    const a = r && trouverArticle(r.nom);
    const dans = !!(a && !a.fait);
    b.classList.toggle("dans", dans);
    b.setAttribute("aria-label", `Ajouter ${r.nom} à la liste${dans ? ` (déjà ${a.qte})` : ""}`);
  }
}

/* =========================================================
   Feuille « Modifier les récurrents »
   ========================================================= */

function ouvrirGestion() {
  const panneau = $("feuille-panneau"), f = $("feuille");
  const champ = el("input", { type: "text", placeholder: "Nouvel objet récurrent…", enterkeyhint: "done", "aria-label": "Nouvel objet récurrent" });
  const apercu = el("span", { class: "apercu", "aria-hidden": "true" }, "🛒");
  const bouton = el("button", { class: "btn-plus", type: "submit", "aria-label": "Ajouter aux récurrents", disabled: true, html: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>' });
  const form = el("form", { class: "ajout", autocomplete: "off" }, apercu, champ, bouton);
  const gestion = el("div", { class: "gestion" });

  const remplir = () => {
    gestion.replaceChildren(...donnees.recurrents.map((r) => el("div", { class: "ligne-rec" },
      el("button", { class: "emoji", "aria-label": `Changer l'emoji de ${r.nom}`, onclick: () => ouvrirEmojis(r.nom, r.emoji, ouvrirGestion) }, r.emoji), el("b", {}, r.nom),
      el("button", { class: "moins", "aria-label": `Retirer ${r.nom}`, onclick: (ev) => {
        const ligne = ev.currentTarget.parentElement;
        replier(ligne).then(() => { donnees.recurrents = donnees.recurrents.filter((x) => x !== r); sauver(); remplir(); rendre(); });
      }, html: SVG_MOINS }))));
    if (!donnees.recurrents.length) gestion.append(el("p", { class: "sous centre" }, "Aucun objet récurrent pour l'instant."));
  };

  brancherSaisie(form, champ, apercu, bouton, (v) => {
    const { nom } = lireSaisie(v);
    if (trouverRecurrent(nom)) { toast(`${nom} est déjà là`, { couleur: "var(--doux)", icone: "i" }); return; }
    donnees.recurrents.push({ id: uid(), nom, emoji: emojiChoisi(nom) });
    sauver(); remplir(); rendre();
    gestion.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  panneau.replaceChildren(
    el("div", { class: "poignee" }),
    el("h3", {}, "Récurrents"),
    el("p", { class: "sous" }, "Ils restent en bas de l'écran : un + suffit pour les mettre dans ta liste."),
    form, gestion,
    el("button", { class: "principal", onclick: fermerFeuille }, "Terminé"),
    el("button", { class: "secondaire", onclick: () => {
      const manquants = donnees.recurrents.filter((r) => { const a = trouverArticle(r.nom); return !a || a.fait; });
      fermerFeuille();
      if (!manquants.length) { toast("Tous les récurrents sont déjà dans la liste", { couleur: "var(--doux)", icone: "i" }); return; }
      setTimeout(() => {
        manquants.forEach((r, k) => setTimeout(() => {
          ajouter({ nom: r.nom, qte: 1 }, { emoji: r.emoji, source: document.querySelector(`.rec[data-id="${r.id}"] .e`) });
        }, k * 110));
      }, 300);
    } }, "Tout ajouter à la liste"),
  );
  remplir();
  f.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("ouverte")));
}
/* =========================================================
   Feuille « Choisir un emoji »
   ========================================================= */

const CHOIX_EMOJIS = [
  ["Fruits et légumes", "🍎🍏🍐🍊🍋🍌🍉🍇🍓🫐🍒🍑🥭🍍🥥🥝🍅🥑🍆🥔🥕🌽🌶️🫑🥒🥬🥦🧄🧅🍄🥜🫘🌰🫛🥗"],
  ["Frais", "🥛🧀🧈🥚🥣🍦🥩🍗🥓🌭🍖🐟🦐🦑🦀🍤🥟🍕🍔🥪🌮🌯🥙🍝🍜🍲🍛🍣🍱"],
  ["Épicerie et boulangerie", "🍞🥖🥐🥯🥨🧇🥞🍚🍙🌾🧂🫒🍯🫙🥫🍫🍪🍩🍰🧁🍬🍭🍿🥜"],
  ["Boissons", "💧🥤🧃☕🍵🧋🍷🍺🍾🥂🍹🧉🧊"],
  ["Maison et hygiène", "🧻🧼🧽🧴🪥🧺🧹🪣🗑️🧯🔋💡🕯️💊🩹👶🐾🐱🐶🌸💐🛍️🎁🛒"],
];

function premierEmoji(texte) {
  const t = texte.trim();
  if (!t) return "";
  if (window.Intl?.Segmenter) return [...new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(t)][0].segment;
  return [...t][0];
}

function changerEmoji(nom, emoji) {
  const n = norm(nom);
  donnees.emojis[n] = emoji;
  for (const a of donnees.articles) if (norm(a.nom) === n) a.emoji = emoji;
  for (const r of donnees.recurrents) if (norm(r.nom) === n) r.emoji = emoji;
  sauver();
  rendre();
  const a = trouverArticle(nom), e = a && elements.get(a.id);
  if (e && !reduit) e.querySelector(".emoji").animate([{ transform: "scale(.3) rotate(-30deg)" }, { transform: "none" }], { duration: 500, easing: ressort });
  const chip = [...document.querySelectorAll(".rec")].find((b) => norm(b.querySelector(".n").textContent) === n);
  if (chip) rejouer(chip, "tape");
}

function ouvrirEmojis(nom, actuel, retour) {
  const panneau = $("feuille-panneau"), f = $("feuille");
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
    el("div", { class: "tete-emoji" }, grand, el("div", {}, el("h3", {}, nom), el("p", { class: "sous" }, "Choisis l'emoji de cet article."))),
    ...CHOIX_EMOJIS.map(([titre, liste]) => [
      el("p", { class: "titre-groupe" }, titre),
      el("div", { class: "grille-emojis" }, [...new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(liste)].map(({ segment: e }) =>
        el("button", { class: e === actuel ? "choisi" : null, "aria-label": e, onclick: (ev) => choisir(e, ev.currentTarget) }, e))),
    ]).flat(),
    form,
    el("button", { class: "secondaire", onclick: () => { delete donnees.emojis[norm(nom)]; choisir(emojiPour(nom)); } }, "Emoji automatique"),
  );
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

$("date").textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
rendre();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
