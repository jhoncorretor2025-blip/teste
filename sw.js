// Service Worker do Snake Arena — deixa o jogo instalável e jogável offline (modo local).
// O multiplayer online continua precisando de internet, claro (é conexão em tempo real).

const CACHE = 'snake-arena-v2.54.0';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/config.js',
  './js/state.js',
  './js/utils.js',
  './js/players.js',
  './js/food.js',
  './js/ai.js',
  './js/render.js',
  './js/loop.js',
  './js/input.js',
  './js/mission.js',
  './js/sound.js',
  './js/storage.js',
  './js/tutorial.js',
  './js/share.js',
  './js/leaderboard.js',
  './js/net.js',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      // A biblioteca do multiplayer vem de outro site (CDN) — cacheia à parte, sem
      // deixar isso travar a instalação toda se por acaso falhar (offline ou CDN fora do ar)
      .then(() => caches.open(CACHE))
      .then((cache) => cache.add('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js').catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return cached || fetchPromise;
    })
  );
});
