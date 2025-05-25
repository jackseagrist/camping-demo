import Image from 'next/image';

export default function CampsiteCard({ campsite, onClick }) {
  return (
    <div 
      className="flex flex-col rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer bg-white"
      onClick={onClick}
    >
      {campsite.media && campsite.media[0] ? (
        <div className="relative h-48 w-full">
          <Image
            src={campsite.media[0].URL}
            alt={campsite.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {campsite.demand_assessment && (
            <div className="absolute top-3 left-3 bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-xs">
              {campsite.demand_assessment} Demand
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 w-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-400">No image available</span>
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{campsite.name}</h3>
        <div className="text-sm text-gray-600 mb-2">
          {campsite.type} • {campsite.accessible ? 'Accessible' : 'Not Accessible'}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm">
            {campsite.permitted_equipment?.length > 0 && (
              <span className="text-gray-600">
                {campsite.permitted_equipment[0].EquipmentName}
                {campsite.permitted_equipment[0].MaxLength && ` (up to ${campsite.permitted_equipment[0].MaxLength}ft)`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 