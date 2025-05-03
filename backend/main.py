from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from openai import OpenAI
import os
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import requests

load_dotenv()

app = FastAPI()  # 👈 This is required!

#client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
#print("OpenAI key loaded:", os.getenv("OPENAI_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RIDB_API_KEY = os.getenv("RIDB_API_KEY")

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
    load_dotenv()  # load env inside the route
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        return JSONResponse(status_code=500, content={"error": "OPENAI_API_KEY is not set."})

    client = OpenAI(api_key=api_key)

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
        return JSONResponse(status_code=500, content={"error": str(e)})