// pages/test-db.js
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function TestDB() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [tables, setTables] = useState([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Testing Supabase connection...");
        
        // Try to list available tables
        try {
          const { data: tablesData, error: tablesError } = await supabase.rpc('list_tables');
          if (tablesError) {
            console.error("Error listing tables:", tablesError);
          } else {
            console.log("Available tables:", tablesData);
            setTables(tablesData || []);
          }
        } catch (e) {
          console.error("Exception when listing tables:", e);
        }
        
        // Approach 1: Basic query
        const { data: basicData, error: basicError } = await supabase
          .from('campsites')
          .select('*')
          .limit(5);
        
        if (basicError) {
          console.error("Basic query error:", basicError);
          setError(basicError.message);
        } else {
          console.log("Basic query results:", basicData);
          setData(basicData || []);
        }
        
        // Try executing a simple SQL query
        const { data: sqlData, error: sqlError } = await supabase
          .rpc('simple_query', { table_name: 'campsites' });
        
        if (sqlError) {
          console.error("SQL query error:", sqlError);
        } else {
          console.log("SQL query results:", sqlData);
          if (sqlData && sqlData.length > 0 && data.length === 0) {
            setData(sqlData);
          }
        }
        
      } catch (error) {
        console.error("Unexpected error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      {loading ? (
        <p>Loading database data...</p>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded-lg text-red-800 mb-4">
          <p className="font-bold">Error connecting to database:</p>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Available Tables</h2>
            {tables.length > 0 ? (
              <ul className="list-disc pl-6">
                {tables.map((table, i) => (
                  <li key={i}>{table}</li>
                ))}
              </ul>
            ) : (
              <p>No tables found or couldn't list tables.</p>
            )}
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Data from 'campsites' table ({data.length} records)</h2>
          
          {data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {Object.keys(data[0]).map(key => (
                      <th key={key} className="py-2 px-4 border-b text-left">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      {Object.values(item).map((value, i) => (
                        <td key={i} className="py-2 px-4">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No data found in the campsites table.</p>
          )}
        </>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Debugging Information</h2>
        <p>Tables: {tables.length}</p>
        <p>Records: {data.length}</p>
        <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set"}</p>
        <p>Supabase key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set"}</p>
      </div>
    </div>
  );
} 