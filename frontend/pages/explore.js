// pages/explore.js

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Noto_Serif } from 'next/font/google';
import AOS from 'aos';
import 'aos/dist/aos.css';
import mapboxgl from 'mapbox-gl';

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });
mapboxgl.accessToken = 'pk.eyJ1IjoiamFja3NlYWdyaXN0IiwiYSI6ImNtYTd2NTV5czE4OGIybHE1b2hseHh0c3cifQ._XGBx51KSwTnAef4sWFLXA';

let currentMarker = null;

export default function Explore() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-120.5542);
  const [lat, setLat] = useState(37.2345);
  const [zoom, setZoom] = useState(6);
  const [campgrounds, setCampgrounds] = useState([]);
  const [selectedCampground, setSelectedCampground] = useState(null);

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl());
  }, []);

  const fetchCampgrounds = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/campgrounds");
      if (!response.ok) throw new Error("Failed to fetch campgrounds");
      const data = await response.json();
      console.log("Campgrounds:", data);
      setCampgrounds(data.RECDATA);
    } catch (error) {
      console.error("Error loading campgrounds:", error);
    }
  };

  const handleCampgroundSelect = (e) => {
    const id = e.target.value;
    const campground = campgrounds.find(c => c.FacilityID === id);
    if (!campground || !map.current) return;

    const lat = (campground.FacilityLatitude !== undefined && campground.FacilityLatitude !== null)
    ? parseFloat(campground.FacilityLatitude)
    : parseFloat(campground.GEOJSON?.COORDINATES?.[1]);
  
    const lng = (campground.FacilityLongitude !== undefined && campground.FacilityLongitude !== null)
    ? parseFloat(campground.FacilityLongitude)
    : parseFloat(campground.GEOJSON?.COORDINATES?.[0]);

    console.log("Map flying to:", { lat, lng });

    const name = campground.FacilityName;
    const url = campground.FacilityReservationURL || `https://www.recreation.gov/camping/campgrounds/${campground.FacilityID}`;

    if (isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid lat/lng for selected campground');
      return;
    }

    map.current.flyTo({ center: [lng, lat], zoom: 10 });

    if (currentMarker) {
      currentMarker.remove();
    }

    const marker = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>${name}</h3><a href="${url}" target="_blank">View on Recreation.gov</a>`))
      .addTo(map.current);

    currentMarker = marker;
    setSelectedCampground({ name, url });
  };

  useEffect(() => {
    fetchCampgrounds();
  }, []);

  return (
    <div className={`${notoSerif.className} bg-[#F9FAFB] min-h-screen text-[#4B5563] pt-20 pb-10`}>
      <Head>
        <title>Explore Trips – Climbcovers</title>
      </Head>

      {/* Top Nav */}
      <nav className="fixed w-full top-0 z-50 flex items-center justify-center px-6 py-4 bg-[#F9FAFB]/70 backdrop-blur-md shadow-sm gap-6 text-sm font-semibold text-[#10B981]">
        <Link href="/#features" className="hover:text-[#14B8A6] transition-colors duration-300">Features</Link>
        <Link href="/explore" className="hover:text-[#14B8A6] transition-colors duration-300">Explore Trips</Link>
        <Link href="/plan" className="hover:text-[#14B8A6] transition-colors duration-300">Start Packing</Link>
        <Link href="/login" className="hover:text-[#14B8A6] transition-colors duration-300">Log in / Sign up</Link>
      </nav>

      <h1 data-aos="fade-up" className="text-5xl font-bold text-center text-[#111827] mb-6">Explore California Campsites</h1>
      <p data-aos="fade-up" data-aos-delay="100" className="text-center mb-8 text-[#4B5563] text-lg">📍 Find inspiration and check availability across parks and campgrounds</p>

      {/* Dropdown */}
      <div data-aos="fade-up" className="text-center mb-6">
        <select onChange={handleCampgroundSelect} className="px-4 py-2 rounded-lg border border-[#D1D5DB]">
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
      <div data-aos="fade-up" className="w-full h-[70vh] px-6">
        <div ref={mapContainer} className="w-full h-full rounded-2xl shadow-lg border border-[#D1D5DB]" />
      </div>

      <footer className="mt-12 text-center text-sm text-[#4B5563] border-t border-[#D1D5DB] pt-6">
        <p>© {new Date().getFullYear()} Climbcovers. All rights reserved.</p>
      </footer>
    </div>
  );
}
