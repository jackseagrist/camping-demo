import React from 'react';
import FacilityCompareRow from './FacilityCompareRow';

type Facility = {
  id: string;
  facility_id: string;
  name: string;
  lon: number;
  lat: number;
  availabilityCounts: Record<string, number>;
};

type Props = {
  facilities: Facility[];
  dateStart: Date;
  daysCount: number;
  onRemove?: (facilityId: string) => void;
};

export default function FacilityCompareGrid({ facilities, dateStart, daysCount, onRemove }: Props) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="sticky top-0 z-10 bg-gray-50 border-b px-4 py-2 text-xs text-gray-600 flex">
        <div className="min-w-[220px]">Facility</div>
        <div className="flex-1">Availability (daily)</div>
      </div>
      <div>
        {facilities.length === 0 ? (
          <div className="p-6 text-gray-500">Pick up to 5 facilities to compare.</div>
        ) : (
          facilities.map((f) => (
            <FacilityCompareRow
              key={f.facility_id}
              facility={{ id: f.id, facility_id: f.facility_id, name: f.name, lon: f.lon, lat: f.lat }}
              dateStart={dateStart}
              daysCount={daysCount}
              availabilityCounts={f.availabilityCounts}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </div>
  );
} 