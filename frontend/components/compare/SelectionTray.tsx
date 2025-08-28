import React from 'react';
import CampsitePill from './CampsitePill';

export type Selection = { id: string; label: string };

export type SelectionTrayProps = {
  selections: Selection[];
  max?: number;
  onRemove?: (id: string) => void;
  onClear?: () => void;
};

export default function SelectionTray({ selections, max = 5, onRemove, onClear }: SelectionTrayProps) {
  const count = selections.length;
  const isFull = count >= max;

  return (
    <div className="sticky top-0 z-30 bg-white border-b px-4 py-2 flex items-center gap-3">
      <div className="text-sm text-gray-700">Selected <span className="font-medium">{count}/{max}</span></div>
      <div className="flex flex-wrap gap-2">
        {selections.map((s) => (
          <CampsitePill key={s.id} id={s.id} label={s.label} onRemove={onRemove} />
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {isFull && (
          <span className="text-xs text-gray-500">Compare limited to {max} campsites</span>
        )}
        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
} 