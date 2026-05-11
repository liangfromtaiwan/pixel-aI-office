"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DashboardTask } from "@/lib/task-model";

import { FilterBar } from "./FilterBar";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { TaskDetailPanel } from "./TaskDetailPanel";
import type { StatusFilter } from "./TaskWorld";
import { TaskWorld } from "./TaskWorld";

const STORAGE_KEY = "ai-task-adventure-ui";

type UiPrefs = {
  filter: StatusFilter;
  selectedId: string | null;
  autoPoll: boolean;
};

function readPrefs(): UiPrefs {
  if (typeof window === "undefined") {
    return { filter: "all", selectedId: null, autoPoll: true };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { filter: "all", selectedId: null, autoPoll: true };
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      filter: parsed.filter ?? "all",
      selectedId: parsed.selectedId ?? null,
      autoPoll: parsed.autoPoll ?? true,
    };
  } catch {
    return { filter: "all", selectedId: null, autoPoll: true };
  }
}

function countByStatus(tasks: DashboardTask[]) {
  return tasks.reduce(
    (acc, task) => {
      acc[task.status] += 1;
      return acc;
    },
    { not_started: 0, in_progress: 0, completed: 0, blocked: 0 },
  );
}

export function DashboardApp() {
  const prefs = readPrefs();
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [filter, setFilter] = useState<StatusFilter>(prefs.filter);
  const [selectedId, setSelectedId] = useState<string | null>(prefs.selectedId);
  const [autoPoll, setAutoPoll] = useState<boolean>(prefs.autoPoll);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const prevUpdatedRef = useRef<Map<string, string>>(new Map());
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next: UiPrefs = { filter, selectedId, autoPoll };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [filter, selectedId, autoPoll]);

  const refreshTasks = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { tasks?: DashboardTask[] };
      const incoming = Array.isArray(json.tasks) ? json.tasks : [];

      const changed = new Set<string>();
      for (const task of incoming) {
        const prev = prevUpdatedRef.current.get(task.id);
        if (prev && prev !== task.updatedAt) {
          changed.add(task.id);
        }
        prevUpdatedRef.current.set(task.id, task.updatedAt);
      }
      if (changed.size > 0) {
        setHighlightedIds(changed);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setHighlightedIds(new Set()), 1800);
      }

      setTasks(incoming);
      setLastSyncedAt(new Date().toISOString());
      if (!selectedId && incoming.length > 0) {
        setSelectedId(incoming[0].id);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedId]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      void refreshTasks();
    }, 0);
    return () => clearTimeout(initTimer);
  }, [refreshTasks]);

  useEffect(() => {
    if (!autoPoll) return;
    const timer = setInterval(() => {
      void refreshTasks();
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPoll, refreshTasks]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const counts = useMemo(() => countByStatus(tasks), [tasks]);

  const selected = useMemo(() => tasks.find((t) => t.id === selectedId) ?? null, [selectedId, tasks]);

  return (
    <div className="adv-root flex min-h-screen flex-col bg-[#cbbf9f] text-[#1f1c16] md:flex-row">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          notStarted={counts.not_started}
          inProgress={counts.in_progress}
          completed={counts.completed}
          blocked={counts.blocked}
          lastSyncedAt={lastSyncedAt}
          isPolling={autoPoll}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            void refreshTasks();
          }}
          onTogglePolling={() => setAutoPoll((prev) => !prev)}
        />

        <FilterBar value={filter} onChange={setFilter} />

        <main className="flex-1 overflow-auto bg-[#d6caa8] p-4 md:p-5">
          <div className="mx-auto max-w-7xl">
            <TaskWorld
              tasks={tasks}
              filter={filter}
              selectedId={selectedId}
              highlightedIds={highlightedIds}
              onSelect={setSelectedId}
            />
          </div>
        </main>

        <TaskDetailPanel task={selected} />
      </div>
    </div>
  );
}
