import { useState, useEffect } from 'react';
import Head from 'next/head';
import SidebarLayout from '../components/SidebarLayout';

export default function TestMapbox() {
  const [mapboxToken, setMapboxToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mapUrl, setMapUrl] = useState('');
  const [error, setError] = useState(null);
  
  // Test coordinates (Yosemite National Park)
  const testLat = 37.8651;
  const testLon = -119.5383;

  useEffect(() => {
    // Get the token from environment
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
    setMapboxToken(token);
    
    if (!token) {
      setError('Mapbox token is not available in environment variables');
    } else {
      // Create a test map URL
      const url = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/pin-s+10B981(${testLon},${testLat})/${testLon},${testLat},11,0/300x150@2x?access_token=${token}`;
      setMapUrl(url);
    }
    
    setIsLoading(false);
  }, []);

  return (
    <SidebarLayout>
      <Head>
        <title>Mapbox Test - BaseLodge</title>
      </Head>
      
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Mapbox Token Test</h1>
        
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-gray-100 rounded-lg">
              <h2 className="font-semibold mb-2">Environment Check</h2>
              <p>Mapbox token available: {mapboxToken ? 'Yes' : 'No'}</p>
              {mapboxToken && (
                <p>Token starts with: {mapboxToken.substring(0, 8)}...</p>
              )}
            </div>
            
            {error ? (
              <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                <h2 className="font-semibold mb-2">Error</h2>
                <p>{error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white border rounded-lg">
                  <h2 className="font-semibold mb-2">Test Map Image</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Testing with coordinates: {testLat}, {testLon} (Yosemite National Park)
                  </p>
                  
                  {mapUrl ? (
                    <div className="border rounded-lg overflow-hidden">
                      <img 
                        src={mapUrl} 
                        alt="Test Map" 
                        className="w-full h-auto"
                        onLoad={() => console.log('Map image loaded successfully')}
                        onError={(e) => {
                          console.error('Map image failed to load');
                          setError('Failed to load map image. Check console for details.');
                        }}
                      />
                    </div>
                  ) : (
                    <p>No map URL available</p>
                  )}
                </div>
                
                <div className="p-4 bg-white border rounded-lg">
                  <h2 className="font-semibold mb-2">Map URL</h2>
                  <div className="bg-gray-100 p-3 rounded overflow-auto text-xs">
                    <code>{mapUrl}</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
} 