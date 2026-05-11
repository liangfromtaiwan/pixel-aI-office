import { NextResponse } from "next/server";

import type { TaskStatus, WebhookUpdatePayload } from "@/lib/task-model";
import { applyWebhookUpdate } from "@/lib/task-store";

function isStatus(value: unknown): value is TaskStatus {
  return value === "not_started" || value === "in_progress" || value === "completed" || value === "blocked";
}

function parsePayload(raw: unknown): WebhookUpdatePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (
    typeof data.externalTaskId !== "string" ||
    typeof data.aiToolName !== "string" ||
    typeof data.title !== "string" ||
    typeof data.description !== "string" ||
    typeof data.currentStage !== "string" ||
    !isStatus(data.status)
  ) {
    return null;
  }

  return {
    externalTaskId: data.externalTaskId,
    aiToolName: data.aiToolName,
    title: data.title,
    description: data.description,
    status: data.status,
    progress: typeof data.progress === "number" ? data.progress : 0,
    currentStage: data.currentStage,
    log: typeof data.log === "string" ? data.log : undefined,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = parsePayload(body);
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
  }

  const task = applyWebhookUpdate(payload);
  return NextResponse.json({ ok: true, task });
}

