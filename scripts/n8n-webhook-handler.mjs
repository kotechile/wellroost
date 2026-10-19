/**
 * WellRoost Vibe Marketing: Agentic Plumbing n8n Webhook Integration
 * Forwards telemetry events from wellroost.com interactive micro-assets
 * to n8n workflows for intent qualification, lead scoring, and automated telemetry ingestion.
 */

import http from 'node:http';

const PORT = process.env.PORT || 3030;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/wellroost-vibe-telemetry';

const server = http.createServer(async (req, res) => {
	// CORS Headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	if (req.method === 'POST' && req.url === '/api/telemetry') {
		let body = '';
		req.on('data', (chunk) => {
			body += chunk;
		});

		req.on('end', async () => {
			try {
				const payload = JSON.parse(body);

				// Validate telemetry payload structure
				if (!payload.asset_slug || !payload.event_type) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Missing required telemetry fields' }));
					return;
				}

				// Forward to n8n webhook
				if (process.env.N8N_WEBHOOK_URL) {
					try {
						await fetch(N8N_WEBHOOK_URL, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								source: 'wellroost.com',
								received_at: new Date().toISOString(),
								...payload
							})
						});
					} catch (forwardErr) {
						console.error('[n8n Forwarding Error]:', forwardErr.message);
					}
				}

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'ok', received: true }));
			} catch (parseErr) {
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
			}
		});
		return;
	}

	res.writeHead(404, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify({ error: 'Not Found' }));
});

if (process.env.NODE_ENV !== 'test') {
	server.listen(PORT, () => {
		console.log(`[WellRoost n8n Relay] Listening on port ${PORT}`);
	});
}

export default server;
