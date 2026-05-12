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

/** Make may POST `{ "1": { ...sheet row } }` or `{ "row": { ... } }`. */
function flattenWebhookBody(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const nested = data.row ?? data.fields ?? data.bundle ?? data.sheet;
  if (nested && typeof nested === "object") {
    return { ...data, ...(nested as Record<string, unknown>) };
  }
  const m1 = data["1"];
  if (m1 && typeof m1 === "object") {
    return { ...(m1 as Record<string, unknown>) };
  }
  return data;
}

function readStr(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = strField(data[key]);
    if (v) return v;
  }
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
  const data = flattenWebhookBody(raw);
  if (!data) return null;

  const externalTaskId = readStr(
    data,
    "externalTaskId",
    "external_task_id",
    "ID",
    "id",
    "taskId",
    "task_id",
    "外部id",
    "任務id",
  );
  const aiToolName = readStr(data, "aiToolName", "ai_tool_name", "tool", "工具", "source", "agent", "模型");
  const title = readStr(data, "title", "標題", "Title", "name", "task", "taskName", "任務");
  const description = readStr(data, "description", "desc", "描述", "說明", "summary", "內容") ?? "";
  const currentStage = readStr(data, "currentStage", "current_stage", "stage", "目前階段", "step", "階段") ?? "—";
  const status = normalizeWebhookStatus(data.status ?? data["狀態"] ?? data.state);

  let progress = 0;
  const pRaw = data.progress ?? data["進度"];
  if (typeof pRaw === "number" && Number.isFinite(pRaw)) {
    progress = pRaw;
  } else if (typeof pRaw === "string") {
    const n = Number(pRaw.trim());
    if (Number.isFinite(n)) progress = n;
  }

  if (!externalTaskId || !aiToolName || !title || !status) {
    return null;
  }

  const log =
    readStr(data, "log", "note", "message", "備註", "日誌", "remarks") ?? undefined;

  return {
    externalTaskId,
    aiToolName,
    title,
    description: description.length > 0 ? description : "—",
    status,
    progress,
    currentStage: currentStage.length > 0 ? currentStage : "—",
    log,
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
        hint:
          "Need non-empty: externalTaskId (or ID), aiToolName (or 工具), title (or 標題), status (or 狀態). Optional: description/描述, currentStage/目前階段, log/備註, progress/進度. You may wrap the sheet row as { \"1\": { ... } } or { \"row\": { ... } }. If all values are empty, Make did not resolve {{1.*}} — use the field picker on the Sheets bundle, or fix module order.",
      },
      { status: 400 },
    );
  }

  const task = applyWebhookUpdate(payload);
  return NextResponse.json({ ok: true, task });
}

