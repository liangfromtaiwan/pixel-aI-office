import type { DashboardTask, TaskStatus } from "./task-model";
import { normalizeStatusProgress, nowIso } from "./task-model";

export type AiBridgeDiag = {
  envUrlOk: boolean;
  fetchStatus: number | null;
  parsedCount: number;
  validTasks: number;
  reason: string;
};

function parseStatus(v: unknown): TaskStatus {
  if (typeof v !== "string") return "in_progress";
  const raw = v.trim();
  const x = raw.toLowerCase().replace(/\s+/g, "_");
  if (x === "not_started" || x === "in_progress" || x === "completed" || x === "blocked") return x;
  if (x === "todo" || x === "notstarted") return "not_started";
  if (x === "inprogress" || x === "working") return "in_progress";
  if (x === "done" || x === "complete") return "completed";
  if (x === "stuck") return "blocked";
  if (raw === "未開始" || raw === "待辦") return "not_started";
  if (raw === "進行中" || raw === "處理中") return "in_progress";
  if (raw === "已完成" || raw === "完成") return "completed";
  if (raw === "阻塞" || raw === "卡關") return "blocked";
  return "in_progress";
}

function str(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function num(o: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function normalizeRemoteTask(raw: unknown, index: number): DashboardTask | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const externalTaskId = str(o, "externalTaskId", "external_task_id", "id", "taskId");
  const title = str(o, "title", "task", "name", "currentTask");
  if (!externalTaskId || !title) return null;

  const description = str(o, "description", "desc", "summary") || "—";
  const aiToolName = str(o, "aiToolName", "ai_tool_name", "tool", "agent", "source") || "AI";
  const currentStage = str(o, "currentStage", "current_stage", "stage", "step") || "—";
  const status = parseStatus(o.status ?? o.state);
  const progress = num(o, "progress", "percent");
  const normalized = normalizeStatusProgress(status, progress);
  const estimatedCompletion = str(o, "estimatedCompletion", "estimated_completion", "eta", "due") || "TBD";
  const log = str(o, "log", "note", "message") || "Synced from AI bridge";
  const now = nowIso();
  const id = externalTaskId.startsWith("ai_") ? externalTaskId : `ai_${externalTaskId}`;

  return {
    id,
    externalTaskId,
    aiToolName,
    title,
    description,
    status: normalized.status,
    progress: normalized.progress,
    currentStage,
    progressSteps: [currentStage],
    estimatedCompletion,
    source: "api",
    activityLogs: [{ id: `ai_bridge_log_${index + 1}`, message: log, createdAt: now }],
    createdAt: now,
    updatedAt: now,
  };
}

export async function tryAiBridgeTasks(): Promise<{ tasks: DashboardTask[] | null; diag: AiBridgeDiag }> {
  const url = process.env.AI_TASKS_URL?.trim();
  const diag: AiBridgeDiag = {
    envUrlOk: Boolean(url && /^https:\/\//i.test(url)),
    fetchStatus: null,
    parsedCount: 0,
    validTasks: 0,
    reason: "idle",
  };

  if (!url || !/^https:\/\//i.test(url)) {
    diag.reason = !url ? "missing_AI_TASKS_URL" : "AI_TASKS_URL_must_be_https";
    return { tasks: null, diag };
  }

  try {
    const headers: HeadersInit = { Accept: "application/json" };
    const token = process.env.AI_TASKS_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    diag.fetchStatus = res.status;
    if (!res.ok) {
      diag.reason = `http_${res.status}`;
      return { tasks: null, diag };
    }

    const body = (await res.json()) as unknown;
    const list = Array.isArray(body)
      ? body
      : body && typeof body === "object" && Array.isArray((body as { tasks?: unknown }).tasks)
        ? (body as { tasks: unknown[] }).tasks
        : null;

    if (!list) {
      diag.reason = "json_must_be_array_or_object_with_tasks_array";
      return { tasks: null, diag };
    }

    diag.parsedCount = list.length;
    const tasks = list
      .map((item, idx) => normalizeRemoteTask(item, idx))
      .filter((t): t is DashboardTask => Boolean(t));
    diag.validTasks = tasks.length;

    if (tasks.length === 0) {
      diag.reason = "no_valid_tasks_need_externalTaskId_and_title";
      return { tasks: null, diag };
    }

    diag.reason = "ai_bridge_ok";
    return { tasks, diag };
  } catch {
    diag.reason = "fetch_failed_or_timeout";
    return { tasks: null, diag };
  }
}
