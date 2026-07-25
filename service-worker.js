const CACHE_NAME = "primary-music-helper-shell-v194";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=primary-2026-31",
  "./script.js?v=primary-2026-31",
  "./library.json",
  "./manifest.json",
  "./favicon.ico",
  "./assets/icon.svg",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./music/Primary-2026/called-to-serve-lyrics-249.pdf",
  "./music/Primary-2026/called-to-serve-hymnbook-174.pdf",
  "./music/Primary-2026/called-to-serve-249.pdf",
  "./music/Primary-2026/choose-to-serve-the-lord-lyrics.pdf",
  "./music/Primary-2026/choose-to-serve-the-lord.pdf",
  "./music/Primary-2026/i-feel-my-saviors-love-74.pdf",
  "./music/Primary-2026/i-feel-my-savior-s-love-lyrics-74.pdf",
  "./music/Primary-2026/i-will-follow-god-s-plan-lyrics-165.pdf",
  "./music/Primary-2026/i-will-follow-gods-plan-for-me-165.pdf",
  "./music/Primary-2026/i-will-walk-with-jesus-1004-lyrics.pdf",
  "./music/Primary-2026/i-will-walk-with-jesus-1004.pdf",
  "./music/Primary-2026/search-ponder-and-pray-lyrics-109.pdf",
  "./music/Primary-2026/search-ponder-and-pray-109.pdf",
  "./music/Primary-2026/the-wise-man-and-the-foolish-man-281.pdf",
  "./music/Primary-2026/the-wise-man-and-the-foolish-man-lyrics-281.pdf",
  "./music/Primary-2026/this-little-light-of-mine-lyrics-1028.pdf",
  "./music/Primary-2026/this-little-light-of-mine-1028.pdf"
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
