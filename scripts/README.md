# Webhook Test Scripts

This folder contains simple local scripts that send task progress updates to:

- `http://localhost:3000/api/tasks/update`

Use these scripts to simulate external AI tools (Claude, ChatGPT, Cursor, n8n, Zapier, custom bots) sending webhook events into the dashboard.

## Files

- `send-test-progress.py` - Python version (`requests`)
- `send-test-progress.js` - Node.js version (`fetch`)
- `push-progress.js` - semi-automatic CLI bridge for one-off updates
- `task-cli.js` - more automatic command-based bridge (`start/progress/done/block`)
- `make/README.md` - step-by-step Make automation setup
- `make/http-body-template.json` - copy-ready HTTP body template for Make

Both scripts send multiple updates for the same task and simulate:

- `not_started` -> `in_progress` -> `completed`

## Prerequisites

1. Run your app locally:

```bash
npm run dev
```

2. Python script only: install requests

```bash
pip install requests
```

## Run Scripts

### Python

```bash
python scripts/send-test-progress.py
```

### Node.js

```bash
node scripts/send-test-progress.js
```

### Semi-automatic bridge (recommended for daily use)

```bash
node scripts/push-progress.js --tool Claude --externalTaskId claude_task_001 --status in_progress --progress 65 --stage "Writing first draft" --log "Claude is generating section headlines"
```

Or use npm shortcuts from project root:

```bash
npm run webhook:claude -- --status in_progress --progress 65 --stage "Drafting hero section"
npm run webhook:chatgpt -- --status completed --progress 100 --stage "Done" --log "Final answer delivered"
npm run webhook:cursor -- --status blocked --progress 45 --stage "Build failed" --log "Type error in route handler"
```

Generic command:

```bash
npm run webhook:push -- --tool Claude --externalTaskId claude_task_001 --status in_progress --progress 65 --stage "Writing first draft"
```

## More Automatic Mode (`task-cli.js`)

Use short commands and reuse the same `externalTaskId`:

```bash
npm run task -- start claude_task_001 --tool Claude --title "Landing page copy generation"
npm run task -- progress claude_task_001 72 --stage "Polishing value props"
npm run task -- done claude_task_001 --log "Final draft delivered"
npm run task -- block claude_task_001 --log "Waiting for stakeholder feedback"
```

Why this is more automatic:

- You no longer need to type full JSON.
- If a task already exists, it auto-reuses title/description/tool from current dashboard data.
- You only send delta intent: `start`, `progress`, `done`, or `block`.
- Status/progress normalization is built-in.

## Change `WEBHOOK_URL`

By default, both scripts use:

- `http://localhost:3000/api/tasks/update`

Override with environment variable:

### Python

```bash
WEBHOOK_URL="http://localhost:3000/api/tasks/update" python scripts/send-test-progress.py
```

### Node.js

```bash
WEBHOOK_URL="http://localhost:3000/api/tasks/update" node scripts/send-test-progress.js
```

For semi-automatic bridge:

```bash
WEBHOOK_URL="http://localhost:3000/api/tasks/update" node scripts/push-progress.js --status in_progress --progress 65
```

## Change `externalTaskId`

Default:

- `claude_task_001`

Override with environment variable:

### Python

```bash
EXTERNAL_TASK_ID="claude_task_abc" python scripts/send-test-progress.py
```

### Node.js

```bash
EXTERNAL_TASK_ID="claude_task_abc" node scripts/send-test-progress.js
```

If you keep the same `externalTaskId`, webhook calls update the same task.
If you use a new `externalTaskId`, a new task is created.

With `push-progress.js`, you can change task id inline:

```bash
node scripts/push-progress.js --externalTaskId claude_task_landing_v2 --status in_progress --progress 80
```

## Example Payload Shape

The scripts are based on this payload format:

```json
{
  "externalTaskId": "claude_task_001",
  "aiToolName": "Claude",
  "title": "Landing page copy generation",
  "description": "Generate first draft for product landing page",
  "status": "in_progress",
  "progress": 65,
  "currentStage": "Writing first draft",
  "log": "Claude is generating section headlines"
}
```

## Later: Connect to Real AI API Calls

When you integrate real AI calls later, keep this pattern:

1. Start job in your AI tool
2. Emit webhook update when stage changes
3. Send progress (0-100), status, and readable `log` message
4. Reuse the same `externalTaskId` for the same job lifecycle
5. Mark `status=completed` (or `progress=100`) when done

Practical integration approach:

- Wrap each real API call in your own worker function.
- After each stage, call `push-progress.js` (or POST directly in code).
- Reuse the same `externalTaskId` from start to finish.
- Include meaningful `log` messages so the dashboard history is useful.

You can call `npm run task -- ...` from:

- cron jobs
- CI pipelines
- local shell aliases
- wrapper scripts around Claude/Cursor/OpenAI SDK calls

You can wire this into:

- custom Python/Node worker scripts
- n8n workflows
- Zapier / Make automations
- future direct integrations with AI provider SDKs

