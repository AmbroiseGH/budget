// Garde Apps disponible hors ligne. Changer VERSION à chaque mise à jour des fichiers.
// Ce service worker ne s'occupe que des pages d'Apps (/budget/apps/) ; chaque appli a le sien.
const VERSION = "apps-v3";
const FICHIERS = ["./", "index.html", "style.css", "applis.js", "sauvegarde.js", "app.js", "pont.js", "manifest.webmanifest",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
  "../maxilla/contenu.js",
  "../icons/icon-180.png", "../courses/icons/icon-180.png", "../habitudes/icons/icon-180.png", "../todo/icons/icon-180.png",
  "../journal/icons/icon-180.png", "../maxilla/icons/icon-180.png", "../salle/icons/icon-180.png",
  "../fonts/jakarta-500.woff2", "../fonts/jakarta-600.woff2", "../fonts/jakarta-700.woff2", "../fonts/jakarta-800.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith("apps-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Ne touche pas aux autres sites (connexion et envoi vers Google) : le navigateur s'en charge.
  if (url.origin !== location.origin) return;
  e.respondWith(
    // no-cache : on revérifie toujours auprès du serveur, pour recevoir les mises à jour tout de suite.
    fetch(e.request.url, { cache: "no-cache" })
      .then((rep) => {
        // Retour de connexion Google (?code=…) : inutile de garder cette adresse en cache.
        if (rep.ok && !url.search) {
          const copie = rep.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copie));
        }
        return rep;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
