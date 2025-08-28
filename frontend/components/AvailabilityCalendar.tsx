// components/availabilitycalendar.tsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format, startOfMonth, endOfMonth, addMonths, eachDayOfInterval } from 'date-fns';

// SCHEMA_NOTE: Database schema mappings:
// - trips.facility_id (UUID reference to facilities)
// - availability_results.facility_id (text field, not UUID)
// - availability_results.campsite_id (text/UUID campsite identifier)
// - availability_results.month_date (date field for the month)
// - availability_results.availabilities (jsonb object with date keys and status values)

type AvailabilityStatus = 'available' | 'reserved' | 'no_data';

type AvailRow = {
  campsite_id: string;
  month_date: string;  // YYYY-MM-DD (month start date)
  availabilities: Record<string, string>; // JSONB object: { "2024-01-01": "Available", "2024-01-02": "Reserved", ... }
};

type CampsiteCalendarMap = Record<string, Record<string, AvailabilityStatus>>;

export type AvailabilityCalendarProps = {
  // Optional: allow parent to override facilityId, else we derive from tripId
  facilityIdOverride?: string;
  // Optional: initialMonth (YYYY-MM-01) for deep linking scenarios
  initialMonth?: string;
  className?: string;
  // NEW: render only these campsite ids (compare up to 5)
  selectedCampsiteIds?: string[];
  // NEW: density presets
  density?: 'compact' | 'cozy';
  // NEW: optional future streak highlight length (not yet visualized)
  highlightStreak?: number;
};

function ymd(d: Date) { 
  return format(d, 'yyyy-MM-dd'); 
}

// Export a helper for reuse in compare components
export function getDayKeys(start: Date, end: Date): string[] {
  return eachDayOfInterval({ start, end }).map(ymd);
}

export default function AvailabilityCalendar({
  facilityIdOverride,
  initialMonth,
  className = "",
  selectedCampsiteIds,
  density = 'compact',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  highlightStreak,
}: AvailabilityCalendarProps) {
  const router = useRouter();
  const tripId = router.query.trip_id as string | undefined;
  const supabase = createClientComponentClient();

  // Month window: two months (A and A+1)
  const [monthA, setMonthA] = useState<Date>(() => 
    initialMonth ? new Date(initialMonth) : startOfMonth(new Date())
  );
  const monthB = useMemo(() => addMonths(monthA, 1), [monthA]);

  const start = useMemo(() => startOfMonth(monthA), [monthA]);
  const end = useMemo(() => endOfMonth(monthB), [monthB]);

  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);

  const [facilityUuid, setFacilityUuid] = useState<string | null>(facilityIdOverride ?? null);
  const [facilityId, setFacilityId] = useState<string | null>(null); // The numeric facility_id from facilities table
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AvailRow[]>([]);

  // Resolve facility UUID from trip
  useEffect(() => {
    if (facilityIdOverride) {
      console.log('🔍 Using facility UUID override:', facilityIdOverride);
      setFacilityUuid(facilityIdOverride);
      return;
    }
    if (!tripId) {
      console.log('❌ No trip ID found in URL');
      return;
    }

    let isCancelled = false;
    (async () => {
      setLoading(true);
      console.log('🔍 Step 1: Fetching facility UUID for trip:', tripId);
      
      const { data, error } = await supabase
        .from('trips')
        .select('facility_id')
        .eq('id', tripId)
        .single();
        
      if (isCancelled) return;

      console.log('🔍 Trip query result:', { data, error });

      if (error) {
        console.error('❌ Trip query error:', error);
        setError(`Error fetching trip: ${error.message}`);
        setLoading(false);
        return;
      }
      if (!data?.facility_id) {
        console.log('❌ Trip has no facility_id');
        setError('Trip has no facility assigned.');
        setLoading(false);
        return;
      }
      
      console.log('✅ Found facility UUID:', data.facility_id, '(type:', typeof data.facility_id, ')');
      setFacilityUuid(data.facility_id);
    })();

    return () => { isCancelled = true; };
  }, [tripId, facilityIdOverride, supabase]);

  // Step 2: Get numeric facility_id and name from facilities table using UUID
  useEffect(() => {
    if (!facilityUuid) return;
    
    let isCancelled = false;
    (async () => {
      console.log('🔍 Step 2: Fetching numeric facility_id for UUID:', facilityUuid);
      
      const { data, error } = await supabase
        .from('facilities')
        .select('facility_id, name')
        .eq('id', facilityUuid)
        .single();
        
      if (isCancelled) return;
      
      console.log('🔍 Facilities query result:', { data, error });
      
      if (error) {
        console.error('❌ Facilities query error:', error);
        setError(`Error fetching facility details: ${error.message}`);
        setLoading(false);
        return;
      }
      
      if (!data?.facility_id) {
        console.log('❌ Facility record has no facility_id');
        setError('Facility has no facility_id assigned.');
        setLoading(false);
        return;
      }
      
      console.log('✅ Found numeric facility_id:', data.facility_id, '(type:', typeof data.facility_id, ')');
      console.log('✅ Found facility name:', data.name);
      
      setFacilityId(String(data.facility_id)); // Ensure it's a string
      setFacilityName(data.name);
    })();
    
    return () => { isCancelled = true; };
  }, [facilityUuid, supabase]);

  // Fetch availability for window
  useEffect(() => {
    if (!facilityId) return;
    
    let isCancelled = false;
    (async () => {
      setLoading(true);
      
      // Query for months that overlap with our date range
      const startMonth = ymd(startOfMonth(start));
      const endMonth = ymd(startOfMonth(end));
      
      console.log('🔍 Step 3: Querying availability_results with numeric facility_id');
      console.log('  - Numeric Facility ID:', facilityId);
      console.log('  - Date range:', ymd(start), 'to', ymd(end));
      console.log('  - Month range:', startMonth, 'to', endMonth);
      
      const { data, error } = await supabase
        .from('availability_results')
        .select('campsite_id, month_date, availabilities')
        .eq('facility_id', facilityId)
        .gte('month_date', startMonth)
        .lte('month_date', endMonth);

      if (isCancelled) return;

      console.log('  - Query result:', { data, error });
      console.log('  - Raw data length:', data?.length || 0);

      if (error) {
        console.error('❌ Availability query error:', error);
        setError(`Error fetching availability: ${error.message}`);
        setRows([]);
        setLoading(false);
        return;
      }

      // Process rows - no need to transform since we're keeping the raw structure
      const processedRows = (data ?? []).map(row => ({
        campsite_id: String(row.campsite_id),
        month_date: row.month_date,
        availabilities: row.availabilities || {}
      }));
      
      console.log('  - Processed rows:', processedRows.length);
      if (processedRows.length > 0) {
        console.log('  - Sample row:', processedRows[0]);
        console.log('  - Sample availabilities keys:', Object.keys(processedRows[0].availabilities || {}));
        console.log('  - Sample availabilities values:', Object.values(processedRows[0].availabilities || {}));
        
        // Show a few sample date/status pairs
        const sampleAvails = processedRows[0].availabilities || {};
        const sampleKeys = Object.keys(sampleAvails).slice(0, 3);
        console.log('  - Sample date/status pairs:');
        sampleKeys.forEach(key => {
          console.log(`    ${key}: ${sampleAvails[key]}`);
        });
      }
      
      setRows(processedRows);
      setError(null);
      setLoading(false);
    })();
    
    return () => { isCancelled = true; };
  }, [facilityId, start, end, supabase]);

  const allCampsiteIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      s.add(String(r.campsite_id));
    }
    const result = Array.from(s).sort((a, b) => {
      // Try to sort numerically if possible, otherwise alphabetically
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
    
    console.log('🔍 Generated campsite IDs:', result);
    return result;
  }, [rows]);

  // Filter down to selected set (<=5) when provided
  const campsiteIds = useMemo(() => {
    if (!selectedCampsiteIds || selectedCampsiteIds.length === 0) return allCampsiteIds;
    const set = new Set(selectedCampsiteIds.map(String));
    const filtered = allCampsiteIds.filter(id => set.has(String(id)));
    console.log('🔍 Filtered campsite IDs by selection:', filtered);
    return filtered;
  }, [allCampsiteIds, selectedCampsiteIds]);

  const calendarMap: CampsiteCalendarMap = useMemo(() => {
    const map: CampsiteCalendarMap = {};
    for (const id of allCampsiteIds) map[id] = {};
    
    console.log('🔍 Building calendar map from', rows.length, 'rows');
    
    // Process each availability record
    for (const r of rows) {
      const cid = String(r.campsite_id);
      if (!map[cid]) map[cid] = {};
      
      // Process the availabilities JSONB object
      if (r.availabilities && typeof r.availabilities === 'object') {
        const availabilityCount = Object.keys(r.availabilities).length;
        console.log(`  - Processing campsite ${cid} with ${availabilityCount} availability entries`);
        
        for (const [dateStr, status] of Object.entries(r.availabilities)) {
          // Convert ISO date to YYYY-MM-DD format to match our calendar grid
          const normalizedDate = dateStr.split('T')[0]; // "2025-08-01T00:00:00Z" -> "2025-08-01"
          
          // Normalize status from the database values
          let normalizedStatus: AvailabilityStatus;
          const statusLower = (status as string | undefined)?.toLowerCase();
          if (statusLower === 'available') {
            normalizedStatus = 'available';
          } else if (statusLower === 'reserved' || statusLower === 'not reservable') {
            normalizedStatus = 'reserved';
          } else {
            normalizedStatus = 'no_data';
          }
          
          map[cid][normalizedDate] = normalizedStatus;
          
          // Log first few entries for debugging
          if (Object.keys(map[cid]).length <= 3) {
            console.log(`    ${dateStr} -> ${normalizedDate}: "${status}" -> "${normalizedStatus}"`);
          }
        }
      } else {
        console.log(`  - Campsite ${cid} has no availabilities object`);
      }
    }
    
    // Fill No Data for missing dates
    const dayKeys = days.map(ymd);
    console.log('🔍 Date range being displayed:', dayKeys[0], 'to', dayKeys[dayKeys.length - 1]);
    
    for (const cid of allCampsiteIds) {
      let noDataCount = 0;
      for (const d of dayKeys) {
        if (!map[cid][d]) {
          map[cid][d] = 'no_data';
          noDataCount++;
        }
      }
      console.log(`  - Campsite ${cid}: ${Object.keys(map[cid]).length - noDataCount} data entries, ${noDataCount} no-data entries`);
    }
    
    return map;
  }, [rows, days, allCampsiteIds]);

  function getCellClass(status: AvailabilityStatus) {
    switch (status) {
      case 'available':
        return 'bg-emerald-500/70 hover:bg-emerald-500/90 cursor-pointer';
      case 'reserved':
        return 'bg-red-400/60 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.25)_6px,rgba(255,255,255,0.25)_12px)]';
      case 'no_data':
      default:
        return 'border border-dashed border-gray-300 bg-white';
    }
  }

  function getStatusLabel(status: AvailabilityStatus) {
    switch (status) {
      case 'available': return 'Available';
      case 'reserved': return 'Reserved';
      case 'no_data': return 'No data';
      default: return 'Unknown';
    }
  }

  // Month navigation functions
  const goToPrevMonth = () => setMonthA(addMonths(monthA, -1));
  const goToNextMonth = () => setMonthA(addMonths(monthA, 1));
  const goToToday = () => setMonthA(startOfMonth(new Date()));

  // Group days by month for better header display
  const monthADays = days.filter(day => day >= start && day <= endOfMonth(monthA));
  const monthBDays = days.filter(day => day >= startOfMonth(monthB) && day <= end);

  // Density classes
  const cellSizeClass = density === 'compact' ? 'h-7 w-7' : 'h-8 w-8';
  const headerTextSize = 'text-xs';

  // Simple guard for extreme row counts (future-proof before full virtualization)
  const MAX_ROWS_NON_VIRTUAL = 40;
  const tooManyRows = campsiteIds.length > MAX_ROWS_NON_VIRTUAL && (!selectedCampsiteIds || selectedCampsiteIds.length === 0);
  const rowsToRender = tooManyRows ? campsiteIds.slice(0, MAX_ROWS_NON_VIRTUAL) : campsiteIds;

  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Availability</h2>
          {facilityName ? (
            <p className="text-sm text-gray-600">{facilityName}</p>
          ) : facilityId ? (
            <p className="text-sm text-gray-600">Facility: {facilityId}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={goToPrevMonth} 
            className="px-2.5 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            disabled={loading}
            aria-label="Previous month"
          >
            ← Prev
          </button>
          <button 
            onClick={goToToday} 
            className="px-2.5 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            disabled={loading}
            aria-label="Go to current month"
          >
            Today
          </button>
          <button 
            onClick={goToNextMonth} 
            className="px-2.5 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            disabled={loading}
            aria-label="Next month"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Date range display */}
      <div className="mb-3 text-sm text-gray-700 font-medium">
        {format(monthA, 'MMMM yyyy')} – {format(monthB, 'MMMM yyyy')}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">Error: {error}</p>
        </div>
      )}

      {/* Legend (minimal) */}
      <div className="mb-3 flex items-center gap-5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 inline-block bg-emerald-500/70 rounded border" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 inline-block bg-red-400/60 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.25)_6px,rgba(255,255,255,0.25)_12px)] rounded border" />
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 inline-block border border-dashed border-gray-300 rounded bg-white" />
          <span>No Data</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div ref={tableContainerRef} className="overflow-auto border rounded-lg bg-white shadow-sm max-h-96" role="grid" aria-rowcount={rowsToRender.length}>
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th className="sticky left-0 bg-gray-50 z-20 text-left p-2.5 border-b border-gray-200 font-medium text-gray-900 min-w-[120px]">
                Campsite
              </th>
              {/* Month A header */}
              <th 
                className={`text-center p-2 border-b border-gray-200 font-medium text-gray-700 ${headerTextSize}`}
                colSpan={monthADays.length}
              >
                {format(monthA, 'MMMM')}
              </th>
              {/* Month B header */}
              <th 
                className={`text-center p-2 border-b border-gray-200 font-medium text-gray-700 ${headerTextSize}`}
                colSpan={monthBDays.length}
              >
                {format(monthB, 'MMMM')}
              </th>
            </tr>
            <tr>
              <th className="sticky left-0 bg-gray-50 z-20 border-b border-gray-200"></th>
              {days.map(d => (
                <th key={ymd(d)} className={`text-center p-1 border-b border-gray-200 w-8 ${headerTextSize} text-gray-600`}>
                  {format(d, 'd')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rowsToRender.length === 0 && (
              <tr>
                <td className="p-6 text-gray-500 text-center" colSpan={days.length + 1}>
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Loading availability…
                  </div>
                </td>
              </tr>
            )}
            {!loading && rowsToRender.length === 0 && (
              <tr>
                <td className="p-6 text-gray-500 text-center" colSpan={days.length + 1}>
                  {selectedCampsiteIds && selectedCampsiteIds.length === 0
                    ? 'Pick up to 5 campsites from the map to compare.'
                    : 'No availability data in this range.'}
                </td>
              </tr>
            )}
            {rowsToRender.map(cid => (
              <tr key={cid} className="hover:bg-gray-50/50">
                <td className="sticky left-0 bg-white z-10 border-r border-gray-200 p-2.5 text-sm font-medium text-gray-900">
                  Site {cid}
                </td>
                {days.map(d => {
                  const key = ymd(d);
                  const status = calendarMap[cid]?.[key] ?? 'no_data';
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  
                  return (
                    <td
                      key={key}
                      className={`${cellSizeClass} border-r border-gray-100 text-center align-middle relative ${getCellClass(status)} ${
                        isWeekend ? 'bg-gray-50/40' : ''
                      }`}
                      title={`Site ${cid} • ${format(d, 'MMM d, yyyy')} • ${getStatusLabel(status)}`}
                      aria-label={`Site ${cid} ${format(d, 'MMMM d, yyyy')} ${getStatusLabel(status)}`}
                    >
                      {status === 'available' && (
                        <div className="absolute inset-1 rounded-full bg-emerald-600"></div>
                      )}
                      {status === 'reserved' && (
                        <div className="absolute inset-1 flex items-center justify-center">
                          <svg className="w-3 h-3 text-red-700" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary info */}
      {!loading && rowsToRender.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          Showing {rowsToRender.length} campsite{rowsToRender.length !== 1 ? 's' : ''} across {days.length} days
          {tooManyRows && (
            <span className="ml-2 text-gray-400">(showing first {MAX_ROWS_NON_VIRTUAL}; refine selection to compare)</span>
          )}
        </div>
      )}
    </div>
  );
} 