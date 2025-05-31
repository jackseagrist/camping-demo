import { useState } from 'react';
import Head from 'next/head';

export default function ApiTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [endpoint, setEndpoint] = useState('test-openai');

  const testAPI = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/${endpoint}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err) {
      setError({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>API Test Page</title>
      </Head>

      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">API Test</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Test Endpoint:
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="test-openai"
                checked={endpoint === 'test-openai'}
                onChange={() => setEndpoint('test-openai')}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2">OpenAI Standard</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="test-openai-alt"
                checked={endpoint === 'test-openai-alt'}
                onChange={() => setEndpoint('test-openai-alt')}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2">OpenAI Alternative</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="test-supabase-service"
                checked={endpoint === 'test-supabase-service'}
                onChange={() => setEndpoint('test-supabase-service')}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2">Supabase Service Role</span>
            </label>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Testing endpoint: <code className="bg-gray-100 px-1 py-0.5 rounded">/api/{endpoint}</code>
          </p>
        </div>
        
        <button 
          onClick={testAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test API'}
        </button>
        
        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="text-lg font-medium text-green-800">Success</h3>
            <pre className="mt-2 text-sm overflow-auto p-2 bg-white border rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="text-lg font-medium text-red-800">Error</h3>
            <pre className="mt-2 text-sm overflow-auto p-2 bg-white border rounded">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mt-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
        <p className="mb-2">Check if your environment variables are set up correctly:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            OPENAI_API_KEY: {process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'} 
            (Note: This will always show "Not set" on the client side for security)
          </li>
          <li>
            NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}
          </li>
          <li>
            NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}
          </li>
          <li>
            SUPABASE_SERVICE_ROLE_KEY: {process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set'}
            (Note: This will always show "Not set" on the client side for security)
          </li>
        </ul>
      </div>
      
      <div className="mt-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
        <p className="mb-2">If you're having issues:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Make sure your <code className="bg-gray-100 px-1 py-0.5 rounded">.env.local</code> file is in the correct location (in the frontend directory)
          </li>
          <li>
            Add the SUPABASE_SERVICE_ROLE_KEY to your .env.local file:
            <pre className="mt-1 text-sm overflow-auto p-2 bg-gray-100 rounded">SUPABASE_SERVICE_ROLE_KEY=your_service_role_key</pre>
            <p className="text-xs text-gray-500 mt-1">You can find this in your Supabase dashboard under Settings &gt; API</p>
          </li>
          <li>
            Restart your Next.js development server completely
          </li>
        </ol>
      </div>
    </div>
  );
} 