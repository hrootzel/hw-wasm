/* Service worker for caching engine + data pack parts.
 *
 * Goal: avoid re-downloading `hwengine.wasm` and `hwengine.data.partN` on every visit,
 * even on hosts with weak/no cache headers.
 */

const CACHE_PREFIX = 'wedgewars-cache-';
const CACHE_VERSION = 'v2';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

function isSameOrigin(requestUrl) {
  try {
    const u = new URL(requestUrl);
    return u.origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

function isEngineAsset(pathname) {
  return (
    pathname.endsWith('/hwengine.html') ||
    pathname.endsWith('/hwengine.js') ||
    pathname.endsWith('/hwengine.wasm') ||
    pathname.endsWith('/hwengine.data') ||
    /\/hwengine\.data\.part[0-9]+$/.test(pathname)
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await self.skipWaiting();
    // No precache list here: the web frontend uses many ES modules and the engine
    // part count varies. We cache on-demand in fetch().
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME) return caches.delete(k);
      return Promise.resolve(false);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!isSameOrigin(req.url)) return;

  const url = new URL(req.url);

  // Cache engine + data pack aggressively (cache-first).
  if (isEngineAsset(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: false });
      if (cached) return cached;
      const resp = await fetch(req);
      if (resp && resp.ok) {
        // Clone before putting because responses are streams.
        await cache.put(req, resp.clone());
      }
      return resp;
    })());
    return;
  }

  // For other same-origin GETs, do a small stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: false });
    const fetchPromise = fetch(req).then(async (resp) => {
      if (resp && resp.ok) await cache.put(req, resp.clone());
      return resp;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(fetchPromise);
      return cached;
    }
    const fresh = await fetchPromise;
    return fresh || new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
