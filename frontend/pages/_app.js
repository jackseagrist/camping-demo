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
    import('../posthog');
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