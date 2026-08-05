/* Taji — Service Worker
   Rôle : rendre l'app installable et ouvrable HORS-LIGNE (coquille + lib).
   Les appels API Supabase (/rest, /auth) NE sont PAS interceptés ici :
   la couche hors-ligne côté page (TajiOffline) s'en charge (cache lectures + file d'écritures). */
const CACHE = 'taji-shell-v1';
const CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  CDN_SUPABASE
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Ne jamais intercepter l'API Supabase : laisser le réseau (et TajiOffline) gérer.
  if (url.hostname.endsWith('supabase.co')) return;

  // Uniquement les GET sont mis en cache.
  if (req.method !== 'GET') return;

  // Navigations (ouverture de l'app) : réseau d'abord, repli sur la coquille en cache.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Lib CDN + statiques (icônes, manifest) : cache d'abord, mise à jour en arrière-plan.
  if (url.href === CDN_SUPABASE || url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
