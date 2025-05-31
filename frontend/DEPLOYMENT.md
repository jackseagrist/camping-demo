# Deployment Guide

## Vercel Deployment

When deploying the frontend to Vercel, you need to configure environment variables to ensure the frontend can communicate with your backend API.

### Environment Variables in Vercel

1. Navigate to your project in the Vercel dashboard
2. Go to "Settings" > "Environment Variables"
3. Add the following environment variables:

| Name | Value | 
|------|-------|
| `BACKEND_URL` | `https://your-backend-production-url.com` |
| `BACKEND_API_KEY` | `your-secure-api-key` |

Replace `https://your-backend-production-url.com` with the actual URL where your backend is deployed.
For `BACKEND_API_KEY`, use the same value you set in your Render environment variables.

### Backend Deployment on Render

1. **Create a Render account** if you haven't already
2. **Deploy your FastAPI backend**:
   - Create a new Web Service
   - Connect your GitHub repository
   - Configure build settings:
     - Build Command: `pip install -r backend/requirements.txt`
     - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Add Environment Variables**:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RIDB_API_KEY`
   - `API_KEY` (create a secure random string for this)

### Accessing FastAPI Documentation

After deploying to Render, you can access the Swagger documentation at:
- `https://your-backend-url.com/docs`

And the ReDoc documentation at:
- `https://your-backend-url.com/redoc`

These provide interactive API documentation for testing your endpoints.

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

## Security Considerations

1. **API Key Protection**:
   - Generate a strong, random API key for production
   - Set this key in both Render (backend) and Vercel (frontend) environments
   - This key will be used to authenticate requests between your frontend and backend

2. **Rate Limiting**:
   - Consider implementing rate limiting in your FastAPI application
   - Install `slowapi`: `pip install slowapi`
   - Configure it in your FastAPI app to prevent abuse

3. **Regular Security Audits**:
   - Periodically check for dependency vulnerabilities
   - Update your packages regularly

## Testing Your Deployment

1. After deploying, test the facility recommendation feature to ensure it's working correctly
2. Check the browser's developer console for any CORS or connection errors
3. Verify your backend logs to ensure requests are being received properly 