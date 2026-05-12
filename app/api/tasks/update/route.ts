import { NextResponse } from "next/server";

import type { TaskStatus, WebhookUpdatePayload } from "@/lib/task-model";
import { applyWebhookUpdate } from "@/lib/task-store";

/** Browsers open URLs with GET; webhook updates must use POST. */
export async function GET() {
  return NextResponse.json({
    ok: false,
    message:
      "This URL is for webhooks only: send POST with Content-Type: application/json. Opening it in a tab uses GET, so nothing is updated.",
    useMethod: "POST",
    path: "/api/tasks/update",
    seeTasks: "GET /api/tasks",
  });
}

function strField(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function normalizeWebhookStatus(value: unknown): TaskStatus | null {
  if (typeof value === "number") {
    if (value === 100) return "completed";
    if (value === 0) return "not_started";
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const s = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (s === "not_started" || s === "in_progress" || s === "completed" || s === "blocked") return s;
  if (s === "notstarted" || s === "todo") return "not_started";
  if (s === "inprogress" || s === "working" || s === "doing") return "in_progress";
  if (s === "done" || s === "complete" || s === "finished") return "completed";
  if (s === "stuck" || s === "hold") return "blocked";
  if (raw === "未開始" || raw === "待辦" || raw === "待開始") return "not_started";
  if (raw === "進行中" || raw === "處理中" || raw === "執行中") return "in_progress";
  if (raw === "已完成" || raw === "完成") return "completed";
  if (raw === "阻塞" || raw === "卡關" || raw === "暫停") return "blocked";
  return null;
}

function parsePayload(raw: unknown): WebhookUpdatePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const externalTaskId = strField(data.externalTaskId);
  const aiToolName = strField(data.aiToolName);
  const title = strField(data.title);
  const description = strField(data.description) ?? "";
  const currentStage = strField(data.currentStage) ?? "—";
  const status = normalizeWebhookStatus(data.status);

  let progress = 0;
  if (typeof data.progress === "number" && Number.isFinite(data.progress)) {
    progress = data.progress;
  } else if (typeof data.progress === "string") {
    const n = Number(data.progress.trim());
    if (Number.isFinite(n)) progress = n;
  }

  if (!externalTaskId || !aiToolName || !title || !status) {
    return null;
  }

  return {
    externalTaskId,
    aiToolName,
    title,
    description: description.length > 0 ? description : "—",
    status,
    progress,
    currentStage: currentStage.length > 0 ? currentStage : "—",
    log: typeof data.log === "string" && data.log.trim() ? data.log.trim() : undefined,
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
    return NextResponse.json(
      {
        error: "Invalid payload format",
        hint: "Need non-empty strings: externalTaskId, aiToolName, title. Need status: not_started | in_progress | completed | blocked (or 進行中/已完成…). description optional (empty ok). currentStage optional (empty becomes —). progress optional number.",
      },
      { status: 400 },
    );
  }

  const task = applyWebhookUpdate(payload);
  return NextResponse.json({ ok: true, task });
}

