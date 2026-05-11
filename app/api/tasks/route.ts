import { NextResponse } from "next/server";

import { createTask, getAllTasks } from "@/lib/task-store";
import { type DashboardTask, type TaskStatus, normalizeStatusProgress, nowIso } from "@/lib/task-model";

function isStatus(value: unknown): value is TaskStatus {
  return value === "not_started" || value === "in_progress" || value === "completed" || value === "blocked";
}

function normalizeStatus(value: string): TaskStatus {
  const v = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (v === "not_started" || v === "in_progress" || v === "completed" || v === "blocked") return v;
  if (v === "notstarted" || v === "todo") return "not_started";
  if (v === "inprogress" || v === "working") return "in_progress";
  if (v === "done" || v === "complete") return "completed";
  if (v === "stuck") return "blocked";
  return "not_started";
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseSheetCell(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return "";
}

function buildSheetJsonUrl(): string | null {
  const direct = process.env.GOOGLE_SHEET_JSON_URL?.trim();
  if (direct) return direct;

  const source = process.env.GOOGLE_SHEET_URL?.trim();
  const gid = process.env.GOOGLE_SHEET_GID?.trim() || "0";
  if (source) {
    const match = source.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const id = match?.[1];
    if (!id) return null;
    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&gid=${encodeURIComponent(gid)}`;
  }

  const id = process.env.GOOGLE_SHEET_ID?.trim();
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&gid=${encodeURIComponent(gid)}`;
}

function parseGvizPayload(text: string): Array<Record<string, string>> {
  const match = text.match(/setResponse\(([\s\S]+)\);?\s*$/);
  if (!match?.[1]) return [];
  const parsed = JSON.parse(match[1]) as {
    table?: {
      cols?: Array<{ label?: string; id?: string }>;
      rows?: Array<{ c?: Array<{ v?: unknown; f?: string | null } | null> }>;
    };
  };

  const cols = parsed.table?.cols ?? [];
  const rows = parsed.table?.rows ?? [];
  if (cols.length === 0 || rows.length === 0) return [];

  const headers = cols.map((c, idx) => {
    const base = parseSheetCell(c.label) || parseSheetCell(c.id);
    return normalizeHeader(base || `col${idx + 1}`);
  });

  return rows
    .map((r) => {
      const cells = r.c ?? [];
      const obj: Record<string, string> = {};
      headers.forEach((key, i) => {
        const cell = cells[i];
        obj[key] = parseSheetCell(cell?.f ?? cell?.v ?? "");
      });
      return obj;
    })
    .filter((row) => Object.values(row).some((v) => v.length > 0));
}

function firstNonEmpty(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

function mapSheetRowToTask(row: Record<string, string>, index: number): DashboardTask | null {
  const title = firstNonEmpty(row, ["title", "task", "taskname", "name"]);
  if (!title) return null;

  const description = firstNonEmpty(row, ["description", "desc", "summary"]) || "No description";
  const tool = firstNonEmpty(row, ["aitoolname", "tool", "agent", "source"]) || "Unknown";
  const stage = firstNonEmpty(row, ["currentstage", "stage", "step"]) || "Pending";
  const statusRaw = firstNonEmpty(row, ["status", "state"]) || "not_started";
  const status = normalizeStatus(statusRaw);
  const progressRaw = firstNonEmpty(row, ["progress", "percent", "percentage"]);
  const progress = Number.isFinite(Number(progressRaw)) ? Number(progressRaw) : 0;
  const normalized = normalizeStatusProgress(status, progress);
  const externalTaskId =
    firstNonEmpty(row, ["externaltaskid", "id", "taskid"]) || `sheet_task_${String(index + 1).padStart(3, "0")}`;
  const estimated = firstNonEmpty(row, ["estimatedcompletion", "eta", "duedate"]) || "TBD";
  const log = firstNonEmpty(row, ["log", "note", "notes"]) || "Synced from Google Sheet";
  const now = nowIso();

  return {
    id: `sheet_${externalTaskId}`,
    externalTaskId,
    aiToolName: tool,
    title,
    description,
    status: normalized.status,
    progress: normalized.progress,
    currentStage: stage,
    progressSteps: [stage],
    estimatedCompletion: estimated,
    source: "api",
    activityLogs: [{ id: `sheet_log_${index + 1}`, message: log, createdAt: now }],
    createdAt: now,
    updatedAt: now,
  };
}

async function getSheetTasks(): Promise<DashboardTask[] | null> {
  const url = buildSheetJsonUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    const rows = parseGvizPayload(text);
    const tasks = rows
      .map((row, idx) => mapSheetRowToTask(row, idx))
      .filter((t): t is DashboardTask => Boolean(t));
    if (tasks.length === 0) return null;
    return tasks;
  } catch {
    return null;
  }
}

export async function GET() {
  const sheetTasks = await getSheetTasks();
  if (sheetTasks) {
    return NextResponse.json({ tasks: sheetTasks, source: "google_sheet" });
  }
  return NextResponse.json({ tasks: getAllTasks(), source: "memory_store" });
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

