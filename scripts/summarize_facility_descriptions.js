import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function summarizeDescription(description) {
  if (!description) return null;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes facility descriptions for campsites and outdoor recreation areas into a single concise sentence."
        },
        {
          role: "user",
          content: `Summarize this facility description into ONE SENTENCE: ${description}`
        }
      ],
      max_tokens: 100,
      temperature: 0.5,
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return null;
  }
}

async function getAllFacilitiesNeedingSummary() {
  let allFacilities = [];
  let page = 0;
  const pageSize = 1000; // Supabase default page size
  let hasMore = true;
  
  while (hasMore) {
    console.log(`Fetching facilities page ${page + 1}...`);
    
    const { data: facilities, error } = await supabase
      .from('facilities')
      .select('id, facility_id, name, description')
      .not('description', 'is', null)
      .is('summary', null)
      .order('id')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Error fetching facilities:', error);
      break;
    }
    
    if (facilities.length === 0) {
      hasMore = false;
    } else {
      allFacilities = [...allFacilities, ...facilities];
      page++;
      console.log(`Retrieved ${facilities.length} facilities (total so far: ${allFacilities.length})`);
      
      // If we got less than pageSize, we've reached the end
      if (facilities.length < pageSize) {
        hasMore = false;
      }
    }
  }
  
  return allFacilities;
}

async function processFacilities() {
  console.log('Fetching all facilities that need summarization...');
  
  // Get all facilities using pagination
  const facilities = await getAllFacilitiesNeedingSummary();
  
  console.log(`Found ${facilities.length} facilities that need summarization`);
  
  if (facilities.length === 0) {
    console.log('No facilities require summarization. All done!');
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process all facilities
  for (let i = 0; i < facilities.length; i++) {
    const facility = facilities[i];
    console.log(`Processing (${i+1}/${facilities.length}): ${facility.name} (ID: ${facility.facility_id})`);
    
    const summary = await summarizeDescription(facility.description);
    
    if (summary) {
      // Update the facility with the summary
      const { error: updateError } = await supabase
        .from('facilities')
        .update({ summary })
        .eq('id', facility.id);
      
      if (updateError) {
        console.error(`Error updating facility ${facility.facility_id}:`, updateError);
        errorCount++;
      } else {
        console.log(`Successfully summarized: ${facility.name}`);
        successCount++;
      }
    } else {
      console.error(`Failed to generate summary for: ${facility.name}`);
      errorCount++;
    }
    
    // Add a small delay between API calls to avoid rate limiting
    if (i < facilities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`Processing complete: ${successCount} summaries created, ${errorCount} errors`);
}

// Execute the script
console.log('Starting facility description summarization...');
processFacilities()
  .then(() => console.log('Script completed successfully'))
  .catch(error => console.error('Script failed with error:', error)); 