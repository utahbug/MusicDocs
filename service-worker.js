const CACHE_NAME = "musicdocs-shell-v88";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=musicdocs-55",
  "./lyrics-cards.js?v=musicdocs-2",
  "./script.js?v=musicdocs-57",
  "./library.json",
  "./manifest.json",
  "./favicon.ico",
  "./assets/icon.svg",
  "./assets/musicdocs-social-card.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/AtkinsonHyperlegible-Regular.woff2",
  "./assets/AtkinsonHyperlegible-Italic.woff2",
  "./assets/AtkinsonHyperlegible-Bold.woff2",
  "./assets/AtkinsonHyperlegible-BoldItalic.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.endsWith("/library.json")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // PDFs are intentionally not pre-cached in this first version. For reliable
  // offline PDFs, add chosen private PDF paths to a cache list or provide an
  // in-app download step that stores them after the user confirms local use.
  if (url.pathname.includes("/music/")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })
    .catch(() => caches.match(request));
}
