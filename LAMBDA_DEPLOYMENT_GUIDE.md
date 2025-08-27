# fetchAvailability.js AWS Lambda Deployment Guide

This guide explains how to deploy and run the `fetchAvailability.js` script asynchronously on AWS Lambda.

## Architecture Overview

The deployment consists of three Lambda functions:

1. **Health Function** (`lambda/health.mjs`) - Health check endpoint
2. **Trigger Function** (`lambda/trigger.mjs`) - HTTP endpoint that starts the worker asynchronously
3. **Worker Function** (`lambda/worker.mjs`) - Executes the `fetchAvailability.js` script

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Node.js 18+** installed locally
3. **Serverless Framework** installed globally: `npm install -g serverless`
4. **Environment variables** set up (see Configuration section)

## Configuration

### Required Environment Variables

Create a `.env` file in your project root with:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Security Token for HTTP triggers
CRON_TOKEN=your-secure-random-token-here

# AWS Configuration (if not using AWS CLI profiles)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-west-2
```

### Lambda Configuration Parameters

The worker function accepts these parameters via the trigger payload:

- `facilityIds` - Comma-separated list of facility IDs to process (optional)
- `batchSize` - Number of facilities to process per batch (default: 10)
- `intervalMs` - Interval between batches in milliseconds (default: 0)
- `requestDelayMs` - Delay between individual requests (default: 2000)
- `maxRetries` - Maximum retries per request (default: 2)
- `baseBackoffMs` - Base backoff time for retries (default: 1000)
- `offset` - Starting offset for facility processing (default: 0)

## Deployment Steps

### 1. Install Dependencies

```bash
# Install serverless framework dependencies
npm install

# Install Lambda function dependencies
cd lambda
npm install
cd ..

# Install recreation-gov script dependencies
cd scripts/recreation-gov
npm install
cd ../..
```

### 2. Deploy to AWS

```bash
# Deploy all functions
serverless deploy

# Deploy specific function (faster for updates)
serverless deploy function --function worker
```

### 3. Verify Deployment

```bash
# Test health endpoint
curl https://your-api-gateway-url/healthz

# Expected response: {"ok": true, "timestamp": "..."}
```

## Usage

### Starting the Async Process

#### Option 1: HTTP GET Request

```bash
curl "https://your-api-gateway-url/cron/fetch-availability?token=your-cron-token"
```

#### Option 2: HTTP POST Request with Parameters

```bash
curl -X POST "https://your-api-gateway-url/cron/fetch-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-cron-token" \
  -d '{
    "facilityIds": "232447,232448,232449",
    "batchSize": 5,
    "requestDelayMs": 3000
  }'
```

#### Option 3: Query Parameters

```bash
curl "https://your-api-gateway-url/cron/fetch-availability?token=your-cron-token&batchSize=20&facilityIds=232447,232448"
```

### Response Format

#### Success Response (202)
```json
{
  "success": true,
  "status": "started",
  "message": "fetchAvailability worker function has been invoked asynchronously",
  "payload": {
    "batchSize": 10,
    "requestDelayMs": 2000,
    "triggeredAt": "2024-01-15T10:30:00.000Z",
    "triggeredBy": "http-trigger"
  },
  "workerFunction": "camping-demo-cron-dev-worker",
  "invocationId": "12345678-1234-1234-1234-123456789012",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Error Response (401/500)
```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Valid CRON_TOKEN required",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Monitoring and Debugging

### CloudWatch Logs

View logs for each function:

```bash
# Worker function logs
serverless logs --function worker --tail

# Trigger function logs
serverless logs --function trigger --tail

# All logs
serverless logs --tail
```

### Dead Letter Queue

Failed executions are sent to a Dead Letter Queue (DLQ) for debugging:

- Queue Name: `camping-demo-cron-{stage}-worker-dlq`
- Retention: 14 days
- Access via AWS SQS Console

### Common Issues and Solutions

#### 1. "SUPABASE_URL is required" Error
- Ensure environment variables are set in your deployment environment
- Check `.env` file exists and is properly formatted
- Verify serverless.yml environment section

#### 2. Lambda Timeout
- Increase timeout in `serverless.yml` (max 15 minutes)
- Reduce `batchSize` to process fewer facilities per invocation
- Use `offset` parameter to continue from where previous execution left off

#### 3. Rate Limiting from Recreation.gov
- Increase `requestDelayMs` (recommended: 2000-5000ms)
- Reduce `batchSize` to limit concurrent requests
- The script includes automatic retry with exponential backoff

#### 4. Memory Issues
- Current setting: 2048MB for worker function
- Increase if processing large datasets
- Monitor CloudWatch metrics for memory usage

## Scheduling

### CloudWatch Events (Recommended)

Add to `serverless.yml`:

```yaml
functions:
  trigger:
    events:
      - schedule:
          rate: rate(6 hours)  # Run every 6 hours
          input:
            batchSize: 50
            requestDelayMs: 2000
```

### External Cron Services

Use services like:
- GitHub Actions with scheduled workflows
- AWS EventBridge
- External cron services (cron-job.org, etc.)

Example GitHub Action:
```yaml
name: Fetch Availability
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Lambda
        run: |
          curl -X POST "${{ secrets.LAMBDA_ENDPOINT }}" \
            -H "Authorization: Bearer ${{ secrets.CRON_TOKEN }}"
```

## Performance Optimization

### For Large Datasets

1. **Chunked Processing**: Use smaller batch sizes with offset
2. **Multiple Invocations**: Trigger multiple workers with different offsets
3. **Facility Filtering**: Use `facilityIds` parameter for specific facilities

### Example: Processing 1000 Facilities in Parallel

```bash
# Start 4 workers processing 250 facilities each
curl "https://api-url/cron/fetch-availability?token=TOKEN&batchSize=25&offset=0" &
curl "https://api-url/cron/fetch-availability?token=TOKEN&batchSize=25&offset=250" &
curl "https://api-url/cron/fetch-availability?token=TOKEN&batchSize=25&offset=500" &
curl "https://api-url/cron/fetch-availability?token=TOKEN&batchSize=25&offset=750" &
```

## Cost Optimization

### Lambda Costs
- Worker function: ~$0.0000166667 per GB-second
- At 2GB memory, 900s timeout: ~$0.03 per execution
- Reserved concurrency limits parallel executions (cost control)

### API Gateway Costs
- ~$3.50 per million requests
- Minimal cost for trigger endpoints

### Data Transfer
- Outbound data transfer charges may apply
- First 1GB per month is free

## Security

### Best Practices

1. **Rotate CRON_TOKEN regularly**
2. **Use HTTPS only** for all endpoints
3. **Restrict API Gateway access** with resource policies if needed
4. **Monitor access logs** for unauthorized attempts
5. **Use least-privilege IAM roles**

### Sample IAM Policy for External Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:region:account:api-id/stage/GET/cron/fetch-availability"
    }
  ]
}
```

## Troubleshooting Commands

```bash
# Check deployment status
serverless info

# View recent logs
serverless logs --function worker --startTime 1h

# Redeploy single function
serverless deploy function --function worker

# Remove deployment
serverless remove

# Test locally (requires serverless-offline)
serverless offline start
```

## Support and Maintenance

### Regular Tasks

1. **Monitor CloudWatch metrics** for errors and timeouts
2. **Check DLQ** for failed executions
3. **Review logs** for rate limiting or API changes
4. **Update dependencies** regularly
5. **Test deployments** in staging environment

### Updating the Script

When updating `fetchAvailability.js`:

1. Test changes locally
2. Deploy to staging environment
3. Verify with small batch size
4. Deploy to production
5. Monitor first few executions

---

For additional support or questions, check the CloudWatch logs and DLQ for detailed error information. 