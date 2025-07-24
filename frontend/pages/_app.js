import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/globals.css';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { BetaLimitsProvider } from '../lib/BetaLimitsContext';
import CookieConsent from "react-cookie-consent";
import { cookieUtils } from '../lib/utils';

export default function MyApp({ Component, pageProps }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  const [cookiesAccepted, setCookiesAccepted] = useState(false);

  useEffect(() => {
    // Check if cookies were previously accepted
    const hasConsent = cookieUtils.isAnalyticsAllowed();
    setCookiesAccepted(hasConsent);

    // Only load PostHog if cookies are accepted
    if (hasConsent) {
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
    }
  }, [cookiesAccepted]);

  // Function to handle cookie rejection
  const handleCookieRejection = () => {
    cookieUtils.deleteCookie("baselodge-cookie-consent");
    cookieUtils.setCookie("baselodge-cookie-rejected", "true", 150);
    setCookiesAccepted(false);
  };

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <BetaLimitsProvider>
        <Component {...pageProps} />
        <Analytics />
        <CookieConsent
          location="bottom"
          buttonText="Accept"
          declineButtonText="Reject"
          enableDeclineButton
          onDecline={handleCookieRejection}
          cookieName="baselodge-cookie-consent"
          style={{ 
            background: "#10B981", 
            fontFamily: "var(--font-inter), sans-serif",
            padding: "16px 24px"
          }}
          buttonStyle={{ 
            background: "#FFFFFF", 
            color: "#10B981", 
            fontSize: "14px", 
            fontWeight: "600",
            padding: "8px 16px",
            borderRadius: "9999px"
          }}
          declineButtonStyle={{
            background: "transparent", 
            color: "#FFFFFF", 
            fontSize: "14px", 
            fontWeight: "600",
            padding: "8px 16px",
            borderRadius: "9999px",
            border: "1px solid #FFFFFF"
          }}
          contentStyle={{
            flex: "1",
            margin: "0",
            fontSize: "14px"
          }}
          expires={150}
          onAccept={() => {
            setCookiesAccepted(true);
          }}
        >
          This website uses cookies to enhance the user experience and analyze site traffic.{" "}
          <span style={{ fontSize: "13px" }}>
            <a href="/privacy#cookies-tracking" style={{ color: "#fff", textDecoration: "underline" }}>
              Learn more in our Privacy Policy
            </a>
          </span>
        </CookieConsent>
      </BetaLimitsProvider>
    </SessionContextProvider>
  );
}