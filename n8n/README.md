# WellRoost Vibe Marketing: n8n Workflow Integration

This directory contains the production-ready n8n workflow for ingesting telemetry from `wellroost.com` interactive micro-assets, calculating buyer intent scores, classifying personas, logging events to Supabase, and dispatching high-intent alerts.

---

## Workflow File

* [`wellroost-vibe-telemetry.json`](./wellroost-vibe-telemetry.json)

---

## Workflow Architecture

```
[Telemetry Webhook] (POST /webhook/wellroost-vibe-telemetry)
  │
  ├───> [Respond to Webhook] (200 OK with event receipt)
  │
  └───> [Qualify Intent & Score] (Code Node)
          │
          ├──> Computes Intent Score (10–100)
          ├──> Classifies Persona (Renovator, Move vs. Improve, Energy, Investor)
          ├──> Formats Smart Brevity Notification Payload
          │
          ▼
        [Log to Supabase] (REST POST to vibe_asset_telemetry)
          │
          ▼
        [High Intent Filter] (Score >= 70 or 'complete' / 'lead_convert')
          │
          └───(true)───> [High Intent Notification] (Slack/Discord/Webhook alert)
```

---

## How to Import & Run in n8n

1. **Open n8n**:
   - Go to your self-hosted or cloud n8n instance (e.g. `http://localhost:5678` or `https://n8n.yourdomain.com`).
2. **Import Workflow**:
   - In the top right menu, select **Workflows** > **Import from File...**
   - Select `n8n/wellroost-vibe-telemetry.json`.
3. **Configure Environment Variables / Credentials**:
   - `PUBLIC_SUPABASE_URL`: e.g. `https://xxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role secret or anon key with write permissions.
   - `HIGH_INTENT_ALERT_WEBHOOK_URL`: Slack Incoming Webhook, Discord Webhook, or CRM endpoint.
4. **Activate**:
   - Toggle the workflow state from **Inactive** to **Active**.
5. **Connect Front-End**:
   - In your `.env` for `wellroost.com`, set:
     ```env
     PUBLIC_TELEMETRY_WEBHOOK_URL=https://your-n8n-instance.com/webhook/wellroost-vibe-telemetry
     ```
