import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format, addDays, isWithinInterval, parseISO } from 'date-fns';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

type FacilityRow = {
  id: string; // UUID in facilities table
  facility_id: string; // rec.gov facility id
  name: string;
  state?: string;
  lat: number;
  lon: number;
  demand_assessment?: string;
  cost_assessment?: string;
  cost_assessment_2?: string;
};

type AvailabilityRow = {
  facility_id: string;
  campsite_id: string;
  month_date: string; // yyyy-MM-dd (first day of month)
  availabilities: Record<string, string>; // date string -> status (e.g., 'Available'|'NotAvailable')
};

type SelectedFacility = FacilityRow & {
  availabilityCounts: Record<string, number>; // dateStr -> number of available sites
};

const SF_CENTER: [number, number] = [-122.4194, 37.7749];

const MAX_COMPARE = 5;

export default function ComparePage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'calendar'>('map'); // mobile

  // Date window (30 days)
  const [windowStart, setWindowStart] = useState<Date>(new Date());
  const [daysCount, setDaysCount] = useState<number>(30);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [costFilter, setCostFilter] = useState('');
  const [demandFilter, setDemandFilter] = useState('');
  const [searchResults, setSearchResults] = useState<FacilityRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Facilities on map
  const [mapFacilities, setMapFacilities] = useState<FacilityRow[]>([]);
  const [initialCenter, setInitialCenter] = useState<[number, number]>(SF_CENTER);
  const [initialZoom, setInitialZoom] = useState(8);

  // Selected facilities for comparison
  const [selectedFacilities, setSelectedFacilities] = useState<SelectedFacility[]>([]);

  // Map refs
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Derived date list
  const dateList = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => addDays(windowStart, i));
  }, [windowStart, daysCount]);

  // Debounced search
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        let query = supabase
          .from('facilities')
          .select('id, facility_id, name, state, lat, lon, demand_assessment, cost_assessment, cost_assessment_2')
          .ilike('name', `%${searchQuery}%`)
          .limit(20);

        if (stateFilter) query = query.eq('state', stateFilter);
        if (demandFilter) query = query.eq('demand_assessment', demandFilter);
        if (costFilter) {
          // Prefer cost_assessment, fallback to cost_assessment_2
          query = query.or(`cost_assessment.eq.${costFilter},cost_assessment_2.eq.${costFilter}`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setSearchResults((data || []) as FacilityRow[]);
      } catch (e) {
        console.error('Search error', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, stateFilter, costFilter, demandFilter, supabase]);

  // Entry conditions: trip context or standalone
  useEffect(() => {
    const loadEntry = async () => {
      try {
        const tripId = router.query.trip_id as string | undefined;
        const facilityIdParam = router.query.facilityId as string | undefined;

        if (tripId) {
          // Fetch trip and its selected facility (referenced by facilities.id)
          const { data: trip, error: tripError } = await supabase
            .from('trips')
            .select('facility_id')
            .eq('id', tripId)
            .single();
          if (tripError) throw tripError;

          if (trip?.facility_id) {
            const { data: facility, error: facErr } = await supabase
              .from('facilities')
              .select('id, facility_id, name, state, lat, lon, demand_assessment, cost_assessment, cost_assessment_2')
              .eq('id', trip.facility_id)
              .single();
            if (!facErr && facility) {
              setInitialCenter([facility.lon, facility.lat]);
              setInitialZoom(10);
              // Auto-select this facility
              await addFacilityToCompare(facility as FacilityRow);
              // Fetch nearby facilities to populate the map
              await fetchFacilitiesAround(facility.lat, facility.lon);
              setIsLoading(false);
              return;
            }
          }
          // Trip but no facility: default to SF
          await fetchFacilitiesAround(SF_CENTER[1], SF_CENTER[0]);
          setIsLoading(false);
          return;
        }

        if (facilityIdParam) {
          // Load by rec.gov facility id
          const { data: facility, error } = await supabase
            .from('facilities')
            .select('id, facility_id, name, state, lat, lon, demand_assessment, cost_assessment, cost_assessment_2')
            .eq('facility_id', facilityIdParam)
            .single();
          if (!error && facility) {
            setInitialCenter([facility.lon, facility.lat]);
            setInitialZoom(10);
            await addFacilityToCompare(facility as FacilityRow);
            await fetchFacilitiesAround(facility.lat, facility.lon);
            setIsLoading(false);
            return;
          }
        }

        // Standalone default: SF
        await fetchFacilitiesAround(SF_CENTER[1], SF_CENTER[0]);
        setIsLoading(false);
      } catch (e) {
        console.error('Entry load error', e);
        setIsLoading(false);
      }
    };
    if (!router.isReady) return;
    loadEntry();
  }, [router.isReady, router.query, supabase]);

  // Fetch facilities near a lat/lon (about ~100 miles)
  const fetchFacilitiesAround = async (lat: number, lon: number) => {
    try {
      const radiusDegrees = 1.5;
      const { data, error } = await supabase
        .from('facilities')
        .select('id, facility_id, name, state, lat, lon, demand_assessment, cost_assessment, cost_assessment_2')
        .gte('lat', lat - radiusDegrees)
        .lte('lat', lat + radiusDegrees)
        .gte('lon', lon - radiusDegrees)
        .lte('lon', lon + radiusDegrees)
        .not('lat', 'is', null)
        .not('lon', 'is', null)
        .limit(500);
      if (error) throw error;
      setMapFacilities((data || []) as FacilityRow[]);
    } catch (e) {
      console.error('Failed fetching nearby facilities', e);
      setMapFacilities([]);
    }
  };

  // Map setup and updates
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // already initialized
    if (typeof window === 'undefined') return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: initialCenter,
      zoom: initialZoom,
    });
    mapRef.current = map;

    map.on('load', () => {
      // Source for facilities with clustering
      map.addSource('facilities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'facilities',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#10B981',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15,
            10,
            20,
            30,
            25
          ],
          'circle-opacity': 0.6
        }
      });

      // Cluster count labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'facilities',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#064E3B'
        }
      });

      // Unclustered points
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'facilities',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#2563EB',
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF'
        }
      });

      // Selected points overlay
      map.addSource('selected-facilities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'selected-point',
        type: 'circle',
        source: 'selected-facilities',
        paint: {
          'circle-color': '#F59E0B',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#111827'
        }
      });

      // Cluster click to zoom
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource('facilities') as mapboxgl.GeoJSONSource;
        if (!source) return;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
        });
      });

      // Point click -> add to compare & popup
      map.on('click', 'unclustered-point', (e) => {
        const f = e.features && e.features[0];
        if (!f) return;
        const props = f.properties as any;
        const facility: FacilityRow = {
          id: props.id,
          facility_id: props.facility_id,
          name: props.name,
          state: props.state,
          lat: Number(props.lat),
          lon: Number(props.lon),
          demand_assessment: props.demand_assessment,
          cost_assessment: props.cost_assessment,
          cost_assessment_2: props.cost_assessment_2,
        };

        addFacilityToCompare(facility);

        new mapboxgl.Popup({ closeButton: true })
          .setLngLat((f.geometry as any).coordinates)
          .setHTML(
            `<div style="font-family: Inter, system-ui, -apple-system;">
              <div style="font-weight:600; margin-bottom:4px;">${facility.name}</div>
              <div style="font-size:12px; color:#4B5563; margin-bottom:8px;">${facility.state || ''}</div>
              <button id="add-compare-btn" style="background:#10B981;color:white;padding:6px 10px;border-radius:6px;">Add to compare</button>
            </div>`
          )
          .addTo(map);
      });

      map.on('mouseenter', 'unclustered-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'unclustered-point', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter, initialZoom]);

  // Update map sources when facilities or selection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const features = mapFacilities.map((f) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
      properties: {
        id: f.id,
        facility_id: f.facility_id,
        name: f.name,
        state: f.state || '',
        lat: f.lat,
        lon: f.lon,
        demand_assessment: f.demand_assessment || '',
        cost_assessment: f.cost_assessment || '',
        cost_assessment_2: f.cost_assessment_2 || '',
      }
    }));

    const source = map.getSource('facilities') as mapboxgl.GeoJSONSource;
    if (source) source.setData({ type: 'FeatureCollection', features } as any);
  }, [mapFacilities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const features = selectedFacilities.map((f) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
      properties: { id: f.id }
    }));

    const source = map.getSource('selected-facilities') as mapboxgl.GeoJSONSource;
    if (source) source.setData({ type: 'FeatureCollection', features } as any);

    if (selectedFacilities.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      selectedFacilities.forEach((f) => bounds.extend([f.lon, f.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 700 });
    }
  }, [selectedFacilities]);

  async function addFacilityToCompare(facility: FacilityRow) {
    setInlineError(null);
    setSearchResults([]);
    setSearchQuery('');
    // Prevent duplicates
    const already = selectedFacilities.some((f) => f.facility_id === facility.facility_id);
    if (already) return;
    if (selectedFacilities.length >= MAX_COMPARE) {
      setInlineError('You can only compare up to 5 facilities.');
      return;
    }

    const availabilityCounts = await fetchAvailabilityCountsForFacility(
      facility.facility_id,
      windowStart,
      addDays(windowStart, daysCount - 1)
    );

    setSelectedFacilities((prev) => [
      ...prev,
      { ...facility, availabilityCounts }
    ]);

    // Ensure this facility is included in the map points, in case it wasn't
    setMapFacilities((prev) => {
      const exists = prev.some((p) => p.facility_id === facility.facility_id);
      return exists ? prev : [...prev, facility];
    });
  }

  function removeFacilityFromCompare(facilityId: string) {
    setSelectedFacilities((prev) => prev.filter((f) => f.facility_id !== facilityId));
  }

  // When date window changes, refresh availability for selected facilities
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (selectedFacilities.length === 0) return;
      const start = windowStart;
      const end = addDays(windowStart, daysCount - 1);

      const updated = await Promise.all(
        selectedFacilities.map(async (f) => {
          const counts = await fetchAvailabilityCountsForFacility(f.facility_id, start, end);
          return { ...f, availabilityCounts: counts } as SelectedFacility;
        })
      );
      if (!cancelled) setSelectedFacilities(updated);
    };
    run();
    return () => { cancelled = true; };
  }, [windowStart, daysCount]);

  async function fetchAvailabilityCountsForFacility(
    facilityId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, number>> {
    try {
      // Find month buckets covering the range
      const months = new Set<string>();
      const anchor = new Date(startDate);
      anchor.setDate(1);
      const endAnchor = new Date(endDate);
      endAnchor.setDate(1);
      const cursor = new Date(anchor);
      while (cursor <= endAnchor) {
        months.add(format(cursor, 'yyyy-MM-01'));
        cursor.setMonth(cursor.getMonth() + 1);
      }

      const monthList = Array.from(months);
      const { data, error } = await supabase
        .from('availability_results')
        .select('facility_id, campsite_id, month_date, availabilities')
        .eq('facility_id', facilityId)
        .in('month_date', monthList);
      if (error) throw error;

      const counts: Record<string, number> = {};
      const interval = { start: startDate, end: endDate };

      (data as AvailabilityRow[]).forEach((row) => {
        if (!row.availabilities) return;
        for (const [dateStr, status] of Object.entries(row.availabilities)) {
          const d = parseISO(dateStr);
          if (isWithinInterval(d, interval) && status === 'Available') {
            counts[dateStr] = (counts[dateStr] || 0) + 1;
          }
        }
      });

      return counts;
    } catch (e) {
      console.error('Availability fetch error', e);
      return {};
    }
  }

  function shiftWindow(days: number) {
    setWindowStart((prev) => addDays(prev, days));
  }

  function availabilityCellColor(count: number | undefined) {
    if (!count || count <= 0) return 'bg-gray-200 text-gray-500';
    if (count >= 10) return 'bg-green-600 text-white';
    if (count >= 5) return 'bg-green-500 text-white';
    return 'bg-green-300 text-gray-900';
  }

  return (
    <SidebarLayout>
      <Head>
        <title>Compare Availability - BaseLodge</title>
      </Head>
      <div className={`${inter.className} flex flex-col h-[calc(100vh-64px)]`}> {/* account for sidebar header padding */}
        {/* Top bar / filters */}
        <div className="border-b bg-white">
          <div className="px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search facilities by name..."
                  className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow max-h-72 overflow-auto">
                    {searchResults.map((f) => (
                      <div
                        key={`${f.id}-${f.facility_id}`}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => addFacilityToCompare(f)}
                      >
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-gray-500">{f.state || ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg py-2 px-2"
                >
                  <option value="">All states</option>
                  {/* A small curated list; consider dynamic later */}
                  {['CA','OR','WA','AZ','NV','UT','ID','CO','WY','MT','NM'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={costFilter}
                  onChange={(e) => setCostFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg py-2 px-2"
                >
                  <option value="">Any cost</option>
                  {['Bargain','Affordable','Expensive','Very expensive'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={demandFilter}
                  onChange={(e) => setDemandFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg py-2 px-2"
                >
                  <option value="">Any demand</option>
                  {['Low','Medium','High'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Selected: {selectedFacilities.length}/{MAX_COMPARE}
            </div>
          </div>
          {inlineError && (
            <div className="px-4 pb-3 text-sm text-red-600">{inlineError}</div>
          )}
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden border-b bg-white">
          <div className="px-4 py-2 flex gap-2">
            <button
              className={`px-3 py-1 rounded ${activeTab==='map' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setActiveTab('map')}
            >Map</button>
            <button
              className={`px-3 py-1 rounded ${activeTab==='calendar' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setActiveTab('calendar')}
            >Calendar</button>
          </div>
        </div>

        {/* Main area: Map left, Calendar right */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 h-full">
          {/* Map pane */}
          <div className={`relative ${activeTab==='map' ? 'block' : 'hidden'} md:block`}>
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-500">Loading map...</div>
            ) : (
              <div ref={mapContainerRef} className="absolute inset-0" />
            )}
          </div>

          {/* Calendar pane */}
          <div className={`border-l bg-white flex flex-col ${activeTab==='calendar' ? 'block' : 'hidden'} md:block`}>
            {/* Selected facilities list with remove */}
            <div className="px-4 py-3 border-b">
              {selectedFacilities.length === 0 ? (
                <div className="text-gray-500">Select up to 5 facilities to compare.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedFacilities.map((f) => (
                    <div key={f.facility_id} className="flex items-center gap-2 bg-gray-100 rounded-full py-1 pl-3 pr-2">
                      <span className="text-sm">{f.name}</span>
                      <button
                        onClick={() => removeFacilityFromCompare(f.facility_id)}
                        className="text-gray-500 hover:text-red-600"
                        aria-label={`Remove ${f.name}`}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date controls */}
            <div className="px-4 py-2 flex items-center gap-2 border-b">
              <button className="px-2 py-1 rounded bg-gray-100" onClick={() => shiftWindow(-7)}>&larr; 7d</button>
              <div className="font-medium">{format(windowStart, 'MMM d, yyyy')} – {format(addDays(windowStart, daysCount - 1), 'MMM d, yyyy')}</div>
              <button className="px-2 py-1 rounded bg-gray-100" onClick={() => shiftWindow(7)}>7d &rarr;</button>
              <div className="ml-auto flex items-center gap-2 text-sm">
                <span>Range:</span>
                <select value={daysCount} onChange={(e) => setDaysCount(Number(e.target.value))} className="border rounded px-2 py-1">
                  {[14, 21, 30].map((n) => (<option key={n} value={n}>{n} days</option>))}
                </select>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="flex-1 overflow-x-auto">
              {selectedFacilities.length === 0 ? (
                <div className="p-6 text-gray-500">No facilities selected.</div>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 z-20 min-w-[220px]">Facility</th>
                      {dateList.map((d) => (
                        <th key={d.toISOString()} className="px-2 py-2 text-center text-xs text-gray-600 min-w-[48px]">
                          <div>{format(d, 'EEE')}</div>
                          <div className="font-semibold">{format(d, 'd')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFacilities.map((f) => (
                      <tr key={f.facility_id} className="border-t">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-3">
                            <span>{f.name}</span>
                            <button
                              onClick={() => removeFacilityFromCompare(f.facility_id)}
                              className="text-xs text-gray-500 hover:text-red-600"
                            >Remove</button>
                          </div>
                        </td>
                        {dateList.map((d) => {
                          const dateStr = format(d, 'yyyy-MM-dd');
                          const count = f.availabilityCounts[dateStr] || 0;
                          return (
                            <td key={dateStr} className="px-1 py-2 text-center">
                              <div
                                title={`${count} site${count === 1 ? '' : 's'} available at ${f.name} on ${format(d, 'MMM d')}`}
                                className={`mx-auto w-10 h-10 rounded ${availabilityCellColor(count)} flex items-center justify-center text-sm font-semibold`}
                                onClick={() => {
                                  if (count > 0 && typeof window !== 'undefined') {
                                    if ((window as any).open) {
                                      // Future: deep link to rec.gov reservation page if available
                                      (window as any).open(f.reservation_url || 'https://www.recreation.gov', '_blank');
                                    }
                                  }
                                }}
                              >
                                {count > 0 ? count : ''}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-t text-sm text-gray-600 flex items-center gap-4">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-600 inline-block" /> 10+ sites</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> 5–9</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-300 inline-block" /> 1–4</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> none</div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
} 