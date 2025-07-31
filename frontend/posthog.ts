// lib/posthog.ts
import posthog from 'posthog-js'
import { cookieUtils } from './lib/utils'

// Only initialize if consent is given
// Commented out PostHog analytics initialization
/*
if (typeof window !== 'undefined' && !posthog.__loaded && cookieUtils.isAnalyticsAllowed()) {
  posthog.init('phc_r5PB0Idfh8Ns4pcm7V8eFxRgGnQZCqCdm1q5kIswESs', {
    api_host: 'https://app.posthog.com',
    autocapture: true,
    capture_pageview: false,
  })
}
*/

// Create a mock posthog object that does nothing
const mockPosthog = {
  capture: () => {},
  identify: () => {},
  reset: () => {},
  __loaded: true
};

export default typeof posthog !== 'undefined' ? mockPosthog : posthog
