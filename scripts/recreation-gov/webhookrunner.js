import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const CRON_TOKEN = process.env.CRON_TOKEN;

let running = false;

app.get('/cron/fetch-availability', (req, res) => {
	const token = req.query.token || req.headers['authorization']?.replace('Bearer ', '');
	if (!CRON_TOKEN || token !== CRON_TOKEN) {
		return res.status(401).json({ ok: false, error: 'unauthorized' });
	}
	if (running) {
		return res.json({ ok: true, status: 'already-running' });
	}

	running = true;
	// Build args from query string
	const args = ['fetchAvailability.js', '--force'];
	if (req.query.facilityIds) args.push(`--facilityIds=${req.query.facilityIds}`);
	if (req.query.batchSize) args.push(`--batchSize=${req.query.batchSize}`);
	if (req.query.intervalMs) args.push(`--intervalMs=${req.query.intervalMs}`);
	if (req.query.requestDelayMs) args.push(`--requestDelayMs=${req.query.requestDelayMs}`);
	if (req.query.maxRetries) args.push(`--maxRetries=${req.query.maxRetries}`);
	if (req.query.baseBackoffMs) args.push(`--baseBackoffMs=${req.query.baseBackoffMs}`);

	const child = spawn('node', args, { cwd: __dirname, stdio: 'inherit', env: process.env });

	const killTimer = setTimeout(() => {
		try { child.kill('SIGTERM'); } catch {}
	}, (parseInt(process.env.RUN_MAX_MINUTES || '55', 10)) * 60 * 1000);

	child.on('exit', () => {
		clearTimeout(killTimer);
		running = false;
	});

	return res.json({ ok: true, status: 'started' });
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
	console.log(`cron runner listening on ${PORT}`);
});