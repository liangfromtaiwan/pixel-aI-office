#!/usr/bin/env node

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/tasks/update";
const EXTERNAL_TASK_ID = process.env.EXTERNAL_TASK_ID || "claude_task_001";

const basePayload = {
  externalTaskId: EXTERNAL_TASK_ID,
  aiToolName: "Claude",
  title: "Landing page copy generation",
  description: "Generate first draft for product landing page",
  status: "in_progress",
  progress: 65,
  currentStage: "Writing first draft",
  log: "Claude is generating section headlines",
};

const updates = [
  {
    status: "not_started",
    progress: 0,
    currentStage: "Queued",
    log: "Task created and waiting to start",
  },
  {
    status: "in_progress",
    progress: 35,
    currentStage: "Collecting references",
    log: "Claude is gathering source material",
  },
  {
    status: "in_progress",
    progress: 65,
    currentStage: "Writing first draft",
    log: "Claude is generating section headlines",
  },
  {
    status: "completed",
    progress: 100,
    currentStage: "Draft completed",
    log: "First draft delivered successfully",
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendUpdate(stepUpdate, stepIndex) {
  const payload = { ...basePayload, ...stepUpdate, externalTaskId: EXTERNAL_TASK_ID };
  console.log(`[${stepIndex}] Sending update: status=${payload.status} progress=${payload.progress}%`);

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const body = await res.json();
  console.log(`    -> OK (${res.status}) taskId=${body?.task?.id ?? "n/a"}`);
}

async function main() {
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`External Task ID: ${EXTERNAL_TASK_ID}`);

  for (let i = 0; i < updates.length; i += 1) {
    await sendUpdate(updates[i], i + 1);
    if (i < updates.length - 1) {
      await sleep(1200);
    }
  }

  console.log("Done. Open the dashboard and refresh/auto-sync to see updates.");
}

main().catch((err) => {
  console.error("Failed to send updates:", err.message);
  process.exit(1);
});

