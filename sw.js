/**
 * Service worker.
 *
 * Objectif double, et un peu contradictoire : l'appli doit fonctionner hors
 * ligne, et afficher la dernière version dès qu'on recharge en ligne.
 *
 * La stratégie « cache d'abord » remplit le premier objectif et casse le
 * second : une fois en cache, un fichier ne bouge plus jamais. Comme l'appli
 * entière pèse quelques dizaines de kilo-octets, on fait donc l'inverse pour
 * son code — réseau d'abord, cache en secours — et on garde le cache d'abord
 * pour les images, qui ne changent pas.
 */
const VERSION = 'v4';
const CACHE = `kid-groovebox-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/audio.js',
  './js/icons.js',
  './js/songs.js',
  './js/picker.js',
  './js/overlay.js',
  './js/patterns.js',
  './js/sequencer.js',
  './js/ui.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())   // la nouvelle version prend la main tout de suite
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Le code de l'appli : on demande au réseau, on garde le cache pour le hors ligne. */
async function reseauDabord(request) {
  try {
    const reponse = await fetch(request, { cache: 'no-store' });
    if (reponse && reponse.ok) {
      const copie = reponse.clone();
      caches.open(CACHE).then((c) => c.put(request, copie)).catch(() => {});
    }
    return reponse;
  } catch {
    const enCache = await caches.match(request);
    return enCache || caches.match('./index.html');
  }
}

/** Les images : elles ne changent pas, le cache suffit. */
async function cacheDabord(request) {
  const enCache = await caches.match(request);
  if (enCache) return enCache;
  const reponse = await fetch(request);
  if (reponse && reponse.ok) {
    const copie = reponse.clone();
    caches.open(CACHE).then((c) => c.put(request, copie)).catch(() => {});
  }
  return reponse;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const estImage = /\.(png|jpe?g|svg|webp|ico)$/i.test(url.pathname);
  event.respondWith(estImage ? cacheDabord(request) : reseauDabord(request));
});
