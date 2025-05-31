/**
 * API endpoint to proxy requests to the backend recommend-facility endpoint
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the backend URL from environment variables, with appropriate fallbacks
    // In production, this should be set as an environment variable in your Vercel dashboard
    const BACKEND_URL = process.env.BACKEND_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://your-backend-production-url.com' // Replace with your actual backend URL
        : 'http://127.0.0.1:8000');
    
    // Get API key from environment variable
    const API_KEY = process.env.BACKEND_API_KEY || 'default-dev-key';
    
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