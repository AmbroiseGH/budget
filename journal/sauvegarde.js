/* =========================================================
   Sauvegarde GitHub, commune aux 5 apps (Budget, Courses, Habitudes, Tâches, Journal).
   Le même fichier est copié dans chaque dossier d'app : modifier celui de la racine,
   puis le recopier (cp sauvegarde.js courses/ habitudes/ todo/ journal/).

   Chaque app envoie ses données dans un fichier JSON d'un dépôt GitHub PRIVÉ
   (ex. budget.json, journal.json). Le jeton reste dans le stockage local de l'appareil.

   Règles de sécurité :
   - les données locales ne sont jamais remplacées sans une confirmation explicite ;
   - l'envoi automatique ne remplace jamais une sauvegarde qu'il n'a pas lui-même envoyée
     (si une autre version existe sur GitHub, il se met en pause et demande quoi faire) ;
   - avant une restauration, les données actuelles sont gardées dans « <clé>.avant-restauration » ;
   - GitHub garde toutes les anciennes versions dans l'historique du dépôt.

   Utilisation dans une page :
   <script src="sauvegarde.js" data-app="todo" data-nom="Tâches" data-cle="todo.v1"
           data-requis="taches" data-unite="tâche"></script>
   puis Sauvegarde.ouvrir() pour afficher le panneau, Sauvegarde.signaler() après chaque enregistrement.
   ========================================================= */
(function () {
  "use strict";
  const script = document.currentScript;
  const APP = script.dataset.app;
  const NOM = script.dataset.nom || APP;
  const CLE = script.dataset.cle;
  const REQUIS = script.dataset.requis || "";
  const UNITE = script.dataset.unite || "élément";
  const FICHIER = `${APP}.json`;
  const CLE_CONFIG = "sauvegarde.github";        // { jeton, depot } (partagé par les apps du même navigateur)
  const CLE_ETAT = `sauvegarde.etat.${APP}`;     // { sha, empreinte, date, pause }
  const DEPOT_DEFAUT = "AmbroiseGH/mes-donnees";
  const DELAI_AUTO = 15000;

  /* ---------- Stockage local (jamais les données de l'app, sauf restauration) ---------- */
  const lire = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const config = () => { const c = lire(CLE_CONFIG); return c && c.jeton && c.depot ? c : null; };
  const etat = () => lire(CLE_ETAT) || {};
  const majEtat = (m) => ecrire(CLE_ETAT, Object.assign(etat(), m));
  const brut = () => { try { return localStorage.getItem(CLE); } catch (e) { return null; } };

  function empreinte(s) { // FNV-1a, juste pour savoir si les données ont changé
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36) + ":" + s.length;
  }
  const versB64 = (s) => {
    const o = new TextEncoder().encode(s);
    let b = "";
    for (let i = 0; i < o.length; i += 0x8000) b += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000));
    return btoa(b);
  };
  const depuisB64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  const autonome = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const lieu = () => autonome() ? "l'app sur l'écran d'accueil" : "le navigateur";

  function resume(d) {
    const v = d && REQUIS ? d[REQUIS] : null;
    const n = Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : null;
    if (n === null) return "";
    const pl = n > 1 ? UNITE.split(" ").map((m) => /[sx]$/.test(m) ? m : m + "s").join(" ") : UNITE;
    return `${n} ${pl}`;
  }
  const valide = (d) => d && typeof d === "object" && !Array.isArray(d) && (!REQUIS || REQUIS in d);
  const quand = (iso) => {
    if (!iso) return "";
    const d = new Date(iso), s = (Date.now() - d) / 1000;
    if (s < 60) return "à l'instant";
    if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
    const auj = new Date().toDateString() === d.toDateString();
    const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return auj ? `aujourd'hui à ${h}` : `le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} à ${h}`;
  };

  /* ---------- GitHub ---------- */
  class ErreurGH extends Error { constructor(code, msg) { super(msg); this.code = code; } }

  async function gh(chemin, options = {}, c = config()) {
    let rep;
    try {
      rep = await fetch(`https://api.github.com/repos/${c.depot}${chemin}`, Object.assign({
        cache: "no-store",
        headers: { Authorization: `Bearer ${c.jeton}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      }, options));
    } catch (e) { throw new ErreurGH(0, "Pas de connexion internet"); }
    if (rep.ok) return rep.json();
    if (rep.status === 401) throw new ErreurGH(401, "Le jeton n'est plus valable (expiré ou supprimé)");
    if (rep.status === 403) throw new ErreurGH(403, "Le jeton n'a pas le droit d'écrire dans ce dépôt");
    if (rep.status === 404) throw new ErreurGH(404, "Introuvable");
    if (rep.status === 409 || rep.status === 422) throw new ErreurGH(409, "Une autre version existe sur GitHub");
    throw new ErreurGH(rep.status, `Erreur GitHub (${rep.status})`);
  }

  // Lit la sauvegarde sur GitHub. null si elle n'existe pas encore.
  async function lireDistant() {
    let f;
    try { f = await gh(`/contents/${FICHIER}`); }
    catch (e) { if (e.code === 404) return null; throw e; }
    let contenu = f.content;
    if (!contenu && f.size > 0) contenu = (await gh(`/git/blobs/${f.sha}`)).content; // fichier de plus de 1 Mo
    let paquet = null;
    try { paquet = JSON.parse(depuisB64(contenu || "")); } catch (e) {}
    return { sha: f.sha, paquet };
  }

  /* ---------- Envoi ---------- */
  let enCours = null, minuteur = null;

  // auto : envoi silencieux. Ne remplace jamais une version inconnue sur GitHub.
  // forcer : l'utilisateur a confirmé qu'il veut remplacer la version de GitHub.
  function envoyer({ auto = false, forcer = false } = {}) {
    if (enCours) return enCours.then(() => envoyer({ auto, forcer }));
    enCours = (async () => {
      const c = config(), s = brut();
      if (!c) throw new ErreurGH(-1, "Sauvegarde GitHub non configurée");
      if (s === null) throw new ErreurGH(-2, "Rien à sauvegarder pour l'instant");
      const donnees = JSON.parse(s), e = etat(), emp = empreinte(s);
      if (auto && (e.pause || (e.empreinte === emp && e.sha))) return "inchange";
      let sha = e.sha;
      if (!sha || forcer) {
        const distant = await lireDistant();
        if (distant && !forcer && distant.sha !== e.sha) throw new ErreurGH(409, "Une autre version existe sur GitHub");
        sha = distant ? distant.sha : undefined;
      }
      const date = new Date().toISOString();
      const paquet = { app: APP, cle: CLE, version: 1, date, depuis: lieu(), donnees };
      const corps = {
        message: `${NOM} : sauvegarde du ${new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`,
        content: versB64(JSON.stringify(paquet, null, 1) + "\n"),
      };
      if (sha) corps.sha = sha;
      const r = await gh(`/contents/${FICHIER}`, { method: "PUT", body: JSON.stringify(corps) });
      majEtat({ sha: r.content.sha, empreinte: emp, date, pause: null, erreur: null });
      return "envoye";
    })();
    const p = enCours;
    p.catch((err) => {
      if (err.code === 409) majEtat({ pause: "conflit" });
      else if (err.code === 401 || err.code === 403 || err.code === 404) majEtat({ erreur: err.message });
      if (auto && err.code !== 0 && err.code > 0) avertirUneFois(err);
    }).finally(() => { if (enCours === p) enCours = null; });
    return p;
  }

  function signaler() {
    if (!config() || etat().pause) return;
    clearTimeout(minuteur);
    minuteur = setTimeout(() => envoyer({ auto: true }).catch(() => {}), DELAI_AUTO);
  }
  // En quittant l'app, on envoie tout de suite ce qui attend.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && minuteur) { clearTimeout(minuteur); minuteur = null; envoyer({ auto: true }).catch(() => {}); }
  });
  // À l'ouverture : envoie si quelque chose a changé depuis le dernier envoi.
  window.addEventListener("load", () => setTimeout(() => { if (config()) envoyer({ auto: true }).catch(() => {}); }, 3000));
  window.addEventListener("online", () => { if (config()) envoyer({ auto: true }).catch(() => {}); });

  /* ---------- Restauration ---------- */
  async function restaurer() {
    const distant = await lireDistant();
    if (!distant) throw new ErreurGH(404, "Aucune sauvegarde sur GitHub pour l'instant");
    const p = distant.paquet;
    if (!p || p.app !== APP || !valide(p.donnees)) throw new ErreurGH(-3, `Le fichier ${FICHIER} n'est pas une sauvegarde ${NOM} valable`);
    const actuel = brut();
    const ok = confirm(
      `Remplacer les données de ${NOM} sur cet appareil par la sauvegarde GitHub ?\n\n` +
      `Sauvegarde : ${quand(p.date)}${resume(p.donnees) ? " · " + resume(p.donnees) : ""}\n` +
      `Sur cet appareil : ${actuel ? resume(JSON.parse(actuel)) || "des données" : "rien"}\n\n` +
      `Une copie des données actuelles est gardée sur cet appareil.`);
    if (!ok) return false;
    if (actuel !== null && !ecrire(`${CLE}.avant-restauration`, { date: new Date().toISOString(), brut: actuel }))
      throw new ErreurGH(-4, "Impossible de garder une copie des données actuelles : restauration annulée");
    const s = JSON.stringify(p.donnees);
    try { localStorage.setItem(CLE, s); } catch (e) { throw new ErreurGH(-4, "Impossible d'écrire sur cet appareil"); }
    majEtat({ sha: distant.sha, empreinte: empreinte(s), date: p.date, pause: null, erreur: null });
    return true;
  }

  /* ---------- Export manuel (fichier) ---------- */
  async function exporterFichier() {
    const s = brut();
    if (s === null) { alert("Rien à exporter pour l'instant."); return; }
    const jour = new Date().toISOString().slice(0, 10);
    const nom = `${APP}-${jour}.json`;
    const f = new File([JSON.stringify({ app: APP, cle: CLE, version: 1, date: new Date().toISOString(), donnees: JSON.parse(s) }, null, 1)], nom, { type: "application/json" });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: NOM }); return; } }
    catch (e) { if (e.name === "AbortError") return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f); a.download = nom;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ---------- Interface ---------- */
  const STYLE = `
.sgh{--sgh-fond:#fff;--sgh-texte:#16161d;--sgh-doux:#6b6b78;--sgh-ligne:rgba(0,0,0,.08);--sgh-champ:#f2f2f6;--sgh-accent:#1f6feb;--sgh-ok:#1a9b5a;--sgh-alerte:#c2410c;--sgh-alerte-fond:#fff3e8;
  position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;font:inherit;color:var(--sgh-texte);-webkit-text-size-adjust:100%}
@media (prefers-color-scheme:dark){.sgh{--sgh-fond:#1c1c22;--sgh-texte:#f3f3f7;--sgh-doux:#a0a0ad;--sgh-ligne:rgba(255,255,255,.1);--sgh-champ:#2a2a32;--sgh-accent:#2f81f7;--sgh-ok:#3fcf8e;--sgh-alerte:#fb923c;--sgh-alerte-fond:rgba(251,146,60,.12)}}
.sgh-voile{position:absolute;inset:0;background:rgba(0,0,0,.4);opacity:0;transition:opacity .25s}
.sgh.ouvert .sgh-voile{opacity:1}
.sgh-panneau{position:relative;width:100%;max-width:520px;max-height:88vh;overflow:auto;background:var(--sgh-fond);border-radius:26px 26px 0 0;padding:10px 20px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.18);transform:translateY(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.sgh.ouvert .sgh-panneau{transform:none}
.sgh-poignee{width:40px;height:5px;border-radius:3px;background:var(--sgh-ligne);margin:0 auto 14px}
.sgh h3{margin:0 0 4px;font-size:1.3rem;font-weight:800;letter-spacing:-.01em;display:flex;align-items:center;gap:8px}
.sgh p{margin:0 0 12px;color:var(--sgh-doux);font-size:.92rem;line-height:1.45}
.sgh .sgh-statut{display:flex;gap:10px;align-items:flex-start;background:var(--sgh-champ);border-radius:16px;padding:12px 14px;margin:12px 0;color:var(--sgh-texte);font-size:.92rem;line-height:1.4}
.sgh .sgh-statut.alerte{background:var(--sgh-alerte-fond)}
.sgh .sgh-statut b{display:block}
.sgh .sgh-statut small{color:var(--sgh-doux);font-size:.85rem}
.sgh .sgh-pastille{flex:none;width:10px;height:10px;border-radius:50%;margin-top:5px;background:var(--sgh-ok)}
.sgh .alerte .sgh-pastille{background:var(--sgh-alerte)}
.sgh .attente .sgh-pastille{background:var(--sgh-doux)}
.sgh label{display:block;font-size:.85rem;font-weight:700;margin:12px 0 6px}
.sgh input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;color:var(--sgh-texte);background:var(--sgh-champ);border:1.5px solid transparent;border-radius:14px;padding:12px 14px;outline:none}
.sgh input:focus{border-color:var(--sgh-accent)}
.sgh button{font:inherit;font-weight:700;font-size:1rem;border:0;border-radius:16px;padding:14px;width:100%;margin-top:10px;cursor:pointer;background:var(--sgh-champ);color:var(--sgh-texte);-webkit-tap-highlight-color:transparent}
.sgh button.sgh-principal{background:var(--sgh-accent);color:#fff}
.sgh button.sgh-danger{background:transparent;color:var(--sgh-alerte);font-weight:600;font-size:.92rem;padding:10px}
.sgh button:disabled{opacity:.55}
.sgh .sgh-duo{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sgh .sgh-duo button{margin-top:10px}
.sgh a{color:var(--sgh-accent);font-weight:600}
.sgh .sgh-note{font-size:.8rem;margin-top:14px}
.sgh .sgh-msg{min-height:1.2em;margin:10px 0 0;font-size:.9rem;font-weight:600;color:var(--sgh-texte)}
.sgh .sgh-msg.erreur{color:var(--sgh-alerte)}
.sgh-bandeau{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147482999;background:#2b2b33;color:#fff;font:inherit;font-size:.9rem;font-weight:600;padding:10px 16px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.25);border:0;max-width:calc(100vw - 32px)}`;

  const h = (tag, attrs = {}, ...enfants) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else if (k === "class") n.className = v; else n.setAttribute(k, v === true ? "" : v);
    }
    n.append(...enfants.flat().filter((e) => e != null && e !== false));
    return n;
  };

  let racine = null;
  function preparer() {
    if (!document.getElementById("sgh-style")) document.head.append(h("style", { id: "sgh-style" }, STYLE));
  }
  function fermer() {
    if (!racine) return;
    const r = racine; racine = null;
    r.classList.remove("ouvert");
    setTimeout(() => r.remove(), 320);
  }
  function afficher(...contenu) {
    preparer();
    const panneau = h("div", { class: "sgh-panneau", role: "dialog", "aria-modal": "true", "aria-label": "Sauvegarde GitHub" }, h("div", { class: "sgh-poignee" }), ...contenu);
    if (racine) { racine.querySelector(".sgh-panneau").replaceWith(panneau); return; }
    racine = h("div", { class: "sgh" }, h("div", { class: "sgh-voile", onclick: fermer }), panneau);
    document.body.append(racine);
    requestAnimationFrame(() => requestAnimationFrame(() => racine && racine.classList.add("ouvert")));
  }

  const msg = () => h("p", { class: "sgh-msg", role: "status", "aria-live": "polite" });
  const dire = (el, texte, erreur) => { el.textContent = texte; el.classList.toggle("erreur", !!erreur); };
  async function occupe(bouton, texte, f) {
    const avant = bouton.textContent; bouton.disabled = true; bouton.textContent = texte;
    try { return await f(); } finally { bouton.disabled = false; bouton.textContent = avant; }
  }

  function ouvrir() {
    if (config()) ecranConnecte(); else ecranConfiguration();
  }

  function ecranConfiguration() {
    const anc = lire(CLE_CONFIG) || {};
    const depot = h("input", { type: "text", value: anc.depot || DEPOT_DEFAUT, autocapitalize: "off", autocorrect: "off", spellcheck: "false", "aria-label": "Dépôt GitHub privé" });
    const jeton = h("input", { type: "password", placeholder: "github_pat_…", autocapitalize: "off", autocorrect: "off", spellcheck: "false", autocomplete: "off", "aria-label": "Jeton GitHub" });
    const m = msg();
    const btn = h("button", { class: "sgh-principal", onclick: () => occupe(btn, "Vérification…", async () => {
      const c = { depot: depot.value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$|\/$/g, ""), jeton: jeton.value.trim() };
      if (!/^[\w.-]+\/[\w.-]+$/.test(c.depot)) return dire(m, "Le dépôt s'écrit « utilisateur/nom », par exemple AmbroiseGH/mes-donnees.", true);
      if (!c.jeton) return dire(m, "Colle ton jeton GitHub.", true);
      try {
        const r = await gh("", {}, c);
        if (!r.private) return dire(m, "Ce dépôt est public : tes données seraient visibles par tout le monde. Choisis un dépôt privé.", true);
      } catch (e) {
        return dire(m, e.code === 404 ? "Dépôt introuvable. Vérifie son nom et que le jeton y a accès." : e.message, true);
      }
      ecrire(CLE_CONFIG, c);
      majEtat({ erreur: null });
      let info = "Connecté à GitHub.";
      try { if (await envoyer({ auto: true }) === "envoye") info = "Connecté. Première sauvegarde envoyée ✓"; } catch (e) {}
      ecranConnecte(info);
    }) }, "Connecter");
    afficher(
      h("h3", {}, "☁️ Sauvegarde GitHub"),
      h("p", {}, `Envoie automatiquement une copie de ${NOM} dans ton dépôt GitHub privé, pour la retrouver si tu changes de téléphone. Tes données actuelles restent sur cet appareil.`),
      h("label", {}, "Dépôt privé"), depot,
      h("label", {}, "Jeton d'accès"), jeton,
      m, btn,
      h("p", { class: "sgh-note" }, "Le jeton reste uniquement sur cet appareil. ",
        h("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener" }, "Créer un jeton sur GitHub")),
      h("button", { onclick: exporterFichier }, "Exporter un fichier de secours"),
      h("button", { onclick: fermer }, "Fermer"),
    );
  }

  function ecranConnecte(info) {
    const c = config(), e = etat();
    const statut = h("div", { class: "sgh-statut attente" }, h("span", { class: "sgh-pastille" }), h("div", {}, h("b", {}, "Vérification sur GitHub…"), h("small", {}, c.depot)));
    const m = msg();
    if (info) dire(m, info);
    const envoi = h("button", { class: "sgh-principal", onclick: () => occupe(envoi, "Envoi…", async () => {
      try { await envoyer(); dire(m, "Sauvegarde envoyée ✓"); }
      catch (err) {
        if (err.code !== 409) return dire(m, err.message, true);
        if (!confirm(`La sauvegarde ${NOM} sur GitHub vient d'un autre appareil ou a changé.\n\nLa remplacer par les données de cet appareil ?\n(L'ancienne version reste dans l'historique du dépôt GitHub.)`)) return;
        try { await envoyer({ forcer: true }); dire(m, "Sauvegarde envoyée ✓"); } catch (e2) { dire(m, e2.message, true); }
      }
      rafraichir();
    }) }, "Envoyer maintenant");
    const resto = h("button", { onclick: () => occupe(resto, "Lecture…", async () => {
      try { if (await restaurer()) { dire(m, "Restauré ✓ Rechargement…"); setTimeout(() => location.reload(), 600); } }
      catch (err) { dire(m, err.message, true); }
    }) }, "Restaurer depuis GitHub");
    const ancienne = lire(`${CLE}.avant-restauration`);

    async function rafraichir() {
      const e2 = etat();
      try {
        const d = await lireDistant();
        let classe = "", titre, detail;
        if (!d) { classe = "attente"; titre = "Pas encore de sauvegarde sur GitHub"; detail = "Touche « Envoyer maintenant » pour la première."; }
        else if (d.sha === e2.sha) {
          titre = "Sauvegarde à jour"; detail = `Dernier envoi ${quand(e2.date)}${resume(d.paquet && d.paquet.donnees) ? " · " + resume(d.paquet.donnees) : ""}`;
          if (e2.empreinte !== empreinte(brut() || "")) { classe = "attente"; titre = "Modifications en attente d'envoi"; }
        } else {
          classe = "alerte"; titre = "Envoi automatique en pause";
          detail = `GitHub a une autre version (${quand(d.paquet && d.paquet.date)}${d.paquet && d.paquet.depuis ? ", depuis " + d.paquet.depuis : ""}${resume(d.paquet && d.paquet.donnees) ? ", " + resume(d.paquet.donnees) : ""}). Pour ne rien écraser, choisis : « Restaurer » pour la récupérer ici, ou « Envoyer maintenant » pour la remplacer par celle-ci.`;
          majEtat({ pause: "conflit" });
        }
        statut.className = "sgh-statut " + classe;
        statut.replaceChildren(h("span", { class: "sgh-pastille" }), h("div", {}, h("b", {}, titre), h("small", {}, detail)));
      } catch (err) {
        statut.className = "sgh-statut alerte";
        statut.replaceChildren(h("span", { class: "sgh-pastille" }), h("div", {}, h("b", {}, err.message), h("small", {}, err.code === 401 ? "Crée un nouveau jeton puis touche « Changer de jeton »." : c.depot)));
      }
    }

    afficher(
      h("h3", {}, "☁️ Sauvegarde GitHub"),
      h("p", {}, `${NOM} s'envoie tout seul dans ${c.depot} (fichier ${FICHIER}) quelques secondes après chaque changement.`),
      statut, m, envoi, resto,
      h("button", { onclick: exporterFichier }, "Exporter un fichier de secours"),
      ancienne ? h("button", { onclick: () => {
        if (!confirm(`Revenir aux données d'avant la dernière restauration (${quand(ancienne.date)}) ?`)) return;
        const actuel = brut();
        try { localStorage.setItem(CLE, ancienne.brut); } catch (err) { return dire(m, "Impossible d'écrire sur cet appareil", true); }
        if (actuel !== null) ecrire(`${CLE}.avant-restauration`, { date: new Date().toISOString(), brut: actuel });
        majEtat({ sha: null, pause: "conflit" });
        location.reload();
      } }, "Annuler la dernière restauration") : null,
      h("button", { onclick: fermer }, "Fermer"),
      h("button", { class: "sgh-danger", onclick: () => {
        if (!confirm("Retirer le jeton de cet appareil ? Tes données restent ici et sur GitHub.")) return;
        try { localStorage.removeItem(CLE_CONFIG); } catch (err) {}
        ecranConfiguration();
      } }, "Changer de jeton ou déconnecter"),
      h("p", { class: "sgh-note" }, `Bon à savoir : sur iPhone, Safari et l'app sur l'écran d'accueil ont chacun leurs propres données. Utilise la sauvegarde depuis celui où sont tes données.`),
    );
    rafraichir();
  }

  let averti = false;
  function avertirUneFois(err) {
    if (averti || racine) return;
    averti = true;
    preparer();
    const b = h("button", { class: "sgh-bandeau", onclick: () => { b.remove(); ouvrir(); } },
      err.code === 409 ? "☁️ Sauvegarde GitHub en pause · Voir" : `☁️ Sauvegarde GitHub : ${err.message}`);
    document.body.append(b);
    setTimeout(() => b.remove(), 7000);
  }

  window.Sauvegarde = { ouvrir, signaler, envoyer, restaurer, exporterFichier };
})();
