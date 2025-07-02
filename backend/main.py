from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
import requests
import json
from dotenv import load_dotenv
from supabase import create_client, Client
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Load environment variables
load_dotenv()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title="BaseLodge API",
    description="API for BaseLodge camping recommendations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limit exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable CORS (adjust allowed origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "https://baselodge.vercel.app"  # Your Vercel domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up API clients
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)
RIDB_API_KEY = os.getenv("RIDB_API_KEY")
API_KEY = os.getenv("API_KEY")  # Removed default fallback

# API Key validation dependency
async def validate_api_key(x_api_key: str = Header(None)):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key header is missing")
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key not configured on server")
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key

# ---------- ROUTES ----------

@app.get("/")
@limiter.limit("10/minute")
def read_root(request: Request):
    return {"message": "Hello from FastAPI on Render! Visit /docs for API documentation."}

@app.get("/api/campgrounds", dependencies=[Depends(validate_api_key)])
@limiter.limit("5/minute")
def get_campgrounds(request: Request):
    headers = {"apikey": RIDB_API_KEY}
    url = "https://ridb.recreation.gov/api/v1/facilities?state=CA&activity=CAMPING&limit=25"
    response = requests.get(url, headers=headers)
    return JSONResponse(content=response.json())


class TripDetails(BaseModel):
    tripType: str
    groupSize: int
    duration: int
    location: str
    month: str
    experienceLevel: str
    sustainability: str


@app.post("/packing-list/generate", dependencies=[Depends(validate_api_key)])
@limiter.limit("3/minute")
async def generate_packing_list(data: TripDetails, request: Request):
    prompt = f"""
    You're an experienced outdoor gear guide. Create a detailed camping packing list for the following trip:

    - Trip Type: {data.tripType}
    - Group Size: {data.groupSize}
    - Duration: {data.duration} days
    - Location: {data.location}
    - Month: {data.month}
    - Experience Level: {data.experienceLevel}
    - Focus on sustainability: {data.sustainability}

    Return the list grouped by category (Shelter, Cooking, Clothing, Essentials, Optional) and include short tips if relevant.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=[
                {"role": "system", "content": "You are an expert camping guide."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        return {"result": response.choices[0].message.content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {str(e)}")


class RecommendRequest(BaseModel):
    user_input: str


@app.post("/recommend-facility", dependencies=[Depends(validate_api_key)])
@limiter.limit("5/minute")
async def recommend_facility(request: Request, recommend_request: RecommendRequest):
    user_input = recommend_request.user_input

    try:
        # Step 1: Generate embedding for the user query
        embedding_response = client.embeddings.create(
            model="text-embedding-ada-002",
            input=user_input
        )
        query_embedding = embedding_response.data[0].embedding

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI embedding error: {str(e)}")

    try:
        # Step 2: Query Supabase for most similar facilities
        query = """
        select id, name, summary
        from facilities
        order by embedding <=> %s
        limit 3;
        """

        # Send raw SQL query using Supabase's PostgREST RPC or directly via Postgres (if set up)
        response = supabase.rpc('match_facilities', {
            'query_embedding': json.dumps(query_embedding)
        }).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="No matching facilities found.")

        return {"recommendations": response.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase search error: {str(e)}")