# Make Automation Guide

This guide helps you connect [Make](https://www.make.com/) to your local dashboard webhook.

## 1) Expose Localhost to Public URL

Make (cloud) cannot call `localhost` directly. You need a tunnel.

### Option A: ngrok

```bash
ngrok http 3000
```

### Option B: cloudflared

```bash
cloudflared tunnel --url http://localhost:3000
```

You will get a public URL such as:

- `https://abc123.ngrok-free.app`

Your webhook endpoint becomes:

- `https://abc123.ngrok-free.app/api/tasks/update`

## 2) Build a Make Scenario

Recommended minimal flow:

1. **Trigger**
   - Scheduler (every 1-5 minutes), or
   - Webhook trigger from another app
2. **(Optional) Data mapping**
   - Normalize status/progress fields
3. **HTTP > Make a request**
   - Method: `POST`
   - URL: `https://<your-public-url>/api/tasks/update`
   - Headers: `Content-Type: application/json`
   - Body type: `Raw` (JSON)
   - Body: use `http-body-template.json`

## 3) HTTP Body Template

Use `scripts/make/http-body-template.json` as the request body.

Important mapping rules:

- Keep `externalTaskId` stable for the same task lifecycle
- Use one-line logs in `log`
- Send progress in `0-100`

## 4) Test

1. Click **Run once** in Make
2. Verify dashboard `/` gets task updates
3. Enable Auto Sync in header, or click Refresh

## 5) Common Setup Patterns

### A) One scenario per tool

- Scenario: Claude -> webhook
- Scenario: ChatGPT -> webhook
- Scenario: Cursor -> webhook

### B) Unified scenario

- Trigger from one source (Notion/Sheets/webhook queue)
- Router by `aiToolName`
- One HTTP step posting to dashboard

## 7) Troubleshooting: Make shows empty strings in HTTP INPUT

If the HTTP module INPUT body is all `""`, Make did **not** resolve `{{1.*}}` (wrong field name, wrong module number, or Sheets returned no bundle).

Fix:

1. Click the **Google Sheets** bubble → open **Bundle 1** → copy the **exact** property names shown.
2. In HTTP body, **delete hand-typed `{{...}}`** and re-insert each value using the **field picker** (click the input → map from module 1).
3. Or send the whole row object (supported by the app): set body to a JSON object whose keys match your sheet headers, e.g. `ID`, `標題`, `工具`, … with values picked from the Sheets module.

The deployed webhook also accepts **Chinese header keys** as top-level JSON keys (`標題`, `ID`, `工具`, `描述`, `狀態`, `目前階段`, `備註`) and optional wrappers `{ "1": { ... } }` or `{ "row": { ... } }`.

Production URL example:

- `https://pixel-a-i-office.vercel.app/api/tasks/update`

