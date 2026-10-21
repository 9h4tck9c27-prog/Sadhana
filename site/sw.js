// One cache, no version number — and therefore nothing to remember on deploy.
//
// The fetch handler below is network-first: it goes to the network and only
// falls back to this cache when the network fails. So the cache is the
// offline copy, never the serving copy, and every successful fetch overwrites
// its own entry. A version in the name was only ever doing two things —
// changing this file's bytes so the browser noticed, and purging the previous
// cache. The first happens anyway whenever this file genuinely changes, and
// the second is handled below for the versioned caches this app used to make.
const CACHE = 'sadhana';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/firebase-config.js',
              '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  // addAll rejects as a whole if any single file is missing, which would
  // leave the worker permanently uninstalled over a renamed icon. Take
  // whatever is actually there.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(
        CORE.map(u => c.add(new Request(u, {cache: 'reload'})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // sweeps up every sadhana-vNN cache this app left behind
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never touch anything that isn't ours. Firebase's SDK and Google's auth
  // endpoints must reach the network untouched — caching them, or serving a
  // fallback, breaks sign-in in ways that look like a Safari problem.
  if (url.origin !== self.location.origin) return;

  // The auth handshake is proxied through this origin at /__/auth/*. If the
  // service worker answers it with a cached index.html, the redirect returns
  // to the app and the sign-in silently never completes.
  if (url.pathname.startsWith('/__/')) return;

  // the audio test page is a scratch tool — never cache it
  if (url.pathname === '/audio-test.html') return;

  e.respondWith(
    fetch(req).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
  );
});
