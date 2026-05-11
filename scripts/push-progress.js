#!/usr/bin/env node

/**
 * Semi-automatic webhook bridge:
 * Quickly push one task status update from CLI.
 *
 * Example:
 * node scripts/push-progress.js \
 *   --tool Claude \
 *   --externalTaskId claude_task_001 \
 *   --title "Landing page copy generation" \
 *   --description "Generate first draft for product landing page" \
 *   --status in_progress \
 *   --progress 65 \
 *   --stage "Writing first draft" \
 *   --log "Claude is generating section headlines"
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/tasks/update";

/** @type {Record<string, string>} */
const defaults = {
  tool: "Claude",
  externalTaskId: "claude_task_001",
  title: "Landing page copy generation",
  description: "Generate first draft for product landing page",
  status: "in_progress",
  progress: "65",
  stage: "Writing first draft",
  log: "Claude is generating section headlines",
};

function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      result[name] = "true";
      continue;
    }
    result[name] = next;
    i += 1;
  }
  return result;
}

function showHelp() {
  console.log(`
Usage:
  node scripts/push-progress.js [options]

Options:
  --tool <name>             AI tool name (Cursor / Claude / ChatGPT)
  --externalTaskId <id>     Stable external task id
  --title <text>            Task title
  --description <text>      Task description
  --status <value>          not_started | in_progress | completed | blocked
  --progress <0-100>        Numeric progress
  --stage <text>            Current stage text
  --log <text>              Activity log line
  --help                    Show this help

Environment:
  WEBHOOK_URL               Default: http://localhost:3000/api/tasks/update
`);
}

function normalizeStatus(statusRaw, progressRaw) {
  const allowed = new Set(["not_started", "in_progress", "completed", "blocked"]);
  let status = allowed.has(statusRaw) ? statusRaw : "in_progress";
  let progress = Number.parseInt(progressRaw, 10);
  if (!Number.isFinite(progress)) progress = 0;
  progress = Math.max(0, Math.min(100, progress));

  if (status === "not_started") progress = 0;
  if (status === "completed") progress = 100;
  if (progress === 100) status = "completed";

  return { status, progress };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true") {
    showHelp();
    return;
  }

  const rawStatus = args.status ?? defaults.status;
  const rawProgress = args.progress ?? defaults.progress;
  const normalized = normalizeStatus(rawStatus, rawProgress);

  const payload = {
    externalTaskId: args.externalTaskId ?? defaults.externalTaskId,
    aiToolName: args.tool ?? defaults.tool,
    title: args.title ?? defaults.title,
    description: args.description ?? defaults.description,
    status: normalized.status,
    progress: normalized.progress,
    currentStage: args.stage ?? defaults.stage,
    log: args.log ?? defaults.log,
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
  console.log("Update sent.");
  console.log(`taskId: ${body?.task?.id ?? "n/a"}`);
  console.log(`status: ${payload.status} progress: ${payload.progress}%`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

