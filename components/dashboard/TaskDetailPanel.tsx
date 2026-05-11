import type { DashboardTask } from "@/lib/task-model";

import { StatusBadge } from "./StatusBadge";

type TaskDetailPanelProps = {
  task: DashboardTask | null;
};

export function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  if (!task) {
    return (
      <section
        className="border-t-4 border-[#3a3226] bg-[#f6f0df] px-5 py-4"
        aria-label="Task details"
      >
        <p className="text-sm font-bold text-[#4a4436]">Select a quest marker on the map to inspect details.</p>
        <p className="mt-1 text-xs text-[#6b5f45]">Tip: filters narrow the world, but you can still select any visible task.</p>
      </section>
    );
  }

  return (
    <section className="border-t-4 border-[#3a3226] bg-gradient-to-r from-[#fff7da] via-[#f6f0df] to-[#e9f7ff] px-5 py-4" aria-label="Task details">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-[#1f1c16]">{task.title}</h2>
            <StatusBadge status={task.status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-black/15 bg-white/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#6b5f45]">Current status</p>
              <p className="mt-1 text-sm font-bold text-[#2a2620]">{task.status.replaceAll("_", " ")}</p>
            </div>
            <div className="rounded-xl border-2 border-black/15 bg-white/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#6b5f45]">Current stage</p>
              <p className="mt-1 text-sm font-bold text-[#2a2620]">{task.currentStage}</p>
            </div>
            <div className="rounded-xl border-2 border-black/15 bg-white/60 p-3 sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#6b5f45]">Progress steps</p>
              <ol className="mt-2 grid gap-2 sm:grid-cols-2">
                {task.progressSteps.map((step, idx) => (
                  <li
                    key={`${task.id}-step-${idx}`}
                    className="flex items-start gap-2 rounded-lg border border-black/10 bg-white/70 px-2 py-2 text-xs font-semibold text-[#2a2620]"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 border-black/15 bg-[#f6f0df] text-[11px] font-black">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border-2 border-black/15 bg-white/60 p-3 sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#6b5f45]">Estimated completion</p>
              <p className="mt-1 text-sm font-black text-[#1f4d30]">{task.estimatedCompletion}</p>
              {task.status === "in_progress" ? (
                <p className="mt-1 text-xs font-semibold text-[#4a4436]">Live progress: {task.progress}%</p>
              ) : null}
            </div>
            <div className="rounded-xl border-2 border-black/15 bg-white/60 p-3 sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#6b5f45]">Source</p>
              <p className="mt-1 text-sm font-bold text-[#2a2620]">
                {task.source} · {task.externalTaskId}
              </p>
            </div>
            <div className="rounded-xl border-2 border-black/15 bg-white/60 p-3 sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#6b5f45]">Recent activity logs</p>
              <ul className="mt-2 space-y-1">
                {task.activityLogs.slice(0, 5).map((log) => (
                  <li key={log.id} className="rounded bg-white/70 px-2 py-1 text-xs font-semibold text-[#2a2620]">
                    {new Date(log.createdAt).toLocaleTimeString()} · {log.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-56">
          <button
            type="button"
            className="rounded-xl border-4 border-[#2f6aa3] bg-[#d9ecff] px-4 py-3 text-sm font-black text-[#0f2f52] shadow-[0_8px_0_#6aa6d8] transition hover:translate-y-0.5 hover:shadow-[0_6px_0_#6aa6d8] active:translate-y-1 active:shadow-[0_4px_0_#6aa6d8]"
          >
            View Details
          </button>
          <p className="text-[11px] leading-snug text-[#6b5f45]">CTA is a mock for demo — wire routing later.</p>
        </div>
      </div>
    </section>
  );
}
