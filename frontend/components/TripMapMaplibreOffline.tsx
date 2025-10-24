'use client';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as pmtiles from 'pmtiles';
import { loadTripGeoJSON } from '../lib/offline';
import { TripLocation } from '../lib/types';

interface TripMapMaplibreOfflineProps {
  tripId: string;
  center: [number, number];
  zoom?: number;
  locations?: TripLocation[];
}

export default function TripMapMaplibreOffline({ 
  tripId, 
  center, 
  zoom = 7,
  locations 
}: TripMapMaplibreOfflineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!ref.current) return;
    
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    (async () => {
      // Try to use PMTiles if available, otherwise fallback to a basic style
      const tripGeo = await loadTripGeoJSON(tripId) || { type: 'FeatureCollection', features: [] };
      
      // Check if PMTiles file exists
      let hasPmtiles = false;
      try {
        const pmtilesCheck = await fetch(`/pmtiles/trip-${tripId}.pmtiles`, { method: 'HEAD' });
        hasPmtiles = pmtilesCheck.ok;
      } catch (e) {
        console.warn('PMTiles not available, using fallback style');
      }
      
      const style: maplibregl.Style = {
        version: 8,
        sources: {
          // Only add PMTiles source if available
          ...(hasPmtiles ? {
            basemap: { 
              type: 'vector', 
              url: `pmtiles:///pmtiles/trip-${tripId}.pmtiles` 
            }
          } : {}),
          // Always include trip data from IndexedDB
          trip: { 
            type: 'geojson', 
            data: tripGeo 
          },
          // Fallback empty background if no PMTiles
          ...(hasPmtiles ? {} : {
            background: {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]]
                },
                properties: {}
              }
            }
          })
        },
        layers: [
          // Base terrain layer
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#f8f8f8'
            }
          },
          
          // Fallback background if no PMTiles
          ...(!hasPmtiles ? [
            {
              id: 'fallback-background',
              type: 'fill',
              source: 'background',
              paint: {
                'fill-color': '#e8e8e8'
              }
            }
          ] : []),
          
          // PMTiles layers - only added if PMTiles are available
          ...(hasPmtiles ? [
            // Land
            {
              id: 'land',
              type: 'fill',
              source: 'basemap',
              'source-layer': 'land',
              paint: {
                'fill-color': '#f2efe9'
              }
            },
            // Water
            {
              id: 'water',
              type: 'fill',
              source: 'basemap',
              'source-layer': 'water',
              paint: {
                'fill-color': '#c8e1f9'
              }
            },
            // Roads
            {
              id: 'roads-major',
              type: 'line',
              source: 'basemap',
              'source-layer': 'transportation',
              filter: ['all', ['!has', 'service'], ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk', 'motorway']],
              paint: {
                'line-color': '#ffffff',
                'line-width': 1
              }
            }
          ] : []),
          // Trip points
          {
            id: 'trip-points',
            type: 'circle',
            source: 'trip',
            paint: {
              'circle-radius': 6,
              'circle-color': '#3b82f6',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          }
        ]
      };

      const map = new maplibregl.Map({
        container: ref.current!,
        style,
        center,
        zoom
      });
      
      mapRef.current = map;

      // Add markers for locations if provided
      if (locations && locations.length > 0) {
        locations.forEach((loc) => {
          if (loc.latitude && loc.longitude) {
            const marker = new maplibregl.Marker({ color: '#3b82f6' })
              .setLngLat([loc.longitude, loc.latitude])
              .addTo(map);
            markersRef.current.push(marker);
          }
        });
        
        // Fit bounds to markers if multiple locations
        if (locations.length > 1) {
          const bounds = new maplibregl.LngLatBounds();
          locations.forEach(loc => {
            if (loc.latitude && loc.longitude) {
              bounds.extend([loc.longitude, loc.latitude]);
            }
          });
          map.fitBounds(bounds, { padding: 50 });
        }
      }

      // Add offline mode indicator
      const offlineControl = document.createElement('div');
      offlineControl.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      offlineControl.style.margin = '10px';
      offlineControl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      offlineControl.style.color = 'white';
      offlineControl.style.padding = '5px 10px';
      offlineControl.style.borderRadius = '4px';
      offlineControl.style.fontSize = '12px';
      offlineControl.innerHTML = 'Offline Mode';
      
      map.getContainer().appendChild(offlineControl);

      return () => {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        map.remove();
        mapRef.current = null;
      };
    })();
  }, [tripId, center, zoom]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !locations) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Add new markers
    locations.forEach((loc) => {
      if (loc.latitude && loc.longitude && mapRef.current) {
        const marker = new maplibregl.Marker({ color: '#3b82f6' })
          .setLngLat([loc.longitude, loc.latitude])
          .addTo(mapRef.current);
        markersRef.current.push(marker);
      }
    });
  }, [locations]);

  return <div ref={ref} className="h-[400px] w-full rounded-xl overflow-hidden" />;
}
