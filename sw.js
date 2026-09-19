// Service Worker do Snake Arena — deixa o jogo instalável e jogável offline (modo local).
// O multiplayer online continua precisando de internet, claro (é conexão em tempo real).

const CACHE = 'snake-arena-v2.73.0';
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

// Arquivos "principais" do jogo (html/css/js) — pra esses, SEMPRE tenta pegar a versão
// mais nova da internet primeiro, e só usa o que tá guardado se realmente não tiver
// conexão. Antes o jogo mostrava a versão em cache na hora e só atualizava por baixo
// dos panos pra da PRÓXIMA vez — isso fazia a pessoa ficar sempre "uma versão atrasada"
// mesmo com internet boa. Agora, com internet, é sempre a versão mais nova de verdade.
function ehArquivoPrincipal(url) {
  return /\.(html|js|css)$/.test(url.pathname) || url.pathname.endsWith('/');
}

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
  const url = new URL(event.request.url);

  if (ehArquivoPrincipal(url)) {
    // Rede primeiro, com um limite de tempo curto — se a internet estiver ruim/lenta
    // de verdade, cai pro cache guardado em vez de travar a pessoa esperando.
    // IMPORTANTE: essa cadeia de respaldo tem que SEMPRE terminar numa resposta de
    // verdade — se cair tudo (sem rede E sem nada em cache ainda, como na primeira
    // vez que alguém abre o link), a pessoa NÃO pode ficar com "nada acontece" na tela.
    event.respondWith(
      Promise.race([
        fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ]).catch(() =>
        caches.match(event.request)
          .then((cached) => cached || caches.match('./index.html'))
          .then((cached) => cached || fetch(event.request)) // sem cache nenhum ainda? tenta a rede de novo, sem pressa dessa vez
          .catch(() =>
            new Response(
              '<!doctype html><html><body style="background:#07101d;color:#fff;font-family:sans-serif;text-align:center;padding:40px 20px"><h2>📡 Sem conexão</h2><p>Não consegui carregar o jogo agora. Confere sua internet e tenta de novo.</p><button onclick="location.reload()" style="padding:12px 24px;border-radius:10px;border:none;background:#3fcf68;color:#07101d;font-weight:bold;font-size:16px">🔄 Tentar de novo</button></body></html>',
              { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
          )
      )
    );
    return;
  }

  // Outros arquivos (ícone, fonte externa do multiplayer etc.) continuam com o
  // comportamento antigo — cache primeiro, atualiza por baixo dos panos
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => cached || new Response('', { status: 504 })); // nunca deixa "undefined" chegar no respondWith
      return cached || fetchPromise;
    })
  );
});
