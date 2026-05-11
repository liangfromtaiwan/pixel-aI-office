import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

type AgentStatus = "idle" | "thinking" | "working" | "blocked" | "done";

type AgentStateResponse = {
  status: AgentStatus;
  currentTask: string;
  progress: number;
  lastCompletedTask: string;
  source: "mock" | "api" | "chatgpt" | "fixed";
  updatedAt: string;
};

const MOCK_TASKS = [
  "Summarizing meeting transcript",
  "Drafting release announcement",
  "Fixing animation timing bug",
  "Improving onboarding copy",
  "Analyzing support tickets",
];

const STATUS_ORDER: AgentStatus[] = ["idle", "thinking", "working", "blocked", "working", "done"];

let mockStep = 0;
let lastCompletedTask = "Boot sequence complete";
let currentTask = MOCK_TASKS[0];
let progress = 0;

function toStatus(value: unknown): AgentStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (
    normalized === "idle" ||
    normalized === "thinking" ||
    normalized === "working" ||
    normalized === "blocked" ||
    normalized === "done"
  ) {
    return normalized;
  }
  return null;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }
  return fallback;
}

function normalizeApiPayload(payload: unknown): Omit<AgentStateResponse, "source" | "updatedAt"> | null {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  const candidate = (data.agent ?? data.data ?? data.task ?? data) as Record<string, unknown>;
  const status = toStatus(candidate.status ?? data.status);
  const currentTaskValue = candidate.currentTask ?? candidate.task ?? data.currentTask ?? data.task;
  const doneValue =
    candidate.lastCompletedTask ??
    candidate.last_completed_task ??
    data.lastCompletedTask ??
    data.last_completed_task;

  if (!status || typeof currentTaskValue !== "string") return null;

  return {
    status,
    currentTask: currentTaskValue,
    progress: toNumber(candidate.progress ?? data.progress, 0),
    lastCompletedTask:
      typeof doneValue === "string" ? doneValue : status === "done" ? currentTaskValue : "N/A",
  };
}

/** Accepts fixed JSON where `currentTask` is required; `status` defaults to working. */
function normalizeFixedPayload(payload: unknown): Omit<AgentStateResponse, "source" | "updatedAt"> | null {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  const candidate = (data.agent ?? data.data ?? data.task ?? data) as Record<string, unknown>;
  const currentTaskValue =
    (typeof candidate.currentTask === "string" && candidate.currentTask.trim()) ||
    (typeof candidate.task === "string" && candidate.task.trim()) ||
    (typeof data.currentTask === "string" && data.currentTask.trim()) ||
    (typeof data.task === "string" && data.task.trim());

  if (!currentTaskValue) return null;

  const statusRaw = candidate.status ?? data.status;
  const status = toStatus(statusRaw) ?? "working";

  const doneValue =
    candidate.lastCompletedTask ??
    candidate.last_completed_task ??
    data.lastCompletedTask ??
    data.last_completed_task;

  const lastCompleted =
    typeof doneValue === "string" && doneValue.trim()
      ? doneValue.trim()
      : status === "done"
        ? currentTaskValue
        : "—";

  return {
    status,
    currentTask: currentTaskValue,
    progress: toNumber(candidate.progress ?? data.progress, 0),
    lastCompletedTask: lastCompleted,
  };
}

function wrapFixed(core: Omit<AgentStateResponse, "source" | "updatedAt">): AgentStateResponse {
  return {
    ...core,
    source: "fixed",
    updatedAt: new Date().toISOString(),
  };
}

async function fromFixedTask(): Promise<AgentStateResponse | null> {
  const rawJson = process.env.AGENT_TASK_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      const core = normalizeFixedPayload(parsed);
      if (core) return wrapFixed(core);
    } catch {
      // Invalid JSON — try other sources.
    }
  }

  const fileRel = process.env.AGENT_TASK_FILE?.trim();
  if (fileRel) {
    try {
      const fullPath = path.isAbsolute(fileRel) ? fileRel : path.join(process.cwd(), fileRel);
      const text = await readFile(fullPath, "utf8");
      const parsed = JSON.parse(text) as unknown;
      const core = normalizeFixedPayload(parsed);
      if (core) return wrapFixed(core);
    } catch {
      // Missing file or invalid JSON.
    }
  }

  const task = process.env.AGENT_CURRENT_TASK?.trim();
  if (task) {
    const status = toStatus(process.env.AGENT_STATUS ?? "") ?? "working";
    const progressEnv = process.env.AGENT_PROGRESS;
    const lastDone = process.env.AGENT_LAST_COMPLETED_TASK?.trim();

    return wrapFixed({
      status,
      currentTask: task,
      progress: progressEnv !== undefined ? toNumber(progressEnv, 0) : 0,
      lastCompletedTask: lastDone && lastDone.length > 0 ? lastDone : "—",
    });
  }

  return null;
}

async function fromRemoteApi(): Promise<AgentStateResponse | null> {
  const endpoint = process.env.AGENT_API_URL;
  if (!endpoint) return null;

  try {
    const headers: HeadersInit = {};
    if (process.env.AGENT_API_TOKEN) {
      headers.Authorization = `Bearer ${process.env.AGENT_API_TOKEN}`;
    }

    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) return null;
    const payload = (await res.json()) as unknown;
    const normalized = normalizeApiPayload(payload);
    if (!normalized) return null;

    return {
      ...normalized,
      source: "api",
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function extractJsonFromText(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    // Continue to fenced extraction.
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      return null;
    }
  }

  return null;
}

async function fromChatGpt(): Promise<AgentStateResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const prompt =
    'Return ONLY JSON with fields: status,idle/thinking/working/blocked/done; currentTask:string; progress:number(0-100); lastCompletedTask:string.';

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are an AI status endpoint for a desktop companion. Reply with compact JSON only.",
          },
          {
            role: "user",
            content:
              `${prompt} Simulate one realistic current state snapshot for an AI worker in office context.`,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = extractJsonFromText(content);
    const normalized = normalizeApiPayload(parsed);
    if (!normalized) return null;

    return {
      ...normalized,
      source: "chatgpt",
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function fromMock(): AgentStateResponse {
  mockStep += 1;
  const status = STATUS_ORDER[mockStep % STATUS_ORDER.length];

  if (status === "thinking" || status === "working" || status === "blocked") {
    currentTask = MOCK_TASKS[mockStep % MOCK_TASKS.length];
  }
  if (status === "working") {
    progress = Math.min(96, Math.max(progress + 22, 18));
  } else if (status === "done") {
    progress = 100;
    lastCompletedTask = currentTask;
  } else if (status === "idle") {
    progress = 0;
  }

  return {
    status,
    currentTask,
    progress,
    lastCompletedTask,
    source: "mock",
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const fixedData = await fromFixedTask();
  if (fixedData) {
    return NextResponse.json(fixedData);
  }

  const apiData = await fromRemoteApi();
  if (apiData) {
    return NextResponse.json(apiData);
  }

  const chatgptData = await fromChatGpt();
  if (chatgptData) {
    return NextResponse.json(chatgptData);
  }

  return NextResponse.json(fromMock());
}
