import os
import openai
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

# Set up clients
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Fetch all facilities
print("Fetching facilities from Supabase...")
response = supabase.table('facilities').select('id, description').execute()
facilities = response.data
print(f"Found {len(facilities)} facilities.")

# Loop over and embed
for i, facility in enumerate(facilities, start=1):
    description = facility['description']
    facility_id = facility['id']

    if not description:
        print(f"Skipping facility {facility_id} (empty description)")
        continue

    try:
        embedding_response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=description
        )
        embedding = embedding_response.data[0].embedding

        # Update Supabase
        supabase.table('facilities').update({
            'embedding': embedding
        }).eq('id', facility_id).execute()

        print(f"[{i}/{len(facilities)}] Embedded facility {facility_id}")

    except Exception as e:
        print(f"Error embedding facility {facility_id}: {e}")

print("✅ All facilities processed!")