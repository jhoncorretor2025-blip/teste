// Service Worker do Snake Arena — deixa o jogo instalável e jogável offline (modo local).
// O multiplayer online continua precisando de internet, claro (é conexão em tempo real).

const CACHE = 'snake-arena-v2.29.0';
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
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
