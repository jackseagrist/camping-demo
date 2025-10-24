'use client';
import { useEffect, useState } from 'react';
import { isOfflineReady } from '../lib/offline';
import MapComponentTrip from './MapComponentTrip';
import TripMapMaplibreOffline from './TripMapMaplibreOffline';
import { TripLocation } from '../lib/types';

interface TripMapSmartProps {
  tripId: string;
  center: [number, number];
  zoom?: number;
  locations?: TripLocation[];
  fitBoundsOnLocationsChange?: boolean;
  isCustomMarkerMode?: boolean;
  onMarkerPlaced?: (lng: number, lat: number) => void;
  onCenterChange?: (lat: number, lng: number) => void;
  showTemporaryMarker?: boolean;
  onToggleTemporaryMarker?: (isActive: boolean) => void;
  onAddLocationFromMarker?: (lat: number, lng: number, description?: string) => void;
}

export default function TripMapSmart({ 
  tripId, 
  center, 
  zoom = 7,
  locations,
  fitBoundsOnLocationsChange,
  isCustomMarkerMode,
  onMarkerPlaced,
  onCenterChange,
  showTemporaryMarker,
  onToggleTemporaryMarker,
  onAddLocationFromMarker
}: TripMapSmartProps) {
  const [mode, setMode] = useState<'mapbox'|'maplibre'|'loading'>('loading');

  useEffect(() => {
    (async () => {
      const ready = await isOfflineReady(tripId);
      setMode(ready || !navigator.onLine ? 'maplibre' : 'mapbox');
    })();
  }, [tripId]);

  if (mode === 'loading') return null;
  
  if (mode === 'mapbox') {
    return (
      <MapComponentTrip 
        location={`Trip ${tripId}`}
        lat={center[1]}
        lon={center[0]}
        locations={locations}
        fitBoundsOnLocationsChange={fitBoundsOnLocationsChange}
        isCustomMarkerMode={isCustomMarkerMode}
        onMarkerPlaced={onMarkerPlaced}
        onCenterChange={onCenterChange}
        showTemporaryMarker={showTemporaryMarker}
        onToggleTemporaryMarker={onToggleTemporaryMarker}
        onAddLocationFromMarker={onAddLocationFromMarker}
      />
    );
  }
  
  return (
    <TripMapMaplibreOffline 
      tripId={tripId} 
      center={center} 
      zoom={zoom} 
      locations={locations}
    />
  );
}
