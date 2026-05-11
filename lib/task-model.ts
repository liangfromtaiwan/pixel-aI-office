export type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked";

export type TaskSource = "manual" | "webhook" | "api";

export type ActivityLog = {
  id: string;
  message: string;
  createdAt: string;
};

export type DashboardTask = {
  id: string;
  externalTaskId: string;
  aiToolName: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;
  currentStage: string;
  progressSteps: string[];
  estimatedCompletion: string;
  source: TaskSource;
  activityLogs: ActivityLog[];
  createdAt: string;
  updatedAt: string;
};

export type WebhookUpdatePayload = {
  externalTaskId: string;
  aiToolName: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;
  currentStage: string;
  log?: string;
};

export function normalizeStatusProgress(
  status: TaskStatus,
  progress: number,
): { status: TaskStatus; progress: number } {
  let nextStatus = status;
  let nextProgress = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;

  if (nextStatus === "not_started") {
    nextProgress = 0;
  }
  if (nextStatus === "completed") {
    nextProgress = 100;
  }
  if (nextProgress === 100) {
    nextStatus = "completed";
  }

  return { status: nextStatus, progress: nextProgress };
}

export function nowIso() {
  return new Date().toISOString();
}

