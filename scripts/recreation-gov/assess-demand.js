import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as path from 'path';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the scripts directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Verify environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || !process.env.OPENAI_API_KEY) {
  console.error('Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function assessDemand(campsite) {
  try {
    const prompt = `
      Please assess the likely demand level for this campsite and respond with ONLY ONE of these exact words: "Very high", "High", "Medium", or "Low".
      
      Campsite details:
      Name: ${campsite.name}
      Type: ${campsite.campsite_type || 'Not specified'}
      Location: Latitude ${campsite.lat}, Longitude ${campsite.lon}
      Accessible: ${campsite.accessible ? 'Yes' : 'No'}
      
      Additional context:
      - Consider the location (proximity to attractions/parks)
      - Accessibility features
      - Type of campsite
      - Available amenities: ${JSON.stringify(campsite.attributes || [])}
      - Permitted equipment: ${JSON.stringify(campsite.permitted_equipment || [])}
      
      Respond with only one word from: "Very high", "High", "Medium", or "Low"
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert in camping and outdoor recreation. Respond only with one of these exact words: Very high, High, Medium, or Low."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const demand = completion.choices[0].message.content.trim();
    
    // Validate the response
    const validDemands = ['Very high', 'High', 'Medium', 'Low'];
    if (!validDemands.includes(demand)) {
      throw new Error(`Invalid demand assessment: ${demand}`);
    }

    return demand;
  } catch (error) {
    console.error(`Error assessing demand for campsite ${campsite.campsite_id}:`, error);
    throw error;
  }
}

async function updateCampsiteDemand(campsite, demand) {
  const { error } = await supabase
    .from('campsites')
    .update({ demand_assessment: demand })
    .eq('campsite_id', campsite.campsite_id);

  if (error) {
    throw error;
  }
}

async function processCampsites(batchSize = 50) {
  try {
    console.log('Starting demand assessment...');
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let hasMore = true;
    
    // Get total count of unprocessed campsites
    const { count } = await supabase
      .from('campsites')
      .select('*', { count: 'exact', head: true })
      .is('demand_assessment', null);

    console.log(`Total campsites to process: ${count}`);

    while (hasMore) {
      // Get next batch of campsites
      const { data: campsites, error } = await supabase
        .from('campsites')
        .select('*')
        .is('demand_assessment', null)
        .limit(batchSize);

      if (error) {
        throw error;
      }

      if (!campsites || campsites.length === 0) {
        hasMore = false;
        continue;
      }

      console.log(`\nProcessing batch of ${campsites.length} campsites...`);

      for (const campsite of campsites) {
        try {
          console.log(`\nAssessing demand for ${campsite.name} (${campsite.campsite_id})...`);
          
          const demand = await assessDemand(campsite);
          console.log(`Assessed demand: ${demand}`);
          
          await updateCampsiteDemand(campsite, demand);
          console.log(`Updated demand for campsite ${campsite.campsite_id}`);
          
          successCount++;
          
          // Add a delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing campsite ${campsite.campsite_id}:`, error);
          errorCount++;
        }
        processedCount++;
      }

      console.log('\nBatch Summary:');
      console.log(`Processed: ${processedCount}/${count}`);
      console.log(`Successful: ${successCount}`);
      console.log(`Errors: ${errorCount}`);
      console.log(`Progress: ${Math.round((processedCount/count) * 100)}%`);
    }

    console.log('\nFinal Summary:');
    console.log(`Total processed: ${processedCount}`);
    console.log(`Successfully processed: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  console.log('Starting campsite demand assessment...');
  console.log('----------------------------------------');
  
  await processCampsites();
  
  console.log('----------------------------------------');
  console.log('Process completed!');
}

main(); 