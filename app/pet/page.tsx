"use client";

import { useEffect, useMemo, useState } from "react";

type AgentStatus = "idle" | "thinking" | "working" | "blocked" | "done";

type TaskState = {
  currentTask: string;
  progress: number;
  lastCompletedTask: string;
  status: AgentStatus;
  source: "mock" | "api" | "chatgpt" | "fixed";
  updatedAt: string;
};

function statusText(status: AgentStatus) {
  return status[0].toUpperCase() + status.slice(1);
}

export default function PetPage() {
  const [open, setOpen] = useState(false);
  const [taskState, setTaskState] = useState<TaskState>({
    currentTask: "Connecting to agent service...",
    progress: 0,
    lastCompletedTask: "Boot sequence complete",
    status: "idle",
    source: "mock",
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    const loadState = async () => {
      try {
        const res = await fetch("/api/agent-state", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as TaskState;
        setTaskState(data);
      } catch {
        // Keep previous state when API temporarily fails.
      }
    };

    void loadState();
    const timer = setInterval(() => {
      void loadState();
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const sync = async () => {
      if (window.petBridge) {
        await window.petBridge.syncStatus(taskState.status);
      }
    };
    void sync();
  }, [taskState.status]);

  const characterClass = useMemo(() => `pet-char pet-${taskState.status}`, [taskState.status]);

  return (
    <main className="h-screen w-screen bg-transparent p-3">
      <div className="pet-shell">
        <button
          type="button"
          className="relative"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Open companion panel"
        >
          <div className={characterClass}>
            <span className="pet-head" />
            <span className="pet-body" />
            <span className="pet-shadow" />
          </div>
        </button>

        {open ? (
          <section className="pet-panel">
            <p className="pet-row">
              <strong>Status:</strong> {statusText(taskState.status)}
            </p>
            <p className="pet-row">
              <strong>Task:</strong> {taskState.currentTask}
            </p>
            <p className="pet-row">
              <strong>Progress:</strong> {taskState.progress}%
            </p>
            <p className="pet-row">
              <strong>Last done:</strong> {taskState.lastCompletedTask}
            </p>
            <p className="pet-row">
              <strong>Source:</strong> {taskState.source}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
