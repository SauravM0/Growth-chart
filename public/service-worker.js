/* eslint-disable no-restricted-globals */

const CACHE_VERSION = 'v1';
const APP_CACHE = `growth-app-${CACHE_VERSION}`;
const RUNTIME_CACHE = `growth-runtime-${CACHE_VERSION}`;

const CORE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/data/demo_girls_0_18_curves.json',
  '/data/demo_boys_0_18_curves.json',
];

function normalizePath(path) {
  if (!path) {
    return null;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (/^https?:\/\//.test(normalized)) {
    return null;
  }
  return normalized;
}

async function getManifestUrls() {
  try {
    const response = await fetch('/asset-manifest.json', { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }
    const manifest = await response.json();
    const urls = new Set();

    Object.values(manifest?.files || {}).forEach((value) => {
      const path = normalizePath(value);
      if (path) {
        urls.add(path);
      }
    });

    (manifest?.entrypoints || []).forEach((value) => {
      const path = normalizePath(value);
      if (path) {
        urls.add(path);
      }
    });

    return Array.from(urls);
  } catch (_error) {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      const manifestUrls = await getManifestUrls();
      const urls = Array.from(new Set([...CORE_URLS, ...manifestUrls]));
      await cache.addAll(urls);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== APP_CACHE && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

function shouldCacheRequest(request) {
  if (request.method !== 'GET') {
    return false;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }
  return true;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldCacheRequest(request)) {
    return;
  }

  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate';
  const isAssetLike =
    url.pathname.startsWith('/static/') ||
    url.pathname.startsWith('/data/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2');

  if (isNavigation) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP_CACHE);
        try {
          const response = await fetch(request);
          cache.put('/index.html', response.clone());
          return response;
        } catch (_error) {
          const cached = await cache.match('/index.html');
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  if (isAssetLike) {
    event.respondWith(
      (async () => {
        const staticCache = await caches.open(APP_CACHE);
        const cached = await staticCache.match(request);
        if (cached) {
          return cached;
        }
        const response = await fetch(request);
        staticCache.put(request, response.clone());
        return response;
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((response) => {
          cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkPromise || Response.error();
    })()
  );
});
