const CACHE_NAME = "primary-music-helper-shell-v91";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=pdf-pinch-1",
  "./script.js?v=pdf-pinch-1",
  "./library.json",
  "./manifest.json",
  "./assets/icon.svg"
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
