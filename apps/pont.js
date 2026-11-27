/* =========================================================
   Le pont entre une appli et Apps. Inclus en bas de chaque appli, après ses scripts :
   <script src="../apps/pont.js" data-app="journal" data-nom="Journal" data-cle="journal.v1"></script>

   - Dans Apps (le stockage contient « apps.v1 ») : un bouton « ‹ Apps » en haut de la page
     et un glissé depuis le bord gauche pour revenir à l'accueil. Une seule sauvegarde, celle
     d'Apps : elle part aussi d'ici (à chaque ouverture ou retour dans Apps, quelle que soit
     l'appli affichée), et les boutons de sauvegarde de l'appli mènent à celle d'Apps.
   - Dans une ancienne appli de l'écran d'accueil (sans « apps.v1 ») : un bandeau propose de
     copier ses données pour les coller dans Apps. Rien n'est jamais effacé ici.
   Ne touche à aucune donnée de l'appli : il ne fait que les lire (pour le transfert).
   ========================================================= */
(function () {
  "use strict";
  const script = document.currentScript;
  if (!script || !script.dataset.app) return;
  const APP = script.dataset.app;
  const NOM = script.dataset.nom || APP;
  const CLE = script.dataset.cle;
  const ACCUEIL = new URL(".", script.src).href; // le dossier de pont.js : Apps
  const SEUIL = 76;                              // glissé depuis le bord : distance pour revenir

  const lire = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lireJson = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const ecrireJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const deux = (n) => String(n).padStart(2, "0");
  const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`; };
  const autonome = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const LOGO = '<span class="apps-logo" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';

  function style(css) {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.append(s);
  }
  const STYLE_LOGO = `
.apps-logo{display:inline-grid;grid-template-columns:1fr 1fr;gap:1.4px;width:13px;height:13px;flex:none}
.apps-logo i{border-radius:2px}
.apps-logo i:nth-child(1){background:#f7b9c4}.apps-logo i:nth-child(2){background:#b0c9f5}
.apps-logo i:nth-child(3){background:#f9dc94}.apps-logo i:nth-child(4){background:#aee0c8}`;

  /* =========================================================
     Dans Apps
     ========================================================= */
  function dansApps() {
    noterVisite();
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") noterVisite(); });

    // Une seule sauvegarde : celle d'Apps (la roue de l'accueil). Les boutons de sauvegarde
    // de l'appli (Google Drive, et GitHub dans Maxilla) y mènent.
    const versSauvegarde = () => location.assign(ACCUEIL + "#sauvegarde");
    if (window.Drive) window.Drive.ouvrir = versSauvegarde;
    if (window.Sauvegarde) window.Sauvegarde.ouvrir = versSauvegarde;
    sauvegardeCommune();

    style(STYLE_LOGO + `
.apps-barre{position:relative;z-index:5;padding:8px 12px 2px}
.apps-retour{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 13px 0 7px;border-radius:999px;
  font:600 14px/1 "Jakarta",-apple-system,system-ui,sans-serif;letter-spacing:-.01em;color:inherit;text-decoration:none;
  background:color-mix(in srgb,currentColor 8%,transparent);-webkit-tap-highlight-color:transparent;
  transition:transform .15s ease;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
.apps-retour:active{transform:scale(.94)}
body.sur-jour .apps-retour{color:#fff;background:rgba(255,255,255,.16);text-shadow:0 1px 10px rgba(0,0,0,.2)}
.apps-retour svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round;margin-right:-3px}
.apps-geste{position:fixed;left:0;z-index:2147483000;width:46px;height:46px;margin:-23px 0 0 -46px;border-radius:50%;
  display:grid;place-items:center;background:rgba(22,22,29,.86);color:#fff;pointer-events:none;
  box-shadow:0 8px 24px -8px rgba(0,0,0,.45);transition:background .15s ease,box-shadow .15s ease,scale .2s cubic-bezier(.2,.8,.2,1);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.apps-geste .apps-logo{width:16px;height:16px;gap:2px;transition:scale .2s cubic-bezier(.2,.8,.2,1)}
.apps-geste.pret{scale:1.14;background:#16161d;box-shadow:0 0 0 3px rgba(255,255,255,.8),0 0 0 4px rgba(0,0,0,.1),0 10px 26px -8px rgba(0,0,0,.5)}
.apps-geste.pret .apps-logo{scale:1.12}`);

    const barre = document.createElement("div");
    barre.className = "apps-barre";
    barre.innerHTML = `<a class="apps-retour" href="${ACCUEIL}" aria-label="Revenir à Apps">${CHEVRON}${LOGO}<span>Apps</span></a>`;
    document.body.prepend(barre);

    gesteRetour();
  }

  // La sauvegarde d'Apps part aussi d'une appli : à son ouverture, au retour au premier plan
  // et au retour du réseau. Rien ne part si rien n'a changé depuis le dernier envoi.
  function sauvegardeCommune() {
    const verifier = () => { if (window.AppsDrive) window.AppsDrive.auBesoin(); };
    const charger = (fichier, ensuite) => {
      const s = document.createElement("script");
      s.src = ACCUEIL + fichier;
      s.onload = ensuite;
      document.head.append(s);
    };
    charger("applis.js", () => charger("sauvegarde.js", () => setTimeout(verifier, 2000)));
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") setTimeout(verifier, 1500); });
    window.addEventListener("pageshow", (e) => { if (e.persisted) setTimeout(verifier, 1500); });
    window.addEventListener("online", () => setTimeout(verifier, 1500));
  }

  function noterVisite() {
    const r = lireJson("apps.v1");
    if (!r || typeof r !== "object") return;
    r.vu = r.vu && typeof r.vu === "object" ? r.vu : {};
    if (r.vu[APP] === aujourdhui()) return;
    r.vu[APP] = aujourdhui();
    ecrireJson("apps.v1", r);
  }

  // Glisser depuis le bord gauche de l'écran ramène à Apps (comme le retour d'iOS).
  // Les touchers qui commencent tout contre le bord sont réservés à ce geste.
  function gesteRetour() {
    const BORD = 18;
    let suivi = false, actif = false, x0 = 0, y0 = 0, dx = 0, rond = null;
    const finir = () => {
      suivi = false; actif = false;
      if (rond) { const r = rond; rond = null; r.style.transition = "transform .2s ease, opacity .2s ease"; r.style.opacity = "0"; r.style.transform = "translateX(0)"; setTimeout(() => r.remove(), 220); }
    };
    window.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch" && e.clientX <= BORD) e.stopPropagation(); }, true);
    window.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) { finir(); return; }
      const t = e.touches[0];
      if (t.clientX > BORD) return;
      suivi = true; actif = false; x0 = t.clientX; y0 = t.clientY; dx = 0;
      e.stopPropagation();
    }, { capture: true, passive: true });
    window.addEventListener("touchmove", (e) => {
      if (!suivi) return;
      const t = e.touches[0];
      dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (!actif) {
        if (Math.abs(dy) > 14 && Math.abs(dy) > dx) { suivi = false; return; } // on fait défiler la page
        if (dx < 12) return;
        actif = true;
        rond = document.createElement("div");
        rond.className = "apps-geste";
        rond.innerHTML = LOGO;
        rond.style.top = `${Math.min(innerHeight - 60, Math.max(60, y0))}px`;
        document.body.append(rond);
      }
      e.preventDefault();
      e.stopPropagation();
      const x = Math.min(dx, SEUIL + 30);
      rond.style.transform = `translateX(${Math.max(0, x * 0.9)}px)`;
      rond.classList.toggle("pret", dx >= SEUIL);
    }, { capture: true, passive: false });
    window.addEventListener("touchend", (e) => {
      if (!suivi) return;
      const partir = actif && dx >= SEUIL;
      if (actif) e.stopPropagation();
      if (partir) { suivi = false; actif = false; location.assign(ACCUEIL); }
      else finir();
    }, { capture: true });
    window.addEventListener("touchcancel", finir, { capture: true });
    window.addEventListener("pagehide", finir);
  }

  /* =========================================================
     Dans une ancienne appli : proposer le transfert vers Apps
     ========================================================= */
  const COMPTER = {
    budget: (d) => [(d.mouvements || []).length, "mouvement", "mouvements"],
    courses: (d) => [(d.articles || []).length + (d.recurrents || []).length, "article", "articles"],
    habitudes: (d) => [Object.keys(d.jours || {}).length, "jour", "jours"],
    todo: (d) => [(d.taches || []).length, "tâche", "tâches"],
    journal: (d) => [Object.keys(d.jours || {}).length + (d.secret ? 1 : 0), "journée", "journées"],
    maxilla: (d) => [Object.keys(d.jours || {}).length, "jour", "jours"],
    salle: (d) => [(d.seances || []).length + (d.modeles || []).length, "séance", "séances"],
  };

  function ancienneAppli() {
    if (!CLE) return;
    const brut = lire(CLE);
    if (brut === null) return;
    let d = null;
    try { d = JSON.parse(brut); } catch (e) { return; }
    if (!d || typeof d !== "object") return;
    const [n, un, plusieurs] = (COMPTER[APP] || (() => [1, "élément", "éléments"]))(d);
    if (!n) return;
    const p = lireJson("apps.pont") || {};
    if (p.masque && Date.now() < p.masque) return;
    const resume = `${n} ${n > 1 ? plusieurs : un}`;
    setTimeout(() => montrerBandeau(resume), 900);
  }

  function masquer(jours) {
    const p = lireJson("apps.pont") || {};
    p.masque = Date.now() + jours * 864e5;
    ecrireJson("apps.pont", p);
  }

  function styleTransfert() {
    style(STYLE_LOGO + `
.apps-bandeau,.apps-feuille{font:500 15px/1.4 "Jakarta",-apple-system,system-ui,sans-serif;letter-spacing:-.01em;-webkit-text-size-adjust:100%}
.apps-bandeau{position:fixed;z-index:2147483000;left:10px;right:10px;top:calc(env(safe-area-inset-top) + 8px);max-width:440px;margin:0 auto;
  display:grid;grid-template-columns:auto minmax(0,1fr) auto;column-gap:11px;row-gap:10px;align-items:start;
  padding:13px 6px 13px 14px;border-radius:22px;background:#16161d;color:#fff;
  box-shadow:0 14px 34px -12px rgba(0,0,0,.55);transform:translateY(-140%);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.apps-bandeau.visible{transform:none}
.apps-bandeau .apps-logo{grid-column:1;grid-row:1;width:24px;height:24px;gap:2.6px;margin-top:2px}.apps-bandeau .apps-logo i{border-radius:4px}
.apps-bandeau .t{grid-column:2;grid-row:1;display:flex;flex-direction:column;gap:1px}
.apps-bandeau b{font-size:14.5px;font-weight:700}.apps-bandeau small{font-size:13px;opacity:.8}
.apps-bandeau button{font:inherit;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.apps-bandeau .go{grid-column:2 / 4;grid-row:2;justify-self:start;height:36px;padding:0 16px;border-radius:999px;background:#fff;color:#16161d;font-size:14px;font-weight:700}
.apps-bandeau .x{grid-column:3;grid-row:1;width:34px;height:34px;margin-top:-6px;border-radius:50%;background:transparent;color:#fff;opacity:.6;font-size:22px;line-height:1}
.apps-voile{position:fixed;inset:0;z-index:2147483001;background:rgba(8,8,18,.4);display:flex;align-items:flex-end;justify-content:center}
.apps-feuille{width:100%;max-width:520px;max-height:calc(100dvh - 30px);overflow-y:auto;background:#fff;color:#15151c;
  border-radius:28px 28px 0 0;padding:26px 20px calc(env(safe-area-inset-bottom) + 22px);animation:apps-monte .32s cubic-bezier(.2,.8,.2,1)}
@keyframes apps-monte{from{transform:translateY(100%)}}
.apps-feuille .apps-logo{width:44px;height:44px;gap:4px;padding:0}.apps-feuille .apps-logo i{border-radius:6px}
.apps-feuille h2{margin:14px 0 6px;font-size:22px;font-weight:800;letter-spacing:-.025em}
.apps-feuille p{margin:0 0 14px;color:#5f5f69}
.apps-feuille ol{margin:0 0 18px;padding-left:20px}.apps-feuille li{margin:0 0 6px}
.apps-feuille b{color:#15151c}
.apps-feuille button{display:block;width:100%;min-height:48px;margin-top:10px;border:0;border-radius:999px;font:700 15.5px/1 "Jakarta",-apple-system,system-ui,sans-serif;cursor:pointer}
.apps-feuille .copier{background:#16161d;color:#fff}.apps-feuille .copier.ok{background:#1a9b5a}
.apps-feuille .fermer{background:#f1f1f5;color:#15151c}
.apps-feuille [hidden]{display:none!important}
.apps-feuille textarea{display:block;width:100%;height:90px;margin-top:10px;padding:10px;border:1.5px dashed #ccc;border-radius:12px;font:13px/1.3 ui-monospace,monospace;background:#f6f6f9;color:#333}
.apps-feuille .note{margin:14px 0 0;font-size:13px;color:#76767f}
@media (prefers-color-scheme:dark){
  .apps-feuille{background:#1b1b22;color:#f3f3f7}.apps-feuille p{color:#a6a6b0}.apps-feuille b{color:#f3f3f7}
  .apps-feuille .fermer{background:#2a2a33;color:#f3f3f7}.apps-feuille textarea{background:#24242c;color:#ddd;border-color:#444}
  .apps-feuille .note{color:#9c9ca8}}`);
  }

  function montrerBandeau(resume) {
    styleTransfert();
    const b = document.createElement("div");
    b.className = "apps-bandeau";
    b.setAttribute("role", "region");
    b.setAttribute("aria-label", "Transférer vers Apps");
    b.innerHTML = `${LOGO}<span class="t"><b>Tes applis sont dans Apps</b><small>Transfère-y les données de ${NOM}</small></span>` +
      `<button class="go" type="button">Transférer vers Apps</button><button class="x" type="button" aria-label="Plus tard">×</button>`;
    document.body.append(b);
    requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add("visible")));
    const retirer = () => { b.classList.remove("visible"); setTimeout(() => b.remove(), 450); };
    b.querySelector(".x").addEventListener("click", () => { masquer(3); retirer(); });
    b.querySelector(".go").addEventListener("click", () => ouvrirTransfert(resume, retirer));
  }

  function ouvrirTransfert(resume, retirerBandeau) {
    const voile = document.createElement("div");
    voile.className = "apps-voile";
    voile.innerHTML = `<div class="apps-feuille" role="dialog" aria-modal="true" aria-label="Transférer vers Apps">
      ${LOGO}
      <h2>Transférer vers Apps</h2>
      <p>Les données de ${NOM} (${resume}) vont être copiées, pour que tu les colles dans Apps. Elles restent aussi ici : rien n'est effacé.</p>
      <ol>
        <li>Touche <b>Copier mes données</b>.</li>
        <li>Ouvre <b>Apps</b> (pas encore installée ? Dans Safari : <b>ambroisegh.github.io/budget/apps</b>, puis Partager → Sur l'écran d'accueil).</li>
        <li>Dans Apps, touche la <b>roue</b> en haut à droite, puis <b>Coller les données copiées</b>.</li>
      </ol>
      <button class="copier" type="button">Copier mes données</button>
      <textarea readonly hidden aria-label="Données à copier"></textarea>
      <button class="fermer" type="button">Fermer</button>
      <p class="note">Une fois tout vérifié dans Apps, tu pourras supprimer l'icône de cette ancienne appli (supprimer une icône efface ses données : vérifie d'abord).</p>
    </div>`;
    document.body.append(voile);
    const fermer = () => voile.remove();
    voile.addEventListener("click", (e) => { if (e.target === voile) fermer(); });
    voile.querySelector(".fermer").addEventListener("click", fermer);
    const bouton = voile.querySelector(".copier");
    bouton.addEventListener("click", async () => {
      const brut = lire(CLE);
      if (brut === null) return;
      const code = `Transfert vers Apps (${NOM}). À coller dans Apps, roue des réglages.\n` +
        JSON.stringify({ type: "apps-transfert", v: 1, app: APP, nom: NOM, date: new Date().toISOString(), cles: { [CLE]: brut } });
      let ok = false;
      try { await navigator.clipboard.writeText(code); ok = true; } catch (e) {}
      if (!ok) {
        // Repli : le texte sélectionné, copié à l'ancienne (ou à la main).
        const ta = voile.querySelector("textarea");
        ta.hidden = false;
        ta.value = code;
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, code.length);
        try { ok = document.execCommand("copy"); } catch (e) {}
      }
      if (ok) {
        bouton.textContent = "Copié ✓ · ouvre Apps et colle";
        bouton.classList.add("ok");
        masquer(1);
        if (retirerBandeau) retirerBandeau();
      } else {
        bouton.textContent = "Copie le texte ci-dessous (appui long → Copier)";
      }
    });
  }

  /* ---------- C'est parti ---------- */
  if (lire("apps.v1") !== null) dansApps();
  else if (autonome) ancienneAppli();
})();
