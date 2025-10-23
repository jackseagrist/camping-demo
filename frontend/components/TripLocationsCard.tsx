import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Trip, TripLocation } from '../lib/types';
import { Inter } from 'next/font/google';
import posthog from '../posthog';
import TripLocationModal from './TripLocationModal';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

interface TripLocationsCardProps {
  trip: Trip;
  onAddLocation?: (location: TripLocation) => void;
  onViewLocation?: (location: TripLocation) => void;
  onDeleteLocation?: (locationId: string) => void;
  onUpdateLocation?: (location: TripLocation) => void;
  mapCenterLat?: number;
  mapCenterLng?: number;
  markerLat?: number;
  markerLng?: number;
  isAddingFromMarker?: boolean;
}

const TripLocationsCard: React.FC<TripLocationsCardProps> = ({
  trip,
  onAddLocation,
  onViewLocation,
  onDeleteLocation,
  onUpdateLocation,
  mapCenterLat,
  mapCenterLng,
  markerLat,
  markerLng,
  isAddingFromMarker = false
}) => {
  const supabase = createClientComponentClient();
  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationDescription, setNewLocationDescription] = useState('');
  const [newLocationLat, setNewLocationLat] = useState(mapCenterLat || 0);
  const [newLocationLng, setNewLocationLng] = useState(mapCenterLng || 0);
  const [editingLocation, setEditingLocation] = useState<TripLocation | null>(null);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useMapCenter, setUseMapCenter] = useState(true);
  const [locationInputMode, setLocationInputMode] = useState<'coordinates' | 'address'>('coordinates');
  const [addressInput, setAddressInput] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{id: string, place_name: string, center: [number, number]}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<TripLocation | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Get current user email
  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.email) {
        setUserEmail(session.user.email);
      }
    };
    
    getUserEmail();
  }, [supabase]);

  // Fetch locations when component mounts or trip changes
  useEffect(() => {
    const fetchLocations = async () => {
      if (!trip?.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('trip_locations')
          .select('*')
          .eq('trip_id', trip.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setLocations(data || []);
      } catch (err: any) {
        console.error('Error fetching trip locations:', err);
        setError('Failed to load locations');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLocations();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`trip_locations_${trip.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'trip_locations',
          filter: `trip_id=eq.${trip.id}`
        }, 
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setLocations(prev => [payload.new as TripLocation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLocations(prev => 
              prev.map(loc => loc.id === payload.new.id ? payload.new as TripLocation : loc)
            );
          } else if (payload.eventType === 'DELETE') {
            setLocations(prev => 
              prev.filter(loc => loc.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip?.id, supabase]);

  // Update lat/lng when map center changes
  useEffect(() => {
    if (useMapCenter && mapCenterLat && mapCenterLng) {
      setNewLocationLat(mapCenterLat);
      setNewLocationLng(mapCenterLng);
    }
  }, [mapCenterLat, mapCenterLng, useMapCenter]);
  
  // Handle adding location from marker
  useEffect(() => {
    if (isAddingFromMarker && markerLat !== undefined && markerLng !== undefined) {
      setIsAddingLocation(true);
      setNewLocationLat(markerLat);
      setNewLocationLng(markerLng);
      setUseMapCenter(false);
      
      // Focus on the name field after a short delay
      setTimeout(() => {
        const nameInput = document.getElementById('locationName');
        if (nameInput) {
          nameInput.focus();
        }
      }, 100);
    }
  }, [isAddingFromMarker, markerLat, markerLng]);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trip?.id || !userEmail) return;
    
    try {
      const newLocation = {
        trip_id: trip.id,
        user_email: userEmail,
        name: newLocationName.trim(),
        description: newLocationDescription.trim() || null,
        lat: newLocationLat,
        lng: newLocationLng,
      };
      
      const { data, error } = await supabase
        .from('trip_locations')
        .insert(newLocation)
        .select()
        .single();
      
      if (error) throw error;
      
      // Track event
      posthog.capture('location_added', {
        trip_id: trip.id,
        trip_title: trip.title
      });
      
      // Reset form
      setNewLocationName('');
      setNewLocationDescription('');
      setIsAddingLocation(false);
      
      // Notify parent component
      if (onAddLocation && data) {
        onAddLocation(data);
      }
      
    } catch (err: any) {
      console.error('Error adding location:', err);
      setError('Failed to add location');
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingLocation) return;
    
    try {
      const updatedLocation = {
        ...editingLocation,
        name: newLocationName.trim(),
        description: newLocationDescription.trim() || null,
      };
      
      const { data, error } = await supabase
        .from('trip_locations')
        .update(updatedLocation)
        .eq('id', editingLocation.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setLocations(prev => 
        prev.map(loc => loc.id === editingLocation.id ? data : loc)
      );
      
      // Reset form
      setNewLocationName('');
      setNewLocationDescription('');
      setEditingLocation(null);
      
      // Notify parent component
      if (onUpdateLocation && data) {
        onUpdateLocation(data);
      }
      
    } catch (err: any) {
      console.error('Error updating location:', err);
      setError('Failed to update location');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    try {
      const { error } = await supabase
        .from('trip_locations')
        .delete()
        .eq('id', locationId);
      
      if (error) throw error;
      
      // Update local state
      setLocations(prev => prev.filter(loc => loc.id !== locationId));
      
      // Notify parent component
      if (onDeleteLocation) {
        onDeleteLocation(locationId);
      }
      
    } catch (err: any) {
      console.error('Error deleting location:', err);
      setError('Failed to delete location');
    }
  };

  const handleEditLocation = (location: TripLocation) => {
    setEditingLocation(location);
    setNewLocationName(location.name);
    setNewLocationDescription(location.description || '');
    setNewLocationLat(location.lat);
    setNewLocationLng(location.lng);
    setUseMapCenter(false);
  };

  const handleViewLocation = (location: TripLocation) => {
    if (onViewLocation) {
      onViewLocation(location);
    }
  };

  const handleToggleExpand = (locationId: string) => {
    setExpandedLocationId(prev => prev === locationId ? null : locationId);
  };
  
  const handleOpenLocationModal = (location: TripLocation) => {
    setSelectedLocation(location);
    setShowLocationModal(true);
  };
  
  const handleCloseLocationModal = () => {
    setShowLocationModal(false);
    setSelectedLocation(null);
  };

  const handleCancelForm = () => {
    setIsAddingLocation(false);
    setEditingLocation(null);
    setNewLocationName('');
    setNewLocationDescription('');
    setAddressInput('');
    setLocationInputMode('coordinates');
    setError(null);
  };
  
  // Function to search for address suggestions using Mapbox API
  const searchAddressSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsAddressLoading(true);
    setError(null);
    
    try {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!mapboxToken) {
        throw new Error('Mapbox token is missing');
      }
      
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=5&types=address,place,poi`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search for addresses');
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const suggestions = data.features.map((feature: any) => ({
          id: feature.id,
          place_name: feature.place_name,
          center: feature.center as [number, number]
        }));
        
        setAddressSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err: any) {
      console.error('Address search error:', err);
      setError(`Error searching for addresses: ${err.message}`);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsAddressLoading(false);
    }
  };
  
  // Function to select an address from suggestions
  const selectAddress = (suggestion: {id: string, place_name: string, center: [number, number]}) => {
    const [lng, lat] = suggestion.center;
    
    setNewLocationLng(lng);
    setNewLocationLat(lat);
    setAddressInput(suggestion.place_name);
    
    // If the location name is empty, use the place name from geocoding
    if (!newLocationName.trim()) {
      // Extract just the first part of the address (e.g., building name or street number)
      const shortName = suggestion.place_name.split(',')[0].trim();
      setNewLocationName(shortName);
    }
    
    // Turn off useMapCenter since we're using geocoded coordinates
    setUseMapCenter(false);
    setShowSuggestions(false);
  };
  
  // Debounced address search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (addressInput.trim().length >= 3) {
        searchAddressSuggestions(addressInput);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [addressInput]);
  
  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('input[type="text"]')
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`${inter.className} bg-white rounded-xl shadow-md overflow-hidden mb-6`}>
      {/* Location Modal */}
      {showLocationModal && selectedLocation && (
        <TripLocationModal
          location={selectedLocation}
          onClose={handleCloseLocationModal}
          onEdit={handleEditLocation}
          onDelete={handleDeleteLocation}
          isOwner={selectedLocation.user_email === userEmail}
        />
      )}
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Trip Locations</h3>
          {!isAddingLocation && !editingLocation && (
            <button
              onClick={() => setIsAddingLocation(true)}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add location
            </button>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-700 text-sm rounded-md">
            {error}
          </div>
        )}
        
        {(isAddingLocation || editingLocation) && (
          <form 
            ref={formRef}
            onSubmit={editingLocation ? handleUpdateLocation : handleAddLocation} 
            className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50"
          >
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </h4>
            
            <div className="mb-4">
              <label htmlFor="locationName" className="block text-xs font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                id="locationName"
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="e.g., Trailhead, Viewpoint, Camp Spot"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="locationDescription" className="block text-xs font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="locationDescription"
                value={newLocationDescription}
                onChange={(e) => setNewLocationDescription(e.target.value)}
                placeholder="Add notes about this location..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-700">
                  Location
                </label>
                
                {/* Toggle between coordinates and address */}
                <div className="flex items-center p-0.5 bg-gray-100 rounded-md">
                  <button
                    type="button"
                    onClick={() => setLocationInputMode('coordinates')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      locationInputMode === 'coordinates'
                        ? 'bg-white shadow-sm text-gray-800'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Coordinates
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationInputMode('address')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      locationInputMode === 'address'
                        ? 'bg-white shadow-sm text-gray-800'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Address
                  </button>
                </div>
              </div>
              
              {locationInputMode === 'coordinates' && (
                <>
                  {!editingLocation && (
                    <div className="mb-2">
                      <label className="inline-flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={useMapCenter}
                          onChange={() => setUseMapCenter(!useMapCenter)}
                          className="rounded border-gray-300 text-emerald-600 shadow-sm focus:border-emerald-300 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 mr-2"
                        />
                        Use current map center
                      </label>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="locationLat" className="block text-xs text-gray-500 mb-1">
                        Latitude
                      </label>
                      <input
                        id="locationLat"
                        type="number"
                        step="any"
                        value={newLocationLat}
                        onChange={(e) => {
                          setUseMapCenter(false);
                          setNewLocationLat(parseFloat(e.target.value));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        required
                        disabled={useMapCenter}
                      />
                    </div>
                    <div>
                      <label htmlFor="locationLng" className="block text-xs text-gray-500 mb-1">
                        Longitude
                      </label>
                      <input
                        id="locationLng"
                        type="number"
                        step="any"
                        value={newLocationLng}
                        onChange={(e) => {
                          setUseMapCenter(false);
                          setNewLocationLng(parseFloat(e.target.value));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        required
                        disabled={useMapCenter}
                      />
                    </div>
                  </div>
                </>
              )}
              
              {locationInputMode === 'address' && (
                <div className="relative">
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        onFocus={() => {
                          if (addressSuggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                        placeholder="Enter address or place name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                      {isAddressLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Address suggestions dropdown */}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 py-1 text-sm max-h-60 overflow-y-auto"
                    >
                      {addressSuggestions.map(suggestion => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => selectAddress(suggestion)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                        >
                          <div className="truncate">{suggestion.place_name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Display coordinates if we have them from geocoding */}
                  {(newLocationLat !== 0 || newLocationLng !== 0) && (
                    <div className="mt-2 text-xs text-gray-500 font-mono">
                      Found coordinates: {newLocationLat.toFixed(5)}, {newLocationLng.toFixed(5)}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                disabled={!newLocationName.trim()}
              >
                {editingLocation ? 'Update' : 'Save'} Location
              </button>
            </div>
          </form>
        )}
        
        {isLoading ? (
          <div className="py-4 text-center text-gray-500 text-sm">
            Loading locations...
          </div>
        ) : locations.length === 0 && !isAddingLocation ? (
          <div className="py-4 text-center text-gray-500 text-sm">
            No custom locations added yet. Click &quot;Add location&quot; to create your first point.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {locations.map((location) => {
              const isExpanded = expandedLocationId === location.id;
              const isOwner = location.user_email === userEmail;
              
              return (
                <li key={location.id} className="py-3 group">
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleOpenLocationModal(location)}
                    >
                      <h4 className="text-sm font-medium text-gray-900 group-hover:text-emerald-600">
                        {location.name}
                      </h4>
                      {location.description && isExpanded && (
                        <p className="mt-1 text-sm text-gray-600">
                          {location.description}
                        </p>
                      )}
                      <div className="mt-1 text-xs text-gray-500 font-mono">
                        {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewLocation(location);
                        }}
                        className="p-1 text-gray-400 hover:text-emerald-600 rounded-full hover:bg-gray-100"
                        title="View on map"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      
                      {isOwner && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLocation(location);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                            title="Edit location"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLocation(location.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                            title="Delete location"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TripLocationsCard;
