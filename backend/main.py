from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

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


# ---------- ROUTES ----------

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI on Render!"}

@app.get("/api/campgrounds")
def get_campgrounds():
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


@app.post("/packing-list/generate")
async def generate_packing_list(data: TripDetails):
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


@app.post("/recommend-facility")
async def recommend_facility(request: RecommendRequest):
    user_input = request.user_input

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
        select id, name, description
        from facilities
        order by embedding <=> %s
        limit 3;
        """

        # Send raw SQL query using Supabase's PostgREST RPC or directly via Postgres (if set up)
        response = supabase.rpc('match_facilities', {'query_embedding': query_embedding}).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="No matching facilities found.")

        return {"recommendations": response.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase search error: {str(e)}")