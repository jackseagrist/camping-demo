interface LegendModalProps {
  displayMode: 'demand' | 'cost';
}

export default function LegendModal({ displayMode }: LegendModalProps) {
  const getColorForDemand = (demand: string) => {
    switch (demand) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#888888';
    }
  };

  const getColorForCost = (cost: string) => {
    switch (cost) {
      case 'Very expensive': return '#EF4444';
      case 'Expensive': return '#F59E0B';
      case 'Affordable': return '#10B981';
      case 'Bargain': return '#3B82F6';
      default: return '#888888';
    }
  };

  const demandLevels = [
    { key: 'High', label: 'High Demand' },
    { key: 'Medium', label: 'Medium Demand' },
    { key: 'Low', label: 'Low Demand' }
  ];

  const costLevels = [
    { key: 'Very expensive', label: '$$$$' },
    { key: 'Expensive', label: '$$$' },
    { key: 'Affordable', label: '$$' },
    { key: 'Bargain', label: '$' }
  ];

  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-10 min-w-[140px] hidden sm:block">
      <h3 className="text-sm font-medium text-gray-900 mb-2">
        {displayMode === 'demand' ? 'Demand Level' : 'Cost Level'}
      </h3>
      
      <div className="space-y-1.5">
        {displayMode === 'demand' ? (
          demandLevels.map(level => (
            <div key={level.key} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: getColorForDemand(level.key) }}
              />
              <span className="text-xs text-gray-700">{level.label}</span>
            </div>
          ))
        ) : (
          costLevels.map(level => (
            <div key={level.key} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: getColorForCost(level.key) }}
              />
              <span className="text-xs text-gray-700">{level.label}</span>
            </div>
          ))
        )}
      </div>
      
      {/* Selected facilities legend */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-black border border-white" />
          <span className="text-xs text-gray-700">Selected</span>
        </div>
      </div>
    </div>
  );
}