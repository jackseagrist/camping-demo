/**
 * API endpoint to proxy requests to the backend recommend-facility endpoint
 */
import posthog from '../../posthog';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Track AI search event if there's a user ID in the request
    // Commented out PostHog analytics
    /*
    if (req.body.userId) {
      posthog.capture('ai_search_triggered', {
        query: req.body.query || '',
        userId: req.body.userId,
      });
    }
    */

    // Get the backend URL from environment variables
    const BACKEND_URL = process.env.BACKEND_URL;
    
    // Get API key from environment variable
    const API_KEY = process.env.BACKEND_API_KEY;
    
    // Validate required environment variables
    if (!BACKEND_URL) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Backend URL not configured'
      });
    }
    
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'API Key not configured'
      });
    }
    
    console.log(`Using backend URL: ${BACKEND_URL}`);
    
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/recommend-facility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    // Get the response data
    const data = await response.json();

    // If the backend returned an error
    if (!response.ok) {
      console.error('Backend error:', data);
      return res.status(response.status).json(data);
    }

    // Return the successful response
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch from backend', 
      details: error.message 
    });
  }
} 