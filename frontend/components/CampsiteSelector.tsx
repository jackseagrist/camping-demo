import React, { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Trip, Facility } from '../lib/types';
import { Inter } from 'next/font/google';
import posthog from '../posthog';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

interface CampsiteSelectorProps {
  trip: Trip;
  onUpdate: (updatedTrip: Trip) => void;
  onCustomMarkerMode: (isActive: boolean) => void;
  onSaveCustomFacility: (facility: Partial<Facility>) => void;
}

const CampsiteSelector: React.FC<CampsiteSelectorProps> = ({
  trip,
  onUpdate,
  onCustomMarkerMode,
  onSaveCustomFacility
}) => {
  const supabase = createClientComponentClient();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(trip.facility_id || null);
  const [customFacilities, setCustomFacilities] = useState<Facility[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customFacilityName, setCustomFacilityName] = useState('');
  const [customFacilityNotes, setCustomFacilityNotes] = useState('');
  
  // Fetch facilities near the trip location
  useEffect(() => {
    const fetchFacilities = async () => {
      setIsLoading(true);
      try {
        // Fetch regular facilities
        const { data: facilityData, error } = await supabase
          .from('facilities')
          .select('*')
          .eq('is_custom', false)
          .order('name');
        
        if (error) throw error;
        
        // Fetch custom facilities created by the user
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: customData, error: customError } = await supabase
            .from('facilities')
            .select('*')
            .eq('is_custom', true)
            .eq('user_id', session.user.id);
          
          if (customError) throw customError;
          
          setCustomFacilities(customData || []);
        }
        
        setFacilities(facilityData || []);
      } catch (error) {
        console.error('Error fetching facilities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFacilities();
  }, [supabase]);
  
  // Handle facility selection change
  const handleFacilityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === 'add_custom') {
      // Enable custom marker mode
      setIsAddingCustom(true);
      onCustomMarkerMode(true);
      return;
    }
    
    setSelectedFacilityId(value);
    setIsAddingCustom(false);
    onCustomMarkerMode(false);
    
    try {
      // Update the trip's facility_id in the database
      const { error } = await supabase
        .from('trips')
        .update({ facility_id: value })
        .eq('id', trip.id);
      
      if (error) throw error;
      
      // Find the selected facility
      const selectedFacility = [...facilities, ...customFacilities].find(f => f.facility_id === value);
      
      // Track facility selected event
      posthog.capture('facility_selected', {
        trip_id: trip.id,
        facility_id: value,
        facility_name: selectedFacility?.name || 'Unknown',
        facility_type: selectedFacility?.type || 'Unknown',
        is_custom: !!selectedFacility?.is_custom
      });
      
      // Update the trip object with the new facility
      onUpdate({
        ...trip,
        facility_id: value,
        facility: selectedFacility || null
      });
      
    } catch (error) {
      console.error('Error updating facility:', error);
    }
  };
  
  // Save a custom facility
  const saveCustomFacility = async (name: string, notes: string, lat: number, lon: number) => {
    if (!name.trim()) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');
      
      // Create a new custom facility
      const newFacility = {
        name,
        description: notes,
        lat,
        lon,
        is_custom: true,
        user_id: session.user.id,
        type: 'Custom',
        source: 'User created'
      };
      
      // Insert the facility
      const { data, error } = await supabase
        .from('facilities')
        .insert(newFacility)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Update the trip with the new facility
        const { error: tripError } = await supabase
          .from('trips')
          .update({ facility_id: data.id })
          .eq('id', trip.id);
        
        if (tripError) throw tripError;
        
        // Track custom location added event
        posthog.capture('custom_location_added', {
          trip_id: trip.id,
          facility_id: data.id,
          facility_name: name,
          has_notes: !!notes.trim()
        });
        
        // Update local state
        setCustomFacilities([...customFacilities, data]);
        setSelectedFacilityId(data.id);
        setIsAddingCustom(false);
        onCustomMarkerMode(false);
        
        // Update the trip object
        onUpdate({
          ...trip,
          facility_id: data.id,
          facility: data
        });
        
        onSaveCustomFacility(data);
      }
    } catch (error) {
      console.error('Error saving custom facility:', error);
    }
  };
  
  // Cancel adding a custom facility
  const cancelAddCustom = () => {
    setIsAddingCustom(false);
    onCustomMarkerMode(false);
    setSelectedFacilityId(trip.facility_id || null);
  };
  
  return (
    <div className={inter.className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Selected Campsite
      </label>
      
      <div className="relative">
        <select
          value={isAddingCustom ? 'add_custom' : (selectedFacilityId || '')}
          onChange={handleFacilityChange}
          className="block w-full bg-white border border-gray-300 rounded-lg py-2 px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
          disabled={isLoading}
        >
          <option value="">Select a campsite...</option>
          
          {/* Regular facilities */}
          {facilities.length > 0 && (
            <optgroup label="Recreation.gov Campsites">
              {facilities.map(facility => (
                <option key={facility.facility_id} value={facility.facility_id}>
                  {facility.name}
                </option>
              ))}
            </optgroup>
          )}
          
          {/* Custom facilities */}
          {customFacilities.length > 0 && (
            <optgroup label="Your Custom Campsites">
              {customFacilities.map(facility => (
                <option key={facility.facility_id || facility.id} value={facility.facility_id || facility.id}>
                  {facility.name} (Custom)
                </option>
              ))}
            </optgroup>
          )}
          
          {/* Add custom option */}
          <optgroup label="Add New">
            <option value="add_custom">🗺️ Add Custom Campsite</option>
          </optgroup>
        </select>
        
        {isLoading && (
          <div className="absolute right-10 top-3">
            <svg className="animate-spin h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      
      {/* Custom facility form */}
      {isAddingCustom && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Add Custom Campsite</h3>
          <p className="text-xs text-gray-500 mb-4">Click on the map to place your marker, then enter details below.</p>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campsite Name
            </label>
            <input
              type="text"
              value={customFacilityName}
              onChange={(e) => setCustomFacilityName(e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-emerald-600 focus:border-emerald-600"
              placeholder="e.g., My Secret Spot"
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={customFacilityNotes}
              onChange={(e) => setCustomFacilityNotes(e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-emerald-600 focus:border-emerald-600"
              placeholder="Any details about this campsite..."
              rows={2}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => {
                // This will be connected to the map coordinates in the parent component
                onSaveCustomFacility({
                  name: customFacilityName,
                  description: customFacilityNotes,
                });
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600"
            >
              Save Location
            </button>
            <button
              onClick={cancelAddCustom}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampsiteSelector; 