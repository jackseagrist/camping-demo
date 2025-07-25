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

def get_all_facilities():
    """Fetch all facilities with pagination to overcome the 1000 record limit"""
    all_facilities = []
    page = 0
    page_size = 1000  # Supabase default page size
    has_more = True
    
    print("Fetching facilities from Supabase with pagination...")
    
    while has_more:
        print(f"Fetching page {page + 1}...")
        
        # Calculate range for current page
        start = page * page_size
        end = start + page_size - 1
        
        # Fetch current page
        response = supabase.table('facilities') \
            .select('id, description') \
            .range(start, end) \
            .execute()
        
        page_facilities = response.data
        
        if not page_facilities or len(page_facilities) == 0:
            has_more = False
        else:
            all_facilities.extend(page_facilities)
            print(f"Retrieved {len(page_facilities)} facilities (total so far: {len(all_facilities)})")
            
            # Check if we got less than the page size (meaning we've reached the end)
            if len(page_facilities) < page_size:
                has_more = False
                
            page += 1
    
    return all_facilities

# Fetch all facilities using pagination
facilities = get_all_facilities()
print(f"Found {len(facilities)} facilities total.")

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