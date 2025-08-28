import React from 'react';
import { format } from 'date-fns';

export type CampsiteMiniRowProps = {
  campsiteId: string;
  label?: string;
  dayKeys: string[]; // e.g., ['2025-08-01', ...]
  statusByDay: Record<string, 'available' | 'reserved' | 'no_data'>;
};

export default function CampsiteMiniRow({ campsiteId, label, dayKeys, statusByDay }: CampsiteMiniRowProps) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-40 shrink-0 text-xs text-gray-700 truncate" title={label || campsiteId}>
        {label ? `${label}` : `Site ${campsiteId}`}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex">
          {dayKeys.map((d) => {
            const s = statusByDay[d] ?? 'no_data';
            const cls =
              s === 'available'
                ? 'bg-emerald-500/80'
                : s === 'reserved'
                ? 'bg-red-400/60'
                : 'bg-white border border-dashed border-gray-300';
            return (
              <div
                key={d}
                className={`h-3 w-3.5 mr-[2px] rounded-sm ${cls}`}
                title={`${label || `Site ${campsiteId}`} • ${format(new Date(d), 'MMM d')}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
} 