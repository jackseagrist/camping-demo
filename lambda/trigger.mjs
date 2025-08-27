export const handler = async (event) => {
  console.log('Trigger Lambda invoked with event:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const tokenHeader = event.headers?.authorization || '';
  const tokenQS = event.queryStringParameters?.token;
  const token = tokenQS || tokenHeader.replace(/^Bearer\s+/i, '');

  if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
    console.warn('Unauthorized access attempt');
    return { 
      statusCode: 401, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: false, 
        error: 'unauthorized',
        message: 'Valid CRON_TOKEN required'
      }) 
    };
  }

  const qs = event.queryStringParameters || {};
  console.log('Query parameters:', qs);

  // Validate worker function name
  if (!process.env.WORKER_FUNCTION_NAME) {
    console.error('WORKER_FUNCTION_NAME environment variable not set');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'configuration_error',
        message: 'Worker function name not configured'
      })
    };
  }

  try {
    const AWS = await import('aws-sdk');
    const lambda = new AWS.Lambda();

    // Build payload with validation and defaults
    const payload = {
      facilityIds: qs.facilityIds || null,
      batchSize: qs.batchSize ? parseInt(qs.batchSize, 10) : null,
      intervalMs: qs.intervalMs ? parseInt(qs.intervalMs, 10) : null,
      requestDelayMs: qs.requestDelayMs ? parseInt(qs.requestDelayMs, 10) : null,
      maxRetries: qs.maxRetries ? parseInt(qs.maxRetries, 10) : null,
      baseBackoffMs: qs.baseBackoffMs ? parseInt(qs.baseBackoffMs, 10) : null,
      offset: qs.offset ? parseInt(qs.offset, 10) : null,
      
      // Add metadata
      triggeredAt: new Date().toISOString(),
      triggeredBy: 'http-trigger'
    };

    // Remove null values to keep payload clean
    Object.keys(payload).forEach(key => payload[key] === null && delete payload[key]);

    console.log('Invoking worker function with payload:', JSON.stringify(payload, null, 2));

    const result = await lambda.invoke({
      FunctionName: process.env.WORKER_FUNCTION_NAME,
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify(payload)
    }).promise();

    console.log('Worker function invoked successfully:', result);

    return { 
      statusCode: 202, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Enable CORS if needed
      },
      body: JSON.stringify({ 
        success: true, 
        status: 'started',
        message: 'fetchAvailability worker function has been invoked asynchronously',
        payload: payload,
        workerFunction: process.env.WORKER_FUNCTION_NAME,
        invocationId: result.ResponseMetadata?.RequestId,
        timestamp: new Date().toISOString()
      }) 
    };

  } catch (error) {
    console.error('Error invoking worker function:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'invocation_failed',
        message: 'Failed to invoke worker function',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 