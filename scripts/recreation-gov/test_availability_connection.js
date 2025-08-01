// test_availability_connection.js
// Simple script to test connection to the availability_results table

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths for .env file
try {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '.env') });
} catch (error) {
  console.log('Error loading .env file:', error.message);
}

// Use environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_KEY are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Get table structure
async function getTableStructure() {
  try {
    console.log('Checking table structure...');
    
    // Use rpc to call a PostgreSQL function that returns table structure
    const { data, error } = await supabase.rpc('get_table_structure', { 
      table_name: 'availability_results' 
    });
    
    if (error) {
      console.error('Error getting table structure:', error);
      return null;
    }
    
    console.log('Table structure:', data);
    return data;
  } catch (error) {
    console.error('Error in getTableStructure:', error);
    return null;
  }
}

// Create a SQL function to help with direct inserts
async function createHelperFunctions() {
  try {
    console.log('Creating helper functions...');
    
    // Create a function to get table structure
    const { error: fnError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION get_table_structure(table_name text)
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result jsonb;
        BEGIN
          SELECT jsonb_agg(
            jsonb_build_object(
              'column_name', column_name,
              'data_type', data_type,
              'is_nullable', is_nullable
            )
          ) INTO result
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND table_name = $1
          ORDER BY ordinal_position;
          
          RETURN result;
        END;
        $$;
      `
    });
    
    if (fnError) {
      console.error('Error creating get_table_structure function:', fnError);
    } else {
      console.log('Created get_table_structure function');
    }
    
    // Create a function to insert availability data
    const { error: insertFnError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION insert_availability_data(
          p_facility_id text,
          p_month_date text,
          p_availability_data jsonb,
          p_last_updated timestamptz
        )
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result jsonb;
        BEGIN
          INSERT INTO availability_results (facility_id, month_date, availability_data, last_updated)
          VALUES (p_facility_id, p_month_date, p_availability_data, p_last_updated)
          ON CONFLICT (facility_id, month_date) 
          DO UPDATE SET 
            availability_data = EXCLUDED.availability_data,
            last_updated = EXCLUDED.last_updated
          RETURNING to_jsonb(availability_results.*) INTO result;
          
          RETURN result;
        END;
        $$;
      `
    });
    
    if (insertFnError) {
      console.error('Error creating insert_availability_data function:', insertFnError);
    } else {
      console.log('Created insert_availability_data function');
    }
    
    // Create a function to execute SQL
    const { error: execSqlError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result jsonb;
        BEGIN
          EXECUTE sql_query;
          RETURN jsonb_build_object('success', true);
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
          );
        END;
        $$;
      `
    });
    
    if (execSqlError) {
      console.error('Error creating execute_sql function:', execSqlError);
    } else {
      console.log('Created execute_sql function');
    }
    
  } catch (error) {
    console.error('Error creating helper functions:', error);
  }
}

async function testConnection() {
  try {
    console.log('Testing connection to availability_results table...');
    
    // Create helper functions first
    await createHelperFunctions();
    
    // Get table structure
    const tableStructure = await getTableStructure();
    
    // Test SELECT
    console.log('\nTesting SELECT...');
    const { data: selectData, error: selectError } = await supabase
      .from('availability_results')
      .select('*')
      .limit(1);
      
    if (selectError) {
      console.error('SELECT Error:', selectError);
    } else {
      console.log('SELECT successful. Records found:', selectData.length);
      if (selectData.length > 0) {
        console.log('Sample record structure:');
        console.log('- id:', selectData[0].id);
        console.log('- facility_id:', selectData[0].facility_id);
        console.log('- month_date:', selectData[0].month_date);
        console.log('- last_updated:', selectData[0].last_updated);
        console.log('- availability_data keys:', Object.keys(selectData[0].availability_data || {}));
      }
    }
    
    // Test INSERT with a test record
    console.log('\nTesting INSERT...');
    const testData = {
      facility_id: 'test_facility',
      month_date: '2023-01-01',
      availability_data: { test: true, campsites: {} },
      last_updated: new Date().toISOString()
    };
    
    const { error: insertError } = await supabase
      .from('availability_results')
      .upsert(testData, {
        onConflict: 'facility_id,month_date'
      });
      
    if (insertError) {
      console.error('INSERT Error:', insertError);
      
      // Try using the function we created
      console.log('Trying direct insert via function...');
      
      const { data: insertData, error: fnInsertError } = await supabase.rpc('insert_availability_data', {
        p_facility_id: 'test_facility',
        p_month_date: '2023-01-01',
        p_availability_data: testData.availability_data,
        p_last_updated: testData.last_updated
      });
      
      if (fnInsertError) {
        console.error('Function INSERT Error:', fnInsertError);
        
        // Last resort - try execute_sql
        console.log('Trying execute_sql as last resort...');
        const jsonString = JSON.stringify(testData.availability_data).replace(/'/g, "''");
        
        const { data: sqlResult, error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: `
            INSERT INTO availability_results (facility_id, month_date, availability_data, last_updated)
            VALUES ('test_facility', '2023-01-01', '${jsonString}'::jsonb, '${new Date().toISOString()}')
            ON CONFLICT (facility_id, month_date) 
            DO UPDATE SET 
              availability_data = EXCLUDED.availability_data,
              last_updated = EXCLUDED.last_updated
          `
        });
        
        if (sqlError) {
          console.error('Execute SQL Error:', sqlError);
        } else {
          console.log('Execute SQL result:', sqlResult);
        }
      } else {
        console.log('Function INSERT successful:', insertData);
      }
    } else {
      console.log('INSERT successful');
    }
    
    // Test DELETE the test record
    console.log('\nCleaning up test data...');
    const { error: deleteError } = await supabase
      .from('availability_results')
      .delete()
      .eq('facility_id', 'test_facility');
      
    if (deleteError) {
      console.error('DELETE Error:', deleteError);
      
      // Try using execute_sql
      const { data: sqlDeleteResult, error: sqlDeleteError } = await supabase.rpc('execute_sql', {
        sql_query: `DELETE FROM availability_results WHERE facility_id = 'test_facility'`
      });
      
      if (sqlDeleteError) {
        console.error('Execute SQL DELETE Error:', sqlDeleteError);
      } else {
        console.log('Execute SQL DELETE result:', sqlDeleteResult);
      }
    } else {
      console.log('DELETE successful');
    }
    
    console.log('\nTest completed');
  } catch (error) {
    console.error('Test error:', error);
  }
}

testConnection(); 