# Offline Mode - User Flow Diagrams

## 1. Initial Page Load (Online, No Offline Pack)

```
User navigates to /trips/abc-123
            ↓
    useServiceWorker() hook
    registers Service Worker
            ↓
    TripMapSmart checks:
    - isOfflineReady('abc-123')?  → false
    - !navigator.onLine?          → false
            ↓
    Render MapComponentTrip
    (Mapbox GL JS - Online Mode)
            ↓
    Display buttons:
    [Download for Offline] [Delete Offline Data]
    No "Offline Ready ✓" chip
```

**Visual:**
```
┌─────────────────────────────────────┐
│  🗺️  Mapbox Map (Online Mode)      │
│                                     │
│  [Interactive Mapbox tiles]         │
│                                     │
└─────────────────────────────────────┘
[Download for Offline] [Delete Offline]
```

---

## 2. Downloading Offline Pack

```
User clicks "Download for Offline"
            ↓
    Status: "Preparing…"
            ↓
    Step 1: Fetch GeoJSON
    GET /api/trips/abc-123/geojson
            ↓
    Save to IndexedDB:
    db.tripGeo['abc-123'] = geojson
            ↓
    Step 2: Download PMTiles
    Status: "Downloading tiles…"
    GET /pmtiles/trip-abc-123.pmtiles
            ↓
    Stream with progress:
    Progress: 15% → 50% → 100%
            ↓
    Cache in Service Worker:
    caches.open('pmtiles-cache')
    .put('/pmtiles/trip-abc-123.pmtiles')
            ↓
    Step 3: Cache Style Assets
    - /styles/baselodge.json
    - /sprites/baselodge/sprite.json
    - /sprites/baselodge/sprite.png
            ↓
    Step 4: Set Offline Flag
    db.offlineFlags['trip:abc-123'] = true
            ↓
    Status: "Offline map ready ✓"
            ↓
    iPhone Safari?
    ├─ YES → Show A2HS Bottom Sheet
    └─ NO  → Done
```

**Visual Progress:**
```
[Download for Offline] ← Click
        ↓
[Preparing…]
        ↓
[Downloading tiles… 25%]
[████░░░░░░░░░░░░] 25%
        ↓
[Downloading tiles… 75%]
[███████████░░░░░] 75%
        ↓
[Offline map ready ✓]
```

---

## 3. iPhone Add to Home Screen Prompt

```
Offline download complete
    (on iPhone Safari, not in standalone)
            ↓
    isStandalone() → false
    isIOS() → true
    isSafari() → true
            ↓
    Show AddToHomeScreenSheet
            ↓
┌─────────────────────────────────────┐
│ Make it one tap from your Home      │
│ Screen                              │
│                                     │
│ 1. Tap the Share icon in Safari's  │
│    toolbar.                         │
│ 2. Choose Add to Home Screen, then │
│    tap Add.                         │
│                                     │
│ This icon will open:                │
│ /trips/abc-123/map                  │
│                                     │
│        [Got it]                     │
└─────────────────────────────────────┘
            ↓
    User taps "Got it"
            ↓
    Sheet closes
```

**Visual (iPhone):**
```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░░ BaseLodge ░░░░░░░░░░░░░ │
│                                     │
│  🗺️  Map View                       │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 📱 Make it one tap from your    │ │
│ │    Home Screen                  │ │
│ │                                 │ │
│ │ 1️⃣ Tap Share icon (↑ in box)    │ │
│ │ 2️⃣ Tap "Add to Home Screen"     │ │
│ │                                 │ │
│ │ Opens: /trips/abc-123/map       │ │
│ │                                 │ │
│ │    [ Got it ]                   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 4. Page Load with Offline Pack (Still Online)

```
User navigates to /trips/abc-123
            ↓
    TripMapSmart checks:
    - isOfflineReady('abc-123')?  → true ✓
    - !navigator.onLine?          → false
            ↓
    Offline pack exists!
    Prefer offline mode
            ↓
    Render TripMapMaplibreOffline
    (MapLibre GL + PMTiles)
            ↓
    Load from cache:
    - PMTiles: pmtiles:///pmtiles/trip-abc-123.pmtiles
    - GeoJSON: IndexedDB → db.tripGeo['abc-123']
    - Style: /styles/baselodge.json (cached)
            ↓
    Display buttons:
    [Download for Offline] [Delete Offline Data]
    Show "Offline Ready ✓" chip
```

**Visual:**
```
┌─────────────────────────────────────┐
│  🗺️  MapLibre Map (Offline Mode)   │
│  ┌─────────────────────────────┐   │
│  │ Offline Mode                │   │ ← Indicator
│  └─────────────────────────────┘   │
│  [PMTiles vector tiles + pins]      │
│                                     │
└─────────────────────────────────────┘
[Download for Offline] [Delete Offline]
[Offline Ready ✓]  ← Chip appears
```

---

## 5. Airplane Mode / Device Offline

```
User enables Airplane Mode
    or loses internet connection
            ↓
    navigator.onLine → false
            ↓
User navigates to /trips/abc-123
    (or refreshes page)
            ↓
    TripMapSmart checks:
    - isOfflineReady('abc-123')?  → true ✓
    - !navigator.onLine?          → true ✓
            ↓
    Both conditions favor offline!
    Render TripMapMaplibreOffline
            ↓
    Load from cache (no network needed):
    - Service Worker intercepts requests
    - PMTiles served from 'pmtiles-cache'
    - Style assets from 'map-style-assets'
    - GeoJSON from IndexedDB
            ↓
    Map renders fully offline
    with trip locations and markers
```

**Visual (Offline):**
```
┌─────────────────────────────────────┐
│  🗺️  MapLibre Map (Offline Mode)   │
│  ┌─────────────────────────────┐   │
│  │ Offline Mode                │   │
│  └─────────────────────────────┘   │
│                                     │
│  📍 Camp Site Alpha                 │
│  📍 Trailhead                       │
│  📍 Parking Area                    │
│                                     │
│  [All loaded from cache]            │
└─────────────────────────────────────┘
[Download for Offline] [Delete Offline]
[Offline Ready ✓]

🛫 Airplane Mode: ON
```

---

## 6. Deleting Offline Data

```
User clicks "Delete Offline Data"
            ↓
    Confirm: alert("Offline data removed.")
            ↓
    clearOffline('abc-123') executes:
            ↓
    1. Delete from IndexedDB:
       db.tripGeo.delete('abc-123')
       db.offlineFlags.delete('trip:abc-123')
            ↓
    2. Delete from Cache:
       caches.open('pmtiles-cache')
       .delete('/pmtiles/trip-abc-123.pmtiles')
            ↓
    Alert shown
            ↓
    User refreshes page
            ↓
    TripMapSmart checks:
    - isOfflineReady('abc-123')?  → false
    - !navigator.onLine?          → false
            ↓
    No offline pack!
    Render MapComponentTrip
    (Mapbox GL JS - back to online)
```

**Before/After:**
```
BEFORE:
[Offline Ready ✓]
Map: MapLibre (offline)

User clicks [Delete Offline Data]
        ↓
    Alert: "Offline data removed."
        ↓
    Refresh page
        ↓

AFTER:
(No "Offline Ready" chip)
Map: Mapbox (online)
```

---

## 7. Service Worker Lifecycle

```
Page loads
    ↓
useServiceWorker() hook
    ↓
Check: 'serviceWorker' in navigator?
├─ YES → Continue
└─ NO  → Skip (browser doesn't support)
    ↓
new Workbox('/sw.js', { scope: '/' })
    ↓
wb.register()
    ↓
┌─────────────────────────────────────┐
│     Service Worker (/sw.js)         │
│                                     │
│  Event: 'install'                   │
│    → self.skipWaiting()             │
│                                     │
│  Event: 'activate'                  │
│    → self.clients.claim()           │
│                                     │
│  Event: 'fetch'                     │
│    → Check route:                   │
│                                     │
│    /pmtiles/*                       │
│      → CacheFirst                   │
│      → Cache: 'pmtiles-cache'       │
│      → Max 30 entries, 30 days      │
│                                     │
│    /styles/* /sprites/* /fonts/*    │
│      → StaleWhileRevalidate         │
│      → Cache: 'map-style-assets'    │
│                                     │
│    (Other requests)                 │
│      → Pass through (no caching)    │
└─────────────────────────────────────┘
```

---

## 8. Complete User Journey (Happy Path)

```
┌─────────────────────────────────────────┐
│ 1. User plans camping trip on desktop  │
│    Creates trip in BaseLodge app       │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 2. User wants offline access            │
│    Opens trip page on iPhone Safari     │
│    Clicks "Download for Offline"        │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 3. Download completes (progress shown)  │
│    Bottom sheet appears:                │
│    "Add this to your Home Screen!"      │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 4. User follows instructions:           │
│    • Taps Share button                  │
│    • Taps "Add to Home Screen"          │
│    • Icon appears on iPhone home screen │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 5. User drives to remote campsite       │
│    No cell signal, but taps app icon    │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 6. App loads instantly from cache       │
│    Map renders with offline tiles       │
│    User sees all saved trip locations   │
│    Navigates using offline map          │
└─────────────────────────────────────────┘
                ↓
            SUCCESS! 🎉
    User has full offline camping guide
```

---

## 9. Data Storage Breakdown

```
STORAGE LOCATIONS:

┌──────────────────────────────────┐
│         IndexedDB                │
│  Database: 'baselodge'           │
│                                  │
│  Store: 'tripGeo'                │
│    Key: tripId (string)          │
│    Value: GeoJSON object         │
│    Size: ~1-10 KB per trip       │
│                                  │
│  Store: 'offlineFlags'           │
│    Key: 'trip:tripId'            │
│    Value: true/false             │
│    Size: ~1 byte per trip        │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│      Cache API (Service Worker)  │
│                                  │
│  Cache: 'pmtiles-cache'          │
│    Key: /pmtiles/trip-X.pmtiles  │
│    Value: Binary PMTiles file    │
│    Size: ~5-200 MB per trip      │
│    Max: 30 entries               │
│    TTL: 30 days                  │
│                                  │
│  Cache: 'map-style-assets'       │
│    Keys:                         │
│      /styles/baselodge.json      │
│      /sprites/baselodge/*.png    │
│      /fonts/*.pbf                │
│    Size: ~1-5 MB total           │
└──────────────────────────────────┘

Total per trip: ~5-200 MB
(mostly PMTiles vector tiles)
```

---

## 10. Troubleshooting Flow

```
Map doesn't render offline?
    ↓
Check 1: Is offline pack downloaded?
├─ NO  → Download first
└─ YES → Continue
    ↓
Check 2: Open DevTools → Application
    ├─ Cache Storage
    │   └─ 'pmtiles-cache'
    │       └─ /pmtiles/trip-X.pmtiles present?
    │           ├─ NO  → Re-download
    │           └─ YES → Continue
    │
    ├─ IndexedDB
    │   └─ 'baselodge'
    │       ├─ tripGeo['X'] exists?
    │       └─ offlineFlags['trip:X'] = true?
    │           ├─ NO  → Re-download
    │           └─ YES → Continue
    │
    └─ Service Workers
        └─ /sw.js is Active?
            ├─ NO  → Reload page, check errors
            └─ YES → Check Console for errors
    ↓
Still broken?
    ↓
Run in Console:
> testOfflineMode()
    ↓
Review test results
    ↓
Check for specific errors:
- Network requests failing?
- PMTiles file malformed?
- Style JSON syntax errors?
- MapLibre GL JS errors?
```

---

## 11. Performance Characteristics

```
INITIAL DOWNLOAD (One-time):
┌──────────────────────────────────┐
│ Component            │ Time      │
├──────────────────────┼───────────┤
│ GeoJSON fetch        │ ~100ms    │
│ PMTiles (50 MB)      │ ~5-30s    │
│ Style assets         │ ~500ms    │
│ IndexedDB writes     │ ~50ms     │
└──────────────────────────────────┘
Total: ~6-31 seconds (one-time)


OFFLINE PAGE LOAD:
┌──────────────────────────────────┐
│ Component            │ Time      │
├──────────────────────┼───────────┤
│ Service Worker init  │ ~50ms     │
│ IndexedDB read       │ ~20ms     │
│ Cache read (PMTiles) │ ~100ms    │
│ MapLibre render      │ ~200ms    │
└──────────────────────────────────┘
Total: ~370ms (instant!)


COMPARISON:
┌──────────────────────────────────┐
│ Mode     │ Load Time │ Data Used │
├──────────┼───────────┼───────────┤
│ Online   │ ~2-5s     │ ~1-10 MB  │
│ Offline  │ ~0.4s     │ 0 bytes   │
└──────────────────────────────────┘
Offline is 5-12x faster! 🚀
```

---

## 12. Browser Support Matrix

```
Feature                 │ Chrome │ Safari │ Firefox │ Edge
────────────────────────┼────────┼────────┼─────────┼──────
Service Worker          │   ✓    │   ✓    │    ✓    │  ✓
Cache API               │   ✓    │   ✓    │    ✓    │  ✓
IndexedDB               │   ✓    │   ✓    │    ✓    │  ✓
MapLibre GL JS          │   ✓    │   ✓    │    ✓    │  ✓
PMTiles Protocol        │   ✓    │   ✓    │    ✓    │  ✓
A2HS (Automatic)        │   ✓    │   ✗    │    ✗    │  ✓
A2HS (Manual)           │   ✓    │   ✓    │    ✓    │  ✓
PWA Standalone Mode     │   ✓    │   ✓    │    ✓    │  ✓

✓ = Fully supported
✗ = Manual only (hence the instruction sheet)

Minimum Versions:
- Chrome: 55+
- Safari: 11.1+ (iOS 11.3+)
- Firefox: 52+
- Edge: 79+
```

---

## Summary

This offline implementation provides:

1. ✅ **Smart switching** between online/offline modes
2. ✅ **Progressive download** with visual feedback
3. ✅ **iPhone-optimized** A2HS instructions
4. ✅ **Instant loading** when offline (cached)
5. ✅ **Zero network usage** in offline mode
6. ✅ **Easy data management** (delete button)
7. ✅ **License compliant** (no Mapbox tile caching)

The user experience is seamless, fast, and works reliably even in remote areas with no cell signal.

