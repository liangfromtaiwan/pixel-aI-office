This project includes:

- Web-based AI office simulation (`app/page.tsx`)
- macOS floating AI companion via Electron (`app/pet/page.tsx` + `electron/*`)
- API adapter endpoint for companion state: `GET /api/agent-state`

## Getting Started

Run web app:

```bash
npm run dev
```

### Real AI sync (dashboard `GET /api/tasks`)

Priority (first match wins):

1. **`AI_TASKS_URL`** — your own HTTPS JSON endpoint that aggregates real AI / agent state (see below). Response must be `{ "tasks": [ ... ] }` or a raw array.
2. **Google Sheet** — when `GOOGLE_SHEET_*` is set and readable.
3. **In-memory store** — seed data plus anything pushed via `POST /api/tasks/update` (Make, scripts, Cursor hooks, etc.).

```bash
# Optional: bridge service you host (Node on Railway, Cloudflare Worker, etc.)
AI_TASKS_URL=https://your-api.example.com/v1/dashboard-tasks
# Optional bearer token
# AI_TASKS_TOKEN=...
```

Each task object should include at least **`externalTaskId`** and **`title`**; optional: `description`, `aiToolName`, `status` (`not_started` | `in_progress` | `completed` | `blocked`), `progress`, `currentStage`, `estimatedCompletion`, `log`. Aliases like `currentTask`, `external_task_id` are accepted.

Other ways to stay “real” without `AI_TASKS_URL`:

- **`POST /api/tasks/update`** — call from automation when an AI step starts/finishes (same JSON shape as Make).
- **Make / n8n** — read tool webhooks or APIs, then POST to your deployed `/api/tasks/update` or refresh a Sheet this app reads.

#### Cursor + Claude + ChatGPT (multi-agent)

Use **one stable `externalTaskId` per logical task** (same id for the whole lifecycle). Set **`aiToolName`** to `Cursor`, `Claude`, or `ChatGPT` so the dashboard groups visually.

**Webhook / Make:** one HTTP module per event, or one scenario with a Router on `aiToolName`. Example bodies:

```json
{
  "externalTaskId": "cursor_task_001",
  "aiToolName": "Cursor",
  "title": "Fix auth redirect",
  "description": "Next.js middleware",
  "status": "in_progress",
  "progress": 40,
  "currentStage": "Implementing guard",
  "log": "cursor: pushed progress"
}
```

```json
{
  "externalTaskId": "claude_task_001",
  "aiToolName": "Claude",
  "title": "Landing page copy",
  "description": "First draft",
  "status": "in_progress",
  "progress": 65,
  "currentStage": "Writing first draft",
  "log": "claude: section headlines"
}
```

```json
{
  "externalTaskId": "chatgpt_task_001",
  "aiToolName": "ChatGPT",
  "title": "Interview prep bullets",
  "description": "5 themes",
  "status": "not_started",
  "progress": 0,
  "currentStage": "Queued",
  "log": "chatgpt: reserved for later"
}
```

**`AI_TASKS_URL`:** your bridge returns `{ "tasks": [ ... ] }` merging all three tools from whatever APIs or files you read. Adding ChatGPT later is just more objects in that array (no app code change).

### Optional: use Google Sheet as dashboard task source

`GET /api/tasks` can read tasks directly from Google Sheet when no `AI_TASKS_URL` result is returned, then fall back to in-memory mock/webhook store.

Set one of the following in `.env.local`:

```bash
# Option A: full spreadsheet URL (recommended)
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/<sheet-id>/edit?gid=0#gid=0
GOOGLE_SHEET_GID=0

# Option B: explicit gviz JSON endpoint
# GOOGLE_SHEET_JSON_URL=https://docs.google.com/spreadsheets/d/<sheet-id>/gviz/tq?tqx=out:json&gid=0

# Option C: only sheet id (+ gid)
# GOOGLE_SHEET_ID=<sheet-id>
# GOOGLE_SHEET_GID=0
```

Expected headers (flexible aliases supported): `title`, `description`, `aiToolName`, `status`, `progress`, `currentStage`, `externalTaskId`, `estimatedCompletion`, `log`. Chinese column names like `標題`, `描述`, `狀態`, `進度` are also recognized.

After deploy, open `GET /api/tasks?debug=1` to see `sheetSync` and `aiBridge` diagnostics (why `source` is `ai_bridge`, `google_sheet`, or `memory_store`) without exposing secret env values.

Run desktop companion (Electron + Next):

```bash
npm run dev:desktop
```

## Agent state (`GET /api/agent-state`)

The desktop companion polls this route every ~2.6s.

### Priority order

1. **Fixed real task** (env JSON, JSON file, or per-field env) — use this for your own task text
2. **Remote API** (`AGENT_API_URL`)
3. **ChatGPT** (`OPENAI_API_KEY`) — generates a snapshot when nothing else is available
4. **Mock** — last resort

### Option A — fixed task in `.env.local` (inline JSON)

```bash
AGENT_TASK_JSON={"status":"working","currentTask":"修復登入流程","progress":40,"lastCompletedTask":"完成文案初稿"}
```

- `currentTask` (or `task`) is required
- `status` optional — defaults to `working`
- `progress` optional — defaults to `0`
- `lastCompletedTask` optional — defaults to `—`

### Option B — fixed task JSON file

Copy `data/agent-state.example.json` to `data/agent-state.json` and edit it (gitignored).

```bash
AGENT_TASK_FILE=data/agent-state.json
```

### Option C — one line per field

```bash
AGENT_CURRENT_TASK=修復登入流程
AGENT_STATUS=working
AGENT_PROGRESS=40
AGENT_LAST_COMPLETED_TASK=完成文案初稿
```

`AGENT_STATUS` optional — defaults to `working`.

### Optional: ChatGPT + remote API

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
AGENT_API_URL=https://your-agent-api.example.com/status
AGENT_API_TOKEN=your_optional_bearer_token
```

### Remote API payload (flexible adapter)

- `status`: `idle | thinking | working | blocked | done`
- `currentTask` (or `task`)
- `progress` (0-100)
- `lastCompletedTask` (or `last_completed_task`)

If every source fails, the route falls back to mock simulation.

**Tip:** When `AGENT_TASK_JSON` or `AGENT_TASK_FILE` is set, your companion always shows **your** strings — ChatGPT is not used for text unless fixed sources are removed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
