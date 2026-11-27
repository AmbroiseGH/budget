/* =========================================================
   Une seule sauvegarde Google Drive pour toutes les applis d'Apps.

   Fichier : applications/apps/apps.json (remplacé à chaque envoi ; Google Drive
   garde quand même ses anciennes versions quelque temps). Il contient les données
   de chaque appli, sous leur clé habituelle (budget.v1, journal.v1…).

   Envoi automatique quand Apps s'ouvre ou revient au premier plan, si quelque chose
   a changé depuis le dernier envoi (au plus toutes les 5 minutes).

   Connexion : même projet Google que drive.js (les anciennes sauvegardes de chaque
   appli restent donc lisibles). Google renvoie à l'adresse de Budget, déjà autorisée
   dans la console Google Cloud ; index.html de Budget fait suivre vers Apps.

   Règles de sécurité (les mêmes que drive.js, appli par appli) :
   - les données de l'appareil ne sont jamais remplacées sans confirmation ;
   - l'envoi automatique ne remplace jamais une sauvegarde écrite par un autre appareil
     (ou par Safari au lieu de l'app) : il se met en pause et demande quoi faire ;
   - ni une sauvegarde où une appli a nettement plus de données que sur l'appareil ;
   - ni rien du tout si les données d'une appli sont illisibles ;
   - avant une restauration, les données actuelles de chaque appli sont gardées dans
     « <clé>.avant-restauration » (comme drive.js : Journal y reprend son coffre secret).
   ========================================================= */
(function () {
  "use strict";
  const RACINE = "applications", DOSSIER = "apps", FICHIER = "apps.json";
  const CLE_CONFIG = "apps.drive";          // { refresh, compte }
  const CLE_ETAT = "apps.drive.etat";       // { fichierId, date, empreinte, pause, erreur }
  const CLE_INSTALL = "drive.installation"; // identifiant de cette installation (le même que drive.js)
  const CLE_OAUTH = "apps.oauth";           // connexion en cours (le temps de l'aller-retour chez Google)
  const PORTEE = "https://www.googleapis.com/auth/drive.file";
  // Projet Google Cloud « Mes applications », le même que drive.js.
  const CLIENT_ID = "418112090148-dab0qaeu0osm79io7s785mpuq9a04cip.apps.googleusercontent.com";
  const SECRET = "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";
  // Adresse de retour déjà autorisée chez Google : celle de Budget (la racine du site).
  const RETOUR = new URL("../", location.href).href;
  const INTERVALLE = 5 * 60 * 1000;         // au plus un envoi automatique toutes les 5 minutes
  const PAUSE_ESSAI = 10 * 60 * 1000;       // après un échec, on réessaie au plus toutes les 10 minutes

  /* ---------- Stockage local ---------- */
  const lire = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const effacer = (k) => { try { localStorage.removeItem(k); } catch (e) {} };
  const config = () => { const c = lire(CLE_CONFIG); return c && c.refresh ? c : null; };
  const etat = () => lire(CLE_ETAT) || {};
  const majEtat = (m) => ecrire(CLE_ETAT, Object.assign(etat(), m));
  function installation() {
    let id = lire(CLE_INSTALL);
    if (!id) { id = hasard(12); ecrire(CLE_INSTALL, id); }
    return id;
  }
  const hasard = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (o) => o.toString(16).padStart(2, "0")).join("");
  const b64url = (octets) => btoa(String.fromCharCode(...new Uint8Array(octets))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const autonome = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const lieu = () => (autonome() ? "l'app Apps sur l'écran d'accueil" : "le navigateur");
  // Empreinte rapide (FNV-1a) pour savoir si quelque chose a changé depuis le dernier envoi.
  function empreinte(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36) + "-" + s.length;
  }

  class ErreurD extends Error { constructor(code, msg) { super(msg); this.code = code; } }

  /* ---------- Ce qui part dans la sauvegarde ---------- */
  function collecter() {
    const donnees = {}, nb = {}, illisibles = [];
    let total = 0;
    for (const a of APPLIS) {
      const l = lireAppli(a);
      if (l.brut === null) continue;
      if (!l.valide) { illisibles.push(a.nom); continue; }
      donnees[a.cle] = l.donnees;
      nb[a.id] = l.n;
      total += l.n;
    }
    const reglages = lire("apps.v1");
    if (reglages && typeof reglages.prenom === "string" && reglages.prenom) donnees["apps.v1"] = { prenom: reglages.prenom };
    const texte = JSON.stringify(donnees);
    return { donnees, nb, total, illisibles, vide: !Object.keys(nb).length, empreinte: empreinte(texte) };
  }

  /* ---------- Connexion Google (OAuth code + PKCE, par redirection) ---------- */
  async function connecter() {
    const verificateur = hasard(48);
    const defi = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificateur)));
    const etatOAuth = hasard(16);
    if (!ecrire(CLE_OAUTH, { etat: etatOAuth, verificateur, retour: RETOUR, date: Date.now() }))
      throw new ErreurD(-4, "Impossible d'écrire sur cet appareil");
    const p = new URLSearchParams({
      client_id: CLIENT_ID, redirect_uri: RETOUR, response_type: "code", scope: PORTEE,
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
    if (j.error === "invalid_client" || j.error === "unauthorized_client") throw new ErreurD(401, "Google refuse l'identifiant de l'appli");
    throw new ErreurD(rep.status, `Erreur Google (${j.error_description || j.error || rep.status})`);
  }

  let acces = null; // { jeton, fin } : jeton d'accès d'une heure, gardé en mémoire seulement
  let enCours = null, dernierEchec = 0;

  // Retour de Google : Budget a fait suivre ?code=…&state=… jusqu'ici.
  let retourOAuth = null;
  (function lireRetour() {
    const q = new URLSearchParams(location.search);
    if (!q.has("state") || !(q.has("code") || q.has("error"))) return;
    const attendu = lire(CLE_OAUTH);
    history.replaceState(history.state, "", location.pathname + location.hash); // le code ne sert qu'une fois
    if (!attendu || attendu.etat !== q.get("state")) {
      retourOAuth = Promise.resolve({ info: "La connexion n'a pas abouti (réponse de Google non reconnue). Réessaie.", erreur: true });
      return;
    }
    effacer(CLE_OAUTH);
    if (q.has("error")) {
      retourOAuth = Promise.resolve({ info: q.get("error") === "access_denied" ? "Connexion annulée." : `Google a refusé la connexion (${q.get("error")}).`, erreur: true });
      return;
    }
    retourOAuth = (async () => {
      const r = await demanderJeton({
        code: q.get("code"), client_id: CLIENT_ID, client_secret: SECRET,
        redirect_uri: attendu.retour, grant_type: "authorization_code", code_verifier: attendu.verificateur,
      });
      if (!r.refresh_token) throw new ErreurD(-5, "Google n'a pas donné d'accès durable. Réessaie de te connecter.");
      acces = { jeton: r.access_token, fin: Date.now() + (r.expires_in || 3600) * 1000 };
      ecrire(CLE_CONFIG, { refresh: r.refresh_token, compte: null });
      majEtat({ erreur: null, pause: null, empreinte: null });
      try {
        const a = await api("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)");
        const c = config(); c.compte = (a.user && a.user.emailAddress) || null; ecrire(CLE_CONFIG, c);
      } catch (e) {}
      try {
        const res = await envoyer({ auto: true });
        if (res === "envoye") return { info: "Connecté. Première sauvegarde envoyée ✓" };
      } catch (e) {
        if (e.code === 409) return { info: "Connecté. Une sauvegarde existe déjà sur Google Drive : choisis quoi faire ci-dessous." };
      }
      return { info: "Connecté à Google Drive ✓" };
    })().catch((e) => ({ info: e.message, erreur: true }));
  })();

  async function jeton(renouveler) {
    if (!renouveler && acces && acces.fin > Date.now() + 60000) return acces.jeton;
    const c = config();
    if (!c) throw new ErreurD(-1, "Google Drive n'est pas connecté");
    try {
      const r = await demanderJeton({ client_id: CLIENT_ID, client_secret: SECRET, refresh_token: c.refresh, grant_type: "refresh_token" });
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
      throw new ErreurD(403, "Google Drive refuse l'accès");
    }
    throw new ErreurD(rep.status, `Erreur Google Drive (${rep.status})`);
  }

  /* ---------- Dossiers et fichiers sur Drive ---------- */
  const DRIVE = "https://www.googleapis.com/drive/v3/files";
  const ENVOI = "https://www.googleapis.com/upload/drive/v3/files";
  const DOSSIER_TYPE = "application/vnd.google-apps.folder";
  const echapper = (s) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  // Dossiers : le plus ancien d'abord (comme drive.js) ; fichiers : le plus récent d'abord.
  async function chercher(q, champs, taille = 10, ordre = "createdTime") {
    const p = new URLSearchParams({ q, fields: `files(${champs})`, orderBy: ordre, spaces: "drive", pageSize: String(taille) });
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
  async function dossierApps() {
    return dossier(DOSSIER, await dossier(RACINE, "root"));
  }
  async function trouverFichier(dossierId) {
    const [f] = await chercher(`name='${FICHIER}' and '${dossierId}' in parents and trashed=false`, "id,modifiedTime,appProperties");
    return f || null;
  }
  async function lireFichier(id) {
    const texte = await api(`${DRIVE}/${id}?alt=media`, { texte: true });
    try { return JSON.parse(texte); } catch (e) { return null; }
  }

  /* ---------- Envoi ---------- */
  // auto : envoi silencieux. Ne remplace jamais une sauvegarde inconnue ou plus fournie.
  // forcer : l'utilisateur a confirmé qu'il veut remplacer la sauvegarde de Google Drive.
  function envoyer({ auto = false, forcer = false } = {}) {
    if (enCours) return enCours.then(() => envoyer({ auto, forcer }), () => envoyer({ auto, forcer }));
    enCours = (async () => {
      if (!config()) throw new ErreurD(-1, "Google Drive n'est pas connecté");
      const c = collecter();
      if (c.illisibles.length) throw new ErreurD(-3, `Données illisibles dans ${c.illisibles.join(", ")} : rien n'est envoyé`);
      if (c.vide) throw new ErreurD(-2, "Rien à sauvegarder pour l'instant");
      const e = etat();
      if (auto && e.pause) return "pause";
      if (auto && e.empreinte === c.empreinte) return "inchange";

      const dossierId = await dossierApps();
      const f = await trouverFichier(dossierId);
      const moi = installation();
      if (f && !forcer) {
        const ap = f.appProperties || {};
        if (ap.installation !== moi) throw new ErreurD(409, "La sauvegarde Google Drive vient d'un autre appareil");
        if (auto) {
          for (const a of APPLIS) {
            const distant = Number(ap["n_" + a.id]), local = c.nb[a.id] || 0;
            if (distant >= 5 && local < distant / 2) throw new ErreurD(410, `Moins de données ici que dans la sauvegarde (${a.nom})`);
          }
        }
      }

      const date = new Date().toISOString();
      const paquet = { app: "apps", version: 1, date, depuis: lieu(), applis: c.nb, donnees: c.donnees };
      const proprietes = { installation: moi, app: "apps", nb: String(c.total) };
      for (const a of APPLIS) proprietes["n_" + a.id] = String(c.nb[a.id] || 0);
      const meta = { appProperties: proprietes };
      if (!f) Object.assign(meta, { name: FICHIER, parents: [dossierId], mimeType: "application/json" });
      const limite = "sauvegarde" + hasard(8);
      const corps = `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
        `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(paquet)}\n\r\n--${limite}--`;
      const r = await api(f ? `${ENVOI}/${f.id}?uploadType=multipart&fields=id` : `${ENVOI}?uploadType=multipart&fields=id`, {
        method: f ? "PATCH" : "POST",
        headers: { "Content-Type": `multipart/related; boundary=${limite}` },
        body: corps,
      });
      majEtat({ fichierId: r.id, date, empreinte: c.empreinte, pause: null, erreur: null });
      return "envoye";
    })();
    const p = enCours;
    p.catch((err) => {
      if (err.code === 409 || err.code === 410) majEtat({ pause: err.code === 409 ? "conflit" : "baisse", raison: err.message });
      if (auto) dernierEchec = Date.now();
    }).finally(() => { if (enCours === p) enCours = null; });
    return p;
  }

  // À l'ouverture d'Apps, au retour au premier plan, au retour du réseau.
  function auBesoin() {
    if (!config() || retourOAuth || !navigator.onLine) return Promise.resolve(null);
    const e = etat();
    if (e.pause || Date.now() - dernierEchec < PAUSE_ESSAI) return Promise.resolve(null);
    if (e.date && Date.now() - new Date(e.date) < INTERVALLE) return Promise.resolve(null);
    return envoyer({ auto: true }).catch(() => null);
  }

  /* ---------- Sauvegardes présentes sur Drive ---------- */
  // La sauvegarde commune d'Apps, plus celles des anciennes applis (drive.js), si elles existent.
  async function chercherSauvegardes() {
    const noms = [FICHIER, ...APPLIS.filter((a) => a.ancienne).map((a) => a.ancienne.fichier)];
    const fichiers = await chercher(`(${noms.map((n) => `name='${n}'`).join(" or ")}) and trashed=false`, "id,name,modifiedTime,appProperties", 50, "modifiedTime desc");
    const vus = new Set(), liste = [];
    for (const f of fichiers) { // du plus récent au plus ancien : on garde le plus récent de chaque nom
      if (vus.has(f.name)) continue;
      vus.add(f.name);
      const ap = f.appProperties || {};
      if (f.name === FICHIER) liste.unshift({ type: "apps", id: f.id, date: f.modifiedTime, nb: Number(ap.nb) || null, moi: ap.installation === installation() });
      else {
        const a = APPLIS.find((x) => x.ancienne && x.ancienne.fichier === f.name);
        if (a) liste.push({ type: "ancienne", app: a.id, id: f.id, date: f.modifiedTime, nb: ap.nb === "" || ap.nb == null ? null : Number(ap.nb) });
      }
    }
    return liste;
  }

  /* ---------- Restauration ---------- */
  // Garde les données actuelles d'une appli avant de les remplacer (même format que drive.js).
  function garderAvant(cle, date) {
    let brut = null;
    try { brut = localStorage.getItem(cle); } catch (e) {}
    if (brut === null) return true;
    return ecrire(`${cle}.avant-restauration`, { date, brut });
  }
  function ecrireDonnees(cle, donnees) {
    try { localStorage.setItem(cle, JSON.stringify(donnees)); return true; } catch (e) { return false; }
  }

  // La sauvegarde commune : toutes les applis d'un coup (celles qui n'y sont pas restent intactes).
  async function restaurerApps(id, demander) {
    const p = await lireFichier(id);
    if (!p || p.app !== "apps" || !p.donnees || typeof p.donnees !== "object") throw new ErreurD(-3, "Ce fichier n'est pas une sauvegarde Apps valable");
    const applis = APPLIS.filter((a) => a.valide(p.donnees[a.cle]));
    if (!applis.length) throw new ErreurD(-3, "Cette sauvegarde ne contient aucune donnée");
    const lignes = applis.map((a) => {
      const ici = lireAppli(a);
      return `${a.nom} : ${resumeDe(a, p.donnees[a.cle])} (ici : ${ici.brut === null ? "rien" : ici.resume || "rien"})`;
    });
    const ok = await demander(
      `Remplacer les données de ces applis sur cet appareil par la sauvegarde Google Drive du ${quand(p.date)} ?\n\n` +
      lignes.join("\n") + "\n\nUne copie des données actuelles est gardée sur cet appareil.");
    if (!ok) return false;
    const date = new Date().toISOString(), echecs = [];
    for (const a of applis) {
      if (!garderAvant(a.cle, date)) { echecs.push(a.nom); continue; }
      if (!ecrireDonnees(a.cle, p.donnees[a.cle])) echecs.push(a.nom);
    }
    const reglages = p.donnees["apps.v1"];
    if (reglages && typeof reglages.prenom === "string") {
      const r = lire("apps.v1") || {};
      if (!r.prenom) { r.prenom = reglages.prenom; ecrire("apps.v1", r); }
    }
    if (echecs.length) throw new ErreurD(-4, `Restauration incomplète : impossible d'écrire ${echecs.join(", ")} (mémoire pleine ?)`);
    majEtat({ pause: null, raison: null, erreur: null, empreinte: null });
    // Cet appareil a maintenant les mêmes données que la sauvegarde : il la reprend à son compte.
    try { await envoyer({ forcer: true }); } catch (e) {}
    return true;
  }

  // L'ancienne sauvegarde d'une seule appli (applications/<dossier>/<appli>.json, écrite par drive.js).
  async function restaurerAncienne(id, app, demander) {
    const a = APPLI[app];
    const p = await lireFichier(id);
    if (!p || p.app !== a.id || !a.valide(p.donnees)) throw new ErreurD(-3, `Ce fichier n'est pas une sauvegarde ${a.nom} valable`);
    const ici = lireAppli(a);
    const ok = await demander(
      `Remplacer les données de ${a.nom} dans Apps par son ancienne sauvegarde Google Drive ?\n\n` +
      `Sauvegarde : ${quand(p.date)} · ${resumeDe(a, p.donnees)}\n` +
      `Dans Apps : ${ici.brut === null ? "rien" : ici.resume || "rien"}\n\n` +
      "Une copie des données actuelles est gardée sur cet appareil.");
    if (!ok) return false;
    if (!garderAvant(a.cle, new Date().toISOString())) throw new ErreurD(-4, "Impossible de garder une copie des données actuelles : rien n'est changé");
    if (!ecrireDonnees(a.cle, p.donnees)) throw new ErreurD(-4, "Impossible d'écrire sur cet appareil");
    return true;
  }

  function deconnecter() {
    effacer(CLE_CONFIG);
    acces = null;
    majEtat({ pause: null, raison: null, erreur: null, empreinte: null });
  }

  function quand(iso) {
    if (!iso) return "";
    const d = new Date(iso), s = (Date.now() - d) / 1000;
    if (s < 60) return "à l'instant";
    if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
    const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const jour = (x) => x.toDateString();
    if (jour(new Date()) === jour(d)) return `aujourd'hui à ${h}`;
    const hier = new Date(); hier.setDate(hier.getDate() - 1);
    if (jour(hier) === jour(d)) return `hier à ${h}`;
    return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} à ${h}`;
  }

  window.AppsDrive = {
    connecte: () => !!config(),
    compte: () => (config() || {}).compte || null,
    etat, collecter, connecter, envoyer, auBesoin, chercherSauvegardes, restaurerApps, restaurerAncienne, deconnecter, quand,
    retour: () => retourOAuth,
    finRetour: () => { retourOAuth = null; },
  };
})();
