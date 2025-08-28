import React, { useMemo, useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import CampsiteMiniRow from './CampsiteMiniRow';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type FacilityRow = {
  id: string;           // facilities.id (uuid)
  facility_id: string;  // rec.gov numeric id as string
  name: string;
  lon: number;
  lat: number;
};

type FacilityCompareRowProps = {
  facility: FacilityRow;
  dateStart: Date;
  daysCount: number;
  availabilityCounts: Record<string, number>;
  onRemove?: (facilityId: string) => void;
};

type CampsiteSlice = {
  campsite_id: string;
  statusByDay: Record<string, 'available' | 'reserved' | 'no_data'>;
};

function ymd(d: Date) { return format(d, 'yyyy-MM-dd'); }

export default function FacilityCompareRow({ facility, dateStart, daysCount, availabilityCounts, onRemove }: FacilityCompareRowProps) {
  const [open, setOpen] = useState(false);
  const [campsiteSlices, setCampsiteSlices] = useState<CampsiteSlice[] | null>(null);
  const supabase = createClientComponentClient();

  const dayKeys = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => ymd(addDays(dateStart, i)));
  }, [dateStart, daysCount]);

  const totalAvailNights = useMemo(
    () => dayKeys.reduce((sum, d) => sum + ((availabilityCounts[d] || 0) > 0 ? 1 : 0), 0),
    [dayKeys, availabilityCounts]
  );
  const nextAvail = useMemo(
    () => dayKeys.find((d) => (availabilityCounts[d] || 0) > 0),
    [dayKeys, availabilityCounts]
  );

  useEffect(() => {
    if (!open || campsiteSlices) return;
    (async () => {
      const months = new Set<string>();
      const cursor = new Date(dateStart); cursor.setDate(1);
      const end = addDays(dateStart, daysCount - 1); const endAnchor = new Date(end); endAnchor.setDate(1);
      while (cursor <= endAnchor) { months.add(format(cursor, 'yyyy-MM-01')); cursor.setMonth(cursor.getMonth() + 1); }

      const { data, error } = await supabase
        .from('availability_results')
        .select('campsite_id, month_date, availabilities')
        .eq('facility_id', facility.facility_id)
        .in('month_date', Array.from(months));
      if (error) { console.error('Facility row availability error', error); return; }

      const perCampsite: Record<string, Record<string, 'available' | 'reserved' | 'no_data'>> = {};
      (data || []).forEach((row: any) => {
        const cid = String(row.campsite_id);
        if (!perCampsite[cid]) perCampsite[cid] = {};
        const av = row.availabilities || {};
        for (const [k, v] of Object.entries(av)) {
          const d = (k as string).split('T')[0];
          if (dayKeys.includes(d)) {
            const lower = String(v).toLowerCase();
            perCampsite[cid][d] = lower === 'available' ? 'available' : lower === 'reserved' || lower === 'not reservable' ? 'reserved' : 'no_data';
          }
        }
      });
      for (const cid of Object.keys(perCampsite)) {
        for (const d of dayKeys) if (!perCampsite[cid][d]) perCampsite[cid][d] = 'no_data';
      }
      const ranked = Object.entries(perCampsite)
        .map(([campsite_id, statusByDay]) => ({
          campsite_id,
          statusByDay,
          score: dayKeys.reduce((s, d) => s + (statusByDay[d] === 'available' ? 1 : 0), 0)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ campsite_id, statusByDay }) => ({ campsite_id, statusByDay }));
      setCampsiteSlices(ranked);
    })();
  }, [open, campsiteSlices, dateStart, daysCount, facility.facility_id, supabase, dayKeys]);

  return (
    <div className="border-b border-gray-200">
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-gray-500">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </span>
        <div className="min-w-[220px] shrink-0 text-left">
          <div className="text-sm font-medium text-gray-900">{facility.name}</div>
          <div className="text-xs text-gray-500">
            {nextAvail ? `Next: ${format(new Date(nextAvail), 'MMM d')}` : 'No openings in range'} • Total: {totalAvailNights} days
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex">
            {dayKeys.map((d) => {
              const count = availabilityCounts[d] || 0;
              const cls = count <= 0 ? 'bg-gray-200' : count >= 10 ? 'bg-emerald-600' : count >= 5 ? 'bg-emerald-500' : 'bg-emerald-300';
              return <div key={d} className={`h-4 w-4 mr-[3px] rounded ${cls}`} title={`${count} sites • ${format(new Date(d), 'MMM d')}`} />;
            })}
          </div>
        </div>
        <div className="ml-3">
          <button
            className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100"
            onClick={(e) => { e.stopPropagation(); onRemove?.(facility.facility_id); }}
          >
            Remove
          </button>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3">
          {!campsiteSlices ? (
            <div className="text-xs text-gray-500 py-2">Loading campsites…</div>
          ) : campsiteSlices.length === 0 ? (
            <div className="text-xs text-gray-500 py-2">No campsite data.</div>
          ) : (
            <div className="mt-1">
              {campsiteSlices.map((c) => (
                <CampsiteMiniRow key={c.campsite_id} campsiteId={c.campsite_id} dayKeys={dayKeys} statusByDay={c.statusByDay} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 