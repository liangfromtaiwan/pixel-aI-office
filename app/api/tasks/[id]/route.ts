import { NextResponse } from "next/server";

import type { TaskStatus } from "@/lib/task-model";
import { deleteTask, getTaskById, updateTask } from "@/lib/task-store";

function isStatus(value: unknown): value is TaskStatus {
  return value === "not_started" || value === "in_progress" || value === "completed" || value === "blocked";
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const task = getTaskById(id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (data.status !== undefined && !isStatus(data.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = updateTask(id, {
    aiToolName: typeof data.aiToolName === "string" ? data.aiToolName : undefined,
    title: typeof data.title === "string" ? data.title : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    currentStage: typeof data.currentStage === "string" ? data.currentStage : undefined,
    status: data.status as TaskStatus | undefined,
    progress: typeof data.progress === "number" ? data.progress : undefined,
    log: typeof data.log === "string" ? data.log : undefined,
  });
  if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const ok = deleteTask(id);
  if (!ok) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

