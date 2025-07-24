// lib/posthog.ts
import posthog from 'posthog-js'
import { cookieUtils } from './lib/utils'

// Only initialize if consent is given
if (typeof window !== 'undefined' && !posthog.__loaded && cookieUtils.isAnalyticsAllowed()) {
  posthog.init('phc_r5PB0Idfh8Ns4pcm7V8eFxRgGnQZCqCdm1q5kIswESs', {
    api_host: 'https://app.posthog.com',
    autocapture: true,
    capture_pageview: false,
  })
}

export default posthog
