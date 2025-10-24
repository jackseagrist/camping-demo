/* global workbox */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const { registerRoute } = workbox.routing;
const { CacheFirst, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

// Cache PMTiles bundles
registerRoute(
  ({url}) => url.pathname.startsWith('/pmtiles/'),
  new CacheFirst({
    cacheName: 'pmtiles-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

// Cache MapLibre style assets
registerRoute(
  ({url}) => url.pathname.startsWith('/styles/') || url.pathname.startsWith('/sprites/') || url.pathname.startsWith('/fonts/'),
  new StaleWhileRevalidate({ cacheName: 'map-style-assets' }),
);
