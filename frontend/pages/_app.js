import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/globals.css';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { BetaLimitsProvider } from '../lib/BetaLimitsContext';

export default function MyApp({ Component, pageProps }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  useEffect(() => {
    // Import PostHog
    const loadPosthog = async () => {
      const posthog = (await import('../posthog')).default;
      
      // Track session started event
      posthog.capture('session_started', {
        referrer: document.referrer,
        url_path: window.location.pathname,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight
      });
    };
    
    loadPosthog();
  }, []);

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <BetaLimitsProvider>
        <Component {...pageProps} />
        <Analytics />
      </BetaLimitsProvider>
    </SessionContextProvider>
  );
}