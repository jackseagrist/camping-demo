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

async function processFacilities() {
  // Get facilities with descriptions but no summaries
  const { data: facilities, error } = await supabase
    .from('facilities')
    .select('id, facility_id, name, description')
    .not('description', 'is', null)
    .is('summary', null)
    .order('id');
  
  if (error) {
    console.error('Error fetching facilities:', error);
    return;
  }
  
  console.log(`Found ${facilities.length} facilities to summarize`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process facilities in batches to avoid rate limiting
  for (let i = 0; i < facilities.length; i++) {
    const facility = facilities[i];
    console.log(`Processing (${i+1}/${facilities.length}): ${facility.name}`);
    
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
      errorCount++;
    }
    
    // Add a small delay between API calls to avoid rate limiting
    if (i < facilities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`Completed: ${successCount} successes, ${errorCount} errors`);
}

// Execute the script
processFacilities()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error)); 