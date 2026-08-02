const CACHE_NAME = "musicdocs-shell-v180";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=musicdocs-116",
  "./assets/pdf.min.js?v=3.11.174",
  "./assets/pdf.worker.min.js?v=3.11.174",
  "./lyrics-cards.js?v=musicdocs-2",
  "./script.js?v=musicdocs-115",
  "./library.json",
  "./manifest.json",
  "./favicon.ico",
  "./assets/icon.svg",
  "./assets/musicdocs-social-card.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/jazz-ensemble-puzzle.webp",
  "./assets/AtkinsonHyperlegible-Regular.woff2",
  "./assets/AtkinsonHyperlegible-Italic.woff2",
  "./assets/AtkinsonHyperlegible-Bold.woff2",
  "./assets/AtkinsonHyperlegible-BoldItalic.woff2"
];

const OFFLINE_ASSETS = [...CORE_ASSETS];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(OFFLINE_ASSETS.map((asset) => cache.add(asset))))
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

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CHECK_OFFLINE_READY") return;
  event.waitUntil(reportOfflineReadiness(event));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigationNetworkFirst(request));
    return;
  }
  if (url.pathname.endsWith("/library.json")) {
    event.respondWith(networkFirst(request, "./library.json"));
    return;
  }
  if (url.pathname.includes("/music/") || url.pathname.endsWith("/pdf.worker.min.js")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

async function reportOfflineReadiness(event) {
  const cache = await caches.open(CACHE_NAME);
  const checks = await Promise.all(OFFLINE_ASSETS.map((asset) => cache.match(asset)));
  const missing = OFFLINE_ASSETS.filter((asset, index) => !checks[index]);
  event.ports[0]?.postMessage({
    type: "OFFLINE_READY_STATUS",
    ready: missing.length === 0,
    missingCount: missing.length,
    totalCount: OFFLINE_ASSETS.length
  });
}

async function navigationNetworkFirst(request) {
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("./index.html", response.clone());
    }
    return response;
  } catch {
    return (await caches.match("./index.html")) || (await caches.match("./"));
  }
}

async function networkFirst(request, fallback) {
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request, { ignoreSearch: true })) || (fallback ? caches.match(fallback) : undefined);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response?.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}
