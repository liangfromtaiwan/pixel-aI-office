#!/usr/bin/env node

/**
 * Task CLI: higher automation wrapper around /api/tasks/update
 *
 * Examples:
 *   node scripts/task-cli.js start claude_task_001 --tool Claude --title "Landing page copy generation"
 *   node scripts/task-cli.js progress claude_task_001 72 --stage "Polishing value props"
 *   node scripts/task-cli.js done claude_task_001 --log "Final draft delivered"
 *   node scripts/task-cli.js block claude_task_001 --log "Waiting for API key"
 */

const BASE_URL = process.env.WEBHOOK_BASE_URL || "http://localhost:3000";
const WEBHOOK_URL = process.env.WEBHOOK_URL || `${BASE_URL}/api/tasks/update`;
const TASKS_URL = `${BASE_URL}/api/tasks`;

const HELP = `
Usage:
  node scripts/task-cli.js <command> <externalTaskId> [args] [options]

Commands:
  start <id>                  Set task to not_started
  progress <id> <percent>     Set task in_progress with progress 0-100
  done <id>                   Set task completed (progress 100)
  block <id>                  Set task blocked
  raw <id> <status> <percent> Send exact status/progress (normalized)

Options:
  --tool <name>               Cursor | Claude | ChatGPT (default: Claude)
  --title <text>              Task title (fallback when task does not exist)
  --description <text>        Task description fallback
  --stage <text>              Current stage text
  --log <text>                Activity log message
  --help                      Show help

Env:
  WEBHOOK_BASE_URL            Default: http://localhost:3000
  WEBHOOK_URL                 Full update endpoint override
`;

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      options[key] = "true";
      continue;
    }
    options[key] = next;
    i += 1;
  }
  return { positional, options };
}

function normalize(status, progress) {
  let s = status;
  let p = Number.parseInt(String(progress), 10);
  if (!Number.isFinite(p)) p = 0;
  p = Math.max(0, Math.min(100, p));
  if (s === "not_started") p = 0;
  if (s === "completed") p = 100;
  if (p === 100) s = "completed";
  return { status: s, progress: p };
}

function inferToolFromId(externalTaskId) {
  const id = externalTaskId.toLowerCase();
  if (id.includes("chatgpt") || id.includes("gpt")) return "ChatGPT";
  if (id.includes("cursor")) return "Cursor";
  return "Claude";
}

async function loadExistingTask(externalTaskId) {
  try {
    const res = await fetch(TASKS_URL, { method: "GET" });
    if (!res.ok) return null;
    const body = await res.json();
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    return tasks.find((task) => task.externalTaskId === externalTaskId) ?? null;
  } catch {
    return null;
  }
}

function buildUpdate(command, id, positional, options) {
  if (command === "start") {
    return normalize("not_started", 0);
  }
  if (command === "progress") {
    const percent = positional[2] ?? options.progress ?? 0;
    return normalize("in_progress", percent);
  }
  if (command === "done") {
    return normalize("completed", 100);
  }
  if (command === "block") {
    return normalize("blocked", options.progress ?? 0);
  }
  if (command === "raw") {
    const status = positional[2] ?? "in_progress";
    const percent = positional[3] ?? 0;
    return normalize(status, percent);
  }
  throw new Error(`Unknown command: ${command}`);
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  if (options.help === "true" || positional.length < 2) {
    console.log(HELP);
    return;
  }

  const command = positional[0];
  const externalTaskId = positional[1];
  const update = buildUpdate(command, externalTaskId, positional, options);
  const existing = await loadExistingTask(externalTaskId);

  const defaultStage =
    command === "start"
      ? "Queued"
      : command === "progress"
        ? "In progress"
        : command === "done"
          ? "Completed"
          : command === "block"
            ? "Blocked"
            : "Updated";

  const payload = {
    externalTaskId,
    aiToolName: options.tool || existing?.aiToolName || inferToolFromId(externalTaskId),
    title: options.title || existing?.title || `Task ${externalTaskId}`,
    description: options.description || existing?.description || "Updated via task CLI bridge",
    status: update.status,
    progress: update.progress,
    currentStage: options.stage || defaultStage,
    log: options.log || `CLI ${command}: ${update.status} ${update.progress}%`,
  };

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook failed (${res.status}): ${text}`);
  }

  const body = await res.json();
  console.log(
    `OK: ${payload.externalTaskId} -> ${payload.status} ${payload.progress}% (taskId=${body?.task?.id ?? "n/a"})`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

