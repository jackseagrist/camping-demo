interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    demand: string[];
    cost: string[];
  };
  onFiltersChange: (filters: { demand: string[]; cost: string[] }) => void;
  displayMode: 'demand' | 'cost';
  onDisplayModeChange: (mode: 'demand' | 'cost') => void;
}

export default function FilterModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  displayMode,
  onDisplayModeChange
}: FilterModalProps) {
  if (!isOpen) return null;

  const demandOptions = ['High', 'Medium', 'Low'];
  const costOptions = ['Very expensive', 'Expensive', 'Affordable', 'Bargain'];

  const handleDemandChange = (demand: string) => {
    const newDemands = filters.demand.includes(demand)
      ? filters.demand.filter(d => d !== demand)
      : [...filters.demand, demand];
    
    onFiltersChange({
      ...filters,
      demand: newDemands
    });
  };

  const handleCostChange = (cost: string) => {
    const newCosts = filters.cost.includes(cost)
      ? filters.cost.filter(c => c !== cost)
      : [...filters.cost, cost];
    
    onFiltersChange({
      ...filters,
      cost: newCosts
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      demand: [],
      cost: []
    });
  };

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

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity pointer-events-auto"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex h-full items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all w-full max-w-md max-h-full pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900">Filter Campgrounds</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Display Mode Toggle */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Map Display Mode</h3>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition ${
                    displayMode === 'demand' 
                      ? 'bg-white shadow-sm text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => onDisplayModeChange('demand')}
                >
                  By Demand
                </button>
                <button
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition ${
                    displayMode === 'cost' 
                      ? 'bg-white shadow-sm text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => onDisplayModeChange('cost')}
                >
                  By Cost
                </button>
              </div>
            </div>

            {/* Demand Filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Demand</h3>
              <div className="space-y-2">
                {demandOptions.map(demand => (
                  <label key={demand} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.demand.includes(demand)}
                      onChange={() => handleDemandChange(demand)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex items-center ml-3">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getColorForDemand(demand) }}
                      />
                      <span className="text-sm text-gray-700">{demand} Demand</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Cost Filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Cost</h3>
              <div className="space-y-2">
                {costOptions.map(cost => (
                  <label key={cost} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.cost.includes(cost)}
                      onChange={() => handleCostChange(cost)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex items-center ml-3">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getColorForCost(cost) }}
                      />
                      <span className="text-sm text-gray-700">
                        {cost === 'Very expensive' ? '$$$$' :
                         cost === 'Expensive' ? '$$$' :
                         cost === 'Affordable' ? '$$' :
                         cost === 'Bargain' ? '$' : cost}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Current Filters Summary */}
            {(filters.demand.length > 0 || filters.cost.length > 0) && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {filters.demand.length + filters.cost.length} filter(s) active
                    </p>
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}