// pages/explore.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SidebarLayout from '../components/SidebarLayout';
import { Inter } from 'next/font/google';
import AOS from 'aos';
import 'aos/dist/aos.css';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function Explore() {
  const [isLoading, setIsLoading] = useState(true);
  const [debugMessages, setDebugMessages] = useState([]);
  const supabase = createClientComponentClient();
  
  // Map state
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [lng, setLng] = useState(-120.5542);
  const [lat, setLat] = useState(37.2345);
  const [zoom, setZoom] = useState(6);
  const [campgrounds, setCampgrounds] = useState([]);
  const [selectedCampground, setSelectedCampground] = useState(null);
  
  const addDebugMessage = (message) => {
    console.log(`DEBUG: ${message}`);
    setDebugMessages(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    const checkAuth = async () => {
      addDebugMessage('Starting auth check');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          addDebugMessage(`Auth error: ${error.message}`);
          return;
        }

        if (!session) {
          addDebugMessage('No session found, redirecting to login');
          window.location.href = '/login';
          return;
        }

        addDebugMessage('Auth check successful');
        setIsLoading(false);
      } catch (error) {
        addDebugMessage(`Exception during auth check: ${error.message}`);
      }
    };

    const handleAuthChange = (event, session) => {
      if (!session) {
        window.location.href = '/login';
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    checkAuth();
    
    addDebugMessage('Component mounted');
    
    return () => {
      addDebugMessage('Component unmounting');
      if (subscription) subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Initialize AOS animations
  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  // Initialize map when component is ready
  useEffect(() => {
    if (isLoading || !mapContainer.current || map.current) return;
    
    addDebugMessage('Initializing map');
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [lng, lat],
        zoom: zoom
      });

      map.current.addControl(new mapboxgl.NavigationControl());
      
      addDebugMessage('Map initialized successfully');
    } catch (error) {
      addDebugMessage(`Error initializing map: ${error.message}`);
    }
    
    return () => {
      if (map.current) {
        addDebugMessage('Removing map');
        map.current.remove();
        map.current = null;
      }
    };
  }, [isLoading, lng, lat, zoom]);

  // Fetch campgrounds when authenticated
  useEffect(() => {
    if (isLoading) return;
    
    const fetchCampgrounds = async () => {
      addDebugMessage('Fetching campgrounds');
      try {
        const response = await fetch("http://localhost:8000/api/campgrounds");
        if (!response.ok) throw new Error("Failed to fetch campgrounds");
        const data = await response.json();
        addDebugMessage(`Fetched ${data.RECDATA?.length || 0} campgrounds`);
        setCampgrounds(data.RECDATA || []);
      } catch (error) {
        addDebugMessage(`Error loading campgrounds: ${error.message}`);
      }
    };

    fetchCampgrounds();
  }, [isLoading]);

  const handleCampgroundSelect = (e) => {
    const id = e.target.value;
    if (!id) return;
    
    addDebugMessage(`Selected campground ID: ${id}`);
    
    const campground = campgrounds.find(c => c.FacilityID === id);
    if (!campground || !map.current) {
      addDebugMessage('Campground or map not found');
      return;
    }

    const lat = (campground.FacilityLatitude !== undefined && campground.FacilityLatitude !== null)
      ? parseFloat(campground.FacilityLatitude)
      : parseFloat(campground.GEOJSON?.COORDINATES?.[1]);
    
    const lng = (campground.FacilityLongitude !== undefined && campground.FacilityLongitude !== null)
      ? parseFloat(campground.FacilityLongitude)
      : parseFloat(campground.GEOJSON?.COORDINATES?.[0]);
    
    addDebugMessage(`Flying to: lat=${lat}, lng=${lng}`);

    if (isNaN(lat) || isNaN(lng)) {
      addDebugMessage('Invalid lat/lng coordinates');
      return;
    }

    const name = campground.FacilityName;
    const url = campground.FacilityReservationURL || `https://www.recreation.gov/camping/campgrounds/${campground.FacilityID}`;

    map.current.flyTo({ center: [lng, lat], zoom: 10 });

    if (marker.current) {
      marker.current.remove();
    }

    marker.current = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>${name}</h3><a href="${url}" target="_blank">View on Recreation.gov</a>`))
      .addTo(map.current);

    setSelectedCampground({ name, url });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#10B981] text-xl font-semibold">Loading Explore Page...</div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className={`${inter.className} bg-[#F9FAFB] min-h-screen`}>
        <Head>
          <title>Explore - BaseLodge</title>
        </Head>
        
        <div className="p-8">
          <h1 className="text-4xl font-bold text-center text-[#111827] mb-6" data-aos="fade-up">Explore California Campsites</h1>
          <p className="text-center mb-8 text-[#4B5563] text-lg" data-aos="fade-up" data-aos-delay="100">
            📍 Find inspiration and check availability across parks and campgrounds
          </p>
          
          {/* Dropdown */}
          <div className="text-center mb-6" data-aos="fade-up">
            <select 
              onChange={handleCampgroundSelect} 
              className="px-4 py-2 rounded-lg border border-[#D1D5DB]"
            >
              <option value="">Select a campground...</option>
              {campgrounds.length > 0 ? (
                campgrounds.map(c => (
                  <option key={c.FacilityID} value={c.FacilityID}>{c.FacilityName}</option>
                ))
              ) : (
                <option disabled>Loading campgrounds...</option>
              )}
            </select>
          </div>

          {/* Map */}
          <div className="w-full h-[60vh] mb-8" data-aos="fade-up">
            <div ref={mapContainer} className="w-full h-full rounded-2xl shadow-lg border border-[#D1D5DB]" />
          </div>
          
          {/* Debug Panel */}
          <div className="mt-6">
            <details>
              <summary className="font-semibold text-gray-600 cursor-pointer">Debug Information</summary>
              {debugMessages.length > 0 && (
                <div className="mt-2 p-4 bg-gray-100 rounded-lg">
                  <h2 className="font-semibold mb-2">Debug Log:</h2>
                  <div className="font-mono text-sm">
                    {debugMessages.map((msg, i) => (
                      <div key={i} className="py-1">{msg}</div>
                    ))}
                  </div>
                </div>
              )}
            </details>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
