// worker.mjs
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// If your script lives elsewhere, adjust this path.
const scriptPath = path.join(__dirname, 'fetchAvailability.js');

export const handler = async (event = {}, context = {}) => {
  // Support EventBridge constant input and HTTP events
  const qs = event.queryStringParameters || {};
  const get = (k, def) => (qs[k] ?? event[k] ?? def);

  // Inputs (numbers or strings are OK)
  const facilityIds   = get('facilityIds', undefined); // CSV e.g., "233450,233451"
  const batchSize     = String(get('batchSize', process.env.BATCH_SIZE ?? '10'));
  const intervalMs    = String(get('intervalMs', process.env.INTERVAL_MS ?? '0'));
  const requestDelay  = String(get('requestDelayMs', process.env.REQUEST_DELAY_MS ?? '1200')); // ~50 rpm
  const maxRetries    = String(get('maxRetries', process.env.MAX_RETRIES ?? '2'));
  const baseBackoff   = String(get('baseBackoffMs', process.env.BASE_BACKOFF_MS ?? '1000'));
  const offset        = get('offset', undefined);

  // Supabase creds: prefer Lambda env, but accept overrides from event/qs
  const supabaseUrl   = get('supabaseUrl', process.env.SUPABASE_URL);
  const supabaseKey   = get('supabaseKey', process.env.SUPABASE_KEY);

  // Build CLI args for the child process
  const args = [scriptPath, '--force'];
  if (supabaseUrl) args.push(`--supabaseUrl=${supabaseUrl}`);
  if (supabaseKey) args.push(`--supabaseKey=${supabaseKey}`);
  if (facilityIds) args.push(`--facilityIds=${facilityIds}`);
  if (batchSize)   args.push(`--batchSize=${batchSize}`);
  if (requestDelay)args.push(`--requestDelayMs=${requestDelay}`);
  if (typeof offset !== 'undefined') args.push('--offset', String(offset));
  if (intervalMs && intervalMs !== '0') args.push(`--intervalMs=${intervalMs}`);

  // Child env (script also reads env vars; we provide both for redundancy)
  const childEnv = {
    ...process.env,
    SUPABASE_URL: supabaseUrl ?? process.env.SUPABASE_URL ?? '',
    SUPABASE_KEY: supabaseKey ?? process.env.SUPABASE_KEY ?? '',
    BATCH_SIZE: batchSize,
    INTERVAL_MS: intervalMs,
    REQUEST_DELAY_MS: requestDelay,
    MAX_RETRIES: maxRetries,
    BASE_BACKOFF_MS: baseBackoff
  };

  // Log a safe summary (don’t leak full secrets)
  console.log('Worker Lambda invoked with event:', {
    batchSize: Number(batchSize),
    requestDelayMs: Number(requestDelay),
    offset: (typeof offset !== 'undefined') ? Number(offset) : undefined,
    facilityIds: facilityIds ? `[${facilityIds.split(',').length} ids]` : undefined
  });
  console.log('Starting fetchAvailability script with args:', args.slice(1)); // hide absolute path
  console.log('Working directory:', path.dirname(scriptPath));

  try {
    const remaining = typeof context.getRemainingTimeInMillis === 'function'
      ? context.getRemainingTimeInMillis()
      : 14 * 60 * 1000;
    console.log('Remaining time:', remaining);

    const output = [];
    const errorOutput = [];

    const child = spawn(process.execPath, args, {
      cwd: path.dirname(scriptPath),
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', d => {
      const s = d.toString();
      output.push(s);
      // Stream through for live visibility
      console.log('STDOUT:', s.trimEnd());
    });
    child.stderr.on('data', d => {
      const s = d.toString();
      errorOutput.push(s);
      console.error('STDERR:', s.trimEnd());
    });

    // Kill a few seconds before timeout
    const killDelay = Math.max(0, remaining - 5000);
    const watchdog = setTimeout(() => {
      console.error('Watchdog: killing child before timeout');
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 1500);
    }, killDelay);

    const exitCode = await new Promise(resolve => child.on('close', resolve));
    clearTimeout(watchdog);

    if (exitCode !== 0) {
      console.error('fetchAvailability script exited with code', exitCode, 'signal', child.signalCode);
      throw new Error(`Child process exited with code ${exitCode}, signal ${child.signalCode}`);
    }

    const body = {
      success: true,
      exitCode,
      // clip long logs to keep response small
      output: output.join('').slice(-2000),
      errorOutput: errorOutput.join('').slice(-2000)
    };
    console.log('Worker finished successfully');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    };
  } catch (err) {
    console.error('Worker execution failed:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: String(err?.message || err),
      })
    };
  }
};
