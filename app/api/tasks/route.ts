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
  const raw = value.trim();
  if (raw === "未開始" || raw === "待開始" || raw === "待辦") return "not_started";
  if (raw === "進行中" || raw === "處理中" || raw === "執行中") return "in_progress";
  if (raw === "已完成" || raw === "完成") return "completed";
  if (raw === "阻塞" || raw === "卡關" || raw === "暫停") return "blocked";
  return "not_started";
}

/** Keep letters/numbers from any script (e.g. 中文表頭); do not strip to empty. */
function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s_\-]+/g, "");
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

/** When gviz has no header labels, columns become col1/col2 or A→a; use first filled cell as title. */
function firstNonEmptyCellInRow(row: Record<string, string>): string {
  for (const v of Object.values(row)) {
    const t = v.trim();
    if (t) return t;
  }
  return "";
}

const HEADER_TOKENS = new Set(
  [
    "externaltaskid",
    "aitoolname",
    "currentstage",
    "status",
    "progress",
    "description",
    "title",
    "log",
    "estimatedcompletion",
    "taskid",
  ].map((s) => s.toLowerCase()),
);

function looksLikeTechnicalIdOrHeaderToken(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  const compact = v.toLowerCase().replace(/[\s_\-]+/g, "");
  if (HEADER_TOKENS.has(compact)) return true;
  if (/^(cursor|claude|chatgpt|sheet)_task_\d+$/i.test(v)) return true;
  if (/^sheet_task_\d{3}$/i.test(v)) return true;
  return false;
}

/** Prefer first human-looking cell; skip id columns and pasted header names. */
function firstPresentableTitleCell(row: Record<string, string>): string {
  for (const v of Object.values(row)) {
    const t = v.trim();
    if (t && !looksLikeTechnicalIdOrHeaderToken(t)) return t;
  }
  return "";
}

function mapSheetRowToTask(row: Record<string, string>, index: number): DashboardTask | null {
  let title = firstNonEmpty(row, [
    "title",
    "task",
    "taskname",
    "tasktitle",
    "task_title",
    "name",
    "標題",
    "任務",
    "任務名稱",
    "任務標題",
    "工作項目",
    "工作內容",
    "項目",
    "項目名稱",
    "主題",
    "名稱",
    "col1",
    "a",
  ]);
  if (!title) title = firstPresentableTitleCell(row);
  if (!title) title = firstNonEmptyCellInRow(row);
  if (!title) return null;

  const description =
    firstNonEmpty(row, ["description", "desc", "summary", "描述", "說明", "內容"]) || "No description";
  const tool =
    firstNonEmpty(row, ["aitoolname", "aitool", "tool", "agent", "source", "工具", "ai", "模型"]) ||
    "Unknown";
  const stage = firstNonEmpty(row, ["currentstage", "stage", "step", "階段", "目前階段", "狀態說明"]) || "Pending";
  const statusRaw = firstNonEmpty(row, ["status", "state", "狀態"]) || "not_started";
  const status = normalizeStatus(statusRaw);
  const progressRaw = firstNonEmpty(row, ["progress", "percent", "percentage", "進度"]);
  const progress = Number.isFinite(Number(progressRaw)) ? Number(progressRaw) : 0;
  const normalized = normalizeStatusProgress(status, progress);
  const externalTaskId =
    firstNonEmpty(row, ["externaltaskid", "id", "taskid", "外部id", "任務id"]) ||
    `sheet_task_${String(index + 1).padStart(3, "0")}`;
  const estimated =
    firstNonEmpty(row, ["estimatedcompletion", "eta", "duedate", "預計完成", "截止"]) || "TBD";
  const log = firstNonEmpty(row, ["log", "note", "notes", "備註", "日誌"]) || "Synced from Google Sheet";
  const now = nowIso();

  const id = externalTaskId.startsWith("sheet_") ? externalTaskId : `sheet_${externalTaskId}`;

  return {
    id,
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

export type SheetSyncDiag = {
  sheetEnvOk: boolean;
  builtGvizUrl: boolean;
  fetchStatus: number | null;
  responseLooksLikeGviz: boolean;
  dataRows: number;
  mappedTaskCount: number;
  reason: string;
};

async function trySheetImport(): Promise<{ tasks: DashboardTask[] | null; diag: SheetSyncDiag }> {
  const diag: SheetSyncDiag = {
    sheetEnvOk: Boolean(
      process.env.GOOGLE_SHEET_JSON_URL?.trim() ||
        process.env.GOOGLE_SHEET_URL?.trim() ||
        process.env.GOOGLE_SHEET_ID?.trim(),
    ),
    builtGvizUrl: false,
    fetchStatus: null,
    responseLooksLikeGviz: false,
    dataRows: 0,
    mappedTaskCount: 0,
    reason: "idle",
  };

  const url = buildSheetJsonUrl();
  if (!url) {
    diag.reason = diag.sheetEnvOk ? "env_present_but_invalid_url_or_id" : "missing_GOOGLE_SHEET_URL_or_GOOGLE_SHEET_ID";
    return { tasks: null, diag };
  }
  diag.builtGvizUrl = true;

  try {
    const res = await fetch(url, { cache: "no-store" });
    diag.fetchStatus = res.status;
    if (!res.ok) {
      diag.reason = `gviz_http_${res.status}`;
      return { tasks: null, diag };
    }
    const text = await res.text();
    diag.responseLooksLikeGviz = text.includes("setResponse");
    if (!diag.responseLooksLikeGviz) {
      diag.reason =
        "gviz_body_missing_setResponse_share_sheet_to_anyone_with_link_as_viewer_or_publish";
      return { tasks: null, diag };
    }
    const rows = parseGvizPayload(text);
    diag.dataRows = rows.length;
    const tasks = rows
      .map((row, idx) => mapSheetRowToTask(row, idx))
      .filter((t): t is DashboardTask => Boolean(t));
    diag.mappedTaskCount = tasks.length;
    if (tasks.length === 0) {
      diag.reason =
        rows.length === 0
          ? "parsed_zero_rows_check_first_row_headers_and_gid"
          : "rows_found_but_no_title_column_match_en_or_zh_標題";
      return { tasks: null, diag };
    }
    diag.reason = "sheet_ok";
    return { tasks, diag };
  } catch {
    diag.reason = "fetch_threw";
    return { tasks: null, diag };
  }
}

export async function GET(request: Request) {
  const debug = new URL(request.url).searchParams.get("debug") === "1";
  const { tasks: sheetTasks, diag } = await trySheetImport();

  if (sheetTasks) {
    const body: Record<string, unknown> = { tasks: sheetTasks, source: "google_sheet" };
    if (debug) body.sheetSync = diag;
    return NextResponse.json(body);
  }

  const body: Record<string, unknown> = { tasks: getAllTasks(), source: "memory_store" };
  if (debug) body.sheetSync = diag;
  return NextResponse.json(body);
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

