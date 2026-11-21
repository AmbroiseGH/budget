"use strict";

/* =========================================================
   Le journal secret
   - un code à 6 chiffres, choisi par la personne ;
   - les pensées sont chiffrées sur le téléphone (AES-GCM 256 bits,
     clé tirée du code par PBKDF2) et rangées dans donnees.secret :
     elles voyagent donc, toujours chiffrées, avec les sauvegardes ;
   - la nébuleuse rouge où chaque pensée flotte dans sa bulle ;
   - la pousse du jardin, qui grandit à chaque pensée encapsulée.
   Utilise les outils d'app.js : $, el, donnees, sauver, toast,
   haptique, rejouer, ouvrirFeuille, preparerAudio...
   ========================================================= */

(() => {
  const ITERATIONS = 600000;
  const GRACE = 45000;                 // en arrière-plan plus longtemps : le jardin se referme
  const CLE_VERROU = "journal.verrou";  // essais ratés (propre à ce téléphone)
  const CLE_JARDIN = "journal.jardin";  // croissance déjà vue (propre à ce téléphone)
  const CLE_FUSION = "journal.fusion";  // dernière restauration Google Drive déjà prise en compte
  const MAX_BULLES = 70;
  const TEINTES = [350, 356, 4, 12, 22, 338, 326, 304, 32];
  const INVITES = ["Qu'est-ce qui te pèse ?", "Qu'as-tu sur le cœur ?", "Qu'est-ce qui tourne dans ta tête ?", "Qu'est-ce qui t'inquiète ?", "Dépose ici ce qui t'encombre."];
  const MURMURES = [
    "C'est sorti de ta tête.<br>Elle flotte ici, en sécurité.",
    "Pensée encapsulée.<br>Tu peux respirer.",
    "Elle ne pèse plus sur toi.<br>Elle flotte, loin.",
    "Déposée.<br>Ta pousse va grandir.",
    "Elle est à l'abri dans sa bulle.<br>Toi aussi, tu peux te poser.",
  ];
  const AVEC_ARTICLE = {
    "Pousse": "une pousse", "Jeune pousse": "une jeune pousse", "Arbrisseau": "un arbrisseau", "Jeune arbre": "un jeune arbre",
    "Arbre": "un arbre", "Arbre en fleurs": "un arbre en fleurs", "Arbre de lumière": "un arbre de lumière",
  };
  const ICONE_LISTE = '<svg viewBox="0 0 24 24"><path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/></svg>';
  const ICONE_BULLES = '<svg viewBox="0 0 24 24"><circle cx="9" cy="14" r="5.2"/><circle cx="17" cy="7" r="3.2"/><circle cx="18" cy="17" r="2"/></svg>';

  /* ---------- Petits outils ---------- */

  const lireLocal = (cle, defaut) => {
    try { const v = JSON.parse(localStorage.getItem(cle)); return v && typeof v === "object" ? v : defaut; } catch (e) { return defaut; }
  };
  const ecrireLocal = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} };
  const hasard = (a, b) => a + Math.random() * (b - a);
  const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const fmtAvecAnnee = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const heure = (d) => fmtHeure.format(d).replace(":", " h ");
  function quand(ms) {
    const d = new Date(ms), maintenant = new Date(), hier = new Date();
    hier.setDate(hier.getDate() - 1);
    const jour = d.toDateString() === maintenant.toDateString() ? "aujourd'hui"
      : d.toDateString() === hier.toDateString() ? "hier"
      : `le ${(d.getFullYear() === maintenant.getFullYear() ? fmtLong : fmtAvecAnnee).format(d)}`;
    return `${jour} à ${heure(d)}`;
  }
  const quandCourt = (ms) => { const d = new Date(ms); return `${fmtJourMois.format(d)} · ${heure(d)}`; };
  const pensees = (n) => `${n} pensée${n > 1 ? "s" : ""} encapsulée${n > 1 ? "s" : ""}`;
  const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---------- Chiffrement (WebCrypto) ---------- */

  const enc = new TextEncoder(), dec = new TextDecoder();
  const AAD = enc.encode("journal.secret.v1");
  const cryptoDispo = !!(window.crypto && crypto.subtle && crypto.getRandomValues);
  function b64(buf) {
    const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function deriver(code, sel, iterations) {
    const base = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: sel, iterations, hash: "SHA-256" }, base,
      { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function chiffrer(cle, objet) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: AAD }, cle, enc.encode(JSON.stringify(objet)));
    return { iv: b64(iv), data: b64(data) };
  }
  async function dechiffrer(cle, s) {
    const clair = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(s.iv), additionalData: AAD }, cle, deB64(s.data));
    return JSON.parse(dec.decode(clair));
  }
  // Un mauvais code fait échouer le déchiffrement (l'étiquette AES-GCM ne correspond pas)
  async function ouvrirAvec(code, s) {
    const cle = await deriver(code, deB64(s.sel), Number(s.iter) || ITERATIONS);
    return { cle, contenu: await dechiffrer(cle, s) };
  }
  function nettoyerPensees(liste) {
    if (!Array.isArray(liste)) return [];
    return liste.filter((p) => p && typeof p.t === "string" && p.t.trim())
      .map((p) => ({ id: String(p.id || nouvelId()), t: p.t.slice(0, 20000), d: Number(p.d) || Date.now(), h: Number.isFinite(p.h) ? p.h : TEINTES[0] }));
  }

  /* ---------- Après une restauration Google Drive ---------- */
  // drive.js garde les données d'avant dans « journal.v1.avant-restauration » puis recharge la page :
  // si elles contenaient un coffre, il est repris (ou rangé dans les archives). Une seule fois par restauration.
  (() => {
    const avant = lireLocal(`${CLE}.avant-restauration`, null);
    if (!avant || typeof avant.brut !== "string" || lireLocal(CLE_FUSION, {}).date === avant.date) return;
    try {
      const ancien = JSON.parse(avant.brut);
      if (ancien && (ancien.secret || ancien.secretArchives)) { garderSecret(donnees, ancien); sauver(); }
    } catch (e) {}
    ecrireLocal(CLE_FUSION, { date: avant.date });
  })();

  /* ---------- État ---------- */

  let coffre = null;   // déverrouillé : { cle, sel, pensees, brouillon }
  let verrou = lireLocal(CLE_VERROU, { essais: 0, jusqua: 0 });
  const jardin = lireLocal(CLE_JARDIN, { vu: 0 });
  let pret = false, svg = null, ageAffiche = 0;
  let mode = "ouvrir", saisie = "", premier = "", occupe = false, nouveauDepart = false;
  let cacheDepuis = 0, minuteurBrouillon = 0, minuteurPhrase = 0, minuteurBlocage = 0, animCroissance = 0;

  const secret = () => (donnees.secret && typeof donnees.secret === "object" ? donnees.secret : null);
  const croissance = () => Math.max(0, Math.floor(Number(secret()?.n) || 0));
  const ageDepart = () => Math.min(croissance(), Math.max(0, Math.floor(Number(jardin.vu) || 0)));

  // Les écritures chiffrées passent l'une après l'autre
  let file = Promise.resolve();
  function enregistrer() {
    if (!coffre) return file;
    const c = coffre, contenu = { pensees: c.pensees.slice(), brouillon: c.brouillon || "" };
    file = file.then(async () => {
      const { iv, data } = await chiffrer(c.cle, contenu);
      const s = secret();
      if (!s || s.sel !== c.sel) return;   // le coffre a changé entre-temps (import, nouveau code)
      donnees.secret = { ...s, iv, data, maj: Date.now() };
      sauver();
    }).catch(() => toast("Impossible d'enregistrer tes pensées", { icone: "!" }));
    return file;
  }

  /* ---------- Sons (Soundza) ---------- */

  const tampons = {};
  function prepSons() {
    if (!donnees.sons) return;
    preparerAudio();
    if (!audio) return;
    for (const nom of ["bulle", "envol"]) {
      if (tampons[nom]) continue;
      tampons[nom] = fetch(`sons/${nom}.mp3`).then((r) => r.arrayBuffer())
        .then((b) => new Promise((ok, ko) => audio.decodeAudioData(b, ok, ko)))
        .catch(() => { tampons[nom] = null; return null; });
    }
  }
  async function jouer(nom, { vol = 0.5, vitesse = 1 } = {}) {
    if (!donnees.sons || !audio || !tampons[nom]) return;
    try {
      const t = await tampons[nom];
      if (!t) return;
      const s = audio.createBufferSource(), g = audio.createGain();
      s.buffer = t; s.playbackRate.value = vitesse; g.gain.value = vol;
      s.connect(g).connect(audio.destination);
      s.start();
    } catch (e) {}
  }
  function carillon() { noteCran(4); setTimeout(() => noteCran(6), 110); setTimeout(() => noteCran(8), 230); }

  /* ---------- La scène du jardin ---------- */

  function creerFond() {
    let h = "";
    for (let i = 0; i < 48; i++) {
      h += `<i style="left:${hasard(0, 100).toFixed(1)}%;top:${(Math.random() ** 1.4 * 64).toFixed(1)}%;--t:${hasard(1, 2.6).toFixed(1)}px;--d:${hasard(2, 6).toFixed(1)}s;--r:${(-hasard(0, 6)).toFixed(1)}s"></i>`;
    }
    $("fj-etoiles").innerHTML = h;
    let l = "";
    for (let i = 0; i < 11; i++) {
      l += `<i style="left:${hasard(4, 96).toFixed(1)}%;top:${hasard(26, 90).toFixed(1)}%;--dx:${hasard(-42, 42).toFixed(0)}px;--dy:${hasard(16, 46).toFixed(0)}px;--d:${hasard(14, 26).toFixed(1)}s;--c:${hasard(2.4, 4.6).toFixed(1)}s;--r:${(-hasard(0, 26)).toFixed(1)}s"></i>`;
    }
    $("fj-lucioles").innerHTML = l;
  }
  function preparer() {
    if (pret) return;
    pret = true;
    creerFond();
    ageAffiche = ageDepart();
    $("dome-jardin").innerHTML = JARDIN.scene({ age: ageAffiche });
    svg = $("dome-jardin").querySelector("svg");
  }

  function majEtat(n, { grandi = 0, nouveauStade = false } = {}) {
    const st = JARDIN.stade(n);
    $("stade").textContent = st.nom;
    $("compte-jardin").textContent = n ? pensees(n) : "Aucune pensée encapsulée";
    clearTimeout(minuteurPhrase);
    const phrase = $("phrase-jardin");
    if (grandi > 0) {
      rejouer($("compte-jardin"), "change");
      if (nouveauStade) rejouer($("stade"), "change");
      phrase.textContent = nouveauStade ? `Ta pousse est devenue ${AVEC_ARTICLE[st.nom] || st.nom.toLowerCase()}.` : "Ta pousse a grandi.";
      minuteurPhrase = setTimeout(() => { phrase.textContent = st.phrase; }, 5600);
    } else phrase.textContent = st.phrase;
  }
  function majRevoir() {
    const nb = coffre ? coffre.pensees.length : 0;
    $("revoir").hidden = !nb;
    $("revoir-nb").textContent = nb ? `Revoir mes pensées · ${nb}` : "";
  }

  // La pousse grandit, nourrie d'une pluie de lumière
  function grandir(de, a) {
    cancelAnimationFrame(animCroissance);
    const avant = JARDIN.stade(Math.floor(de)).nom;
    const fin = () => {
      ageAffiche = a;
      JARDIN.maj(svg, a);
      jardin.vu = a;
      ecrireLocal(CLE_JARDIN, jardin);
      majEtat(a, { grandi: a - de, nouveauStade: JARDIN.stade(a).nom !== avant });
    };
    if (reduit || document.hidden) { fin(); return; }
    rejouer($("dome-jardin"), "nourri");
    pluieDeLumiere(a);
    setTimeout(() => sonEtoile(8), 650);
    const duree = Math.min(4200, 1500 + (a - de) * 420), t0 = performance.now() + 500;
    let dernier = 0;
    const pas = (t) => {
      if (!coffre) return;
      const k = borne((t - t0) / duree, 0, 1), e = 1 - (1 - k) ** 3;
      if (k > 0 && (t - dernier > 42 || k >= 1)) { dernier = t; ageAffiche = de + (a - de) * e; JARDIN.maj(svg, ageAffiche); }
      if (k < 1) animCroissance = requestAnimationFrame(pas);
      else { haptique(); fin(); }
    };
    animCroissance = requestAnimationFrame(pas);
  }
  function pluieDeLumiere(a) {
    const r = $("dome-jardin").getBoundingClientRect();
    if (!r.width) return;
    const k = r.width / JARDIN.W, s = JARDIN.sommet(a);
    const tx = r.left + s.x * k, ty = r.top + s.y * k;
    for (let i = 0; i < 20; i++) {
      const g = el("i", { class: "grain-lumiere" });
      document.body.append(g);
      const x0 = r.left + r.width * hasard(0.18, 0.82), y0 = r.top + r.height * hasard(0, 0.3);
      const mx = (x0 + tx) / 2 + hasard(-46, 46), my = (y0 + ty) / 2 + hasard(-14, 22);
      g.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(.3)`, opacity: 0 },
        { transform: `translate(${mx}px, ${my}px) scale(1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${tx}px, ${ty}px) scale(.25)`, opacity: 0.1 },
      ], { duration: hasard(1100, 1800), delay: hasard(0, 650), easing: "cubic-bezier(.4,0,.3,1)", fill: "backwards" })
        .finished.then(() => g.remove(), () => g.remove());
    }
    setTimeout(() => {
      const o = el("div", { class: "onde-dome" });
      o.style.cssText = `left:${tx - 30}px;top:${ty - 30}px;width:60px;height:60px`;
      document.body.append(o);
      o.animate([{ transform: "scale(.3)", opacity: 0.9 }, { transform: "scale(2.6)", opacity: 0 }], { duration: 1100, easing: "cubic-bezier(.2,.8,.2,1)" })
        .finished.then(() => o.remove(), () => o.remove());
    }, 1650);
  }

  /* ---------- Afficher : verrou ou jardin ---------- */

  function afficherVerrou() {
    $("jardin").classList.add("verrouille");
    $("ui-jardin").hidden = true;
    $("ui-code").hidden = false;
    $("jardin-verrou").hidden = $("jardin-reglages").hidden = true;
    $("dome-jardin").classList.add("embrume");
    nouveauDepart = false;
    changerMode(secret() ? "ouvrir" : "accueil");
  }
  function afficherJardin({ apresOuverture = false } = {}) {
    $("jardin").classList.remove("verrouille");
    $("ui-code").hidden = true;
    $("ui-jardin").hidden = false;
    $("jardin-verrou").hidden = $("jardin-reglages").hidden = false;
    $("dome-jardin").classList.remove("embrume");
    majEtat(Math.floor(ageAffiche));
    majRevoir();
    const n = croissance();
    if (ageAffiche < n) setTimeout(() => { if (coffre && ongletActif === "jardin" && $("nebuleuse").hidden) grandir(ageAffiche, n); }, apresOuverture ? 1150 : 450);
    else if (ageAffiche > n) { ageAffiche = n; JARDIN.maj(svg, n); majEtat(n); jardin.vu = n; ecrireLocal(CLE_JARDIN, jardin); }
  }

  /* ---------- Le code à 6 chiffres ---------- */

  const MODES = {
    creer: ["Choisis ton code", "6 chiffres, rien qu'à toi", "Retour"],
    confirmer: ["Confirme ton code", "Tape-le une seconde fois", "Retour"],
    ouvrir: ["Entre ton code", "pour retrouver ton jardin", "Oublié ?"],
    changer: ["Nouveau code", "6 chiffres, rien qu'à toi", "Annuler"],
    changer2: ["Confirme le nouveau code", "Tape-le une seconde fois", "Annuler"],
    ancien: ["Ancien code", "celui de tes pensées d'avant", "Annuler"],
  };
  function changerMode(m) {
    mode = m; saisie = "";
    const accueil = m === "accueil";
    $("accueil-code").hidden = !accueil;
    $("saisie-code").hidden = accueil;
    if (!accueil) {
      const [titre, sous, autre] = MODES[m];
      $("code-titre").textContent = nouveauDepart && m === "creer" ? "Choisis ton nouveau code" : titre;
      $("code-sous").textContent = sous;
      $("code-autre").textContent = autre;
      $("points").className = "points";
      message(cryptoDispo ? "" : "Ce navigateur ne permet pas de protéger tes pensées.");
    }
    majPoints();
    majBlocage();
  }
  function majPoints() {
    [...$("points").children].forEach((p, i) => p.classList.toggle("plein", i < saisie.length));
    $("points").setAttribute("aria-label", `${saisie.length} chiffre${saisie.length > 1 ? "s" : ""} sur 6`);
  }
  function message(texte, doux = false) {
    const m = $("code-msg");
    m.textContent = texte;
    m.classList.toggle("doux", doux);
  }
  const bloque = () => mode === "ouvrir" && verrou.jusqua > Date.now();
  function majBlocage() {
    clearInterval(minuteurBlocage);
    const b = bloque();
    $("pave").classList.toggle("bloque", b);
    if (!b) return;
    const tic = () => {
      const reste = Math.ceil((verrou.jusqua - Date.now()) / 1000);
      if (reste <= 0) { clearInterval(minuteurBlocage); $("pave").classList.remove("bloque"); message("Tu peux réessayer.", true); return; }
      message(`Trop d'essais. Réessaie dans ${Math.floor(reste / 60)}:${String(reste % 60).padStart(2, "0")}`);
    };
    tic();
    minuteurBlocage = setInterval(tic, 1000);
  }
  function erreur(texte) {
    const p = $("points");
    p.classList.add("erreur");
    rejouer(p, "secoue");
    message(texte);
    try { navigator.vibrate?.([30, 40, 30]); } catch (e) {}
    haptique();
    setTimeout(() => { saisie = ""; p.classList.remove("erreur"); majPoints(); }, 520);
  }
  const faible = (c) => /^(\d)\1{5}$/.test(c) || "0123456789".includes(c) || "9876543210".includes(c);

  function taper(c) {
    if (occupe || bloque() || !cryptoDispo || saisie.length >= 6 || $("saisie-code").hidden) return;
    prepSons();
    saisie += c;
    haptique();
    majPoints();
    if (saisie.length === 6) setTimeout(valider, 150);
  }
  function effacerChiffre() {
    if (occupe || !saisie) return;
    saisie = saisie.slice(0, -1);
    majPoints();
  }
  function attente(oui) {
    occupe = oui;
    $("points").classList.toggle("attente", oui);
  }

  async function valider() {
    const code = saisie;
    if (code.length !== 6 || occupe) return;
    if (mode === "creer" || mode === "changer") {
      if (faible(code)) { erreur("Ce code est trop facile à deviner. Choisis-en un autre."); return; }
      premier = code;
      changerMode(mode === "creer" ? "confirmer" : "changer2");
      return;
    }
    if (mode === "confirmer" || mode === "changer2") {
      const retour = mode === "confirmer" ? "creer" : "changer";
      if (code !== premier) { erreur("Les deux codes sont différents. On recommence."); premier = ""; setTimeout(() => changerMode(retour), 1100); return; }
      attente(true);
      try {
        if (mode === "confirmer") {
          const etaitNouveau = nouveauDepart;
          await creerCoffre(code);
          await succes();
          afficherJardin({ apresOuverture: true });
          toast(etaitNouveau ? "Nouveau code enregistré" : "Ton jardin est protégé");
        } else {
          await changerCode(code);
          await succes();
          afficherJardin();
          toast("Nouveau code enregistré");
        }
      } catch (e) {
        erreur("Impossible de protéger ton jardin sur ce téléphone.");
      } finally { attente(false); premier = ""; }
      return;
    }
    if (mode === "ouvrir") {
      const s = secret();
      if (!s) { afficherVerrou(); return; }
      attente(true);
      try {
        const { cle, contenu } = await ouvrirAvec(code, s);
        if (secret() !== s) throw new Error("change");
        coffre = { cle, sel: s.sel, pensees: nettoyerPensees(contenu.pensees), brouillon: typeof contenu.brouillon === "string" ? contenu.brouillon : "" };
        verrou = { essais: 0, jusqua: 0 };
        ecrireLocal(CLE_VERROU, verrou);
        await succes();
        afficherJardin({ apresOuverture: true });
      } catch (e) {
        verrou.essais = (verrou.essais || 0) + 1;
        if (verrou.essais >= 5) verrou.jusqua = Date.now() + Math.min(15 * 60e3, 30e3 * 2 ** (verrou.essais - 5));
        ecrireLocal(CLE_VERROU, verrou);
        const reste = 5 - verrou.essais;
        attente(false);
        erreur(reste > 0 && reste <= 2 ? `Code incorrect · encore ${reste} essai${reste > 1 ? "s" : ""} avant une pause` : "Code incorrect");
        if (bloque()) setTimeout(majBlocage, 560);
      } finally { attente(false); }
      return;
    }
    if (mode === "ancien") {
      attente(true);
      try { await retrouverAnciennes(code); } finally { attente(false); }
    }
  }
  async function succes() {
    $("points").classList.add("ok");
    message("");
    if (donnees.sons) carillon();
    haptique();
    await attendre(reduit ? 0 : 420);
  }

  async function creerCoffre(code) {
    const ancien = secret();
    const sel = crypto.getRandomValues(new Uint8Array(16));
    const cle = await deriver(code, sel, ITERATIONS);
    const { iv, data } = await chiffrer(cle, { pensees: [], brouillon: "" });
    const maintenant = Date.now();
    // Code oublié : l'ancien coffre n'est pas effacé, il est rangé à part (et la pousse garde sa croissance)
    if (ancien) {
      const archives = Array.isArray(donnees.secretArchives) ? donnees.secretArchives : [];
      donnees.secretArchives = [...archives, { ...ancien, archive: maintenant }];
    }
    donnees.secret = { v: 1, iter: ITERATIONS, sel: b64(sel), iv, data, n: ancien ? Math.floor(Number(ancien.n) || 0) : 0, cree: maintenant, maj: maintenant };
    sauver();
    coffre = { cle, sel: donnees.secret.sel, pensees: [], brouillon: "" };
    nouveauDepart = false;
  }
  async function changerCode(code) {
    const sel = crypto.getRandomValues(new Uint8Array(16));
    const cle = await deriver(code, sel, ITERATIONS);
    await file;
    const { iv, data } = await chiffrer(cle, { pensees: coffre.pensees, brouillon: coffre.brouillon || "" });
    donnees.secret = { ...secret(), iter: ITERATIONS, sel: b64(sel), iv, data, maj: Date.now() };
    sauver();
    coffre.cle = cle;
    coffre.sel = donnees.secret.sel;
  }
  async function retrouverAnciennes(code) {
    const archives = Array.isArray(donnees.secretArchives) ? donnees.secretArchives : [];
    const restantes = [];
    let ouvertes = 0, trouvees = 0;
    const ids = new Set(coffre.pensees.map((p) => p.id));
    for (const a of archives) {
      try {
        const { contenu } = await ouvrirAvec(code, a);
        ouvertes++;
        for (const p of nettoyerPensees(contenu.pensees)) if (!ids.has(p.id)) { ids.add(p.id); coffre.pensees.push(p); trouvees++; }
      } catch (e) { restantes.push(a); }
    }
    if (!ouvertes) { erreur("Ce code n'ouvre aucune pensée d'avant."); return; }
    coffre.pensees.sort((a, b) => a.d - b.d);
    await enregistrer();
    if (restantes.length) donnees.secretArchives = restantes; else delete donnees.secretArchives;
    sauver();
    await succes();
    afficherJardin();
    toast(trouvees ? `${trouvees} pensée${trouvees > 1 ? "s" : ""} retrouvée${trouvees > 1 ? "s" : ""}` : "Ces pensées étaient déjà là");
  }

  function actionAutre() {
    if (occupe) return;
    if (mode === "ouvrir") ouvrirOubli();
    else if (mode === "creer") { if (nouveauDepart) { nouveauDepart = false; changerMode("ouvrir"); } else changerMode("accueil"); }
    else if (mode === "confirmer") { premier = ""; changerMode("creer"); }
    else { premier = ""; afficherJardin(); }
  }
  function codeDepuisJardin(m) {
    $("ui-jardin").hidden = true;
    $("ui-code").hidden = false;
    $("jardin-verrou").hidden = $("jardin-reglages").hidden = true;
    changerMode(m);
  }

  function ouvrirOubli() {
    const reglage = (ico, titre, sous, action) => el("button", { class: "reglage", onclick: action }, el("span", { class: "ico" }, ico), el("span", { class: "t" }, titre, el("small", {}, sous)));
    ouvrirFeuille(
      el("h3", {}, "Code oublié ?"),
      el("p", { class: "sous" }, "Tes pensées sont chiffrées avec ton code : sans lui, personne ne peut les relire, et il n'existe aucun moyen de le retrouver."),
      reglage("↩︎", "Réessayer", "Il te reviendra peut-être", fermerFeuille),
      reglage("🌱", "Repartir avec un nouveau code", "Ta pousse garde toute sa croissance", () => {
        if (!confirm("Repartir avec un nouveau code ?\nTes pensées actuelles ne seront plus visibles. Elles ne sont pas effacées : si l'ancien code te revient, tu pourras les retrouver dans les réglages du jardin.")) return;
        fermerFeuille();
        nouveauDepart = true;
        changerMode("creer");
      }),
      el("p", { class: "petit-texte" }, "Tes pensées actuelles restent rangées à part, toujours chiffrées. Avec l'ancien code, tu pourras les faire revenir à tout moment."),
    );
  }
  function ouvrirReglagesJardin() {
    if (!coffre) return;
    const reglage = (ico, titre, sous, action) => el("button", { class: "reglage", onclick: action }, el("span", { class: "ico" }, ico), el("span", { class: "t" }, titre, el("small", {}, sous)));
    const nb = coffre.pensees.length, archives = Array.isArray(donnees.secretArchives) ? donnees.secretArchives.length : 0;
    ouvrirFeuille(
      el("h3", {}, "Ton jardin secret"),
      el("p", { class: "sous" }, `${nb ? `${nb} pensée${nb > 1 ? "s" : ""} en bulle` : "Aucune pensée en bulle"} · protégé par ton code`),
      reglage("🔒", "Verrouiller maintenant", "Ton code sera demandé pour revenir", () => { fermerFeuille(); verrouiller(); }),
      reglage("🔑", "Changer le code", "Choisis un nouveau code à 6 chiffres", () => { fermerFeuille(); codeDepuisJardin("changer"); }),
      archives ? reglage("🗝️", "Retrouver mes pensées d'avant", archives > 1 ? `${archives} anciens jardins attendent leur code` : "Elles attendent leur ancien code", () => { fermerFeuille(); codeDepuisJardin("ancien"); }) : null,
      el("p", { class: "petit-texte" }, "Tes pensées sont chiffrées sur ce téléphone avec ton code (AES 256 bits). Elles font partie de tes sauvegardes, toujours chiffrées. Le code ne peut pas être récupéré : garde-le bien. Le jardin se referme quand tu changes d'onglet ou quittes l'appli. Sons : « Healing Pop » et « Soft Poof », Soundza (soundza.com)."),
    );
  }

  /* ---------- Verrouiller ---------- */

  function garderBrouillon() {
    if (!coffre) return;
    const z = $("texte-pensee");
    if ($("nebuleuse").hidden || z.value === (coffre.brouillon || "")) return;
    clearTimeout(minuteurBrouillon);
    coffre.brouillon = z.value.trim() ? z.value : "";
    enregistrer();
  }
  function verrouiller() {
    cancelAnimationFrame(animCroissance);
    if (coffre) {
      garderBrouillon();
      fermerNebuleuse({ immediat: true });
      const c = coffre;
      coffre = null;
      file.then(() => { c.cle = null; c.pensees = []; c.brouillon = ""; });
      $("texte-pensee").value = "";
      $("lecture-texte").textContent = "";
      $("neb-liste").replaceChildren();
    }
    if (pret) afficherVerrou();
  }

  /* ---------- La nébuleuse ---------- */

  const bulles = [];
  let aW = 0, aH = 0, animBulles = 0, tPrec = 0, lue = null, encapsulation = false;

  function mesurerArene() { const a = $("arene"); aW = a.clientWidth; aH = a.clientHeight; }
  function majCompteNeb() {
    const nb = coffre ? coffre.pensees.length : 0;
    $("neb-compte").textContent = nb ? `${nb} bulle${nb > 1 ? "s" : ""}` : "Aucune bulle pour l'instant";
  }
  function arreterAnimations(elm) { elm.getAnimations?.().forEach((a) => a.cancel()); }

  function ouvrirNebuleuse({ ecrire = false, depuis = null } = {}) {
    if (!coffre) return;
    prepSons();
    cancelAnimationFrame(animCroissance);
    const neb = $("nebuleuse"), fen = $("neb-fenetre");
    arreterAnimations(fen);
    arreterAnimations(neb.querySelector(".neb-voile"));
    neb.hidden = false;
    document.body.classList.add("neb-ouverte");
    fen.classList.remove("liste", "ecrit");
    $("neb-liste").hidden = true;
    $("lecture").hidden = true;
    $("neb-vue").innerHTML = ICONE_LISTE;
    $("neb-vue").setAttribute("aria-label", "Voir en liste");
    majCompteNeb();
    construireBulles();
    demarrerBulles();
    if (ecrire) modeEcriture(true);
    else { $("carte-ecriture").hidden = true; $("ouvrir-ecriture").hidden = false; }
    if (!reduit) {
      const rf = fen.getBoundingClientRect(), r = depuis?.getBoundingClientRect();
      const x = r ? r.left + r.width / 2 - rf.left : rf.width / 2, y = r ? r.top + r.height / 2 - rf.top : rf.height - 40;
      const R = Math.hypot(Math.max(x, rf.width - x), Math.max(y, rf.height - y)) + 12;
      fen.animate([{ clipPath: `circle(22px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)` }], { duration: 720, easing: "cubic-bezier(.32,.72,.2,1)" });
      neb.querySelector(".neb-voile").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 460 });
    }
  }
  function fermerNebuleuse({ immediat = false } = {}) {
    const neb = $("nebuleuse");
    if (neb.hidden) return;
    garderBrouillon();
    $("texte-pensee").blur();
    const fin = () => {
      neb.hidden = true;
      arreterAnimations($("neb-fenetre"));
      arreterAnimations(neb.querySelector(".neb-voile"));
      arreterBulles();
      $("arene").replaceChildren();
      bulles.length = 0;
      lue = null;
      $("neb-liste").replaceChildren();
      $("lecture").hidden = true;
      $("lecture-texte").textContent = "";
      $("texte-pensee").value = "";
      document.body.classList.remove("neb-ouverte");
      if (coffre && ongletActif === "jardin") {
        majRevoir();
        const n = croissance();
        if (ageAffiche < n) setTimeout(() => { if (coffre && $("nebuleuse").hidden) grandir(ageAffiche, n); }, 380);
      }
    };
    if (immediat || reduit) { fin(); return; }
    const fen = $("neb-fenetre"), rf = fen.getBoundingClientRect(), r = $("ecrire").getBoundingClientRect();
    const visible = r.width > 0;
    const x = visible ? r.left + r.width / 2 - rf.left : rf.width / 2, y = visible ? r.top + r.height / 2 - rf.top : rf.height - 40;
    const R = Math.hypot(Math.max(x, rf.width - x), Math.max(y, rf.height - y)) + 12;
    fen.animate([{ clipPath: `circle(${R}px at ${x}px ${y}px)`, opacity: 1 }, { clipPath: `circle(18px at ${x}px ${y}px)`, opacity: 0.5 }],
      { duration: 540, easing: "cubic-bezier(.55,0,.75,.35)", fill: "forwards" });
    neb.querySelector(".neb-voile").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 540, fill: "forwards" }).finished.then(fin, fin);
  }

  /* ---------- Les bulles ---------- */

  function nouvelleBulle(p) {
    const d0 = Math.round(60 + 34 * borne(Math.log10(1 + p.t.length) / 3, 0, 1));
    const ame = el("span", { class: "capsule-ame" });
    ame.style.setProperty("--v", `${hasard(5, 9).toFixed(1)}s`);
    const corps = el("span", { class: "capsule-corps" }, ame);
    const bouton = el("button", { class: "capsule", type: "button", "aria-label": `Pensée encapsulée ${quand(p.d)}` }, corps);
    bouton.style.setProperty("--d", `${d0}px`);
    bouton.style.setProperty("--h", String(p.h));
    return {
      p, el: bouton, corps, d0, x: 0, y: 0, vx: 0, vy: 0, z: 0, s: 1, r: d0 / 2, vit: 14, placee: false, tenue: false, fige: false,
      f: [hasard(0.08, 0.2), hasard(0.13, 0.29), hasard(0.08, 0.2), hasard(0.13, 0.29)], ph: [hasard(0, 7), hasard(0, 7), hasard(0, 7), hasard(0, 7)],
      w: hasard(1.5, 2.5), pw: hasard(0, 7),
      // Chaque bulle suit de loin un chemin très lent qui traverse toute la nébuleuse
      hf: [hasard(0.022, 0.05), hasard(0.018, 0.042)], hp: [hasard(0, 7), hasard(0, 7)],
    };
  }
  // Les pensées récentes flottent devant, les anciennes s'enfoncent dans la nébuleuse
  function disposer() {
    const tri = [...bulles].sort((a, b) => b.p.d - a.p.d);
    const nb = tri.length, prof = Math.min(0.8, nb / 12);
    let somme = 0;
    tri.forEach((b, i) => { b.z = nb > 1 ? (i / (nb - 1)) * prof : 0; somme += Math.PI * ((b.d0 * (1 - 0.42 * b.z)) / 2) ** 2; });
    const foule = Math.max(0.6, Math.min(1, Math.sqrt((Math.max(1, aW * aH) * 0.3) / Math.max(1, somme))));
    for (const b of tri) {
      b.s = (1 - 0.42 * b.z) * foule;
      b.r = (b.d0 * b.s) / 2;
      b.vit = 9 + 9 * (1 - b.z);
      b.el.style.zIndex = String(100 - Math.round(b.z * 90));
      b.el.style.opacity = (1 - 0.48 * b.z).toFixed(2);
      b.el.classList.toggle("loin", b.z > 0.5);
    }
  }
  function placer(b) {
    let meilleur = [aW / 2, aH / 2], dMeilleur = -Infinity;
    for (let k = 0; k < 16; k++) {
      const x = hasard(b.r + 6, Math.max(b.r + 7, aW - b.r - 6)), y = hasard(b.r + 6, Math.max(b.r + 7, aH - b.r - 6));
      let dmin = 1e9;
      for (const o of bulles) if (o !== b && o.placee && Math.abs(o.z - b.z) < 0.35) dmin = Math.min(dmin, Math.hypot(o.x - x, o.y - y) - o.r - b.r);
      if (dmin > dMeilleur) { dMeilleur = dmin; meilleur = [x, y]; }
    }
    [b.x, b.y] = meilleur;
    b.placee = true;
  }
  function construireBulles() {
    const arene = $("arene");
    arene.replaceChildren();
    bulles.length = 0;
    mesurerArene();
    const liste = [...coffre.pensees].sort((a, b) => b.d - a.d).slice(0, MAX_BULLES);
    for (const p of liste) bulles.push(nouvelleBulle(p));
    disposer();
    for (const b of bulles) { placer(b); arene.append(b.el); }
    if (!liste.length) arene.append(videArene());
    rendreBulles(performance.now());
  }
  const videArene = () => el("p", { class: "arene-vide", html: "Ici flotteront tes pensées<small>Écris ce qui te pèse : ta pensée sera enfermée dans une bulle, loin de toi.</small>" });
  function ajouterBulle(p, pos) {
    $("arene").querySelector(".arene-vide")?.remove();
    const b = nouvelleBulle(p);
    bulles.push(b);
    disposer();
    if (pos) { b.x = borne(pos.x, b.r, Math.max(b.r, aW - b.r)); b.y = borne(pos.y, b.r, Math.max(b.r, aH - b.r)); b.placee = true; } else placer(b);
    $("arene").append(b.el);
    // Au-delà du maximum, la plus ancienne bulle s'efface de la nébuleuse (elle reste dans la liste)
    if (bulles.length > MAX_BULLES) {
      const vieille = bulles.reduce((m, x) => (x.p.d < m.p.d ? x : m));
      retirerBulle(vieille);
    }
    rendreBulles(performance.now());
    return b;
  }
  function retirerBulle(b) {
    const i = bulles.indexOf(b);
    if (i >= 0) bulles.splice(i, 1);
    b.el.remove();
    disposer();
    if (!bulles.length && coffre && !coffre.pensees.length) $("arene").append(videArene());
  }

  function demarrerBulles() {
    cancelAnimationFrame(animBulles);
    tPrec = performance.now();
    animBulles = requestAnimationFrame(boucle);
  }
  function arreterBulles() { cancelAnimationFrame(animBulles); animBulles = 0; }
  function boucle(t) {
    const dt = Math.min(0.05, Math.max(0.001, (t - tPrec) / 1000));
    tPrec = t;
    if (!reduit) physique(t / 1000, dt);
    rendreBulles(t);
    animBulles = requestAnimationFrame(boucle);
  }
  function physique(tt, dt) {
    const k = Math.min(1, dt * 1.1), m = 14;
    for (const b of bulles) {
      if (b.tenue || b.fige) continue;
      // Une dérive lente et changeante, qui l'emmène peu à peu partout dans la nébuleuse
      const wx = Math.sin(tt * b.f[0] + b.ph[0]) + 0.6 * Math.sin(tt * b.f[1] + b.ph[1]);
      const wy = Math.sin(tt * b.f[2] + b.ph[2]) + 0.6 * Math.sin(tt * b.f[3] + b.ph[3]);
      const hx = aW / 2 + Math.max(0, aW / 2 - b.r - m) * 0.92 * Math.sin(tt * b.hf[0] + b.hp[0]);
      const hy = aH / 2 + Math.max(0, aH / 2 - b.r - m) * 0.92 * Math.sin(tt * b.hf[1] + b.hp[1]);
      b.vx += ((wx * b.vit) / 1.6 + (hx - b.x) * 0.05 - b.vx) * k;
      b.vy += ((wy * b.vit) / 1.6 + (hy - b.y) * 0.05 - b.vy) * k;
      if (b.x < b.r + m) b.vx += (b.r + m - b.x) * 3 * dt;
      if (b.x > aW - b.r - m) b.vx -= (b.x - (aW - b.r - m)) * 3 * dt;
      if (b.y < b.r + m) b.vy += (b.r + m - b.y) * 3 * dt;
      if (b.y > aH - b.r - m) b.vy -= (b.y - (aH - b.r - m)) * 3 * dt;
    }
    // Les bulles d'une même profondeur s'écartent doucement
    for (let i = 0; i < bulles.length; i++) {
      const a = bulles[i];
      for (let j = i + 1; j < bulles.length; j++) {
        const b = bulles[j];
        if (Math.abs(a.z - b.z) > 0.3) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r + 4;
        if (d >= min) continue;
        const pousse = (min - d) * 40 * dt, nx = dx / d, ny = dy / d;
        if (!a.tenue && !a.fige) { a.vx -= nx * pousse; a.vy -= ny * pousse; a.x -= nx * (min - d) * 0.02; a.y -= ny * (min - d) * 0.02; }
        if (!b.tenue && !b.fige) { b.vx += nx * pousse; b.vy += ny * pousse; b.x += nx * (min - d) * 0.02; b.y += ny * (min - d) * 0.02; }
      }
    }
    for (const b of bulles) {
      if (b.tenue || b.fige) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.65; } else if (b.x > aW - b.r) { b.x = aW - b.r; b.vx = -Math.abs(b.vx) * 0.65; }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.65; } else if (b.y > aH - b.r) { b.y = aH - b.r; b.vy = -Math.abs(b.vy) * 0.65; }
    }
  }
  function rendreBulles(t) {
    const tt = t / 1000;
    for (const b of bulles) {
      const o = reduit ? 0 : Math.sin(tt * b.w + b.pw) * 0.026;
      b.el.style.transform = `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0) scale(${(b.s * (1 + o)).toFixed(3)},${(b.s * (1 - o)).toFixed(3)})`;
    }
  }

  // Attraper une bulle, la lancer, ou la toucher pour la lire
  let prise = null;
  $("arene").addEventListener("pointerdown", (e) => {
    const elB = e.target.closest(".capsule");
    if (!elB || prise) return;
    const b = bulles.find((x) => x.el === elB);
    if (!b || b.fige) return;
    const ra = $("arene").getBoundingClientRect(), t = performance.now();
    prise = { b, id: e.pointerId, ra, ox: b.x - (e.clientX - ra.left), oy: b.y - (e.clientY - ra.top), t0: t, x0: e.clientX, y0: e.clientY, hist: [[t, e.clientX, e.clientY]], bouge: false };
    b.tenue = true; b.vx = 0; b.vy = 0;
    elB.classList.add("tenue");
    elB.style.zIndex = "300";
    try { elB.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  $("arene").addEventListener("pointermove", (e) => {
    const s = prise;
    if (!s || e.pointerId !== s.id) return;
    if (!s.bouge && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 9) s.bouge = true;
    s.b.x = borne(e.clientX - s.ra.left + s.ox, s.b.r, Math.max(s.b.r, aW - s.b.r));
    s.b.y = borne(e.clientY - s.ra.top + s.oy, s.b.r, Math.max(s.b.r, aH - s.b.r));
    s.hist.push([performance.now(), e.clientX, e.clientY]);
    if (s.hist.length > 8) s.hist.shift();
  });
  function lacher(e) {
    const s = prise;
    if (!s || e.pointerId !== s.id) return;
    prise = null;
    const { b } = s, t = performance.now();
    b.tenue = false;
    b.el.classList.remove("tenue");
    b.el.style.zIndex = String(100 - Math.round(b.z * 90));
    if (e.type === "pointerup" && !s.bouge && t - s.t0 < 450) { ouvrirLecture(b); return; }
    const recents = s.hist.filter((h) => t - h[0] < 130);
    if (recents.length > 1) {
      const a = recents[0], z = recents[recents.length - 1], d = Math.max(0.016, (z[0] - a[0]) / 1000);
      b.vx = borne((z[1] - a[1]) / d, -1400, 1400);
      b.vy = borne((z[2] - a[2]) / d, -1400, 1400);
    }
  }
  $("arene").addEventListener("pointerup", lacher);
  $("arene").addEventListener("pointercancel", lacher);
  // Au clavier (Entrée, Espace), le clic n'a pas de pointeur
  $("arene").addEventListener("click", (e) => {
    if (e.detail !== 0) return;
    const b = bulles.find((x) => x.el === e.target.closest(".capsule"));
    if (b) ouvrirLecture(b);
  });

  /* ---------- Écrire et encapsuler ---------- */

  function majEncapsuler() { $("encapsuler").disabled = !$("texte-pensee").value.trim(); }
  function ajusterEcriture() {
    const z = $("texte-pensee");
    if ($("carte-ecriture").hidden) return;
    const vv = window.visualViewport, h = vv ? vv.height : innerHeight;
    const haut = z.getBoundingClientRect().top - (vv ? vv.offsetTop : 0);
    z.style.maxHeight = `${Math.max(96, Math.round(h - haut - 84))}px`;
  }
  function modeEcriture(on) {
    const fen = $("neb-fenetre"), z = $("texte-pensee");
    if (on && fen.classList.contains("liste")) basculerVue();
    fen.classList.toggle("ecrit", on);
    $("carte-ecriture").hidden = !on;
    $("ouvrir-ecriture").hidden = on;
    if (on) {
      $("invite-pensee").textContent = INVITES[Math.floor(Math.random() * INVITES.length)];
      const avecBrouillon = !z.value && !!coffre?.brouillon;
      if (avecBrouillon) z.value = coffre.brouillon;
      $("brouillon").hidden = !avecBrouillon;
      majEncapsuler();
      z.focus({ preventScroll: true });
      requestAnimationFrame(ajusterEcriture);
    } else z.blur();
  }
  function murmure(html) {
    const m = $("murmure");
    m.innerHTML = html;
    m.classList.remove("visible");
    void m.offsetWidth;
    m.classList.add("visible");
  }

  async function encapsuler() {
    const z = $("texte-pensee"), texte = z.value.trim();
    if (!coffre || encapsulation || !texte) return;
    encapsulation = true;
    prepSons();
    clearTimeout(minuteurBrouillon);
    const p = { id: nouvelId(), t: texte.slice(0, 20000), d: Date.now(), h: TEINTES[Math.floor(Math.random() * TEINTES.length)] };
    coffre.pensees.push(p);
    coffre.brouillon = "";
    const s = secret();
    if (s) s.n = croissance() + 1;
    enregistrer();

    const fen = $("neb-fenetre"), rf = fen.getBoundingClientRect(), rz = z.getBoundingClientRect(), ra = $("arene").getBoundingClientRect();
    // La pensée naît au cœur de la nébuleuse
    const cx = ra.left - rf.left + ra.width / 2, cy = ra.top - rf.top + ra.height * 0.46;
    if (!reduit) {
      // Les mots quittent la page, se resserrent et deviennent une braise
      const f = el("p", { class: "fantome" }, texte.length > 700 ? `${texte.slice(0, 700)}…` : texte);
      f.style.cssText = `left:${rz.left - rf.left}px;top:${rz.top - rf.top}px;width:${rz.width}px;height:${rz.height}px`;
      fen.append(f);
      const dx = cx - (rz.left - rf.left + rz.width / 2), dy = cy - (rz.top - rf.top + rz.height / 2);
      f.animate([
        { transform: "none", opacity: 1, filter: "blur(0px)" },
        { transform: `translate(${dx * 0.12}px, ${dy * 0.12}px) scale(.62)`, opacity: 0.95, filter: "blur(.5px)", offset: 0.35 },
        { transform: `translate(${dx}px, ${dy}px) scale(.03)`, opacity: 0, filter: "blur(7px)" },
      ], { duration: 900, easing: "cubic-bezier(.5,0,.25,1)" }).finished.then(() => f.remove(), () => f.remove());
      for (let i = 0; i < 18; i++) {
        const g = el("i", { class: "grain-rouge" });
        fen.append(g);
        const x0 = rz.left - rf.left + Math.random() * rz.width, y0 = rz.top - rf.top + Math.random() * rz.height;
        g.animate([
          { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 0 },
          { opacity: 1, offset: 0.3 },
          { transform: `translate(${cx}px, ${cy}px) scale(.3)`, opacity: 0 },
        ], { duration: hasard(650, 950), delay: hasard(0, 220), easing: "cubic-bezier(.5,0,.3,1)", fill: "backwards" })
          .finished.then(() => g.remove(), () => g.remove());
      }
    }
    z.classList.add("disparait");
    await attendre(reduit ? 0 : 230);
    z.value = "";
    z.classList.remove("disparait");
    $("brouillon").hidden = true;
    modeEcriture(false);
    await attendre(reduit ? 0 : 480);
    // La bulle se forme autour de la braise
    const b = ajouterBulle(p, { x: cx - (ra.left - rf.left), y: cy - (ra.top - rf.top) });
    b.fige = true;
    b.corps.classList.add("nait");
    b.corps.addEventListener("animationend", () => b.corps.classList.remove("nait"), { once: true });
    jouer("bulle", { vol: 0.6 });
    haptique();
    if (!reduit) {
      const o = el("div", { class: "onde-bulle" }), d = b.r * 2;
      o.style.cssText = `left:${cx - d / 2}px;top:${cy - d / 2}px;width:${d}px;height:${d}px`;
      fen.append(o);
      o.animate([{ transform: "scale(.5)", opacity: 0.95 }, { transform: "scale(2.5)", opacity: 0 }], { duration: 1000, easing: "cubic-bezier(.2,.8,.2,1)" })
        .finished.then(() => o.remove(), () => o.remove());
    }
    majCompteNeb();
    murmure(MURMURES[Math.floor(Math.random() * MURMURES.length)]);
    setTimeout(() => { b.fige = false; b.vx = hasard(-30, 30); b.vy = -hasard(60, 110); }, reduit ? 0 : 900);
    encapsulation = false;
  }

  /* ---------- Lire, refermer, laisser partir ---------- */

  function ouvrirLecture(b, depuis) {
    if (!coffre || !b) return;
    lue = b;
    $("lecture-date").textContent = `Encapsulée ${quand(b.p.d)}`;
    $("lecture-texte").textContent = b.p.t;
    $("lecture-texte").scrollTop = 0;
    const lec = $("lecture");
    lec.hidden = false;
    const rb = depuis || (b.el?.isConnected && !$("neb-fenetre").classList.contains("liste") ? b.el.getBoundingClientRect() : null);
    if (b.el) { b.fige = true; b.el.classList.add("ouverte"); }
    haptique();
    if (!reduit) {
      const carte = $("carte-lecture"), rc = carte.getBoundingClientRect();
      const cx = rb ? rb.left + rb.width / 2 - rc.left : rc.width / 2, cy = rb ? rb.top + rb.height / 2 - rc.top : rc.height / 2;
      const R = Math.hypot(Math.max(cx, rc.width - cx), Math.max(cy, rc.height - cy));
      carte.animate([{ clipPath: `circle(${rb ? Math.min(rb.width, rb.height) / 2 : 30}px at ${cx}px ${cy}px)`, opacity: 0.5 }, { clipPath: `circle(${R}px at ${cx}px ${cy}px)`, opacity: 1 }],
        { duration: 560, easing: "cubic-bezier(.3,.7,.2,1)" });
      lec.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280 });
    }
    $("lecture-fermer").focus({ preventScroll: true });
  }
  function fermerLecture({ envol = false } = {}) {
    const lec = $("lecture");
    if (lec.hidden) return Promise.resolve();
    const b = lue;
    lue = null;
    const fin = () => { lec.hidden = true; $("lecture-texte").textContent = ""; };
    if (b?.el && !envol) {
      b.el.classList.remove("ouverte");
      b.fige = false;
      rejouer(b.corps, "revient");
    }
    if (reduit) { fin(); return Promise.resolve(); }
    const carte = $("carte-lecture"), rc = carte.getBoundingClientRect();
    const rb = b?.el?.isConnected && !$("neb-fenetre").classList.contains("liste") ? b.el.getBoundingClientRect() : null;
    const cx = rb ? rb.left + rb.width / 2 - rc.left : rc.width / 2, cy = rb ? rb.top + rb.height / 2 - rc.top : rc.height / 2;
    const R = Math.hypot(Math.max(cx, rc.width - cx), Math.max(cy, rc.height - cy));
    carte.animate([{ clipPath: `circle(${R}px at ${cx}px ${cy}px)`, opacity: 1 }, { clipPath: `circle(${rb ? rb.width / 2 : 20}px at ${cx}px ${cy}px)`, opacity: 0.2 }],
      { duration: 400, easing: "cubic-bezier(.5,0,.6,1)" });
    return lec.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).finished.then(fin, fin);
  }
  function eclatsNeb(x, y) {
    if (reduit) return;
    const fen = $("neb-fenetre");
    for (let k = 0; k < 16; k++) {
      const s = 7 + Math.random() * 11;
      const e = el("div", { class: "eclat-neb", html: `<svg viewBox="-10 -10 20 20"><path d="${etoile4(0, 0, 10)}" fill="${k % 3 ? "#ffffff" : "#ffb3c0"}"/></svg>` });
      e.style.width = e.style.height = `${s}px`;
      fen.append(e);
      const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 70;
      e.animate([
        { transform: `translate(${x - s / 2}px, ${y - s / 2}px) scale(.2)`, opacity: 0 },
        { opacity: 1, offset: 0.2 },
        { transform: `translate(${x - s / 2 + Math.cos(a) * d}px, ${y - s / 2 + Math.sin(a) * d - 40}px) scale(1) rotate(${Math.round((Math.random() - 0.5) * 220)}deg)`, opacity: 0 },
      ], { duration: 1000 + Math.random() * 700, delay: Math.random() * 120, easing: "cubic-bezier(.15,.7,.3,1)" })
        .finished.then(() => e.remove(), () => e.remove());
    }
  }
  function laisserPartir() {
    if (!coffre || !lue) return;
    const b = lue, p = b.p;
    const i = coffre.pensees.findIndex((x) => x.id === p.id);
    if (i < 0) { fermerLecture(); return; }
    coffre.pensees.splice(i, 1);
    enregistrer();
    jouer("envol", { vol: 0.65 });
    haptique();
    fermerLecture({ envol: true });
    const bulle = bulles.includes(b) ? b : null;
    if (bulle && !$("neb-fenetre").classList.contains("liste") && !reduit) {
      // La bulle remonte, devient légère, puis éclate en lumière
      bulle.el.classList.remove("ouverte");
      bulle.fige = true;
      const fen = $("neb-fenetre"), rf = fen.getBoundingClientRect(), ra = $("arene").getBoundingClientRect();
      bulle.corps.animate([
        { transform: "translateY(0) scale(1)", opacity: 1 },
        { transform: "translateY(-70px) scale(1.18)", opacity: 0.95, offset: 0.7 },
        { transform: "translateY(-96px) scale(1.5)", opacity: 0 },
      ], { duration: 900, easing: "cubic-bezier(.3,.1,.4,1)", fill: "forwards" }).finished.then(() => {
        eclatsNeb(ra.left - rf.left + bulle.x, ra.top - rf.top + bulle.y - 96 * bulle.s);
        retirerBulle(bulle);
      }, () => retirerBulle(bulle));
    } else if (bulle) retirerBulle(bulle);
    majCompteNeb();
    majListe();
    toast("Pensée envolée", {
      icone: "✦", action: "Annuler",
      surAction: () => {
        if (!coffre || coffre.pensees.some((x) => x.id === p.id)) return;
        coffre.pensees.push(p);
        enregistrer();
        majCompteNeb();
        majRevoir();
        if (!$("nebuleuse").hidden) { const nb = ajouterBulle(p); nb.corps.classList.add("revient"); majListe(); }
      },
    });
  }

  /* ---------- La liste ---------- */

  function basculerVue() {
    const fen = $("neb-fenetre"), liste = !fen.classList.contains("liste");
    if (liste && fen.classList.contains("ecrit")) modeEcriture(false);
    fen.classList.toggle("liste", liste);
    $("neb-liste").hidden = !liste;
    $("neb-vue").innerHTML = liste ? ICONE_BULLES : ICONE_LISTE;
    $("neb-vue").setAttribute("aria-label", liste ? "Voir les bulles" : "Voir en liste");
    if (liste) majListe();
  }
  function majListe() {
    const zone = $("neb-liste");
    if (zone.hidden || !coffre) return;
    const tri = [...coffre.pensees].sort((a, b) => b.d - a.d);
    if (!tri.length) { zone.replaceChildren(el("p", { class: "liste-vide" }, "Aucune pensée pour l'instant.")); return; }
    zone.replaceChildren(...tri.map((p, i) => el("button", {
      class: "item-pensee", type: "button", style: `animation-delay:${Math.min(i, 10) * 25}ms`,
      onclick: (e) => ouvrirLecture(bulles.find((b) => b.p.id === p.id) || { p }, e.currentTarget.getBoundingClientRect()),
    }, el("span", { class: "mini-bulle" }), el("span", { class: "txt" }, el("span", { class: "d" }, quandCourt(p.d)), el("p", {}, p.t)))));
  }

  /* ---------- Branchements ---------- */

  $("choisir-code").addEventListener("click", () => { prepSons(); changerMode("creer"); });
  $("pave").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-c]");
    if (b) taper(b.dataset.c);
  });
  $("code-effacer").addEventListener("click", effacerChiffre);
  $("code-autre").addEventListener("click", actionAutre);
  $("jardin-verrou").addEventListener("click", () => verrouiller());
  $("jardin-reglages").addEventListener("click", ouvrirReglagesJardin);
  $("ecrire").addEventListener("click", (e) => ouvrirNebuleuse({ ecrire: true, depuis: e.currentTarget }));
  $("revoir").addEventListener("click", (e) => ouvrirNebuleuse({ depuis: e.currentTarget }));
  $("neb-fermer").addEventListener("click", () => fermerNebuleuse());
  $("neb-vue").addEventListener("click", basculerVue);
  $("ouvrir-ecriture").addEventListener("click", () => modeEcriture(true));
  $("annuler-pensee").addEventListener("click", () => { garderBrouillon(); modeEcriture(false); });
  $("encapsuler").addEventListener("click", encapsuler);
  $("lecture-fermer").addEventListener("click", () => fermerLecture());
  $("lecture-partir").addEventListener("click", laisserPartir);
  $("lecture").addEventListener("click", (e) => { if (e.target === e.currentTarget) fermerLecture(); });
  $("texte-pensee").addEventListener("input", () => {
    majEncapsuler();
    $("brouillon").hidden = true;
    clearTimeout(minuteurBrouillon);
    minuteurBrouillon = setTimeout(garderBrouillon, 1500);
  });
  window.visualViewport?.addEventListener("resize", ajusterEcriture);
  window.addEventListener("resize", () => {
    if ($("nebuleuse").hidden) return;
    mesurerArene();
    disposer();
  });
  document.addEventListener("keydown", (e) => {
    if (ongletActif !== "jardin") return;
    if (!$("nebuleuse").hidden) {
      if (e.key !== "Escape") return;
      if (!$("lecture").hidden) fermerLecture();
      else if (!$("carte-ecriture").hidden) { garderBrouillon(); modeEcriture(false); }
      else fermerNebuleuse();
      return;
    }
    if ($("ui-code").hidden || $("saisie-code").hidden || !$("feuille").hidden) return;
    if (/^\d$/.test(e.key)) { taper(e.key); e.preventDefault(); }
    else if (e.key === "Backspace") { effacerChiffre(); e.preventDefault(); }
  });

  // Changer d'onglet referme le jardin ; y revenir demande le code
  const meta = $("couleur-theme"), NUIT = "#02060f";
  // Le ciel d'app.js met à jour cette couleur : sur le jardin, elle reste celle de la nuit
  new MutationObserver(() => { if (ongletActif === "jardin" && meta.getAttribute("content") !== NUIT) meta.setAttribute("content", NUIT); })
    .observe(meta, { attributes: true, attributeFilter: ["content"] });
  document.addEventListener("onglet", (e) => {
    const dedans = e.detail === "jardin";
    document.body.classList.toggle("sur-jardin", dedans);
    if (dedans) {
      preparer();
      meta.setAttribute("content", NUIT);
      if (coffre) afficherJardin(); else afficherVerrou();
    } else {
      verrouiller();
      const v = getComputedStyle(document.documentElement).getPropertyValue("--ciel-haut").trim();
      if (v) meta.setAttribute("content", v.startsWith("rgb") ? hexRgb(v.match(/\d+/g).slice(0, 3).map(Number)) : v);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cacheDepuis = Date.now(); garderBrouillon(); }
    else if (coffre && Date.now() - cacheDepuis > GRACE) verrouiller();
  });
  // Une sauvegarde importée peut remplacer le coffre : on referme et on redessine
  document.addEventListener("journal-importe", () => {
    verrouiller();
    if (!pret) return;
    ageAffiche = ageDepart();
    JARDIN.maj(svg, ageAffiche);
  });
})();
