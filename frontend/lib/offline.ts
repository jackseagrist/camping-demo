import { openDB } from 'idb';

const DB_NAME = 'baselodge';
const GEO_STORE = 'tripGeo';
const FLAGS_STORE = 'offlineFlags';

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(GEO_STORE)) db.createObjectStore(GEO_STORE);
      if (!db.objectStoreNames.contains(FLAGS_STORE)) db.createObjectStore(FLAGS_STORE);
    },
  });
}

export async function saveTripGeoJSON(tripId: string, geojson: any) {
  const db = await getDB();
  await db.put(GEO_STORE, geojson, tripId);
}

export async function loadTripGeoJSON(tripId: string) {
  const db = await getDB();
  return db.get(GEO_STORE, tripId);
}

export async function setOfflineReady(tripId: string, ready: boolean) {
  const db = await getDB();
  await db.put(FLAGS_STORE, ready, `trip:${tripId}`);
}

export async function isOfflineReady(tripId: string) {
  const db = await getDB();
  return (await db.get(FLAGS_STORE, `trip:${tripId}`)) === true;
}

export async function clearOffline(tripId: string) {
  const db = await getDB();
  await db.delete(GEO_STORE, tripId);
  await db.delete(FLAGS_STORE, `trip:${tripId}`);
  const cache = await caches.open('pmtiles-cache');
  await cache.delete(`/pmtiles/trip-${tripId}.pmtiles`);
}
