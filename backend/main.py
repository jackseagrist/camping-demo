from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from openai import OpenAI
import os
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

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
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert camping guide."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        return {"result": response.choices[0].message.content}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})