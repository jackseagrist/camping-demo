// pages/explore.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function Explore() {
  const [isLoading, setIsLoading] = useState(true);
  const [campsites, setCampsites] = useState([]);
  const supabase = createClientComponentClient();

  // Map state
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});

  // Fetch campsites from Supabase
  useEffect(() => {
    const fetchCampsites = async () => {
      const { data, error } = await supabase
        .from('campsites')
        .select('*')
        .eq('type', 'tent');
      if (error) {
        console.error('Error fetching campsites:', error);
        return;
      }
      setCampsites(data);
      setIsLoading(false);
    };
    fetchCampsites();
  }, []);

  // Initialize map
  useEffect(() => {
    if (isLoading || !mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-120.5542, 37.2345],
      zoom: 6
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isLoading]);

  // Update markers when campsites change
  useEffect(() => {
    if (!map.current || !campsites.length) return;

    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    campsites.forEach(campsite => {
      if (!campsite.lat || !campsite.lon) return;

      const marker = new mapboxgl.Marker()
        .setLngLat([campsite.lon, campsite.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <h3 class="font-semibold">${campsite.name}</h3>
              <p class="text-sm text-gray-600">${campsite.type}</p>
              <p class="text-xs">${campsite.description}</p>
            `)
        )
        .addTo(map.current);

      markers.current[campsite.campsite_id] = marker;
    });
  }, [campsites]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading Explore Page...</div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <Head>
        <title>Explore Campsites - BaseLodge</title>
      </Head>
      
      <div className="flex h-full w-full bg-[#F9FAFB] gap-0" style={{ minHeight: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <div className="w-[320px] overflow-y-auto border-r border-gray-200 m-0 p-0">
          <div className="p-3">
            <div className="grid grid-cols-1 gap-3">
              {campsites.map(campsite => (
                <div 
                  key={campsite.campsite_id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer bg-white"
                  onClick={() => {
                    map.current?.flyTo({
                      center: [campsite.lon, campsite.lat],
                      zoom: 12
                    });
                  }}
                >
                  {campsite.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 m-0 p-0">
          <div 
            ref={mapContainer} 
            className="rounded-lg shadow-lg h-full w-full m-0"
          />
        </div>
      </div>
    </SidebarLayout>
  );
}
