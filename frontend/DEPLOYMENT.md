# Deployment Guide

## Vercel Deployment

When deploying the frontend to Vercel, you need to configure environment variables to ensure the frontend can communicate with your backend API.

### Environment Variables in Vercel

1. Navigate to your project in the Vercel dashboard
2. Go to "Settings" > "Environment Variables"
3. Add the following environment variable:

| Name | Value | 
|------|-------|
| `BACKEND_URL` | `https://your-backend-production-url.com` |

Replace `https://your-backend-production-url.com` with the actual URL where your backend is deployed.

### Backend Deployment Options

1. **Deploy as a separate service**: 
   - Deploy your FastAPI backend to a platform like Heroku, DigitalOcean, AWS, etc.
   - Use the deployed URL as your `BACKEND_URL` environment variable

2. **Deploy as a Vercel Serverless Function**:
   - You can migrate your FastAPI backend to Vercel Serverless Functions
   - In this case, your `BACKEND_URL` would be your Vercel deployment URL

### CORS Configuration

Ensure your backend has CORS properly configured to accept requests from your Vercel frontend domain.

In your FastAPI backend:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-vercel-url.vercel.app"],  # Add your Vercel URL here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing Your Deployment

1. After deploying, test the facility recommendation feature to ensure it's working correctly
2. Check the browser's developer console for any CORS or connection errors
3. Verify your backend logs to ensure requests are being received properly 