// ==========================================
// Weather Dashboard — Service Worker
// ==========================================
//
// Strategy
// --------
// • App shell (HTML, CSS, JS, icons): cached on install so the
//   app opens offline. Pages use network-first; static files use
//   stale-while-revalidate so updates arrive on the next visit.
// • Weather data: NOT handled here. Requests to Open-Meteo pass
//   straight through, and script.js keeps its own copy of the
//   last weather it loaded (localStorage). That lets the app tell
//   the user when it is showing saved data instead of live data.
//
// When you change any shell file, bump VERSION so users get a
// fresh cache.

const VERSION = "v1";
const SHELL_CACHE = `weather-dashboard-shell-${VERSION}`;

const SHELL_ASSETS = [
    "./",
    "index.html",
    "styles.css",
    "script.js",
    "manifest.webmanifest",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-192.png",
    "icons/icon-maskable-512.png",
    "icons/apple-touch-icon.png",
    "icons/favicon-32.png"
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: remove caches from older versions
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) =>
                            key.startsWith("weather-dashboard-shell-") &&
                            key !== SHELL_CACHE
                        )
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

// Fetch
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // Only handle same-origin GET requests.
    // Weather/geocoding API calls are cross-origin and pass through.
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Page loads: network first, fall back to the cached app shell
    if (request.mode === "navigate") {
        event.respondWith(networkFirstPage(request));
        return;
    }

    // Everything else: serve from cache, refresh in the background
    event.respondWith(staleWhileRevalidate(event, request));
});

async function networkFirstPage(request) {
    const cache = await caches.open(SHELL_CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put("index.html", response.clone());
        }
        return response;
    } catch (error) {
        return (
            (await cache.match("index.html")) ||
            (await cache.match("./")) ||
            Response.error()
        );
    }
}

async function staleWhileRevalidate(event, request) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });

    const network = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached);

    if (cached) {
        event.waitUntil(network);
        return cached;
    }
    return network;
}
