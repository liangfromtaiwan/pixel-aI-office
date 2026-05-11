import { MOCK_ADVENTURE_TASKS } from "./mock-adventure-tasks";
import {
  type DashboardTask,
  type TaskStatus,
  type WebhookUpdatePayload,
  normalizeStatusProgress,
  nowIso,
} from "./task-model";

function toToolName(tool: string): string {
  if (tool === "chatgpt") return "ChatGPT";
  if (tool === "claude") return "Claude";
  return "Cursor";
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function seedTasks(): DashboardTask[] {
  const now = nowIso();
  return MOCK_ADVENTURE_TASKS.map((task) => {
    const normalized = normalizeStatusProgress(task.status, task.progress);
    return {
      id: task.id,
      externalTaskId: `seed_${task.id}`,
      aiToolName: toToolName(task.tool),
      title: task.title,
      description: task.shortDescription,
      status: normalized.status,
      progress: normalized.progress,
      currentStage: task.currentStage,
      progressSteps: task.progressSteps,
      estimatedCompletion: task.estimatedCompletion,
      source: "api",
      activityLogs: [
        {
          id: makeId("log"),
          message: `Seeded task: ${task.title}`,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
  });
}

type Store = {
  tasks: DashboardTask[];
};

const globalStore = globalThis as typeof globalThis & { __pixelTaskStore?: Store };
if (!globalStore.__pixelTaskStore) {
  globalStore.__pixelTaskStore = {
    tasks: seedTasks(),
  };
}

function getStore(): Store {
  return globalStore.__pixelTaskStore as Store;
}

export function getAllTasks(): DashboardTask[] {
  return [...getStore().tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getTaskById(id: string): DashboardTask | null {
  return getStore().tasks.find((t) => t.id === id) ?? null;
}

export function createTask(input: {
  externalTaskId?: string;
  aiToolName: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;
  currentStage: string;
  progressSteps?: string[];
  estimatedCompletion?: string;
  source: "manual" | "api" | "webhook";
  log?: string;
}): DashboardTask {
  const now = nowIso();
  const normalized = normalizeStatusProgress(input.status, input.progress);
  const created: DashboardTask = {
    id: makeId("task"),
    externalTaskId: input.externalTaskId?.trim() || makeId("manual"),
    aiToolName: input.aiToolName.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    status: normalized.status,
    progress: normalized.progress,
    currentStage: input.currentStage.trim(),
    progressSteps: input.progressSteps?.length ? input.progressSteps : [input.currentStage.trim()],
    estimatedCompletion: input.estimatedCompletion?.trim() || "TBD",
    source: input.source,
    activityLogs: input.log
      ? [{ id: makeId("log"), message: input.log.trim(), createdAt: now }]
      : [],
    createdAt: now,
    updatedAt: now,
  };
  getStore().tasks.push(created);
  return created;
}

export function updateTask(
  id: string,
  patch: Partial<Pick<DashboardTask, "aiToolName" | "title" | "description" | "status" | "progress" | "currentStage">> & {
    log?: string;
  },
): DashboardTask | null {
  const found = getStore().tasks.find((t) => t.id === id);
  if (!found) return null;

  const nextStatus = (patch.status ?? found.status) as TaskStatus;
  const nextProgress = patch.progress ?? found.progress;
  const normalized = normalizeStatusProgress(nextStatus, nextProgress);

  found.aiToolName = patch.aiToolName?.trim() || found.aiToolName;
  found.title = patch.title?.trim() || found.title;
  found.description = patch.description?.trim() || found.description;
  found.currentStage = patch.currentStage?.trim() || found.currentStage;
  found.progressSteps = [found.currentStage];
  found.status = normalized.status;
  found.progress = normalized.progress;
  found.updatedAt = nowIso();

  if (patch.log && patch.log.trim()) {
    found.activityLogs.unshift({
      id: makeId("log"),
      message: patch.log.trim(),
      createdAt: found.updatedAt,
    });
  }
  return found;
}

export function deleteTask(id: string): boolean {
  const store = getStore();
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  store.tasks.splice(idx, 1);
  return true;
}

export function applyWebhookUpdate(payload: WebhookUpdatePayload): DashboardTask {
  const store = getStore();
  const now = nowIso();
  const normalized = normalizeStatusProgress(payload.status, payload.progress);
  const logMessage = payload.log?.trim();
  const existing = store.tasks.find((t) => t.externalTaskId === payload.externalTaskId);

  if (!existing) {
    const created = createTask({
      externalTaskId: payload.externalTaskId,
      aiToolName: payload.aiToolName,
      title: payload.title,
      description: payload.description,
      status: normalized.status,
      progress: normalized.progress,
      currentStage: payload.currentStage,
      source: "webhook",
      log: logMessage || "Webhook task created",
    });
    return created;
  }

  existing.aiToolName = payload.aiToolName.trim();
  existing.title = payload.title.trim();
  existing.description = payload.description.trim();
  existing.currentStage = payload.currentStage.trim();
  existing.progressSteps = [existing.currentStage];
  existing.status = normalized.status;
  existing.progress = normalized.progress;
  existing.source = "webhook";
  existing.updatedAt = now;

  if (logMessage) {
    existing.activityLogs.unshift({
      id: makeId("log"),
      message: logMessage,
      createdAt: now,
    });
  }
  return existing;
}

