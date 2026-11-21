/* =========================================================
   Sauvegarde Google Drive quotidienne, commune à Budget, Habitudes, Journal et Maxilla.
   Le même fichier est copié dans chaque dossier d'app : modifier celui de la racine,
   puis le recopier (cp drive.js habitudes/ journal/ maxilla/) et changer VERSION dans chaque sw.js.

   Une fois par jour (à l'ouverture de l'app, ou quand elle revient au premier plan),
   l'app écrit ses données dans Google Drive :
     applications/<dossier>/<app>.json   (ex. applications/habit tracker/habitudes.json)
   Le fichier est remplacé à chaque fois (Google Drive garde quand même ses anciennes versions).

   Connexion : Google OAuth « code + PKCE » par redirection (marche dans une app d'écran
   d'accueil sur iPhone). Le jeton de renouvellement reste dans le stockage local de l'appareil.
   Accès limité à « drive.file » : l'app ne voit que les fichiers qu'elle a créés elle-même.

   Règles de sécurité :
   - les données locales ne sont jamais remplacées sans une confirmation explicite ;
   - l'envoi automatique ne remplace jamais une sauvegarde écrite par un autre appareil
     (ou par Safari au lieu de l'app) : il se met en pause et demande quoi faire ;
   - il ne remplace pas non plus une sauvegarde nettement plus fournie que les données locales ;
   - avant une restauration, les données actuelles sont gardées dans « <clé>.avant-restauration ».

   Utilisation dans une page :
   <script src="drive.js" data-app="journal" data-nom="Journal" data-cle="journal.v1"
           data-dossier="journal" data-requis="jours" data-unite="journée"></script>
   puis Drive.ouvrir() pour afficher le panneau.
   ========================================================= */
(function () {
  "use strict";
  const script = document.currentScript;
  const APP = script.dataset.app;
  const NOM = script.dataset.nom || APP;
  const CLE = script.dataset.cle;
  const DOSSIER = script.dataset.dossier || APP;
  const REQUIS = script.dataset.requis || "";
  const UNITE = script.dataset.unite || "élément";
  const RACINE = "applications";
  const FICHIER = `${APP}.json`;
  const CLE_CONFIG = "drive.config";          // { clientId, secret, refresh, compte }
  const CLE_ETAT = `drive.etat.${APP}`;       // { fichierId, dossierId, jour, date, pause, erreur }
  const CLE_INSTALL = "drive.installation";   // identifiant de cette installation (anti-écrasement)
  const CLE_OAUTH = "drive.oauth";            // connexion en cours (le temps de l'aller-retour chez Google)
  const PORTEE = "https://www.googleapis.com/auth/drive.file";
  const GUIDE = "https://github.com/AmbroiseGH/budget/blob/main/GOOGLE-DRIVE.md";
  // Identifiant Google Cloud du projet « Mes applications » (l'ID client est public par nature).
  const CLIENT_ID = "418112090148-dab0qaeu0osm79io7s785mpuq9a04cip.apps.googleusercontent.com";
  // Code secret ajouté à la demande de Frank (2026-11-21). Une app web sans serveur ne peut pas le cacher ;
  // Google ne renvoie la connexion qu'aux adresses autorisées (ambroisegh.github.io/budget/…).
  // Pour le changer : console Google Cloud → Clients → Apps iPhone → nouveau code secret.
  const SECRET = "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";
  const PAUSE_ESSAI = 10 * 60 * 1000;         // après un échec, on réessaie au plus toutes les 10 min

  /* ---------- Stockage local ---------- */
  const lire = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const effacer = (k) => { try { localStorage.removeItem(k); } catch (e) {} };
  const config = () => { const c = lire(CLE_CONFIG); return c && c.clientId && c.secret && c.refresh ? c : null; };
  const etat = () => lire(CLE_ETAT) || {};
  const majEtat = (m) => ecrire(CLE_ETAT, Object.assign(etat(), m));
  const brut = () => { try { return localStorage.getItem(CLE); } catch (e) { return null; } };
  function installation() {
    let id = lire(CLE_INSTALL);
    if (!id) { id = hasard(12); ecrire(CLE_INSTALL, id); }
    return id;
  }

  const hasard = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (o) => o.toString(16).padStart(2, "0")).join("");
  const b64url = (octets) => btoa(String.fromCharCode(...new Uint8Array(octets))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jourLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const autonome = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const lieu = () => autonome() ? "l'app sur l'écran d'accueil" : "le navigateur";
  const retour = () => location.origin + location.pathname.replace(/index\.html$/, "");

  function compte(d) {
    const v = d && REQUIS ? d[REQUIS] : null;
    return Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : null;
  }
  function resume(d) { return resumeN(compte(d)); }
  function resumeN(n) {
    if (n === null || n === undefined || isNaN(n)) return "";
    const pl = n > 1 ? UNITE.split(" ").map((m) => /[sx]$/.test(m) ? m : m + "s").join(" ") : UNITE;
    return `${n} ${pl}`;
  }
  const compteLocal = () => { try { return compte(JSON.parse(brut())); } catch (e) { return null; } };
  const valide = (d) => d && typeof d === "object" && !Array.isArray(d) && (!REQUIS || REQUIS in d);
  const quand = (iso) => {
    if (!iso) return "";
    const d = new Date(iso), s = (Date.now() - d) / 1000;
    if (s < 60) return "à l'instant";
    if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
    const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (jourLocal() === jourLocal(d)) return `aujourd'hui à ${h}`;
    const hier = new Date(); hier.setDate(hier.getDate() - 1);
    if (jourLocal(hier) === jourLocal(d)) return `hier à ${h}`;
    return `le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} à ${h}`;
  };

  /* ---------- Connexion Google (OAuth code + PKCE, par redirection) ---------- */
  class ErreurD extends Error { constructor(code, msg) { super(msg); this.code = code; } }

  async function connecter(clientId, secret) {
    const verificateur = hasard(48);
    const defi = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificateur)));
    const etatOAuth = hasard(16);
    if (!ecrire(CLE_OAUTH, { etat: etatOAuth, verificateur, clientId, secret, app: APP, retour: retour(), date: Date.now() }))
      throw new ErreurD(-4, "Impossible d'écrire sur cet appareil");
    const p = new URLSearchParams({
      client_id: clientId, redirect_uri: retour(), response_type: "code", scope: PORTEE,
      access_type: "offline", prompt: "consent", code_challenge: defi, code_challenge_method: "S256", state: etatOAuth,
    });
    location.assign("https://accounts.google.com/o/oauth2/v2/auth?" + p);
  }

  async function demanderJeton(corps) {
    let rep;
    try {
      rep = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(corps),
      });
    } catch (e) { throw new ErreurD(0, "Pas de connexion internet"); }
    const j = await rep.json().catch(() => ({}));
    if (rep.ok) return j;
    if (j.error === "invalid_grant") throw new ErreurD(401, "La connexion à Google a expiré : reconnecte-toi");
    if (j.error === "invalid_client" || j.error === "unauthorized_client") throw new ErreurD(401, "ID client ou code secret refusé par Google");
    throw new ErreurD(rep.status, `Erreur Google (${j.error_description || j.error || rep.status})`);
  }

  let acces = null; // { jeton, fin } : jeton d'accès d'une heure, gardé en mémoire seulement
  let enCours = null, dernierEchec = 0, averti = false;

  // Retour de Google : ?code=…&state=… dans l'adresse.
  let retourOAuth = null;
  (function lireRetour() {
    const q = new URLSearchParams(location.search);
    if (!q.has("state") || !(q.has("code") || q.has("error"))) return;
    const attendu = lire(CLE_OAUTH);
    if (!attendu || attendu.etat !== q.get("state")) {
      if (!q.has("code") && !q.has("error")) return;
      history.replaceState(history.state, "", location.pathname + location.hash);
      retourOAuth = Promise.resolve(autonome()
        ? "La connexion n'a pas abouti (la réponse de Google n'a pas été reconnue). Réessaie."
        : "Google t'a renvoyé dans Safari au lieu de l'app. Ouvre l'app depuis l'écran d'accueil et réessaie.");
      return;
    }
    effacer(CLE_OAUTH);
    // Nettoie l'adresse tout de suite (le code ne sert qu'une fois).
    history.replaceState(history.state, "", location.pathname + location.hash);
    if (q.has("error")) {
      retourOAuth = Promise.resolve(q.get("error") === "access_denied" ? "Connexion annulée." : `Google a refusé la connexion (${q.get("error")}).`);
      return;
    }
    retourOAuth = (async () => {
      const r = await demanderJeton({
        code: q.get("code"), client_id: attendu.clientId, client_secret: attendu.secret,
        redirect_uri: attendu.retour, grant_type: "authorization_code", code_verifier: attendu.verificateur,
      });
      if (!r.refresh_token) throw new ErreurD(-5, "Google n'a pas donné d'accès durable. Réessaie de te connecter.");
      acces = { jeton: r.access_token, fin: Date.now() + (r.expires_in || 3600) * 1000 };
      ecrire(CLE_CONFIG, { clientId: attendu.clientId, secret: attendu.secret, refresh: r.refresh_token, compte: null });
      majEtat({ erreur: null, dossierId: null });
      try {
        const a = await api("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)");
        const c = config(); c.compte = a.user && a.user.emailAddress || null; ecrire(CLE_CONFIG, c);
      } catch (e) {}
      try {
        const res = await envoyer({ auto: true });
        if (res === "envoye") return "Connecté. Première sauvegarde envoyée ✓";
      } catch (e) {}
      return "Connecté à Google Drive ✓";
    })().catch((e) => e.message);
  })();

  async function jeton(renouveler) {
    if (!renouveler && acces && acces.fin > Date.now() + 60000) return acces.jeton;
    const c = config();
    if (!c) throw new ErreurD(-1, "Google Drive n'est pas connecté");
    try {
      const r = await demanderJeton({ client_id: c.clientId, client_secret: c.secret, refresh_token: c.refresh, grant_type: "refresh_token" });
      acces = { jeton: r.access_token, fin: Date.now() + (r.expires_in || 3600) * 1000 };
      return acces.jeton;
    } catch (e) {
      if (e.code === 401) majEtat({ erreur: e.message });
      throw e;
    }
  }

  async function api(url, options = {}, deja) {
    const t = await jeton();
    let rep;
    try {
      rep = await fetch(url, Object.assign({}, options, { cache: "no-store", headers: Object.assign({ Authorization: `Bearer ${t}` }, options.headers || {}) }));
    } catch (e) { throw new ErreurD(0, "Pas de connexion internet"); }
    if (rep.status === 401 && !deja) { acces = null; return api(url, options, true); }
    if (rep.ok) return options.texte ? rep.text() : rep.json();
    if (rep.status === 404) throw new ErreurD(404, "Introuvable sur Google Drive");
    if (rep.status === 403) {
      const j = await rep.json().catch(() => ({}));
      const raison = j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason;
      if (raison === "storageQuotaExceeded") throw new ErreurD(403, "Ton Google Drive est plein");
      if (/accessNotConfigured|SERVICE_DISABLED/.test(JSON.stringify(j))) throw new ErreurD(403, "Active « Google Drive API » dans Google Cloud (étape 2 du guide)");
      throw new ErreurD(403, "Google Drive refuse l'accès");
    }
    throw new ErreurD(rep.status, `Erreur Google Drive (${rep.status})`);
  }

  /* ---------- Dossiers et fichier sur Drive ---------- */
  const DRIVE = "https://www.googleapis.com/drive/v3/files";
  const ENVOI = "https://www.googleapis.com/upload/drive/v3/files";
  const DOSSIER_TYPE = "application/vnd.google-apps.folder";
  const echapper = (s) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  async function chercher(q, champs) {
    const p = new URLSearchParams({ q, fields: `files(${champs})`, orderBy: "createdTime", spaces: "drive", pageSize: "10" });
    return (await api(`${DRIVE}?${p}`)).files || [];
  }
  async function dossier(nom, parent) {
    const [trouve] = await chercher(`name='${echapper(nom)}' and mimeType='${DOSSIER_TYPE}' and '${parent}' in parents and trashed=false`, "id");
    if (trouve) return trouve.id;
    const cree = await api(`${DRIVE}?fields=id`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nom, mimeType: DOSSIER_TYPE, parents: [parent] }),
    });
    return cree.id;
  }
  async function dossierApp() {
    const racine = await dossier(RACINE, "root");
    const id = await dossier(DOSSIER, racine);
    majEtat({ dossierId: id });
    return id;
  }
  async function trouverFichier(dossierId) {
    const [f] = await chercher(`name='${echapper(FICHIER)}' and '${dossierId}' in parents and trashed=false`, "id,modifiedTime,appProperties");
    return f || null;
  }
  async function lireFichier(id) {
    const texte = await api(`${DRIVE}/${id}?alt=media`, { texte: true });
    try { return JSON.parse(texte); } catch (e) { return null; }
  }

  /* ---------- Envoi ---------- */
  // auto : envoi silencieux, une fois par jour. Ne remplace jamais une sauvegarde inconnue.
  // forcer : l'utilisateur a confirmé qu'il veut remplacer la sauvegarde de Google Drive.
  function envoyer({ auto = false, forcer = false } = {}) {
    if (enCours) return enCours.then(() => envoyer({ auto, forcer }), () => envoyer({ auto, forcer }));
    enCours = (async () => {
      if (!config()) throw new ErreurD(-1, "Google Drive n'est pas connecté");
      const s = brut();
      if (s === null) throw new ErreurD(-2, "Rien à sauvegarder pour l'instant");
      let donnees;
      try { donnees = JSON.parse(s); } catch (e) { throw new ErreurD(-3, "Les données de cet appareil sont illisibles : rien n'est envoyé"); }
      if (!valide(donnees)) throw new ErreurD(-3, "Les données de cet appareil sont incomplètes : rien n'est envoyé");
      if (auto && etat().pause) return "pause";

      const dossierId = await dossierApp();
      const f = await trouverFichier(dossierId);
      const moi = installation(), n = compte(donnees);
      if (f && !forcer) {
        const ap = f.appProperties || {};
        if (ap.installation !== moi) throw new ErreurD(409, "La sauvegarde Google Drive vient d'un autre appareil");
        const nDistant = Number(ap.nb);
        if (auto && n !== null && nDistant >= 10 && n < nDistant / 2) throw new ErreurD(410, "Moins de données ici que dans la sauvegarde");
      }

      const date = new Date().toISOString();
      const paquet = { app: APP, cle: CLE, version: 1, date, depuis: lieu(), donnees };
      const meta = { appProperties: { installation: moi, nb: String(n === null ? "" : n), app: APP } };
      if (!f) Object.assign(meta, { name: FICHIER, parents: [dossierId], mimeType: "application/json" });
      const limite = "sauvegarde" + hasard(8);
      const corps = `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
        `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(paquet, null, 1)}\n\r\n--${limite}--`;
      const r = await api(f ? `${ENVOI}/${f.id}?uploadType=multipart&fields=id` : `${ENVOI}?uploadType=multipart&fields=id`, {
        method: f ? "PATCH" : "POST",
        headers: { "Content-Type": `multipart/related; boundary=${limite}` },
        body: corps,
      });
      majEtat({ fichierId: r.id, jour: jourLocal(), date, pause: null, erreur: null });
      return "envoye";
    })();
    const p = enCours;
    p.catch((err) => {
      if (err.code === 409 || err.code === 410) majEtat({ pause: err.code === 409 ? "conflit" : "baisse" });
      if (auto) { dernierEchec = Date.now(); if (err.code > 0) avertirUneFois(err); }
    }).finally(() => { if (enCours === p) enCours = null; });
    return p;
  }

  // Une fois par jour : à l'ouverture, au retour au premier plan, au retour du réseau.
  function auBesoin() {
    if (!config() || retourOAuth) return;
    const e = etat();
    if (e.pause && e.jour !== jourLocal()) { avertirUneFois({ code: 409 }); return; }
    if (e.pause || e.jour === jourLocal() || Date.now() - dernierEchec < PAUSE_ESSAI || !navigator.onLine) return;
    envoyer({ auto: true }).then((r) => { if (r === "envoye") bandeau("☁️ Sauvegardé sur Google Drive", 2600); }).catch(() => {});
  }
  window.addEventListener("load", () => {
    setTimeout(auBesoin, 2500);
    if (retourOAuth) retourOAuth.then((info) => { retourOAuth = null; ouvrir(info); });
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") setTimeout(auBesoin, 1500); });
  window.addEventListener("online", () => setTimeout(auBesoin, 1500));

  /* ---------- Restauration ---------- */
  async function restaurer() {
    const dossierId = await dossierApp();
    const f = await trouverFichier(dossierId);
    if (!f) throw new ErreurD(404, "Aucune sauvegarde sur Google Drive pour l'instant");
    const p = await lireFichier(f.id);
    if (!p || p.app !== APP || !valide(p.donnees)) throw new ErreurD(-3, `Le fichier ${FICHIER} n'est pas une sauvegarde ${NOM} valable`);
    const actuel = brut();
    let resumeActuel = "rien";
    if (actuel !== null) { try { resumeActuel = resume(JSON.parse(actuel)) || "des données"; } catch (e) { resumeActuel = "des données illisibles"; } }
    const ok = confirm(
      `Remplacer les données de ${NOM} sur cet appareil par la sauvegarde Google Drive ?\n\n` +
      `Sauvegarde : ${quand(p.date)}${resume(p.donnees) ? " · " + resume(p.donnees) : ""}\n` +
      `Sur cet appareil : ${resumeActuel}\n\n` +
      `Une copie des données actuelles est gardée sur cet appareil.`);
    if (!ok) return false;
    if (actuel !== null && !ecrire(`${CLE}.avant-restauration`, { date: new Date().toISOString(), brut: actuel }))
      throw new ErreurD(-4, "Impossible de garder une copie des données actuelles : restauration annulée");
    try { localStorage.setItem(CLE, JSON.stringify(p.donnees)); } catch (e) { throw new ErreurD(-4, "Impossible d'écrire sur cet appareil"); }
    majEtat({ pause: null, erreur: null });
    // La sauvegarde et cet appareil ont maintenant les mêmes données : cet appareil la reprend à son compte.
    try { await envoyer({ forcer: true }); } catch (e) {}
    return true;
  }

  /* ---------- Interface ---------- */
  const STYLE = `
.sgd{--sgd-fond:#fff;--sgd-texte:#16161d;--sgd-doux:#6b6b78;--sgd-ligne:rgba(0,0,0,.08);--sgd-champ:#f2f2f6;--sgd-accent:#1a73e8;--sgd-ok:#1a9b5a;--sgd-alerte:#c2410c;--sgd-alerte-fond:#fff3e8;
  position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;font:inherit;color:var(--sgd-texte);-webkit-text-size-adjust:100%}
@media (prefers-color-scheme:dark){.sgd{--sgd-fond:#1c1c22;--sgd-texte:#f3f3f7;--sgd-doux:#a0a0ad;--sgd-ligne:rgba(255,255,255,.1);--sgd-champ:#2a2a32;--sgd-accent:#4c8df6;--sgd-ok:#3fcf8e;--sgd-alerte:#fb923c;--sgd-alerte-fond:rgba(251,146,60,.12)}}
.sgd-voile{position:absolute;inset:0;background:rgba(0,0,0,.4);opacity:0;transition:opacity .25s}
.sgd.ouvert .sgd-voile{opacity:1}
.sgd-panneau{position:relative;width:100%;max-width:520px;max-height:88vh;overflow:auto;background:var(--sgd-fond);border-radius:26px 26px 0 0;padding:10px 20px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.18);transform:translateY(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.sgd.ouvert .sgd-panneau{transform:none}
.sgd-poignee{width:40px;height:5px;border-radius:3px;background:var(--sgd-ligne);margin:0 auto 14px}
.sgd h3{margin:0 0 4px;font-size:1.3rem;font-weight:800;letter-spacing:-.01em}
.sgd p{margin:0 0 12px;color:var(--sgd-doux);font-size:.92rem;line-height:1.45}
.sgd .sgd-statut{display:flex;gap:10px;align-items:flex-start;background:var(--sgd-champ);border-radius:16px;padding:12px 14px;margin:12px 0;color:var(--sgd-texte);font-size:.92rem;line-height:1.4}
.sgd .sgd-statut.alerte{background:var(--sgd-alerte-fond)}
.sgd .sgd-statut b{display:block}
.sgd .sgd-statut small{color:var(--sgd-doux);font-size:.85rem}
.sgd .sgd-pastille{flex:none;width:10px;height:10px;border-radius:50%;margin-top:5px;background:var(--sgd-ok)}
.sgd .alerte .sgd-pastille{background:var(--sgd-alerte)}
.sgd .attente .sgd-pastille{background:var(--sgd-doux)}
.sgd label{display:block;font-size:.85rem;font-weight:700;margin:12px 0 6px}
.sgd input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;color:var(--sgd-texte);background:var(--sgd-champ);border:1.5px solid transparent;border-radius:14px;padding:12px 14px;outline:none}
.sgd input:focus{border-color:var(--sgd-accent)}
.sgd code{display:block;word-break:break-all;background:var(--sgd-champ);border-radius:12px;padding:10px 12px;font-size:.85rem;color:var(--sgd-texte);user-select:all;-webkit-user-select:all}
.sgd button{font:inherit;font-weight:700;font-size:1rem;border:0;border-radius:16px;padding:14px;width:100%;margin-top:10px;cursor:pointer;background:var(--sgd-champ);color:var(--sgd-texte);-webkit-tap-highlight-color:transparent}
.sgd button.sgd-principal{background:var(--sgd-accent);color:#fff}
.sgd button.sgd-danger{background:transparent;color:var(--sgd-alerte);font-weight:600;font-size:.92rem;padding:10px}
.sgd button:disabled{opacity:.55}
.sgd a{color:var(--sgd-accent);font-weight:600}
.sgd a.sgd-bouton{display:block;text-align:center;text-decoration:none;font-weight:700;border-radius:16px;padding:14px;margin-top:10px;background:var(--sgd-champ);color:var(--sgd-texte)}
.sgd .sgd-note{font-size:.8rem;margin-top:14px;color:var(--sgd-doux)}
.sgd summary{cursor:pointer;font-weight:600}
.sgd .sgd-msg{min-height:1.2em;margin:10px 0 0;font-size:.9rem;font-weight:600;color:var(--sgd-texte)}
.sgd .sgd-msg.erreur{color:var(--sgd-alerte)}
.sgd-bandeau{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147482999;background:#2b2b33;color:#fff;font:inherit;font-size:.9rem;font-weight:600;padding:10px 16px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.25);border:0;max-width:calc(100vw - 32px)}`;

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
    if (!document.getElementById("sgd-style")) document.head.append(h("style", { id: "sgd-style" }, STYLE));
  }
  function fermer() {
    if (!racine) return;
    const r = racine; racine = null;
    r.classList.remove("ouvert");
    setTimeout(() => r.remove(), 320);
  }
  function afficher(...contenu) {
    preparer();
    const panneau = h("div", { class: "sgd-panneau", role: "dialog", "aria-modal": "true", "aria-label": "Sauvegarde Google Drive" }, h("div", { class: "sgd-poignee" }), ...contenu);
    if (racine) { racine.querySelector(".sgd-panneau").replaceWith(panneau); return; }
    racine = h("div", { class: "sgd" }, h("div", { class: "sgd-voile", onclick: fermer }), panneau);
    document.body.append(racine);
    requestAnimationFrame(() => requestAnimationFrame(() => racine && racine.classList.add("ouvert")));
  }

  const msg = () => h("p", { class: "sgd-msg", role: "status", "aria-live": "polite" });
  const dire = (el, texte, erreur) => { el.textContent = texte || ""; el.classList.toggle("erreur", !!erreur); };
  async function occupe(bouton, texte, f) {
    const avant = bouton.textContent; bouton.disabled = true; bouton.textContent = texte;
    try { return await f(); } finally { bouton.disabled = false; bouton.textContent = avant; }
  }
  const chemin = () => `${RACINE} › ${DOSSIER} › ${FICHIER}`;

  function ouvrir(info) {
    if (config()) ecranConnecte(typeof info === "string" ? info : ""); else ecranConfiguration(typeof info === "string" ? info : "");
  }

  function ecranConfiguration(info) {
    const anc = lire(CLE_CONFIG) || {};
    const champ = (type, valeur, place, nom) => h("input", { type, value: valeur || "", placeholder: place, autocapitalize: "off", autocorrect: "off", spellcheck: "false", autocomplete: "off", "aria-label": nom });
    const perso = !!(anc.clientId && anc.clientId !== CLIENT_ID);
    const id = champ("text", perso ? anc.clientId : "", CLIENT_ID.slice(0, 16) + "…", "ID client");
    const secret = champ("password", anc.secret || "", "GOCSPX-…", "Code secret du client");
    const m = msg();
    if (info) dire(m, info, !/✓/.test(info));
    const btn = h("button", { class: "sgd-principal", onclick: () => occupe(btn, "Ouverture de Google…", async () => {
      const cId = id.value.trim() || CLIENT_ID;
      const cS = cId === CLIENT_ID && SECRET ? SECRET : secret.value.trim().replace(/^"|"$/g, "");
      if (!/\.apps\.googleusercontent\.com$/.test(cId)) return dire(m, "L'ID client se termine par « .apps.googleusercontent.com ».", true);
      if (!cS) return dire(m, "Colle le code secret du client (il commence par GOCSPX-).", true);
      try { await connecter(cId, cS); } catch (e) { dire(m, e.message, true); }
    }) }, "Se connecter à Google");
    afficher(
      h("h3", {}, "☁️ Sauvegarde Google Drive"),
      h("p", {}, `Chaque jour, ${NOM} enregistre une copie de ses données dans ton Google Drive (${chemin()}), en remplaçant celle de la veille. Tes données restent aussi sur cet appareil.`),
      SECRET ? null : [h("label", {}, "Code secret du client"), secret],
      m, btn,
      h("p", { class: "sgd-note" }, "Choisis ton compte Google puis touche « Continuer ». Tu reviens ensuite ici et la première sauvegarde part tout de suite."),
      h("details", { class: "sgd-note", open: perso || null },
        h("summary", {}, "Utiliser un autre identifiant Google"),
        h("label", {}, "ID client"), id,
        SECRET ? [h("label", {}, "Code secret du client"), secret] : null,
        h("p", { class: "sgd-note" }, "Adresse de retour à autoriser pour cette app :"),
        h("code", {}, retour())),
      h("button", { onclick: fermer }, "Fermer"),
    );
  }

  function ecranConnecte(info) {
    const c = config();
    const statut = h("div", { class: "sgd-statut attente" }, h("span", { class: "sgd-pastille" }), h("div", {}, h("b", {}, "Vérification sur Google Drive…"), h("small", {}, c.compte || "")));
    const m = msg();
    if (info) dire(m, info, !/✓/.test(info));
    const ouvrirDrive = h("a", { class: "sgd-bouton", href: "https://drive.google.com/drive/my-drive", target: "_blank", rel: "noopener" }, "Ouvrir le dossier dans Google Drive");

    const envoi = h("button", { class: "sgd-principal", onclick: () => occupe(envoi, "Envoi…", async () => {
      try { await envoyer(); dire(m, "Sauvegarde envoyée ✓"); }
      catch (err) {
        if (err.code !== 409 && err.code !== 410) { dire(m, err.message, true); return rafraichir(); }
        if (!confirm(`La sauvegarde ${NOM} de Google Drive vient d'un autre appareil (ou de Safari au lieu de l'app).\n\nLa remplacer par les données de cet appareil ?\n(Google Drive garde ses anciennes versions quelque temps.)`)) return rafraichir();
        try { await envoyer({ forcer: true }); dire(m, "Sauvegarde envoyée ✓"); } catch (e2) { dire(m, e2.message, true); }
      }
      rafraichir();
    }) }, "Sauvegarder maintenant");
    const resto = h("button", { onclick: () => occupe(resto, "Lecture…", async () => {
      try { if (await restaurer()) { dire(m, "Restauré ✓ Rechargement…"); setTimeout(() => location.reload(), 600); } }
      catch (err) { dire(m, err.message, true); }
    }) }, "Restaurer depuis Google Drive");
    const ancienne = lire(`${CLE}.avant-restauration`);

    async function rafraichir() {
      const e = etat();
      if (e.erreur) {
        statut.className = "sgd-statut alerte";
        statut.replaceChildren(h("span", { class: "sgd-pastille" }), h("div", {}, h("b", {}, e.erreur), h("small", {}, "Touche « Se reconnecter » en bas.")));
        return;
      }
      try {
        const dossierId = await dossierApp();
        ouvrirDrive.href = `https://drive.google.com/drive/folders/${dossierId}`;
        const f = await trouverFichier(dossierId);
        const ap = (f && f.appProperties) || {};
        let classe = "", titre, detail;
        if (!f) { classe = "attente"; titre = "Pas encore de sauvegarde"; detail = "Touche « Sauvegarder maintenant » pour la première."; }
        else if (ap.installation !== installation()) {
          classe = "alerte"; titre = "Sauvegarde automatique en pause";
          detail = `Le fichier de Google Drive (${quand(f.modifiedTime)}${ap.nb ? ", " + resumeN(Number(ap.nb)) : ""}) vient d'un autre appareil ou de Safari. Pour ne rien écraser, choisis : « Restaurer » pour le récupérer ici, ou « Sauvegarder maintenant » pour le remplacer par celui-ci.`;
          majEtat({ pause: "conflit" });
        } else if (e.pause === "baisse") {
          classe = "alerte"; titre = "Sauvegarde automatique en pause";
          detail = `La sauvegarde contient bien plus de données (${resumeN(Number(ap.nb))}) que cet appareil (${resumeN(compteLocal())}). Pour ne rien perdre : « Restaurer » pour la récupérer, ou « Sauvegarder maintenant » si c'est voulu.`;
        } else {
          titre = e.jour === jourLocal() ? "Sauvegarde du jour faite" : "Sauvegarde à jour";
          detail = `Dernier envoi ${quand(f.modifiedTime)} · ${chemin()}`;
        }
        statut.className = "sgd-statut " + classe;
        statut.replaceChildren(h("span", { class: "sgd-pastille" }), h("div", {}, h("b", {}, titre), h("small", {}, detail)));
      } catch (err) {
        statut.className = "sgd-statut alerte";
        statut.replaceChildren(h("span", { class: "sgd-pastille" }), h("div", {}, h("b", {}, err.message), h("small", {}, c.compte || "")));
      }
    }

    afficher(
      h("h3", {}, "☁️ Sauvegarde Google Drive"),
      h("p", {}, `Chaque jour, à la première ouverture de ${NOM}, une copie remplace celle de la veille dans ${chemin()}.`),
      statut, m, envoi, resto, ouvrirDrive,
      ancienne ? h("button", { onclick: () => {
        if (!confirm(`Revenir aux données d'avant la dernière restauration (${quand(ancienne.date)}) ?`)) return;
        const actuel = brut();
        try { localStorage.setItem(CLE, ancienne.brut); } catch (err) { return dire(m, "Impossible d'écrire sur cet appareil", true); }
        if (actuel !== null) ecrire(`${CLE}.avant-restauration`, { date: new Date().toISOString(), brut: actuel });
        majEtat({ pause: "conflit" });
        location.reload();
      } }, "Annuler la dernière restauration") : null,
      h("button", { onclick: fermer }, "Fermer"),
      h("button", { class: "sgd-danger", onclick: () => {
        if (!confirm("Déconnecter Google Drive de cet appareil ? Tes données restent ici et sur Google Drive.")) return;
        const anc = config();
        ecrire(CLE_CONFIG, { clientId: anc.clientId, secret: anc.secret });
        acces = null;
        majEtat({ erreur: null });
        ecranConfiguration();
      } }, etat().erreur ? "Se reconnecter" : "Déconnecter ou changer de compte"),
      h("p", { class: "sgd-note" }, `Bon à savoir : sur iPhone, Safari et chaque app de l'écran d'accueil ont leurs propres données. Connecte Google Drive depuis l'app de l'écran d'accueil.`),
    );
    rafraichir();
  }

  function bandeau(texte, duree, action) {
    if (racine) return;
    preparer();
    const b = h("button", { class: "sgd-bandeau", onclick: () => { b.remove(); if (action) action(); } }, texte);
    document.body.append(b);
    setTimeout(() => b.remove(), duree);
  }
  function avertirUneFois(err) {
    if (averti) return;
    averti = true;
    bandeau(err.code === 409 || err.code === 410 ? "☁️ Sauvegarde Google Drive en pause · Voir" : `☁️ Google Drive : ${err.message}`, 7000, ouvrir);
  }

  window.Drive = { ouvrir, envoyer, restaurer };
})();
