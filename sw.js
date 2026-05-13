/* Mira — service worker
   Caches the app shell only. Never caches streams or weather.
*/
const VERSION = 'mira-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './cameras.json',
  './hikes.json',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

const NEVER_CACHE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'i.ytimg.com',
  'ytimg.com',
  'stream.madeirawebcams.com',
  'madeirawebcams.com',
  'api.open-meteo.com',
  'open-meteo.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache stream/weather/tile hosts. Let them go straight to network.
  if (NEVER_CACHE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) {
    return; // default network behaviour
  }

  // Map tiles (CartoDB / OSM): network-first, do not cache.
  if (url.hostname.endsWith('basemaps.cartocdn.com') ||
      url.hostname.endsWith('tile.openstreetmap.org') ||
      url.hostname.endsWith('unpkg.com')) {
    return;
  }

  // Same-origin: cache-first for shell, network fallback, revalidate cameras.json.
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/cameras.json') || url.pathname.endsWith('/hikes.json')) {
      // stale-while-revalidate so edits to cameras.json show up after refresh
      event.respondWith(
        caches.open(VERSION).then(async (cache) => {
          const cached = await cache.match(req);
          const network = fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      );
      return;
    }
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
