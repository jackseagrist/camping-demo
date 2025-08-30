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
  // NEW: List of facilities to show availability for
  selectedFacilities?: any[];
  // NEW: Trip date picker props
  tripId?: string;
  startDate?: string;
  endDate?: string;
  onDateChange?: (field: 'start_date' | 'end_date', value: string) => void;
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
  selectedFacilities = [],
  tripId: tripIdProp,
  startDate,
  endDate,
  onDateChange,
}: AvailabilityCalendarProps) {
  const router = useRouter();
  const tripId = router.query.trip_id as string | undefined;
  const supabase = createClientComponentClient();

  // Debug logging
  console.log('🔍 AvailabilityCalendar props:', { 
    facilityIdOverride, 
    selectedFacilities: selectedFacilities?.length || 0,
    tripIdProp,
    startDate,
    endDate,
    hasOnDateChange: !!onDateChange,
    selectedFacilitiesData: selectedFacilities 
  });

  // Month window: single month
  const [currentMonth, setCurrentMonth] = useState<Date>(() => 
    initialMonth ? new Date(initialMonth) : startOfMonth(new Date())
  );

  const start = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const end = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);

  const [facilityUuid, setFacilityUuid] = useState<string | null>(facilityIdOverride ?? null);
  const [facilityId, setFacilityId] = useState<string | null>(null); // The numeric facility_id from facilities table
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AvailRow[]>([]);
  const [facilityAvailabilityData, setFacilityAvailabilityData] = useState<Record<string, Record<string, number | null>>>({});

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

  // Fetch availability for window (only when not using selectedFacilities and we have a facility)
  useEffect(() => {
    // Don't fetch campsite data if:
    // 1. We don't have a facilityId 
    // 2. We're using selectedFacilities (facility-level view)
    // 3. selectedFacilities is undefined (no facilities to show)
    if (!facilityId || selectedFacilities !== null) return;
    
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
  }, [facilityId, start, end, supabase, selectedFacilities]);

  // Fetch availability data for selected facilities
  useEffect(() => {
    console.log('🔍 AvailabilityCalendar selectedFacilities useEffect triggered:', selectedFacilities?.length || 0);
    console.log('🔍 selectedFacilities array:', selectedFacilities);
    console.log('🔍 start date:', start);
    console.log('🔍 end date:', end);
    
    if (!selectedFacilities || selectedFacilities.length === 0) {
      console.log('⚠️ No selectedFacilities provided, skipping facility availability fetch');
      setLoading(false);
      return;
    }
    
    let isCancelled = false;
    (async () => {
      setLoading(true);
      
      const startMonth = ymd(startOfMonth(start));
      const endMonth = ymd(startOfMonth(end));
      
                console.log('🔍 Fetching availability for selected facilities:', selectedFacilities.length);
          console.log('🔍 Current month for fetching:', ymd(startOfMonth(start)));
      
      const facilityAvailability: Record<string, Record<string, number>> = {};
      
      // Process each selected facility
      for (const facility of selectedFacilities) {
        const facilityKey = facility.facility_id || facility.id;
        if (!facilityKey) continue;
        
        try {
          // First get the numeric facility_id from the facilities table
          const { data: facilityData, error: facilityError } = await supabase
            .from('facilities')
            .select('facility_id')
            .eq('id', facility.id || facility.facility_id)
            .single();
            
          if (facilityError || !facilityData?.facility_id) {
            console.warn(`Could not find numeric facility_id for facility:`, facility.name);
            facilityAvailability[facilityKey] = {};
            continue;
          }
          
          const numericFacilityId = String(facilityData.facility_id);
          
          // Query availability data for the current month
          // Handle both date formats in month_date column: "2025-09-01" and "2025-09-01T00:00:00.000Z"
          const currentMonthStart = ymd(startOfMonth(start));
          
          const { data: availData, error: availError } = await supabase
            .from('availability_results')
            .select('campsite_id, month_date, availabilities')
            .eq('facility_id', numericFacilityId)
            .or(`month_date.eq.${currentMonthStart},month_date.eq.${currentMonthStart}T00:00:00.000Z`);

          if (availError) {
            console.warn(`Error fetching availability for facility ${facility.name}:`, availError);
            facilityAvailability[facilityKey] = {};
            continue;
          }

          console.log(`🔍 Raw availability data for ${facility.name}:`, availData?.length || 0, 'rows');
          if (availData && availData.length > 0) {
            console.log(`   Sample month_date values:`, availData.map(row => row.month_date).slice(0, 3));
          }

          // Process availability data to count available sites per day
          const dailyCounts: Record<string, number | null> = {};
          const datesWithData = new Set<string>();
          
          if (availData && availData.length > 0) {
            // First pass: collect all dates that have ANY data
            for (const row of availData) {
              const availabilities = row.availabilities || {};
              for (const dateKey of Object.keys(availabilities)) {
                datesWithData.add(dateKey);
              }
            }
            
            // Second pass: count available sites for each date with data
            for (const dateKey of datesWithData) {
              let availableCount = 0;
              let hasDataForThisDate = false;
              
              for (const row of availData) {
                const availabilities = row.availabilities || {};
                if (availabilities.hasOwnProperty(dateKey)) {
                  hasDataForThisDate = true;
                  if (availabilities[dateKey] === 'Available') {
                    availableCount++;
                  }
                }
              }
              
              // Only set count if we actually have data for this date
              if (hasDataForThisDate) {
                // Convert ISO date format to simple YYYY-MM-DD format to match calendar
                const normalizedDateKey = dateKey.split('T')[0];
                dailyCounts[normalizedDateKey] = availableCount;
              }
            }
          }
          
          facilityAvailability[facilityKey] = dailyCounts;
          console.log(`✅ Processed ${facility.name}: ${Object.keys(dailyCounts).length} days of data`);
          console.log(`   Sample data for ${facility.name}:`, Object.entries(dailyCounts).slice(0, 5));
          
        } catch (error) {
          console.error(`Error processing facility ${facility.name}:`, error);
          facilityAvailability[facilityKey] = {};
        }
      }
      
      if (isCancelled) return;
      
      setFacilityAvailabilityData(facilityAvailability);
      setLoading(false);
    })();
    
    return () => { isCancelled = true; };
  }, [selectedFacilities, start, end, supabase]);

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

  // Clear campsite rows when no facilities are selected
  useEffect(() => {
    if (!selectedFacilities && !facilityId) {
      console.log('🔍 Clearing rows - no facilities to show');
      setRows([]);
      setError(null);
    }
  }, [selectedFacilities, facilityId]);

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
  const goToPrevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(startOfMonth(new Date()));

  // All days for the single month
  const monthDays = days;

  // Density classes - uniform width cells
  const cellSizeClass = density === 'compact' ? 'h-7' : 'h-8';
  const headerTextSize = 'text-xs';

  // Simple guard for extreme row counts (future-proof before full virtualization)
  const MAX_ROWS_NON_VIRTUAL = 40;
  const tooManyRows = campsiteIds.length > MAX_ROWS_NON_VIRTUAL && (!selectedCampsiteIds || selectedCampsiteIds.length === 0);
  const rowsToRender = tooManyRows ? campsiteIds.slice(0, MAX_ROWS_NON_VIRTUAL) : campsiteIds;

  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // Helper function to check if a date is within the trip date range
  const isDateInTripRange = (date: Date): boolean => {
    if (!startDate || !endDate) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const start = startDate;
    const end = endDate;
    
    return dateStr >= start && dateStr < end;
  };

  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}>
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Availability</h2>
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
        
        {/* Trip Date Pickers */}
        {(tripIdProp || tripId) && onDateChange && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input 
                type="date" 
                value={startDate || ''}
                onChange={(e) => onDateChange('start_date', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input 
                type="date" 
                value={endDate || ''}
                onChange={(e) => onDateChange('end_date', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Date range display */}
      <div className="mb-3 text-sm text-gray-700 font-medium">
        {format(currentMonth, 'MMMM yyyy')}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">Error: {error}</p>
        </div>
      )}

      {/* Legend */}
      <div className="mb-3 flex items-center gap-5 text-xs">
        {selectedFacilities && selectedFacilities.length > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 inline-block bg-green-500 rounded border text-white text-center text-[8px] leading-[14px] font-bold">3</span>
              <span>Sites Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 inline-block bg-red-500 rounded border text-white text-center text-[8px] leading-[14px] font-bold">0</span>
              <span>No Availability</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 inline-block bg-gray-200 rounded border text-gray-500 text-center text-[8px] leading-[14px]">—</span>
              <span>No Data</span>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Calendar Grid */}
      <div ref={tableContainerRef} className="overflow-auto border rounded-lg bg-white shadow-sm max-h-96" role="grid" aria-rowcount={rowsToRender.length}>
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th className="sticky left-0 bg-gray-50 z-20 text-left p-2.5 border-b border-gray-200 font-medium text-gray-900 min-w-[120px]">
                {selectedFacilities && selectedFacilities.length > 0 ? 'Facility' : 'Campsite'}
              </th>
              {/* Month header */}
              <th 
                className={`text-center p-2 border-b border-gray-200 font-medium text-gray-700 ${headerTextSize}`}
                colSpan={monthDays.length}
              >
                {format(currentMonth, 'MMMM yyyy')}
              </th>
            </tr>
            <tr>
              <th className="sticky left-0 bg-gray-50 z-20 border-b border-gray-200"></th>
              {days.map(d => {
                const isInTripRange = isDateInTripRange(d);
                return (
                  <th 
                    key={ymd(d)} 
                    className={`text-center p-1 border-b border-gray-200 ${headerTextSize} ${
                      isInTripRange 
                        ? 'bg-gray-700 text-white' 
                        : 'text-gray-600'
                    }`} 
                    style={{width: '48px', minWidth: '48px', maxWidth: '48px'}}
                  >
                    <div className="flex flex-col items-center">
                      <div className="font-medium">{format(d, 'd')}</div>
                      <div className={`text-xs mt-0.5 ${
                        isInTripRange ? 'text-gray-300' : 'text-gray-500'
                      }`}>{format(d, 'EE')}</div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-6 text-gray-500 text-center" colSpan={days.length + 1}>
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Loading availability…
                  </div>
                </td>
              </tr>
            )}
            {!loading && selectedFacilities && selectedFacilities.length === 0 && (
              <tr>
                <td className="p-6 text-gray-500 text-center" colSpan={days.length + 1}>
                  Add campgrounds to your comparison to see availability
                </td>
              </tr>
            )}
            {!loading && selectedFacilities && selectedFacilities.length > 0 && (
              selectedFacilities.map(facility => {
                const facilityKey = facility.facility_id || facility.id;
                const facilityData = facilityAvailabilityData[facilityKey] || {};
                
                console.log('🔍 Rendering facility row:', facility.name, 'facilityKey:', facilityKey, 'facilityData keys:', Object.keys(facilityData));
                
                return (
                  <tr key={facilityKey} className="hover:bg-gray-50/50" style={{height: '60px'}}>
                    <td className="sticky left-0 bg-white z-10 border-r border-gray-200 p-2.5 text-sm font-medium text-gray-900 align-middle" style={{height: '60px', minHeight: '60px'}}>
                      <div className="flex items-center h-full">
                        {facility.name || 'Unnamed Facility'}
                      </div>
                    </td>
                    {days.map(d => {
                      const key = ymd(d);
                      const availableCount = facilityData[key];
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      
                      // Debug: log first few date lookups
                      if (d.getDate() <= 3) {
                        console.log(`🔍 Looking up date ${key} for ${facility.name}: availableCount=${availableCount}, facilityDataKeys=${Object.keys(facilityData).slice(0, 5)}`);
                      }
                      
                      // Determine cell styling based on availability count
                      let cellClass = '';
                      let displayValue = '';
                      let tooltipText = '';
                      
                      if (availableCount === undefined || availableCount === null) {
                        // No data available for this date
                        cellClass = 'bg-gray-200 text-gray-500';
                        displayValue = '—';
                        tooltipText = 'No data';
                      } else if (availableCount === 0) {
                        // Data exists but no sites available - uniform red color
                        cellClass = 'bg-red-500 text-white';
                        displayValue = '0';
                        tooltipText = 'No sites available';
                      } else {
                        // Data exists and sites are available
                        cellClass = 'bg-green-500 text-white';
                        displayValue = availableCount.toString();
                        tooltipText = `${availableCount} site${availableCount > 1 ? 's' : ''} available`;
                      }
                      
                      return (
                        <td
                          key={key}
                          className={`border-r border-gray-100 text-center align-middle p-1 ${
                            isWeekend ? 'opacity-80' : ''
                          }`}
                          style={{width: '48px', minWidth: '48px', maxWidth: '48px', height: '60px', minHeight: '60px'}}
                          title={`${facility.name} • ${format(d, 'MMM d, yyyy')} • ${tooltipText}`}
                        >
                          <div className={`w-full h-full flex items-center justify-center rounded font-medium text-sm ${cellClass}`}>
                            {displayValue}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
            {!loading && (!selectedFacilities || selectedFacilities.length === 0) && facilityId && rowsToRender.length === 0 && (
              <tr>
                <td className="p-6 text-gray-500 text-center" colSpan={days.length + 1}>
                  {selectedCampsiteIds && selectedCampsiteIds.length === 0
                    ? 'Pick up to 5 campsites from the map to compare.'
                    : 'No availability data in this range.'}
                </td>
              </tr>
            )}
            {!loading && (!selectedFacilities || selectedFacilities.length === 0) && facilityId && rowsToRender.map(cid => (
              <tr key={cid} className="hover:bg-gray-50/50" style={{height: '60px'}}>
                <td className="sticky left-0 bg-white z-10 border-r border-gray-200 p-2.5 text-sm font-medium text-gray-900 align-middle" style={{height: '60px', minHeight: '60px'}}>
                  <div className="flex items-center h-full">
                    Site {cid}
                  </div>
                </td>
                {days.map(d => {
                  const key = ymd(d);
                  const status = calendarMap[cid]?.[key] ?? 'no_data';
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  
                  return (
                    <td
                      key={key}
                      className={`border-r border-gray-100 text-center align-middle p-1 ${
                        isWeekend ? 'opacity-80' : ''
                      }`}
                      style={{width: '48px', minWidth: '48px', maxWidth: '48px', height: '60px', minHeight: '60px'}}
                      title={`Site ${cid} • ${format(d, 'MMM d, yyyy')} • ${getStatusLabel(status)}`}
                      aria-label={`Site ${cid} ${format(d, 'MMMM d, yyyy')} ${getStatusLabel(status)}`}
                    >
                      <div className={`w-full h-full flex items-center justify-center rounded relative ${getCellClass(status)}`}>
                        {status === 'available' && (
                          <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                        )}
                        {status === 'reserved' && (
                          <svg className="w-3 h-3 text-red-700" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary info */}
      {!loading && (
        <div className="mt-3 text-xs text-gray-500">
          {selectedFacilities && selectedFacilities.length > 0 ? (
            <span>
              Showing {selectedFacilities.length} facilit{selectedFacilities.length !== 1 ? 'ies' : 'y'} across {days.length} days
            </span>
          ) : (
            rowsToRender.length > 0 && (
              <span>
                Showing {rowsToRender.length} campsite{rowsToRender.length !== 1 ? 's' : ''} across {days.length} days
                {tooManyRows && (
                  <span className="ml-2 text-gray-400">(showing first {MAX_ROWS_NON_VIRTUAL}; refine selection to compare)</span>
                )}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
} 