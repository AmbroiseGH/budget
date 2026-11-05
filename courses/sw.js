// Garde l'app disponible hors ligne. Changer VERSION à chaque mise à jour des fichiers.
const VERSION = "courses-v5";
const FICHIERS = ["./", "index.html", "style.css", "app.js", "sauvegarde.js", "manifest.webmanifest",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
  "fonts/jakarta-500.woff2", "fonts/jakarta-600.woff2", "fonts/jakarta-700.woff2", "fonts/jakarta-800.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith("courses-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Ne touche pas aux autres sites (ex. api.github.com pour la sauvegarde) : le navigateur s'en charge.
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    // no-cache : on revérifie toujours auprès du serveur, pour recevoir les mises à jour tout de suite.
    fetch(e.request.url, { cache: "no-cache" })
      .then((rep) => {
        const copie = rep.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copie));
        return rep;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
