import { NextResponse } from "next/server";

import { createTask, getAllTasks } from "@/lib/task-store";
import type { TaskStatus } from "@/lib/task-model";

function isStatus(value: unknown): value is TaskStatus {
  return value === "not_started" || value === "in_progress" || value === "completed" || value === "blocked";
}

export async function GET() {
  return NextResponse.json({ tasks: getAllTasks() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (
    typeof data.aiToolName !== "string" ||
    typeof data.title !== "string" ||
    typeof data.description !== "string" ||
    typeof data.currentStage !== "string" ||
    !isStatus(data.status)
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const progress = typeof data.progress === "number" ? data.progress : 0;
  const task = createTask({
    externalTaskId: typeof data.externalTaskId === "string" ? data.externalTaskId : undefined,
    aiToolName: data.aiToolName,
    title: data.title,
    description: data.description,
    status: data.status,
    progress,
    currentStage: data.currentStage,
    source: "manual",
    log: typeof data.log === "string" ? data.log : "Manual task created",
  });

  return NextResponse.json(task, { status: 201 });
}

