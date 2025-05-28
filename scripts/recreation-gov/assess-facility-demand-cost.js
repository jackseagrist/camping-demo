import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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

// First, let's add the new columns to the facilities table if they don't exist
async function addColumnsIfNeeded() {
  try {
    console.log('Checking if columns need to be added to facilities table...');
    
    // Check if the columns already exist
    const { data: columnInfo, error: columnError } = await supabase
      .rpc('list_tables');
    
    if (columnError) {
      throw columnError;
    }
    
    // Add the columns if they don't exist using Supabase SQL
    const { error } = await supabase.rpc('add_facility_assessment_columns');
    
    if (error) {
      // If there's an error with the RPC, try direct query execution
      console.log('Using direct SQL to add columns...');
      const { error: sqlError } = await supabase.query(`
        DO $$
        BEGIN
          -- Add demand_assessment column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facilities' 
            AND column_name = 'demand_assessment'
          ) THEN
            ALTER TABLE facilities ADD COLUMN demand_assessment TEXT;
          END IF;
          
          -- Add cost_assessment_1 (dollar amount) column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facilities' 
            AND column_name = 'cost_assessment_1'
          ) THEN
            ALTER TABLE facilities ADD COLUMN cost_assessment_1 NUMERIC;
          END IF;
          
          -- Add cost_assessment_2 (category) column if it doesn't exist
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facilities' 
            AND column_name = 'cost_assessment_2'
          ) THEN
            ALTER TABLE facilities ADD COLUMN cost_assessment_2 TEXT;
          END IF;
        END $$;
      `);
      
      if (sqlError) {
        throw sqlError;
      }
    }
    
    console.log('Columns are ready for assessment data.');
  } catch (error) {
    console.error('Error adding columns:', error);
    throw error;
  }
}

// Assess demand for a facility
async function assessDemand(facility) {
  try {
    // Get related campsites for this facility
    const { data: relatedCampsites, error: campsitesError } = await supabase
      .from('campsites')
      .select('*')
      .eq('facility_id', facility.facility_id);
    
    if (campsitesError) {
      console.error(`Error fetching campsites for facility ${facility.facility_id}:`, campsitesError);
    }
    
    const numCampsites = relatedCampsites ? relatedCampsites.length : 0;
    
    const prompt = `
      Please assess the likely demand level for this campground and respond with ONLY ONE of these exact words: "Very high", "High", "Medium", or "Low".
      
      Campground details:
      Name: ${facility.name}
      Type: ${facility.type || 'Not specified'}
      Location: ${facility.city || ''}, ${facility.state || ''}
      Coordinates: Latitude ${facility.lat}, Longitude ${facility.lon}
      Number of campsites: ${numCampsites}
      
      Additional context:
      - Consider the location (proximity to attractions/parks)
      - Accessibility features
      - Type of campground
      - Available amenities: ${JSON.stringify(facility.amenities || [])}
      - Activities: ${JSON.stringify(facility.activities || [])}
      - Description: ${facility.description || 'Not provided'}
      
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
    console.error(`Error assessing demand for facility ${facility.facility_id}:`, error);
    throw error;
  }
}

// Assess cost for a facility (both dollar amount and category)
async function assessCost(facility) {
  try {
    // Get related campsites for this facility
    const { data: relatedCampsites, error: campsitesError } = await supabase
      .from('campsites')
      .select('*')
      .eq('facility_id', facility.facility_id);
    
    if (campsitesError) {
      console.error(`Error fetching campsites for facility ${facility.facility_id}:`, campsitesError);
    }
    
    const numCampsites = relatedCampsites ? relatedCampsites.length : 0;
    
    const prompt = `
      Please estimate the average nightly cost for this campground based on the provided information.
      
      Campground details:
      Name: ${facility.name}
      Type: ${facility.type || 'Not specified'}
      Location: ${facility.city || ''}, ${facility.state || ''}
      Coordinates: Latitude ${facility.lat}, Longitude ${facility.lon}
      Number of campsites: ${numCampsites}
      
      Additional context:
      - Consider the location (proximity to attractions/parks)
      - Type of campground (National Parks tend to be cheaper than private resorts)
      - Available amenities: ${JSON.stringify(facility.amenities || [])}
      - Activities: ${JSON.stringify(facility.activities || [])}
      - Description: ${facility.description || 'Not provided'}
      
      Respond with EXACTLY this format: "$X|Category" where X is the estimated average nightly cost in USD (number only, no range), and Category is exactly one of these: "Very expensive", "Expensive", "Affordable", or "Bargain"
      
      Example valid responses:
      "$45|Affordable"
      "$120|Very expensive"
      "$25|Bargain"
      "$85|Expensive"
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert in camping and outdoor recreation pricing. Respond only with the exact format: $X|Category where X is a number and Category is one of: Very expensive, Expensive, Affordable, or Bargain."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 20
    });

    const costResponse = completion.choices[0].message.content.trim();
    
    // Parse the response
    const match = costResponse.match(/\$(\d+)\|(Very expensive|Expensive|Affordable|Bargain)/);
    if (!match) {
      throw new Error(`Invalid cost assessment format: ${costResponse}`);
    }
    
    const dollarAmount = parseInt(match[1], 10);
    const costCategory = match[2];
    
    return {
      cost_assessment_1: dollarAmount,
      cost_assessment_2: costCategory
    };
  } catch (error) {
    console.error(`Error assessing cost for facility ${facility.facility_id}:`, error);
    throw error;
  }
}

// Update facility with demand and cost assessments
async function updateFacilityAssessments(facility, demand, costAssessment) {
  const { error } = await supabase
    .from('facilities')
    .update({ 
      demand_assessment: demand,
      cost_assessment_1: costAssessment.cost_assessment_1,
      cost_assessment_2: costAssessment.cost_assessment_2
    })
    .eq('facility_id', facility.facility_id);

  if (error) {
    throw error;
  }
}

// Main process to handle all facilities
async function processFacilities(batchSize = 10) {
  try {
    console.log('Starting facility assessment...');
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let hasMore = true;
    
    // Get total count of unprocessed facilities
    const { count } = await supabase
      .from('facilities')
      .select('*', { count: 'exact', head: true })
      .is('demand_assessment', null);

    console.log(`Total facilities to process: ${count || 'unknown'}`);

    while (hasMore) {
      // Get next batch of facilities
      const { data: facilities, error } = await supabase
        .from('facilities')
        .select('*')
        .is('demand_assessment', null)
        .limit(batchSize);

      if (error) {
        throw error;
      }

      if (!facilities || facilities.length === 0) {
        hasMore = false;
        continue;
      }

      console.log(`\nProcessing batch of ${facilities.length} facilities...`);

      for (const facility of facilities) {
        try {
          console.log(`\nAssessing facility: ${facility.name} (${facility.facility_id})...`);
          
          // Assess demand
          console.log(`- Assessing demand...`);
          const demand = await assessDemand(facility);
          console.log(`- Demand assessment: ${demand}`);
          
          // Assess cost
          console.log(`- Assessing cost...`);
          const costAssessment = await assessCost(facility);
          console.log(`- Cost assessment: $${costAssessment.cost_assessment_1} (${costAssessment.cost_assessment_2})`);
          
          // Update the facility record
          await updateFacilityAssessments(facility, demand, costAssessment);
          console.log(`✓ Updated assessments for facility ${facility.facility_id}`);
          
          successCount++;
          
          // Add a delay to avoid rate limiting with the OpenAI API
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error(`Error processing facility ${facility.facility_id}:`, error);
          errorCount++;
        }
        processedCount++;
      }

      console.log('\nBatch Summary:');
      console.log(`Processed: ${processedCount}/${count || 'unknown'}`);
      console.log(`Successful: ${successCount}`);
      console.log(`Errors: ${errorCount}`);
      if (count) {
        console.log(`Progress: ${Math.round((processedCount/count) * 100)}%`);
      }
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
  console.log('Starting facility demand and cost assessment...');
  console.log('----------------------------------------------');
  
  try {
    // First add the columns if they don't exist
    await addColumnsIfNeeded();
    
    // Then process the facilities
    await processFacilities();
    
    console.log('----------------------------------------------');
    console.log('Process completed!');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main(); 