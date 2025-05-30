// Update Trips Schema to add notes column
// Run with: node scripts/update-trips-schema.js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or service role key is not defined in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const updateSchema = async () => {
  try {
    // Since we can't directly use RPC for this, we'll use a raw SQL query
    const { error } = await supabase.from('_exec_sql').select('*').eq('query', `
      ALTER TABLE trips 
      ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
    `);

    if (error) {
      throw error;
    }

    console.log('Successfully updated trips table schema to add notes column');
  } catch (error) {
    console.error('Error updating schema:', error);
  }
};

const main = async () => {
  await updateSchema();
};

main().catch(console.error); 