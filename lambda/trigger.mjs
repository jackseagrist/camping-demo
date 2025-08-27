import AWS from 'aws-sdk';
const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });

export const handler = async (event = {}) => {
  console.log('Trigger event:', JSON.stringify(event));

  // Accept token via header or querystring
  const hdr = event.headers || {};
  const auth = hdr.authorization || hdr.Authorization || '';
  const qs   = event.queryStringParameters || {};
  const token = (qs.token) || (auth.startsWith('Bearer ') ? auth.slice(7) : '');

  if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
    return { statusCode: 401, body: JSON.stringify({ success: false, error: 'unauthorized' }) };
  }

  // bubble through any tunables/params
  const payload = {
    facilityIds: qs.facilityIds ?? event.facilityIds,
    batchSize: qs.batchSize ?? event.batchSize,
    intervalMs: qs.intervalMs ?? event.intervalMs,
    requestDelayMs: qs.requestDelayMs ?? event.requestDelayMs,
    maxRetries: qs.maxRetries ?? event.maxRetries,
    baseBackoffMs: qs.baseBackoffMs ?? event.baseBackoffMs,
    offset: (qs.offset ?? event.offset)
  };

  const FunctionName = process.env.WORKER_FUNCTION_NAME;
  if (!FunctionName) {
    return { statusCode: 500, body: JSON.stringify({ success:false, error:'missing_worker_name' }) };
  }

  await lambda.invoke({
    FunctionName,
    InvocationType: 'Event', // async
    Payload: JSON.stringify(payload)
  }).promise();

  return {
    statusCode: 202,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, invoked: FunctionName, payload })
  };
};
