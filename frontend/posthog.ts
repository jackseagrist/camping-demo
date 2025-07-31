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
  capture: (eventName: string, properties?: Record<string, any>) => {},
  identify: (id?: string, properties?: Record<string, any>) => {},
  reset: () => {},
  people: {
    set: (properties: Record<string, any>) => {}
  },
  register: (properties: Record<string, any>) => {},
  registerOnce: (properties: Record<string, any>) => {},
  unregister: (key: string) => {},
  opt_in_capturing: () => {},
  opt_out_capturing: () => {},
  isFeatureEnabled: (key: string) => false,
  getFeatureFlag: (key: string) => null,
  __loaded: true
};

export default mockPosthog
