import React from 'react';

export type CampsitePillProps = {
  id: string;
  label: string;
  onRemove?: (id: string) => void;
};

export default function CampsitePill({ id, label, onRemove }: CampsitePillProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-full py-1 pl-3 pr-2 text-sm">
      <span className="text-gray-900 truncate max-w-[180px]" title={label}>{label}</span>
      <button
        type="button"
        onClick={() => onRemove?.(id)}
        aria-label={`Remove ${label}`}
        className="rounded-full p-1 hover:bg-gray-200 text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
} 