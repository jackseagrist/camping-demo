import React, { useMemo } from 'react';
import SelectionTray, { Selection } from './SelectionTray';
import dynamic from 'next/dynamic';

// Avoid SSR issues if any with Supabase client dependency inside the calendar
const AvailabilityCalendar = dynamic(() => import('../AvailabilityCalendar'), { ssr: false });

export type CompareGridProps = {
  selections: Selection[];
  onRemove?: (id: string) => void;
  onClear?: () => void;
  facilityUuid?: string; // pass through to calendar if needed
};

export default function CompareGrid({ selections, onRemove, onClear, facilityUuid }: CompareGridProps) {
  const selectedIds = useMemo(() => selections.map((s) => s.id), [selections]);

  return (
    <div className="flex flex-col h-full">
      <SelectionTray selections={selections} onRemove={onRemove} onClear={onClear} />

      <div className="flex-1 overflow-hidden">
        {selections.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Pick up to 5 campsites from the map to compare.
          </div>
        ) : (
          <AvailabilityCalendar
            className="h-full"
            facilityIdOverride={facilityUuid}
            selectedCampsiteIds={selectedIds}
            density="compact"
          />
        )}
      </div>
    </div>
  );
} 